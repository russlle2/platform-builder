/** Deterministic, client/server-safe composition. No model, network, or invented facts. */
export const BOOKING_KIT_CONTENT_VERSION = 'booking-kit-v1'
export const BOOKING_KIT_PRICE_CENTS = 900
export const BOOKING_KIT_ACCESS_DAYS = 90
export const BOOKING_KIT_NICHES = [
  'aromatherapy', 'holistic_medicine', 'private_practice_therapist', 'sound_bath', 'wellness_coach',
] as const
export type BookingKitNiche = typeof BOOKING_KIT_NICHES[number]
export interface BookingKitFacts {
  niche: BookingKitNiche
  service: string
  audience: string
  format: string
  duration: string
  pricingChoice: 'published' | 'quote' | 'free'
  priceDetails?: string
  bookingMethod: string
  businessName?: string
  ownerName?: string
  cancellationPolicy?: string
  preparation?: string
  locationDetails?: string
}
export interface BookingKitArtifact {
  version: string
  niche: BookingKitNiche
  headline: string
  introduction: string
  serviceDescription: string
  bookingCallToAction: string
  faqs: Array<{ question: string; answer: string }>
  businessBio: string
  inquiryReply: string
  confirmationReply: string
  unfinishedItems: string[]
  preview: {
    businessName: string
    ownerName: string
    niche: string
    tagline: string
    description: string
    services: string
  }
}

const textFields = {
  service: 160, audience: 200, format: 120, duration: 80,
  priceDetails: 160, bookingMethod: 350, businessName: 160, ownerName: 120,
  cancellationPolicy: 600, preparation: 600, locationDetails: 350,
} as const
const requiredFields = new Set(['service', 'audience', 'format', 'duration', 'bookingMethod'])

export function parseBookingKitFacts(input: unknown):
  | { success: true; facts: BookingKitFacts }
  | { success: false; errors: Record<string, string> } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { success: false, errors: { facts: 'Enter the facts about one service.' } }
  }
  const raw = input as Record<string, unknown>
  const fields: Record<string, string> = {}
  const errors: Record<string, string> = {}
  if (!BOOKING_KIT_NICHES.includes(raw.niche as BookingKitNiche)) errors.niche = 'Choose one of the five supported niches.'
  if (!['published', 'quote', 'free'].includes(raw.pricingChoice as string)) errors.pricingChoice = 'Choose how to describe your price.'
  for (const [key, maxLength] of Object.entries(textFields)) {
    const value = raw[key]
    if (value != null && typeof value !== 'string') {
      errors[key] = 'Enter plain text.'
      continue
    }
    const normalized = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
    if ((requiredFields.has(key) || (key === 'priceDetails' && raw.pricingChoice === 'published')) && !normalized) {
      errors[key] = 'This fact is required.'
    } else if (normalized.length > maxLength) {
      errors[key] = `Use ${maxLength} characters or fewer.`
    } else if (typeof value === 'string' && (/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(value) || /(?:javascript|data|vbscript)\s*:/i.test(value))) {
      errors[key] = 'Use plain text without markup, executable links, or hidden controls.'
    }
    if (normalized) fields[key] = normalized
  }
  if (Object.keys(errors).length) return { success: false, errors }
  // Explicit projection prevents extra browser-submitted properties entering an order.
  if (raw.pricingChoice !== 'published') delete fields.priceDetails
  return { success: true, facts: { ...fields, niche: raw.niche, pricingChoice: raw.pricingChoice } as unknown as BookingKitFacts }
}

const nicheCopy: Record<BookingKitNiche, { category: string; inquiry: string; preparation: string }> = {
  aromatherapy: { category: 'aromatherapy', inquiry: 'the aromatherapy service', preparation: 'Confirm any scent preferences and service-specific preparation directly before the appointment.' },
  holistic_medicine: { category: 'holistic medicine', inquiry: 'the holistic medicine service', preparation: 'Confirm the appointment scope and any requested preparation directly before the appointment.' },
  private_practice_therapist: { category: 'private-practice therapy', inquiry: 'the therapy service', preparation: 'Confirm the session arrangements directly; use the practice’s agreed channel for any personal information.' },
  sound_bath: { category: 'sound baths', inquiry: 'the sound bath service', preparation: 'Confirm the session setting and whether you need to bring anything before attending.' },
  wellness_coach: { category: 'wellness coaching', inquiry: 'the coaching service', preparation: 'Confirm the session focus and any requested preparation directly before the appointment.' },
}

