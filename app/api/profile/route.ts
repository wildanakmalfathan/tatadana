import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractSessionToken, verifySessionToken } from '@/lib/auth/tokens'
import { PersistentStore, OFFICIAL_SUPERADMIN_ID } from '@/lib/db/store'

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

  const headerUserId = req.headers.get('x-user-id')
  if (headerUserId && PersistentStore.findUserById(headerUserId)) {
    return headerUserId
  }

  const users = PersistentStore.getUsers()
  if (users.length > 0) {
    const defaultUser = users.find((u) => u.id === OFFICIAL_SUPERADMIN_ID) || users[0]
    return defaultUser.id
  }

  return null
}

export async function GET(req: Request) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const localUser = PersistentStore.findUserById(userId)
    if (localUser) {
      return NextResponse.json({
        success: true,
        data: {
          id: localUser.id,
          full_name: localUser.name,
          email: localUser.email,
          phone_number: localUser.phone,
          plan: localUser.plan,
          status: localUser.status,
          role: localUser.role,
          avatar_url: localUser.avatar_url || '🧑‍💼',
          avatar_type: localUser.avatar_type || (localUser.avatar_url?.startsWith('/') ? 'uploaded' : 'emoji'),
          currency: 'IDR',
          reminder_enabled: true,
          reminder_frequency: 2,
          reminder_times: ['12:30', '20:00'],
          created_at: localUser.created_at,
        },
      })
    }

    const supabase = await createServerSupabaseClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: profile })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { fullName, name, avatarUrl, avatar, avatarType, avatar_type, currency, reminderEnabled, reminderFrequency, reminderTimes } = body

    const targetName = fullName || name
    const targetAvatar = avatarUrl || avatar
    const targetAvatarType = avatarType || avatar_type || (targetAvatar?.startsWith('/') ? 'uploaded' : 'emoji')

    // Update PersistentStore
    const userUpdates: any = {}
    if (targetName) userUpdates.name = targetName.trim()
    if (targetAvatar) {
      userUpdates.avatar_url = targetAvatar
      userUpdates.avatar_type = targetAvatarType
    }

    const updatedUser = PersistentStore.updateUser(userId, userUpdates)

    // Sync Supabase if online
    try {
      const admin = createAdminClient()
      const dbUpdates: any = { updated_at: new Date().toISOString() }
      if (targetName) dbUpdates.full_name = targetName.trim()
      if (currency) dbUpdates.currency = currency
      if (targetAvatar) dbUpdates.avatar_url = targetAvatar
      if (reminderEnabled !== undefined) dbUpdates.reminder_enabled = !!reminderEnabled
      if (reminderFrequency !== undefined) {
        dbUpdates.reminder_frequency = Math.min(2, Math.max(1, parseInt(reminderFrequency, 10) || 1))
      }
      if (reminderTimes && Array.isArray(reminderTimes)) {
        dbUpdates.reminder_times = reminderTimes.slice(0, 2)
      }
      await admin.from('profiles').update(dbUpdates).eq('id', userId)
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Pengaturan profil berhasil disimpan secara persisten!',
      data: {
        id: userId,
        name: updatedUser?.name || targetName,
        full_name: updatedUser?.name || targetName,
        avatar_url: updatedUser?.avatar_url || targetAvatar || '🧑‍💼',
        avatar_type: updatedUser?.avatar_type || targetAvatarType || 'emoji',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
