import { describe, it, expect } from 'vitest'
import path from 'path'
import os from 'os'

// Simulate the validation logic from customer-images.ts
// Uses the same pattern: resolve to absolute, then check prefix.
function validateDeletePath(uploadRoot: string, filename: string): void {
  const candidate = path.resolve(uploadRoot, filename)
  if (!candidate.startsWith(uploadRoot + path.sep)) {
    throw new Error('Invalid storage path')
  }
}

describe('path traversal prevention', () => {
  // Use a real absolute path that works cross-platform
  const uploadRoot = path.join(os.tmpdir(), 'uploads', 'owner123')

  it('allows valid filename', () => {
    expect(() => validateDeletePath(uploadRoot, 'photo.jpg')).not.toThrow()
  })

  it('rejects ../traversal', () => {
    expect(() => validateDeletePath(uploadRoot, '../other-owner/secret.jpg')).toThrow('Invalid storage path')
  })

  it('rejects path escape to parent', () => {
    expect(() => validateDeletePath(uploadRoot, '..')).toThrow('Invalid storage path')
  })

  it('rejects nested traversal', () => {
    expect(() => validateDeletePath(uploadRoot, 'subdir' + path.sep + '..' + path.sep + '..' + path.sep + 'other')).toThrow('Invalid storage path')
  })

  it('allows another valid filename', () => {
    expect(() => validateDeletePath(uploadRoot, 'valid-image.webp')).not.toThrow()
  })
})
