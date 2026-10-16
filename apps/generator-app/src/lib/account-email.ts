/** Validate the private recipient used for account access and delivery. */
export function normalizeAccountEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  return email.length <= 320 && !/[<>,;]/.test(email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null
}

/** Keep reserved account fields out of otherwise arbitrary public tokens. */
export function omitAccountEmailFields(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).filter(([key]) => (
    key.replace(/_/g, '').toLowerCase() !== 'accountemail'
  )))
}
