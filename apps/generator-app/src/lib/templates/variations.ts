/* ------------------------------------------------------------------ */
/* Template Variation System                                           */
/* 10 color schemes · 10 font families · 10 structural layouts         */
/* ------------------------------------------------------------------ */

export interface ColorScheme {
  id: string
  name: string
  vars: Record<string, string>  // CSS custom property overrides
}

export interface FontVariation {
  id: string
  name: string
  family: string       // CSS font-family stack
  importUrl?: string   // Google Fonts URL
  weight?: string      // CSS font-weight for body
  headingWeight?: string
}

export interface StructureVariation {
  id: string
  name: string
  css: string   // Raw CSS block to inject
}

/* ================================================================== */
/* COLOR SCHEMES                                                       */
/* ================================================================== */

export const COLOR_SCHEMES: ColorScheme[] = [
  {
    id: 'original',
    name: 'Original',
    vars: {},  // keep template defaults
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    vars: {
      '--bg': '#0B1628',
      '--fg': '#EFF6FF',
      '--muted': '#94A3B8',
      '--primary': '#0EA5E9',
      '--accent': '#38BDF8',
      '--card': '#0F2035',
    },
  },
  {
    id: 'sage-garden',
    name: 'Sage Garden',
    vars: {
      '--bg': '#0F1A14',
      '--fg': '#F0FDF4',
      '--muted': '#A7C4B5',
      '--primary': '#22C55E',
      '--accent': '#86EFAC',
      '--card': '#142A1E',
    },
  },
  {
    id: 'warm-ember',
    name: 'Warm Ember',
    vars: {
      '--bg': '#1C1210',
      '--fg': '#FFF7ED',
      '--muted': '#D4A574',
      '--primary': '#EA580C',
      '--accent': '#FB923C',
      '--card': '#291A14',
    },
  },
  {
    id: 'lavender-mist',
    name: 'Lavender Mist',
    vars: {
      '--bg': '#14101E',
      '--fg': '#F5F3FF',
      '--muted': '#C4B5FD',
      '--primary': '#8B5CF6',
      '--accent': '#A78BFA',
      '--card': '#1E1735',
    },
  },
  {
    id: 'rose-quartz',
    name: 'Rose Quartz',
    vars: {
      '--bg': '#1A0F14',
      '--fg': '#FFF1F2',
      '--muted': '#FDA4AF',
      '--primary': '#F43F5E',
      '--accent': '#FB7185',
      '--card': '#2A1520',
    },
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    vars: {
      '--bg': '#1A1608',
      '--fg': '#FEFCE8',
      '--muted': '#D4C16C',
      '--primary': '#EAB308',
      '--accent': '#FACC15',
      '--card': '#28220E',
    },
  },
  {
    id: 'arctic-frost',
    name: 'Arctic Frost',
    vars: {
      '--bg': '#F8FAFC',
      '--fg': '#0F172A',
      '--muted': '#64748B',
      '--primary': '#0284C7',
      '--accent': '#06B6D4',
      '--card': '#FFFFFF',
    },
  },
  {
    id: 'cream-linen',
    name: 'Cream & Linen',
    vars: {
      '--bg': '#FEFBF3',
      '--fg': '#292524',
      '--muted': '#78716C',
      '--primary': '#92400E',
      '--accent': '#B45309',
      '--card': '#FFFFFF',
    },
  },
  {
    id: 'midnight-bloom',
    name: 'Midnight Bloom',
    vars: {
      '--bg': '#0C0A1A',
      '--fg': '#F0EDFF',
      '--muted': '#9B8EC4',
      '--primary': '#D946EF',
      '--accent': '#E879F9',
      '--card': '#150F30',
    },
  },
]

/* ================================================================== */
/* FONT FAMILIES                                                       */
/* ================================================================== */

