import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sendAlert = vi.hoisted(() => vi.fn())
vi.mock('./email', () => ({ sendManualServiceAlert: sendAlert }))

import { ensureManualServiceTask, notifyManualServiceOwner } from './stripe-manual-service'

const purchase = {
  sessionId: 'cs_paid_managed', slug: 'managed-site', plan: 'security_ads',
  customerEmail: 'buyer@example.com', businessName: 'Customer Business', siteUrl: 'https://managed-site.example.com',
}

function database() {
  let stored: Record<string, unknown> | null = null
  let markerError: string | null = null
  const upsert = vi.fn(async (values: Record<string, unknown>) => {
    if (!stored) stored = { id: 'task-1', ...values }
    return { error: null }
  })
  const update = vi.fn((values: Record<string, unknown>) => {
    const filters = new Map<string, unknown>()
    const builder = {
      eq: vi.fn((column: string, value: unknown) => { filters.set(column, value); return builder }),
      select: vi.fn(() => builder),
      maybeSingle: async () => {
        if (markerError) return { data: null, error: { message: markerError } }
        if (filters.get('details') !== JSON.stringify(stored?.details)) return { data: null, error: null }
        stored = { ...stored, ...values }
        return { data: { id: 'task-1' }, error: null }
      },
    }
    return builder
  })
  const select = () => {
    const builder = { eq: vi.fn(() => builder), single: async () => ({ data: stored, error: null }) }
    return builder
  }
  return {
    db: { from: () => ({ upsert, update, select }) } as never,
    upsert, update,
    current: () => stored,
    failMarker: (message: string | null) => { markerError = message },
    editDetails: (patch: Record<string, unknown>) => {
      if (stored) stored = { ...stored, details: { ...(stored.details as Record<string, unknown>), ...patch } }
    },
  }
}

beforeEach(() => {
  sendAlert.mockReset().mockResolvedValue({ MessageID: 'postmark-accepted' })
  vi.stubEnv('PLATFORM_OWNER_EMAIL', 'operations@example.com')
})
afterEach(() => vi.unstubAllEnvs())

describe('managed-service operations alert recovery', () => {
  it('retries a failed alert for the existing paid task and durably marks acceptance', async () => {
    const { db, current, update, upsert } = database()
    const task = await ensureManualServiceTask(db, purchase)
    sendAlert.mockRejectedValueOnce(new Error('Postmark unavailable'))
    await expect(notifyManualServiceOwner(db, task, purchase)).rejects.toThrow('Postmark unavailable')
    expect(update).not.toHaveBeenCalled()
    expect(current()?.id).toBe('task-1')

    const retryTask = await ensureManualServiceTask(db, purchase)
    await notifyManualServiceOwner(db, retryTask, purchase)
    expect(retryTask.id).toBe(task.id)
    expect(sendAlert).toHaveBeenCalledTimes(2)
    expect(current()?.details).toMatchObject({
      stripe_session: 'cs_paid_managed', site_url: purchase.siteUrl,
      owner_alert_sent_at: expect.any(String),
    })
    expect(upsert).toHaveBeenCalledWith(expect.any(Object), {
      onConflict: 'stripe_session_id,task_type', ignoreDuplicates: true,
    })

    const delivered = await ensureManualServiceTask(db, purchase)
    await notifyManualServiceOwner(db, delivered, purchase)
    expect(sendAlert).toHaveBeenCalledTimes(2)
    expect(current()?.id).toBe('task-1')
  })

  it('does not silently complete a paid task without its configured operator inbox', async () => {
    const { db, update } = database()
    const task = await ensureManualServiceTask(db, purchase)
    vi.stubEnv('PLATFORM_OWNER_EMAIL', '')
    await expect(notifyManualServiceOwner(db, task, purchase)).rejects.toThrow('manual_service_owner_email_not_configured')
    expect(sendAlert).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('propagates a failed delivery marker so the durable worker can retry', async () => {
    const { db, failMarker, current } = database()
    const task = await ensureManualServiceTask(db, purchase)
    failMarker('database unavailable')
    await expect(notifyManualServiceOwner(db, task, purchase)).rejects.toThrow('manual_service_alert_marker')
    expect(current()?.details).not.toHaveProperty('owner_alert_sent_at')
    expect(sendAlert).toHaveBeenCalledOnce()
  })

  it('preserves concurrent operator notes when recording an accepted alert', async () => {
    const { db, editDetails, current } = database()
    const task = await ensureManualServiceTask(db, purchase)
    sendAlert.mockImplementationOnce(async () => { editDetails({ operator_note: 'Already contacted buyer' }) })
    await expect(notifyManualServiceOwner(db, task, purchase)).rejects.toThrow('manual_service_alert_marker')
    expect(current()?.details).toMatchObject({ operator_note: 'Already contacted buyer' })
    expect(current()?.details).not.toHaveProperty('owner_alert_sent_at')

    const retry = await ensureManualServiceTask(db, purchase)
    await notifyManualServiceOwner(db, retry, purchase)
    expect(current()?.details).toMatchObject({ operator_note: 'Already contacted buyer', owner_alert_sent_at: expect.any(String) })
  })
})
