/**
 * Bridge legacy-compiler theme tokens to the customer-facing palette/font
 * controls. The compiler intentionally assigns opaque, stable token IDs, so
 * runtime code derives their semantic role from the declaration that consumes
 * each token rather than depending on a particular generated hash.
 */

export interface CompilerColorPalette {
  background: string
  text: string
  muted: string
  primary: string
  accent: string
  card: string
}

export interface CompilerFontPalette {
  body: string
  heading: string
}

export interface CompilerThemeOverrides {
  colors?: CompilerColorPalette
  fonts?: CompilerFontPalette
}

type ColorRole = keyof CompilerColorPalette
type FontRole = keyof CompilerFontPalette

interface RankedRole<T extends string> {
  role: T
  score: number
}

const TOKEN_NAME = '--dc-theme-(?:color|font)_[A-Za-z0-9_-]+'
const SAFE_TOKEN_RE = new RegExp(`^${TOKEN_NAME}$`)
const COLOR_ROLE_ORDER: ColorRole[] = [
  'background', 'text', 'muted', 'primary', 'accent', 'card',
]

function safeOverrideValue(value: string): boolean {
  return value.length > 0 && value.length <= 240 && !/[;{}\r\n]/.test(value)
}

function customPropertyColorRole(property: string): ColorRole | null {
  const name = property.toLowerCase().replace(/^--/, '')
  if (/(?:^|[-_])(?:muted|subtle|faint|secondary)(?:$|[-_])/.test(name)) return 'muted'
  if (/(?:^|[-_])(?:accent|highlight)(?:$|[-_])/.test(name)) return 'accent'
  if (/(?:^|[-_])(?:primary|brand)(?:$|[-_])/.test(name)) return 'primary'
  if (/(?:^|[-_])(?:card|surface|panel)(?:$|[-_])/.test(name)) return 'card'
  if (/(?:^|[-_])(?:fg|foreground|text|ink)(?:$|[-_])/.test(name)) return 'text'
  if (/(?:^|[-_])(?:bg|background|canvas)(?:$|[-_])/.test(name)) return 'background'
  return null
}

