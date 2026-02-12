import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(req: Request) {
  try {
    const { email, phone, source } = await req.json()

    if (!email && !phone) {
      return NextResponse.json(
        { error: 'Email or phone is required.' },
        { status: 400 }
      )
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Lead capture not configured.' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })

    const { error } = await supabase.from('lead_captures').insert({
      email,
      phone,
      source: source || 'modal',
    })

    if (error) {
      return NextResponse.json(
        { error: 'Unable to save lead.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unable to save lead.' },
      { status: 500 }
    )
  }
}
