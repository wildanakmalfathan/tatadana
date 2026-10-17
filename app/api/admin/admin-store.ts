import { createAdminClient } from '@/lib/supabase/admin'
import { PersistentStore, OFFICIAL_SUPERADMIN_ID, StoredUser } from '@/lib/db/store'

export interface AdminUserRecord {
  id: string
  name: string
  full_name: string
  email: string
  phone: string
  plan: 'starter' | 'pro' | 'pro_lifetime'
  status: 'pending_approval' | 'active' | 'rejected' | 'suspended'
  role: 'user' | 'admin'
  telegram_connected: boolean
  telegram_username: string | null
  monthly_tx_count: number
  last_seen_at?: string | null
  created_at: string
  updated_at?: string
}

export interface AdminPaymentRecord {
  id: string
  order_id: string
  user_id: string
  user_name: string
  user_phone: string
  plan: 'starter' | 'pro' | 'pro_lifetime'
  amount: number
  payment_method: 'midtrans' | 'manual_transfer'
  status: 'pending' | 'approved' | 'rejected' | 'settlement' | 'expire' | 'cancel'
  proof_image_url?: string | null
  approved_by?: string | null
  approved_at?: string | null
  created_at: string
  updated_at?: string
}

export interface AdminAuditRecord {
  id: string
  admin_id: string
  action: string
  target_user_id?: string | null
  reason?: string | null
  metadata?: any
  created_at: string
}

