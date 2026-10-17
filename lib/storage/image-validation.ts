/**
 * Helper validasi gambar & magic bytes untuk upload avatar profil
 */

export interface ImageValidationResult {
  valid: boolean
  error?: string
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp'
  extension?: 'jpg' | 'png' | 'webp'
}

export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export function validateImageBuffer(input: Buffer | Uint8Array): ImageValidationResult {
  if (!input || input.length === 0) {
    return { valid: false, error: 'File gambar kosong atau tidak terbaca' }
  }

  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input)

  if (buffer.length > MAX_AVATAR_SIZE_BYTES) {
    return {
      valid: false,
      error: `Ukuran file melebihi batas maksimum 5 MB (ukuran saat ini: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`,
    }
  }

  // Check magic bytes
  // 1. JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, mimeType: 'image/jpeg', extension: 'jpg' }
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, mimeType: 'image/png', extension: 'png' }
  }

  // 3. WebP: RIFF (bytes 0-3: 52 49 46 46) and WEBP (bytes 8-11: 57 45 42 50)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, mimeType: 'image/webp', extension: 'webp' }
  }

  return {
    valid: false,
    error: 'Format file tidak didukung atau berkas rusak. Gunakan format JPG, JPEG, PNG, atau WebP yang valid.',
  }
}
