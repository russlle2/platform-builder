import type { ImageSwapMap } from './image-swaps'
import { isDraftImageOwner } from './image-owner'

const CUSTOMER_IMAGE_PARENT_SEGMENTS = new Set(['customer-images', 'uploads'])

export type CheckoutImageSessionResult =
  | {
      ok: true
      imageOwner: string
      draftImageUrls: string[]
    }
  | {
      ok: false
      code:
        | 'image_upload_reference_invalid'
        | 'image_upload_session_expired'
        | 'image_upload_session_mismatch'
      error: string
    }

type DraftReference =
  | { kind: 'none' }
  | { kind: 'invalid' }
  | { kind: 'draft'; owner: string }

/**
 * Classify only URLs emitted by our customer-image storage layouts. An
 * unrelated remote URL containing a `draft-*` path segment must not trigger
 * storage migration.
 */
export function classifyDraftCustomerImageUrl(value: string): DraftReference {
  let pathname: string
  try {
    pathname = new URL(value, 'https://local.invalid').pathname
  } catch {
    return { kind: 'none' }
  }

  const segments = pathname.split('/').filter(Boolean)
  for (let index = 1; index < segments.length; index += 1) {
    if (!CUSTOMER_IMAGE_PARENT_SEGMENTS.has(segments[index - 1].toLowerCase())) continue
    const candidate = segments[index].toLowerCase()
    if (!candidate.startsWith('draft-')) continue
    return isDraftImageOwner(candidate)
      ? { kind: 'draft', owner: candidate }
      : { kind: 'invalid' }
  }
  return { kind: 'none' }
}

/** Extract the exact draft URLs from a sanitized checkout image-swap map. */
export function getDraftCustomerImageUrls(imageSwaps: ImageSwapMap): string[] {
  return Object.values(imageSwaps)
    .flatMap((swaps) => swaps.map((swap) => swap.updated))
    .filter((url) => classifyDraftCustomerImageUrl(url).kind === 'draft')
}

/**
 * Bind draft references to the signed upload capability before creating a
 * paid Stripe Checkout Session. The request body owner is deliberately not
 * trusted: the signed cookie and the URLs must agree with each other.
 */
export function validateCheckoutImageSession(
  imageSwaps: ImageSwapMap,
  signedImageOwner: string | null,
): CheckoutImageSessionResult {
  const draftImageUrls: string[] = []
  const owners = new Set<string>()

  for (const swap of Object.values(imageSwaps).flat()) {
    const reference = classifyDraftCustomerImageUrl(swap.updated)
    if (reference.kind === 'invalid') {
      return {
        ok: false,
        code: 'image_upload_reference_invalid',
        error: 'A saved image reference is no longer valid. Return to your preview and re-upload the affected image before checkout.',
      }
    }
    if (reference.kind === 'draft') {
      owners.add(reference.owner)
      draftImageUrls.push(swap.updated)
    }
  }

  if (owners.size === 0) {
    return { ok: true, imageOwner: '', draftImageUrls: [] }
  }
  if (owners.size > 1) {
    return {
      ok: false,
      code: 'image_upload_session_mismatch',
      error: 'Your saved images came from different editing sessions. Return to your preview and re-upload the affected images before checkout.',
    }
  }
  if (!signedImageOwner) {
    return {
      ok: false,
      code: 'image_upload_session_expired',
      error: 'Your secure image upload session has expired. Return to your preview and re-upload the affected images before checkout.',
    }
  }

  const [referencedOwner] = owners
  if (referencedOwner !== signedImageOwner) {
    return {
      ok: false,
      code: 'image_upload_session_mismatch',
      error: 'Your saved images are not linked to this secure editing session. Return to your preview and re-upload the affected images before checkout.',
    }
  }

  return { ok: true, imageOwner: signedImageOwner, draftImageUrls }
}