export class AdminStore {
  /**
   * Fetches all registered users from PersistentStore, merged with Supabase if configured.
   */
  static async getUsers(): Promise<AdminUserRecord[]> {
    // 1. Always read from PersistentStore (our single source of truth)
    const persistentUsers = PersistentStore.getUsers()
    const usersMap = new Map<string, AdminUserRecord>()

    for (const u of persistentUsers) {
      usersMap.set(u.id, {
        id: u.id,
        name: u.name,
        full_name: u.name,
        email: u.email,
        phone: u.phone,
        plan: u.plan,
        status: u.status,
        role: u.role,
        telegram_connected: !!u.telegram_connected,
        telegram_username: u.telegram_username || null,
        monthly_tx_count: u.monthly_tx_count || 0,
        last_seen_at: u.last_seen_at || null,
        created_at: u.created_at,
        updated_at: u.updated_at,
      })
    }

    // 2. Try Supabase merge if available
    try {
      const admin = createAdminClient()
      const { data, error } = await admin.from('users').select('*').order('created_at', { ascending: false })
      if (!error && data && data.length > 0) {
        for (const u of data) {
          if (!usersMap.has(u.id)) {
            usersMap.set(u.id, {
              id: u.id,
              name: u.name,
              full_name: u.name,
              email: u.email || '',
              phone: u.phone || '-',
              plan: u.plan || 'starter',
              status: u.status || 'active',
              role: u.role || 'user',
              telegram_connected: !!u.telegram_connected,
              telegram_username: u.telegram_username,
              monthly_tx_count: u.monthly_tx_count || 0,
              created_at: u.created_at,
            })
          }
        }
      }
    } catch {
      // Supabase unavailable; PersistentStore used
    }

    return Array.from(usersMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  /**
   * Updates user status, plan, or role in PersistentStore and Supabase
   */
  static async updateUser(
    userId: string,
    updates: {
      status?: 'pending_approval' | 'active' | 'rejected' | 'suspended'
      plan?: 'starter' | 'pro' | 'pro_lifetime'
      role?: 'user' | 'admin'
    },
    adminId: string = OFFICIAL_SUPERADMIN_ID
  ): Promise<AdminUserRecord | null> {
    const updatedUser = PersistentStore.updateUser(userId, updates)

    // Sync with Supabase if active
    try {
      const admin = createAdminClient()
      const dbUpdates: any = {}
      if (updates.status) dbUpdates.status = updates.status
      if (updates.plan) dbUpdates.plan = updates.plan
      if (updates.role) dbUpdates.role = updates.role
      await admin.from('users').update(dbUpdates).eq('id', userId)
    } catch {
      // Supabase offline
    }

    // Write audit log
    PersistentStore.addAuditLog({
      admin_id: adminId,
      action: 'user_update',
      target_user_id: userId,
      reason: `Admin updated user attributes: ${JSON.stringify(updates)}`,
      metadata: updates,
    })

    if (!updatedUser) return null

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      full_name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      plan: updatedUser.plan,
      status: updatedUser.status,
      role: updatedUser.role,
      telegram_connected: !!updatedUser.telegram_connected,
      telegram_username: updatedUser.telegram_username || null,
      monthly_tx_count: updatedUser.monthly_tx_count || 0,
      last_seen_at: updatedUser.last_seen_at || null,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at,
    }
  }

  /**
   * Fetches payment transactions from PersistentStore and Supabase
   */
  static async getPayments(): Promise<AdminPaymentRecord[]> {
    const persistentPayments = PersistentStore.getPayments()
    const paymentsMap = new Map<string, AdminPaymentRecord>()

    for (const p of persistentPayments) {
      const user = PersistentStore.findUserById(p.user_id)
      paymentsMap.set(p.id, {
        id: p.id,
        order_id: p.order_id,
        user_id: p.user_id,
        user_name: user ? user.name : 'User',
        user_phone: user ? user.phone : '-',
        plan: p.plan,
        amount: p.amount,
        payment_method: p.payment_method,
        status: p.status,
        proof_image_url: p.proof_image_url,
        approved_by: p.approved_by,
        approved_at: p.approved_at,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })
    }

    // Check Supabase
    try {
      const admin = createAdminClient()
      const { data, error } = await admin
        .from('payment_transactions')
        .select(`*, user:users(id, name, phone)`)
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        for (const p of data) {
          if (!paymentsMap.has(p.id)) {
            paymentsMap.set(p.id, {
              id: p.id,
              order_id: p.order_id,
              user_id: p.user_id,
              user_name: p.user?.name || 'User',
              user_phone: p.user?.phone || '-',
              plan: p.plan || 'pro',
              amount: Number(p.amount) || 0,
              payment_method: p.payment_method || 'manual_transfer',
              status: p.status,
              proof_image_url: p.proof_image_url,
              approved_by: p.approved_by,
              approved_at: p.approved_at,
              created_at: p.created_at,
            })
          }
        }
      }
    } catch {
      // Supabase offline
    }

    return Array.from(paymentsMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  /**
   * Approves a payment and upgrades the user to Pro
   */
  static async approvePayment(
    paymentId: string,
    adminId: string = OFFICIAL_SUPERADMIN_ID
  ): Promise<{ payment: AdminPaymentRecord; user?: AdminUserRecord } | null> {
    const updatedPayment = PersistentStore.updatePayment(paymentId, { status: 'approved' }, adminId)
    if (!updatedPayment) return null

    const user = PersistentStore.findUserById(updatedPayment.user_id)

    // Sync Supabase
    try {
      const admin = createAdminClient()
      await admin
        .from('payment_transactions')
        .update({
          status: 'approved',
          approved_by: adminId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId)

      await admin.from('users').update({ plan: 'pro' }).eq('id', updatedPayment.user_id)
      await admin.from('profiles').update({ plan: 'pro' }).eq('id', updatedPayment.user_id)
    } catch {
      // Supabase offline
    }

    // Record audit log
    PersistentStore.addAuditLog({
      admin_id: adminId,
      action: 'payment_approve',
      target_user_id: updatedPayment.user_id,
      reason: `Admin approved payment for order ${updatedPayment.order_id}. User upgraded to Pro.`,
      metadata: {
        payment_id: paymentId,
        order_id: updatedPayment.order_id,
        amount: updatedPayment.amount,
        plan: updatedPayment.plan,
      },
    })

    const paymentRecord: AdminPaymentRecord = {
      id: updatedPayment.id,
      order_id: updatedPayment.order_id,
      user_id: updatedPayment.user_id,
      user_name: user?.name || 'User',
      user_phone: user?.phone || '-',
      plan: updatedPayment.plan,
      amount: updatedPayment.amount,
      payment_method: updatedPayment.payment_method,
      status: 'approved',
      proof_image_url: updatedPayment.proof_image_url,
      approved_by: adminId,
      approved_at: updatedPayment.approved_at,
      created_at: updatedPayment.created_at,
      updated_at: updatedPayment.updated_at,
    }

    const userRecord: AdminUserRecord | undefined = user
      ? {
          id: user.id,
          name: user.name,
          full_name: user.name,
          email: user.email,
          phone: user.phone,
          plan: user.plan,
          status: user.status,
          role: user.role,
          telegram_connected: !!user.telegram_connected,
          telegram_username: user.telegram_username || null,
          monthly_tx_count: user.monthly_tx_count || 0,
          created_at: user.created_at,
        }
      : undefined

    return { payment: paymentRecord, user: userRecord }
  }

  /**
   * Rejects a payment
   */
  static async rejectPayment(
    paymentId: string,
    reason: string = 'Bukti pembayaran tidak valid',
    adminId: string = OFFICIAL_SUPERADMIN_ID
  ): Promise<AdminPaymentRecord | null> {
    const updatedPayment = PersistentStore.updatePayment(paymentId, { status: 'rejected' }, adminId)
    if (!updatedPayment) return null

    const user = PersistentStore.findUserById(updatedPayment.user_id)

    // Sync Supabase
    try {
      const admin = createAdminClient()
      await admin
        .from('payment_transactions')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId)
    } catch {
      // Supabase offline
    }

    // Record audit log
    PersistentStore.addAuditLog({
      admin_id: adminId,
      action: 'payment_reject',
      target_user_id: updatedPayment.user_id,
      reason,
      metadata: {
        payment_id: paymentId,
        order_id: updatedPayment.order_id,
      },
    })

    return {
      id: updatedPayment.id,
      order_id: updatedPayment.order_id,
      user_id: updatedPayment.user_id,
      user_name: user?.name || 'User',
      user_phone: user?.phone || '-',
      plan: updatedPayment.plan,
      amount: updatedPayment.amount,
      payment_method: updatedPayment.payment_method,
      status: 'rejected',
      proof_image_url: updatedPayment.proof_image_url,
      created_at: updatedPayment.created_at,
      updated_at: updatedPayment.updated_at,
    }
  }

  /**
   * Records an audit log
   */
  static async addAuditLog(entry: {
    admin_id: string
    action: string
    target_user_id?: string | null
    reason?: string | null
    metadata?: any
  }): Promise<AdminAuditRecord> {
    const log = PersistentStore.addAuditLog(entry)
    return log
  }

  /**
   * Gets audit logs
   */
  static async getAuditLogs(): Promise<AdminAuditRecord[]> {
    return PersistentStore.getAuditLogs()
  }
}
