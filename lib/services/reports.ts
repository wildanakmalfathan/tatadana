import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Transaction, Category, Wallet } from '@/types/database'

export interface ReportFilter {
  startDate?: string
  endDate?: string
  walletId?: string
  categoryId?: string
  type?: 'income' | 'expense' | 'transfer' | 'all'
  search?: string
}

export interface ReportSummary {
  period: {
    startDate: string
    endDate: string
  }
  totalIncome: number
  totalExpense: number
  netCashflow: number
  transactionCount: number
  topExpenseCategories: {
    categoryId: string
    name: string
    emoji: string
    color: string
    amount: number
    percentage: number
    count: number
  }[]
  walletBalances: {
    walletId: string
    name: string
    type: string
    balance: number
    icon: string
  }[]
}

export interface TransactionsQueryOptions extends ReportFilter {
  page?: number
  limit?: number
  sortBy?: 'date' | 'amount' | 'created_at'
  sortOrder?: 'asc' | 'desc'
}

export class ReportsService {
  /**
   * Mengambil ringkasan laporan finansial (Total In/Out, Net Cashflow, Top Kategori)
   */
  static async getSummary(userId: string, filter: ReportFilter): Promise<ReportSummary> {
    const supabase = await createServerSupabaseClient()

    let query = supabase
      .from('transactions')
      .select(`
        id,
        type,
        amount,
        date,
        time,
        notes,
        category_id,
        wallet_id,
        categories (id, name, emoji, color),
        wallets (id, name, type, icon, balance)
      `)
      .eq('user_id', userId)

    if (filter.startDate) {
      query = query.gte('date', filter.startDate)
    }
    if (filter.endDate) {
      query = query.lte('date', filter.endDate)
    }
    if (filter.walletId && filter.walletId !== 'all') {
      query = query.eq('wallet_id', filter.walletId)
    }
    if (filter.categoryId && filter.categoryId !== 'all') {
      query = query.eq('category_id', filter.categoryId)
    }
    if (filter.type && filter.type !== 'all') {
      query = query.eq('type', filter.type)
    }
    if (filter.search && filter.search.trim()) {
      query = query.ilike('notes', `%${filter.search.trim()}%`)
    }

    const { data: rawTx, error } = await query

    if (error) {
      console.error('Error fetching report transactions:', error)
      throw new Error('Gagal mengambil data laporan transaksi.')
    }

    const transactions = rawTx || []

    let totalIncome = 0
    let totalExpense = 0
    const categoryExpenseMap = new Map<
      string,
      { id: string; name: string; emoji: string; color: string; amount: number; count: number }
    >()

    for (const tx of transactions) {
      const amount = Number(tx.amount) || 0
      if (tx.type === 'income') {
        totalIncome += amount
      } else if (tx.type === 'expense') {
        totalExpense += amount
        const cat = (tx as any).categories
        const catId = cat?.id || 'uncategorized'
        const catName = cat?.name || 'Lainnya'
        const catEmoji = cat?.emoji || '🏷️'
        const catColor = cat?.color || '#94A3B8'

        if (!categoryExpenseMap.has(catId)) {
          categoryExpenseMap.set(catId, {
            id: catId,
            name: catName,
            emoji: catEmoji,
            color: catColor,
            amount: 0,
            count: 0,
          })
        }

        const current = categoryExpenseMap.get(catId)!
        current.amount += amount
        current.count += 1
      }
    }

    // Top 5 Expense Categories
    const topExpenseCategories = Array.from(categoryExpenseMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((cat) => ({
        categoryId: cat.id,
        name: cat.name,
        emoji: cat.emoji,
        color: cat.color,
        amount: cat.amount,
        percentage: totalExpense > 0 ? Math.round((cat.amount / totalExpense) * 100) : 0,
        count: cat.count,
      }))

    // Fetch user wallets for current balance breakdown
    const { data: walletsData } = await supabase
      .from('wallets')
      .select('id, name, type, balance, icon')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })

