import { NextResponse } from 'next/server'
import { extractSessionToken, verifySessionToken } from '@/lib/auth/tokens'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PersistentStore, OFFICIAL_SUPERADMIN_ID } from '@/lib/db/store'
import { ExcelReportGenerator } from '@/lib/export/excel'
import { PDFReportGenerator } from '@/lib/export/pdf'
import { formatRupiah } from '@/lib/utils/currency'

export const dynamic = 'force-dynamic'

/**
 * Sanitizes cell text against CSV Formula Injection (Clause M).
 * Prepends single quote if string begins with =, +, -, or @.
 */
function sanitizeCSVCell(value: any): string {
  if (value === null || value === undefined) return '""'
  let str = String(value).trim()
  if (/^[=+\-@]/.test(str)) {
    str = `'` + str
  }
  return `"${str.replace(/"/g, '""')}"`
}

async function resolveAuthenticatedUserId(req: Request): Promise<string | null> {
  // 1. Session token header or cookie
  const token = extractSessionToken(req)
  if (token) {
    const payload = verifySessionToken(token)
    if (payload?.userId) return payload.userId
  }

  // 2. Supabase auth session
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch {}

  return null
}

export async function POST(req: Request) {
  try {
    const userId = await resolveAuthenticatedUserId(req)
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Autentikasi diperlukan untuk mengunduh laporan.' },
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const fileType = (body.fileType || body.format || body.type || 'csv').toLowerCase()
    const filter = body.filter || {}

    return generateExportResponse(userId, fileType, filter)
  } catch (error: any) {
    console.error('[API Export Report] Error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memproses ekspor laporan.' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const userId = await resolveAuthenticatedUserId(req)
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Autentikasi diperlukan untuk mengunduh laporan.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const fileType = (searchParams.get('format') || searchParams.get('fileType') || searchParams.get('type') || 'csv').toLowerCase()
    const filter = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      walletId: searchParams.get('walletId') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      type: (searchParams.get('type') || undefined) as any,
    }

    return generateExportResponse(userId, fileType, filter)
  } catch (error: any) {
    console.error('[API Export Report GET] Error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memproses ekspor laporan.' },
      { status: 500 }
    )
  }
}

