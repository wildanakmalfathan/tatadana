import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PersistentStore, OFFICIAL_SUPERADMIN_ID } from '@/lib/db/store'
import { extractSessionToken, verifySessionToken } from '@/lib/auth/tokens'

export const dynamic = 'force-dynamic'

export interface CalendarTransactionItem {
  id: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  category: string
  category_emoji?: string
  category_color?: string
  wallet: string
  wallet_id?: string
  note: string
  notes: string
  date: string
  time?: string
  items?: Array<{ name: string; qty: number; price: number }>
}

export interface DayAggregation {
  date: string
  day: number
  income: number
  expense: number
  count: number
  transactions: CalendarTransactionItem[]
}

export interface CalendarResponse {
  success: boolean
  month: number
  year: number
  wallet_id?: string
  days: Record<string, {
    income: number
    expense: number
    count: number
    transactions: CalendarTransactionItem[]
  }>
  summary: {
    total_income: number
    total_expense: number
    net_savings: number
    transaction_count?: number
  }
}

/**
 * Fallback transactions generator for empty database state
 */
function getFallbackMonthlyTransactions(
  _year: number,
  _month: number,
  _walletFilter?: string | null
): CalendarTransactionItem[] {
  return []
}


export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    // Parse month & year with safe defaults
    const now = new Date()
    let month = parseInt(searchParams.get('month') || '', 10)
    let year = parseInt(searchParams.get('year') || '', 10)
    const walletId = searchParams.get('wallet_id') || searchParams.get('walletId') || undefined

    if (isNaN(month) || month < 1 || month > 12) {
      month = now.getMonth() + 1
    }
    if (isNaN(year) || year < 2000 || year > 2100) {
      year = now.getFullYear()
    }

    const pad = (n: number) => String(n).padStart(2, '0')
    const daysInMonth = new Date(year, month, 0).getDate()
    const startDateStr = `${year}-${pad(month)}-01`
    const endDateStr = `${year}-${pad(month)}-${pad(daysInMonth)}`

    // Initialize all days in month
    const daysRecord: CalendarResponse['days'] = {}
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${pad(month)}-${pad(d)}`
      daysRecord[dateKey] = {
        income: 0,
        expense: 0,
        count: 0,
        transactions: [],
      }
    }

    let transactionsList: CalendarTransactionItem[] = []

    let targetUserId: string | null = null
    const token = extractSessionToken(req)
    if (token) {
      const payload = verifySessionToken(token)
      if (payload?.userId) targetUserId = payload.userId
    } else {
      try {
        const supabase = await createServerSupabaseClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user?.id) targetUserId = user.id
      } catch {}
    }

    if (!targetUserId) {
      const headerUserId = req.headers.get('x-user-id')
      if (headerUserId && PersistentStore.findUserById(headerUserId)) {
        targetUserId = headerUserId
      }
    }

    // If still null, try cookie or fallback to superadmin
    if (!targetUserId) {
      const cookieHeader = req.headers.get('cookie') || ''
      const match = cookieHeader.match(/tatadana_session=([^;]+)/) || cookieHeader.match(/tatadana_admin_session=([^;]+)/)
      if (match) {
        const payload = verifySessionToken(decodeURIComponent(match[1]))
        if (payload?.userId) targetUserId = payload.userId
      }
    }

    if (!targetUserId) {
      targetUserId = OFFICIAL_SUPERADMIN_ID
    }

    // 1. Wallets mapping
    const persistentWallets = PersistentStore.getWallets(targetUserId)
    const allDbWallets = PersistentStore.read().wallets || []
    const walletMap = new Map<string, string>()
    for (const w of allDbWallets) {
      walletMap.set(w.id, w.name)
    }
    for (const w of persistentWallets) {
      walletMap.set(w.id, w.name)
    }

    // Match wallet filter by id, name, or slug
    let targetWalletId: string | undefined = undefined
    if (walletId && walletId !== 'all') {
      const wFilter = walletId.toLowerCase()
      const matchingWallet =
        persistentWallets.find(
          (w) =>
            w.id.toLowerCase() === wFilter ||
            w.name.toLowerCase().includes(wFilter) ||
            w.type.toLowerCase() === wFilter
        ) ||
        allDbWallets.find(
          (w) =>
            w.id.toLowerCase() === wFilter ||
            w.name.toLowerCase().includes(wFilter) ||
            w.type.toLowerCase() === wFilter
        )
      targetWalletId = matchingWallet ? matchingWallet.id : walletId
    }

    // 2. Comprehensive category dictionary
    const categoryMap = new Map<string, { id: string; name: string; emoji: string; color: string }>()
    const standardCategories: Record<string, { name: string; emoji: string; color: string }> = {
      'cat-makan': { name: 'Makanan & Minuman', emoji: '🍜', color: '#f97316' },
      'cat-trans': { name: 'Transportasi', emoji: '🚗', color: '#3b82f6' },
      'cat-tagih': { name: 'Tagihan & Utilitas', emoji: '⚡', color: '#ef4444' },
      'cat-belanja': { name: 'Belanja Bulanan', emoji: '🛒', color: '#8b5cf6' },
      'cat-hiburan': { name: 'Hiburan', emoji: '🎮', color: '#ec4899' },
      'cat-gaji': { name: 'Gaji Pokok', emoji: '💰', color: '#10b981' },
      'cat-freelance': { name: 'Freelance & Bisnis', emoji: '💻', color: '#06b6d4' },
      'cat-food-drink': { name: 'Makanan & Minuman', emoji: '🍜', color: '#f97316' },
      'c-1': { name: 'Makanan & Minuman', emoji: '🍜', color: '#f97316' },
      'c-2': { name: 'Transportasi', emoji: '🚗', color: '#3b82f6' },
      'c-3': { name: 'Tagihan & Utilitas', emoji: '⚡', color: '#ef4444' },
      'c-4': { name: 'Hiburan', emoji: '🎮', color: '#ec4899' },
      'c-5': { name: 'Belanja Bulanan', emoji: '🛒', color: '#8b5cf6' },
    }
    for (const [id, val] of Object.entries(standardCategories)) {
      categoryMap.set(id, { id, ...val })
    }

    const allDbCategories = PersistentStore.read().categories || []
    for (const c of allDbCategories) {
      categoryMap.set(c.id, { id: c.id, name: c.name, emoji: c.emoji || '🏷️', color: c.color || '#10b981' })
    }

    const persistentCategories = PersistentStore.getCategories(targetUserId)
    for (const c of persistentCategories) {
      categoryMap.set(c.id, { id: c.id, name: c.name, emoji: c.emoji || '🏷️', color: c.color || '#10b981' })
    }

    // 3. Primary Source: PersistentStore (Single Source of Truth)
    const persistentTxs = PersistentStore.getTransactions(targetUserId, {
      start_date: startDateStr,
      end_date: endDateStr,
    })

    let filteredTxs = persistentTxs
    if (walletId && walletId !== 'all') {
      const wFilter = walletId.toLowerCase()
      filteredTxs = persistentTxs.filter((row) => {
        const wName = row.wallet_id ? (walletMap.get(row.wallet_id) || '').toLowerCase() : ''
        const wId = (row.wallet_id || '').toLowerCase()
        const destWName = row.destination_wallet_id ? (walletMap.get(row.destination_wallet_id) || '').toLowerCase() : ''
        const destWId = (row.destination_wallet_id || '').toLowerCase()

        return (
          wId === wFilter ||
          wName.includes(wFilter) ||
          destWId === wFilter ||
          destWName.includes(wFilter) ||
          (targetWalletId ? (row.wallet_id === targetWalletId || row.destination_wallet_id === targetWalletId) : false)
        )
      })
    }

    if (filteredTxs.length > 0) {
      transactionsList = filteredTxs.map((row) => {
        let cat = row.category_id ? categoryMap.get(row.category_id) : null
        if (!cat) {
          const text = `${row.notes || ''} ${row.raw_input || ''}`.toLowerCase()
          if (text.includes('makan') || text.includes('bakso') || text.includes('kopi') || text.includes('geprek') || text.includes('padang')) {
            cat = categoryMap.get('cat-makan') || null
          } else if (text.includes('bensin') || text.includes('pertamax') || text.includes('servis') || text.includes('motor') || text.includes('transport')) {
            cat = categoryMap.get('cat-trans') || null
          } else if (text.includes('listrik') || text.includes('pln') || text.includes('internet') || text.includes('indihome') || text.includes('pulsa') || text.includes('tagih')) {
            cat = categoryMap.get('cat-tagih') || null
          } else if (text.includes('belanja') || text.includes('supermarket') || text.includes('indomaret') || text.includes('shopee')) {
            cat = categoryMap.get('cat-belanja') || null
          } else if (text.includes('hiburan') || text.includes('nongkrong') || text.includes('bioskop') || text.includes('game')) {
            cat = categoryMap.get('cat-hiburan') || null
          } else if (text.includes('gaji') || text.includes('salary')) {
            cat = categoryMap.get('cat-gaji') || null
          } else if (text.includes('freelance') || text.includes('desain')) {
            cat = categoryMap.get('cat-freelance') || null
          }
        }

        const walletName = row.wallet_id ? (walletMap.get(row.wallet_id) || 'Dompet Utama') : 'Dompet Utama'
        return {
          id: row.id,
          amount: row.amount,
          type: row.type,
          category: cat?.name || (row.type === 'income' ? 'Pemasukan' : 'Pengeluaran'),
          category_emoji: cat?.emoji || (row.type === 'income' ? '💰' : '🍜'),
          category_color: cat?.color || '#10b981',
          wallet: walletName,
          wallet_id: row.wallet_id || undefined,
          note: row.notes || row.raw_input || '',
          notes: row.notes || row.raw_input || '',
          date: row.date,
          time: row.time || '12:00',
          source: row.source || 'web',
          items: (row as any).items || [],
        }
      })
    } else {
      // Try Supabase fallback
      try {
        const admin = createAdminClient()
        let query = admin
          .from('transactions')
          .select(`
            id,
            amount,
            type,
            date,
            time,
            notes,
            wallet_id,
            category_id,
            wallets:wallet_id(id, name, type),
            categories:category_id(id, name, emoji, color)
          `)
          .eq('user_id', targetUserId)
          .gte('date', startDateStr)
          .lte('date', endDateStr)
          .order('date', { ascending: true })
          .order('time', { ascending: true })

        if (targetWalletId) {
          query = query.eq('wallet_id', targetWalletId)
        }

        const { data: dbData, error: dbError } = await query

        if (!dbError && dbData && dbData.length > 0) {
          transactionsList = dbData.map((row: any) => {
            const cat = Array.isArray(row.categories) ? row.categories[0] : row.categories
            const wal = Array.isArray(row.wallets) ? row.wallets[0] : row.wallets

            return {
              id: row.id,
              amount: Number(row.amount) || 0,
              type: (row.type as any) || 'expense',
              category: cat?.name || (row.type === 'income' ? 'Pemasukan' : 'Pengeluaran'),
              category_emoji: cat?.emoji || (row.type === 'income' ? '💰' : '🍜'),
              category_color: cat?.color || '#10b981',
              wallet: wal?.name || 'Dompet Utama',
              wallet_id: row.wallet_id || wal?.id,
              note: row.notes || row.note || '',
              notes: row.notes || row.note || '',
              date: row.date,
              time: row.time || '12:00',
            }
          })
        }
      } catch (dbErr) {
        console.warn('Database query failed for calendar:', dbErr)
      }
    }

    // Group transactions into daysRecord and compute summaries
    let totalIncome = 0
    let totalExpense = 0

    for (const tx of transactionsList) {
      const dateKey = tx.date
      if (!daysRecord[dateKey]) {
        daysRecord[dateKey] = {
          income: 0,
          expense: 0,
          count: 0,
          transactions: [],
        }
      }

      if (tx.type === 'income') {
        daysRecord[dateKey].income += tx.amount
        totalIncome += tx.amount
      } else if (tx.type === 'expense') {
        daysRecord[dateKey].expense += tx.amount
        totalExpense += tx.amount
      }

      daysRecord[dateKey].count += 1
      daysRecord[dateKey].transactions.push(tx)
    }

    const netSavings = totalIncome - totalExpense

    const responsePayload: CalendarResponse & {
      summary: CalendarResponse['summary'] & {
        totalIn: number
        totalOut: number
        net: number
        activeDays: number
      }
    } = {
      success: true,
      month,
      year,
      wallet_id: walletId || 'all',
      days: daysRecord,
      summary: {
        total_income: totalIncome,
        total_expense: totalExpense,
        net_savings: netSavings,
        transaction_count: transactionsList.length,
        totalIn: totalIncome,
        totalOut: totalExpense,
        net: netSavings,
        activeDays: Object.values(daysRecord).filter((d) => d.count > 0).length,
      },
    }

    return NextResponse.json(responsePayload, { status: 200 })
  } catch (error: any) {
    console.error('Error in /api/transactions/calendar:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Gagal memproses data kalender finansial.',
      },
      { status: 500 }
    )
  }
}
