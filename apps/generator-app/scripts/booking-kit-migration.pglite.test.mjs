import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const migration = await readFile(new URL('../supabase/migrations/20260925071341_booking_kit_private_orders.sql', import.meta.url), 'utf8')
const orderId = '10000000-0000-4000-8000-000000000001'
const hash = 'a'.repeat(64)

test('private kit migration replays; browser roles cannot reach orders, credentials or privileged RPCs', async () => {
  const db = new PGlite()
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon, authenticated;')
    await db.exec(migration)
    await db.exec(migration)
    assert.equal((await db.query('select booking_kit_schema_version() as version')).rows[0].version, '20260925.1')
    const privileges = await db.query(`select rolname,
      has_table_privilege(rolname, 'public.booking_kit_orders', 'select,insert,update,delete') as orders,
      has_table_privilege(rolname, 'public.booking_kit_access_tokens', 'select,insert,update,delete') as tokens,
      has_function_privilege(rolname, 'public.fulfill_booking_kit_order(uuid,text,text,timestamptz,text)', 'execute') as fulfill,
      has_function_privilege(rolname, 'public.read_booking_kit_result(text)', 'execute') as result,
      has_function_privilege(rolname, 'public.consume_booking_kit_rate_limit(text,integer)', 'execute') as limits
      from pg_roles where rolname in ('anon','authenticated')`)
    for (const row of privileges.rows) assert.deepEqual(Object.values(row).slice(1), [false, false, false, false, false])
    const rls = await db.query(`select relrowsecurity from pg_class where relname in ('booking_kit_orders','booking_kit_access_tokens','booking_kit_rate_limits')`)
    assert.equal(rls.rows.length, 3)
    assert.ok(rls.rows.every(row => row.relrowsecurity))
    await db.exec('set role anon')
    await assert.rejects(db.query('select * from public.booking_kit_orders'), /permission denied/)
    await assert.rejects(db.query('select * from public.read_booking_kit_result($1)', [hash]), /permission denied/)
    await db.exec('reset role; set role service_role')
    await db.query(`insert into booking_kit_orders (id,purchase_email,supplied_facts,artifact,artifact_version,artifact_hash,stripe_price_id,amount_cents,currency,stripe_session_id,checkout_access_hash,checkout_access_expires_at)
      values ($1,'buyer@example.test','{}','{}','v1',$2,'price_kit',900,'usd','cs_kit',$2,now()+interval '1 hour')`, [orderId, hash])
    assert.equal((await db.query('select state from read_booking_kit_result($1)', [hash])).rows[0].state, 'checkout_pending')
    assert.equal((await db.query('select * from read_booking_kit_result($1)', ['b'.repeat(64)])).rows.length, 0)
    await assert.rejects(db.query("select fulfill_booking_kit_order($1,'cs_wrong','pi_kit',now(),'corrected@example.test')", [orderId]), /session_mismatch/)
    await assert.rejects(db.query("select fulfill_booking_kit_order($1,'cs_kit','pi_kit',now(),'not an email')", [orderId]), /purchase_email_invalid/)
    assert.equal((await db.query('select purchase_email from booking_kit_orders where id=$1', [orderId])).rows[0].purchase_email, 'buyer@example.test', 'rejected events cannot change purchase email')
    const attempts = await Promise.all([1, 2].map(() => db.query("select fulfill_booking_kit_order($1,'cs_kit','pi_kit',now(),' CORRECTED@example.test ') as applied", [orderId])))
    assert.equal(attempts.filter(result => result.rows[0].applied).length, 1)
    const paid = (await db.query('select *, access_expires_at-paid_at as duration from booking_kit_orders where id=$1', [orderId])).rows[0]
    assert.equal(paid.state, 'paid')
    assert.equal(paid.purchase_email, 'corrected@example.test')
    const recover = (email) => db.query("select id from booking_kit_orders where purchase_email=$1 and state='paid' and access_expires_at>now()", [email])
    assert.equal((await recover('buyer@example.test')).rows.length, 0, 'prefill email cannot recover a corrected purchase')
    assert.equal((await recover('corrected@example.test')).rows.length, 1, 'recovery is bound to the verified Checkout email')
    assert.equal(paid.duration, '90 days')
    await db.query("update booking_kit_orders set delivery_failed_at=now() where id=$1", [orderId])
    assert.equal((await db.query('select state from read_booking_kit_result($1)', [hash])).rows[0].state, 'paid', 'email failure preserves access')
    await db.query("update booking_kit_orders set checkout_access_expires_at=now()-interval '1 second' where id=$1", [orderId])
    assert.equal((await db.query('select * from read_booking_kit_result($1)', [hash])).rows.length, 0)
    const recoveryHash = 'b'.repeat(64)
    await db.query("insert into booking_kit_access_tokens(token_hash,order_id,expires_at) values ($1,$2,now()+interval '1 hour')", [recoveryHash, orderId])
    assert.equal((await db.query('select state from read_booking_kit_result($1)', [recoveryHash])).rows[0].state, 'paid')
    await db.query("update booking_kit_orders set access_expires_at=now()-interval '1 second' where id=$1", [orderId])
    assert.equal((await db.query('select * from read_booking_kit_result($1)', [recoveryHash])).rows.length, 0)
    await db.query("update booking_kit_orders set access_expires_at=now()+interval '89 days' where id=$1", [orderId])
    assert.equal((await db.query("select revoke_booking_kit_order($1,'cs_kit','pi_kit',now(),'corrected@example.test') as applied", [orderId])).rows[0].applied, true)
    assert.equal((await db.query("select fulfill_booking_kit_order($1,'cs_kit','pi_kit',now(),'corrected@example.test') as applied", [orderId])).rows[0].applied, false, 'late payment cannot undo refund')
    assert.equal((await recover('corrected@example.test')).rows.length, 0, 'corrected email cannot recover a refunded purchase')
    assert.equal((await db.query('select * from read_booking_kit_result($1)', [recoveryHash])).rows.length, 0)
    assert.equal((await db.query('select * from booking_kit_access_tokens')).rows.length, 0)
    // A refund received before fulfillment is terminal too.
    const earlyOrder = '10000000-0000-4000-8000-000000000002'
    await db.query(`insert into booking_kit_orders (id,purchase_email,supplied_facts,artifact,artifact_version,artifact_hash,stripe_price_id,amount_cents,currency,stripe_session_id)
      values ($1,'buyer@example.test','{}','{}','v1',$2,'price_kit',900,'usd','cs_early')`, [earlyOrder, hash])
    await db.query("select revoke_booking_kit_order($1,'cs_early','pi_early',null,'corrected-early@example.test')", [earlyOrder])
    assert.equal((await db.query('select paid_at from booking_kit_orders where id=$1', [earlyOrder])).rows[0].paid_at, null, 'refund arrival does not invent payment time')
    assert.equal((await db.query("select fulfill_booking_kit_order($1,'cs_early','pi_early',now(),'corrected-early@example.test') as applied", [earlyOrder])).rows[0].applied, false)
    assert.equal((await db.query('select purchase_email from booking_kit_orders where id=$1', [earlyOrder])).rows[0].purchase_email, 'corrected-early@example.test')
    assert.ok((await db.query('select paid_at from booking_kit_orders where id=$1', [earlyOrder])).rows[0].paid_at, 'late authentic paid event records the purchase without undoing refund')
    assert.equal((await db.query('select state from booking_kit_orders where id=$1', [earlyOrder])).rows[0].state, 'refunded')
    const delayedOrder = '10000000-0000-4000-8000-000000000003'
    await db.query(`insert into booking_kit_orders (id,purchase_email,supplied_facts,artifact,artifact_version,artifact_hash,stripe_price_id,amount_cents,currency,stripe_session_id,created_at)
      values ($1,'buyer@example.test','{}','{}','v1',$2,'price_kit',900,'usd','cs_delayed',now()-interval '10 days')`, [delayedOrder, hash])
    await assert.rejects(db.query("select fulfill_booking_kit_order($1,'cs_delayed','pi_delayed',now()+interval '1 day','buyer@example.test')", [delayedOrder]), /timestamp_invalid/)
    await db.query("select fulfill_booking_kit_order($1,'cs_delayed','pi_delayed',now()-interval '7 days','buyer@example.test')", [delayedOrder])
    assert.ok((await db.query("select access_expires_at < now()+interval '84 days' as bounded from booking_kit_orders where id=$1", [delayedOrder])).rows[0].bounded, 'delayed workers cannot extend hosted access')
    const limits = await Promise.all([1, 2, 3, 4].map(() => db.query('select consume_booking_kit_rate_limit($1,3) as allowed', ['c'.repeat(64)])))
    assert.equal(limits.filter(result => result.rows[0].allowed).length, 3, 'parallel requests share a durable cap')
  } finally { await db.close() }
})