function isDocumentSelector(selector: string): boolean {
  return selector.split(',').some((part) => /^(?:html|body|:root)(?:\b|[.#[:]|$)/i.test(part.trim()))
}

function isHeadingSelector(selector: string): boolean {
  return /(?:^|[\s,>+~])h[1-6](?:$|[\s,>+~.#[:])|(?:heading|headline|title|brand|logo)/i.test(selector)
}

function isMutedSelector(selector: string): boolean {
  return /(?:muted|subtle|secondary|caption|eyebrow|kicker|meta|hint|small|subtitle)/i.test(selector)
}

function isCardSelector(selector: string): boolean {
  return /(?:card|surface|panel|tile|modal|popover|dropdown|feature|testimonial|pricing)/i.test(selector)
}

function isInteractiveSelector(selector: string): boolean {
  return /(?:^|[\s,>+~.#[:])(?:a|button)(?:$|[\s,>+~.#[:])|(?:btn|button|cta|link|badge|pill|active|brand|logo)/i.test(selector)
}

function colorRoleForUse(
  selector: string,
  property: string,
  value: string,
  tokenIndex: number,
): RankedRole<ColorRole> {
  const prop = property.toLowerCase()
  const customRole = prop.startsWith('--') ? customPropertyColorRole(prop) : null
  if (customRole) return { role: customRole, score: 120 }

  const backgroundProperty = /^background(?:-color|-image)?$/.test(prop)
  const textProperty = /^(?:color|text-decoration-color|text-shadow)$/.test(prop)
  const borderProperty = /^(?:border|border-.+|outline|outline-color|box-shadow)$/.test(prop)
  const vectorProperty = /^(?:fill|stroke)$/.test(prop)

  if (isDocumentSelector(selector)) {
    if (backgroundProperty) return { role: 'background', score: 110 }
    if (textProperty) return { role: 'text', score: 110 }
  }
  if (isMutedSelector(selector)) {
    if (textProperty || borderProperty || vectorProperty) return { role: 'muted', score: 100 }
    if (backgroundProperty) return { role: 'card', score: 90 }
  }
  if (isInteractiveSelector(selector)) {
    if (backgroundProperty) {
      return {
        role: /gradient/i.test(value) && tokenIndex % 2 === 1 ? 'accent' : 'primary',
        score: 95,
      }
    }
    if (borderProperty) return { role: 'accent', score: 90 }
    if (textProperty) return { role: 'text', score: 85 }
    if (vectorProperty) return { role: 'primary', score: 85 }
  }
  if (isCardSelector(selector) && backgroundProperty) return { role: 'card', score: 85 }
  if (textProperty) return { role: 'text', score: 50 }
  if (backgroundProperty) return { role: 'card', score: 45 }
  if (borderProperty) return { role: 'muted', score: 40 }
  if (vectorProperty) return { role: 'primary', score: 40 }
  return { role: 'primary', score: 1 }
}

function fontRoleForUse(selector: string, property: string): RankedRole<FontRole> | null {
  const prop = property.toLowerCase()
  if (prop.startsWith('--')) {
    if (/(?:heading|headline|title|display|brand)/i.test(prop)) return { role: 'heading', score: 120 }
    if (/(?:body|text|sans|serif|font-family)/i.test(prop)) return { role: 'body', score: 110 }
  }
  // Other compiler font tokens can represent size, weight, style, or an entire
  // shorthand. Replacing those with a family would create invalid CSS.
  if (prop !== 'font-family') return null
  return isHeadingSelector(selector)
    ? { role: 'heading', score: 90 }
    : { role: 'body', score: 60 }
}

function setBestRole<T extends string>(
  roles: Map<string, RankedRole<T>>,
  token: string,
  candidate: RankedRole<T>,
  tieOrder: readonly T[],
): void {
  const current = roles.get(token)
  if (
    !current ||
    candidate.score > current.score ||
    (candidate.score === current.score && tieOrder.indexOf(candidate.role) < tieOrder.indexOf(current.role))
  ) {
    roles.set(token, candidate)
  }
}

/** Build late-cascade declarations for compiler-generated theme variables. */
export function buildCompilerThemeOverrides(
  stylesheet: string | null | undefined,
  overrides: CompilerThemeOverrides,
): string {
  if (!stylesheet || (!overrides.colors && !overrides.fonts)) return ''

  const css = stylesheet.replace(/\/\*[\s\S]*?\*\//g, '')
  const tokens = new Set<string>()
  for (const match of css.matchAll(new RegExp(`(${TOKEN_NAME})\\s*:`, 'g'))) {
    if (SAFE_TOKEN_RE.test(match[1])) tokens.add(match[1])
  }
  for (const match of css.matchAll(new RegExp(`var\\(\\s*(${TOKEN_NAME})(?:\\s*,[^)]*)?\\)`, 'g'))) {
    if (SAFE_TOKEN_RE.test(match[1])) tokens.add(match[1])
  }
  if (tokens.size === 0) return ''

  const colorRoles = new Map<string, RankedRole<ColorRole>>()
  const fontRoles = new Map<string, RankedRole<FontRole>>()
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g
  for (const rule of css.matchAll(rulePattern)) {
    const selector = rule[1].trim()
    if (!selector || /^@font-face\b/i.test(selector)) continue
    const declarations = rule[2]
    const declarationPattern = /(?:^|;)\s*([-\w]+)\s*:\s*([^;{}]+)/g
    for (const declaration of declarations.matchAll(declarationPattern)) {
      const property = declaration[1]
      if (/^--dc-theme-/.test(property)) continue
      const value = declaration[2]
      const references = [...value.matchAll(new RegExp(`var\\(\\s*(${TOKEN_NAME})(?:\\s*,[^)]*)?\\)`, 'g'))]
      references.forEach((reference, index) => {
        const token = reference[1]
        if (token.startsWith('--dc-theme-color_')) {
          setBestRole(
            colorRoles,
            token,
            colorRoleForUse(selector, property, value, index),
            COLOR_ROLE_ORDER,
          )
        } else if (token.startsWith('--dc-theme-font_')) {
          const role = fontRoleForUse(selector, property)
          if (role) setBestRole(fontRoles, token, role, ['body', 'heading'])
        }
      })
    }
  }

  const declarations: string[] = []
  if (overrides.colors) {
    for (const token of [...tokens].filter((item) => item.startsWith('--dc-theme-color_')).sort()) {
      const role = colorRoles.get(token)?.role || 'primary'
      const value = overrides.colors[role]
      if (safeOverrideValue(value)) declarations.push(`${token}: ${value} !important;`)
    }
  }
  if (overrides.fonts) {
    for (const [token, ranked] of [...fontRoles.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const value = overrides.fonts[ranked.role]
      if (safeOverrideValue(value)) declarations.push(`${token}: ${value} !important;`)
    }
  }

  return declarations.length > 0
    ? `/* --- Compiler Theme Token Overrides --- */\n:root { ${declarations.join(' ')} }`
    : ''
}
