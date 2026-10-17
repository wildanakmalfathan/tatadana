import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const AVATAR_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars')

function ensureDirExists() {
  if (!fs.existsSync(AVATAR_DIR)) {
    fs.mkdirSync(AVATAR_DIR, { recursive: true })
  }
}

function sanitizeUserId(userId: string): string {
  if (!userId || typeof userId !== 'string') {
    throw new Error('User ID tidak valid')
  }
  const sanitized = userId.replace(/[^a-zA-Z0-9_-]/g, '')
  if (!sanitized) {
    throw new Error('User ID tidak valid setelah sanitasi')
  }
  return sanitized
}

/**
 * Menyimpan buffer avatar ke disk secara persisten dan membersihkan foto lama user setelahnya (atomic)
 */
export async function saveUserAvatar(
  userId: string,
  buffer: Buffer,
  extension: 'jpg' | 'png' | 'webp'
): Promise<{ filename: string; urlPath: string }> {
  ensureDirExists()

  const safeUserId = sanitizeUserId(userId)

  // 1. Buat nama file unik dan aman
  const randomSuffix = crypto.randomBytes(4).toString('hex')
  const filename = `avatar-${safeUserId}-${Date.now()}-${randomSuffix}.${extension}`
  const targetPath = path.join(AVATAR_DIR, filename)

  // Pastikan targetPath tetap berada dalam AVATAR_DIR (mencegah path traversal)
  const resolvedTarget = path.resolve(targetPath)
  const resolvedDir = path.resolve(AVATAR_DIR)
  if (!resolvedTarget.startsWith(resolvedDir)) {
    throw new Error('Percobaan path traversal terdeteksi pada penyimpanan berkas avatar')
  }

  // 2. Tulis file baru ke disk terlebih dahulu (atomic commitment)
  fs.writeFileSync(targetPath, buffer)

  // 3. Hanya setelah penulisan berhasil, bersihkan berkas avatar lama user ini
  // Berkas baru (filename) akan dikecualikan dari proses pembersihan
  cleanOldUserAvatars(safeUserId, filename)

  const urlPath = `/uploads/avatars/${filename}`
  return { filename, urlPath }
}

/**
 * Menghapus foto avatar fisik milik user dari disk, dengan opsi mengecualikan file tertentu (preserveFilename)
 */
export function cleanOldUserAvatars(userId: string, preserveFilename?: string): number {
  ensureDirExists()
  let deletedCount = 0

  let safeUserId: string
  try {
    safeUserId = sanitizeUserId(userId)
  } catch {
    return 0
  }

  try {
    const files = fs.readdirSync(AVATAR_DIR)
    const prefix = `avatar-${safeUserId}-`

    for (const file of files) {
      if (file.startsWith(prefix)) {
        // Jangan hapus jika ini adalah file baru yang sedang aktif
        if (preserveFilename && file === preserveFilename) {
          continue
        }

        try {
          const filePath = path.join(AVATAR_DIR, file)
          const resolvedFilePath = path.resolve(filePath)
          const resolvedDir = path.resolve(AVATAR_DIR)

          // Keamanan: pastikan file berada dalam AVATAR_DIR
          if (resolvedFilePath.startsWith(resolvedDir) && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
            deletedCount++
          }
        } catch (err) {
          console.error(`Gagal menghapus file avatar lama ${file}:`, err)
        }
      }
    }
  } catch (err) {
    console.error('Error membaca direktori avatar:', err)
  }

  return deletedCount
}

/**
 * Mendapatkan lokasi absolut file avatar jika ada (dengan perlindungan path traversal ketat)
 */
export function getAvatarFilePath(filename: string): string | null {
  if (
    !filename ||
    typeof filename !== 'string' ||
    filename.includes('..') ||
    filename.includes('/') ||
    filename.includes('\\') ||
    path.basename(filename) !== filename
  ) {
    return null
  }

  const filePath = path.join(AVATAR_DIR, filename)
  const resolvedFilePath = path.resolve(filePath)
  const resolvedDir = path.resolve(AVATAR_DIR)

  // Pastikan path hasil resolve tetap dalam AVATAR_DIR
  if (!resolvedFilePath.startsWith(resolvedDir)) {
    return null
  }

  try {
    if (fs.existsSync(resolvedFilePath) && fs.statSync(resolvedFilePath).isFile()) {
      return resolvedFilePath
    }
  } catch {
    return null
  }

  return null
}
