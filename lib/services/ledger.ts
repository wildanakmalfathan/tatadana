import { PersistentStore, StoredTransaction, StoredWallet, StoredCategory, OFFICIAL_SUPERADMIN_ID } from '@/lib/db/store'
import { evaluateAndTriggerBudgetAlert } from '@/lib/services/budget-alert'

export interface CreateTransactionDTO {
  user_id: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  wallet_id?: string | null
  destination_wallet_id?: string | null
  category_id?: string | null
  date?: string
  time?: string
  notes?: string | null
  source?: 'web' | 'telegram_text' | 'telegram_photo' | 'telegram_voice' | 'tata_ai'
  idempotency_key?: string | null
  receipt_image_url?: string | null
  is_multi_item?: boolean
}

export interface UpdateTransactionDTO {
  amount?: number
  type?: 'income' | 'expense' | 'transfer'
  wallet_id?: string | null
  destination_wallet_id?: string | null
  category_id?: string | null
  date?: string
  time?: string
  notes?: string | null
  receipt_image_url?: string | null
  is_multi_item?: boolean
}

export interface EnrichedTransaction extends StoredTransaction {
  wallet?: StoredWallet | null
  destination_wallet?: StoredWallet | null
  category?: StoredCategory | null
}

export class LedgerService {
  /**
   * Enriches a transaction record with wallet and category metadata
   */
  public static enrichTransaction(tx: StoredTransaction): EnrichedTransaction {
    const wallet = tx.wallet_id ? PersistentStore.getWalletById(tx.wallet_id) : null
    const destWallet = tx.destination_wallet_id ? PersistentStore.getWalletById(tx.destination_wallet_id) : null
    const categories = PersistentStore.getCategories(tx.user_id)
    let category = tx.category_id ? categories.find((c) => c.id === tx.category_id) || null : null

    // Fallback: If not found in user's direct category IDs
    if (!category && tx.category_id) {
      // 0. Direct match against category name (case-insensitive)
      category = categories.find((c) => c.name.toLowerCase() === tx.category_id!.toLowerCase()) || null

      // 1. Name match for standard category IDs
      const standardNameMap: Record<string, string> = {
        'cat-makan': 'Makanan & Minuman',
        'cat-trans': 'Transportasi',
        'cat-tagih': 'Tagihan & Utilitas',
        'cat-belanja': 'Belanja',
        'cat-hiburan': 'Hiburan',
        'cat-gaji': 'Gaji Pokok',
        'cat-freelance': 'Freelance & Bisnis',
      }
      const standardName = standardNameMap[tx.category_id]
      if (!category && standardName) {
        category = categories.find((c) => c.name.toLowerCase() === standardName.toLowerCase()) || null
      }

      // 2. Map legacy codes ('c-1' to 'c-5')
      if (!category) {
        const legacyMap: Record<string, string> = {
          'c-1': 'cat-makan',
          'c-2': 'cat-trans',
          'c-3': 'cat-tagih',
          'c-4': 'cat-hiburan',
          'c-5': 'cat-belanja',
        }
        const mappedId = legacyMap[tx.category_id]
        if (mappedId) {
          category = categories.find((c) => c.id === mappedId) || null
          if (!category && standardNameMap[mappedId]) {
            category = categories.find((c) => c.name.toLowerCase() === standardNameMap[mappedId].toLowerCase()) || null
          }
        }
      }

      // 3. System / Superadmin categories fallback
      if (!category) {
        const systemCats = PersistentStore.getCategories(OFFICIAL_SUPERADMIN_ID)
        category = systemCats.find((c) => c.id === tx.category_id) || null
        if (!category && standardName) {
          category = systemCats.find((c) => c.name.toLowerCase() === standardName.toLowerCase()) || null
        }
      }
    }

    return {
      ...tx,
      wallet,
      destination_wallet: destWallet,
      category,
    }
  }

  /**
   * Lists transactions from the persistent store with relational enrichment
   */
  public static async getTransactions(
    userId: string,
    filters?: {
      wallet_id?: string
      category_id?: string
      type?: string
      start_date?: string
      end_date?: string
      limit?: number
    }
  ): Promise<EnrichedTransaction[]> {
    const rawList = PersistentStore.getTransactions(userId, filters)
    return rawList.map((tx) => this.enrichTransaction(tx))
  }

  /**
   * Retrieves a single transaction by ID
   */
  public static async getTransactionById(id: string, userId?: string): Promise<EnrichedTransaction | null> {
    const tx = PersistentStore.getTransactionById(id, userId)
    if (!tx) return null
    return this.enrichTransaction(tx)
  }

