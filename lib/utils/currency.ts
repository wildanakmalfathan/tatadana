/**
 * Indonesian Rupiah formatting utility
 */

export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount)
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded).replace(/\s+/g, '')
}

export function parseRupiahInput(value: string): number {
  if (!value) return 0
  const clean = value.replace(/[^0-9]/g, '')
  return parseInt(clean, 10) || 0
}
