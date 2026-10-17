/**
 * Identity Normalization Utility for TataDana
 * 
 * Enforces:
 * 1. Normalized lowercase trimmed email
 * 2. E.164 normalized Indonesian mobile phone numbers (+628...)
 */

export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return ''
  return email.trim().toLowerCase()
}

export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email)
  if (!normalized) return false
  // Standard RFC 5322 compliant simple email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
  return emailRegex.test(normalized)
}

export function normalizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return ''

  // Strip all non-digit and non-plus characters
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '').trim()

  // Remove leading + for processing
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1)
  }

  // Indonesian country code handling:
  // Starts with 08... -> +628...
  if (cleaned.startsWith('08')) {
    cleaned = '628' + cleaned.substring(2)
  }
  // Starts with 8... (omitted leading 0 or 62) -> +628...
  else if (cleaned.startsWith('8')) {
    cleaned = '628' + cleaned.substring(1)
  }
  // Starts with 628... -> keep as is

  return '+' + cleaned
}

export function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone)
  // E.164 Indonesian phone format: starts with +628 and has 8 to 13 digits after +628
  // Total digits: +62 8XX XXXX XXXX (10 to 14 digits total)
  const idPhoneRegex = /^\+628[1-9][0-9]{7,11}$/
  return idPhoneRegex.test(normalized)
}

export function formatIndonesianPhone(phone: string): string {
  const normalized = normalizePhone(phone)
  if (!isValidPhone(normalized)) return phone

  // Format: +62 814-6093-2853
  const localPart = normalized.substring(3) // starts with 8...
  const p1 = localPart.substring(0, 3)
  const p2 = localPart.substring(3, 7)
  const p3 = localPart.substring(7)

  return `+62 ${p1}-${p2}${p3 ? '-' + p3 : ''}`
}
