import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractSessionToken, verifySessionToken } from '@/lib/auth/tokens'
import { PersistentStore, OFFICIAL_SUPERADMIN_ID, StoredWallet } from '@/lib/db/store'

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

export async function GET(req: Request) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Autentikasi diperlukan.' }, { status: 401 })
    }

    const persistentWallets = PersistentStore.getWallets(userId)

    // Ensure at least one default wallet exists if user has wallets
    const formatted = persistentWallets.map((w) => ({
      id: w.id,
      user_id: w.user_id,
      name: w.name,
      type: w.type,
      balance: w.balance,
      is_default: w.is_default,
      is_default_telegram: w.is_default_telegram ?? w.is_default,
      account_number: w.account_number || (w.type === 'cash' ? 'Uang Fisik' : '-'),
      icon: w.icon || '👛',
      color: w.color || '#10b981',
      created_at: w.created_at,
      updated_at: w.updated_at,
    }))

    return NextResponse.json({ success: true, data: formatted })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Autentikasi diperlukan.' }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      type = 'bank',
      balance = 0,
      icon,
      color,
      account_number,
      is_default_telegram = false,
      isDefault = false,
    } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: 'Nama dompet wajib diisi.' }, { status: 400 })
    }

    const defaultIcons: Record<string, string> = {
      bank: '🏦',
      ewallet: '📱',
      cash: '💵',
      other: '💳',
    }
    const defaultColors: Record<string, string> = {
      bank: '#3b82f6',
      ewallet: '#10b981',
      cash: '#059669',
      other: '#8b5cf6',
    }

    const assignedIcon = icon || defaultIcons[type] || '💳'
    const assignedColor = color || defaultColors[type] || '#10b981'
    const makeDefault = !!(is_default_telegram || isDefault)

    // Create in persistent store (single source of truth)
    const newWallet = PersistentStore.createWallet({
      user_id: userId,
      name: name.trim(),
      type: type as any,
      balance: Math.round(Number(balance) || 0),
      account_number: account_number || (type === 'cash' ? 'Uang Fisik' : null),
      is_default: makeDefault,
      is_default_telegram: makeDefault,
      icon: assignedIcon,
      color: assignedColor,
    })

    // Try Supabase sync
    try {
      const admin = createAdminClient()
      if (makeDefault) {
        await admin.from('wallets').update({ is_default: false }).eq('user_id', userId)
      }
      await admin.from('wallets').insert({
        id: newWallet.id,
        user_id: userId,
        name: newWallet.name,
        type: newWallet.type,
        balance: newWallet.balance,
        icon: newWallet.icon,
        color: newWallet.color,
        is_default: newWallet.is_default,
      })
    } catch {}

    return NextResponse.json(
      {
        success: true,
        message: 'Dompet baru berhasil ditambahkan!',
        data: newWallet,
      },
      { status: 201 }
    )
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Autentikasi diperlukan.' }, { status: 401 })
    }

    const body = await req.json()
    const { id, isDefault, is_default_telegram, name, balance, account_number, type, icon, color } = body

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID dompet diperlukan.' }, { status: 400 })
    }

    const makeDefault = isDefault !== undefined ? !!isDefault : is_default_telegram !== undefined ? !!is_default_telegram : undefined

    const updates: Partial<StoredWallet> = {}
    if (name) updates.name = name.trim()
    if (balance !== undefined) updates.balance = Math.round(Number(balance))
    if (account_number !== undefined) updates.account_number = account_number
    if (type) updates.type = type
    if (icon) updates.icon = icon
    if (color) updates.color = color
    if (makeDefault !== undefined) {
      updates.is_default = makeDefault
      updates.is_default_telegram = makeDefault
    }

    const updated = PersistentStore.updateWallet(id, userId, updates)
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Dompet tidak ditemukan.' }, { status: 404 })
    }

    // Sync Supabase
    try {
      const admin = createAdminClient()
      if (makeDefault) {
        await admin.from('wallets').update({ is_default: false }).eq('user_id', userId)
      }
      await admin.from('wallets').update(updates as any).eq('id', id).eq('user_id', userId)
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Dompet berhasil diperbarui!',
      data: updated,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Autentikasi diperlukan.' }, { status: 401 })
    }

    let id: string | null = null

    const { searchParams } = new URL(req.url)
    id = searchParams.get('id')

    if (!id) {
      try {
        const body = await req.json()
        id = body.id
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID dompet diperlukan.' }, { status: 400 })
    }

    // Soft archive in persistent store
    const updated = PersistentStore.updateWallet(id, userId, { is_archived: true })

    try {
      const admin = createAdminClient()
      await admin.from('wallets').delete().eq('id', id).eq('user_id', userId)
    } catch {}

    return NextResponse.json({ success: true, message: 'Dompet berhasil dihapus.' })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
