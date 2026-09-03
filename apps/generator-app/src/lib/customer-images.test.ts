import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const storageMocks = vi.hoisted(() => ({
  list: vi.fn(),
  download: vi.fn(),
  upload: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => storageMocks),
    },
  })),
}))

import {
  getCustomerImageRelativePath,
  migrateImagesToSiteSlug,
  normalizeOwnedStoragePath,
} from './customer-images'

const DRAFT_OWNER = 'draft-123e4567-e89b-42d3-a456-426614174000'
const SITE_SLUG = 'example-site'
const SOURCE_URL = `https://project.supabase.co/storage/v1/object/public/customer-images/${DRAFT_OWNER}/hero.webp`

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key'
  storageMocks.list.mockResolvedValue({ data: [], error: null })
  storageMocks.upload.mockResolvedValue({ data: {}, error: null })
})

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
})

describe('normalizeOwnedStoragePath', () => {
  it('accepts an exact owner prefix or a filename', () => {
    expect(normalizeOwnedStoragePath('site-one', 'site-one/photo.webp')).toBe(
      'site-one/photo.webp',
    )
    expect(normalizeOwnedStoragePath('site-one', 'photo.webp')).toBe('site-one/photo.webp')
  })

  it('rejects prefix confusion and traversal', () => {
    expect(() => normalizeOwnedStoragePath('site-one', 'site-one-attacker/photo.webp')).toThrow()
    expect(() => normalizeOwnedStoragePath('site-one', 'site-one/../victim/photo.webp')).toThrow()
  })
})

describe('getCustomerImageRelativePath', () => {
  it('extracts only paths beneath the exact generated owner prefix', () => {
    expect(getCustomerImageRelativePath(DRAFT_OWNER, SOURCE_URL)).toBe('hero.webp')
    expect(getCustomerImageRelativePath(DRAFT_OWNER, `/uploads/${DRAFT_OWNER}/nested/photo.webp`))
      .toBe('nested/photo.webp')
    expect(getCustomerImageRelativePath(DRAFT_OWNER, `https://example.com/media/${DRAFT_OWNER}/hero.webp`))
      .toBeNull()
    expect(getCustomerImageRelativePath(DRAFT_OWNER, `/uploads/${DRAFT_OWNER}/../victim.webp`))
      .toBeNull()
  })
})

describe('migrateImagesToSiteSlug', () => {
  it('retains the draft source and idempotently overwrites the exact destination', async () => {
    storageMocks.download.mockResolvedValue({
      data: new Blob(['image'], { type: 'image/webp' }),
      error: null,
    })

    await expect(migrateImagesToSiteSlug(DRAFT_OWNER, SITE_SLUG, [SOURCE_URL]))
      .resolves.toBe(1)
    await expect(migrateImagesToSiteSlug(DRAFT_OWNER, SITE_SLUG, [SOURCE_URL]))
      .resolves.toBe(1)

    expect(storageMocks.upload).toHaveBeenCalledTimes(2)
    expect(storageMocks.upload).toHaveBeenNthCalledWith(
      1,
      `${SITE_SLUG}/hero.webp`,
      expect.any(Buffer),
      expect.objectContaining({ upsert: true }),
    )
    expect(storageMocks.download).toHaveBeenNthCalledWith(1, `${DRAFT_OWNER}/hero.webp`)
    expect(storageMocks.download).toHaveBeenNthCalledWith(2, `${DRAFT_OWNER}/hero.webp`)
  })

  it('recovers a retry from the durable destination if the draft source disappeared', async () => {
    storageMocks.download
      .mockResolvedValueOnce({
        data: new Blob(['image'], { type: 'image/webp' }),
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: { message: 'source not found' } })
      .mockResolvedValueOnce({
        data: new Blob(['already copied'], { type: 'image/webp' }),
        error: null,
      })

    await expect(migrateImagesToSiteSlug(DRAFT_OWNER, SITE_SLUG, [SOURCE_URL]))
      .resolves.toBe(1)
    await expect(migrateImagesToSiteSlug(DRAFT_OWNER, SITE_SLUG, [SOURCE_URL]))
      .resolves.toBe(1)

    expect(storageMocks.upload).toHaveBeenCalledTimes(1)
    expect(storageMocks.download).toHaveBeenLastCalledWith(`${SITE_SLUG}/hero.webp`)
  })

  it('fails when neither the exact source nor a prior destination exists', async () => {
    storageMocks.download.mockResolvedValue({ data: null, error: { message: 'not found' } })

    await expect(migrateImagesToSiteSlug(DRAFT_OWNER, SITE_SLUG, [SOURCE_URL]))
      .rejects.toThrow('Unable to recover draft image hero.webp')
    expect(storageMocks.upload).not.toHaveBeenCalled()
  })

  it('rejects untrusted owners and unrelated reference URLs', async () => {
    await expect(migrateImagesToSiteSlug('draft-not-a-uuid', SITE_SLUG, [SOURCE_URL]))
      .rejects.toThrow('Invalid draft image owner')
    await expect(migrateImagesToSiteSlug(
      DRAFT_OWNER,
      SITE_SLUG,
      [`https://example.com/media/${DRAFT_OWNER}/hero.webp`],
    )).rejects.toThrow('referenced draft image URL is invalid')
  })
})