export function composeBookingKit(input: BookingKitFacts): BookingKitArtifact {
  const parsed = parseBookingKitFacts(input)
  if (!parsed.success) throw new Error('Booking kit facts are incomplete or invalid.')
  const f = parsed.facts
  const niche = nicheCopy[f.niche]
  const price = f.pricingChoice === 'published' ? `Price: ${f.priceDetails}.`
    : f.pricingChoice === 'free' ? 'This service is offered at no charge.'
      : 'Ask for a quote before booking.'
  const logistics = `Format: ${f.format}. Duration: ${f.duration}.${f.locationDetails ? ` Location or access: ${f.locationDetails}.` : ''}`
  const headline = `${f.service} for ${f.audience}`
  const introduction = `${f.businessName ? `${f.businessName} offers` : 'Explore'} ${f.service} for ${f.audience}. Find the service details and next steps below.`
  const serviceDescription = `${f.service} is available for ${f.audience}. ${logistics} ${price}`
  const bookingCallToAction = `To book ${f.service}: ${f.bookingMethod}.`
  const unfinishedItems = [
    ...(!f.cancellationPolicy ? ['Cancellation and rescheduling policy — add your actual terms before publishing.'] : []),
    ...(!f.preparation ? ['Preparation instructions — confirm what clients should do or bring.'] : []),
    ...(!f.locationDetails ? ['Location or access details — confirm where or how the service takes place.'] : []),
    'Confirmation reply — add the confirmed date, time, time zone, and client details before sending.',
  ]
  const prep = f.preparation || `[UNFINISHED: add your preparation instructions. ${niche.preparation}]`
  const cancellation = f.cancellationPolicy || '[UNFINISHED: add your cancellation and rescheduling policy.]'
  return {
    version: BOOKING_KIT_CONTENT_VERSION,
    niche: f.niche,
    headline, introduction, serviceDescription, bookingCallToAction,
    faqs: [
      { question: `What ${niche.category} service can I book?`, answer: f.service },
      { question: 'Who is this service for?', answer: f.audience },
      { question: 'What is the format and how long does it take?', answer: logistics },
      { question: 'How much does it cost?', answer: price },
      { question: 'How do I book, and what should I know beforehand?', answer: `${bookingCallToAction} Preparation: ${prep} Cancellation and rescheduling: ${cancellation}` },
    ],
    businessBio: `${f.businessName || 'This business'} offers ${f.service} in ${niche.category} for ${f.audience}.${f.ownerName ? ` Contact: ${f.ownerName}.` : ''} ${logistics}`,
    inquiryReply: `Thank you for asking about ${niche.inquiry}. ${serviceDescription} ${bookingCallToAction} Please let us know if you have a question about the service details.`,
    confirmationReply: `[SEND ONLY AFTER YOU HAVE CONFIRMED THE BOOKING]\nHello [client name], your booking for ${f.service} is confirmed for [date, time and time zone]. ${logistics} ${price}\nPreparation: ${prep}\nCancellation and rescheduling: ${cancellation}\nFor booking questions: ${f.bookingMethod}.`,
    unfinishedItems,
    preview: { businessName: f.businessName || '', ownerName: f.ownerName || '', niche: f.niche, tagline: headline, description: `${introduction}\n\n${serviceDescription}\n\n${bookingCallToAction}`, services: f.service },
  }
}

export function bookingKitSections(artifact: BookingKitArtifact): Array<{ title: string; text: string }> {
  return [
    { title: 'Homepage headline', text: artifact.headline },
    { title: 'Homepage introduction', text: artifact.introduction },
    { title: 'Service description', text: artifact.serviceDescription },
    { title: 'Booking call to action', text: artifact.bookingCallToAction },
    { title: 'Five booking FAQs', text: artifact.faqs.map((faq) => `${faq.question}\n${faq.answer}`).join('\n\n') },
    { title: 'Short business bio', text: artifact.businessBio },
    { title: 'Inquiry reply', text: artifact.inquiryReply },
    { title: 'Booking confirmation and preparation reply', text: artifact.confirmationReply },
  ]
}

export function artifactToText(artifact: BookingKitArtifact): string {
  return [`BOOKING CLARITY KIT\nComposition: ${artifact.version}`, ...bookingKitSections(artifact).map(({ title, text }) => `${title.toUpperCase()}\n${text}`), `UNFINISHED ITEMS\n${artifact.unfinishedItems.map((item) => `- ${item}`).join('\n')}`].join('\n\n')
}
