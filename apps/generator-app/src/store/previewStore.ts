import { create } from 'zustand'
import { getNicheSlugs } from '@/lib/templates/niche-meta'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface BusinessInfo {
  businessName: string
  ownerName: string
  email: string
  phone: string
  address: string
  niche: string          // slug — aromatherapy, hvac, etc.
  tagline: string
  description: string
  services: string       // comma-separated list
  website: string        // existing website (optional)
}

export type VibeOption = 'warm' | 'bold' | 'clean' | 'luxurious' | 'earthy' | 'playful'
export type ProseStyle = 'professional' | 'conversational' | 'storytelling' | 'minimal' | 'authoritative'
export type ColorMood = 'dark-elegant' | 'light-airy' | 'rich-warm' | 'cool-modern' | 'nature-organic' | 'vibrant-energy'

export interface StylePreferences {
  vibes: VibeOption[]          // pick up to 3
  proseStyle: ProseStyle
  colorMood: ColorMood
  fontPreference: 'serif' | 'sans-serif' | 'mixed'
  layoutDensity: 'spacious' | 'balanced' | 'compact'
}

export interface MatchedTemplate {
  nicheSlug: string
  templateSlug: string
  templateName: string
  /** Every editable HTML page declared by the audited template manifest. */
  pages?: string[]
  matchScore: number
  reason: string
}

export type PreviewStep = 'info' | 'style' | 'matching' | 'editor' | 'browse'

interface PreviewDraft {
  businessInfo: BusinessInfo
  stylePreferences: StylePreferences
  matchedTemplate: MatchedTemplate | null
  infoSaved: boolean
  marketingEmailOptIn: boolean
}

export const PREVIEW_SAMPLE_STORAGE_KEY = 'pb_preview_sample'

interface PreviewState {
  /* Navigation */
  step: PreviewStep
  isSample: boolean
  savedDraft: PreviewDraft | null

  /* Data */
  businessInfo: BusinessInfo
  stylePreferences: StylePreferences
  matchedTemplate: MatchedTemplate | null

  /* Persisted flag — once info is saved, auto-populate on every template */
  infoSaved: boolean
  marketingEmailOptIn: boolean

  /* Actions */
  setStep: (step: PreviewStep) => void
  setBusinessInfo: (info: Partial<BusinessInfo>) => void
  replaceBusinessInfo: (info: BusinessInfo) => void
  setStylePreferences: (prefs: Partial<StylePreferences>) => void
  setMatchedTemplate: (match: MatchedTemplate | null) => void
  markInfoSaved: () => void
  setMarketingEmailOptIn: (enabled: boolean) => void
  reset: () => void
  startSample: (info: BusinessInfo) => void
  endSample: () => void

  /* Derived: values map for template hydration */
  getFieldValues: () => Record<string, string>
}

/* ------------------------------------------------------------------ */
/* Defaults                                                            */
/* ------------------------------------------------------------------ */

const defaultBusinessInfo: BusinessInfo = {
  businessName: '',
  ownerName: '',
  email: '',
  phone: '',
  address: '',
  niche: '',
  tagline: '',
  description: '',
  services: '',
  website: '',
}

const defaultStylePreferences: StylePreferences = {
  vibes: [],
  proseStyle: 'professional',
  colorMood: 'cool-modern',
  fontPreference: 'sans-serif',
  layoutDensity: 'balanced',
}

/* ------------------------------------------------------------------ */
/* Persist helpers (sessionStorage so data survives navigations)       */
/* ------------------------------------------------------------------ */

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function removeFromStorage(key: string) {
  if (typeof window === 'undefined') return
  try { sessionStorage.removeItem(key) } catch { /* storage may be disabled */ }
}

function saveToStorage(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch { /* quota exceeded — ignore */ }
}

/** Old or partially written browser drafts must never break the intake. */
function restoreBusinessInfo(): BusinessInfo {
  const raw = loadFromStorage<unknown>('pb_biz_info', null)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...defaultBusinessInfo }
  const restored = { ...defaultBusinessInfo }
  for (const key of Object.keys(restored) as (keyof BusinessInfo)[]) {
    const value = (raw as Record<string, unknown>)[key]
    if (typeof value === 'string') restored[key] = value
  }
  if (!getNicheSlugs().includes(restored.niche)) restored.niche = ''
  return restored
}

