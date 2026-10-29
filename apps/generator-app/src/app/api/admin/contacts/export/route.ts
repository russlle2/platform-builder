import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireInternalAdminOrThrow } from '@/lib/server-auth'
import { buildContactExport, ContactExportError } from '@/lib/contact-export'

function privateResponse(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'private, no-store')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'no-referrer')
  return response
}

function parseSince(input: string | null): string | null {
  if (!input || !/^\d{4}-\d{2}-\d{2}(?:T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d))?$/.test(input)) return null
  const date = new Date(`${input.slice(0, 10)}T00:00:00.000Z`)
  // Date.parse accepts impossible dates such as February 30 by rolling forward.
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.slice(0, 10)) return null
  return Number.isFinite(Date.parse(input)) ? new Date(input).toISOString() : null
}

export async function GET(req: NextRequest) {
  const authError = requireInternalAdminOrThrow(req)
  if (authError) return privateResponse(authError)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return privateResponse(NextResponse.json({ error: 'Database not configured.' }, { status: 503 }))
  }

  const niche = req.nextUrl.searchParams.get('niche')?.trim() || null
  const sinceInput = req.nextUrl.searchParams.get('since')?.trim() || null
  const since = parseSince(sinceInput)
  if ((niche && niche.length > 80) || (sinceInput && !since)) {
    return privateResponse(NextResponse.json({ error: 'Use a valid since date and a niche of at most 80 characters.' }, { status: 400 }))
  }

  try {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const result = await buildContactExport(client, { niche, since })
    return privateResponse(new NextResponse(result.csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="contacts-export.csv"',
        'X-Export-As-Of': result.asOf,
        'X-Export-Row-Count': String(result.rows),
        'X-Export-Intake-Count': String(result.intake),
        'X-Export-Lead-Count': String(result.leads),
        'X-Export-Draft-Count': String(result.drafts),
        'X-Export-Lead-Scope': niche ? 'excluded-by-niche-filter' : 'all',
        'X-Export-Complete': 'true',
      },
    }))
  } catch (error) {
    // Provider error bodies can contain contact data. Return fixed categories;
    // never log or return the original error, request URL or service credential.
    const failure = error instanceof ContactExportError ? error : new ContactExportError('query')
    return privateResponse(NextResponse.json({ error: failure.message, code: failure.code }, { status: failure.status }))
  }
}