    const walletBalances = (walletsData || []).map((w) => ({
      walletId: w.id,
      name: w.name,
      type: w.type,
      balance: Number(w.balance) || 0,
      icon: w.icon || '👛',
    }))

    return {
      period: {
        startDate: filter.startDate || '',
        endDate: filter.endDate || '',
      },
      totalIncome,
      totalExpense,
      netCashflow: totalIncome - totalExpense,
      transactionCount: transactions.length,
      topExpenseCategories,
      walletBalances,
    }
  }

  /**
   * Mengambil daftar transaksi dengan pagination, sorting, dan multi-item receipt
   */
  static async getTransactions(
    userId: string,
    options: TransactionsQueryOptions = {}
  ): Promise<{ transactions: Transaction[]; totalCount: number; page: number; limit: number }> {
    const supabase = await createServerSupabaseClient()
    const page = options.page || 1
    const limit = options.limit || 15
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('transactions')
      .select(
        `
        *,
        wallet:wallets!transactions_wallet_id_fkey(id, name, type, icon, color),
        destination_wallet:wallets!transactions_destination_wallet_id_fkey(id, name, type, icon, color),
        category:categories(id, name, emoji, color),
        items:transaction_items(id, item_name, quantity, price, category_id)
      `,
        { count: 'exact' }
      )
      .eq('user_id', userId)

    if (options.startDate) {
      query = query.gte('date', options.startDate)
    }
    if (options.endDate) {
      query = query.lte('date', options.endDate)
    }
    if (options.walletId && options.walletId !== 'all') {
      query = query.eq('wallet_id', options.walletId)
    }
    if (options.categoryId && options.categoryId !== 'all') {
      query = query.eq('category_id', options.categoryId)
    }
    if (options.type && options.type !== 'all') {
      query = query.eq('type', options.type)
    }
    if (options.search && options.search.trim()) {
      query = query.ilike('notes', `%${options.search.trim()}%`)
    }

    const sortBy = options.sortBy || 'date'
    const sortOrder = options.sortOrder || 'desc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    if (sortBy === 'date') {
      query = query.order('time', { ascending: sortOrder === 'asc' })
    }

    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      console.error('Error fetching transactions:', error)
      throw new Error('Gagal mengambil daftar transaksi.')
    }

    return {
      transactions: (data as any) || [],
      totalCount: count || 0,
      page,
      limit,
    }
  }

  /**
   * Mengambil semua transaksi untuk keperluan export file PDF & Excel
   */
  static async getAllTransactionsForExport(
    userId: string,
    filter: ReportFilter
  ): Promise<Transaction[]> {
    const supabase = createAdminClient()

    let query = supabase
      .from('transactions')
      .select(
        `
        *,
        wallet:wallets!transactions_wallet_id_fkey(id, name, type, icon, color),
        destination_wallet:wallets!transactions_destination_wallet_id_fkey(id, name, type, icon, color),
        category:categories(id, name, emoji, color),
        items:transaction_items(id, item_name, quantity, price, category_id)
      `
      )
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('time', { ascending: false })

    if (filter.startDate) {
      query = query.gte('date', filter.startDate)
    }
    if (filter.endDate) {
      query = query.lte('date', filter.endDate)
    }
    if (filter.walletId && filter.walletId !== 'all') {
      query = query.eq('wallet_id', filter.walletId)
    }
    if (filter.categoryId && filter.categoryId !== 'all') {
      query = query.eq('category_id', filter.categoryId)
    }
    if (filter.type && filter.type !== 'all') {
      query = query.eq('type', filter.type)
    }
    if (filter.search && filter.search.trim()) {
      query = query.ilike('notes', `%${filter.search.trim()}%`)
    }

    const { data, error } = await query
    if (error) {
      console.error('Error export query:', error)
      throw new Error('Gagal mengambil data untuk export.')
    }

    return (data as any) || []
  }
}
