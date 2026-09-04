const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[\d\s().+\-]{7,20}$/

export function normalizeLeadInput(email: string, phone: string) {
  return {
    email: email.trim(),
    phone: phone.trim(),
  }
}

export function validateLeadContact(email: string, phone: string): string | null {
  if (!email && !phone) {
    return 'Enter an email or phone number.'
  }
  if (email && (email.length > 320 || !EMAIL_RE.test(email))) {
    return 'Enter a valid email address.'
  }
  if (phone && !PHONE_RE.test(phone)) {
    return 'Enter a valid phone number.'
  }
  if (phone) {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 7) {
      return 'Phone number looks too short.'
    }
  }
  return null
}
