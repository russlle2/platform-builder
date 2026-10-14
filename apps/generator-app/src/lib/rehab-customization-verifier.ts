import { createHash } from 'node:crypto'
import { lstat, readFile, readdir, realpath } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { parse } from 'parse5'
import {
  buildCheckoutTemplateState,
  mergePortalSiteData,
  preparePortalCustomizationUpdate,
} from './customer-site-state'
import {
  buildCustomThemeCss,
  buildLivePreviewThemeCss,
  type CustomTheme,
} from './custom-theme'
import {
  applyImageSwapsToHtmlWithReport,
  isSafeImageSlotId,
  sanitizeImageSwapMap,
  type ImageSwapMap,
} from './image-swaps'
import {
  applyInlineEditsToHtmlWithReport,
  isEditableAttributeForTag,
  isSafeEditableAttribute,
  isSafeInlineEditId,
  sanitizeStoredInlineEditMap,
  type InlineEditMap,
} from './inline-edits'
import { applyPageCustomizationsForDeploy } from './site-deploy'
import { combineTemplateThemeStylesheets } from './template-preview-composition'
import { isSafePreviewPage } from './template-preview-security'
import { composeCustomerPreviewDocument } from './customer-preview-document'
import { catalogDocumentHash, catalogManifestHash } from './templates/catalog-profile'
import type { CatalogSnapshotLocator } from './catalog-revision'

const SAFE_SEGMENT = /^(?!\.{1,2}$)[A-Za-z0-9._-]+$/
const SAFE_RELATIVE_FILE = /^(?!\/)(?!.*\\)(?!.*(?:^|\/)\.{1,2}(?:\/|$))[A-Za-z0-9._/-]+$/
const THEME_TOKEN = /--dc-theme-(?:color|font)_[A-Za-z0-9_-]+/g
const PROTECTED_HTML = /<!--[\s\S]*?-->|<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi
const VOID_HTML_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])
const INTERACTION_ELEMENTS = new Set(['a', 'button', 'form', 'input', 'label', 'nav', 'option', 'select', 'textarea'])
const DEFAULT_MAX_DIAGNOSTICS = 100
const DEFAULT_WORKERS = 8
const PERMANENTLY_HIDDEN_STYLE = /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse)|content-visibility\s*:\s*hidden|opacity\s*:\s*0(?:\.0*)?)(?:\s*!important)?\s*(?:;|$)/i
const POINTER_EVENTS_NONE_STYLE = /(?:^|;)\s*pointer-events\s*:\s*none(?:\s*!important)?\s*(?:;|$)/i
const DECORATIVE_IMAGE_SIGNAL = /(?:^|[\s/_.-])(?:aura|decor(?:ation|ative)?|grain|noise|ornament|pattern|texture)(?=$|[\s/_.-])/i
const PROTECTED_BACKGROUND_TAGS = new Set(['a', 'button', 'input', 'select', 'textarea', 'option', 'label', 'summary'])

const SENTINEL_THEME: CustomTheme = {
  primary: '#7a315c',
  background: '#f7f1e8',
  text: '#263238',
  headingFont: 'Georgia, serif',
  bodyFont: 'Verdana, sans-serif',
}

interface CatalogTemplateEntry {
  legacySlug: string
  designId: string
  contentPresetId: string
  themePresetId: string
  niche: string
  qualityReceipt: string
}

interface CatalogDocument {
  contractVersion: number
  sourceTemplates: number
  templates: CatalogTemplateEntry[]
}

interface TemplateManifest {
  contractVersion: number
  legacySlug: string
  niche: string
  pages: string[]
  designId?: string
  contentPresetId?: string
  themePresetId?: string
  qualityReceipt?: string
}

interface ContentEntry {
  nodeId: string
  page: string
  html: string
  text: string
  attribute?: string
}

interface ImageEntry {
  slotId: string
  page: string
  kind: string
  source: string
  selector?: string
  attribute?: string
  stylesheet?: string
  srcset?: string
}

interface ContentPreset {
  id: string
  legacySlug: string
  entries: ContentEntry[]
  images: ImageEntry[]
}

interface ThemeTokenEntry {
  id: string
  kind: 'color' | 'font'
  value: string
}

interface ThemePreset {
  id: string
  legacySlug: string
  tokens: ThemeTokenEntry[]
}

interface ParsedHtmlNode {
  nodeName: string
  tagName?: string
  attrs?: Array<{ name: string; value: string }>
  childNodes?: ParsedHtmlNode[]
}

interface AdvertisedSlotState {
  hidden: boolean
  pointerless: boolean
  decorative: boolean
  protectedAction: boolean
  identity: string
}

export interface RehabCustomizationDiagnostic {
  code: string
  detail: string
  template?: string
  page?: string
  targetId?: string
}

export interface RehabCustomizationVerification {
  pass: boolean
  root: string
  catalogTemplates: number
  scannedTemplates: number
  pages: number
  stylesheets: number
  contentEntries: number
  imageSlots: number
  themeTokens: number
  diagnosticCount: number
  diagnostics: RehabCustomizationDiagnostic[]
  diagnosticsTruncated: number
}

export interface VerifyRehabCustomizationOptions {
  root: string
  workers?: number
  maxDiagnostics?: number
}

