import { NextRequest, NextResponse } from 'next/server';
import { rateLimitByIp, jsonTooManyRequests } from '@/lib/server-auth';

const SYSTEM_PROMPT = `
You are the helpful AI assistant for DailyClarity Platform Builder — a guided website launch product for wellness and professional service businesses (DailyClarity is the brand; Platform Builder is the product).
Your goal is to help users understand the platform, the process, and pricing.

Key information:
- Audience: aromatherapy, holistic medicine, therapists, sound bath facilitators, and wellness coaches.
- Value: Guided launch with live preview — sites structured for trust, services, and booking/contact (not a blank page builder).
- Process:
  1. Preview Your Business — enter info and style preferences.
  2. Match a niche layout and see a live preview.
  3. Customize copy and images in the portal after purchase.
- Pricing (monthly, card required for trial):
  - Basic Services: $20/mo — hosted subdomain, integrations (Postmark, Supabase, Stripe), self-serve portal, 7-day free trial.
  - Growth Partner: $80/mo — everything in Basic plus weekly platform monitoring and periodic promo/ad check-ins.
  - Custom or enterprise needs: direct them to /contact — do not quote old $99/$399/$499 tiers.
- Member cap: Limited active members to protect quality — mention when relevant without overpromising.

Tone: Professional, warm, encouraging. No guaranteed leads or revenue outcomes.
Keep answers concise. Point people to Preview Your Business, /demo, or /pricing as appropriate.
`

export async function POST(req: NextRequest) {
  const allowed = rateLimitByIp(req, 'chat', 10, 10 * 60 * 1000)
  if (!allowed) return jsonTooManyRequests()

  try {
    const { messages: rawMessages } = await req.json();
    const messages = (Array.isArray(rawMessages) ? rawMessages.slice(0, 20) : []).map(
      (m: { role: string; content: string }) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content.slice(0, 10000) : '',
      })
    );
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { message: "Server configuration error: Missing API Key" }, 
        { status: 500 }
      );
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages
        ],
        temperature: 0.7,
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    return NextResponse.json({ 
      message: data.choices[0].message.content 
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Chat API Error:', message);
    return NextResponse.json(
      { message: "Sorry, I encountered an error processing your request." }, 
      { status: 500 }
    );
  }
}
