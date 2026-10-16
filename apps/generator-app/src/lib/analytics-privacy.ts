export const BOOKING_KIT_ACCESS_STORAGE_KEY = 'dailyclarity_booking_kit_access'

export function isBookingKitPath(pathname: string | null): boolean {
  return pathname === '/booking-kit' || !!pathname?.startsWith('/booking-kit/')
}

/** Private delivery credentials and checkout references must stay away from trackers. */
export function canLoadPageAnalytics(pathname: string | null, storage: Pick<Storage, 'getItem'>): boolean {
  if (!pathname || isBookingKitPath(pathname) || pathname === '/paypal-test' || pathname === '/success' || pathname === '/success/') return false
  try { return !storage.getItem(BOOKING_KIT_ACCESS_STORAGE_KEY) } catch { return false }
}

export function canLoadBrowserAnalytics(pathname: string | null): boolean {
  if (typeof window === 'undefined') return false
  try { return canLoadPageAnalytics(pathname, window.sessionStorage) } catch { return false }
}
