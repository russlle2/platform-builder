'use client'

import type { BusinessInfo, ProseStyle, StylePreferences } from '@/store/previewStore'
import type { CustomTheme } from '@/lib/custom-theme'
import { getColorScheme, getFontVariation, resolveQuizColorScheme, resolveQuizFontVariation, resolveQuizStructureVariation } from '@/lib/templates/variations'

const TONE_EXAMPLES: Record<ProseStyle, { heading: string; action: string }> = {
  professional: { heading: 'A thoughtful introduction to your services.', action: 'Explore our services' },
  conversational: { heading: 'Hello. Let’s find your next step together.', action: 'Let’s talk' },
  storytelling: { heading: 'Every practice has a story. This is the start of yours.', action: 'Discover our story' },
  minimal: { heading: 'Your practice. Your next step.', action: 'Get in touch' },
  authoritative: { heading: 'A clear approach. An informed next step.', action: 'Explore our approach' },
}

function luminance(hex: string): number {
  const rgb = [1, 3, 5].map(offset => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
}

function contrast(first: string, second: string): number {
  const a = luminance(first)
  const b = luminance(second)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

export function StyleDirectionPreview({
  info,
  prefs,
  customTheme,
}: {
  // Private account/contact data is intentionally not an input to this illustration.
  info: Pick<BusinessInfo, 'businessName' | 'tagline' | 'description'>
  prefs: StylePreferences
  customTheme: CustomTheme | null
}) {
  const color = getColorScheme(resolveQuizColorScheme(prefs.colorMood))
  const font = getFontVariation(resolveQuizFontVariation(prefs.fontPreference))
  const structure = resolveQuizStructureVariation(prefs.layoutDensity)
  const background = customTheme?.background || color.vars['--bg'] || '#faf8f5'
  const text = customTheme?.text || color.vars['--fg'] || '#18221f'
  const primary = customTheme?.primary || color.vars['--primary'] || '#0f766e'
  const buttonText = contrast(primary, '#ffffff') >= contrast(primary, '#000000') ? '#ffffff' : '#000000'
  const bodyFont = customTheme?.bodyFont || font.family
  const headingFont = customTheme?.headingFont || font.family
  const original = color.id === 'original' && !customTheme
  const tone = TONE_EXAMPLES[prefs.proseStyle]
  const paletteLabel = customTheme ? 'Saved custom colors' : original ? 'Neutral illustration · original colors vary by template' : color.name
  const spacing = prefs.layoutDensity === 'spacious' ? '2rem' : prefs.layoutDensity === 'compact' ? '1rem' : '1.5rem'
  const radius = prefs.vibes.includes('luxurious') ? '0.25rem' : prefs.vibes.includes('earthy') ? '1.5rem' : '0.85rem'

  return (
    <aside className="order-first min-w-0 rounded-2xl border border-white/15 bg-slate-900 p-4 sm:p-5 lg:order-last lg:sticky lg:top-28" aria-labelledby="style-direction-title">
      <h2 id="style-direction-title" tabIndex={-1} className="text-xl font-bold text-white">Your style, at a glance</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">An illustration that responds to your choices. Your selected template determines the final layout and original colors.</p>
      <p className="mt-3 text-sm text-cyan-200" aria-live="polite" aria-atomic="true">{paletteLabel} · {customTheme ? 'Saved custom fonts' : prefs.fontPreference === 'sans-serif' ? 'Sans-serif' : prefs.fontPreference === 'serif' ? 'Serif' : 'Mixed font direction'} · {prefs.layoutDensity}</p>
      {contrast(background, text) < 4.5 && <p className="mt-3 text-sm text-amber-200" role="status">Your saved text and background colors may be difficult to read. Review them in the editor before publishing.</p>}
      <figure className="mt-4 overflow-hidden rounded-xl border border-white/15" aria-label="Style direction preview"
        data-color-scheme={customTheme ? 'custom' : color.id} data-font-variation={customTheme ? 'custom' : font.id} data-structure-variation={structure}
        style={{ backgroundColor: background, color: text, fontFamily: bodyFont }}>
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: `${text}30` }}>
          <span className="line-clamp-2 min-w-0 break-words text-sm font-semibold">{info.businessName.trim() || 'Your practice'}</span>
          <span className="flex shrink-0 gap-1.5" aria-hidden="true">{[0, 1, 2].map(dot => <span key={dot} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: primary }} />)}</span>
        </div>
        <div className="break-words" style={{ padding: spacing }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: text }}>{prefs.vibes.length ? prefs.vibes.join(' · ') : 'Your website direction'}</p>
          <h3 className="mt-4 line-clamp-3 text-3xl font-semibold leading-tight" style={{ color: text, fontFamily: headingFont }}>{info.tagline.trim() || tone.heading}</h3>
          <p className="mt-4 line-clamp-4 text-sm leading-relaxed" style={{ color: text }}>{info.description.trim() || 'Introduce what you offer, who you work with, and how someone can take the next step.'}</p>
          <span className="mt-6 inline-block px-4 py-3 text-sm font-semibold" style={{ backgroundColor: primary, color: buttonText, borderRadius: radius }}>{tone.action}</span>
          <div className="mt-6 grid grid-cols-2 gap-3" aria-hidden="true">
            {[0, 1].map(item => <div key={item} className="border p-3" style={{ borderColor: `${text}35`, borderRadius: radius }}><div className="mb-2 h-1.5 w-2/3 rounded" style={{ backgroundColor: primary }} /><div className="h-1.5 w-full rounded" style={{ backgroundColor: `${text}40` }} /></div>)}
          </div>
        </div>
        <figcaption className="border-t px-5 py-3 text-xs leading-relaxed" style={{ borderColor: `${text}30`, color: text }}>Illustrative layout · sample wording · not a published website</figcaption>
      </figure>
      <p className="mt-3 text-xs leading-relaxed text-slate-300">Vibe and writing choices guide your template match. Your own words stay unchanged.</p>
    </aside>
  )
}