interface TemplateVerification {
  key: string
  pages: number
  stylesheets: number
  contentEntries: number
  imageSlots: number
  themeTokens: number
  diagnosticCount: number
  diagnostics: RehabCustomizationDiagnostic[]
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function bounded(value: unknown, limit = 500): string {
  return String(value).replace(/[\r\n\t]+/g, ' ').slice(0, limit)
}

function isWithin(parent: string, candidate: string): boolean {
  const difference = relative(resolve(parent), resolve(candidate))
  return difference === '' || (!difference.startsWith(`..${sep}`) && difference !== '..' && !isAbsolute(difference))
}

function safeRelativeFile(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 512 && SAFE_RELATIVE_FILE.test(value)
    && value.split('/').every((segment) => SAFE_SEGMENT.test(segment))
}

function exactJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(exactJson).join(',')}]`
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${exactJson(record[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

async function readSafeFile(root: string, relativePath: string): Promise<string> {
  if (!safeRelativeFile(relativePath)) throw new Error(`unsafe relative file path ${bounded(relativePath)}`)
  const path = resolve(root, ...relativePath.split('/'))
  if (!isWithin(root, path)) throw new Error(`file escapes template root: ${relativePath}`)
  const details = await lstat(path)
  if (!details.isFile() || details.isSymbolicLink()) throw new Error(`not a regular file: ${relativePath}`)
  return readFile(path, 'utf8')
}

async function readSafeJson<T>(root: string, relativePath: string): Promise<T> {
  const parsed = JSON.parse(await readSafeFile(root, relativePath)) as unknown
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${relativePath} is not a JSON object`)
  }
  return parsed as T
}

function attributeValues(html: string, name: string): string[] {
  const searchable = html.replace(PROTECTED_HTML, (value) => ' '.repeat(value.length))
  const pattern = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'gi')
  return [...searchable.matchAll(pattern)].map((match) => match[1] ?? match[2] ?? match[3] ?? '')
}

function targetCount(html: string, attribute: string, value: string): number {
  return attributeValues(html, attribute).filter((candidate) => candidate === value).length
}

function targetOpeningTags(html: string, attribute: string, value: string): string[] {
  const searchable = html.replace(PROTECTED_HTML, (protectedBlock) => ' '.repeat(protectedBlock.length))
  return [...searchable.matchAll(/<[A-Za-z][^>]*>/g)]
    .map((match) => match[0])
    .filter((tag) => attributeValues(tag, attribute).includes(value))
}

function openingTagName(tag: string): string | undefined {
  return /^<([A-Za-z][A-Za-z0-9:-]*)\b/.exec(tag)?.[1]
}

