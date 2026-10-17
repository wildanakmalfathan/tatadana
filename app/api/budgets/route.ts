import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getISODateWIB, getWIBDate } from '@/lib/utils/date'
import { extractSessionToken, verifySessionToken } from '@/lib/auth/tokens'
import { PersistentStore, OFFICIAL_SUPERADMIN_ID, StoredBudget } from '@/lib/db/store'

export const dynamic = 'force-dynamic'

const DEFAULT_USER_ID = OFFICIAL_SUPERADMIN_ID

export interface BudgetStoreItem {
  id: string
  user_id: string
  category_id: string
  period: 'daily' | 'weekly' | 'monthly'
  amount: number
  month: number
  year: number
  category: {
    id: string
    name: string
    emoji: string
    color: string
  }
}

// Canonical category defaults
const standardCategories: Record<string, { id: string; name: string; emoji: string; color: string }> = {
  'cat-makan': { id: 'cat-makan', name: 'Makanan & Minuman', emoji: '🍜', color: '#f97316' },
  'cat-trans': { id: 'cat-trans', name: 'Transportasi', emoji: '🚗', color: '#3b82f6' },
  'cat-tagih': { id: 'cat-tagih', name: 'Tagihan & Utilitas', emoji: '⚡', color: '#ef4444' },
  'cat-belanja': { id: 'cat-belanja', name: 'Belanja Bulanan', emoji: '🛒', color: '#8b5cf6' },
  'cat-hiburan': { id: 'cat-hiburan', name: 'Hiburan', emoji: '🎮', color: '#ec4899' },
}

function getCanonicalCategoryKey(catId?: string | null, name?: string | null): string {
  const lowerName = (name || '').toLowerCase()
  const lowerId = (catId || '').toLowerCase()

  if (lowerId === 'cat-makan' || lowerId === 'cat-food-drink' || lowerId === 'c-1' || lowerName.includes('makan')) {
    return 'makanan'
  }
  if (lowerId === 'cat-trans' || lowerId === 'cat-transport' || lowerId === 'c-2' || lowerName.includes('trans')) {
    return 'transportasi'
  }
  if (lowerId === 'cat-tagih' || lowerId === 'cat-bills' || lowerId === 'c-3' || lowerName.includes('tagih')) {
    return 'tagihan'
  }
  if (lowerId === 'cat-belanja' || lowerId === 'cat-shopping' || lowerId === 'c-5' || lowerName.includes('belanja')) {
    return 'belanja'
  }
  if (lowerId === 'cat-hiburan' || lowerId === 'cat-entertainment' || lowerId === 'c-4' || lowerName.includes('hiburan')) {
    return 'hiburan'
  }
  return lowerId || lowerName || 'lainnya'
}

async function resolveUserId(req: Request): Promise<string> {
  // 1. Session token header or cookie
  const token = extractSessionToken(req)
  if (token) {
    const payload = verifySessionToken(token)
    if (payload?.userId) return payload.userId
  }

  // 2. Cookie header directly
  const cookieHeader = req.headers.get('cookie') || ''
  const match = cookieHeader.match(/tatadana_session=([^;]+)/) || cookieHeader.match(/tatadana_admin_session=([^;]+)/)
  if (match) {
    const payload = verifySessionToken(decodeURIComponent(match[1]))
    if (payload?.userId) return payload.userId
  }

  // 3. Header x-user-id
  const headerUserId = req.headers.get('x-user-id')
  if (headerUserId && PersistentStore.findUserById(headerUserId)) {
    return headerUserId
  }

  // 4. Supabase auth session
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch {
    // Auth fallback
  }

  return DEFAULT_USER_ID
}

// Compute start and end date for a period in WIB
function getDateRangeForPeriod(period: 'daily' | 'weekly' | 'monthly'): { startDate: string; endDate: string } {
  const todayStr = getISODateWIB()
  const now = getWIBDate()

  if (period === 'daily') {
    return { startDate: todayStr, endDate: todayStr }
  }

  if (period === 'weekly') {
    // Current week: Monday to Sunday in WIB
    const dayOfWeek = now.getDay() // 0 is Sunday, 1 is Monday
    const distanceToMonday = (dayOfWeek + 6) % 7
    const monday = new Date(now)
    monday.setDate(now.getDate() - distanceToMonday)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    return {
      startDate: getISODateWIB(monday),
      endDate: getISODateWIB(sunday),
    }
  }

  // Monthly: 1st of month to last day of month in WIB
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  return {
    startDate: getISODateWIB(firstDay),
    endDate: getISODateWIB(lastDay),
  }
}

