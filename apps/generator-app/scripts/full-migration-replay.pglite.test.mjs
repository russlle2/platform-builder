import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const directory = fileURLToPath(new URL('../supabase/migrations/', import.meta.url))

test('every committed migration replays in order on an empty application database', async () => {
  const db = new PGlite()
  try {
    await db.waitReady
    // Only Supabase-owned objects are stubbed. All application objects must
    // come from their real migrations, so ordering and missing baselines fail.
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
      create table auth.users (id uuid primary key, email text);
      create schema storage;
      create table storage.buckets (
        id text primary key, name text, public boolean,
        file_size_limit bigint, allowed_mime_types text[]
      );
      create table storage.objects (id uuid primary key, bucket_id text);
    `)
    const migrations = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()
    assert.ok(migrations.length >= 14)
    for (const name of migrations) {
      try {
        await db.exec(await readFile(`${directory}/${name}`, 'utf8'))
      } catch (cause) {
        throw new Error(`Clean migration replay failed at ${name}`, { cause })
      }
    }
    // The staged additive measurement migration can be safely reapplied.
    await db.exec(await readFile(`${directory}/20260925072106_booking_kit_measurement.sql`, 'utf8'))
    assert.equal((await db.query('select public.booking_kit_schema_version() as version')).rows[0].version, '20260925.2')
    const orderPermissions = (await db.query(`select
      has_table_privilege('service_role','public.orders','UPDATE') as broad_update,
      has_column_privilege('service_role','public.orders','first_payment_received_at','UPDATE') as measured_update,
      has_column_privilege('service_role','public.orders','amount_cents','UPDATE') as financial_update`)).rows[0]
    assert.deepEqual(orderPermissions, { broad_update: false, measured_update: true, financial_update: false })
    const result = await db.query('select public.launch_schema_readiness() as readiness')
    assert.deepEqual(result.rows[0].readiness, { ready: true, schemaVersion: '20260903.4' })
    const insecure = await db.query(`
      select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
    `)
    assert.deepEqual(insecure.rows, [], 'Every application table must enable RLS')
    const empty = (await db.query('select public.booking_kit_first_25_report() as report')).rows[0].report
    assert.equal(empty.buyersObserved, 0)
    assert.equal(empty.recordedSupportMinutes, null)
    await db.exec(`
      insert into public.booking_kit_orders (
        id, state, purchase_email, supplied_facts, artifact, artifact_version,
        artifact_hash, stripe_price_id, amount_cents, currency, stripe_session_id,
        stripe_payment_intent_id, paid_at, access_expires_at, checkout_access_hash,
        checkout_access_expires_at
      ) select gen_random_uuid(), 'paid', 'buyer' || n || '@example.test', '{}', '{}',
        'test', repeat('a', 64), 'price_test', 900, 'usd', 'cs_test_' || n,
        'pi_test_' || n, now() - interval '1 day' + n * interval '1 second',
        now() + interval '89 days', lpad(n::text, 64, 'a'), now() + interval '1 hour'
      from generate_series(1, 26) n;
      update public.booking_kit_orders set support_minutes = 5,
        delivery_failed_at = now() - interval '1 hour', delivery_sent_at = now()
        where purchase_email = 'buyer1@example.test';
      update public.booking_kit_orders set state = 'refunded', refunded_at = now()
        where purchase_email = 'buyer2@example.test';
    `)
    const transfer = (await db.query('select public.record_booking_kit_transfer($1) as recorded', ['a'.repeat(63) + '1'])).rows[0]
    assert.equal(transfer.recorded, true)
    const originalTime = (await db.query("select preview_transferred_at from booking_kit_orders where purchase_email = 'buyer1@example.test'")).rows[0].preview_transferred_at
    await db.query('select public.record_booking_kit_transfer($1)', ['a'.repeat(63) + '1'])
    assert.deepEqual((await db.query("select preview_transferred_at from booking_kit_orders where purchase_email = 'buyer1@example.test'")).rows[0].preview_transferred_at, originalTime)
    assert.equal((await db.query('select public.record_booking_kit_transfer($1) as recorded', ['a'.repeat(63) + '2'])).rows[0].recorded, false)
    const report = (await db.query('select public.booking_kit_first_25_report() as report')).rows[0].report
    assert.equal(report.buyersObserved, 25)
    assert.equal(report.previewTransfers, 1)
    assert.equal(report.refunds, 1)
    assert.equal(report.ordersWithDeliveryFailures, 1)
    assert.equal(report.unresolvedDeliveryFailures, 0)
    assert.equal(report.supportTimeRecordedFor, 1)
    assert.equal(report.recordedSupportMinutes, 5)
    await db.exec(`
      insert into public.booking_kit_orders (
        id, state, purchase_email, supplied_facts, artifact, artifact_version,
        artifact_hash, stripe_price_id, amount_cents, currency, stripe_session_id,
        stripe_payment_intent_id, paid_at, access_expires_at, support_minutes, delivery_failed_at
      ) values (gen_random_uuid(), 'paid', 'buyer1@example.test', '{}', '{}', 'test',
        repeat('b',64), 'price_test', 900, 'usd', 'cs_repeat', 'pi_repeat', now(), now()+interval '90 days', 7, now());
      -- Legacy/reordered refund evidence must remain in the purchase cohort.
      insert into public.booking_kit_orders (
        id, state, purchase_email, supplied_facts, artifact, artifact_version,
        artifact_hash, stripe_price_id, amount_cents, currency, refunded_at
      ) values (gen_random_uuid(), 'refunded', 'buyer2@example.test', '{}', '{}', 'test', repeat('b',64), 'price_test', 900, 'usd', now());
      update public.booking_kit_orders set support_minutes=1000 where purchase_email='buyer26@example.test';
      insert into public.orders (email,plan,status,amount_cents,stripe_session_id,stripe_subscription_id,created_at) values
        (' BUYER1@example.test ', 'basic','active',2000,'cs_site1','sub_site1',now()),
        ('buyer3@example.test', 'basic','trialing',0,'cs_site3','sub_site3',now()-interval '2 days'),
        ('buyer4@example.test', 'basic','active',2000,'cs_site4','sub_site4',now()-interval '3 days'),
        ('buyer5@example.test', 'basic','active',0,'cs_site5','sub_site5',now()),
        ('buyer6@example.test', 'basic','paid',2000,'cs_site6','sub_site6',now()),
        ('buyer26@example.test', 'basic','active',2000,'cs_site26','sub_site26',now());
      insert into public.custom_build_requests (id,business_name,email,site_vision,required_functionality,terms_accepted_at,status,paid_at) values
        (gen_random_uuid(),'Test',' BUYER1@example.test ','test','test',now(),'paid',now()),
        (gen_random_uuid(),'Test','buyer3@example.test','test','test',now(),'paid',now()-interval '2 days'),
        (gen_random_uuid(),'Test','buyer26@example.test','test','test',now(),'paid',now());
      -- Real successful queue rows discard customer payload. Reporting cannot depend on it.
      insert into public.stripe_webhook_events(event_id,event_type,livemode,business_key,status,payload) values
        ('evt_paid_after_trial','invoice.paid',false,'subscription:sub_site3','succeeded','{}'),
        ('evt_free_trial','invoice.paid',false,'subscription:sub_site5','succeeded','{}');
      set role service_role;
      select public.record_order_payment('sub_site1','cs_site1',2000,now()-interval '12 hours');
      select public.record_order_payment('sub_site3',null,2000,now()-interval '12 hours');
      select public.record_order_payment('sub_site4',null,2000,now()-interval '2 days');
      select public.record_order_payment('sub_site26',null,2000,now());
      reset role;
      update public.orders set status='canceled' where stripe_subscription_id='sub_site3';
    `)
    const repeat = (await db.query("select public.record_order_payment('sub_site3',null,2500,now()) as changed")).rows[0]
    assert.equal(repeat.changed, false, 'later invoices cannot overwrite the first positive payment')
    await assert.rejects(db.query("select public.record_order_payment('sub_site5',null,0,now())"), /invalid_payment_evidence/)
    await assert.rejects(db.query("select public.record_order_payment('sub_wrong','cs_site1',2000,now())"), /payment_subscription_mismatch/)
    await assert.rejects(db.query("select public.record_order_payment(null,null,2000,now())"), /payment_order_not_ready/)
    await assert.rejects(db.query("select public.record_order_payment('sub_site5',null,2000,now()+interval '1 day')"), /invalid_payment_evidence/)
    const extended = (await db.query('select public.booking_kit_first_25_report() as report')).rows[0].report
    assert.equal(extended.buyersObserved, 25, 'repeat purchase emails must not inflate buyer count')
    assert.equal(extended.completedFirstPurchases, 25)
    assert.equal(extended.completedPurchases, 27, 'repeat orders from cohort buyers still count as completed purchases')
    assert.equal(extended.refunds, 2, 'refund-before-paid evidence must be counted')
    assert.equal(extended.ordersWithDeliveryFailures, 2)
    assert.equal(extended.unresolvedDeliveryFailures, 1)
    assert.equal(extended.supportTimeRecordedFor, 2)
    assert.equal(extended.recordedSupportMinutes, 12, 'support time includes repeat kit purchases, excludes buyer26')
    assert.equal(extended.buyersWithLaterWebsitePurchase, 2, 'paid trials remain conversions after payload scrubbing and cancellation; free trials and preexisting paid customers do not count')
    assert.equal(extended.buyersWithLaterCustomBuild, 1)
    assert.equal((await db.query('select public.record_booking_kit_transfer($1) as recorded', ['f'.repeat(64)])).rows[0].recorded, false)
    await db.exec("update booking_kit_orders set checkout_access_expires_at=now()-interval '1 second' where purchase_email='buyer3@example.test'")
    assert.equal((await db.query('select public.record_booking_kit_transfer($1) as recorded', ['a'.repeat(63)+'3'])).rows[0].recorded, false)
    for (const role of ['anon', 'authenticated']) {
      for (const signature of ['public.booking_kit_first_25_report()', 'public.record_booking_kit_transfer(text)', 'public.record_order_payment(text,text,integer,timestamptz)']) {
        const grants = await db.query(`select has_function_privilege($1, $2, 'EXECUTE') as allowed`, [role, signature])
        assert.equal(grants.rows[0].allowed, false)
      }
    }
  } finally {
    await db.close()
  }
})
