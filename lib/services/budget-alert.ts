import { createAdminClient } from '@/lib/supabase/admin'
import { TelegramBotApi } from '@/lib/telegram/bot-api'
import { formatRupiah } from '@/lib/utils/currency'
import { getISODateWIB, getWIBDate } from '@/lib/utils/date'

export type BudgetPeriod = 'daily' | 'weekly' | 'monthly'

export interface BudgetAlertEvaluation {
  period: BudgetPeriod
  periodLabel: string
  limit: number
  spent: number
  percentage: number
  status: 'safe' | 'warning' | 'overbudget'
  alertTriggered?: '80' | '100'
  message?: string
}

export interface BudgetAlertResult {
  evaluated: boolean
  userId: string
  categoryId: string
  alertsSent: string[]
  evaluations: BudgetAlertEvaluation[]
}

// In-memory debouncing cache to prevent duplicate alerts within the same period
// Key format: `${userId}:${categoryId}:${period}:${periodKey}:${threshold}`
const sentAlertsCache = new Set<string>()

/**
 * Reset debounce cache (useful for testing or period resets)
 */
export function clearBudgetAlertCache(): void {
  sentAlertsCache.clear()
}

/**
 * Menghitung rentang tanggal untuk periode Harian, Mingguan, dan Bulanan (Asia/Jakarta / WIB)
 */
export function getPeriodDateRange(period: BudgetPeriod, referenceDate: Date = new Date()): {
  startDate: string
  endDate: string
  periodKey: string
  periodLabel: string
} {
  const refWib = getWIBDate(referenceDate)
  const todayIso = getISODateWIB(refWib)

  if (period === 'daily') {
    return {
      startDate: todayIso,
      endDate: todayIso,
      periodKey: todayIso,
      periodLabel: 'Harian',
    }
  }

  if (period === 'weekly') {
    // Cari hari Senin di minggu ini
    const day = refWib.getDay() // 0 = Minggu, 1 = Senin, ...
    const diffToMonday = day === 0 ? -6 : 1 - day
    const monday = new Date(refWib)
    monday.setDate(refWib.getDate() + diffToMonday)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const startOfWeek = getISODateWIB(monday)
    const endOfWeek = getISODateWIB(sunday)

    return {
      startDate: startOfWeek,
      endDate: endOfWeek,
      periodKey: `${startOfWeek}_${endOfWeek}`,
      periodLabel: 'Mingguan',
    }
  }

  // Monthly
  const startOfMonth = todayIso.substring(0, 8) + '01'
  const year = refWib.getFullYear()
  const month = refWib.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()
  const endOfMonth = `${todayIso.substring(0, 8)}${String(lastDay).padStart(2, '0')}`

  return {
    startDate: startOfMonth,
    endDate: endOfMonth,
    periodKey: todayIso.substring(0, 7), // YYYY-MM
    periodLabel: 'Bulanan',
  }
}

/**
 * Evaluasi batas anggaran multi-periode (Harian, Mingguan, Bulanan)
 * dan kirim notifikasi Telegram jika menyentuh >=80% atau >=100%
 */