// Ensure default budgets exist for a user in PersistentStore if not yet present
function ensureDefaultBudgetsForUser(userId: string): StoredBudget[] {
  const db = PersistentStore.read()
  if (!db.budgets) db.budgets = []

  const existingForUser = db.budgets.filter((b) => b.user_id === userId)
  if (existingForUser.length > 0) {
    return existingForUser
  }

  // Retrieve user's actual categories to bind budgets to existing category IDs
  const userCats = PersistentStore.getCategories(userId)
  const findCatId = (canonicalKey: string, fallbackId: string) => {
    const found = userCats.find((c) => getCanonicalCategoryKey(c.id, c.name) === canonicalKey)
    return found ? found.id : fallbackId
  }

  const makanId = findCatId('makanan', 'cat-makan')
  const transId = findCatId('transportasi', 'cat-trans')
  const tagihId = findCatId('tagihan', 'cat-tagih')
  const belanjaId = findCatId('belanja', 'cat-belanja')
  const hiburanId = findCatId('hiburan', 'cat-hiburan')

  const now = getWIBDate()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const nowIso = new Date().toISOString()

  const defaults: Array<{ category_id: string; period: 'daily' | 'weekly' | 'monthly'; amount: number }> = [
    // Daily limits
    { category_id: makanId, period: 'daily', amount: 75000 },
    { category_id: transId, period: 'daily', amount: 35000 },
    { category_id: tagihId, period: 'daily', amount: 50000 },
    { category_id: belanjaId, period: 'daily', amount: 50000 },
    { category_id: hiburanId, period: 'daily', amount: 25000 },

    // Weekly limits
    { category_id: makanId, period: 'weekly', amount: 500000 },
    { category_id: transId, period: 'weekly', amount: 200000 },
    { category_id: tagihId, period: 'weekly', amount: 350000 },
    { category_id: belanjaId, period: 'weekly', amount: 300000 },
    { category_id: hiburanId, period: 'weekly', amount: 150000 },

    // Monthly limits
    { category_id: makanId, period: 'monthly', amount: 2000000 },
    { category_id: transId, period: 'monthly', amount: 1000000 },
    { category_id: tagihId, period: 'monthly', amount: 2000000 },
    { category_id: belanjaId, period: 'monthly', amount: 1500000 },
    { category_id: hiburanId, period: 'monthly', amount: 800000 },
  ]

  const createdBudgets: StoredBudget[] = defaults.map((d) => ({
    id: `b-${d.period[0]}-${crypto.randomUUID().slice(0, 8)}`,
    user_id: userId,
    category_id: d.category_id,
    period: d.period,
    limit_amount: d.amount,
    amount: d.amount,
    month: currentMonth,
    year: currentYear,
    alert_80_sent: false,
    alert_100_sent: false,
    created_at: nowIso,
    updated_at: nowIso,
  }))

  db.budgets.push(...createdBudgets)
  PersistentStore.write(db)
  return createdBudgets
}

// Fetch spent amounts per category from real transactions ledger
async function calculateCategorySpent(
  userId: string,
  startDate: string,
  endDate: string,
  categoryMap: Map<string, { id: string; name: string; emoji: string; color: string }>
): Promise<Record<string, number>> {
  const spentMap: Record<string, number> = {}

  // 1. Calculate from persistent ledger (Single Source of Truth)
  const txs = PersistentStore.getTransactions(userId, {
    start_date: startDate,
    end_date: endDate,
    type: 'expense',
  })

  for (const tx of txs) {
    if (tx.category_id) {
      const rawId = tx.category_id
      spentMap[rawId] = (spentMap[rawId] || 0) + tx.amount

      // Also index by canonical key so category aliases/UUIDs match seamlessly
      const catObj = categoryMap.get(rawId)
      const canonKey = getCanonicalCategoryKey(rawId, catObj?.name)
      spentMap[canonKey] = (spentMap[canonKey] || 0) + tx.amount
    }
  }

  // 2. Fallback to Supabase if local transactions are empty
  if (txs.length === 0) {
    try {
      const admin = createAdminClient()
      const { data: dbTxs, error } = await admin
        .from('transactions')
        .select('category_id, amount, date, type')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .gte('date', startDate)
        .lte('date', endDate)

      if (!error && dbTxs && dbTxs.length > 0) {
        for (const tx of dbTxs) {
          if (tx.category_id) {
            const rawId = tx.category_id
            spentMap[rawId] = (spentMap[rawId] || 0) + Number(tx.amount)
            const catObj = categoryMap.get(rawId)
            const canonKey = getCanonicalCategoryKey(rawId, catObj?.name)
            spentMap[canonKey] = (spentMap[canonKey] || 0) + Number(tx.amount)
          }
        }
      }
    } catch {
      // Supabase query fallback
    }
  }

  return spentMap
}

