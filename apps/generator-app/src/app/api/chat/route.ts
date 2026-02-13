import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `
You are the helpful AI assistant for "Platform Builder", a specialized website builder for HVAC professionals.
Your goal is to help users understand the platform, the process, and pricing.

Key Information about Platform Builder:
- Target Audience: HVAC business owners.
- Value Prop: Skip the learning curve. Build a professional presence instantly. No tools to learn.
- Process: 
  1. Use the Live Build Wizard to enter business info and choose a template.
  2. See a real-time preview.
  3. Upload images and customize branding.
  4. Only pay when satisfied (or deposit for custom work).
- Pricing:
  - Entrepreneur: $99/mo (Templates, Wizard, Hosting, Basic SEO).
  - Executive: $399/mo (Advanced customization, Priority access).
  - Custom Build: $499 one-time (50/50 split, work directly with developers, full refund if not happy).
- Member Cap: Limited to 30 active monthly members to ensure quality.

Tone: Professional, encouraging, industrial-premium, helpful.
Keep answers concise and directed towards encouraging them to try the "Live Demo" or "Wizard".
`

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
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

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { message: "Sorry, I encountered an error processing your request." }, 
      { status: 500 }
    );
  }
}
