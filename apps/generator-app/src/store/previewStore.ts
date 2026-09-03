import { create } from 'zustand'

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

interface PreviewState {
  /* Navigation */
  step: PreviewStep

  /* Data */
  businessInfo: BusinessInfo
  stylePreferences: StylePreferences
  matchedTemplate: MatchedTemplate | null

  /* Persisted flag — once info is saved, auto-populate on every template */
  infoSaved: boolean

  /* Actions */
  setStep: (step: PreviewStep) => void
  setBusinessInfo: (info: Partial<BusinessInfo>) => void
  setStylePreferences: (prefs: Partial<StylePreferences>) => void
  setMatchedTemplate: (match: MatchedTemplate) => void
  markInfoSaved: () => void
  reset: () => void

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

function saveToStorage(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch { /* quota exceeded — ignore */ }
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export const usePreviewStore = create<PreviewState>((set, get) => ({
  step: 'info',
  businessInfo: loadFromStorage('pb_biz_info', defaultBusinessInfo),
  stylePreferences: loadFromStorage('pb_style_prefs', defaultStylePreferences),
  matchedTemplate: loadFromStorage('pb_matched', null),
  infoSaved: loadFromStorage('pb_info_saved', false),

  setStep: (step) => set({ step }),

  setBusinessInfo: (info) => {
    const next = { ...get().businessInfo, ...info }
    saveToStorage('pb_biz_info', next)
    set({ businessInfo: next })
  },

  setStylePreferences: (prefs) => {
    const next = { ...get().stylePreferences, ...prefs }
    saveToStorage('pb_style_prefs', next)
    set({ stylePreferences: next })
  },

  setMatchedTemplate: (match) => {
    saveToStorage('pb_matched', match)
    set({ matchedTemplate: match })
  },

  markInfoSaved: () => {
    saveToStorage('pb_info_saved', true)
    set({ infoSaved: true })
  },

  reset: () => {
    sessionStorage.removeItem('pb_biz_info')
    sessionStorage.removeItem('pb_style_prefs')
    sessionStorage.removeItem('pb_matched')
    sessionStorage.removeItem('pb_info_saved')
    set({
      step: 'info',
      businessInfo: defaultBusinessInfo,
      stylePreferences: defaultStylePreferences,
      matchedTemplate: null,
      infoSaved: false,
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
      PRIMARY_CTA_URL: 'contact.html',
      BOOKING_URL: 'contact.html',
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