export async function GET(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const { searchParams } = new URL(req.url)
    const rawPeriod = searchParams.get('period') || 'monthly'
    const period: 'daily' | 'weekly' | 'monthly' = ['daily', 'weekly', 'monthly'].includes(rawPeriod)
      ? (rawPeriod as any)
      : 'monthly'

    const { startDate, endDate } = getDateRangeForPeriod(period)

    // Build comprehensive category map
    const categoryMap = new Map<string, { id: string; name: string; emoji: string; color: string }>()
    for (const [id, val] of Object.entries(standardCategories)) {
      categoryMap.set(id, val)
    }

    const allDbCats = PersistentStore.read().categories || []
    for (const c of allDbCats) {
      categoryMap.set(c.id, { id: c.id, name: c.name, emoji: c.emoji || '🏷️', color: c.color || '#10b981' })
    }

    const userCats = PersistentStore.getCategories(userId)
    for (const c of userCats) {
      categoryMap.set(c.id, { id: c.id, name: c.name, emoji: c.emoji || '🏷️', color: c.color || '#10b981' })
    }

    // Read budgets from PersistentStore (using getBudgets method or direct read with default seeding)
    let userBudgets: StoredBudget[] = []
    if (typeof (PersistentStore as any).getBudgets === 'function') {
      userBudgets = (PersistentStore as any).getBudgets(userId, period)
    }
    if (!userBudgets || userBudgets.length === 0) {
      const allUserBudgets = ensureDefaultBudgetsForUser(userId)
      userBudgets = allUserBudgets.filter((b) => b.period === period)
    }

    // Compute spent amounts from ledger
    const spentMap = await calculateCategorySpent(userId, startDate, endDate, categoryMap)

    const now = getWIBDate()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    const result = userBudgets.map((b) => {
      const limit = Math.round(Number(b.limit_amount ?? b.amount) || 0)
      const cat = categoryMap.get(b.category_id)
      const catName = cat?.name || 'Kategori'
      const catEmoji = cat?.emoji || '🏷️'
      const catColor = cat?.color || '#10b981'

      const catCanonKey = getCanonicalCategoryKey(b.category_id, catName)
      const spent = Math.round(spentMap[b.category_id] || spentMap[catCanonKey] || 0)
      const remaining = limit - spent

      const rawRatio = limit > 0 ? (spent / limit) : 0
      const percentage = limit > 0 ? Number(((spent / limit) * 100).toFixed(1)) : 0

      let status: 'safe' | 'warning' | 'overbudget' = 'safe'
      if (rawRatio >= 1.0 || spent >= limit) {
        status = 'overbudget'
      } else if (rawRatio >= 0.8 && rawRatio < 1.0) {
        status = 'warning'
      } else {
        status = 'safe'
      }

      return {
        id: b.id,
        user_id: b.user_id,
        category_id: b.category_id,
        category_name: catName,
        category_emoji: catEmoji,
        category_color: catColor,
        period: b.period,
        limit_amount: limit,
        spent_amount: spent,
        percentage,
        status,
        // UI & Backward Compatibility fields
        limit,
        spent,
        remaining,
        category: {
          id: b.category_id,
          name: catName,
          emoji: catEmoji,
          color: catColor,
        },
        month: b.month || currentMonth,
        year: b.year || currentYear,
        startDate,
        endDate,
      }
    })

    return NextResponse.json({
      success: true,
      period,
      startDate,
      endDate,
      data: result,
      summary: {
        total_limit: result.reduce((acc, c) => acc + c.limit_amount, 0),
        total_spent: result.reduce((acc, c) => acc + c.spent_amount, 0),
        overbudget_count: result.filter((c) => c.status === 'overbudget').length,
        warning_count: result.filter((c) => c.status === 'warning').length,
      },
    })
  } catch (error: any) {
    console.error('Error in GET /api/budgets:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const body = await req.json()
    const { category_id, period = 'monthly', amount, limit_amount } = body

    if (!category_id) {
      return NextResponse.json({ success: false, message: 'Category ID wajib diisi.' }, { status: 400 })
    }

    const rawAmount = amount !== undefined ? amount : limit_amount
    if (rawAmount === undefined || isNaN(Number(rawAmount)) || Number(rawAmount) < 0) {
      return NextResponse.json({ success: false, message: 'Nominal limit harus angka >= 0.' }, { status: 400 })
    }

    const validPeriod: 'daily' | 'weekly' | 'monthly' = ['daily', 'weekly', 'monthly'].includes(period)
      ? period
      : 'monthly'

    const numAmount = Math.round(Number(rawAmount))
    const now = getWIBDate()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const nowIso = new Date().toISOString()

    // 1. Persist to PersistentStore
    let updatedItem: StoredBudget | null = null

    if (typeof (PersistentStore as any).upsertBudget === 'function') {
      updatedItem = (PersistentStore as any).upsertBudget({
        user_id: userId,
        category_id,
        period: validPeriod,
        amount: numAmount,
      })
    } else {
      const db = PersistentStore.read()
      if (!db.budgets) db.budgets = []

      const index = db.budgets.findIndex(
        (b) => b.user_id === userId && b.category_id === category_id && b.period === validPeriod
      )

      if (index !== -1) {
        db.budgets[index].amount = numAmount
        db.budgets[index].limit_amount = numAmount
        db.budgets[index].month = currentMonth
        db.budgets[index].year = currentYear
        db.budgets[index].updated_at = nowIso
        updatedItem = db.budgets[index]
      } else {
        const newBudget: StoredBudget = {
          id: `b-${validPeriod[0]}-${crypto.randomUUID().slice(0, 8)}`,
          user_id: userId,
          category_id,
          period: validPeriod,
          limit_amount: numAmount,
          amount: numAmount,
          month: currentMonth,
          year: currentYear,
          alert_80_sent: false,
          alert_100_sent: false,
          created_at: nowIso,
          updated_at: nowIso,
        }
        db.budgets.push(newBudget)
        updatedItem = newBudget
      }
      PersistentStore.write(db)
    }

    // 2. Try Supabase upsert
    try {
      const admin = createAdminClient()
      await admin.from('budgets').upsert(
        {
          user_id: userId,
          category_id,
          amount: numAmount,
          month: currentMonth,
          year: currentYear,
          updated_at: nowIso,
        },
        { onConflict: 'user_id, category_id, month, year' }
      )
    } catch {
      // Supabase fallback
    }

    return NextResponse.json({
      success: true,
      message: `Batas anggaran ${validPeriod} berhasil disimpan!`,
      data: updatedItem,
    })
  } catch (error: any) {
    console.error('Error in POST /api/budgets:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  return POST(req)
}

export async function DELETE(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const categoryId = searchParams.get('category_id')
    const period = searchParams.get('period')

    const db = PersistentStore.read()
    if (!db.budgets) db.budgets = []

    let removed = false
    if (id) {
      const idx = db.budgets.findIndex((b) => b.id === id && b.user_id === userId)
      if (idx !== -1) {
        db.budgets.splice(idx, 1)
        removed = true
      }
    } else if (categoryId && period) {
      const idx = db.budgets.findIndex(
        (b) => b.category_id === categoryId && b.period === period && b.user_id === userId
      )
      if (idx !== -1) {
        db.budgets.splice(idx, 1)
        removed = true
      }
    }

    if (removed) {
      PersistentStore.write(db)
    }

    return NextResponse.json({ success: true, message: 'Batas anggaran berhasil dihapus.' })
  } catch (error: any) {
    console.error('Error in DELETE /api/budgets:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
