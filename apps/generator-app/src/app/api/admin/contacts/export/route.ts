import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireInternalAdminOrThrow } from '@/lib/server-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

interface ExportContactRow {
  email: string
  name: string | null
  phone: string | null
  business_name: string | null
  niche: string | null
  source: string | null
  created_at: string | null
}

interface IntakeContactRecord {
  email: string
  name: string | null
  phone: string | null
  business_name: string | null
  niche: string | null
  source: string | null
  created_at: string | null
}

interface LeadCaptureRecord {
  email: string | null
  phone: string | null
  source: string | null
  created_at: string | null
}

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) return null
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
}

function escapeCsvField(value: string | null | undefined): string {
  const s = value ?? ''
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function rowToCsv(row: ExportContactRow): string {
  return [
    escapeCsvField(row.email),
    escapeCsvField(row.name),
    escapeCsvField(row.phone),
    escapeCsvField(row.business_name),
    escapeCsvField(row.niche),
    escapeCsvField(row.source),
    escapeCsvField(row.created_at),
  ].join(',')
}

export async function GET(req: NextRequest) {
  const authError = requireInternalAdminOrThrow(req)
  if (authError) return authError

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured.' },
      { status: 500 },
    )
  }

  const niche = req.nextUrl.searchParams.get('niche')?.trim() || null
  const since = req.nextUrl.searchParams.get('since')?.trim() || null

  let intakeQuery = supabase
    .from('intake_contacts')
    .select('email, name, phone, business_name, niche, source, created_at')

  if (niche) {
    intakeQuery = intakeQuery.eq('niche', niche)
  }
  if (since) {
    intakeQuery = intakeQuery.gte('created_at', since)
  }

  let leadsQuery = supabase
    .from('lead_captures')
    .select('email, phone, source, created_at')
    .not('email', 'is', null)

  if (since) {
    leadsQuery = leadsQuery.gte('created_at', since)
  }

  const [intakeResult, leadsResult] = await Promise.all([
    intakeQuery.order('created_at', { ascending: false }),
    niche ? Promise.resolve({ data: [] as LeadCaptureRecord[], error: null }) : leadsQuery.order('created_at', { ascending: false }),
  ])

  if (intakeResult.error) {
    console.error('[api/admin/contacts/export] intake query error:', intakeResult.error)
    return NextResponse.json(
      { error: 'Failed to export contacts.' },
      { status: 500 },
    )
  }

  if (leadsResult.error) {
    console.error('[api/admin/contacts/export] leads query error:', leadsResult.error)
    return NextResponse.json(
      { error: 'Failed to export contacts.' },
      { status: 500 },
    )
  }

  const byEmail = new Map<string, ExportContactRow>()

  for (const row of (intakeResult.data ?? []) as IntakeContactRecord[]) {
    if (!row.email) continue
    byEmail.set(row.email.toLowerCase(), {
      email: row.email,
      name: row.name,
      phone: row.phone,
      business_name: row.business_name,
      niche: row.niche,
      source: row.source,
      created_at: row.created_at,
    })
  }

  for (const row of (leadsResult.data ?? []) as LeadCaptureRecord[]) {
    if (!row.email) continue
    const key = row.email.toLowerCase()
    if (byEmail.has(key)) continue
    byEmail.set(key, {
      email: row.email,
      name: null,
      phone: row.phone,
      business_name: null,
      niche: null,
      source: row.source,
      created_at: row.created_at,
    })
  }

  const rows = Array.from(byEmail.values()).sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
    return bTime - aTime
  })

  const header = 'email,name,phone,business_name,niche,source,created_at'
  const csv = [header, ...rows.map(rowToCsv)].join('\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="contacts-export.csv"',
    },
  })
}