export async function evaluateAndTriggerBudgetAlert(
  userId: string,
  transaction: {
    category_id: string
    amount: number
    date?: string
  }
): Promise<BudgetAlertResult> {
  const result: BudgetAlertResult = {
    evaluated: false,
    userId,
    categoryId: transaction.category_id,
    alertsSent: [],
    evaluations: [],
  }

  if (!userId || !transaction.category_id || transaction.amount <= 0) {
    return result
  }

  const adminClient = createAdminClient()

  // 1. Ambil data profil user (untuk chat_id Telegram dan custom bot token)
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, full_name, telegram_chat_id, telegram_connected, telegram_bot_token')
    .eq('id', userId)
    .maybeSingle()

  // 2. Ambil kategori terkait
  const { data: category } = await adminClient
    .from('categories')
    .select('*')
    .eq('id', transaction.category_id)
    .maybeSingle()

  if (!category || category.type !== 'expense') {
    return result
  }

  result.evaluated = true

  // 3. Ambil data budget dari tabel `budgets` jika ada
  const { data: budgetRecords } = await adminClient
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('category_id', transaction.category_id)

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // Cari limit untuk masing-masing periode
  // Prioritas:
  // - daily: budgets record with period='daily' -> category.budget_daily
  // - weekly: budgets record with period='weekly' -> category.budget_weekly
  // - monthly: budgets record with month=currentMonth, year=currentYear -> category.budget_amount / budget_monthly
  const dailyRecord = budgetRecords?.find((b: any) => b.period === 'daily')
  const weeklyRecord = budgetRecords?.find((b: any) => b.period === 'weekly')
  const monthlyRecord = budgetRecords?.find(
    (b: any) => (b.period === 'monthly' || (!b.period && b.month === currentMonth && b.year === currentYear))
  )

  const defaultStandardLimits: Record<string, Record<BudgetPeriod, number>> = {
    'c-1': { daily: 75000, weekly: 500000, monthly: 2500000 },
    'c-2': { daily: 35000, weekly: 200000, monthly: 1000000 },
    'c-3': { daily: 50000, weekly: 350000, monthly: 2000000 },
    'c-4': { daily: 25000, weekly: 150000, monthly: 800000 },
    'c-5': { daily: 50000, weekly: 300000, monthly: 1500000 },
  }

  const limits: Record<BudgetPeriod, { limit: number; record?: any }> = {
    daily: {
      limit: Number(
        dailyRecord?.amount ||
          (category as any).budget_daily ||
          defaultStandardLimits[category.id]?.daily ||
          (category.name?.toLowerCase().includes('makan') ? 75000 : 0)
      ),
      record: dailyRecord,
    },
    weekly: {
      limit: Number(
        weeklyRecord?.amount ||
          (category as any).budget_weekly ||
          defaultStandardLimits[category.id]?.weekly ||
          (category.name?.toLowerCase().includes('makan') ? 500000 : 0)
      ),
      record: weeklyRecord,
    },
    monthly: {
      limit: Number(
        monthlyRecord?.amount ||
          (category as any).budget_monthly ||
          category.budget_amount ||
          defaultStandardLimits[category.id]?.monthly ||
          (category.name?.toLowerCase().includes('makan') ? 2500000 : 0)
      ),
      record: monthlyRecord,
    },
  }

  const periods: BudgetPeriod[] = ['daily', 'weekly', 'monthly']
  const botApi = new TelegramBotApi(profile?.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN)
  const canSendTelegram = Boolean(
    profile?.telegram_chat_id && (profile?.telegram_connected !== false || profile?.telegram_bot_token)
  )

  for (const period of periods) {
    const { limit, record } = limits[period]
    if (limit <= 0) continue // Skip jika tidak ada limit yang diset untuk periode ini

    const { startDate, endDate, periodKey, periodLabel } = getPeriodDateRange(period, now)

    // Hitung total pengeluaran kategori pada periode ini
    const { data: txs } = await adminClient
      .from('transactions')
      .select('amount, date')
      .eq('user_id', userId)
      .eq('category_id', transaction.category_id)
      .eq('type', 'expense')
      .gte('date', startDate)
      .lte('date', endDate)

    let spent = (txs || []).reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0)

    // Pastikan transaksi saat ini terhitung jika berada dalam rentang periode dan belum ada di txs
    const txDate = transaction.date ? transaction.date.split('T')[0] : getISODateWIB(now)
    if (txDate >= startDate && txDate <= endDate && spent < transaction.amount) {
      spent = Math.max(spent, transaction.amount)
    }

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

    const evaluation: BudgetAlertEvaluation = {
      period,
      periodLabel,
      limit,
      spent,
      percentage,
      status,
    }

    // Evaluasi Pengiriman Alert Telegram
    if (status === 'overbudget') {
      const cacheKey100 = `${userId}:${transaction.category_id}:${period}:${periodKey}:100`
      const isAlreadySent = record?.alert_100_sent || sentAlertsCache.has(cacheKey100)

      if (!isAlreadySent) {
        evaluation.alertTriggered = '100'
        const alertMsg =
          `🚨 *PERINGATAN OVERBUDGET (100%)*\n\n` +
          `Kategori: ${category.emoji || '🏷️'} *${category.name}*\n` +
          `Periode: *${periodLabel}*\n` +
          `Terpakai: *${formatRupiah(spent)}* / ${formatRupiah(limit)} (${percentage}%)\n` +
          `Kelebihan: *${formatRupiah(Math.max(0, spent - limit))}*\n\n` +
          `⚠️ Pengeluaran kamu telah melampaui batas anggaran! Segera rem pengeluaran untuk kategori ini.`

        evaluation.message = alertMsg
        sentAlertsCache.add(cacheKey100)
        sentAlertsCache.add(`${userId}:${transaction.category_id}:${period}:${periodKey}:80`) // tandai 80 juga

        if (canSendTelegram && profile?.telegram_chat_id) {
          await botApi.sendMessage(profile.telegram_chat_id, alertMsg, { parse_mode: 'Markdown' })
          result.alertsSent.push(`100%_${period}`)
        }

        // Tandai di database jika record exists
        if (record?.id) {
          await adminClient
            .from('budgets')
            .update({ alert_100_sent: true, alert_80_sent: true, updated_at: new Date().toISOString() })
            .eq('id', record.id)
        }
      }
    } else if (status === 'warning') {
      const cacheKey80 = `${userId}:${transaction.category_id}:${period}:${periodKey}:80`
      const isAlreadySent = record?.alert_80_sent || sentAlertsCache.has(cacheKey80)

      if (!isAlreadySent) {
        evaluation.alertTriggered = '80'
        const remaining = Math.max(0, limit - spent)
        const alertMsg =
          `⚠️ *PERINGATAN ANGGARAN (80%)*\n\n` +
          `Kategori: ${category.emoji || '🏷️'} *${category.name}*\n` +
          `Periode: *${periodLabel}*\n` +
          `Terpakai: *${formatRupiah(spent)}* / ${formatRupiah(limit)} (${percentage}%)\n` +
          `Sisa Anggaran: *${formatRupiah(remaining)}*\n\n` +
          `💡 Hati-hati, anggaran ${periodLabel.toLowerCase()} kamu hampir habis!`

        evaluation.message = alertMsg
        sentAlertsCache.add(cacheKey80)

        if (canSendTelegram && profile?.telegram_chat_id) {
          await botApi.sendMessage(profile.telegram_chat_id, alertMsg, { parse_mode: 'Markdown' })
          result.alertsSent.push(`80%_${period}`)
        }

        // Tandai di database jika record exists
        if (record?.id) {
          await adminClient
            .from('budgets')
            .update({ alert_80_sent: true, updated_at: new Date().toISOString() })
            .eq('id', record.id)
        }
      }
    }

    result.evaluations.push(evaluation)
  }

  return result
}

/**
 * Alias compatibility function per specification
 */
export async function evaluateAndSendBudgetAlerts(params: {
  userId: string
  categoryId: string
  transactionAmount: number
  source?: string
}): Promise<{ alertsSent: string[] }> {
  const res = await evaluateAndTriggerBudgetAlert(params.userId, {
    category_id: params.categoryId,
    amount: params.transactionAmount,
  })
  return { alertsSent: res.alertsSent }
}
