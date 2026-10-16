import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BusinessInfo } from './previewStore'

const real: BusinessInfo = {
  businessName: 'My Real Practice', niche: 'wellness_coach', ownerName: 'Morgan',
  accountEmail: 'private@example.com', email: 'hello@example.com', phone: '', address: '', tagline: 'Real tagline', description: '', services: '', website: '',
}
const sample: BusinessInfo = { ...real, businessName: 'Fictional Studio', niche: 'aromatherapy', accountEmail: '', email: 'sample@example.com' }
const realMatch = { nicheSlug: 'wellness_coach', templateSlug: 'real-layout', templateName: 'My Layout', matchScore: 50, reason: 'match' }

let storage: Map<string, string>

beforeEach(() => {
  vi.resetModules()
  storage = new Map()
  vi.stubGlobal('window', {})
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  })
})

afterEach(() => vi.unstubAllGlobals())

describe('preview draft lifecycle', () => {
  it('migrates only legacy shared email drafts without adding private identity to template values', async () => {
    const { accountEmail: _oldAccount, ...legacy } = real
    storage.set('pb_biz_info', JSON.stringify(legacy))
    const { usePreviewStore: store } = await import('./previewStore')
    expect(store.getState().businessInfo).toEqual({ ...legacy, accountEmail: legacy.email })
    store.getState().setBusinessInfo({ accountEmail: 'private@example.com' })
    const fields = store.getState().getFieldValues()
    expect(fields).toMatchObject({ EMAIL: legacy.email, email: legacy.email })
    expect(JSON.stringify(fields)).not.toContain('private@example.com')
    expect(fields).not.toHaveProperty('accountEmail')
    expect(JSON.parse(storage.get('pb_biz_info')!).accountEmail).toBe('private@example.com')
  })

  it.each(['', null, 123])('does not replace an explicitly invalid account email (%s) with the public address', async (accountEmail) => {
    storage.set('pb_biz_info', JSON.stringify({ ...real, accountEmail }))
    const { usePreviewStore: store } = await import('./previewStore')
    expect(store.getState().businessInfo.accountEmail).toBe('')
    expect(store.getState().businessInfo.email).toBe(real.email)
  })

  it('keeps all real draft data persisted while sample matching and edits remain transient', async () => {
    const { usePreviewStore: store, PREVIEW_SAMPLE_STORAGE_KEY } = await import('./previewStore')
    store.getState().setBusinessInfo(real)
    store.getState().setStylePreferences({ fontPreference: 'serif', vibes: ['clean'] })
    store.getState().setMatchedTemplate(realMatch)
    store.getState().markInfoSaved()
    const original = new Map(storage)

    store.getState().startSample(sample)
    store.getState().setBusinessInfo({ businessName: 'Sample changed' })
    store.getState().setStylePreferences({ fontPreference: 'mixed' })
    store.getState().setMatchedTemplate({ ...realMatch, nicheSlug: 'aromatherapy', templateSlug: 'sample-layout' })
    store.getState().markInfoSaved()
    expect(store.getState().isSample).toBe(true)
    expect(store.getState().getFieldValues().BUSINESS_NAME).toBe('Sample changed')
    expect(storage.get(PREVIEW_SAMPLE_STORAGE_KEY)).toBe('1')
    for (const [key, value] of original) expect(storage.get(key)).toBe(value)

    store.getState().endSample()
    expect(store.getState()).toMatchObject({ businessInfo: real, matchedTemplate: realMatch, isSample: false, infoSaved: true, step: 'info' })
    expect(store.getState().stylePreferences).toMatchObject({ fontPreference: 'serif', vibes: ['clean'] })
    expect(storage.has(PREVIEW_SAMPLE_STORAGE_KEY)).toBe(false)
  })

  it('restores the original draft after restarting the sample and after a module reload', async () => {
    const { usePreviewStore: store } = await import('./previewStore')
    store.getState().setBusinessInfo(real)
    store.getState().startSample(sample)
    store.getState().startSample({ ...sample, niche: 'sound_bath' })
    store.getState().endSample()
    expect(store.getState().businessInfo).toEqual(real)
    store.getState().startSample(sample)
    vi.resetModules()
    const { usePreviewStore: reloaded } = await import('./previewStore')
    expect(reloaded.getState().businessInfo).toEqual(real)
    expect(reloaded.getState().isSample).toBe(false)
  })

  it('clears checkout and preview customizations without clearing portal or image ownership', async () => {
    const { usePreviewStore: store } = await import('./previewStore')
    store.getState().setBusinessInfo(real)
    storage.set('pb_template_values', '{"BUSINESS_NAME":"My Real Practice"}')
    storage.set('pb_custom_theme', '{"primary":"#ffffff"}')
    storage.set('pb_image_owner', 'owner-secret')
    storage.set('booking_kit_draft', 'keep-me')
    for (const key of ['pb_inline_edits_by_scope_v1', 'pb_image_swaps_by_scope_v1']) {
      storage.set(key, JSON.stringify({ 'template:wellness_coach:real-layout': { old: true }, 'portal:published:wellness_coach:real-layout': { keep: true } }))
    }
    store.getState().reset()
    expect(store.getState().businessInfo.businessName).toBe('')
    expect(storage.has('pb_template_values')).toBe(false)
    expect(storage.has('pb_custom_theme')).toBe(false)
    expect(storage.get('pb_image_owner')).toBe('owner-secret')
    expect(storage.get('booking_kit_draft')).toBe('keep-me')
    for (const key of ['pb_inline_edits_by_scope_v1', 'pb_image_swaps_by_scope_v1']) {
      expect(JSON.parse(storage.get(key)!)).toEqual({ 'portal:published:wellness_coach:real-layout': { keep: true } })
    }
  })

  it('recovers usable defaults from malformed or obsolete browser data', async () => {
    storage.set('pb_biz_info', JSON.stringify({ businessName: 'Recovered Practice', email: null, niche: 'retired_niche' }))
    storage.set('pb_style_prefs', JSON.stringify({ vibes: ['invalid', 'warm'], fontPreference: 'broken', colorMood: null }))
    storage.set('pb_matched', JSON.stringify({ templateSlug: '../../bad' }))
    const { usePreviewStore: store } = await import('./previewStore')
    expect(store.getState().businessInfo).toMatchObject({ businessName: 'Recovered Practice', email: '', niche: '', description: '' })
    expect(store.getState().stylePreferences).toMatchObject({ vibes: ['warm'], fontPreference: 'sans-serif', colorMood: 'cool-modern' })
    expect(store.getState().matchedTemplate).toBeNull()
  })

  it('keeps sample recovery and resetting usable when browser storage is disabled', async () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => { throw new Error('disabled') },
      setItem: () => { throw new Error('disabled') },
      removeItem: () => { throw new Error('disabled') },
    })
    const { usePreviewStore: store } = await import('./previewStore')
    store.getState().setBusinessInfo(real)
    store.getState().startSample(sample)
    store.getState().endSample()
    expect(store.getState().businessInfo).toEqual(real)
    expect(() => store.getState().reset()).not.toThrow()
  })
})
