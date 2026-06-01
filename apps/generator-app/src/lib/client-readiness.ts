import type { BusinessInfo, StylePreferences } from '@/store/previewStore'

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

const TRUST_TERMS = [
  'certified',
  'licensed',
  'credentials',
  'years of experience',
  'years experience',
  'trauma-informed',
  'trauma informed',
  'board-certified',
  'board certified',
  'experience',
  'accredited',
  'fellowship',
  'lmhc',
  'lcsw',
  'phd',
  'md',
  'rn',
  'nationally',
  'registered',
  'practitioner',
  'specialist',
]

const CATEGORY_LABELS: Record<ReadinessCategoryId, string> = {
  offerClarity: 'Offer Clarity',
  trustSignals: 'Trust Signals',
  bookingPath: 'Booking Path',
  localPresence: 'Local Presence',
  emotionalFit: 'Emotional Fit',
}

function trim(value: string): string {
  return value.trim()
}

function countServices(services: string): number {
  return services
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean).length
}

function hasTrustLanguage(description: string): boolean {
  const lower = description.toLowerCase()
  return TRUST_TERMS.some((term) => lower.includes(term))
}

function hasCityStateOrOnline(address: string): boolean {
  const a = address.trim().toLowerCase()
  if (!a) return false
  if (/\b(online|telehealth|virtual|remote|nationwide|worldwide)\b/.test(a)) return true
  if (/,\s*[a-z]{2}\b/.test(a)) return true
  if (/\b\d{5}(-\d{4})?\b/.test(a)) return true
  return /\b[A-Za-z]+,?\s+[A-Za-z]{2}\b/.test(address.trim())
}

function scoreOfferClarity(info: BusinessInfo): { score: number; max: number } {
  const max = 20
  let score = 0
  if (trim(info.businessName)) score += 5
  if (trim(info.tagline)) score += 5
  if (trim(info.description).length > 80) score += 5
  if (countServices(info.services) >= 3) score += 5
  return { score, max }
}

function scoreTrustSignals(info: BusinessInfo): { score: number; max: number } {
  const max = 20
  let score = 0
  if (trim(info.ownerName)) score += 5
  if (hasTrustLanguage(info.description)) score += 10
  if (trim(info.website)) score += 5
  return { score, max }
}

function scoreBookingPath(info: BusinessInfo): { score: number; max: number } {
  const max = 20
  let score = 0
  if (trim(info.email)) score += 7
  if (trim(info.phone)) score += 7
  if (trim(info.services)) score += 6
  return { score, max }
}

function scoreLocalPresence(info: BusinessInfo): { score: number; max: number } {
  const max = 20
  let score = 0
  if (trim(info.address)) score += 10
  if (hasCityStateOrOnline(info.address)) score += 10
  return { score, max }
}

function scoreEmotionalFit(prefs: StylePreferences): { score: number; max: number } {
  const max = 20
  let score = 0
  if (prefs.vibes.length >= 2) score += 8
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
    out.push('Add a stronger tagline with the outcome you help people achieve.')
  }
  if (trim(info.description).length <= 80) {
    out.push('Expand your description with who you help, how you work, and what makes your approach credible.')
  }
  if (countServices(info.services) < 3) {
    out.push('Add 3 clear services so visitors know what they can book.')
  }
  if (!trim(info.ownerName)) {
    out.push('Add your name or practitioner title to build personal trust.')
  }
  if (!hasTrustLanguage(info.description)) {
    out.push('Mention credentials, certifications, or experience in your description.')
  }
  if (!trim(info.email) || !trim(info.phone)) {
    out.push('Add phone or email so visitors can take action.')
  }
  if (!trim(info.services)) {
    out.push('List the services visitors can book or inquire about.')
  }
  if (!trim(info.address)) {
    out.push('Add your city or service area for local trust.')
  } else if (!hasCityStateOrOnline(info.address)) {
    out.push('Add your city, state, or note if you serve clients online.')
  }
  if (prefs.vibes.length < 2) {
    out.push('Pick at least two style vibes so your template match reflects your brand feel.')
  }

  return out.slice(0, 6)
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
