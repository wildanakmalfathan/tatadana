import { NextRequest, NextResponse } from 'next/server'
import { extractSessionToken, verifySessionToken } from '@/lib/auth/tokens'
import { PersistentStore, OFFICIAL_SUPERADMIN_ID } from '@/lib/db/store'
import { validateImageBuffer, MAX_AVATAR_SIZE_BYTES } from '@/lib/storage/image-validation'
import { saveUserAvatar, cleanOldUserAvatars } from '@/lib/storage/avatar-storage'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

async function resolveUserId(req: Request): Promise<string | null> {
  const token = extractSessionToken(req)
  if (token) {
    const payload = verifySessionToken(token)
    if (payload?.userId) return payload.userId
  }

  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch {}

  return null
}

/**
 * POST /api/profile/avatar — Upload & simpan foto profil pengguna
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Autentikasi diperlukan. Silakan login terlebih dahulu.' },
        { status: 401 }
      )
    }

    const currentUser = PersistentStore.findUserById(userId)
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'Akun pengguna tidak ditemukan.' },
        { status: 404 }
      )
    }

    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { success: false, message: 'Header Content-Type harus berupa multipart/form-data.' },
        { status: 400 }
      )
    }

    const formData = await req.formData()
    const file = (formData.get('image') || formData.get('file') || formData.get('avatar')) as File | null

    if (!file || typeof file === 'string' || typeof (file as any).arrayBuffer !== 'function') {
      return NextResponse.json(
        {
          success: false,
          error: 'File gambar tidak valid',
          message: !file
            ? 'Tidak ada berkas foto yang dipilih untuk diunggah.'
            : 'Berkas foto tidak valid atau rusak.',
        },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Validasi ukuran dan magic bytes berkas
    const validation = validateImageBuffer(buffer)
    if (!validation.valid || !validation.extension) {
      const isSizeLimit = buffer.length > MAX_AVATAR_SIZE_BYTES
      return NextResponse.json(
        { success: false, message: validation.error || 'Format gambar tidak valid.' },
        { status: isSizeLimit ? 413 : 400 }
      )
    }

    // Simpan file ke storage persisten
    const { urlPath } = await saveUserAvatar(userId, buffer, validation.extension)

    // Update database profil pengguna
    const updatedUser = PersistentStore.updateUser(userId, {
      avatar_url: urlPath,
      avatar_type: 'uploaded',
    })

    // Sinkronisasi Supabase profiles bila tersedia
    try {
      const admin = createAdminClient()
      await admin
        .from('profiles')
        .update({
          avatar_url: urlPath,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
    } catch {}

    return NextResponse.json(
      {
        success: true,
        message: 'Foto profil berhasil diunggah dan disimpan secara permanen.',
        data: {
          id: userId,
          avatar_url: urlPath,
          avatar_type: 'uploaded',
        },
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('Error in POST /api/profile/avatar:', err)
    return NextResponse.json(
      { success: false, message: err.message || 'Terjadi kesalahan server saat memproses unggahan.' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/profile/avatar — Hapus foto profil kustom dan kembalikan ke avatar default
 */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Autentikasi diperlukan. Silakan login terlebih dahulu.' },
        { status: 401 }
      )
    }

    const currentUser = PersistentStore.findUserById(userId)
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'Akun pengguna tidak ditemukan.' },
        { status: 404 }
      )
    }

    // Bersihkan file fisik dari disk
    cleanOldUserAvatars(userId)

    const defaultAvatarEmoji = '🧑‍💼'

    // Update database ke emoji bawaan
    PersistentStore.updateUser(userId, {
      avatar_url: defaultAvatarEmoji,
      avatar_type: 'emoji',
    })

    // Sinkronisasi Supabase jika ada
    try {
      const admin = createAdminClient()
      await admin
        .from('profiles')
        .update({
          avatar_url: defaultAvatarEmoji,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
    } catch {}

    return NextResponse.json(
      {
        success: true,
        message: 'Foto profil kustom berhasil dihapus. Avatar dikembalikan ke bawaan.',
        data: {
          id: userId,
          avatar_url: defaultAvatarEmoji,
          avatar_type: 'emoji',
        },
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('Error in DELETE /api/profile/avatar:', err)
    return NextResponse.json(
      { success: false, message: err.message || 'Terjadi kesalahan saat menghapus foto profil.' },
      { status: 500 }
    )
  }
}
