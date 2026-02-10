import { NextResponse } from 'next/server'

// Placeholder route handler to satisfy Next.js module requirements.
export async function POST() {
  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
