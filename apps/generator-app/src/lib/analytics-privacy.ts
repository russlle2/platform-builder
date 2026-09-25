export const BOOKING_KIT_ACCESS_STORAGE_KEY = 'dailyclarity_booking_kit_access'

export function isBookingKitPath(pathname: string | null): boolean {
  return pathname === '/booking-kit' || !!pathname?.startsWith('/booking-kit/')
}

/** A kit credential stays usable in the tab without allowing third-party trackers alongside it. */
export function canLoadPageAnalytics(pathname: string | null, storage: Pick<Storage, 'getItem'>): boolean {
  if (!pathname || isBookingKitPath(pathname)) return false
  try { return !storage.getItem(BOOKING_KIT_ACCESS_STORAGE_KEY) } catch { return false }
}

export function canLoadBrowserAnalytics(pathname: string | null): boolean {
  if (typeof window === 'undefined') return false
  try { return canLoadPageAnalytics(pathname, window.sessionStorage) } catch { return false }
}
