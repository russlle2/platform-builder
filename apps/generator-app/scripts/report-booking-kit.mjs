// Read-only aggregate report. Never print customer facts, emails or credentials.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const expectedRef = process.env.DAILYCLARITY_SUPABASE_PROJECT_REF?.trim()
const parsedUrl = url ? new URL(url) : null
if (!parsedUrl || !key || !expectedRef || parsedUrl.protocol !== 'https:' ||
  parsedUrl.hostname !== `${expectedRef}.supabase.co` || parsedUrl.username || parsedUrl.password ||
  parsedUrl.port || parsedUrl.pathname !== '/' || parsedUrl.search || parsedUrl.hash) {
  throw new Error('A pinned Supabase project and server-only credential are required.')
}
const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/booking_kit_first_25_report`, {
  method: 'POST',
  headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
  body: '{}', signal: AbortSignal.timeout(15_000),
})
if (!response.ok) throw new Error(`Booking Kit aggregate report failed (${response.status}).`)
console.log(JSON.stringify({
  project: expectedRef,
  report: await response.json(),
  interpretation: 'The cohort is the first 25 distinct purchase emails; order metrics include all their completed kit purchases. Later purchases match email and first positive payment time, not causation. Website conversions require payment evidence recorded since this instrumentation was deployed; zero-dollar trials and pre-existing paying customers do not count. Unrecorded support time is unknown. Delivery failures count affected orders, not retry attempts.',
}, null, 2))
