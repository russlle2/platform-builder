import { describe, expect, it } from 'vitest'
import { composeBookingKit } from './booking-kit-content'
import { bookingKitPreviewTransfer, clearReplacedPreviewCustomizations, hasPopulatedPreview, hasSavedPreviewCustomizations } from './booking-kit-preview'
import type { BusinessInfo } from '@/store/previewStore'

const empty: BusinessInfo = { businessName: '', ownerName: '', email: '', phone: '', address: '', niche: '', tagline: '', description: '', services: '', website: '' }
const kit = composeBookingKit({ niche: 'sound_bath', service: 'Evening sound bath', audience: 'adults', format: 'In-person group', duration: '60 minutes', pricingChoice: 'quote', bookingMethod: 'Email hello@example.com' })

describe('explicit booking kit preview transfer', () => {
  it('does not overwrite any populated draft without confirmation', () => {
    for (const key of ['businessName', 'email', 'description', 'services'] as const) {
      const previous = { ...empty, [key]: 'Existing value' }
      expect(bookingKitPreviewTransfer(kit, previous)).toBeNull()
      expect(previous[key]).toBe('Existing value')
    }
  })
  it('allows a selected transfer into an empty draft and preserves contact fields on confirmed replacement', () => {
    expect(hasPopulatedPreview(empty)).toBe(false)
    expect(hasPopulatedPreview({ ...empty, niche: 'aromatherapy' })).toBe(false)
    expect(bookingKitPreviewTransfer(kit, empty)?.tagline).toBe(kit.headline)
    const result = bookingKitPreviewTransfer(kit, { ...empty, businessName: 'Old Name', email: 'me@example.com', phone: '555-0100' }, true)
    expect(result).toMatchObject({ email: 'me@example.com', phone: '555-0100', niche: 'sound_bath', businessName: '', services: 'Evening sound bath' })
    expect(result?.description).toContain('Email hello@example.com')
    expect(result).not.toHaveProperty('faqs')
  })
  it('finds saved customizations even when the facts are empty and clears replaced content without deleting private kit access', () => {
    const saved = new Map([
      ['pb_inline_edits_by_scope_v1', '{"old-template":{"index.html":[{"updated":"Old brand"}]}}'],
      ['pb_image_swaps', '{"old.jpg":"new.jpg"}'], ['pb_custom_theme', '{"color":"red"}'],
      ['pb_checkout_context', '{"slug":"old"}'], ['pb_catalog_revision', 'old-revision'],
      ['dailyclarity_booking_kit_access', 'private-token'], ['pb_image_owner', 'library-owner'],
    ])
    const storage = { getItem: (key: string) => saved.get(key) || null, removeItem: (key: string) => { saved.delete(key) } }
    expect(hasSavedPreviewCustomizations(storage)).toBe(true)
    clearReplacedPreviewCustomizations(storage)
    expect(hasSavedPreviewCustomizations(storage)).toBe(false)
    expect([...saved.keys()]).toEqual(['dailyclarity_booking_kit_access', 'pb_image_owner'])
  })
})
