/** Browser-only helpers for persisting portal access tokens per slug. */

export function portalTokenStorageKey(slug: string): string {
  return `pb_portal_token:${slug}`
}

export function getStoredPortalToken(slug: string): string | null {
  if (typeof window === 'undefined' || !slug) return null
  try {
    return sessionStorage.getItem(portalTokenStorageKey(slug))
  } catch {
    return null
  }
}

export function storePortalToken(slug: string, token: string): void {
  if (typeof window === 'undefined' || !slug || !token) return
  try {
    sessionStorage.setItem(portalTokenStorageKey(slug), token)
  } catch {
    /* quota */
  }
}

export function clearStoredPortalToken(slug: string): void {
  if (typeof window === 'undefined' || !slug) return
  try {
    sessionStorage.removeItem(portalTokenStorageKey(slug))
  } catch {
    /* ignore */
  }
}
