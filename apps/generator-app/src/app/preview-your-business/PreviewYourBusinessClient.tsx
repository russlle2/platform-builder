'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { usePreviewStore } from '@/store/previewStore'
import {
  type InlineEditMap,
  mergeInlineEdit,
  applyInlineEditsToHtml,
  loadInlineEdits,
  saveInlineEdits,
} from '@/lib/inline-edits'
import {
  type ImageSwapMap,
  loadImageSwaps,
  applyImageSwapsToHtml,
  handlePersistentImageUpload,
  getOrCreateImageOwnerId,
} from '@/lib/image-swaps'
import { CustomerImageLibrary } from '@/components/CustomerImageLibrary'
import type {
  BusinessInfo,
  StylePreferences,
  VibeOption,
  ProseStyle,
  ColorMood,
  MatchedTemplate,
  PreviewStep,
} from '@/store/previewStore'
import { computeClientReadiness } from '@/lib/client-readiness'
import { ClientReadinessPanel } from '@/components/preview/ClientReadinessPanel'

/* ================================================================== */
/* Constants & helpers                                                 */
/* ================================================================== */

const NICHE_OPTIONS = [
  { slug: 'aromatherapy', label: 'Aromatherapy', icon: '🌿' },
  { slug: 'holistic_medicine', label: 'Holistic Medicine', icon: '🧘' },
  { slug: 'private_practice_therapist', label: 'Private Practice Therapist', icon: '💬' },
  { slug: 'sound_bath', label: 'Sound Bath', icon: '🔔' },
  { slug: 'wellness_coach', label: 'Wellness Coach', icon: '✨' },
]

type NicheExample = {
  businessName: string
  tagline: string
  description: string
  services: string
}

const NICHE_EXAMPLES: Record<string, NicheExample> = {
  default: {
    businessName: 'Bloom Wellness Studio',
    tagline: 'Care that meets you where you are.',
    description:
      'A wellness practice helping clients feel grounded, supported, and ready to take the next step.',
    services: 'Consultations, Programs, Workshops, Virtual Sessions',
  },
  aromatherapy: {
    businessName: 'Wildflower Aromatherapy',
    tagline: 'Pure essential oils for everyday calm.',
    description:
      'A boutique aromatherapy studio crafting custom essential oil blends and guided scent rituals for relaxation and balance.',
    services: 'Custom Blends, Aromatherapy Massage, Scent Workshops, Wellness Consultations',
  },
  holistic_medicine: {
    businessName: 'Whole Roots Holistic Health',
    tagline: 'Whole-person care, naturally.',
    description:
      'An integrative health practice blending naturopathic medicine, nutrition, and mind-body therapies to support lasting wellness.',
    services: 'Naturopathic Consults, Nutrition Coaching, Herbal Medicine, Acupuncture',
  },
  private_practice_therapist: {
    businessName: 'Stillwater Therapy',
    tagline: 'A safe space to grow and heal.',
    description:
      'A private counseling practice offering compassionate, evidence-based therapy for individuals and couples navigating difficult seasons.',
    services: 'Individual Therapy, Couples Counseling, Anxiety Support, Telehealth Sessions',
  },
  sound_bath: {
    businessName: 'Resonance Sound Healing',
    tagline: 'Restore your rhythm.',
    description:
      'A sound healing studio offering immersive sound bath journeys and guided meditation to ease stress and deepen relaxation.',
    services: 'Group Sound Baths, Private Sessions, Guided Meditation, Corporate Wellness',
  },
  wellness_coach: {
    businessName: 'Vitality Path Coaching',
    tagline: 'Build habits that last.',
    description:
      'A wellness coaching practice helping clients create sustainable routines for energy, clarity, and long-term health.',
    services: '1:1 Coaching, Group Programs, Habit Reset Intensives, Discovery Calls',
  },
}

function getNicheExample(niche: string): NicheExample {
  return NICHE_EXAMPLES[niche] || NICHE_EXAMPLES.default
}

const DEMO_RECORD_CALLOUTS: Record<PreviewStep, string> = {
  info: 'Step 1 — Add your business details once',
  style: 'Step 2 — Choose the look and voice for your brand',
  matching: 'Step 3 — We match you with a layout for your niche',
  editor: 'Your website preview — filled with your real business info',
  browse: 'Browse personalized layouts — every page already has your details',
}

const VIBE_OPTIONS: { value: VibeOption; label: string; icon: string; desc: string }[] = [
  { value: 'warm', label: 'Warm', icon: '≡ƒîà', desc: 'Inviting, cozy, human' },
  { value: 'bold', label: 'Bold', icon: 'ΓÜí', desc: 'Strong, assertive, high-impact' },
  { value: 'clean', label: 'Clean', icon: 'Γ£¿', desc: 'Minimal, organized, crisp' },
  { value: 'luxurious', label: 'Luxurious', icon: '≡ƒÆÄ', desc: 'Premium, sophisticated, refined' },
  { value: 'earthy', label: 'Earthy', icon: '≡ƒî┐', desc: 'Natural, grounded, organic' },
  { value: 'playful', label: 'Playful', icon: '≡ƒÄ¿', desc: 'Creative, fun, approachable' },
]

const PROSE_OPTIONS: { value: ProseStyle; label: string; desc: string }[] = [
  { value: 'professional', label: 'Professional', desc: 'Polished, industry-standard language' },
  { value: 'conversational', label: 'Conversational', desc: 'Friendly tone, like talking to a friend' },
  { value: 'storytelling', label: 'Storytelling', desc: 'Narrative-driven, brand-story focused' },
  { value: 'minimal', label: 'Minimal', desc: 'Short, punchy, to-the-point' },
  { value: 'authoritative', label: 'Authoritative', desc: 'Expert voice, data-driven confidence' },
]

const COLOR_MOOD_OPTIONS: { value: ColorMood; label: string; preview: string }[] = [
  { value: 'dark-elegant', label: 'Dark & Elegant', preview: 'bg-gradient-to-r from-slate-900 to-slate-700' },
  { value: 'light-airy', label: 'Light & Airy', preview: 'bg-gradient-to-r from-sky-100 to-blue-50' },
  { value: 'rich-warm', label: 'Rich & Warm', preview: 'bg-gradient-to-r from-amber-700 to-orange-500' },
  { value: 'cool-modern', label: 'Cool & Modern', preview: 'bg-gradient-to-r from-cyan-600 to-blue-600' },
  { value: 'nature-organic', label: 'Nature & Organic', preview: 'bg-gradient-to-r from-emerald-700 to-teal-500' },
  { value: 'vibrant-energy', label: 'Vibrant & Energy', preview: 'bg-gradient-to-r from-rose-500 to-violet-600' },
]

