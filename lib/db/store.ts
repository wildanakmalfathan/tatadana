import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { hashPasswordSync } from '@/lib/auth/password'
import { normalizeEmail, normalizePhone } from '@/lib/auth/normalization'
import { SupabaseAdapter, isSupabaseConfigured } from './supabase-adapter'

export interface StoredUser {
  id: string
  name: string
  email: string
  phone: string
  password_hash: string
  role: 'user' | 'admin'
  plan: 'starter' | 'pro' | 'pro_lifetime'
  status: 'pending_approval' | 'active' | 'rejected' | 'suspended'
  telegram_chat_id?: number | null
  telegram_username?: string | null
  telegram_bot_token?: string | null
  telegram_connected?: boolean
  telegram_connected_at?: string | null
  avatar_url?: string | null
  avatar_type?: 'uploaded' | 'emoji' | null
  monthly_tx_count: number
  last_seen_at?: string | null
  created_at: string
  updated_at: string
}

export interface StoredWallet {
  id: string
  user_id: string
  name: string
  type: 'cash' | 'bank' | 'ewallet' | 'other'
  balance: number // pure integer IDR
  account_number?: string | null
  is_default: boolean
  is_default_telegram: boolean
  icon: string
  color: string
  is_archived?: boolean
  created_at: string
  updated_at: string
}

export interface StoredCategory {
  id: string
  user_id: string
  name: string
  type: 'expense' | 'income'
  emoji: string
  color: string
  budget_amount: number // pure integer IDR
  is_system: boolean
  is_archived?: boolean
  created_at: string
  updated_at: string
}

export interface StoredTransaction {
  id: string
  user_id: string
  wallet_id?: string | null
  destination_wallet_id?: string | null
  category_id?: string | null
  amount: number // pure integer IDR > 0
  type: 'income' | 'expense' | 'transfer'
  date: string // YYYY-MM-DD
  time: string // HH:MM
  notes?: string | null
  source: 'web' | 'telegram_text' | 'telegram_photo' | 'telegram_voice' | 'tata_ai'
  idempotency_key?: string | null
  telegram_message_id?: number | null
  raw_input?: string | null
  receipt_image_url?: string | null
  is_multi_item: boolean
  created_at: string
  updated_at: string
}

export interface StoredBudget {
  id: string
  user_id: string
  category_id: string
  period: 'daily' | 'weekly' | 'monthly'
  limit_amount: number
  amount?: number
  month?: number
  year?: number
  alert_80_sent?: boolean
  alert_100_sent?: boolean
  created_at: string
  updated_at: string
}

export interface StoredAuditLog {
  id: string
  admin_id: string
  action: string
  target_user_id?: string | null
  reason?: string | null
  metadata?: any
  created_at: string
}

export interface StoredPaymentTransaction {
  id: string
  user_id: string
  order_id: string
  plan: 'starter' | 'pro' | 'pro_lifetime'
  amount: number // pure integer IDR
  status: 'pending' | 'approved' | 'rejected' | 'settlement' | 'expire' | 'cancel'
  payment_method: 'midtrans' | 'manual_transfer'
  proof_image_url?: string | null
  approved_by?: string | null
  approved_at?: string | null
  midtrans_response?: any
  created_at: string
  updated_at: string
}

export interface DatabaseSchema {
  version: number
  users: StoredUser[]
  wallets: StoredWallet[]
  categories: StoredCategory[]
  transactions: StoredTransaction[]
  budgets: StoredBudget[]
  audit_logs: StoredAuditLog[]
  payment_transactions: StoredPaymentTransaction[]
}

const DB_DIR = path.join(process.cwd(), 'data')
const DB_FILE = path.join(DB_DIR, 'tatadana-db.json')
export const OFFICIAL_SUPERADMIN_ID = '00000000-0000-0000-0000-000000000001'
export const OFFICIAL_ADMIN_EMAIL = 'wildanakmalfathan@gmail.com'
export const OFFICIAL_ADMIN_PHONE = '+6281460932853'

export class PersistentStore {
  private static cachedData: DatabaseSchema | null = null
  private static lastMtime: number = 0