function targetInnerHtml(html: string, attribute: string, value: string): string | undefined {
  const searchable = html.replace(PROTECTED_HTML, (protectedBlock) => ' '.repeat(protectedBlock.length))
  const openings = [...searchable.matchAll(/<[A-Za-z][^>]*>/g)]
    .filter((match) => attributeValues(match[0], attribute).includes(value))
  if (openings.length !== 1) return undefined
  const opening = openings[0]!
  const tagName = openingTagName(opening[0])?.toLowerCase()
  if (!tagName) return undefined
  if (VOID_HTML_ELEMENTS.has(tagName) || /\/\s*>$/.test(opening[0])) return ''

  const contentStart = opening.index! + opening[0].length
  const matchingTag = new RegExp(`<\\/?${tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[^>]*>`, 'gi')
  matchingTag.lastIndex = contentStart
  let depth = 1
  let match: RegExpExecArray | null
  while ((match = matchingTag.exec(searchable)) !== null) {
    if (/^<\//.test(match[0])) depth -= 1
    else if (!/\/\s*>$/.test(match[0])) depth += 1
    if (depth === 0) return html.slice(contentStart, match.index)
  }
  return undefined
}

function advertisedSlotStates(html: string): {
  edits: Map<string, AdvertisedSlotState>
  images: Map<string, AdvertisedSlotState>
} {
  const edits = new Map<string, AdvertisedSlotState>()
  const images = new Map<string, AdvertisedSlotState>()
  const root = parse(html) as unknown as ParsedHtmlNode
  const attribute = (node: ParsedHtmlNode, name: string): string | undefined => (
    node.attrs?.find((entry) => entry.name.toLowerCase() === name)?.value
  )
  const visit = (node: ParsedHtmlNode, hiddenAncestor = false, pointerlessAncestor = false): void => {
    if (!node.tagName) {
      for (const child of node.childNodes ?? []) visit(child, hiddenAncestor, pointerlessAncestor)
      return
    }
    const style = attribute(node, 'style') ?? ''
    const ariaHidden = (attribute(node, 'aria-hidden') ?? '').toLowerCase() === 'true'
    const role = (attribute(node, 'role') ?? '').toLowerCase()
    const hidden = hiddenAncestor
      || attribute(node, 'hidden') !== undefined
      || attribute(node, 'inert') !== undefined
      || ariaHidden
      || PERMANENTLY_HIDDEN_STYLE.test(style)
    const pointerless = pointerlessAncestor || POINTER_EVENTS_NONE_STYLE.test(style)
    const identity = [
      attribute(node, 'id') ?? '',
      attribute(node, 'class') ?? '',
      attribute(node, 'src') ?? '',
      attribute(node, 'srcset') ?? '',
      style,
    ].join(' ')
    const state: AdvertisedSlotState = {
      hidden,
      pointerless,
      decorative: ariaHidden || role === 'presentation' || role === 'none'
        || DECORATIVE_IMAGE_SIGNAL.test(identity),
      protectedAction: PROTECTED_BACKGROUND_TAGS.has(node.tagName)
        || role === 'button' || role === 'link',
      identity,
    }
    const editId = attribute(node, 'data-dc-edit-id') || attribute(node, 'data-pb-edit-id')
    const imageId = attribute(node, 'data-dc-image-id') || attribute(node, 'data-pb-image-id')
    if (editId) edits.set(editId, state)
    if (imageId) images.set(imageId, state)
    for (const child of node.childNodes ?? []) visit(child, hidden, pointerless)
  }
  visit(root)
  return { edits, images }
}

function hasElementDescendant(innerHtml: string): boolean {
  return /<[A-Za-z][^>]*>/.test(innerHtml.replace(/<!--[\s\S]*?-->/g, ''))
}

function normalizeInteractionTag(tag: string): string {
  if (/^<\//.test(tag)) return tag.toLowerCase().replace(/\s+/g, '')
  return tag
    .replace(/\s(?:data-(?:dc|pb)-(?:edit-id|edit-attribute|image-id)|content|alt|title|placeholder|aria-label|src|srcset|style)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/^<([A-Za-z][A-Za-z0-9:-]*)/, (_match, name: string) => `<${name.toLowerCase()}`)
    .trim()
}

function interactionStructure(html: string): string {
  const searchable = html.replace(PROTECTED_HTML, (protectedBlock) => ' '.repeat(protectedBlock.length))
  return [...searchable.matchAll(/<\/?([A-Za-z][A-Za-z0-9:-]*)\b[^>]*>/g)]
    .filter((match) => INTERACTION_ELEMENTS.has(match[1]!.toLowerCase()))
    .map((match) => normalizeInteractionTag(match[0]))
    .join('|')
}

function compilerThemeTokens(css: string): string[] {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
  return [...new Set(withoutComments.match(THEME_TOKEN) ?? [])].sort()
}

function overrideCount(css: string, token: string): number {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return [...css.matchAll(new RegExp(`${escaped}\\s*:`, 'g'))].length
}

async function listCssFiles(templateRoot: string, current = templateRoot, prefix = ''): Promise<string[]> {
  const output: string[] = []
  for (const entry of (await readdir(current, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
    const fullPath = resolve(current, entry.name)
    if (!isWithin(templateRoot, fullPath)) throw new Error(`directory entry escapes template root: ${relativePath}`)
    if (entry.isSymbolicLink()) throw new Error(`symbolic link is not allowed: ${relativePath}`)
    if (entry.isDirectory()) output.push(...await listCssFiles(templateRoot, fullPath, relativePath))
    else if (entry.isFile() && /\.css$/i.test(entry.name)) output.push(relativePath)
  }
  return output.sort()
}

async function mapConcurrent<T, R>(values: readonly T[], workers: number, mapper: (value: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(values.length)
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(workers, Math.max(1, values.length)) }, async () => {
    while (cursor < values.length) {
      const index = cursor++
      results[index] = await mapper(values[index]!)
    }
  }))
  return results
}

function safeCatalogEntry(value: unknown): value is CatalogTemplateEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const entry = value as Partial<CatalogTemplateEntry>
  return (
    typeof entry.legacySlug === 'string' && SAFE_SEGMENT.test(entry.legacySlug)
    && typeof entry.niche === 'string' && SAFE_SEGMENT.test(entry.niche)
    && typeof entry.designId === 'string' && /^design_[A-Za-z0-9_-]+$/.test(entry.designId)
    && typeof entry.contentPresetId === 'string' && /^content_[A-Za-z0-9_-]+$/.test(entry.contentPresetId)
    && typeof entry.themePresetId === 'string' && /^theme_[A-Za-z0-9_-]+$/.test(entry.themePresetId)
    && typeof entry.qualityReceipt === 'string' && /^receipt_[A-Za-z0-9_-]+$/.test(entry.qualityReceipt)
  )
}

function errorResult(key: string, code: string, detail: unknown): TemplateVerification {
  return {
    key,
    pages: 0,
    stylesheets: 0,
    contentEntries: 0,
    imageSlots: 0,
    themeTokens: 0,
    diagnosticCount: 1,
    diagnostics: [{ code, detail: bounded(detail), template: key }],
  }
}

async function verifyTemplate(
  stagingRoot: string,
  catalogEntry: CatalogTemplateEntry,
  localDiagnosticLimit: number,
  catalogLocator: CatalogSnapshotLocator,
): Promise<TemplateVerification> {
  const key = `${catalogEntry.niche}/${catalogEntry.legacySlug}`
  const templateRoot = resolve(stagingRoot, catalogEntry.niche, catalogEntry.legacySlug)
  if (!isWithin(stagingRoot, templateRoot)) return errorResult(key, 'template_path_unsafe', 'Template path escapes staging root')
  const diagnostics: RehabCustomizationDiagnostic[] = []
  let diagnosticCount = 0
  const add = (code: string, detail: unknown, page?: string, targetId?: string): void => {
    diagnosticCount += 1
    if (diagnostics.length >= localDiagnosticLimit) return
    diagnostics.push({
      code,
      detail: bounded(detail),
      template: key,
      ...(page ? { page } : {}),
      ...(targetId ? { targetId } : {}),
    })
  }

  try {
    const directory = await lstat(templateRoot)
    if (!directory.isDirectory() || directory.isSymbolicLink()) {
      return errorResult(key, 'template_directory_invalid', 'Template is missing, not a directory, or a symbolic link')
    }
    const [manifest, contentPreset, themePreset] = await Promise.all([
      readSafeJson<TemplateManifest>(templateRoot, 'template.json'),
      readSafeJson<ContentPreset>(templateRoot, '.dailyclarity/content-preset.json'),
      readSafeJson<ThemePreset>(templateRoot, '.dailyclarity/theme-preset.json'),
    ])
    if (manifest.contractVersion !== 3) add('manifest_contract_invalid', 'template.json is not contract v3')
    if (manifest.legacySlug !== catalogEntry.legacySlug || manifest.niche !== catalogEntry.niche) {
      add('manifest_lineage_mismatch', 'template.json niche/legacySlug differs from _catalog-v3.json')
    }
    for (const field of ['designId', 'contentPresetId', 'themePresetId', 'qualityReceipt'] as const) {
      if (manifest[field] !== catalogEntry[field]) add('manifest_revision_mismatch', `${field} differs from _catalog-v3.json`)
    }
    if (contentPreset.id !== catalogEntry.contentPresetId || contentPreset.legacySlug !== catalogEntry.legacySlug) {
      add('content_preset_lineage_mismatch', 'Content preset identity does not match the catalogue entry')
    }
    if (themePreset.id !== catalogEntry.themePresetId || themePreset.legacySlug !== catalogEntry.legacySlug) {
      add('theme_preset_lineage_mismatch', 'Theme preset identity does not match the catalogue entry')
    }
    if (
      !Array.isArray(manifest.pages) ||
      manifest.pages.length === 0 ||
      manifest.pages.some((page) => !isSafePreviewPage(page))
    ) {
      add('manifest_pages_invalid', 'Manifest pages must be safe HTML paths')
      return {
        key,
        pages: 0,
        stylesheets: 0,
        contentEntries: 0,
        imageSlots: 0,
        themeTokens: 0,
        diagnosticCount,
        diagnostics,
      }
    }
    if (!Array.isArray(contentPreset.entries) || !Array.isArray(contentPreset.images)) {
      add('content_preset_shape_invalid', 'Content preset entries/images must be arrays')
      return {
        key,
        pages: manifest.pages.length,
        stylesheets: 0,
        contentEntries: 0,
        imageSlots: 0,
        themeTokens: 0,
        diagnosticCount,
        diagnostics,
      }
    }
    if (!Array.isArray(themePreset.tokens)) {
      add('theme_preset_shape_invalid', 'Theme preset tokens must be an array')
      themePreset.tokens = []
    }

    const pagePairs = await Promise.all(manifest.pages.map(async (page) => [page, await readSafeFile(templateRoot, page)] as const))
    const pages = new Map(pagePairs)
    const slotStates = new Map(pagePairs.map(([page, html]) => [page, advertisedSlotStates(html)] as const))
    const inlineEdits: InlineEditMap = {}
    const imageSwaps: ImageSwapMap = {}
    const seenContentTargets = new Set<string>()
    for (const [index, entry] of contentPreset.entries.entries()) {
      if (!entry || typeof entry !== 'object' || !isSafeInlineEditId(entry.nodeId) || !safeRelativeFile(entry.page)) {
        add('content_entry_invalid', `Content entry ${index} has an invalid page or node ID`)
        continue
      }
      const targetKey = `${entry.page}\0${entry.nodeId}`
      if (seenContentTargets.has(targetKey)) add('content_entry_duplicate', 'Content preset repeats a page/node ID', entry.page, entry.nodeId)
      seenContentTargets.add(targetKey)
      const html = pages.get(entry.page)
      if (html === undefined) {
        add('content_page_missing', 'Content entry references a page outside the manifest', entry.page, entry.nodeId)
        continue
      }
      const count = targetCount(html, 'data-dc-edit-id', entry.nodeId) + targetCount(html, 'data-pb-edit-id', entry.nodeId)
      if (count !== 1) {
        add(count === 0 ? 'content_target_unmatched' : 'content_target_ambiguous', `Expected exactly one edit target; found ${count}`, entry.page, entry.nodeId)
        continue
      }
      const state = slotStates.get(entry.page)?.edits.get(entry.nodeId)
      if (state?.hidden || state?.pointerless) {
        add('content_target_not_customer_visible', 'Content preset advertises a permanently hidden, inert, or pointerless target', entry.page, entry.nodeId)
        continue
      }
      const matchingTags = [
        ...targetOpeningTags(html, 'data-dc-edit-id', entry.nodeId),
        ...targetOpeningTags(html, 'data-pb-edit-id', entry.nodeId),
      ]
      if (entry.attribute !== undefined && !isSafeEditableAttribute(entry.attribute)) {
        add('content_attribute_unsafe', `Unsupported editable attribute ${bounded(entry.attribute)}`, entry.page, entry.nodeId)
        continue
      }
      const declaredAttributes = matchingTags.flatMap((tag) => [
        ...attributeValues(tag, 'data-dc-edit-attribute'),
        ...attributeValues(tag, 'data-pb-edit-attribute'),
      ])
      if (entry.attribute !== undefined) {
        const tagName = openingTagName(matchingTags[0] ?? '')
        if (declaredAttributes.length !== 1 || declaredAttributes[0] !== entry.attribute) {
          add('content_attribute_marker_mismatch', `Expected data-dc-edit-attribute=${entry.attribute}`, entry.page, entry.nodeId)
          continue
        }
        if (!tagName || !isEditableAttributeForTag(tagName, entry.attribute) || attributeValues(matchingTags[0]!, entry.attribute).length !== 1) {
          add('content_attribute_target_invalid', `The ${entry.attribute} slot is absent or unsafe on its target element`, entry.page, entry.nodeId)
          continue
        }
      } else if (declaredAttributes.length > 0) {
        add('content_attribute_marker_unmanifested', 'Target declares attribute editing but the content preset describes a text slot', entry.page, entry.nodeId)
        continue
      } else {
        const innerHtml = targetInnerHtml(html, 'data-dc-edit-id', entry.nodeId)
          ?? targetInnerHtml(html, 'data-pb-edit-id', entry.nodeId)
        if (innerHtml === undefined || hasElementDescendant(innerHtml)) {
          add('content_target_not_leaf', 'A text edit target owns descendant markup and could erase navigation, form controls, or other structure', entry.page, entry.nodeId)
          continue
        }
      }
      const sentinel = `dc-edit-check-${sha256(targetKey).slice(0, 16)}`
      const pageEdits = inlineEdits[entry.page] ?? []
      pageEdits.push({ nodeId: entry.nodeId, updated: sentinel })
      inlineEdits[entry.page] = pageEdits
    }

    // Visible placeholder copy is part of the customer-facing content surface.
    // When an input also has an aria-label, the placeholder is the single
    // editable attribute and the accessibility label remains intact.
    for (const [page, html] of pages) {
      const searchable = html.replace(PROTECTED_HTML, (protectedBlock) => ' '.repeat(protectedBlock.length))
      for (const match of searchable.matchAll(/<(?:input|textarea)\b[^>]*>/gi)) {
        const tag = match[0]
        const placeholder = attributeValues(tag, 'placeholder')[0]?.trim()
        if (!placeholder) continue
        const ids = [
          ...attributeValues(tag, 'data-dc-edit-id'),
          ...attributeValues(tag, 'data-pb-edit-id'),
        ]
        const declared = [
          ...attributeValues(tag, 'data-dc-edit-attribute'),
          ...attributeValues(tag, 'data-pb-edit-attribute'),
        ]
        const nodeId = ids.length === 1 ? ids[0] : undefined
        if (!nodeId || declared.length !== 1 || declared[0] !== 'placeholder' || !seenContentTargets.has(`${page}\0${nodeId}`)) {
          add('visible_placeholder_uneditable', 'A visible input or textarea placeholder is not represented by one placeholder-priority content slot', page, nodeId)
        }
      }
    }

    const seenImageTargets = new Set<string>()
    for (const [index, image] of contentPreset.images.entries()) {
      if (!image || typeof image !== 'object' || !isSafeImageSlotId(image.slotId) || !safeRelativeFile(image.page)) {
        add('image_entry_invalid', `Image entry ${index} has an invalid page or slot ID`)
        continue
      }
      const targetKey = `${image.page}\0${image.slotId}`
      if (seenImageTargets.has(targetKey)) add('image_entry_duplicate', 'Content preset repeats a page/image slot ID', image.page, image.slotId)
      seenImageTargets.add(targetKey)
      const html = pages.get(image.page)
      if (html === undefined) {
        add('image_page_not_customer_editable', 'Image slot is not attached to an HTML page accepted by customer persistence', image.page, image.slotId)
        continue
      }
      const count = targetCount(html, 'data-dc-image-id', image.slotId) + targetCount(html, 'data-pb-image-id', image.slotId)
      if (count !== 1) {
        add(count === 0 ? 'image_target_unmatched' : 'image_target_ambiguous', `Expected exactly one image target; found ${count}`, image.page, image.slotId)
        continue
      }
      const state = slotStates.get(image.page)?.images.get(image.slotId)
      const imageIdentity = `${state?.identity ?? ''} ${image.source ?? ''} ${image.selector ?? ''}`
      if (state?.hidden || state?.pointerless) {
        add('image_target_not_customer_visible', 'Image preset advertises a permanently hidden, inert, or pointerless target', image.page, image.slotId)
        continue
      }
      if (state?.decorative || (image.kind === 'background' && DECORATIVE_IMAGE_SIGNAL.test(imageIdentity))) {
        add('decorative_image_slot_advertised', 'Decorative pattern/texture imagery must remain visual design CSS rather than a customer upload slot', image.page, image.slotId)
        continue
      }
      if (image.kind === 'background' && state?.protectedAction) {
        add('background_slot_steals_customer_action', 'A background image slot cannot own a link, control, or other protected customer action', image.page, image.slotId)
        continue
      }
      const updated = `https://images.example.test/dc-slot-${sha256(targetKey).slice(0, 16)}.webp`
      const pageSwaps = imageSwaps[image.page] ?? []
      pageSwaps.push({ slotId: image.slotId, updated })
      imageSwaps[image.page] = pageSwaps
    }

    const sanitizedInline = sanitizeStoredInlineEditMap(JSON.parse(JSON.stringify(inlineEdits)))
    const sanitizedImages = sanitizeImageSwapMap(JSON.parse(JSON.stringify(imageSwaps)))
    if (exactJson(sanitizedInline) !== exactJson(inlineEdits)) {
      add('inline_persistence_roundtrip_failed', 'At least one manifest content edit is lost by the persistence sanitizer')
    }
    if (exactJson(sanitizedImages) !== exactJson(imageSwaps)) {
      add('image_persistence_roundtrip_failed', 'At least one manifest image swap is lost by the persistence sanitizer')
    }

    for (const [page, edits] of Object.entries(inlineEdits)) {
      const persisted = new Map((sanitizedInline[page] ?? []).map((edit) => [edit.nodeId, edit.updated]))
      for (const edit of edits) {
        if (persisted.get(edit.nodeId) !== edit.updated) {
          add('content_persistence_rejected', 'Inline-edit sanitizer rejected or changed the stable target', page, edit.nodeId)
        }
      }
    }
    for (const [page, swaps] of Object.entries(imageSwaps)) {
      const persisted = new Map((sanitizedImages[page] ?? []).map((swap) => [swap.slotId, swap.updated]))
      for (const swap of swaps) {
        if (persisted.get(swap.slotId) !== swap.updated) {
          add('image_persistence_rejected', 'Image sanitizer rejected or changed the stable target', page, swap.slotId)
        }
      }
    }

    // Exercise the same aggregate payload a customer stores. Each page is
    // annotated once for preview and once for deploy, regardless of slot count.
    // This both catches interactions between saved edits and avoids repeatedly
    // reparsing a page for every individual manifest entry.
    for (const [page, html] of pages) {
      const edits = sanitizedInline[page] ?? []
      const swaps = sanitizedImages[page] ?? []
      if (edits.length === 0 && swaps.length === 0) continue

      const edited = applyInlineEditsToHtmlWithReport(html, edits, page)
      const customerPreview = composeCustomerPreviewDocument({
        html,
        assetBase: `/api/templates/${catalogEntry.niche}/${catalogEntry.legacySlug}/assets/__catalog/${catalogLocator.catalogHash}/${catalogLocator.manifestHash}`,
        page,
        inlineEdits: edits,
        imageSwaps: swaps,
      })
      const unmatchedEdits = new Set(edited.unmatchedNodeIds)
      for (const edit of edits) {
        if (
          !edit.nodeId ||
          unmatchedEdits.has(edit.nodeId) ||
          !edited.html.includes(edit.updated) ||
          !customerPreview.includes(edit.updated)
        ) {
          add('content_customer_path_failed', 'Preview inline-edit helper could not update this exact target', page, edit.nodeId)
        }
      }
      const imaged = applyImageSwapsToHtmlWithReport(edited.html, swaps, page)
      const unmatchedImages = new Set(imaged.unmatchedSlotIds)
      for (const swap of swaps) {
        if (
          !swap.slotId ||
          unmatchedImages.has(swap.slotId) ||
          !imaged.html.includes(swap.updated) ||
          !customerPreview.includes(swap.updated)
        ) {
          add('image_customer_path_failed', 'Preview image helper could not update this exact target', page, swap.slotId)
        }
      }
      const sourceInteractionStructure = interactionStructure(html)
      if (
        interactionStructure(imaged.html) !== sourceInteractionStructure ||
        interactionStructure(customerPreview) !== sourceInteractionStructure
      ) {
        add('preview_interaction_structure_changed', 'Preview customization changed navigation or form structure', page)
      }

      try {
        const deployed = applyPageCustomizationsForDeploy(html, edits, swaps, page)
        for (const edit of edits) {
          if (!deployed.includes(edit.updated)) {
            add('content_deploy_path_failed', 'Deploy helper did not preserve the targeted edit', page, edit.nodeId)
          }
        }
        for (const swap of swaps) {
          if (!deployed.includes(swap.updated)) {
            add('image_deploy_path_failed', 'Deploy helper did not preserve the targeted swap', page, swap.slotId)
          }
        }
        if (interactionStructure(deployed) !== sourceInteractionStructure) {
          add('deploy_interaction_structure_changed', 'Deployment customization changed navigation or form structure', page)
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : error
        for (const edit of edits) add('content_deploy_path_failed', detail, page, edit.nodeId)
        for (const swap of swaps) add('image_deploy_path_failed', detail, page, swap.slotId)
      }
    }

    try {
      const checkout = buildCheckoutTemplateState({
        template: catalogEntry.legacySlug,
        niche: catalogEntry.niche,
        templateRevision: {
          validation: { contractVersion: 3 },
          designId: catalogEntry.designId,
          contentPresetId: catalogEntry.contentPresetId,
          themePresetId: catalogEntry.themePresetId,
          qualityReceipt: catalogEntry.qualityReceipt,
          catalogHash: catalogLocator.catalogHash,
          manifestHash: catalogLocator.manifestHash,
        },
        inlineEdits: sanitizedInline,
        imageSwaps: sanitizedImages,
        customTheme: SENTINEL_THEME,
        customerValues: {},
        imageOwner: 'draft-123e4567-e89b-42d3-a456-426614174000',
      })
      const serialized = JSON.parse(JSON.stringify(checkout)) as unknown
      const portalUpdate = preparePortalCustomizationUpdate(serialized, 'rehab-verifier-site')
      if (!portalUpdate.ok) add('portal_persistence_rejected', portalUpdate.error)
      else {
        const persisted = mergePortalSiteData(serialized as Record<string, unknown>, portalUpdate)
        if (exactJson(persisted.inlineEdits) !== exactJson(checkout.inlineEdits)) add('portal_inline_roundtrip_failed', 'Portal persistence changes inline edits')
        if (exactJson(persisted.imageSwaps) !== exactJson(checkout.imageSwaps)) add('portal_image_roundtrip_failed', 'Portal persistence changes image swaps')
        if (exactJson(persisted.customTheme) !== exactJson(checkout.customTheme)) add('portal_theme_roundtrip_failed', 'Portal persistence changes the custom theme')
        if (exactJson(persisted.catalogRevision) !== exactJson(checkout.catalogRevision)) add('portal_revision_roundtrip_failed', 'Portal persistence changes the catalogue revision pin')
      }
    } catch (error) {
      add('checkout_persistence_failed', error instanceof Error ? error.message : error)
    }

    const cssFiles = await listCssFiles(templateRoot)
    const stylesheetPairs = await Promise.all(cssFiles.map(async (path) => ({ path, css: await readSafeFile(templateRoot, path) })))
    const combinedCss = combineTemplateThemeStylesheets(stylesheetPairs)
    const allTokens = [...new Set(stylesheetPairs.flatMap((entry) => compilerThemeTokens(entry.css)))].sort()
    const presetTokens = new Map<string, ThemeTokenEntry>()
    for (const [index, token] of themePreset.tokens.entries()) {
      if (!token || typeof token !== 'object' || !/^(?:color|font)_[A-Za-z0-9_-]+$/.test(token.id) || !['color', 'font'].includes(token.kind) || typeof token.value !== 'string') {
        add('theme_preset_token_invalid', `Theme token ${index} is malformed`)
        continue
      }
      const property = `--dc-theme-${token.id}`
      if (presetTokens.has(property)) add('theme_preset_token_duplicate', `Theme preset repeats ${property}`, undefined, property)
      presetTokens.set(property, token)
    }
    for (const token of allTokens) {
      if (!presetTokens.has(token)) add('theme_token_missing_from_preset', `${token} exists in CSS but not the theme preset`, undefined, token)
    }
    for (const token of presetTokens.keys()) {
      if (!allTokens.includes(token)) add('theme_preset_token_orphaned', `${token} is absent from all staged stylesheets`, undefined, token)
    }
    const customCss = buildCustomThemeCss(SENTINEL_THEME, combinedCss)
    const liveCss = buildLivePreviewThemeCss({
      colors: { primary: SENTINEL_THEME.primary, bg: SENTINEL_THEME.background, text: SENTINEL_THEME.text },
      fonts: { heading: SENTINEL_THEME.headingFont, body: SENTINEL_THEME.bodyFont },
    }, combinedCss)
    if (customCss !== liveCss) add('theme_preview_server_mismatch', 'Live editor and server theme helpers emit different CSS')
    const colorTokens = allTokens.filter((token) => token.startsWith('--dc-theme-color_'))
    const fontTokens = allTokens.filter((token) => token.startsWith('--dc-theme-font_'))
    for (const token of colorTokens) {
      const count = overrideCount(customCss, token)
      if (count !== 1) add('theme_token_not_overridden', `Expected one customer color override for ${token}; found ${count}`, undefined, token)
    }
    // buildCustomThemeCss delegates to buildCompilerThemeOverrides, which
    // intentionally maps only family-compatible font tokens. Size, weight,
    // style, and shorthand tokens must retain their compiled values rather
    // than receiving an invalid font-family string.
    const mappedFontTokens = fontTokens.filter((token) => overrideCount(customCss, token) > 0)
    for (const token of mappedFontTokens) {
      const count = overrideCount(customCss, token)
      if (count !== 1) add('theme_token_not_overridden', `Expected one customer font-family override for ${token}; found ${count}`, undefined, token)
    }
    if (colorTokens.length > 0 && !colorTokens.some((token) => overrideCount(customCss, token) === 1)) {
      add('theme_color_mapping_missing', 'Compiler color tokens exist but no customer palette mapping is effective')
    }
    if (mappedFontTokens.length > 0 && !mappedFontTokens.some((token) => overrideCount(liveCss, token) === 1)) {
      add('theme_font_mapping_missing', 'Family-compatible compiler font tokens exist but no live customer font mapping is effective')
    }

    return {
      key,
      pages: pages.size,
      stylesheets: stylesheetPairs.length,
      contentEntries: contentPreset.entries.length,
      imageSlots: contentPreset.images.length,
      themeTokens: allTokens.length,
      diagnosticCount,
      diagnostics,
    }
  } catch (error) {
    add('template_verification_exception', error instanceof Error ? error.message : error)
    return {
      key,
      pages: 0,
      stylesheets: 0,
      contentEntries: 0,
      imageSlots: 0,
      themeTokens: 0,
      diagnosticCount,
      diagnostics,
    }
  }
}

async function discoverStagedTemplateKeys(stagingRoot: string): Promise<{ keys: string[]; diagnostics: RehabCustomizationDiagnostic[] }> {
  const keys: string[] = []
  const diagnostics: RehabCustomizationDiagnostic[] = []
  for (const niche of (await readdir(stagingRoot, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
    if (niche.name.startsWith('_') || niche.name.startsWith('.')) continue
    if (niche.isSymbolicLink()) {
      diagnostics.push({ code: 'staging_symlink', detail: `Symbolic-link niche is not allowed: ${niche.name}` })
      continue
    }
    if (!niche.isDirectory() || !SAFE_SEGMENT.test(niche.name)) continue
    const nicheRoot = resolve(stagingRoot, niche.name)
    for (const template of (await readdir(nicheRoot, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
      if (template.isSymbolicLink()) {
        diagnostics.push({ code: 'staging_symlink', detail: `Symbolic-link template is not allowed: ${niche.name}/${template.name}` })
        continue
      }
      if (!template.isDirectory() || !SAFE_SEGMENT.test(template.name)) continue
      try {
        const manifest = await readSafeJson<{ contractVersion?: unknown }>(resolve(nicheRoot, template.name), 'template.json')
        if (manifest.contractVersion === 3) keys.push(`${niche.name}/${template.name}`)
      } catch {
        // The uploader owns non-v3 and malformed unrelated directories. A
        // catalogued directory is still reported by verifyTemplate.
      }
    }
  }
  return { keys: keys.sort(), diagnostics }
}

export async function verifyRehabCustomizationStaging(
  options: VerifyRehabCustomizationOptions,
): Promise<RehabCustomizationVerification> {
  const workers = options.workers ?? DEFAULT_WORKERS
  const maxDiagnostics = options.maxDiagnostics ?? DEFAULT_MAX_DIAGNOSTICS
  if (!Number.isSafeInteger(workers) || workers < 1 || workers > 64) throw new Error('workers must be an integer from 1 to 64')
  if (!Number.isSafeInteger(maxDiagnostics) || maxDiagnostics < 1 || maxDiagnostics > 10_000) {
    throw new Error('maxDiagnostics must be an integer from 1 to 10000')
  }
  const requestedRoot = resolve(options.root)
  const requestedDetails = await lstat(requestedRoot)
  if (!requestedDetails.isDirectory() || requestedDetails.isSymbolicLink()) {
    throw new Error('Staging root must be a real directory, not a symbolic link')
  }
  const root = await realpath(requestedRoot)
  const [catalogText, runtimeManifest] = await Promise.all([
    readSafeFile(root, '_catalog-v3.json'),
    readSafeJson<unknown>(root, '_manifest.json'),
  ])
  let catalog: CatalogDocument
  try {
    catalog = JSON.parse(catalogText) as CatalogDocument
  } catch {
    throw new Error('_catalog-v3.json is malformed JSON')
  }
  if (catalog.contractVersion !== 3 || !Array.isArray(catalog.templates)) {
    throw new Error('_catalog-v3.json is not a catalogue v3 document')
  }
  const catalogLocator: CatalogSnapshotLocator = {
    catalogHash: catalogDocumentHash(catalogText),
    manifestHash: catalogManifestHash(runtimeManifest),
  }

  const globalDiagnostics: RehabCustomizationDiagnostic[] = []
  let globalDiagnosticCount = 0
  const addGlobal = (diagnostic: RehabCustomizationDiagnostic): void => {
    globalDiagnosticCount += 1
    if (globalDiagnostics.length < maxDiagnostics) globalDiagnostics.push(diagnostic)
  }
  const entries: CatalogTemplateEntry[] = []
  const seen = new Set<string>()
  for (const [index, value] of catalog.templates.entries()) {
    if (!safeCatalogEntry(value)) {
      addGlobal({ code: 'catalog_entry_invalid', detail: `Catalogue entry ${index} is malformed` })
      continue
    }
    const key = `${value.niche}/${value.legacySlug}`
    if (seen.has(key)) {
      addGlobal({ code: 'catalog_entry_duplicate', detail: `Catalogue repeats ${key}`, template: key })
      continue
    }
    seen.add(key)
    entries.push(value)
  }
  if (!Number.isSafeInteger(catalog.sourceTemplates) || catalog.sourceTemplates !== catalog.templates.length) {
    addGlobal({ code: 'catalog_count_mismatch', detail: `sourceTemplates=${bounded(catalog.sourceTemplates)} entries=${catalog.templates.length}` })
  }

  const discovered = await discoverStagedTemplateKeys(root)
  for (const diagnostic of discovered.diagnostics) addGlobal(diagnostic)
  const catalogKeys = new Set(entries.map((entry) => `${entry.niche}/${entry.legacySlug}`))
  for (const key of discovered.keys) {
    if (!catalogKeys.has(key)) addGlobal({ code: 'uncatalogued_v3_template', detail: 'Staged v3 template is absent from the catalogue', template: key })
  }
  for (const key of catalogKeys) {
    if (!discovered.keys.includes(key)) addGlobal({ code: 'catalog_template_missing', detail: 'Catalogue v3 template directory is absent or malformed', template: key })
  }

  const results = await mapConcurrent(entries, workers, (entry) => (
    verifyTemplate(root, entry, maxDiagnostics, catalogLocator)
  ))
  for (const result of results) {
    globalDiagnosticCount += result.diagnosticCount
    for (const diagnostic of result.diagnostics) {
      if (globalDiagnostics.length >= maxDiagnostics) break
      globalDiagnostics.push(diagnostic)
    }
  }
  const totals = results.reduce((sum, result) => ({
    pages: sum.pages + result.pages,
    stylesheets: sum.stylesheets + result.stylesheets,
    contentEntries: sum.contentEntries + result.contentEntries,
    imageSlots: sum.imageSlots + result.imageSlots,
    themeTokens: sum.themeTokens + result.themeTokens,
  }), { pages: 0, stylesheets: 0, contentEntries: 0, imageSlots: 0, themeTokens: 0 })
  return {
    pass: globalDiagnosticCount === 0,
    root,
    catalogTemplates: catalog.templates.length,
    scannedTemplates: results.length,
    ...totals,
    diagnosticCount: globalDiagnosticCount,
    diagnostics: globalDiagnostics,
    diagnosticsTruncated: Math.max(0, globalDiagnosticCount - globalDiagnostics.length),
  }
}