const STEP_META: Record<PreviewStep, { label: string; number: number }> = {
  info: { label: 'Your Info', number: 1 },
  style: { label: 'Style & Vibe', number: 2 },
  matching: { label: 'Your Match', number: 3 },
  editor: { label: 'Customize', number: 4 },
  browse: { label: 'Browse More', number: 5 },
}

/* ================================================================== */
/* Template matching algorithm                                         */
/* ================================================================== */

interface ApiTemplate {
  slug: string
  name: string
  nicheSlug: string
  layoutFamily?: string
  voiceFamily?: string
  snippet: string
}

function scoreTemplate(
  t: ApiTemplate,
  prefs: StylePreferences,
  niche: string,
): { score: number; reason: string } {
  let score = 0
  const reasons: string[] = []

  // Niche match is heaviest
  if (t.nicheSlug === niche) {
    score += 40
    reasons.push('industry match')
  }

  // Layout family / voice family matching against vibe + prose
  const snippet = (t.snippet + ' ' + (t.voiceFamily || '') + ' ' + (t.layoutFamily || '')).toLowerCase()

  // Vibe matching
  const vibeKeywords: Record<VibeOption, string[]> = {
    warm: ['warm', 'welcome', 'comfort', 'cozy', 'heart', 'caring', 'gentle', 'invit'],
    bold: ['bold', 'strong', 'power', 'impact', 'urgent', 'action', 'call', 'emergency', 'fast'],
    clean: ['clean', 'minimal', 'simple', 'crisp', 'modern', 'sleek', 'sharp', 'focused'],
    luxurious: ['luxury', 'premium', 'elegant', 'sophisticat', 'refine', 'exclusive', 'prestige'],
    earthy: ['earth', 'natur', 'organic', 'holistic', 'ground', 'herb', 'botanical', 'essent'],
    playful: ['fun', 'playful', 'creative', 'bright', 'vibrant', 'dynamic', 'energetic'],
  }
  for (const vibe of prefs.vibes) {
    const keywords = vibeKeywords[vibe] || []
    for (const kw of keywords) {
      if (snippet.includes(kw)) {
        score += 5
        break
      }
    }
  }

  // Prose matching
  const proseKeywords: Record<ProseStyle, string[]> = {
    professional: ['professional', 'trusted', 'certified', 'expert', 'quality', 'industry'],
    conversational: ['friend', 'chat', 'talk', 'you', 'your', 'let\'s', 'together', 'we'],
    storytelling: ['story', 'journey', 'transform', 'experience', 'discover', 'imagine'],
    minimal: ['simple', 'fast', 'quick', 'easy', 'just', 'one'],
    authoritative: ['proven', 'data', 'result', 'guarantee', 'science', 'research', 'advanced'],
  }
  const pKeywords = proseKeywords[prefs.proseStyle] || []
  for (const kw of pKeywords) {
    if (snippet.includes(kw)) {
      score += 3
      reasons.push('prose match')
      break
    }
  }

  // Small random jitter for variety
  score += Math.random() * 3

  if (reasons.length === 0) reasons.push('diverse design')
  return { score, reason: reasons.join(', ') }
}

/* ================================================================== */
/* Main component                                                      */
/* ================================================================== */

