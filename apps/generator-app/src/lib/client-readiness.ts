import type { BusinessInfo, StylePreferences } from '@/store/previewStore'
import { validateLeadContact } from '@/lib/lead-validation'

export type ReadinessCategoryId =
  | 'offerClarity'
  | 'trustSignals'
  | 'bookingPath'
  | 'localPresence'
  | 'emotionalFit'

export interface ReadinessCategoryScore {
  id: ReadinessCategoryId
  label: string
  score: number
  maxScore: number
}

export interface ClientReadinessResult {
  overall: number
  categories: ReadinessCategoryScore[]
  suggestions: string[]
}

// Keep category IDs stable for consumers. These measure supplied details, not
// professional credibility, working booking links, or conversion performance.
const CATEGORY_LABELS: Record<ReadinessCategoryId, string> = {
  offerClarity: 'Practice overview',
  trustSignals: 'About you',
  bookingPath: 'Contact details',
  localPresence: 'Service area',
  emotionalFit: 'Design choices',
}

function trim(value: string): string {
  return value.trim()
}

function hasService(services: string): boolean {
  return services
    .split(',')
    .some((service) => Boolean(trim(service)))
}

function hasEmail(info: BusinessInfo): boolean {
  return validateLeadContact(trim(info.email), '') === null
}

function hasPhone(info: BusinessInfo): boolean {
  return validateLeadContact('', trim(info.phone)) === null
}

function scoreOfferClarity(info: BusinessInfo): { score: number; max: number } {
  const max = 20
  let score = 0
  if (trim(info.businessName)) score += 8
  if (trim(info.tagline)) score += 6
  if (hasService(info.services)) score += 6
  return { score, max }
}

function scoreTrustSignals(info: BusinessInfo): { score: number; max: number } {
  const max = 20
  let score = 0
  if (trim(info.ownerName)) score += 10
  // A concise, accurate introduction is useful without credential keywords.
  if (trim(info.description)) score += 10
  return { score, max }
}

function scoreBookingPath(info: BusinessInfo): { score: number; max: number } {
  const max = 20
  // Format checks cannot establish whether a contact method is monitored.
  return { score: hasEmail(info) || hasPhone(info) ? max : 0, max }
}

function scoreLocalPresence(info: BusinessInfo): { score: number; max: number } {
  const max = 20
  // Accept a city, region, or virtual service area without requiring a street
  // address or assuming that every practice uses a US city/state format.
  return { score: trim(info.address) ? max : 0, max }
}

function scoreEmotionalFit(prefs: StylePreferences): { score: number; max: number } {
  const max = 20
  let score = 0
  if (prefs.vibes.length >= 1) score += 8
  if (prefs.proseStyle) score += 6
  if (prefs.colorMood) score += 6
  return { score, max }
}

function buildSuggestions(info: BusinessInfo, prefs: StylePreferences): string[] {
  const out: string[] = []

  if (!trim(info.businessName)) {
    out.push('Add your business name so visitors know who they are contacting.')
  }
  if (!trim(info.tagline)) {
    out.push('Add a short tagline that says who you help and what you offer, without promising results.')
  }
  if (!trim(info.description)) {
    out.push('Introduce who you help and how you work. Include experience or qualifications only if accurate; credentials are optional.')
  }
  if (!hasService(info.services)) {
    out.push('Name a service you actually offer so visitors know what they can ask about. One clear service is enough.')
  }
  if (!trim(info.ownerName)) {
    out.push('Add your name or your team’s name so visitors know who is behind the practice.')
  }
  if (!trim(info.email) && !trim(info.phone)) {
    out.push('Add an email address or phone number you monitor. Either contact method is enough.')
  }
  if (trim(info.email) && !hasEmail(info)) {
    out.push('Check the email address format, for example hello@yourpractice.com.')
  }
  if (trim(info.phone) && !hasPhone(info)) {
    out.push('Check the phone number, including its area or country code.')
  }
  if (!trim(info.address)) {
    out.push('Add your city, region, or online service area. For virtual work, say where you can serve clients; a street address is optional.')
  }
  if (prefs.vibes.length === 0) {
    out.push('Choose a style that feels right for your practice. One preferred style is enough.')
  }
  if (!prefs.proseStyle) {
    out.push('Choose a writing tone for your website.')
  }
  if (!prefs.colorMood) {
    out.push('Choose a color mood for your website.')
  }

  return out
}

export function computeClientReadiness(
  info: BusinessInfo,
  prefs: StylePreferences,
): ClientReadinessResult {
  const raw: { id: ReadinessCategoryId; score: number; max: number }[] = [
    { id: 'offerClarity', ...scoreOfferClarity(info) },
    { id: 'trustSignals', ...scoreTrustSignals(info) },
    { id: 'bookingPath', ...scoreBookingPath(info) },
    { id: 'localPresence', ...scoreLocalPresence(info) },
    { id: 'emotionalFit', ...scoreEmotionalFit(prefs) },
  ]

  const totalScore = raw.reduce((sum, c) => sum + c.score, 0)
  const totalMax = raw.reduce((sum, c) => sum + c.max, 0)
  const overall = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0

  const categories: ReadinessCategoryScore[] = raw.map((c) => ({
    id: c.id,
    label: CATEGORY_LABELS[c.id],
    score: c.score,
    maxScore: c.max,
  }))

  return {
    overall,
    categories,
    suggestions: buildSuggestions(info, prefs),
  }
}

export function categoryPercent(cat: ReadinessCategoryScore): number {
  if (cat.maxScore <= 0) return 0
  return Math.round((cat.score / cat.maxScore) * 100)
}
