import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractSessionToken, verifySessionToken } from '@/lib/auth/tokens'
import { PersistentStore, OFFICIAL_SUPERADMIN_ID } from '@/lib/db/store'

export const dynamic = 'force-dynamic'

async function resolveUserId(req: Request): Promise<string> {
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

  return OFFICIAL_SUPERADMIN_ID
}

export async function GET(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const persistentCategories = PersistentStore.getCategories(userId)

    if (persistentCategories.length > 0) {
      return NextResponse.json({ success: true, data: persistentCategories })
    }

    try {
      const supabase = await createServerSupabaseClient()
      const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('type', { ascending: false })
        .order('name', { ascending: true })

      if (categories && categories.length > 0) {
        return NextResponse.json({ success: true, data: categories })
      }
    } catch {}

    return NextResponse.json({ success: true, data: persistentCategories })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const body = await req.json()
    const { name, type = 'expense', emoji = '🏷️', color = '#F97316', budgetAmount = 0 } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: 'Nama kategori wajib diisi.' }, { status: 400 })
    }

    const created = PersistentStore.createCategory({
      user_id: userId,
      name: name.trim(),
      type,
      emoji,
      color,
      budget_amount: Number(budgetAmount) || 0,
    })

    try {
      const admin = createAdminClient()
      await admin.from('categories').insert({
        id: created.id,
        user_id: userId,
        name: name.trim(),
        type,
        emoji,
        color,
        budget_amount: Number(budgetAmount) || 0,
        is_system: false,
      })
    } catch {}

    return NextResponse.json({ success: true, message: 'Kategori berhasil ditambahkan!', data: created })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const body = await req.json()
    const { id, name, emoji, color, budgetAmount } = body

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID kategori diperlukan.' }, { status: 400 })
    }

    const updates: any = {}
    if (name) updates.name = name.trim()
    if (emoji) updates.emoji = emoji
    if (color) updates.color = color
    if (budgetAmount !== undefined) updates.budget_amount = Number(budgetAmount)

    // Sync PersistentStore
    const categories = PersistentStore.getCategories(userId)
    const target = categories.find((c) => c.id === id)
    if (target) {
      Object.assign(target, updates)
      target.updated_at = new Date().toISOString()
      PersistentStore.save()
    }

    try {
      const admin = createAdminClient()
      await admin.from('categories').update(updates).eq('id', id).eq('user_id', userId)
    } catch {}

    return NextResponse.json({ success: true, message: 'Kategori berhasil diperbarui!', data: target || updates })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID kategori diperlukan.' }, { status: 400 })
    }

    // Sync PersistentStore
    const categories = PersistentStore.getCategories(userId)
    const idx = categories.findIndex((c) => c.id === id)
    if (idx !== -1) {
      categories.splice(idx, 1)
      PersistentStore.save()
    }

    try {
      const admin = createAdminClient()
      await admin.from('categories').delete().eq('id', id).eq('user_id', userId)
    } catch {}

    return NextResponse.json({ success: true, message: 'Kategori berhasil dihapus.' })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
