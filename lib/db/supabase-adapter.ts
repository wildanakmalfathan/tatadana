/**
 * lib/db/supabase-adapter.ts
 * Supabase PostgreSQL Direct Cloud Persistence Adapter for TataDana
 * Handles direct read and write operations to Supabase PostgreSQL cloud database.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import {
  StoredUser,
  StoredWallet,
  StoredCategory,
  StoredTransaction,
  StoredBudget,
  StoredAuditLog,
  StoredPaymentTransaction,
  DatabaseSchema,
} from './store'

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return false
  if (url.includes('placeholder') || key.includes('placeholder')) return false
  return true
}

export class SupabaseAdapter {
  /**
   * Persists or updates a user in Supabase
   */
  public static async writeUser(user: StoredUser): Promise<void> {
    if (!isSupabaseConfigured()) return
    try {
      const client = createAdminClient()
      const payload: any = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        password_hash: user.password_hash,
        role: user.role,
        plan: user.plan,
        status: user.status,
        telegram_chat_id: user.telegram_chat_id || null,
        telegram_username: user.telegram_username || null,
        telegram_bot_token: user.telegram_bot_token || null,
        telegram_connected: !!user.telegram_connected,
        telegram_connected_at: user.telegram_connected_at || null,
        avatar_url: user.avatar_url || null,
        avatar_type: user.avatar_type || 'emoji',
        monthly_tx_count: user.monthly_tx_count || 0,
        last_seen_at: user.last_seen_at || null,
        created_at: user.created_at,
        updated_at: user.updated_at,
      }
      const { error } = await client.from('users').upsert(payload, { onConflict: 'id' })
      if (error) console.error('[SupabaseAdapter.writeUser] Error:', error.message)
    } catch (err: any) {
      console.error('[SupabaseAdapter.writeUser] Exception:', err.message)
    }
  }

  /**
   * Persists or updates a wallet in Supabase
   */
  public static async writeWallet(wallet: StoredWallet): Promise<void> {
    if (!isSupabaseConfigured()) return
    try {
      const client = createAdminClient()
      const payload: any = {
        id: wallet.id,
        user_id: wallet.user_id,
        name: wallet.name,
        type: wallet.type,
        balance: wallet.balance,
        account_number: wallet.account_number || null,
        is_default: !!wallet.is_default,
        is_default_telegram: !!wallet.is_default_telegram,
        icon: wallet.icon || '👛',
        color: wallet.color || '#10B981',
        is_archived: !!wallet.is_archived,
        created_at: wallet.created_at,
        updated_at: wallet.updated_at,
      }
      const { error } = await client.from('wallets').upsert(payload, { onConflict: 'id' })
      if (error) console.error('[SupabaseAdapter.writeWallet] Error:', error.message)
    } catch (err: any) {
      console.error('[SupabaseAdapter.writeWallet] Exception:', err.message)
    }
  }

  /**
   * Deletes or archives a wallet in Supabase
   */
  public static async deleteWallet(walletId: string): Promise<void> {
    if (!isSupabaseConfigured()) return
    try {
      const client = createAdminClient()
      const { error } = await client.from('wallets').delete().eq('id', walletId)
      if (error) console.error('[SupabaseAdapter.deleteWallet] Error:', error.message)
    } catch (err: any) {
      console.error('[SupabaseAdapter.deleteWallet] Exception:', err.message)
    }
  }

  /**
   * Persists or updates a category in Supabase
   */
  public static async writeCategory(category: StoredCategory): Promise<void> {
    if (!isSupabaseConfigured()) return
    try {
      const client = createAdminClient()
      const payload: any = {
        id: category.id,
        user_id: category.user_id,
        name: category.name,
        type: category.type,
        emoji: category.emoji || '🏷️',
        color: category.color || '#10B981',
        budget_amount: category.budget_amount || 0,
        is_system: !!category.is_system,
        is_archived: !!category.is_archived,
        created_at: category.created_at,
        updated_at: category.updated_at,
      }
      const { error } = await client.from('categories').upsert(payload, { onConflict: 'id' })
      if (error) console.error('[SupabaseAdapter.writeCategory] Error:', error.message)
    } catch (err: any) {
      console.error('[SupabaseAdapter.writeCategory] Exception:', err.message)
    }
  }

  /**
   * Deletes a category in Supabase
   */
  public static async deleteCategory(categoryId: string): Promise<void> {
    if (!isSupabaseConfigured()) return
    try {
      const client = createAdminClient()
      const { error } = await client.from('categories').delete().eq('id', categoryId)
      if (error) console.error('[SupabaseAdapter.deleteCategory] Error:', error.message)
    } catch (err: any) {
      console.error('[SupabaseAdapter.deleteCategory] Exception:', err.message)
    }
  }

  /**
   * Persists or updates a transaction in Supabase
   */
  public static async writeTransaction(tx: StoredTransaction): Promise<void> {
    if (!isSupabaseConfigured()) return
    try {
      const client = createAdminClient()
      const payload: any = {
        id: tx.id,
        user_id: tx.user_id,
        wallet_id: tx.wallet_id || null,
        destination_wallet_id: tx.destination_wallet_id || null,
        category_id: tx.category_id || null,
        amount: tx.amount,
        type: tx.type,
        date: tx.date,
        time: tx.time,
        notes: tx.notes || null,
        source: tx.source || 'web',
        idempotency_key: tx.idempotency_key || null,
        telegram_message_id: tx.telegram_message_id || null,
        raw_input: tx.raw_input || null,
        receipt_image_url: tx.receipt_image_url || null,
        is_multi_item: !!tx.is_multi_item,
        created_at: tx.created_at,
        updated_at: tx.updated_at,
      }
      const { error } = await client.from('transactions').upsert(payload, { onConflict: 'id' })
      if (error) console.error('[SupabaseAdapter.writeTransaction] Error:', error.message)
    } catch (err: any) {
      console.error('[SupabaseAdapter.writeTransaction] Exception:', err.message)
    }
  }

  /**
   * Deletes a transaction in Supabase
   */
  public static async deleteTransaction(txId: string): Promise<void> {
    if (!isSupabaseConfigured()) return
    try {
      const client = createAdminClient()
      const { error } = await client.from('transactions').delete().eq('id', txId)
      if (error) console.error('[SupabaseAdapter.deleteTransaction] Error:', error.message)
    } catch (err: any) {
      console.error('[SupabaseAdapter.deleteTransaction] Exception:', err.message)
    }
  }

  /**
   * Persists or updates a budget limit in Supabase
   */
  public static async writeBudget(budget: StoredBudget): Promise<void> {
    if (!isSupabaseConfigured()) return
    try {
      const client = createAdminClient()
      const payload: any = {
        id: budget.id,
        user_id: budget.user_id,
        category_id: budget.category_id,
        period: budget.period,
        amount: budget.limit_amount || budget.amount || 0,
        month: budget.month || new Date().getMonth() + 1,
        year: budget.year || new Date().getFullYear(),
        alert_80_sent: !!budget.alert_80_sent,
        alert_100_sent: !!budget.alert_100_sent,
        created_at: budget.created_at,
        updated_at: budget.updated_at,
      }
      const { error } = await client.from('budgets').upsert(payload, { onConflict: 'id' })
      if (error) console.error('[SupabaseAdapter.writeBudget] Error:', error.message)
    } catch (err: any) {
      console.error('[SupabaseAdapter.writeBudget] Exception:', err.message)
    }
  }

  /**
   * Deletes a budget limit in Supabase
   */
  public static async deleteBudget(budgetId: string): Promise<void> {
    if (!isSupabaseConfigured()) return
    try {
      const client = createAdminClient()
      const { error } = await client.from('budgets').delete().eq('id', budgetId)
      if (error) console.error('[SupabaseAdapter.deleteBudget] Error:', error.message)
    } catch (err: any) {
      console.error('[SupabaseAdapter.deleteBudget] Exception:', err.message)
    }
  }

  /**
   * Writes an audit log entry to Supabase
   */
  public static async writeAuditLog(log: StoredAuditLog): Promise<void> {
    if (!isSupabaseConfigured()) return
    try {
      const client = createAdminClient()
      const payload: any = {
        id: log.id,
        admin_id: log.admin_id,
        action: log.action,
        target_user_id: log.target_user_id || null,
        reason: log.reason || null,
        metadata: log.metadata || null,
        created_at: log.created_at,
      }
      const { error } = await client.from('audit_logs').insert(payload)
      if (error) console.error('[SupabaseAdapter.writeAuditLog] Error:', error.message)
    } catch (err: any) {
      console.error('[SupabaseAdapter.writeAuditLog] Exception:', err.message)
    }
  }

  /**
   * Persists or updates a payment transaction in Supabase
   */
  public static async writePayment(payment: StoredPaymentTransaction): Promise<void> {
    if (!isSupabaseConfigured()) return
    try {
      const client = createAdminClient()
      const payload: any = {
        id: payment.id,
        user_id: payment.user_id,
        order_id: payment.order_id,
        plan: payment.plan,
        amount: payment.amount,
        status: payment.status,
        payment_method: payment.payment_method,
        proof_image_url: payment.proof_image_url || null,
        approved_by: payment.approved_by || null,
        approved_at: payment.approved_at || null,
        midtrans_response: payment.midtrans_response || null,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
      }
      const { error } = await client.from('payment_transactions').upsert(payload, { onConflict: 'id' })
      if (error) console.error('[SupabaseAdapter.writePayment] Error:', error.message)
    } catch (err: any) {
      console.error('[SupabaseAdapter.writePayment] Exception:', err.message)
    }
  }

  /**
   * Fetches the entire database state from Supabase
   */
  public static async fetchFullDatabase(): Promise<DatabaseSchema | null> {
    if (!isSupabaseConfigured()) return null
    try {
      const client = createAdminClient()
      const [
        { data: users, error: errUsers },
        { data: wallets, error: errWallets },
        { data: categories, error: errCategories },
        { data: transactions, error: errTransactions },
        { data: budgets, error: errBudgets },
        { data: audit_logs, error: errAuditLogs },
        { data: payments, error: errPayments },
      ] = await Promise.all([
        client.from('users').select('*'),
        client.from('wallets').select('*'),
        client.from('categories').select('*'),
        client.from('transactions').select('*'),
        client.from('budgets').select('*'),
        client.from('audit_logs').select('*'),
        client.from('payment_transactions').select('*'),
      ])

      if (errUsers || errWallets || errCategories || errTransactions) {
        console.warn('[SupabaseAdapter.fetchFullDatabase] Error querying Supabase:', {
          errUsers,
          errWallets,
          errCategories,
          errTransactions,
        })
        return null
      }

      const formattedWallets: StoredWallet[] = (wallets || []).map((w: any) => ({
        id: w.id,
        user_id: w.user_id,
        name: w.name,
        type: w.type,
        balance: Math.round(Number(w.balance) || 0),
        account_number: w.account_number || null,
        is_default: !!w.is_default,
        is_default_telegram: !!w.is_default_telegram,
        icon: w.icon || '👛',
        color: w.color || '#10B981',
        is_archived: !!w.is_archived,
        created_at: w.created_at,
        updated_at: w.updated_at,
      }))

      const formattedCategories: StoredCategory[] = (categories || []).map((c: any) => ({
        id: c.id,
        user_id: c.user_id,
        name: c.name,
        type: c.type,
        emoji: c.emoji || '🏷️',
        color: c.color || '#10B981',
        budget_amount: Math.round(Number(c.budget_amount) || 0),
        is_system: !!c.is_system,
        is_archived: !!c.is_archived,
        created_at: c.created_at,
        updated_at: c.updated_at,
      }))

      const formattedTransactions: StoredTransaction[] = (transactions || []).map((t: any) => ({
        id: t.id,
        user_id: t.user_id,
        wallet_id: t.wallet_id || null,
        destination_wallet_id: t.destination_wallet_id || null,
        category_id: t.category_id || null,
        amount: Math.round(Number(t.amount) || 0),
        type: t.type,
        date: t.date,
        time: t.time,
        notes: t.notes || null,
        source: t.source || 'web',
        idempotency_key: t.idempotency_key || null,
        telegram_message_id: t.telegram_message_id ? Number(t.telegram_message_id) : null,
        raw_input: t.raw_input || null,
        receipt_image_url: t.receipt_image_url || null,
        is_multi_item: !!t.is_multi_item,
        created_at: t.created_at,
        updated_at: t.updated_at,
      }))

      const formattedBudgets: StoredBudget[] = (budgets || []).map((b: any) => ({
        id: b.id,
        user_id: b.user_id,
        category_id: b.category_id,
        period: b.period,
        limit_amount: Math.round(Number(b.amount) || 0),
        month: b.month,
        year: b.year,
        alert_80_sent: !!b.alert_80_sent,
        alert_100_sent: !!b.alert_100_sent,
        created_at: b.created_at,
        updated_at: b.updated_at,
      }))

      return {
        version: 1,
        users: (users as StoredUser[]) || [],
        wallets: formattedWallets,
        categories: formattedCategories,
        transactions: formattedTransactions,
        budgets: formattedBudgets,
        audit_logs: (audit_logs as StoredAuditLog[]) || [],
        payment_transactions: (payments as StoredPaymentTransaction[]) || [],
      }
    } catch (err: any) {
      console.error('[SupabaseAdapter.fetchFullDatabase] Exception:', err.message)
      return null
    }
  }

  /**
   * Syncs an entire DatabaseSchema to Supabase in batches
   */
  public static async syncDatabase(schema: DatabaseSchema): Promise<void> {
    if (!isSupabaseConfigured()) return
    try {
      for (const u of schema.users) {
        await this.writeUser(u)
      }
      for (const w of schema.wallets) {
        await this.writeWallet(w)
      }
      for (const c of schema.categories) {
        await this.writeCategory(c)
      }
      for (const t of schema.transactions) {
        await this.writeTransaction(t)
      }
      for (const b of schema.budgets) {
        await this.writeBudget(b)
      }
      for (const p of schema.payment_transactions) {
        await this.writePayment(p)
      }
      for (const a of schema.audit_logs) {
        await this.writeAuditLog(a)
      }
    } catch (err: any) {
      console.error('[SupabaseAdapter.syncDatabase] Exception:', err.message)
    }
  }
}