async function generateExportResponse(userId: string, fileType: string, filter: any) {
  const user = PersistentStore.findUserById(userId)
  const userName = user?.name || 'TataDana User'
  const userPhone = user?.phone || '-'

  // 1. Fetch persistent transactions
  const transactions = PersistentStore.getTransactions(userId, {
    start_date: filter.startDate,
    end_date: filter.endDate,
    wallet_id: filter.walletId && filter.walletId !== 'all' ? filter.walletId : undefined,
    category_id: filter.categoryId && filter.categoryId !== 'all' ? filter.categoryId : undefined,
    type: filter.type && filter.type !== 'all' ? filter.type : undefined,
  })

  const wallets = PersistentStore.getWallets(userId)
  const categories = PersistentStore.getCategories(userId)
  const walletMap = new Map(wallets.map((w) => [w.id, w.name]))
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

  const todayStr = new Date().toISOString().split('T')[0]
  const dateRangeStr = `${filter.startDate || 'Semua'}_sd_${filter.endDate || todayStr}`

  // -------------------------------------------------------------
  // CSV EXPORT (with Formula Injection Protection)
  // -------------------------------------------------------------
  if (fileType === 'csv') {
    const headers = [
      'ID Transaksi',
      'Tanggal',
      'Waktu',
      'Tipe',
      'Nominal (IDR)',
      'Kategori',
      'Dompet Asal',
      'Dompet Tujuan',
      'Catatan',
      'Sumber',
    ]

    const rows = transactions.map((tx) => [
      sanitizeCSVCell(tx.id),
      sanitizeCSVCell(tx.date),
      sanitizeCSVCell(tx.time || '00:00'),
      sanitizeCSVCell(tx.type === 'income' ? 'Pemasukan' : tx.type === 'expense' ? 'Pengeluaran' : 'Transfer'),
      sanitizeCSVCell(tx.amount), // numeric integer IDR
      sanitizeCSVCell(tx.category_id ? categoryMap.get(tx.category_id) || 'Umum' : '-'),
      sanitizeCSVCell(tx.wallet_id ? walletMap.get(tx.wallet_id) || 'Dompet' : '-'),
      sanitizeCSVCell(tx.destination_wallet_id ? walletMap.get(tx.destination_wallet_id) || '-' : '-'),
      sanitizeCSVCell(tx.notes || ''),
      sanitizeCSVCell(tx.source || 'web'),
    ])

    // Prepend UTF-8 BOM \uFEFF so Excel automatically recognizes Indonesian UTF-8 characters
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="TataDana_Laporan_${dateRangeStr}.csv"`,
      },
    })
  }

  // -------------------------------------------------------------
  // EXCEL (.XLSX) EXPORT
  // -------------------------------------------------------------
  if (fileType === 'excel' || fileType === 'xlsx') {
    let totalIncome = 0
    let totalExpense = 0
    for (const tx of transactions) {
      if (tx.type === 'income') totalIncome += tx.amount
      else if (tx.type === 'expense') totalExpense += tx.amount
    }

    const summary = {
      period: {
        startDate: filter.startDate || 'Awal',
        endDate: filter.endDate || todayStr,
      },
      totalIncome,
      totalExpense,
      netCashflow: totalIncome - totalExpense,
      transactionCount: transactions.length,
      topExpenseCategories: [],
      walletBalances: wallets.map((w) => ({
        walletId: w.id,
        name: w.name,
        type: w.type,
        balance: w.balance,
        icon: w.icon || '👛',
      })),
    }

    const profileData: any = {
      id: userId,
      full_name: userName,
      phone_number: userPhone,
      plan: user?.plan || 'starter',
    }

    const mappedTransactions: any[] = transactions.map((tx) => ({
      ...tx,
      wallet: { name: tx.wallet_id ? walletMap.get(tx.wallet_id) || 'Dompet' : 'Dompet' },
      category: { name: tx.category_id ? categoryMap.get(tx.category_id) || 'Umum' : 'Umum' },
    }))

    const buffer = await ExcelReportGenerator.generateWorkbookBuffer(
      profileData,
      summary,
      mappedTransactions
    )

    return new Response(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="TataDana_Laporan_${dateRangeStr}.xlsx"`,
      },
    })
  }

  // -------------------------------------------------------------
  // PDF EXPORT
  // -------------------------------------------------------------
  if (fileType === 'pdf') {
    let totalIncome = 0
    let totalExpense = 0
    for (const tx of transactions) {
      if (tx.type === 'income') totalIncome += tx.amount
      else if (tx.type === 'expense') totalExpense += tx.amount
    }

    const summary = {
      period: {
        startDate: filter.startDate || 'Awal',
        endDate: filter.endDate || todayStr,
      },
      totalIncome,
      totalExpense,
      netCashflow: totalIncome - totalExpense,
      transactionCount: transactions.length,
      topExpenseCategories: [],
      walletBalances: wallets.map((w) => ({
        walletId: w.id,
        name: w.name,
        type: w.type,
        balance: w.balance,
        icon: w.icon || '👛',
      })),
    }

    const profileData: any = {
      id: userId,
      full_name: userName,
      phone_number: userPhone,
      plan: user?.plan || 'starter',
    }

    const mappedTransactions: any[] = transactions.map((tx) => ({
      ...tx,
      wallet: { name: tx.wallet_id ? walletMap.get(tx.wallet_id) || 'Dompet' : 'Dompet' },
      category: { name: tx.category_id ? categoryMap.get(tx.category_id) || 'Umum' : 'Umum' },
    }))

    const buffer = await PDFReportGenerator.generatePDFBuffer(
      profileData,
      summary,
      mappedTransactions
    )

    return new Response(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="TataDana_Laporan_${dateRangeStr}.pdf"`,
      },
    })
  }

  return NextResponse.json(
    { success: false, message: 'Format file tidak didukung. Gunakan "csv", "excel", atau "pdf".' },
    { status: 400 }
  )
}
