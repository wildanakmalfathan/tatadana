/**
 * Timezone and Date utilities with Asia/Jakarta (WIB) standardization
 */

export const TIMEZONE_WIB = 'Asia/Jakarta'

export function getWIBDate(date: Date = new Date()): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE_WIB }))
}

export function formatWIBDateString(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TIMEZONE_WIB,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

export function formatWIBTimeString(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const timeStr = new Intl.DateTimeFormat('id-ID', {
    timeZone: TIMEZONE_WIB,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
  return `${timeStr} WIB`
}

export function formatWIBFullDateTime(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const dayName = new Intl.DateTimeFormat('id-ID', { timeZone: TIMEZONE_WIB, weekday: 'long' }).format(d)
  const dateNum = new Intl.DateTimeFormat('id-ID', { timeZone: TIMEZONE_WIB, day: 'numeric', month: 'short', year: 'numeric' }).format(d)
  const timeStr = new Intl.DateTimeFormat('id-ID', { timeZone: TIMEZONE_WIB, hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
  return `${dayName}, ${dateNum} — ${timeStr} WIB`
}

export function getISODateWIB(date: Date = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_WIB,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
  return parts // Returns YYYY-MM-DD
}
