import {
  snapshotCatalogRevision,
  type CatalogRevisionPin,
  type CatalogRevisionSource,
} from './catalog-revision'
import { sanitizeCustomTheme, type CustomTheme } from './custom-theme'
import { sanitizeImageSwapMap, type ImageSwapMap } from './image-swaps'
import { sanitizeStoredInlineEditMap, type InlineEditMap } from './inline-edits'
import { sanitizeCustomerValues } from './site-deploy'
import {
  getColorScheme,
  getFontVariation,
  getStructureVariation,
} from './templates/variations'

export interface PersistedTemplateCustomization {
  template: string
  niche: string
  colorScheme: string
  fontVariation: string
  structureVariation: string
  customTheme: CustomTheme | null
  customerValues: Record<string, string>
  inlineEdits: InlineEditMap
  imageSwaps: ImageSwapMap
  imageOwner: string
  catalogRevision?: CatalogRevisionPin
}

export interface CustomerSiteData {
  niche?: string
  template?: string
  colorScheme?: string
  fontVariation?: string
  structureVariation?: string
  customTheme?: CustomTheme | null
  catalogRevision?: CatalogRevisionPin
  customerValues?: Record<string, string>
  inlineEdits?: InlineEditMap
  imageSwaps?: ImageSwapMap
  imageOwner?: string
  [key: string]: unknown
}

/** Build the exact durable customization payload captured at checkout. */
export function buildCheckoutTemplateState(input: {
  template: string
  niche: string
  templateRevision: CatalogRevisionSource
  colorScheme?: unknown
  fontVariation?: unknown
  structureVariation?: unknown
  customTheme?: unknown
  customerValues?: unknown
  inlineEdits?: unknown
  imageSwaps?: unknown
  imageOwner: string
}): PersistedTemplateCustomization {
  const catalogRevision = snapshotCatalogRevision(input.templateRevision)
  return {
    template: input.template,
    niche: input.niche,
    colorScheme: typeof input.colorScheme === 'string' ? input.colorScheme : 'original',
    fontVariation: typeof input.fontVariation === 'string' ? input.fontVariation : 'original',
    structureVariation: typeof input.structureVariation === 'string' ? input.structureVariation : 'original',
    customTheme: sanitizeCustomTheme(input.customTheme),
    customerValues: sanitizeCustomerValues(input.customerValues),
    inlineEdits: sanitizeStoredInlineEditMap(input.inlineEdits),
    imageSwaps: sanitizeImageSwapMap(input.imageSwaps),
    imageOwner: input.imageOwner,
    ...(catalogRevision ? { catalogRevision } : {}),
  }
}

export type PortalCustomizationUpdate =
  | {
      ok: true
      customerValues: Record<string, string>
      dataPatch: Partial<CustomerSiteData>
    }
  | { ok: false; error: string }

/** Sanitize the partial persistence payload accepted by the customer portal. */
export function preparePortalCustomizationUpdate(
  value: unknown,
  imageOwner: string,
): PortalCustomizationUpdate {
  const body = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  const customTheme = body.customTheme === undefined
    ? undefined
    : body.customTheme === null
      ? null
      : sanitizeCustomTheme(body.customTheme)
  if (body.customTheme !== undefined && body.customTheme !== null && !customTheme) {
    return { ok: false, error: 'Custom theme settings are invalid.' }
  }

  return {
    ok: true,
    customerValues: sanitizeCustomerValues(body.customerValues),
    dataPatch: {
      ...(body.inlineEdits !== undefined
        ? { inlineEdits: sanitizeStoredInlineEditMap(body.inlineEdits) }
        : {}),
      ...(body.imageSwaps !== undefined
        ? { imageSwaps: sanitizeImageSwapMap(body.imageSwaps) }
        : {}),
      ...(typeof body.colorScheme === 'string'
        ? { colorScheme: getColorScheme(body.colorScheme).id }
        : {}),
      ...(typeof body.fontVariation === 'string'
        ? { fontVariation: getFontVariation(body.fontVariation).id }
        : {}),
      ...(typeof body.structureVariation === 'string'
        ? { structureVariation: getStructureVariation(body.structureVariation).id }
        : {}),
      ...(customTheme !== undefined ? { customTheme } : {}),
      imageOwner,
    },
  }
}

/** Mirror the non-destructive merge performed by portal storage/RPC. */
export function mergePortalSiteData(
  previous: CustomerSiteData,
  update: Extract<PortalCustomizationUpdate, { ok: true }>,
): CustomerSiteData {
  return {
    ...previous,
    customerValues: {
      ...(previous.customerValues || {}),
      ...update.customerValues,
    },
    ...update.dataPatch,
  }
}
