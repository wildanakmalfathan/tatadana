import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { extractSessionToken, verifySessionToken } from '@/lib/auth/tokens'
import { OFFICIAL_SUPERADMIN_ID, PersistentStore } from '@/lib/db/store'
import { LedgerService } from '@/lib/services/ledger'

export const dynamic = 'force-dynamic'

/**
 * Resolves the authenticated user ID from Session Token, Supabase Auth, or request headers
 */
async function resolveUserId(req: Request): Promise<string | null> {
  // 1. Session Token
  const token = extractSessionToken(req)
  if (token) {
    const payload = verifySessionToken(token)
    if (payload?.userId) {
      return payload.userId
    }
  }

  // 2. Supabase Server Auth
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user?.id) {
      return user.id
    }
  } catch {
    // Ignore Supabase auth error in offline mode
  }

  return null
}

export async function GET(req: Request) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const wallet_id = searchParams.get('wallet_id') || searchParams.get('walletId') || undefined
    const category_id = searchParams.get('category_id') || searchParams.get('categoryId') || undefined
    const type = searchParams.get('type') || undefined
    const start_date = searchParams.get('start_date') || searchParams.get('startDate') || undefined
    const end_date = searchParams.get('end_date') || searchParams.get('endDate') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined

    const transactions = await LedgerService.getTransactions(userId, {
      wallet_id,
      category_id,
      type,
      start_date,
      end_date,
      limit,
    })

    return NextResponse.json({ success: true, data: transactions })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const type = body.type
    const amount = Number(body.amount)
    const walletId = body.walletId || body.wallet_id || null
    const destinationWalletId = body.destinationWalletId || body.destination_wallet_id || null
    const categoryId = body.categoryId || body.category_id || null
    const date = body.date
    const time = body.time
    const notes = body.notes || body.note || null
    const idempotencyKey = body.idempotency_key || body.idempotencyKey || null
    const source = body.source || 'web'
    const receiptImageUrl = body.receipt_image_url || body.receipt_url || null
    const isMultiItem = body.is_multi_item || false

    if (!type || !amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Jenis transaksi dan nominal wajib diisi berupa angka positif.' },
        { status: 400 }
      )
    }

    const result = await LedgerService.createTransaction({
      user_id: userId,
      type,
      amount,
      wallet_id: walletId,
      destination_wallet_id: destinationWalletId,
      category_id: categoryId,
      date,
      time,
      notes,
      source,
      idempotency_key: idempotencyKey,
      receipt_image_url: receiptImageUrl,
      is_multi_item: isMultiItem,
    })

    return NextResponse.json(
      {
        success: true,
        message: result.isDuplicate
          ? 'Transaksi terdeteksi duplikat (idempotent), data transaksi yang ada dikembalikan.'
          : 'Transaksi berhasil dicatat!',
        data: result.transaction,
        budget_alert: result.budgetAlert,
        is_duplicate: result.isDuplicate,
      },
      { status: result.isDuplicate ? 200 : 201 }
    )
  } catch (error: any) {
    if (error.status === 403 || error.isLimitExceeded) {
      return NextResponse.json({ success: false, message: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal menyimpan transaksi.' },
      { status: 400 }
    )
  }
}

export async function PUT(req: Request) {
  return handleUpdate(req)
}

export async function PATCH(req: Request) {
  return handleUpdate(req)
}

async function handleUpdate(req: Request) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const body = await req.json()
    const id = searchParams.get('id') || body.id

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID transaksi wajib disertakan.' },
        { status: 400 }
      )
    }

    const updates: any = {}
    if (body.amount !== undefined) updates.amount = Number(body.amount)
    if (body.type !== undefined) updates.type = body.type
    if (body.walletId !== undefined || body.wallet_id !== undefined) {
      updates.wallet_id = body.walletId || body.wallet_id
    }
    if (body.destinationWalletId !== undefined || body.destination_wallet_id !== undefined) {
      updates.destination_wallet_id = body.destinationWalletId || body.destination_wallet_id
    }
    if (body.categoryId !== undefined || body.category_id !== undefined) {
      updates.category_id = body.categoryId || body.category_id
    }
    if (body.date !== undefined) updates.date = body.date
    if (body.time !== undefined) updates.time = body.time
    if (body.notes !== undefined || body.note !== undefined) {
      updates.notes = body.notes !== undefined ? body.notes : body.note
    }
    if (body.receipt_image_url !== undefined || body.receipt_url !== undefined) {
      updates.receipt_image_url = body.receipt_image_url || body.receipt_url
    }

    const updated = await LedgerService.updateTransaction(id, userId, updates)

    return NextResponse.json({
      success: true,
      message: 'Transaksi berhasil diperbarui dan saldo dompet telah disinkronkan!',
      data: updated,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memperbarui transaksi.' },
      { status: 400 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    let id = searchParams.get('id')

    if (!id) {
      try {
        const body = await req.json()
        id = body.id
      } catch {
        // No body
      }
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID transaksi wajib disertakan.' },
        { status: 400 }
      )
    }

    const deleted = await LedgerService.deleteTransaction(id, userId)
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: 'Transaksi tidak ditemukan atau gagal dihapus.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Transaksi berhasil dihapus dan saldo dompet telah dibatalkan secara atomik.',
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal menghapus transaksi.' },
      { status: 400 }
    )
  }
}