export default function PreviewYourBusinessClient() {
  const searchParams = useSearchParams()
  const demoRecord = searchParams.get('demoRecord') === '1'
  const nichePrefill = searchParams.get('niche')
  const nichePrefilledRef = useRef(false)

  const {
    step,
    setStep,
    businessInfo,
    setBusinessInfo,
    stylePreferences,
    setStylePreferences,
    matchedTemplate,
    setMatchedTemplate,
    markInfoSaved,
    getFieldValues,
  } = usePreviewStore()

  // ---- template fetching ----
  const [templates, setTemplates] = useState<ApiTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)

  // ---- preview state ----
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState('index.html')
  const [editMode, setEditMode] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null!)
  const fileInputRef = useRef<HTMLInputElement>(null!)
  const pendingImageSwapSrc = useRef('')

  // Inline text edits captured from the preview, persisted so they survive
  // page navigation and carry through to purchase.
  const inlineEditsRef = useRef<InlineEditMap>({})
  const imageSwapsRef = useRef<ImageSwapMap>({})
  const currentPageRef = useRef('index.html')
  currentPageRef.current = currentPage

  /* ---- Color & font customization ---- */
  const [customColors, setCustomColors] = useState({ primary: '#0ea5e9', bg: '#0f172a', text: '#e2e8f0' })
  const [customFonts, setCustomFonts] = useState<{
    heading: string
    body: string
    importUrl?: string
  }>({ heading: 'inherit', body: 'inherit' })
  const [showColorPanel, setShowColorPanel] = useState(false)
  const [showFontPanel, setShowFontPanel] = useState(false)

  // ---- Browse templates state ----
  const [browseTemplates, setBrowseTemplates] = useState<ApiTemplate[]>([])

  const clientReadiness = useMemo(
    () => computeClientReadiness(businessInfo, stylePreferences),
    [businessInfo, stylePreferences],
  )

  /* ================ Fetch templates for niche ================ */
  const fetchTemplatesForNiche = useCallback(async (niche: string) => {
    setTemplatesLoading(true)
    try {
      const res = await fetch(`/api/templates/${niche}`)
      if (res.ok) {
        const data = await res.json()
        const withNiche = (data.templates || []).map((t: ApiTemplate) => ({
          ...t,
          nicheSlug: t.nicheSlug || niche,
        }))
        setTemplates(withNiche)
        return withNiche
      }
    } catch { /* ignore */ }
    setTemplatesLoading(false)
    return []
  }, [])

  /* ================ Match template ================ */
  const runMatching = useCallback(async () => {
    setStep('matching')
    let tpls = templates
    if (tpls.length === 0 && businessInfo.niche) {
      tpls = await fetchTemplatesForNiche(businessInfo.niche)
    }

    if (tpls.length === 0) {
      // Fallback
      setMatchedTemplate({
        nicheSlug: businessInfo.niche || 'wellness_coach',
        templateSlug: '',
        templateName: 'No templates found',
        matchScore: 0,
        reason: 'No templates available for this niche',
      })
      setTemplatesLoading(false)
      return
    }

    // Score all
    const scored = tpls.map((t: ApiTemplate) => {
      const withNiche = { ...t, nicheSlug: t.nicheSlug || businessInfo.niche }
      return { ...withNiche, ...scoreTemplate(withNiche, stylePreferences, businessInfo.niche) }
    })
    scored.sort((a: { score: number }, b: { score: number }) => b.score - a.score)

    const best = scored[0]
    const resolvedNiche = best.nicheSlug || businessInfo.niche
    setMatchedTemplate({
      nicheSlug: resolvedNiche,
      templateSlug: best.slug,
      templateName: best.name,
      matchScore: best.score,
      reason: best.reason,
    })
    setTemplatesLoading(false)
  }, [templates, businessInfo.niche, stylePreferences, setStep, setMatchedTemplate, fetchTemplatesForNiche])

  /* ================ Load live preview ================ */
  const loadPreview = useCallback(
    async (nicheSlug?: string, templateSlug?: string, page = 'index.html') => {
      const ns = nicheSlug || matchedTemplate?.nicheSlug || businessInfo.niche
      const ts = templateSlug || matchedTemplate?.templateSlug
      if (!ns || !ts) {
        setPreviewError('Choose a template with a valid niche and layout before previewing.')
        setPreviewHtml(null)
        return
      }
      setPreviewLoading(true)
      setPreviewError(null)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000)

      try {
        try {
          sessionStorage.setItem('pb_template_values', JSON.stringify(getFieldValues()))
        } catch { /* ignore */ }

        const res = await fetch(`/api/templates/${ns}/${ts}/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page,
            values: getFieldValues(),
            colorScheme: stylePreferences.colorMood,
            fontVariation: stylePreferences.fontPreference,
            structureVariation: stylePreferences.layoutDensity,
          }),
          signal: controller.signal,
        })
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(
            typeof errBody?.error === 'string' ? errBody.error : `Preview failed (${res.status})`,
          )
        }
        const data = await res.json()

        let html = data.html as string
        const assetBase = `/api/templates/${ns}/${ts}/assets`

        html = html.replace(
          /(href|src)="(?!https?:\/\/|\/\/|data:|mailto:|tel:|#)([^"]+)"/g,
          (match, attr, path) => {
            if (path.endsWith('.html')) return match
            return `${attr}="${assetBase}/${path}"`
          },
        )

        html = html.replace(
          /<img([^>]*?)src="([^"]+)"([^>]*)>/gi,
          (_m, before, src, after) => {
            let imgSrc = src
            if (src.startsWith('/api/templates')) {
              imgSrc = `/.netlify/images?url=${encodeURIComponent(src)}&w=1200&q=72`
            }
            const lazy = after.includes('loading=') ? after : `${after} loading="lazy" decoding="async"`
            return `<img${before}src="${imgSrc}"${lazy}>`
          },
        )

        if (data.css) {
          html = html.replace('</head>', `<style>${data.css}</style></head>`)
        }
        if (data.variationCSS) {
          html = html.replace(
            '</head>',
            `<style id="variation-overrides">${data.variationCSS}</style></head>`,
          )
        }

        // Inject custom colors/fonts
        html = html.replace('</head>', `
          <style>
            body { margin: 0; }
            img { cursor: pointer; transition: outline 0.15s; }
            img:hover { outline: 3px solid #8b5cf6; outline-offset: 2px; border-radius: 2px; }
          </style>
        </head>`)

        // Re-apply inline text edits captured earlier (not part of hydration)
        html = applyInlineEditsToHtml(html, inlineEditsRef.current[page])
        html = applyImageSwapsToHtml(html, imageSwapsRef.current[page])

        // Inject editing + nav scripts
        html = html.replace('</body>', getIframeInjectionScript() + '</body>')

        setPreviewHtml(html)
        setCurrentPage(page)
      } catch (e) {
        console.error('Preview error:', e)
        setPreviewHtml(null)
        const aborted = e instanceof DOMException && e.name === 'AbortError'
        setPreviewError(
          aborted
            ? 'The preview took too long to load. Check your connection and tap Retry.'
            : e instanceof Error
              ? e.message
              : 'Unable to load template preview. Try again or pick another template.',
        )
      } finally {
        clearTimeout(timeoutId)
        setPreviewLoading(false)
      }
    },
    [matchedTemplate, businessInfo.niche, getFieldValues, stylePreferences],
  )

  useEffect(() => {
    if (nichePrefilledRef.current || !nichePrefill) return
    if (!NICHE_OPTIONS.some((n) => n.slug === nichePrefill)) return
    if (!businessInfo.niche) {
      setBusinessInfo({ niche: nichePrefill })
    }
    nichePrefilledRef.current = true
  }, [nichePrefill, businessInfo.niche, setBusinessInfo])

  /* ================ Restore persisted inline edits ================ */
  useEffect(() => {
    inlineEditsRef.current = loadInlineEdits()
    imageSwapsRef.current = loadImageSwaps()
    getOrCreateImageOwnerId()
  }, [])

  /* ================ Iframe messaging ================ */
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!e.data || typeof e.data !== 'object') return
      if (e.data.type === 'navigatePage') {
        loadPreview(undefined, undefined, e.data.page)
      }
      if (e.data.type === 'imageSwapRequest') {
        pendingImageSwapSrc.current = e.data.src
        fileInputRef.current?.click()
      }
      if (e.data.type === 'textEdited') {
        const page = currentPageRef.current
        const pageEdits = mergeInlineEdit(
          inlineEditsRef.current[page] || [],
          (e.data.original as string) || '',
          (e.data.text as string) || '',
        )
        inlineEditsRef.current = { ...inlineEditsRef.current, [page]: pageEdits }
        saveInlineEdits(inlineEditsRef.current)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [loadPreview])

  const handleImageFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const page = currentPageRef.current
    const originalSrc = pendingImageSwapSrc.current
    const owner = getOrCreateImageOwnerId()
    try {
      const { map, url } = await handlePersistentImageUpload(
        file,
        owner,
        originalSrc,
        page,
        imageSwapsRef.current,
      )
      imageSwapsRef.current = map
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'imageSwapResponse', imageUrl: url, originalSrc },
        '*',
      )
    } catch (err) {
      console.error('Image upload failed:', err)
      alert(err instanceof Error ? err.message : 'Image upload failed')
    }
    e.target.value = ''
  }, [])

  /* ================ Open editor for matched template ================ */
  const openEditor = useCallback(() => {
    markInfoSaved()
    setStep('editor')
    loadPreview()
  }, [markInfoSaved, setStep, loadPreview])

  /* ================ Open browse mode ================ */
  const openBrowse = useCallback(async () => {
    markInfoSaved()
    setStep('browse')
    let tpls = templates
    if (tpls.length === 0 && businessInfo.niche) {
      tpls = await fetchTemplatesForNiche(businessInfo.niche)
    }
    setBrowseTemplates(tpls)
  }, [markInfoSaved, setStep, templates, businessInfo.niche, fetchTemplatesForNiche])

  /* ================ Select a template from browse ================ */
  const selectBrowseTemplate = useCallback((t: ApiTemplate) => {
    const resolvedNiche = t.nicheSlug || businessInfo.niche
    setMatchedTemplate({
      nicheSlug: resolvedNiche,
      templateSlug: t.slug,
      templateName: t.name,
      matchScore: 0,
      reason: 'manually selected',
    })
    setStep('editor')
    loadPreview(resolvedNiche, t.slug)
  }, [businessInfo.niche, setMatchedTemplate, setStep, loadPreview])

  /* ================================================================ */
  /* Render                                                           */
  /* ================================================================ */

  return (
    <main className="relative min-h-screen pt-24 pb-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0" style={{
          background: [
            'radial-gradient(ellipse 800px 600px at 15% 10%, rgba(34,211,238,0.12), transparent)',
            'radial-gradient(ellipse 600px 800px at 85% 20%, rgba(139,92,246,0.09), transparent)',
            'radial-gradient(ellipse 700px 500px at 50% 80%, rgba(244,63,94,0.07), transparent)',
          ].join(', '),
        }} />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
      </div>

      <div className="relative z-10">
        {/* Progress bar */}
        <div className="container-hvac mb-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {(['info', 'style', 'matching', 'editor'] as PreviewStep[]).map((s) => {
              const meta = STEP_META[s]
              const isActive = s === step
              const isCompleted = meta.number < STEP_META[step].number
              return (
                <div key={s} className="flex items-center gap-2 shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-cyan-500 text-white scale-110'
                        : isCompleted
                          ? 'bg-cyan-500/30 text-cyan-200'
                          : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {isCompleted ? 'Γ£ô' : meta.number}
                  </div>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isActive ? 'text-white' : 'text-slate-400'}`}>
                    {meta.label}
                  </span>
                  {meta.number < 4 && <div className="w-8 h-px bg-white/20 mx-1" />}
                </div>
              )
            })}
          </div>
        </div>

        {/* ============ STEP 1 ΓÇö BUSINESS INFO ============ */}
        {step === 'info' && (
          <InfoStep
            info={businessInfo}
            onChange={setBusinessInfo}
            onNext={() => setStep('style')}
          />
        )}

        {/* ============ STEP 2 ΓÇö STYLE & VIBE ============ */}
        {step === 'style' && (
          <StyleStep
            prefs={stylePreferences}
            onChange={setStylePreferences}
            onBack={() => setStep('info')}
            onNext={runMatching}
          />
        )}

        {/* ============ STEP 3 ΓÇö MATCHING ============ */}
        {step === 'matching' && (
          <MatchStep
            matched={matchedTemplate}
            loading={templatesLoading}
            readiness={clientReadiness}
            onEdit={openEditor}
            onBrowse={openBrowse}
          />
        )}

        {/* ============ STEP 4 ΓÇö EDITOR ============ */}
        {step === 'editor' && matchedTemplate && (
          <EditorStep
            matched={matchedTemplate}
            readiness={clientReadiness}
            previewHtml={previewHtml}
            previewLoading={previewLoading}
            previewError={previewError}
            demoRecord={demoRecord}
            currentPage={currentPage}
            editMode={editMode}
            setEditMode={setEditMode}
            iframeRef={iframeRef}
            fileInputRef={fileInputRef}
            handleImageFileChange={handleImageFileChange}
            onLoadPreview={loadPreview}
            showColorPanel={showColorPanel}
            setShowColorPanel={setShowColorPanel}
            showFontPanel={showFontPanel}
            setShowFontPanel={setShowFontPanel}
            customColors={customColors}
            setCustomColors={setCustomColors}
            customFonts={customFonts}
            setCustomFonts={setCustomFonts}
          />
        )}

        {/* ============ STEP 5 ΓÇö BROWSE TEMPLATES ============ */}
        {step === 'browse' && (
          <BrowseStep
            templates={browseTemplates}
            niche={businessInfo.niche}
            onSelect={selectBrowseTemplate}
            onBack={() => {
              if (matchedTemplate?.templateSlug) {
                setStep('editor')
              } else {
                setStep('matching')
              }
            }}
          />
        )}
      </div>

      {demoRecord && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-slate-950/95 border border-cyan-400/40 text-cyan-100 text-sm font-medium shadow-2xl max-w-xl text-center pointer-events-none">
          {DEMO_RECORD_CALLOUTS[step]}
        </div>
      )}
    </main>
  )
}

