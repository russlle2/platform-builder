import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const directory = fileURLToPath(new URL('../supabase/migrations/', import.meta.url))

test('hosting entitlement lifecycle preserves paid evidence, fences stale reads, and binds portal identity', async () => {
  const db = new PGlite()
  try {
    await db.waitReady
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
      create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
      create schema storage;
      create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects (id uuid primary key, bucket_id text, name text, metadata jsonb);
      grant usage on schema storage to service_role;
      grant select on storage.objects to service_role;
    `)
    for (const name of (await readdir(directory)).filter(n => n.endsWith('.sql')).sort()) await db.exec(await readFile(`${directory}/${name}`, 'utf8'))
    await db.exec('set role service_role')
    const call = async (sql, values = []) => (await db.query(sql, values)).rows[0].result
    const portal = { stripe_session_id: 'cs_site', checkout_intent_id: 'intent_site', stripe_subscription_id: 'sub_site', stripe_customer_id: 'cus_site', plan: 'basic', provisioning_succeeded: true }
    const upsert = (value, status = 'active') => call("select public.upsert_portal_checkout_state('calm-co','owner@example.test',$1,'hash',$2::jsonb) result", [status, JSON.stringify(value)])
    await upsert({ stripe_session_id: portal.stripe_session_id, checkout_intent_id: portal.checkout_intent_id, plan: 'basic' }, 'provisioning')
    await upsert(portal)
    const read = () => call("select public.customer_service_entitlement('calm-co') result")
    const claim = () => call("select public.claim_hosting_reconciliation('calm-co','sub_site','cus_site','basic',false) result")
    const finish = (lease, observation) => call("select public.finish_hosting_reconciliation('calm-co',$1::uuid,$2,$3::jsonb) result", [lease.token, lease.generation, JSON.stringify(observation)])
    const paid = { kind: 'paid', subscriptionStatus: 'active', validFrom: new Date(Date.now() - 86400000).toISOString(), validThrough: new Date(Date.now() + 86400000).toISOString(), subscriptionItemId: 'si_site', priceId: 'price_basic', invoiceId: 'in_paid' }
    assert.equal((await read()).allowed, false)
    const lease = await claim()
    assert.equal(lease.claimed, true)
    assert.equal((await claim()).reason, 'busy')
    assert.equal(await finish({ ...lease, generation: lease.generation - 1 }, paid), false)
    assert.equal(await finish(lease, paid), true)
    assert.equal(await finish(lease, { kind: 'none', subscriptionStatus: 'canceled' }), false, 'completed lease cannot be replayed')
    const eligible = await read()
    assert.deepEqual({ ...eligible, validThrough: new Date(eligible.validThrough).toISOString() }, { allowed: true, tier: 'paid', reason: 'included', validThrough: paid.validThrough })
    // A failed Stripe request does not revoke still-valid coverage or manufacture payment proof.
    assert.equal(await finish(await claim(), { kind: 'unknown', subscriptionStatus: 'unknown' }), true)
    assert.equal((await read()).allowed, true)
    const retained = await call("select jsonb_build_object('invoice',invoice_id,'error',last_error,'verified',verified_at is not null) result from public.hosting_entitlements where slug='calm-co'")
    assert.deepEqual(retained, { invoice: 'in_paid', error: 'provider_observation_unavailable', verified: true })
    // An expired interval fails even when status still says active.
    await db.exec("update public.hosting_entitlements set valid_from=now()-interval '2 days',valid_through=now()-interval '1 day' where slug='calm-co'")
    assert.equal((await read()).reason, 'expired')
    await finish(await claim(), paid)
    await finish(await claim(), { kind: 'none', subscriptionStatus: 'canceled' })
    assert.equal((await read()).allowed, false)
    await finish(await claim(), { kind: 'trial', subscriptionStatus: 'trialing', validFrom: paid.validFrom, validThrough: paid.validThrough, subscriptionItemId: 'si_site', priceId: 'price_basic' })
    assert.equal((await read()).tier, 'trial')
    // Current-subscription binding wins over historical events, regardless of timestamp.
    assert.equal(await call("select public.merge_portal_billing_state('calm-co','canceled',$1::jsonb,9999999999,'evt_old') result", [JSON.stringify({ stripe_subscription_id: 'sub_old' })]), false)
    assert.equal(await call("select public.merge_portal_billing_state('calm-co','canceled',$1::jsonb,9999999999,'evt_current') result", [JSON.stringify({ stripe_subscription_id: 'sub_site' })]), true)
    const raced = await claim()
    await call("select public.merge_portal_billing_state('calm-co','canceled',$1::jsonb,10000000000,'evt_racing_cancel') result", [JSON.stringify({ stripe_subscription_id: 'sub_site' })])
    assert.equal(await finish(raced, paid), false, 'a newer cancellation fences a previously active provider read')
    assert.equal((await read()).allowed, false, 'portal cancellation blocks paid actions immediately')
    await upsert(portal)
    assert.equal((await db.query("select status from public.portal_sites where slug='calm-co'")).rows[0].status, 'billing_suspended', 'checkout replay preserves cancellation')
    for (const key of ['stripe_session_id', 'checkout_intent_id', 'stripe_customer_id', 'stripe_subscription_id']) {
      await assert.rejects(upsert({ ...portal, [key]: 'other_identity' }), /identity mismatch/)
    }
    const preserved = await upsert({ stripe_session_id: 'cs_site', checkout_intent_id: 'intent_site' })
    assert.equal(preserved.stripe_customer_id, 'cus_site', 'omitted optional fields cannot erase established identity')
    const stale = await claim()
    await db.exec("update public.portal_sites set data=data || '{\"stripe_subscription_id\":\"sub_replaced\"}'::jsonb where slug='calm-co'")
    assert.equal(await finish(stale, paid), false, 'provider result for a replaced subscription cannot commit')
    assert.equal((await read()).reason, 'identity_changed')
    const due = await db.query('select * from public.due_hosting_reconciliations(20)')
    assert.ok(Array.isArray(due.rows))
    const readiness = await call('select public.billing_lifecycle_schema_readiness() result')
    assert.deepEqual(readiness, { ready: true, schemaVersion: '20261029.1' })
    for (const role of ['anon', 'authenticated']) {
      for (const signature of ['customer_service_entitlement(text)', 'claim_hosting_reconciliation(text,text,text,text,boolean)', 'finish_hosting_reconciliation(text,uuid,bigint,jsonb)', 'due_hosting_reconciliations(integer)']) {
        assert.equal(await call(`select has_function_privilege('${role}','public.${signature}','EXECUTE') result`), false)
      }
      assert.equal(await call(`select has_table_privilege('${role}','public.hosting_entitlements','SELECT') result`), false)
    }
  } finally { await db.close() }
})
