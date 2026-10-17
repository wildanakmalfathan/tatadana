import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/db/supabase-adapter'

const AVATAR_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars')

function ensureDirExists() {
  try {
    if (!fs.existsSync(AVATAR_DIR)) {
      fs.mkdirSync(AVATAR_DIR, { recursive: true })
    }
  } catch {
    // Graceful on read-only serverless filesystems (e.g. Vercel)
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
 * Menyimpan buffer avatar secara persisten:
 * 1. Jika Supabase aktif, simpan ke Supabase Storage bucket ('avatars' atau 'tatadana-exports')
 * 2. Jika filesystem lokal dapat ditulis (local dev), simpan ke public/uploads/avatars/
 * 3. Jika filesystem read-only (Vercel serverless), gunakan Base64 Data URI fallback yang aman & persisten
 */
export async function saveUserAvatar(
  userId: string,
  buffer: Buffer,
  extension: 'jpg' | 'png' | 'webp'
): Promise<{ filename: string; urlPath: string }> {
  const safeUserId = sanitizeUserId(userId)
  const randomSuffix = crypto.randomBytes(4).toString('hex')
  const filename = `avatar-${safeUserId}-${Date.now()}-${randomSuffix}.${extension}`
  const mime = extension === 'jpg' ? 'image/jpeg' : `image/${extension}`

  // 1. Try Supabase Storage Cloud Upload
  if (isSupabaseConfigured()) {
    try {
      const admin = createAdminClient()
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'avatars'
      const { data, error } = await admin.storage
        .from(bucket)
        .upload(filename, buffer, {
          contentType: mime,
          upsert: true,
        })

      if (!error && data) {
        const { data: publicData } = admin.storage.from(bucket).getPublicUrl(filename)
        if (publicData?.publicUrl) {
          return { filename, urlPath: publicData.publicUrl }
        }
      } else if (error) {
        console.warn('[AvatarStorage] Supabase storage upload warning:', error.message)
      }
    } catch (err: any) {
      console.warn('[AvatarStorage] Supabase storage exception:', err?.message)
    }
  }

  // 2. Try Local Persistent Filesystem (Local Dev)
  try {
    ensureDirExists()
    const targetPath = path.join(AVATAR_DIR, filename)
    const resolvedTarget = path.resolve(targetPath)
    const resolvedDir = path.resolve(AVATAR_DIR)

    if (resolvedTarget.startsWith(resolvedDir)) {
      fs.writeFileSync(targetPath, buffer)
      cleanOldUserAvatars(safeUserId, filename)
      return { filename, urlPath: `/uploads/avatars/${filename}` }
    }
  } catch (fsErr: any) {
    console.warn('[AvatarStorage] Filesystem write bypassed (Vercel serverless):', fsErr?.message)
  }

  // 3. Robust Serverless Fallback (Base64 Data URI)
  // Perfectly compatible with Vercel serverless: zero disk writes needed, 100% persistent in DB
  const dataUri = `data:${mime};base64,${buffer.toString('base64')}`
  return { filename, urlPath: dataUri }
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
    if (!fs.existsSync(AVATAR_DIR)) return 0
    const files = fs.readdirSync(AVATAR_DIR)
    const prefix = `avatar-${safeUserId}-`

    for (const file of files) {
      if (file.startsWith(prefix)) {
        if (preserveFilename && file === preserveFilename) {
          continue
        }

        try {
          const filePath = path.join(AVATAR_DIR, file)
          const resolvedFilePath = path.resolve(filePath)
          const resolvedDir = path.resolve(AVATAR_DIR)

          if (resolvedFilePath.startsWith(resolvedDir) && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
            deletedCount++
          }
        } catch (err) {
          // Ignore deletion error on read-only filesystems
        }
      }
    }
  } catch (err) {
    // Ignore read error on read-only filesystems
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