export const FONT_VARIATIONS: FontVariation[] = [
  {
    id: 'original',
    name: 'Original',
    family: '',  // keep template default
  },
  {
    id: 'inter',
    name: 'Inter',
    family: "'Inter', system-ui, -apple-system, sans-serif",
    importUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
    weight: '400',
    headingWeight: '700',
  },
  {
    id: 'dm-sans',
    name: 'DM Sans',
    family: "'DM Sans', system-ui, -apple-system, sans-serif",
    importUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap',
    weight: '400',
    headingWeight: '700',
  },
  {
    id: 'plus-jakarta',
    name: 'Plus Jakarta Sans',
    family: "'Plus Jakarta Sans', system-ui, sans-serif",
    importUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
    weight: '400',
    headingWeight: '800',
  },
  {
    id: 'source-serif',
    name: 'Source Serif Pro',
    family: "'Source Serif 4', 'Georgia', serif",
    importUrl: 'https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;500;600;700&display=swap',
    weight: '400',
    headingWeight: '700',
  },
  {
    id: 'outfit',
    name: 'Outfit',
    family: "'Outfit', system-ui, sans-serif",
    importUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap',
    weight: '400',
    headingWeight: '600',
  },
  {
    id: 'cormorant',
    name: 'Cormorant Garamond',
    family: "'Cormorant Garamond', 'Times New Roman', serif",
    importUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap',
    weight: '400',
    headingWeight: '600',
  },
  {
    id: 'space-grotesk',
    name: 'Space Grotesk',
    family: "'Space Grotesk', system-ui, sans-serif",
    importUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap',
    weight: '400',
    headingWeight: '700',
  },
  {
    id: 'lora',
    name: 'Lora',
    family: "'Lora', 'Georgia', serif",
    importUrl: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap',
    weight: '400',
    headingWeight: '700',
  },
  {
    id: 'manrope',
    name: 'Manrope',
    family: "'Manrope', system-ui, sans-serif",
    importUrl: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap',
    weight: '400',
    headingWeight: '700',
  },
]

/* ================================================================== */
/* STRUCTURE / LAYOUT VARIATIONS                                       */
/* ================================================================== */

export const STRUCTURE_VARIATIONS: StructureVariation[] = [
  {
    id: 'original',
    name: 'Original',
    css: '',  // no override
  },
  {
    id: 'rounded-soft',
    name: 'Soft & Rounded',
    css: `
      :root { --radius: 24px !important; }
      .card, .btn, .glass-panel, [class*="rounded"] { border-radius: 24px !important; }
      .btn { border-radius: 50px !important; padding: 14px 28px !important; }
      .nav { border-radius: 0 0 24px 24px !important; }
      img { border-radius: 20px !important; }
    `,
  },
  {
    id: 'sharp-minimal',
    name: 'Sharp & Minimal',
    css: `
      :root { --radius: 0px !important; --shadow: none !important; }
      .card, .btn, img, .nav { border-radius: 0 !important; }
      .card { border: 1px solid var(--muted); box-shadow: none !important; }
      .btn { letter-spacing: 0.15em; text-transform: uppercase; font-size: 0.8em; }
    `,
  },
  {
    id: 'bordered-frame',
    name: 'Framed Cards',
    css: `
      :root { --radius: 8px !important; }
      .card { border: 2px solid var(--primary) !important; background: transparent !important; box-shadow: none !important; }
      .hero { border-bottom: 3px solid var(--primary); }
      section { padding-top: 3rem; padding-bottom: 3rem; border-bottom: 1px solid color-mix(in oklab, var(--fg) 10%, transparent); }
    `,
  },
  {
    id: 'floating-cards',
    name: 'Floating Cards',
    css: `
      :root { --radius: 16px !important; --shadow: 0 20px 60px rgba(0,0,0,0.3) !important; }
      .card { transform: translateY(-4px); transition: transform 0.3s, box-shadow 0.3s !important; }
      .card:hover { transform: translateY(-8px); box-shadow: 0 30px 80px rgba(0,0,0,0.4) !important; }
    `,
  },
  {
    id: 'full-width',
    name: 'Full Width',
    css: `
      :root { --maxw: 100% !important; }
      .container { max-width: 100% !important; padding: 24px 48px !important; }
      .hero { padding: 80px 48px !important; }
      .grid.cols-3 { grid-template-columns: repeat(3, 1fr) !important; gap: 32px !important; }
    `,
  },
  {
    id: 'compact-dense',
    name: 'Compact & Dense',
    css: `
      :root { --maxw: 920px !important; --radius: 10px !important; }
      .hero { padding: 40px 0 !important; }
      .h1 { font-size: 34px !important; }
      .h2 { font-size: 22px !important; }
      .card { padding: 14px !important; }
      .container { padding: 16px !important; }
      .grid { gap: 12px !important; }
    `,
  },
  {
    id: 'glassmorphism',
    name: 'Glass Effect',
    css: `
      :root { --radius: 20px !important; }
      .card { background: color-mix(in oklab, var(--card) 60%, transparent) !important; backdrop-filter: blur(16px) !important; -webkit-backdrop-filter: blur(16px) !important; border: 1px solid color-mix(in oklab, var(--fg) 12%, transparent) !important; }
      .nav { background: color-mix(in oklab, var(--bg) 70%, transparent) !important; backdrop-filter: blur(20px) !important; -webkit-backdrop-filter: blur(20px) !important; }
      .btn { backdrop-filter: blur(8px) !important; }
    `,
  },
  {
    id: 'elegant-serif',
    name: 'Elegant Spacing',
    css: `
      :root { --maxw: 1000px !important; --radius: 4px !important; }
      .hero { padding: 100px 0 !important; text-align: center !important; }
      .h1 { font-size: 52px !important; letter-spacing: -0.02em !important; }
      .kicker { letter-spacing: 0.3em !important; }
      .card { padding: 28px !important; }
      section { padding-top: 4rem !important; padding-bottom: 4rem !important; }
    `,
  },
  {
    id: 'asymmetric',
    name: 'Asymmetric Grid',
    css: `
      .grid.cols-3 { grid-template-columns: 1.5fr 1fr 1fr !important; }
      .grid.cols-3 > :first-child { grid-row: span 2; }
      .hero { text-align: left !important; padding-left: 10% !important; }
      .card:nth-child(odd) { transform: rotate(-0.5deg); }
      .card:nth-child(even) { transform: rotate(0.5deg); }
    `,
  },
]