  /**
   * Ensures data directory exists
   */
  private static ensureDir() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true })
      }
    } catch {
      // Graceful on read-only serverless filesystems (e.g. Vercel)
    }
  }

  /**
   * Initializes default database state if file is absent or empty
   */
  private static createInitialSeed(): DatabaseSchema {
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'AdminTataDana2026!'
    const adminPasswordHash = hashPasswordSync(adminPassword)
    const now = new Date().toISOString()

    const adminUser: StoredUser = {
      id: OFFICIAL_SUPERADMIN_ID,
      name: 'Wildan Akmal Fathan',
      email: OFFICIAL_ADMIN_EMAIL,
      phone: OFFICIAL_ADMIN_PHONE,
      password_hash: adminPasswordHash,
      role: 'admin',
      plan: 'pro_lifetime',
      status: 'active',
      telegram_chat_id: 123456789,
      telegram_username: 'wildanakmal',
      telegram_connected: true,
      telegram_connected_at: now,
      avatar_url: '🧑‍💼',
      avatar_type: 'emoji',
      monthly_tx_count: 0,
      last_seen_at: now,
      created_at: now,
      updated_at: now,
    }

    const adminWallets: StoredWallet[] = [
      {
        id: 'w-admin-bca',
        user_id: OFFICIAL_SUPERADMIN_ID,
        name: 'BCA Utama',
        type: 'bank',
        balance: 15000000,
        account_number: '8214609328',
        is_default: true,
        is_default_telegram: true,
        icon: '🏦',
        color: '#0066AE',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'w-admin-cash',
        user_id: OFFICIAL_SUPERADMIN_ID,
        name: 'Cash Dompet',
        type: 'cash',
        balance: 750000,
        is_default: false,
        is_default_telegram: false,
        icon: '💵',
        color: '#10B981',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'w-admin-ewallet',
        user_id: OFFICIAL_SUPERADMIN_ID,
        name: 'GoPay / OVO',
        type: 'ewallet',
        balance: 1250000,
        is_default: false,
        is_default_telegram: false,
        icon: '📱',
        color: '#00AED6',
        created_at: now,
        updated_at: now,
      },
    ]

    const defaultCategories: StoredCategory[] = [
      { id: 'cat-makan', user_id: OFFICIAL_SUPERADMIN_ID, name: 'Makanan & Minuman', type: 'expense', emoji: '🍔', color: '#F97316', budget_amount: 2000000, is_system: true, created_at: now, updated_at: now },
      { id: 'cat-trans', user_id: OFFICIAL_SUPERADMIN_ID, name: 'Transportasi', type: 'expense', emoji: '🚗', color: '#3B82F6', budget_amount: 750000, is_system: true, created_at: now, updated_at: now },
      { id: 'cat-tagih', user_id: OFFICIAL_SUPERADMIN_ID, name: 'Tagihan & Utilitas', type: 'expense', emoji: '⚡', color: '#EF4444', budget_amount: 1500000, is_system: true, created_at: now, updated_at: now },
      { id: 'cat-belanja', user_id: OFFICIAL_SUPERADMIN_ID, name: 'Belanja', type: 'expense', emoji: '🛍️', color: '#8B5CF6', budget_amount: 1000000, is_system: true, created_at: now, updated_at: now },
      { id: 'cat-hiburan', user_id: OFFICIAL_SUPERADMIN_ID, name: 'Hiburan', type: 'expense', emoji: '🎬', color: '#EC4899', budget_amount: 500000, is_system: true, created_at: now, updated_at: now },
      { id: 'cat-gaji', user_id: OFFICIAL_SUPERADMIN_ID, name: 'Gaji Pokok', type: 'income', emoji: '💰', color: '#10B981', budget_amount: 0, is_system: true, created_at: now, updated_at: now },
      { id: 'cat-freelance', user_id: OFFICIAL_SUPERADMIN_ID, name: 'Freelance & Bisnis', type: 'income', emoji: '💻', color: '#06B6D4', budget_amount: 0, is_system: true, created_at: now, updated_at: now },
    ]

    const auditLog: StoredAuditLog = {
      id: 'audit-init-001',
      admin_id: OFFICIAL_SUPERADMIN_ID,
      action: 'database_bootstrap',
      target_user_id: OFFICIAL_SUPERADMIN_ID,
      reason: 'Official TataDana Persistent Database Engine initialized',
      metadata: { admin_email: OFFICIAL_ADMIN_EMAIL, plan: 'pro_lifetime' },
      created_at: now,
    }

    return {
      version: 1,
      users: [adminUser],
      wallets: adminWallets,
      categories: defaultCategories,
      transactions: [],
      budgets: [],
      audit_logs: [auditLog],
      payment_transactions: [],
    }
  }

  /**
   * Reads database from disk or memory cache with mtime validation
   */
  public static read(): DatabaseSchema {
    this.ensureDir()

    if (!fs.existsSync(DB_FILE)) {
      if (this.cachedData) {
        return this.cachedData
      }
      const initial = this.createInitialSeed()
      this.write(initial)
      return initial
    }

    try {
      const stats = fs.statSync(DB_FILE)
      if (this.cachedData && stats.mtimeMs <= this.lastMtime) {
        return this.cachedData
      }

      const content = fs.readFileSync(DB_FILE, 'utf-8')
      const parsed = JSON.parse(content) as DatabaseSchema

      // Verify essential collections exist
      if (!parsed.users) parsed.users = []
      if (!parsed.wallets) parsed.wallets = []
      if (!parsed.categories) parsed.categories = []
      if (!parsed.transactions) parsed.transactions = []
      if (!parsed.budgets) parsed.budgets = []
      if (!parsed.audit_logs) parsed.audit_logs = []
      if (!parsed.payment_transactions) parsed.payment_transactions = []

      // Ensure superadmin is pre-seeded
      const adminExists = parsed.users.find((u) => u.email === OFFICIAL_ADMIN_EMAIL)
      if (!adminExists) {
        const initial = this.createInitialSeed()
        parsed.users.unshift(initial.users[0])
        this.write(parsed)
      }

      this.cachedData = parsed
      this.lastMtime = stats.mtimeMs
      return parsed
    } catch (err: any) {
      if (this.cachedData) {
        return this.cachedData
      }
      console.warn('[PersistentStore] Notice reading DB file, initializing initial seed:', err?.message || err)
      const initial = this.createInitialSeed()
      this.write(initial)
      return initial
    }
  }

  /**
   * Atomically writes database to disk (if writable) and syncs to Supabase Cloud
   */
  public static write(data: DatabaseSchema): void {
    // 1. Always update memory state immediately
    this.cachedData = data

    // 2. Persist to local disk when filesystem is writable
    const tmpFile = `${DB_FILE}.${crypto.randomBytes(6).toString('hex')}.tmp`
    try {
      this.ensureDir()
      const json = JSON.stringify(data, null, 2)
      fs.writeFileSync(tmpFile, json, 'utf-8')
      fs.renameSync(tmpFile, DB_FILE)
      if (fs.existsSync(DB_FILE)) {
        const stats = fs.statSync(DB_FILE)
        this.lastMtime = stats.mtimeMs
      }
    } catch (err: any) {
      if (fs.existsSync(tmpFile)) {
        try { fs.unlinkSync(tmpFile) } catch {}
      }
      // On Vercel / read-only serverless filesystem, keep state in memory without throwing EROFS
      if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
        console.warn('[PersistentStore] Disk write skipped or read-only:', err?.message || err)
      }
    }

    // 3. Supabase Cloud PostgreSQL Sync (when configured)
    if (isSupabaseConfigured()) {
      SupabaseAdapter.syncDatabase(data).catch((err) => {
        console.warn('[PersistentStore] Supabase cloud sync notice:', err?.message || err)
      })
    }
  }

  /**
   * Persists database state to disk and cloud (alias to write, optionally uses current read state)
   */
  public static save(data?: DatabaseSchema): void {
    const targetData = data || this.read()
    this.write(targetData)
  }

  /**
   * Hydrates memory cache directly from Supabase Cloud if available
   */
  private static isHydrating = false
  public static async hydrateFromSupabase(): Promise<void> {
    if (this.isHydrating || !isSupabaseConfigured()) return
    this.isHydrating = true
    try {
      const remoteDb = await SupabaseAdapter.fetchFullDatabase()
      if (remoteDb && remoteDb.users && remoteDb.users.length > 0) {
        this.cachedData = remoteDb
      }
    } catch (err: any) {
      console.warn('[PersistentStore.hydrateFromSupabase] Hydration notice:', err?.message || err)
    } finally {
      this.isHydrating = false
    }
  }

  // ============================================================================
  // USER METHODS
  // ============================================================================

  public static getUsers(): StoredUser[] {
    const db = this.read()
    return [...db.users]
  }

  public static findUserById(id: string): StoredUser | null {
    const db = this.read()
    return db.users.find((u) => u.id === id) || null
  }

  public static findUserByEmail(email: string): StoredUser | null {
    const normalized = normalizeEmail(email)
    const db = this.read()
    return db.users.find((u) => u.email === normalized) || null
  }

  public static findUserByPhone(phone: string): StoredUser | null {
    const normalized = normalizePhone(phone)
    const db = this.read()
    return db.users.find((u) => u.phone === normalized) || null
  }

  public static createUser(userData: {
    name: string
    email: string
    phone: string
    password_hash: string
    role?: 'user' | 'admin'
    plan?: 'starter' | 'pro' | 'pro_lifetime'
    status?: 'pending_approval' | 'active' | 'rejected' | 'suspended'
  }): StoredUser {
    const db = this.read()
    const normalizedEmail = normalizeEmail(userData.email)
    const normalizedPhone = normalizePhone(userData.phone)

    if (db.users.some((u) => u.email === normalizedEmail)) {
      throw new Error('Email sudah terdaftar')
    }
    if (db.users.some((u) => u.phone === normalizedPhone)) {
      throw new Error('Nomor telepon sudah terdaftar')
    }

    const effectiveRole = normalizedEmail === OFFICIAL_ADMIN_EMAIL ? 'admin' : 'user'
    const now = new Date().toISOString()
    const newUser: StoredUser = {
      id: crypto.randomUUID(),
      name: userData.name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password_hash: userData.password_hash,
      role: effectiveRole,
      plan: userData.plan || 'starter',
      status: userData.status || 'pending_approval',
      avatar_url: '🧑‍💼',
      avatar_type: 'emoji',
      monthly_tx_count: 0,
      last_seen_at: now,
      created_at: now,
      updated_at: now,
    }

    db.users.push(newUser)

    // New users start with a completely clean state: 0 wallets, 0 balance, 0 transactions.
    // Wallets are created manually by the user or through onboarding.

    // Automatically seed default categories for new user
    const userCategories: StoredCategory[] = [
      { id: crypto.randomUUID(), user_id: newUser.id, name: 'Makanan & Minuman', type: 'expense', emoji: '🍔', color: '#F97316', budget_amount: 0, is_system: true, created_at: now, updated_at: now },
      { id: crypto.randomUUID(), user_id: newUser.id, name: 'Transportasi', type: 'expense', emoji: '🚗', color: '#3B82F6', budget_amount: 0, is_system: true, created_at: now, updated_at: now },
      { id: crypto.randomUUID(), user_id: newUser.id, name: 'Tagihan & Utilitas', type: 'expense', emoji: '⚡', color: '#EF4444', budget_amount: 0, is_system: true, created_at: now, updated_at: now },
      { id: crypto.randomUUID(), user_id: newUser.id, name: 'Belanja', type: 'expense', emoji: '🛍️', color: '#8B5CF6', budget_amount: 0, is_system: true, created_at: now, updated_at: now },
      { id: crypto.randomUUID(), user_id: newUser.id, name: 'Gaji Pokok', type: 'income', emoji: '💰', color: '#10B981', budget_amount: 0, is_system: true, created_at: now, updated_at: now },
    ]
    db.categories.push(...userCategories)

    this.write(db)

    if (isSupabaseConfigured()) {
      SupabaseAdapter.writeUser(newUser).catch(() => {})
      for (const cat of userCategories) {
        SupabaseAdapter.writeCategory(cat).catch(() => {})
      }
    }

    return newUser
  }

  public static updateUser(id: string, updates: Partial<StoredUser>): StoredUser | null {
    const db = this.read()
    const index = db.users.findIndex((u) => u.id === id)
    if (index === -1) return null

    const existing = db.users[index]
    const safeUpdates = { ...updates }

    // Enforce invariant: Only official admin email may hold admin role
    if (safeUpdates.role === 'admin' && existing.email !== OFFICIAL_ADMIN_EMAIL) {
      delete safeUpdates.role
    }
    // Protect official admin from accidental role demotion
    if (existing.email === OFFICIAL_ADMIN_EMAIL && safeUpdates.role && safeUpdates.role !== 'admin') {
      safeUpdates.role = 'admin'
    }

    const updated: StoredUser = {
      ...existing,
      ...safeUpdates,
      updated_at: new Date().toISOString(),
    }
    db.users[index] = updated
    this.write(db)

    if (isSupabaseConfigured()) {
      SupabaseAdapter.writeUser(updated).catch(() => {})
    }

    return updated
  }

  // ============================================================================
  // WALLET METHODS
  // ============================================================================

  public static getWallets(userId: string): StoredWallet[] {
    const db = this.read()
    return db.wallets.filter((w) => w.user_id === userId && !w.is_archived)
  }

  public static getWalletById(id: string, userId?: string): StoredWallet | null {
    const db = this.read()
    return db.wallets.find((w) => w.id === id && (!userId || w.user_id === userId)) || null
  }

  public static createWallet(walletData: {
    user_id: string
    name: string
    type: 'cash' | 'bank' | 'ewallet' | 'other'
    balance?: number
    account_number?: string | null
    is_default?: boolean
    is_default_telegram?: boolean
    icon?: string
    color?: string
  }): StoredWallet {
    const db = this.read()
    const now = new Date().toISOString()
    const integerBalance = Math.round(Number(walletData.balance) || 0)

    // If marked as default, unset other defaults for this user
    if (walletData.is_default) {
      db.wallets.forEach((w) => {
        if (w.user_id === walletData.user_id) w.is_default = false
      })
    }
    if (walletData.is_default_telegram) {
      db.wallets.forEach((w) => {
        if (w.user_id === walletData.user_id) w.is_default_telegram = false
      })
    }

    const newWallet: StoredWallet = {
      id: crypto.randomUUID(),
      user_id: walletData.user_id,
      name: walletData.name.trim(),
      type: walletData.type,
      balance: integerBalance,
      account_number: walletData.account_number || null,
      is_default: !!walletData.is_default,
      is_default_telegram: !!walletData.is_default_telegram,
      icon: walletData.icon || '👛',
      color: walletData.color || '#10B981',
      created_at: now,
      updated_at: now,
    }

    db.wallets.push(newWallet)
    this.write(db)

    if (isSupabaseConfigured()) {
      SupabaseAdapter.writeWallet(newWallet).catch(() => {})
      if (walletData.is_default || walletData.is_default_telegram) {
        for (const w of db.wallets) {
          if (w.user_id === walletData.user_id && w.id !== newWallet.id) {
            SupabaseAdapter.writeWallet(w).catch(() => {})
          }
        }
      }
    }

    return newWallet
  }

  public static updateWallet(id: string, userId: string, updates: Partial<StoredWallet>): StoredWallet | null {
    const db = this.read()
    const index = db.wallets.findIndex((w) => w.id === id && w.user_id === userId)
    if (index === -1) return null

    if (updates.balance !== undefined) {
      updates.balance = Math.round(Number(updates.balance))
    }

    if (updates.is_default) {
      db.wallets.forEach((w) => {
        if (w.user_id === userId) w.is_default = false
      })
    }
    if (updates.is_default_telegram) {
      db.wallets.forEach((w) => {
        if (w.user_id === userId) w.is_default_telegram = false
      })
    }

    const existing = db.wallets[index]
    const updated: StoredWallet = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    }
    db.wallets[index] = updated
    this.write(db)

    if (isSupabaseConfigured()) {
      SupabaseAdapter.writeWallet(updated).catch(() => {})
      if (updates.is_default || updates.is_default_telegram) {
        for (const w of db.wallets) {
          if (w.user_id === userId && w.id !== id) {
            SupabaseAdapter.writeWallet(w).catch(() => {})
          }
        }
      }
    }

    return updated
  }

  public static deleteWallet(id: string, userId: string): boolean {
    const db = this.read()
    const index = db.wallets.findIndex((w) => w.id === id && w.user_id === userId)
    if (index === -1) return false
    db.wallets.splice(index, 1)
    this.write(db)

    if (isSupabaseConfigured()) {
      SupabaseAdapter.deleteWallet(id).catch(() => {})
    }
    return true
  }

  /**
   * Pure integer balance mutation on a wallet
   */
  public static mutateWalletBalance(walletId: string, delta: number): void {
    const db = this.read()
    const wallet = db.wallets.find((w) => w.id === walletId)
    if (!wallet) return

    const intDelta = Math.round(Number(delta) || 0)
    wallet.balance = Math.round(wallet.balance + intDelta)
    wallet.updated_at = new Date().toISOString()
    this.write(db)

    if (isSupabaseConfigured()) {
      SupabaseAdapter.writeWallet(wallet).catch(() => {})
    }
  }

  // ============================================================================
  // CATEGORY METHODS
  // ============================================================================

  public static getCategories(userId: string): StoredCategory[] {
    const db = this.read()
    return db.categories.filter((c) => c.user_id === userId && !c.is_archived)
  }

  public static createCategory(catData: {
    user_id: string
    name: string
    type: 'expense' | 'income'
    emoji?: string
    color?: string
    budget_amount?: number
  }): StoredCategory {
    const db = this.read()
    const now = new Date().toISOString()

    const newCat: StoredCategory = {
      id: crypto.randomUUID(),
      user_id: catData.user_id,
      name: catData.name.trim(),
      type: catData.type,
      emoji: catData.emoji || '🏷️',
      color: catData.color || '#10B981',
      budget_amount: Math.round(Number(catData.budget_amount) || 0),
      is_system: false,
      created_at: now,
      updated_at: now,
    }

    db.categories.push(newCat)
    this.write(db)

    if (isSupabaseConfigured()) {
      SupabaseAdapter.writeCategory(newCat).catch(() => {})
    }

    return newCat
  }

  public static deleteCategory(id: string, userId: string): boolean {
    const db = this.read()
    const index = db.categories.findIndex((c) => c.id === id && c.user_id === userId)
    if (index === -1) return false
    db.categories.splice(index, 1)
    this.write(db)

    if (isSupabaseConfigured()) {
      SupabaseAdapter.deleteCategory(id).catch(() => {})
    }
    return true
  }

  // ============================================================================
  // TRANSACTION & LEDGER METHODS (Single Source of Truth)
  // ============================================================================

  public static getTransactions(userId: string, filters?: {
    wallet_id?: string
    category_id?: string
    type?: string
    start_date?: string
    end_date?: string
    limit?: number
  }): StoredTransaction[] {
    const db = this.read()
    let list = db.transactions.filter((tx) => tx.user_id === userId)

    if (filters?.wallet_id) {
      list = list.filter((tx) => tx.wallet_id === filters.wallet_id || tx.destination_wallet_id === filters.wallet_id)
    }
    if (filters?.category_id) {
      list = list.filter((tx) => tx.category_id === filters.category_id)
    }
    if (filters?.type) {
      list = list.filter((tx) => tx.type === filters.type)
    }
    if (filters?.start_date) {
      list = list.filter((tx) => tx.date >= filters.start_date!)
    }
    if (filters?.end_date) {
      list = list.filter((tx) => tx.date <= filters.end_date!)
    }

    // Sort descending by date and time
    list.sort((a, b) => {
      const cmp = b.date.localeCompare(a.date)
      if (cmp !== 0) return cmp
      return (b.time || '').localeCompare(a.time || '')
    })

    if (filters?.limit && filters.limit > 0) {
      list = list.slice(0, filters.limit)
    }

    return list
  }

  public static getTransactionById(id: string, userId?: string): StoredTransaction | null {
    const db = this.read()
    return db.transactions.find((tx) => tx.id === id && (!userId || tx.user_id === userId)) || null
  }

  public static findTransactionByIdempotencyKey(key: string, userId: string): StoredTransaction | null {
    if (!key) return null
    const db = this.read()
    return db.transactions.find((tx) => tx.user_id === userId && tx.idempotency_key === key) || null
  }

  /**
   * Atomic ledger insertion with pure integer IDR arithmetic and wallet balance synchronization
   */
  public static insertTransaction(txData: {
    user_id: string
    wallet_id?: string | null
    destination_wallet_id?: string | null
    category_id?: string | null
    amount: number
    type: 'income' | 'expense' | 'transfer'
    date?: string
    time?: string
    notes?: string | null
    source?: 'web' | 'telegram_text' | 'telegram_photo' | 'telegram_voice' | 'tata_ai'
    idempotency_key?: string | null
    telegram_message_id?: number | null
    raw_input?: string | null
    receipt_image_url?: string | null
    is_multi_item?: boolean
  }): StoredTransaction {
    const db = this.read()
    const now = new Date()
    const intAmount = Math.round(Number(txData.amount))

    if (isNaN(intAmount) || intAmount <= 0) {
      throw new Error('Nominal transaksi harus berupa angka positif')
    }

    // Idempotency check: if key already exists for user, return existing record
    if (txData.idempotency_key) {
      const existing = db.transactions.find(
        (tx) => tx.user_id === txData.user_id && tx.idempotency_key === txData.idempotency_key
      )
      if (existing) {
        return existing
      }
    }

    const newTx: StoredTransaction = {
      id: crypto.randomUUID(),
      user_id: txData.user_id,
      wallet_id: txData.wallet_id || null,
      destination_wallet_id: txData.type === 'transfer' ? (txData.destination_wallet_id || null) : null,
      category_id: txData.type !== 'transfer' ? (txData.category_id || null) : null,
      amount: intAmount,
      type: txData.type,
      date: txData.date || now.toISOString().split('T')[0],
      time: txData.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      notes: txData.notes || null,
      source: txData.source || 'web',
      idempotency_key: txData.idempotency_key || null,
      telegram_message_id: txData.telegram_message_id || null,
      raw_input: txData.raw_input || null,
      receipt_image_url: txData.receipt_image_url || null,
      is_multi_item: !!txData.is_multi_item,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }

    // Atomic wallet balance mutation
    if (newTx.type === 'expense' && newTx.wallet_id) {
      const w = db.wallets.find((item) => item.id === newTx.wallet_id && item.user_id === newTx.user_id)
      if (w) w.balance = Math.round(w.balance - intAmount)
    } else if (newTx.type === 'income' && newTx.wallet_id) {
      const w = db.wallets.find((item) => item.id === newTx.wallet_id && item.user_id === newTx.user_id)
      if (w) w.balance = Math.round(w.balance + intAmount)
    } else if (newTx.type === 'transfer' && newTx.wallet_id) {
      const src = db.wallets.find((item) => item.id === newTx.wallet_id && item.user_id === newTx.user_id)
      if (src) src.balance = Math.round(src.balance - intAmount)
      if (newTx.destination_wallet_id) {
        const dst = db.wallets.find((item) => item.id === newTx.destination_wallet_id && item.user_id === newTx.user_id)
        if (dst) dst.balance = Math.round(dst.balance + intAmount)
      }
    }

    // Increment user's monthly_tx_count
    const user = db.users.find((u) => u.id === newTx.user_id)
    if (user) {
      user.monthly_tx_count = (user.monthly_tx_count || 0) + 1
    }

    db.transactions.push(newTx)
    this.write(db)

    if (isSupabaseConfigured()) {
      SupabaseAdapter.writeTransaction(newTx).catch(() => {})
      if (newTx.wallet_id) {
        const w = db.wallets.find((item) => item.id === newTx.wallet_id)
        if (w) SupabaseAdapter.writeWallet(w).catch(() => {})
      }
      if (newTx.destination_wallet_id) {
        const dst = db.wallets.find((item) => item.id === newTx.destination_wallet_id)
        if (dst) SupabaseAdapter.writeWallet(dst).catch(() => {})
      }
      if (user) {
        SupabaseAdapter.writeUser(user).catch(() => {})
      }
    }

    return newTx
  }

  /**
   * Update transaction with atomic wallet balance rollback and re-application
   */
  public static updateTransaction(
    id: string,
    userId: string,
    updates: Partial<StoredTransaction>
  ): StoredTransaction | null {
    const db = this.read()
    const index = db.transactions.findIndex((tx) => tx.id === id && tx.user_id === userId)
    if (index === -1) return null

    const oldTx = db.transactions[index]

    // 1. Rollback old transaction effect on wallets
    if (oldTx.type === 'expense' && oldTx.wallet_id) {
      const w = db.wallets.find((item) => item.id === oldTx.wallet_id && item.user_id === oldTx.user_id)
      if (w) w.balance = Math.round(w.balance + oldTx.amount)
    } else if (oldTx.type === 'income' && oldTx.wallet_id) {
      const w = db.wallets.find((item) => item.id === oldTx.wallet_id && item.user_id === oldTx.user_id)
      if (w) w.balance = Math.round(w.balance - oldTx.amount)
    } else if (oldTx.type === 'transfer' && oldTx.wallet_id) {
      const src = db.wallets.find((item) => item.id === oldTx.wallet_id && item.user_id === oldTx.user_id)
      if (src) src.balance = Math.round(src.balance + oldTx.amount)
      if (oldTx.destination_wallet_id) {
        const dst = db.wallets.find((item) => item.id === oldTx.destination_wallet_id && item.user_id === oldTx.user_id)
        if (dst) dst.balance = Math.round(dst.balance - oldTx.amount)
      }
    }

    // 2. Compute new transaction object
    const newAmount = updates.amount !== undefined ? Math.round(Number(updates.amount)) : oldTx.amount
    const newTx: StoredTransaction = {
      ...oldTx,
      ...updates,
      amount: newAmount,
      updated_at: new Date().toISOString(),
    }

    // 3. Apply new transaction effect on wallets
    if (newTx.type === 'expense' && newTx.wallet_id) {
      const w = db.wallets.find((item) => item.id === newTx.wallet_id && item.user_id === newTx.user_id)
      if (w) w.balance = Math.round(w.balance - newAmount)
    } else if (newTx.type === 'income' && newTx.wallet_id) {
      const w = db.wallets.find((item) => item.id === newTx.wallet_id && item.user_id === newTx.user_id)
      if (w) w.balance = Math.round(w.balance + newAmount)
    } else if (newTx.type === 'transfer' && newTx.wallet_id) {
      const src = db.wallets.find((item) => item.id === newTx.wallet_id && item.user_id === newTx.user_id)
      if (src) src.balance = Math.round(src.balance - newAmount)
      if (newTx.destination_wallet_id) {
        const dst = db.wallets.find((item) => item.id === newTx.destination_wallet_id && item.user_id === newTx.user_id)
        if (dst) dst.balance = Math.round(dst.balance + newAmount)
      }
    }

    db.transactions[index] = newTx
    this.write(db)

    if (isSupabaseConfigured()) {
      SupabaseAdapter.writeTransaction(newTx).catch(() => {})
      if (newTx.wallet_id) {
        const w = db.wallets.find((item) => item.id === newTx.wallet_id)
        if (w) SupabaseAdapter.writeWallet(w).catch(() => {})
      }
      if (newTx.destination_wallet_id) {
        const dst = db.wallets.find((item) => item.id === newTx.destination_wallet_id)
        if (dst) SupabaseAdapter.writeWallet(dst).catch(() => {})
      }
      if (oldTx.wallet_id && oldTx.wallet_id !== newTx.wallet_id) {
        const oldW = db.wallets.find((item) => item.id === oldTx.wallet_id)
        if (oldW) SupabaseAdapter.writeWallet(oldW).catch(() => {})
      }
    }

    return newTx
  }

  /**
   * Delete transaction and atomically rollback wallet balance
   */
  public static deleteTransaction(id: string, userId: string): boolean {
    const db = this.read()
    const index = db.transactions.findIndex((tx) => tx.id === id && tx.user_id === userId)
    if (index === -1) return false

    const oldTx = db.transactions[index]

    // Rollback wallet balance
    if (oldTx.type === 'expense' && oldTx.wallet_id) {
      const w = db.wallets.find((item) => item.id === oldTx.wallet_id && item.user_id === oldTx.user_id)
      if (w) w.balance = Math.round(w.balance + oldTx.amount)
    } else if (oldTx.type === 'income' && oldTx.wallet_id) {
      const w = db.wallets.find((item) => item.id === oldTx.wallet_id && item.user_id === oldTx.user_id)
      if (w) w.balance = Math.round(w.balance - oldTx.amount)
    } else if (oldTx.type === 'transfer' && oldTx.wallet_id) {
      const src = db.wallets.find((item) => item.id === oldTx.wallet_id && item.user_id === oldTx.user_id)
      if (src) src.balance = Math.round(src.balance + oldTx.amount)
      if (oldTx.destination_wallet_id) {
        const dst = db.wallets.find((item) => item.id === oldTx.destination_wallet_id && item.user_id === oldTx.user_id)
        if (dst) dst.balance = Math.round(dst.balance - oldTx.amount)
      }
    }

    db.transactions.splice(index, 1)
    this.write(db)

    if (isSupabaseConfigured()) {
      SupabaseAdapter.deleteTransaction(id).catch(() => {})
      if (oldTx.wallet_id) {
        const w = db.wallets.find((item) => item.id === oldTx.wallet_id)
        if (w) SupabaseAdapter.writeWallet(w).catch(() => {})
      }
      if (oldTx.destination_wallet_id) {
        const dst = db.wallets.find((item) => item.id === oldTx.destination_wallet_id)
        if (dst) SupabaseAdapter.writeWallet(dst).catch(() => {})
      }
    }

    return true
  }

  /**
   * Computes wallet balance directly from the transactions ledger (Single Source of Truth)
   */
  public static computeWalletBalanceFromLedger(walletId: string, initialBalance: number = 0): number {
    const db = this.read()
    let balance = Math.round(initialBalance)

    for (const tx of db.transactions) {
      if (tx.wallet_id === walletId) {
        if (tx.type === 'income') balance += tx.amount
        else if (tx.type === 'expense' || tx.type === 'transfer') balance -= tx.amount
      } else if (tx.destination_wallet_id === walletId && tx.type === 'transfer') {
        balance += tx.amount
      }
    }

    return Math.round(balance)
  }

  // ============================================================================
  // BUDGET METHODS (Multi-Period Budgeting)
  // ============================================================================

  public static getBudgets(userId: string, period?: 'daily' | 'weekly' | 'monthly'): StoredBudget[] {
    const db = this.read()
    let list = db.budgets.filter((b) => b.user_id === userId)
    if (period) {
      list = list.filter((b) => b.period === period)
    }
    return list
  }

  public static getBudgetById(id: string, userId?: string): StoredBudget | null {
    const db = this.read()
    return db.budgets.find((b) => b.id === id && (!userId || b.user_id === userId)) || null
  }

  public static createBudget(budgetData: {
    user_id: string
    category_id: string
    period: 'daily' | 'weekly' | 'monthly'
    limit_amount?: number
    amount?: number
    month?: number
    year?: number
  }): StoredBudget {
    const db = this.read()
    const now = new Date()
    const limit = Math.round(Number(budgetData.limit_amount ?? budgetData.amount) || 0)

    // Upsert if budget already exists for this user, category, and period
    const existingIndex = db.budgets.findIndex(
      (b) =>
        b.user_id === budgetData.user_id &&
        b.category_id === budgetData.category_id &&
        b.period === budgetData.period
    )

    if (existingIndex !== -1) {
      const existing = db.budgets[existingIndex]
      existing.limit_amount = limit
      existing.amount = limit
      existing.updated_at = now.toISOString()
      this.write(db)
      if (isSupabaseConfigured()) {
        SupabaseAdapter.writeBudget(existing).catch(() => {})
      }
      return existing
    }

    const newBudget: StoredBudget = {
      id: crypto.randomUUID(),
      user_id: budgetData.user_id,
      category_id: budgetData.category_id,
      period: budgetData.period,
      limit_amount: limit,
      amount: limit,
      month: budgetData.month || now.getMonth() + 1,
      year: budgetData.year || now.getFullYear(),
      alert_80_sent: false,
      alert_100_sent: false,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }

    db.budgets.push(newBudget)
    this.write(db)

    if (isSupabaseConfigured()) {
      SupabaseAdapter.writeBudget(newBudget).catch(() => {})
    }

    return newBudget
  }

  public static updateBudget(
    id: string,
    updates: Partial<StoredBudget>
  ): StoredBudget | null {
    const db = this.read()
    const index = db.budgets.findIndex((b) => b.id === id)
    if (index === -1) return null

    const existing = db.budgets[index]
    const limit = updates.limit_amount !== undefined
      ? Math.round(Number(updates.limit_amount))
      : (updates.amount !== undefined ? Math.round(Number(updates.amount)) : existing.limit_amount)

    const updated: StoredBudget = {
      ...existing,
      ...updates,
      limit_amount: limit,
      amount: limit,
      updated_at: new Date().toISOString(),
    }

    db.budgets[index] = updated
    this.write(db)

    if (isSupabaseConfigured()) {
      SupabaseAdapter.writeBudget(updated).catch(() => {})
    }

    return updated
  }

  public static deleteBudget(id: string, userId?: string): boolean {
    const db = this.read()
    const index = db.budgets.findIndex((b) => b.id === id && (!userId || b.user_id === userId))
    if (index === -1) return false

    db.budgets.splice(index, 1)
    this.write(db)

    if (isSupabaseConfigured()) {
      SupabaseAdapter.deleteBudget(id).catch(() => {})
    }

    return true
  }

  // ============================================================================
  // AUDIT LOGS
  // ============================================================================

  public static addAuditLog(log: {
    admin_id: string
    action: string
    target_user_id?: string | null
    reason?: string | null
    metadata?: any
  }): StoredAuditLog {
    const db = this.read()
    const newLog: StoredAuditLog = {
      id: crypto.randomUUID(),
      admin_id: log.admin_id,
      action: log.action,
      target_user_id: log.target_user_id || null,
      reason: log.reason || null,
      metadata: log.metadata || null,
      created_at: new Date().toISOString(),
    }
    db.audit_logs.push(newLog)
    this.write(db)

    if (isSupabaseConfigured()) {
      SupabaseAdapter.writeAuditLog(newLog).catch(() => {})
    }

    return newLog
  }

  public static getAuditLogs(): StoredAuditLog[] {
    const db = this.read()
    return [...db.audit_logs].sort((a, b) => b.created_at.localeCompare(a.created_at))
  }

  // ============================================================================
  // PAYMENT TRANSACTIONS
  // ============================================================================

  public static getPayments(): StoredPaymentTransaction[] {
    const db = this.read()
    return [...db.payment_transactions].sort((a, b) => b.created_at.localeCompare(a.created_at))
  }

  public static getPaymentById(id: string): StoredPaymentTransaction | null {
    const db = this.read()
    return db.payment_transactions.find((p) => p.id === id) || null
  }

  public static createPayment(paymentData: {
    user_id: string
    order_id: string
    plan: 'starter' | 'pro' | 'pro_lifetime'
    amount: number
    payment_method: 'midtrans' | 'manual_transfer'
    status?: 'pending' | 'approved' | 'rejected' | 'settlement' | 'expire' | 'cancel'
    proof_image_url?: string | null
  }): StoredPaymentTransaction {
    const db = this.read()
    const now = new Date().toISOString()
    const newPayment: StoredPaymentTransaction = {
      id: crypto.randomUUID(),
      user_id: paymentData.user_id,
      order_id: paymentData.order_id,
      plan: paymentData.plan,
      amount: Math.round(Number(paymentData.amount)),
      payment_method: paymentData.payment_method,
      status: paymentData.status || 'pending',
      proof_image_url: paymentData.proof_image_url || null,
      created_at: now,
      updated_at: now,
    }
    db.payment_transactions.push(newPayment)
    this.write(db)

    if (isSupabaseConfigured()) {
      SupabaseAdapter.writePayment(newPayment).catch(() => {})
    }

    return newPayment
  }

  public static updatePayment(
    id: string,
    updates: Partial<StoredPaymentTransaction>,
    adminId?: string
  ): StoredPaymentTransaction | null {
    const db = this.read()
    const index = db.payment_transactions.findIndex((p) => p.id === id)
    if (index === -1) return null

    const existing = db.payment_transactions[index]
    const updated: StoredPaymentTransaction = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    }

    if (updates.status === 'approved' && adminId) {
      updated.approved_by = adminId
      updated.approved_at = new Date().toISOString()
      // Upgrade user to Pro
      const user = db.users.find((u) => u.id === existing.user_id)
      if (user) {
        user.plan = existing.plan === 'pro_lifetime' ? 'pro_lifetime' : 'pro'
        user.updated_at = new Date().toISOString()
        if (isSupabaseConfigured()) {
          SupabaseAdapter.writeUser(user).catch(() => {})
        }
      }
    }

    db.payment_transactions[index] = updated
    this.write(db)

    if (isSupabaseConfigured()) {
      SupabaseAdapter.writePayment(updated).catch(() => {})
    }

    return updated
  }

  // ============================================================================
  // REGISTRATION APPROVAL WORKFLOW (Clause F)
  // ============================================================================

  public static approveUser(userId: string, adminId: string): StoredUser | null {
    const db = this.read()
    const user = db.users.find((u) => u.id === userId)
    if (!user) return null

    user.status = 'active'
    user.updated_at = new Date().toISOString()

    this.addAuditLog({
      admin_id: adminId,
      action: 'user_approved',
      target_user_id: user.id,
      reason: `Pendaftaran pengguna disetujui oleh admin (${adminId})`,
      metadata: { email: user.email, name: user.name, phone: user.phone },
    })

    this.write(db)

    if (isSupabaseConfigured()) {
      SupabaseAdapter.writeUser(user).catch(() => {})
    }

    return user
  }

  public static rejectUser(userId: string, reason: string, adminId: string): StoredUser | null {
    const db = this.read()
    const user = db.users.find((u) => u.id === userId)
    if (!user) return null

    user.status = 'rejected'
    user.updated_at = new Date().toISOString()

    this.addAuditLog({
      admin_id: adminId,
      action: 'user_rejected',
      target_user_id: user.id,
      reason: reason || 'Pendaftaran ditolak oleh administrator.',
      metadata: { email: user.email, name: user.name, phone: user.phone, reason },
    })

    this.write(db)

    if (isSupabaseConfigured()) {
      SupabaseAdapter.writeUser(user).catch(() => {})
    }

    return user
  }

  // ============================================================================
  // SESSION HEARTBEAT & ADMIN METRICS (Clause G)
  // ============================================================================

  public static touchUserHeartbeat(userId: string): void {
    const db = this.read()
    const user = db.users.find((u) => u.id === userId)
    if (user) {
      user.last_seen_at = new Date().toISOString()
      this.write(db)
      if (isSupabaseConfigured()) {
        SupabaseAdapter.writeUser(user).catch(() => {})
      }
    }
  }

  public static getActiveUsersCount(thresholdSeconds: number = 90): number {
    const db = this.read()
    const now = Date.now()
    const thresholdMs = thresholdSeconds * 1000

    return db.users.filter((u) => {
      if (!u.last_seen_at) return false
      const lastSeen = new Date(u.last_seen_at).getTime()
      return now - lastSeen <= thresholdMs
    }).length
  }

  public static getAdminMetricsSummary() {
    const db = this.read()
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const thresholdMs = 90 * 1000

    let activeCount = 0
    let todayCount = 0
    let pendingCount = 0
    let approvedCount = 0
    let rejectedCount = 0
    let suspendedCount = 0
    let proCount = 0

    for (const u of db.users) {
      if (u.last_seen_at && now.getTime() - new Date(u.last_seen_at).getTime() <= thresholdMs) {
        activeCount++
      }
      if (u.created_at && u.created_at.startsWith(todayStr)) {
        todayCount++
      }
      if (u.status === 'pending_approval') pendingCount++
      else if (u.status === 'active') approvedCount++
      else if (u.status === 'rejected') rejectedCount++
      else if (u.status === 'suspended') suspendedCount++

      if (u.plan === 'pro' || u.plan === 'pro_lifetime') proCount++
    }

    let totalRevenue = 0
    for (const p of db.payment_transactions) {
      if (p.status === 'approved' || p.status === 'settlement') {
        totalRevenue += p.amount
      }
    }

    return {
      totalUsers: db.users.length,
      activeUsers: activeCount,
      todayUsers: todayCount,
      pendingUsers: pendingCount,
      approvedUsers: approvedCount,
      rejectedUsers: rejectedCount,
      suspendedUsers: suspendedCount,
      proUsers: proCount,
      approvalRatio:
        approvedCount + rejectedCount > 0
          ? Math.round((approvedCount / (approvedCount + rejectedCount)) * 100)
          : 100,
      totalRevenue,
      paymentsCount: db.payment_transactions.length,
      auditLogsCount: db.audit_logs.length,
    }
  }
}

