import { describe, expect, it } from 'vitest'
import { shouldIndexDeployment } from './deployment-environment'

describe('deployment indexing policy', () => {
  it('keeps production/default deployments indexable', () => {
    expect(shouldIndexDeployment({})).toBe(true)
    expect(shouldIndexDeployment({ DAILYCLARITY_ENVIRONMENT: 'production' })).toBe(true)
  })

  it('blocks staging regardless of whitespace or case', () => {
    expect(shouldIndexDeployment({ DAILYCLARITY_ENVIRONMENT: 'staging' })).toBe(false)
    expect(shouldIndexDeployment({ DAILYCLARITY_ENVIRONMENT: ' StAgInG ' })).toBe(false)
  })
})