function restorePreferences(): StylePreferences {
  const raw = loadFromStorage<Partial<StylePreferences> | null>('pb_style_prefs', null)
  if (!raw || typeof raw !== 'object') return { ...defaultStylePreferences }
  return {
    vibes: Array.isArray(raw.vibes)
      ? raw.vibes.filter((v) => ['warm', 'bold', 'clean', 'luxurious', 'earthy', 'playful'].includes(v)).slice(0, 3)
      : [],
    proseStyle: ['professional', 'conversational', 'storytelling', 'minimal', 'authoritative'].includes(raw.proseStyle || '')
      ? raw.proseStyle! : defaultStylePreferences.proseStyle,
    colorMood: ['dark-elegant', 'light-airy', 'rich-warm', 'cool-modern', 'nature-organic', 'vibrant-energy'].includes(raw.colorMood || '')
      ? raw.colorMood! : defaultStylePreferences.colorMood,
    fontPreference: ['serif', 'sans-serif', 'mixed'].includes(raw.fontPreference || '')
      ? raw.fontPreference! : defaultStylePreferences.fontPreference,
    layoutDensity: ['spacious', 'balanced', 'compact'].includes(raw.layoutDensity || '')
      ? raw.layoutDensity! : defaultStylePreferences.layoutDensity,
  }
}

