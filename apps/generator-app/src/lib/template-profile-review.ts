import { hydrateTemplate, type HydrationField } from './templates/template-hydration'
import { sanitizeCatalogRevisionPin } from './catalog-revision'

export interface ProfileField extends HydrationField {
  label?: string
  required?: boolean
}

export interface ProfileIssue {
  name: string
  label: string
  message: string
}

const TOKEN = /^[A-Za-z0-9_]+$/
const isPrivateEmail = (name: string): boolean => name.replace(/_/g, '').toLowerCase() === 'accountemail'
const LOCALITY_DEFAULTS: Record<string, string> = { CITY: 'your city', STATE: 'your state' }

export function profileFieldLabel(field: ProfileField): string {
  if (field.name.toUpperCase() === 'CITY') return 'City'
  if (field.name.toUpperCase() === 'STATE') return 'State / region'
  return (field.label || field.name).replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())
}

/** The review and its values belong to the same template revision as the preview. */
export function templateProfileScope(niche: string, template: string, revision: unknown): string {
  return JSON.stringify([niche, template, sanitizeCatalogRevisionPin(revision)])
}

export function readProfileFields(value: unknown): ProfileField[] | null {
  if (!Array.isArray(value) || value.length > 256) return null
  const fields: ProfileField[] = []
  const seen = new Set<string>()
  for (const raw of value) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
    const field = raw as Record<string, unknown>
    if (typeof field.name !== 'string' || !TOKEN.test(field.name.trim())) return null
    const name = field.name.trim().toUpperCase()
    if (isPrivateEmail(name) || seen.has(name)) return null
    seen.add(name)
    fields.push({
      name,
      ...(typeof field.label === 'string' ? { label: field.label.slice(0, 200) } : {}),
      ...(typeof field.type === 'string' ? { type: field.type } : {}),
      ...(typeof field.default === 'string' ? { default: field.default } : {}),
      required: field.required === true,
    })
  }
  return fields
}

/**
 * Use the renderer as a completion oracle; its escaped output must never be
 * copied into editable values. The server repeats this against pinned metadata.
 */
export function reviewTemplateProfile(fields: readonly ProfileField[], values: Record<string, string>): ProfileIssue[] {
  const issues: ProfileIssue[] = []
  for (const field of fields) {
    if (!field.required) continue
    const name = field.name.trim().toUpperCase()
    const label = profileFieldLabel(field)
    const invalidName = !TOKEN.test(name) || isPrivateEmail(name)
    const resolved = invalidName ? '' : hydrateTemplate(`{{${name}}}`, values, fields)
    const explicit = Object.entries(values).some(([key, value]) => key.trim().toUpperCase() === name && value.trim())
    const invalidInput = explicit && !hydrateTemplate(`{{${name}}}`, values, fields.map(({ default: _default, ...field }) => field))
    const unfinishedLocality = LOCALITY_DEFAULTS[name] === resolved.trim().toLowerCase()
    const telephone = field.type?.toLowerCase() === 'tel' || name.includes('PHONE')
    if (!resolved || invalidInput || unfinishedLocality || (telephone && !/[0-9]/.test(resolved))) {
      issues.push({ name, label, message: `Enter ${label.toLowerCase()} used by this design.` })
    }
  }
  return issues
}
