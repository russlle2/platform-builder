import { describe, expect, it } from 'vitest'
import { stripeIntegrationIdentifier } from './stripe-client'

describe('Stripe integration identifiers', () => {
  it('uses a stable eight-letter suffix for an idempotent checkout intent', () => {
    const first = stripeIntegrationIdentifier('dailyclarity-template', '3fb88255-5f33-4871-aacf-70732dbb02e0')
    const retry = stripeIntegrationIdentifier('dailyclarity-template', '3fb88255-5f33-4871-aacf-70732dbb02e0')
    expect(first).toBe(retry)
    expect(first).toMatch(/^dailyclarity-template-[a-z]{8}$/)
  })

  it('separates distinct checkout intents and flow labels', () => {
    expect(stripeIntegrationIdentifier('dailyclarity-template', 'intent-a'))
      .not.toBe(stripeIntegrationIdentifier('dailyclarity-template', 'intent-b'))
    expect(stripeIntegrationIdentifier('DailyClarity Custom Build', 'intent-a'))
      .toMatch(/^dailyclarity-custom-build-[a-z]{8}$/)
  })
})