/* ================================================================== */
/* STEP 1 ΓÇö Info collection                                            */
/* ================================================================== */

function InfoStep({
  info,
  onChange,
  onNext,
}: {
  info: BusinessInfo
  onChange: (info: Partial<BusinessInfo>) => void
  onNext: () => void
}) {
  const [errors, setErrors] = useState<Partial<Record<keyof BusinessInfo, string>>>({})

  const validate = () => {
    const e: typeof errors = {}
    if (!info.businessName.trim()) e.businessName = 'Required'
    if (!info.niche) e.niche = 'Pick your industry'
    if (!info.email.trim()) e.email = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = () => {
    if (validate()) onNext()
  }

  const ex = getNicheExample(info.niche)

  return (
    <section className="container-hvac py-8 max-w-3xl mx-auto">
      <div className="space-y-2 mb-8">
        <span className="signal-chip">Step 1 of 4</span>
        <h1 className="text-4xl md:text-5xl font-bold text-white">
          Tell us about your business
        </h1>
        <p className="text-lg text-slate-300">
          We&apos;ll use this to fill in every page of your website automatically.
        </p>
      </div>

      <div className="glass-panel rounded-2xl p-8 space-y-6">
        {/* Niche selector */}
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-3">
            What industry are you in? <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {NICHE_OPTIONS.map((n) => (
              <button
                key={n.slug}
                type="button"
                onClick={() => onChange({ niche: n.slug })}
                className={`p-4 rounded-xl border text-left transition-all ${
                  info.niche === n.slug
                    ? 'border-cyan-400 bg-cyan-500/15 text-white ring-2 ring-cyan-400/40'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <span className="text-2xl block mb-1">{n.icon}</span>
                <span className="text-sm font-semibold">{n.label}</span>
              </button>
            ))}
          </div>
          {errors.niche && <p className="text-red-400 text-sm mt-1">{errors.niche}</p>}
        </div>

        {/* Core fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Business Name" required value={info.businessName} error={errors.businessName}
            onChange={(v) => onChange({ businessName: v })} placeholder={ex.businessName} />
          <Field label="Owner / Contact Name" value={info.ownerName}
            onChange={(v) => onChange({ ownerName: v })} placeholder="Jane Smith" />
          <Field label="Email" required type="email" value={info.email} error={errors.email}
            onChange={(v) => onChange({ email: v })} placeholder="hello@yourbusiness.com" />
          <Field label="Phone" type="tel" value={info.phone}
            onChange={(v) => onChange({ phone: v })} placeholder="(555) 123-4567" />
        </div>

        <Field label="Address / Service Area" value={info.address}
          onChange={(v) => onChange({ address: v })} placeholder="123 Main St, Denver, CO" />
        <Field label="Tagline" value={info.tagline}
          onChange={(v) => onChange({ tagline: v })} placeholder={ex.tagline} />
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">Description</label>
          <textarea
            value={info.description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={3}
            placeholder={ex.description}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-y"
          />
        </div>
        <Field label="Services (comma-separated)" value={info.services}
          onChange={(v) => onChange({ services: v })} placeholder={ex.services} />
        <Field label="Existing Website (optional)" value={info.website}
          onChange={(v) => onChange({ website: v })} placeholder="https://yourbusiness.com" />
      </div>

      <div className="flex justify-end mt-8">
        <button
          onClick={handleNext}
          className="px-8 py-4 text-lg font-bold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all"
        >
          Continue to Style Preferences ΓåÆ
        </button>
      </div>
    </section>
  )
}

/* ================================================================== */
/* STEP 2 ΓÇö Style & Vibe quiz                                         */
/* ================================================================== */

function StyleStep({
  prefs,
  onChange,
  onBack,
  onNext,
}: {
  prefs: StylePreferences
  onChange: (prefs: Partial<StylePreferences>) => void
  onBack: () => void
  onNext: () => void
}) {
  const toggleVibe = (v: VibeOption) => {
    const current = prefs.vibes
    if (current.includes(v)) {
      onChange({ vibes: current.filter((x) => x !== v) })
    } else if (current.length < 3) {
      onChange({ vibes: [...current, v] })
    }
  }

  return (
    <section className="container-hvac py-8 max-w-3xl mx-auto">
      <div className="space-y-2 mb-8">
        <span className="signal-chip">Step 2 of 4</span>
        <h1 className="text-4xl md:text-5xl font-bold text-white">
          What&apos;s your style?
        </h1>
        <p className="text-lg text-slate-300">
          Pick the vibe, writing tone, and aesthetic you want your website to have. We&apos;ll match you to the perfect template.
        </p>
      </div>

      {/* Vibes */}
      <div className="glass-panel rounded-2xl p-8 space-y-8">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Choose your vibe</h2>
          <p className="text-sm text-slate-400 mb-4">Select up to 3</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {VIBE_OPTIONS.map((v) => {
              const selected = prefs.vibes.includes(v.value)
              return (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => toggleVibe(v.value)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selected
                      ? 'border-cyan-400 bg-cyan-500/15 text-white ring-2 ring-cyan-400/40'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span className="text-2xl block mb-1">{v.icon}</span>
                  <span className="text-sm font-bold">{v.label}</span>
                  <span className="text-xs text-slate-400 block mt-0.5">{v.desc}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Prose style */}
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Writing tone</h2>
          <p className="text-sm text-slate-400 mb-4">How should your website sound?</p>
          <div className="space-y-2">
            {PROSE_OPTIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => onChange({ proseStyle: p.value })}
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4 ${
                  prefs.proseStyle === p.value
                    ? 'border-cyan-400 bg-cyan-500/15 text-white ring-2 ring-cyan-400/40'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                  prefs.proseStyle === p.value ? 'border-cyan-400 bg-cyan-400' : 'border-white/30'
                }`} />
                <div>
                  <span className="font-bold block">{p.label}</span>
                  <span className="text-xs text-slate-400">{p.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Color mood */}
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Color mood</h2>
          <p className="text-sm text-slate-400 mb-4">What palette speaks to you?</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {COLOR_MOOD_OPTIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => onChange({ colorMood: c.value })}
                className={`rounded-xl border overflow-hidden transition-all ${
                  prefs.colorMood === c.value
                    ? 'border-cyan-400 ring-2 ring-cyan-400/40'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className={`h-12 ${c.preview}`} />
                <div className="p-3 bg-white/5">
                  <span className="text-sm font-semibold text-white">{c.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Font preference */}
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Font style</h2>
          <div className="grid grid-cols-3 gap-3">
            {([
              { value: 'serif' as const, label: 'Serif', sample: 'font-serif' },
              { value: 'sans-serif' as const, label: 'Sans-Serif', sample: 'font-sans' },
              { value: 'mixed' as const, label: 'Mixed', sample: '' },
            ]).map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => onChange({ fontPreference: f.value })}
                className={`p-4 rounded-xl border text-center transition-all ${
                  prefs.fontPreference === f.value
                    ? 'border-cyan-400 bg-cyan-500/15 ring-2 ring-cyan-400/40'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <span className={`text-2xl font-bold text-white ${f.sample}`}>Aa</span>
                <span className="text-sm text-slate-300 block mt-1">{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Layout density */}
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Layout feel</h2>
          <div className="grid grid-cols-3 gap-3">
            {([
              { value: 'spacious' as const, label: 'Spacious', icon: 'ΓûæΓûæΓûæ' },
              { value: 'balanced' as const, label: 'Balanced', icon: 'ΓûÆΓûÆΓûÆ' },
              { value: 'compact' as const, label: 'Compact', icon: 'ΓûêΓûêΓûê' },
            ]).map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => onChange({ layoutDensity: l.value })}
                className={`p-4 rounded-xl border text-center transition-all ${
                  prefs.layoutDensity === l.value
                    ? 'border-cyan-400 bg-cyan-500/15 ring-2 ring-cyan-400/40'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <span className="text-xl block mb-1 font-mono text-white">{l.icon}</span>
                <span className="text-sm text-slate-300">{l.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={onBack}
          className="px-6 py-3 text-sm font-bold text-slate-300 border border-white/20 rounded-lg hover:bg-white/10 transition-all"
        >
          ΓåÉ Back
        </button>
        <button
          onClick={onNext}
          className="px-8 py-4 text-lg font-bold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all"
        >
          Find My Perfect Template ΓåÆ
        </button>
      </div>
    </section>
  )
}

/* ================================================================== */
/* STEP 3 ΓÇö Match reveal                                               */
/* ================================================================== */

function MatchStep({
  matched,
  loading,
  readiness,
  onEdit,
  onBrowse,
}: {
  matched: MatchedTemplate | null
  loading: boolean
  readiness: ReturnType<typeof computeClientReadiness>
  onEdit: () => void
  onBrowse: () => void
}) {
  return (
    <section className="container-hvac py-8 max-w-4xl mx-auto">
      <div className="space-y-2 mb-8">
        <span className="signal-chip">Step 3 of 4</span>
        <h1 className="text-4xl md:text-5xl font-bold text-white">
          {loading ? 'Finding your match...' : 'We found your template'}
        </h1>
        <p className="text-lg text-slate-300">
          Based on your style preferences and business type.
        </p>
      </div>

      <div className="mb-8">
        <ClientReadinessPanel result={readiness} />
      </div>

      {loading ? (
        <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-300 text-lg">Analyzing your preferences and matching templates...</p>
        </div>
      ) : matched ? (
        <div className="glass-panel rounded-2xl p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-3xl shadow-lg shrink-0">
              ≡ƒÄ»
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">{matched.templateName}</h2>
              <p className="text-slate-300 mt-1">
                Matched because: <span className="text-cyan-300">{matched.reason}</span>
              </p>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
              What happens next
            </h3>
            <ul className="space-y-3">
              {[
                'Your business info is already filled into this template',
                'Double-click any text to edit it directly',
                'Click any image to replace it with your own',
                'Swap color palettes and fonts with one click',
                'Browse other templates anytime ΓÇö your info stays saved',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={onEdit}
              className="flex-1 px-8 py-4 text-lg font-bold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all text-center"
            >
              Customize This Template
            </button>
            <button
              onClick={onBrowse}
              className="flex-1 px-8 py-4 text-lg font-bold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all text-center"
            >
              Browse Custom Templates
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl p-8 text-center">
          <p className="text-slate-300">No match found. Try adjusting your preferences.</p>
          <button
            onClick={onBrowse}
            className="mt-4 px-6 py-3 text-sm font-bold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all"
          >
            Browse All Templates
          </button>
        </div>
      )}
    </section>
  )
}

/* ================================================================== */
/* STEP 4 ΓÇö Editor with live preview                                   */
/* ================================================================== */

function EditorStep({
  matched,
  readiness,
  previewHtml,
  previewLoading,
  previewError,
  demoRecord,
  currentPage,
  editMode,
  setEditMode,
  iframeRef,
  fileInputRef,
  handleImageFileChange,
  onLoadPreview,
  showColorPanel,
  setShowColorPanel,
  showFontPanel,
  setShowFontPanel,
  customColors,
  setCustomColors,
  customFonts,
  setCustomFonts,
}: {
  matched: MatchedTemplate
  readiness: ReturnType<typeof computeClientReadiness>
  previewHtml: string | null
  previewLoading: boolean
  previewError: string | null
  demoRecord: boolean
  currentPage: string
  editMode: boolean
  setEditMode: (v: boolean) => void
  iframeRef: React.RefObject<HTMLIFrameElement>
  fileInputRef: React.RefObject<HTMLInputElement>
  handleImageFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onLoadPreview: (niche?: string, slug?: string, page?: string) => void
  showColorPanel: boolean
  setShowColorPanel: (v: boolean) => void
  showFontPanel: boolean
  setShowFontPanel: (v: boolean) => void
  customColors: { primary: string; bg: string; text: string }
  setCustomColors: (v: { primary: string; bg: string; text: string }) => void
  customFonts: { heading: string; body: string; importUrl?: string }
  setCustomFonts: (v: { heading: string; body: string; importUrl?: string }) => void
}) {
  const COLOR_PRESETS = [
    { label: 'Ocean', primary: '#0ea5e9', bg: '#0f172a', text: '#e2e8f0' },
    { label: 'Forest', primary: '#10b981', bg: '#0a1f15', text: '#d1fae5' },
    { label: 'Sunset', primary: '#f59e0b', bg: '#1c1008', text: '#fef3c7' },
    { label: 'Berry', primary: '#8b5cf6', bg: '#1a0a2e', text: '#e9d5ff' },
    { label: 'Rose', primary: '#f43f5e', bg: '#1a0a10', text: '#ffe4e6' },
    { label: 'Slate', primary: '#64748b', bg: '#0f172a', text: '#e2e8f0' },
  ]

  const FONT_PRESETS: { label: string; heading: string; body: string; importUrl?: string }[] = [
    {
      label: 'Modern Sans',
      heading: "'Inter', sans-serif",
      body: "'Inter', sans-serif",
      importUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
    },
    {
      label: 'Elegant Serif',
      heading: "'Playfair Display', serif",
      body: "'Lora', serif",
      importUrl:
        'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&family=Playfair+Display:wght@500;600;700&display=swap',
    },
    {
      label: 'Warm Editorial',
      heading: "'Cormorant Garamond', serif",
      body: "'Nunito Sans', sans-serif",
      importUrl:
        'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Nunito+Sans:wght@400;600;700&display=swap',
    },
    {
      label: 'Geometric',
      heading: "'Poppins', sans-serif",
      body: "'Poppins', sans-serif",
      importUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
    },
    {
      label: 'Editorial Mix',
      heading: "'Montserrat', sans-serif",
      body: "'Source Serif 4', serif",
      importUrl:
        'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&family=Source+Serif+4:wght@400;600&display=swap',
    },
    {
      label: 'Soft Rounded',
      heading: "'Quicksand', sans-serif",
      body: "'Karla', sans-serif",
      importUrl:
        'https://fonts.googleapis.com/css2?family=Karla:wght@400;500;600&family=Quicksand:wght@500;600;700&display=swap',
    },
    {
      label: 'Tech Clean',
      heading: "'Space Grotesk', sans-serif",
      body: "'Inter', sans-serif",
      importUrl:
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap',
    },
    { label: 'Classic Serif', heading: 'Georgia, serif', body: 'Georgia, serif' },
    { label: 'System Default', heading: 'inherit', body: 'inherit' },
  ]

  const applyCustomStyles = useCallback(() => {
    const iframe = iframeRef.current
    const doc = iframe?.contentDocument
    if (!doc) return

    if (customFonts.importUrl) {
      let linkEl = doc.getElementById('pb-google-fonts') as HTMLLinkElement | null
      if (!linkEl) {
        linkEl = doc.createElement('link')
        linkEl.id = 'pb-google-fonts'
        linkEl.rel = 'stylesheet'
        doc.head.appendChild(linkEl)
      }
      linkEl.href = customFonts.importUrl
    }

    let styleEl = doc.getElementById('pb-custom-styles') as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = doc.createElement('style')
      styleEl.id = 'pb-custom-styles'
      doc.head.appendChild(styleEl)
    }
    styleEl.textContent = `
      :root {
        --pb-primary: ${customColors.primary};
        --pb-bg: ${customColors.bg};
        --pb-text: ${customColors.text};
        --pb-heading-font: ${customFonts.heading};
        --pb-body-font: ${customFonts.body};
      }
      h1, h2, h3, h4, h5, h6 { font-family: ${customFonts.heading} !important; }
      body, p, li, span, a, button, label { font-family: ${customFonts.body} !important; }
    `
  }, [customColors, customFonts, iframeRef])

  useEffect(() => {
    applyCustomStyles()
  }, [applyCustomStyles])

  return (
    <section className={`container-hvac ${demoRecord ? 'py-2' : 'py-4'}`}>
      {!demoRecord && (
        <div className="mb-6">
          <ClientReadinessPanel result={readiness} compact />
        </div>
      )}
      {demoRecord ? (
        <p className="text-center text-sm text-cyan-200/90 mb-3 font-medium">
          Your live website preview ΓÇö filled with your business details
        </p>
      ) : (
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">{matched.templateName}</h1>
            <p className="text-sm text-slate-400">Double-click text to edit ΓÇó Click images to replace</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowColorPanel(!showColorPanel)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-all ${
              showColorPanel ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'border-white/20 text-slate-300 hover:bg-white/10'
            }`}
          >
            ≡ƒÄ¿ Colors
          </button>
          <button
            onClick={() => setShowFontPanel(!showFontPanel)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-all ${
              showFontPanel ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'border-white/20 text-slate-300 hover:bg-white/10'
            }`}
          >
            🔤 Fonts
          </button>
          <Link
            href={`/pricing?template=${encodeURIComponent(matched.templateSlug)}&niche=${encodeURIComponent(matched.nicheSlug)}`}
            className="px-6 py-2 text-sm font-bold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg hover:scale-105 transition-all"
          >
            Purchase & Launch
          </Link>
        </div>
      </div>
      )}

      {!demoRecord && <CustomerImageLibrary compact />}

      {/* Color panel */}
      {!demoRecord && showColorPanel && (
        <div className="glass-panel rounded-xl p-4 mb-4">
          <h3 className="text-sm font-bold text-white mb-3">Color Presets</h3>
          <div className="flex flex-wrap gap-3">
            {COLOR_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setCustomColors({ primary: p.primary, bg: p.bg, text: p.text })}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 hover:border-white/30 transition-all bg-white/5"
              >
                <div className="w-6 h-6 rounded-full border border-white/20" style={{ background: p.primary }} />
                <span className="text-xs text-slate-300">{p.label}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div>
              <label className="text-xs text-slate-400">Primary</label>
              <input type="color" value={customColors.primary}
                onChange={(e) => setCustomColors({ ...customColors, primary: e.target.value })}
                className="w-full h-8 rounded cursor-pointer bg-transparent" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Background</label>
              <input type="color" value={customColors.bg}
                onChange={(e) => setCustomColors({ ...customColors, bg: e.target.value })}
                className="w-full h-8 rounded cursor-pointer bg-transparent" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Text</label>
              <input type="color" value={customColors.text}
                onChange={(e) => setCustomColors({ ...customColors, text: e.target.value })}
                className="w-full h-8 rounded cursor-pointer bg-transparent" />
            </div>
          </div>
        </div>
      )}

      {/* Font panel */}
      {!demoRecord && showFontPanel && (
        <div className="glass-panel rounded-xl p-4 mb-4">
          <h3 className="text-sm font-bold text-white mb-3">Font Presets</h3>
          <div className="flex flex-wrap gap-3">
            {FONT_PRESETS.map((f) => (
              <button
                key={f.label}
                onClick={() => setCustomFonts({ heading: f.heading, body: f.body, importUrl: f.importUrl })}
                className={`px-3 py-2 rounded-lg border transition-all bg-white/5 ${
                  customFonts.heading === f.heading
                    ? 'border-cyan-400 ring-1 ring-cyan-400/40'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <span className="text-sm text-white" style={{ fontFamily: f.heading }}>{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      <div
        className={`rounded-2xl overflow-hidden border border-white/10 bg-white ${
          demoRecord ? 'shadow-2xl ring-1 ring-cyan-400/30' : ''
        }`}
      >
        {previewLoading ? (
          <div
            className={`flex items-center justify-center bg-slate-900 ${
              demoRecord ? 'h-[88vh] min-h-[720px]' : 'h-[70vh]'
            }`}
          >
            <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : previewHtml ? (
          <iframe
            ref={iframeRef}
            srcDoc={previewHtml}
            onLoad={applyCustomStyles}
            loading="lazy"
            className={`w-full border-0 ${demoRecord ? 'h-[88vh] min-h-[720px]' : 'h-[70vh]'}`}
            title="Template preview"
          />
        ) : previewError ? (
          <div
            className={`flex flex-col items-center justify-center gap-4 bg-slate-900 px-6 text-center ${
              demoRecord ? 'h-[88vh] min-h-[720px]' : 'h-[70vh]'
            }`}
          >
            <p className="text-red-200 text-sm max-w-md">{previewError}</p>
            <button
              type="button"
              onClick={() => onLoadPreview(matched.nicheSlug, matched.templateSlug, currentPage)}
              className="px-4 py-2 text-sm font-semibold text-white border border-white/20 rounded-lg hover:bg-white/10"
            >
              Retry preview
            </button>
          </div>
        ) : (
          <div
            className={`flex items-center justify-center bg-slate-900 text-slate-400 ${
              demoRecord ? 'h-[88vh] min-h-[720px]' : 'h-[70vh]'
            }`}
          >
            Loading preview...
          </div>
        )}
      </div>

      {/* Hidden file input for image swaps */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileChange}
      />

      {/* Page navigation */}
      <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
        <span className="text-xs text-slate-400 mr-2">Pages:</span>
        {['index.html', 'about.html', 'services.html', 'contact.html'].map((page) => (
          <button
            key={page}
            onClick={() => onLoadPreview(matched.nicheSlug, matched.templateSlug, page)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              currentPage === page
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {page.replace('.html', '')}
          </button>
        ))}
      </div>
    </section>
  )
}

/* ================================================================== */
/* STEP 5 ΓÇö Browse templates                                           */
/* ================================================================== */

function BrowseStep({
  templates,
  niche,
  onSelect,
  onBack,
}: {
  templates: ApiTemplate[]
  niche: string
  onSelect: (t: ApiTemplate) => void
  onBack: () => void
}) {
  const nicheLabel = NICHE_OPTIONS.find((n) => n.slug === niche)?.label || niche

  return (
    <section className="container-hvac py-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <span className="signal-chip">Browse Templates</span>
          <h1 className="text-3xl md:text-4xl font-bold text-white mt-2">
            {nicheLabel} Templates
          </h1>
          <p className="text-slate-300 mt-1">
            Your business info will auto-populate on any template you choose.
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-6 py-3 text-sm font-bold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all"
        >
          ΓåÉ Back to Editor
        </button>
      </div>

      {/* Info saved banner */}
      <div className="bg-cyan-500/10 border border-cyan-400/30 rounded-xl p-4 mb-8 flex items-center gap-3">
        <span className="text-cyan-400 text-xl">≡ƒÆ╛</span>
        <p className="text-cyan-200 text-sm">
          <strong>Your info is saved.</strong> Any template you open will be automatically filled with your business details.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <p className="text-slate-300">No templates found for this niche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((t) => (
            <button
              key={t.slug}
              onClick={() => onSelect(t)}
              className="card-mahogany text-left space-y-3 hover:scale-[1.02] transition-all group"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white group-hover:text-cyan-200 transition-colors">
                  {t.name}
                </h3>
                {t.layoutFamily && (
                  <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-slate-300">
                    {t.layoutFamily}
                  </span>
                )}
              </div>
              {t.snippet && (
                <p className="text-sm text-slate-400 line-clamp-3">{t.snippet}</p>
              )}
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-300 group-hover:gap-2 transition-all">
                Preview with your info <span aria-hidden="true">ΓåÆ</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

/* ================================================================== */
/* Shared UI components                                                */
/* ================================================================== */

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  error,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  error?: string
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-200 mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
          error ? 'border-red-400' : 'border-white/20'
        }`}
      />
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
    </div>
  )
}

/* ================================================================== */
/* Iframe injection script                                             */
/* ================================================================== */

function getIframeInjectionScript(): string {
  return `
<script>
(function(){
  var editableSelectors = 'h1,h2,h3,h4,h5,h6,p,span,li,td,th,a,blockquote,figcaption,label,button,dt,dd';
  var supportsHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;

  function startEditing(el) {
    if (!el || el.isContentEditable) return;
    var originalText = el.textContent;
    el.contentEditable = 'true';
    el.style.outline = '2px solid #3b82f6';
    el.style.outlineOffset = '2px';
    el.style.borderRadius = '2px';
    el.style.cursor = 'text';
    el.focus();
    el.addEventListener('blur', function onBlur() {
      el.contentEditable = 'false';
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.cursor = '';
      el.removeEventListener('blur', onBlur);
      window.parent.postMessage({ type: 'textEdited', tag: el.tagName, original: originalText, text: el.textContent }, '*');
    }, { once: true });
  }

  document.addEventListener('dblclick', function(e) {
    var el = e.target.closest(editableSelectors);
    if (!el) return;
    startEditing(el);
    e.preventDefault();
    e.stopPropagation();
  });

  var lastTap = 0;
  document.addEventListener('touchend', function(e) {
    var el = e.target.closest(editableSelectors);
    if (!el) return;
    var now = Date.now();
    if (now - lastTap < 400) {
      startEditing(el);
      e.preventDefault();
    }
    lastTap = now;
  });

  var lastHovered = null;
  if (supportsHover) {
    document.addEventListener('mouseover', function(e) {
      var el = e.target.closest(editableSelectors);
      if (lastHovered && lastHovered !== el && !lastHovered.isContentEditable) {
        lastHovered.style.outline = '';
        lastHovered.style.outlineOffset = '';
      }
      if (el && !el.isContentEditable) {
        el.style.outline = '1px dashed rgba(59,130,246,0.4)';
        el.style.outlineOffset = '1px';
        lastHovered = el;
      }
    });
    document.addEventListener('mouseout', function(e) {
      var el = e.target.closest(editableSelectors);
      if (el && !el.isContentEditable) {
        el.style.outline = '';
        el.style.outlineOffset = '';
      }
    });
  }

  document.addEventListener('click', function(e) {
    var img = e.target.closest('img');
    if (!img) return;
    e.preventDefault();
    e.stopPropagation();
    window.parent.postMessage({ type: 'imageSwapRequest', src: img.src, id: img.id || '' }, '*');
  });

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'imageSwapResponse') {
      var newSrc = e.data.imageUrl || e.data.dataUrl;
      if (!newSrc) return;
      var imgs = document.querySelectorAll('img');
      for (var i = 0; i < imgs.length; i++) {
        if (imgs[i].src === e.data.originalSrc || (!e.data.originalSrc && i === 0)) {
          imgs[i].src = newSrc;
          break;
        }
      }
    }
  });

  document.addEventListener('click', function(e) {
    var link = e.target.closest('a[href]');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href) return;
    if (href.endsWith('.html') || href === '/' || href === './') {
      e.preventDefault();
      e.stopPropagation();
      var page = href;
      if (page === '/' || page === './') page = 'index.html';
      if (!page.endsWith('.html')) page = page + '.html';
      page = page.replace(/^\\.?\\//, '');
      window.parent.postMessage({ type: 'navigatePage', page: page }, '*');
    }
  });
})();
</script>`
}
