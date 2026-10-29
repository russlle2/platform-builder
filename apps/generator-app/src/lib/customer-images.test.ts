import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const storageMocks = vi.hoisted(() => ({
  list: vi.fn(),
  download: vi.fn(),
  upload: vi.fn(),
  rpc: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: storageMocks.rpc,
    storage: {
      from: vi.fn(() => storageMocks),
    },
  })),
}))

import {
  getCustomerImageRelativePath,
  migrateImagesToSiteSlug,
  normalizeOwnedStoragePath,
  rewriteImageSwapUrls,
  storeCustomerImage,
  deleteCustomerImage,
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
  storageMocks.remove.mockResolvedValue({ data: [], error: null })
  storageMocks.rpc.mockImplementation(async (name: string) => ({ error: null, data:
    name === 'customer_service_entitlement' ? { allowed: true, tier: 'paid' }
      : name === 'reserve_customer_image' ? { state: 'reserved' } : true,
  }))
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

describe('rewriteImageSwapUrls', () => {
  it('rewrites only the uploaded URL while preserving its stable slot ID', () => {
    expect(rewriteImageSwapUrls({
      'index.html': [{
        slotId: 'dc-image-index-0002',
        updated: SOURCE_URL,
      }],
    }, DRAFT_OWNER, SITE_SLUG)).toEqual({
      'index.html': [{
        slotId: 'dc-image-index-0002',
        updated: SOURCE_URL.replace(`/${DRAFT_OWNER}/`, `/${SITE_SLUG}/`),
      }],
    })
  })
})


describe('image upload allowance boundaries', () => {
  async function file() {
    const buffer = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#ffffff' } }).png().toBuffer()
    return { name: 'photo.png', size: buffer.length, type: 'image/png', arrayBuffer: vi.fn().mockResolvedValue(buffer) } as unknown as File
  }
  it('rejects inactive billing before reading or processing the upload', async () => {
    const input = await file()
    storageMocks.rpc.mockResolvedValue({ data: { allowed: false }, error: null })
    await expect(storeCustomerImage(SITE_SLUG, input)).rejects.toMatchObject({ code: 'billing_suspended' })
    expect(input.arrayBuffer).not.toHaveBeenCalled()
    expect(storageMocks.upload).not.toHaveBeenCalled()
  })
  it('reserves actual optimized bytes before Storage and confirms only after success', async () => {
    const stored = await storeCustomerImage(SITE_SLUG, await file())
    expect(storageMocks.rpc.mock.calls.map(([name]) => name)).toEqual(['customer_service_entitlement', 'reserve_customer_image', 'confirm_customer_image'])
    expect(storageMocks.rpc).toHaveBeenCalledWith('reserve_customer_image', { p_owner: SITE_SLUG, p_path: stored.path, p_bytes: stored.size })
    expect(storageMocks.rpc.mock.invocationCallOrder[1]).toBeLessThan(storageMocks.upload.mock.invocationCallOrder[0])
    expect(storageMocks.upload.mock.invocationCallOrder[0]).toBeLessThan(storageMocks.rpc.mock.invocationCallOrder[2])
  })
  it('does not write an image when authoritative storage is full', async () => {
    storageMocks.rpc.mockImplementation(async (name: string) => ({ error: null, data:
      name === 'customer_service_entitlement' ? { allowed: true, tier: 'paid' } : { state: 'limited' },
    }))
    await expect(storeCustomerImage(SITE_SLUG, await file())).rejects.toMatchObject({ code: 'image_storage_limit' })
    expect(storageMocks.upload).not.toHaveBeenCalled()
  })
  it('keeps a reservation after uncertain upload failure', async () => {
    storageMocks.upload.mockResolvedValue({ data: null, error: { message: 'connection lost' } })
    await expect(storeCustomerImage(SITE_SLUG, await file())).rejects.toThrow('connection lost')
    expect(storageMocks.rpc.mock.calls.map(([name]) => name)).toEqual(['customer_service_entitlement', 'reserve_customer_image'])
  })
  it('allows explicit image deletion to free allowance only after Storage success', async () => {
    await deleteCustomerImage(SITE_SLUG, `${SITE_SLUG}/photo.webp`)
    expect(storageMocks.remove).toHaveBeenCalledWith([`${SITE_SLUG}/photo.webp`])
    expect(storageMocks.rpc).toHaveBeenCalledWith('release_deleted_customer_image', { p_owner: SITE_SLUG, p_path: `${SITE_SLUG}/photo.webp` })
    expect(storageMocks.remove.mock.invocationCallOrder[0]).toBeLessThan(storageMocks.rpc.mock.invocationCallOrder[0])
  })
})
