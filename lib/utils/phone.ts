/**
 * Utility functions for Indonesian phone number handling
 */

export function normalizeIndonesianPhone(phone: string): string {
  if (!phone) return ''
  
  // Remove spaces, hyphens, parentheses, and dots
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '')

  // If starts with 08..., convert to +628...
  if (cleaned.startsWith('08')) {
    cleaned = '+62' + cleaned.substring(1)
  }
  // If starts with 628... without +, add +
  else if (cleaned.startsWith('628')) {
    cleaned = '+' + cleaned
  }
  // If starts with 8... without 0 or 62
  else if (cleaned.startsWith('8')) {
    cleaned = '+62' + cleaned
  }

  return cleaned
}

export function isValidIndonesianPhone(phone: string): boolean {
  const normalized = normalizeIndonesianPhone(phone)
  // E.164 Indonesian phone format: starts with +628 and has 9 to 13 digits after 62
  const idPhoneRegex = /^\+628[1-9][0-9]{7,11}$/
  return idPhoneRegex.test(normalized)
}

export function formatIndonesianPhone(phone: string): string {
  const normalized = normalizeIndonesianPhone(phone)
  if (!isValidIndonesianPhone(normalized)) return phone

  // Format: +62 812-3456-7890
  const localPart = normalized.substring(3) // starts with 8...
  const p1 = localPart.substring(0, 3)
  const p2 = localPart.substring(3, 7)
  const p3 = localPart.substring(7)

  return `+62 ${p1}-${p2}${p3 ? '-' + p3 : ''}`
}
