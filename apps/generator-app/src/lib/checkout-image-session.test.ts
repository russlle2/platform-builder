import { describe, expect, it } from 'vitest'
import {
  classifyDraftCustomerImageUrl,
  validateCheckoutImageSession,
} from './checkout-image-session'

const OWNER_A = 'draft-123e4567-e89b-42d3-a456-426614174000'
const OWNER_B = 'draft-123e4567-e89b-42d3-b456-426614174001'

function swaps(...updated: string[]) {
  return {
    'index.html': updated.map((url, index) => ({
      original: `/assets/image-${index}.jpg`,
      updated: url,
    })),
  }
}

describe('checkout image session validation', () => {
  it('binds one draft owner to the signed cookie capability', () => {
    const result = validateCheckoutImageSession(
      swaps(
        `https://project.supabase.co/storage/v1/object/public/customer-images/${OWNER_A}/hero.webp`,
        `/uploads/${OWNER_A}/about.webp`,
      ),
      OWNER_A,
    )

    expect(result).toEqual({
      ok: true,
      imageOwner: OWNER_A,
      draftImageUrls: [
        `https://project.supabase.co/storage/v1/object/public/customer-images/${OWNER_A}/hero.webp`,
        `/uploads/${OWNER_A}/about.webp`,
      ],
    })
  })

  it('rejects stale draft references when the signed cookie is absent', () => {
    const result = validateCheckoutImageSession(
      swaps(`/uploads/${OWNER_A}/hero.webp`),
      null,
    )

    expect(result).toMatchObject({
      ok: false,
      code: 'image_upload_session_expired',
    })
  })

  it('rejects mixed draft owners before checkout', () => {
    const result = validateCheckoutImageSession(
      swaps(`/uploads/${OWNER_A}/hero.webp`, `/uploads/${OWNER_B}/about.webp`),
      OWNER_A,
    )

    expect(result).toMatchObject({
      ok: false,
      code: 'image_upload_session_mismatch',
    })
  })

  it('rejects a valid but different signed owner', () => {
    const result = validateCheckoutImageSession(
      swaps(`/uploads/${OWNER_A}/hero.webp`),
      OWNER_B,
    )

    expect(result).toMatchObject({
      ok: false,
      code: 'image_upload_session_mismatch',
    })
  })

  it('rejects legacy or malformed draft owner paths instead of deferring failure', () => {
    const result = validateCheckoutImageSession(
      swaps('/uploads/draft-legacy-owner/hero.webp'),
      OWNER_A,
    )

    expect(result).toMatchObject({
      ok: false,
      code: 'image_upload_reference_invalid',
    })
  })

  it('does not classify unrelated remote draft-like paths as customer storage', () => {
    expect(classifyDraftCustomerImageUrl(`https://example.com/media/${OWNER_A}/hero.webp`))
      .toEqual({ kind: 'none' })
    expect(validateCheckoutImageSession(
      swaps(`https://example.com/media/${OWNER_A}/hero.webp`),
      null,
    )).toEqual({ ok: true, imageOwner: '', draftImageUrls: [] })
  })
})