function restoreMatch(): MatchedTemplate | null {
  const raw = loadFromStorage<MatchedTemplate | null>('pb_matched', null)
  if (!raw || typeof raw !== 'object' || !getNicheSlugs().includes(raw.nicheSlug)) return null
  if (typeof raw.templateSlug !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/i.test(raw.templateSlug)) return null
  if (typeof raw.templateName !== 'string' || typeof raw.reason !== 'string') return null
  return {
    ...raw,
    matchScore: typeof raw.matchScore === 'number' && Number.isFinite(raw.matchScore) ? raw.matchScore : 0,
    pages: Array.isArray(raw.pages) ? raw.pages.filter((page) => typeof page === 'string') : undefined,
  }
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export const usePreviewStore = create<PreviewState>((set, get) => ({
  step: 'info',
  isSample: false,
  savedDraft: null,
  businessInfo: restoreBusinessInfo(),
  stylePreferences: restorePreferences(),
  matchedTemplate: restoreMatch(),
  infoSaved: loadFromStorage<unknown>('pb_info_saved', false) === true,
  marketingEmailOptIn: loadFromStorage<unknown>('pb_marketing_email_opt_in', false) === true,

  setStep: (step) => set({ step }),

  setBusinessInfo: (info) => {
    const previous = get().businessInfo
    const next = { ...previous, ...info }
    const nicheChanged = next.niche !== previous.niche
    if (!get().isSample) {
      saveToStorage('pb_biz_info', next)
      if (nicheChanged) saveToStorage('pb_matched', null)
    }
    set({ businessInfo: next, ...(nicheChanged ? { matchedTemplate: null } : {}) })
  },

  replaceBusinessInfo: (info) => {
    removeFromStorage(PREVIEW_SAMPLE_STORAGE_KEY)
    saveToStorage('pb_biz_info', info)
    saveToStorage('pb_matched', null)
    saveToStorage('pb_info_saved', false)
    saveToStorage('pb_style_prefs', defaultStylePreferences)
    set({ businessInfo: info, stylePreferences: defaultStylePreferences, matchedTemplate: null, infoSaved: false, step: 'info', isSample: false, savedDraft: null })
  },

  setStylePreferences: (prefs) => {
    const next = { ...get().stylePreferences, ...prefs }
    if (!get().isSample) saveToStorage('pb_style_prefs', next)
    set({ stylePreferences: next })
  },

  setMatchedTemplate: (match) => {
    if (!get().isSample) saveToStorage('pb_matched', match)
    set({ matchedTemplate: match })
  },

  setMarketingEmailOptIn: (enabled) => {
    if (!get().isSample) saveToStorage('pb_marketing_email_opt_in', enabled)
    set({ marketingEmailOptIn: enabled })
  },

  markInfoSaved: () => {
    if (!get().isSample) saveToStorage('pb_info_saved', true)
    set({ infoSaved: true })
  },

  startSample: (info) => {
    const current = get()
    const savedDraft = current.savedDraft || {
      businessInfo: current.businessInfo,
      stylePreferences: current.stylePreferences,
      matchedTemplate: current.matchedTemplate,
      infoSaved: current.infoSaved,
      marketingEmailOptIn: current.marketingEmailOptIn,
    }
    saveToStorage(PREVIEW_SAMPLE_STORAGE_KEY, 1)
    // Sample values are intentionally transient; reloading restores the real draft.
    set({
      businessInfo: info,
      stylePreferences: { ...defaultStylePreferences, vibes: ['warm', 'earthy'], colorMood: 'nature-organic' },
      matchedTemplate: null,
      infoSaved: false,
      isSample: true,
      savedDraft,
      step: 'matching',
    })
  },

  endSample: () => {
    const draft = get().savedDraft
    removeFromStorage(PREVIEW_SAMPLE_STORAGE_KEY)
    set({ ...(draft || {}), savedDraft: null, isSample: false, step: 'info' })
  },

  reset: () => {
    // Clear preview/checkout data only. Image ownership and unrelated portal or
    // Booking Kit state must survive starting a new business draft.
    for (const key of [
      'pb_biz_info', 'pb_style_prefs', 'pb_matched', 'pb_info_saved', 'pb_marketing_email_opt_in',
      'pb_template_values', 'pb_catalog_revision', 'pb_checkout_context',
      'pb_custom_theme', 'pb_inline_edits',
      'pb_inline_edits_legacy_migrated_v1', 'pb_image_swaps',
      'pb_image_swaps_legacy_migrated_v1',
      PREVIEW_SAMPLE_STORAGE_KEY,
    ]) removeFromStorage(key)
    for (const key of ['pb_inline_edits_by_scope_v1', 'pb_image_swaps_by_scope_v1']) {
      const scopes = loadFromStorage<Record<string, unknown> | null>(key, null)
      if (scopes && typeof scopes === 'object' && !Array.isArray(scopes)) {
        saveToStorage(key, Object.fromEntries(Object.entries(scopes).filter(([scope]) => scope.startsWith('portal:'))))
      } else {
        removeFromStorage(key)
      }
    }
    set({
      step: 'info',
      businessInfo: { ...defaultBusinessInfo },
      stylePreferences: { ...defaultStylePreferences, vibes: [] },
      matchedTemplate: null,
      infoSaved: false,
      isSample: false,
      savedDraft: null,
      marketingEmailOptIn: false,
    })
  },

  getFieldValues: () => {
    const b = get().businessInfo
    return {
      BUSINESS_NAME: b.businessName,
      PRACTICE_NAME: b.businessName,
      BRAND_NAME: b.businessName,
      STUDIO_NAME: b.businessName,
      OWNER_NAME: b.ownerName,
      PRACTITIONER_NAME: b.ownerName,
      COACH_NAME: b.ownerName,
      FACILITATOR_NAME: b.ownerName,
      EMAIL: b.email,
      PHONE: b.phone,
      PHONE_NUMBER: b.phone,
      ADDRESS: b.address,
      TAGLINE: b.tagline,
      DESCRIPTION: b.description,
      SERVICES: b.services,
      PRIMARY_CTA_URL: '/contact.html',
      BOOKING_URL: '/contact.html',
      PRIMARY_CTA_LABEL: 'Get in touch',
      CTA_LABEL: 'Get in touch',
      // Common aliases used in templates
      business_name: b.businessName,
      owner_name: b.ownerName,
      practitioner_name: b.ownerName,
      coach_name: b.ownerName,
      facilitator_name: b.ownerName,
      email: b.email,
      phone: b.phone,
      phone_number: b.phone,
      address: b.address,
      tagline: b.tagline,
      description: b.description,
    }
  },
}))