/* ================================================================== */
/* Helpers                                                             */
/* ================================================================== */

/** Get a color scheme by ID, defaulting to 'original' */
export function getColorScheme(id: string): ColorScheme {
  return COLOR_SCHEMES.find((s) => s.id === id) || COLOR_SCHEMES[0]
}

/** Get a font variation by ID, defaulting to 'original' */
export function getFontVariation(id: string): FontVariation {
  return FONT_VARIATIONS.find((f) => f.id === id) || FONT_VARIATIONS[0]
}

/** Get a structure variation by ID, defaulting to 'original' */
export function getStructureVariation(id: string): StructureVariation {
  return STRUCTURE_VARIATIONS.find((s) => s.id === id) || STRUCTURE_VARIATIONS[0]
}

const QUIZ_COLOR_SCHEMES: Record<string, string> = {
  'dark-elegant': 'midnight-bloom',
  'light-airy': 'arctic-frost',
  'rich-warm': 'warm-ember',
  'cool-modern': 'ocean-breeze',
  'nature-organic': 'sage-garden',
  'vibrant-energy': 'rose-quartz',
}

const QUIZ_FONT_VARIATIONS: Record<string, string> = {
  serif: 'source-serif',
  'sans-serif': 'inter',
  mixed: 'lora',
}

const QUIZ_STRUCTURE_VARIATIONS: Record<string, string> = {
  spacious: 'elegant-serif',
  balanced: 'rounded-soft',
  compact: 'compact-dense',
}

/** Translate style-quiz vocabulary to actual variation IDs used by deploys. */
export function resolveQuizColorScheme(value: string): string {
  return QUIZ_COLOR_SCHEMES[value] || getColorScheme(value).id
}

export function resolveQuizFontVariation(value: string): string {
  return QUIZ_FONT_VARIATIONS[value] || getFontVariation(value).id
}

export function resolveQuizStructureVariation(value: string): string {
  return QUIZ_STRUCTURE_VARIATIONS[value] || getStructureVariation(value).id
}

/**
 * Generate CSS to inject into a template for the given variation choices.
 * Returns a <style> block string or empty string if all are 'original'.
 */
export function buildVariationCSS(
  colorId: string,
  fontId: string,
  structureId: string,
): string {
  const parts: string[] = []

  // Color overrides
  const color = getColorScheme(colorId)
  if (Object.keys(color.vars).length > 0) {
    const varLines = Object.entries(color.vars)
      .map(([prop, val]) => `${prop}: ${val} !important;`)
      .join(' ')
    parts.push(`:root { ${varLines} }`)
  }

  // Font import + override
  const font = getFontVariation(fontId)
  if (font.family) {
    if (font.importUrl) {
      parts.push(`@import url('${font.importUrl}');`)
    }
    parts.push(`body { font-family: ${font.family} !important; ${font.weight ? `font-weight: ${font.weight} !important;` : ''} }`)
    parts.push(`.h1, .h2, h1, h2, h3, h4, .brand { font-family: ${font.family} !important; ${font.headingWeight ? `font-weight: ${font.headingWeight} !important;` : ''} }`)
  }

  // Structure overrides
  const structure = getStructureVariation(structureId)
  if (structure.css) {
    parts.push(structure.css)
  }

  if (parts.length === 0) return ''

  return `/* --- Variation Overrides --- */\n${parts.join('\n')}`
}