  /**
   * Atomically records a transaction with integer IDR arithmetic,
   * idempotency deduplication, and wallet balance synchronization.
   */
  public static async createTransaction(dto: CreateTransactionDTO): Promise<{
    transaction: EnrichedTransaction
    budgetAlert?: any
    isDuplicate?: boolean
  }> {
    const intAmount = Math.round(Number(dto.amount))
    if (isNaN(intAmount) || intAmount <= 0) {
      throw new Error('Nominal transaksi harus berupa angka bulat positif lebih besar dari 0.')
    }

    // Check user plan transaction limit
    const user = PersistentStore.findUserById(dto.user_id)
    if (!user) {
      throw new Error('Pengguna tidak ditemukan.')
    }

    if (user.plan === 'starter' && (user.monthly_tx_count || 0) >= 50) {
      const limitError: any = new Error(
        'Batas transaksi bulanan paket Starter (50 transaksi) sudah tercapai. Silakan upgrade ke Pro untuk transaksi tanpa batas.'
      )
      limitError.status = 403
      limitError.isLimitExceeded = true
      throw limitError
    }

    // Check idempotency
    let isDuplicate = false
    if (dto.idempotency_key) {
      const existing = PersistentStore.findTransactionByIdempotencyKey(dto.idempotency_key, dto.user_id)
      if (existing) {
        return {
          transaction: this.enrichTransaction(existing),
          isDuplicate: true,
        }
      }
    }

    // Validate wallet ownership
    if (dto.wallet_id) {
      const wallet = PersistentStore.getWalletById(dto.wallet_id, dto.user_id)
      if (!wallet) {
        const err: any = new Error('Dompet tidak ditemukan atau bukan milik pengguna')
        err.status = 400
        throw err
      }
    }
    if (dto.destination_wallet_id) {
      const destWallet = PersistentStore.getWalletById(dto.destination_wallet_id, dto.user_id)
      if (!destWallet) {
        const err: any = new Error('Dompet tujuan tidak ditemukan atau bukan milik pengguna')
        err.status = 400
        throw err
      }
    }

    // Insert into persistent store (mutates wallet balance atomically)
    const insertedTx = PersistentStore.insertTransaction({
      user_id: dto.user_id,
      wallet_id: dto.wallet_id || null,
      destination_wallet_id: dto.type === 'transfer' ? (dto.destination_wallet_id || null) : null,
      category_id: dto.type !== 'transfer' ? (dto.category_id || null) : null,
      amount: intAmount,
      type: dto.type,
      date: dto.date,
      time: dto.time,
      notes: dto.notes || null,
      source: dto.source || 'web',
      idempotency_key: dto.idempotency_key || null,
      receipt_image_url: dto.receipt_image_url || null,
      is_multi_item: !!dto.is_multi_item,
    })

    const enriched = this.enrichTransaction(insertedTx)

    // Trigger multi-period budget alert evaluation for expenses
    let budgetAlertInfo = null
    if (insertedTx.type === 'expense' && insertedTx.category_id) {
      try {
        budgetAlertInfo = await evaluateAndTriggerBudgetAlert(dto.user_id, {
          category_id: insertedTx.category_id,
          amount: intAmount,
          date: insertedTx.date,
        })
      } catch (alertErr) {
        console.error('[LedgerService] Error evaluating budget alert:', alertErr)
      }
    }

    return {
      transaction: enriched,
      budgetAlert: budgetAlertInfo,
      isDuplicate,
    }
  }

  /**
   * Atomically updates a transaction and recalculates wallet balances
   */
  public static async updateTransaction(
    id: string,
    userId: string,
    updates: UpdateTransactionDTO
  ): Promise<EnrichedTransaction> {
    const existing = PersistentStore.getTransactionById(id, userId)
    if (!existing) {
      throw new Error('Transaksi tidak ditemukan atau bukan milik pengguna.')
    }

    if (updates.amount !== undefined) {
      const intAmount = Math.round(Number(updates.amount))
      if (isNaN(intAmount) || intAmount <= 0) {
        throw new Error('Nominal transaksi harus berupa angka bulat positif.')
      }
      updates.amount = intAmount
    }

    if (updates.wallet_id) {
      const wallet = PersistentStore.getWalletById(updates.wallet_id, userId)
      if (!wallet) {
        const err: any = new Error('Dompet tidak ditemukan atau bukan milik pengguna')
        err.status = 400
        throw err
      }
    }
    if (updates.destination_wallet_id) {
      const destWallet = PersistentStore.getWalletById(updates.destination_wallet_id, userId)
      if (!destWallet) {
        const err: any = new Error('Dompet tujuan tidak ditemukan atau bukan milik pengguna')
        err.status = 400
        throw err
      }
    }

    const updatedTx = PersistentStore.updateTransaction(id, userId, updates)
    if (!updatedTx) {
      throw new Error('Gagal memperbarui transaksi.')
    }

    return this.enrichTransaction(updatedTx)
  }

  /**
   * Deletes a transaction and atomically reverses wallet balance mutation
   */
  public static async deleteTransaction(id: string, userId: string): Promise<boolean> {
    const existing = PersistentStore.getTransactionById(id, userId)
    if (!existing) {
      throw new Error('Transaksi tidak ditemukan atau bukan milik pengguna.')
    }

    return PersistentStore.deleteTransaction(id, userId)
  }

  /**
   * Single Source of Truth calculation of wallet balance from all ledger transactions
   */
  public static calculateWalletBalance(walletId: string, initialBalance = 0): number {
    return PersistentStore.computeWalletBalanceFromLedger(walletId, initialBalance)
  }
}
