'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  FileSpreadsheet,
  FileText,
  Download,
  Filter,
  Calendar,
  Search,
  ArrowUpDown,
  History,
  CheckCircle2,
  Receipt,
  ChevronDown,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import { formatRupiah } from '@/lib/utils/currency'
import { authFetch } from '@/lib/utils/auth-client'

interface DisplayTransaction {
  id: string
  date: string
  rawDate: string
  time: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  category: string
  categoryId: string
  wallet: string
  walletId: string
  notes: string
  isReceipt?: boolean
  items?: { name: string; qty: number; price: number }[]
}

interface ExportItem {
  id: string
  fileName: string
  type: string
  period: string
  size: string
  createdAt: string
}

export default function LaporanPage() {
  const [dateStart, setDateStart] = useState(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}-01`
  })

  const [dateEnd, setDateEnd] = useState(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
    return `${y}-${m}-${String(lastDay).padStart(2, '0')}`
  })

  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedWallet, setSelectedWallet] = useState('all')
  const [searchNotes, setSearchNotes] = useState('')
  const [sortField, setSortField] = useState<'date' | 'amount' | 'category' | 'wallet'>('date')
  const [sortAsc, setSortAsc] = useState(false)
  const [isExporting, setIsExporting] = useState<'pdf' | 'excel' | 'csv' | null>(null)
  const [expandedReceiptId, setExpandedReceiptId] = useState<string | null>(null)

  // Live data from backend
  const [rawTransactions, setRawTransactions] = useState<any[]>([])
  const [wallets, setWallets] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Saved Export History
  const [exportHistories, setExportHistories] = useState<ExportItem[]>([
    {
      id: 'exp-1',
      fileName: 'Laporan_Keuangan_TataDana_Bulan_Lalu.pdf',
      type: 'pdf',
      period: '01 Sep 2026 – 30 Sep 2026',
      size: '245 KB',
      createdAt: '01 Okt 2026, 08:30 WIB',
    },
    {
      id: 'exp-2',
      fileName: 'Laporan_Keuangan_TataDana_Bulan_Lalu.xlsx',
      type: 'xlsx',
      period: '01 Sep 2026 – 30 Sep 2026',
      size: '118 KB',
      createdAt: '01 Okt 2026, 08:32 WIB',
    },
  ])

  const fetchLiveReportData = useCallback(async () => {
    try {
      setLoading(true)
      const [txRes, wRes, cRes] = await Promise.all([
        authFetch('/api/transactions?limit=200', { cache: 'no-store' }),
        authFetch('/api/wallets', { cache: 'no-store' }),
        authFetch('/api/categories', { cache: 'no-store' }),
      ])

      if (txRes.ok) {
        const txJson = await txRes.json()
        if (txJson.success && Array.isArray(txJson.data)) {
          setRawTransactions(txJson.data)
        }
      }

      if (wRes.ok) {
        const wJson = await wRes.json()
        if (wJson.success && Array.isArray(wJson.data)) {
          setWallets(wJson.data)
        }
      }

      if (cRes.ok) {
        const cJson = await cRes.json()
        if (cJson.success && Array.isArray(cJson.data)) {
          setCategories(cJson.data)
        }
      }
    } catch (err) {
      console.error('Failed to load report live data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLiveReportData()
    const handleTxCreated = () => fetchLiveReportData()
    window.addEventListener('tatadana_transaction_created', handleTxCreated)
    return () => window.removeEventListener('tatadana_transaction_created', handleTxCreated)
  }, [fetchLiveReportData])

  // Process & enrich transactions
  const processedTransactions = useMemo<DisplayTransaction[]>(() => {
    const knownMap: Record<string, { name: string; emoji: string }> = {
      'cat-makan': { name: 'Makanan & Minuman', emoji: '🍜' },
      'cat-trans': { name: 'Transportasi', emoji: '🚗' },
      'cat-belanja': { name: 'Belanja Bulanan', emoji: '🛒' },
      'cat-tagih': { name: 'Tagihan & Utilitas', emoji: '🏠' },
      'cat-hiburan': { name: 'Hiburan & Hobi', emoji: '🎮' },
      'cat-gaji': { name: 'Gaji Pokok', emoji: '💰' },
      'cat-freelance': { name: 'Freelance & Bonus', emoji: '✨' },
    }

    return rawTransactions.map((tx: any) => {
      let catName = tx.type === 'income' ? '💰 Pemasukan' : tx.type === 'transfer' ? '🔄 Transfer' : '💸 Pengeluaran'

      if (tx.category && tx.category.name) {
        catName = `${tx.category.emoji || '🔖'} ${tx.category.name}`
      } else if (tx.category_name) {
        catName = `${tx.category_emoji || '🔖'} ${tx.category_name}`
      } else if (tx.category_id && knownMap[tx.category_id]) {
        catName = `${knownMap[tx.category_id].emoji} ${knownMap[tx.category_id].name}`
      }

      const walletName = tx.wallet?.name || (tx.wallet_id ? 'Dompet' : 'BCA Utama')
      const rawDateStr = tx.date || (tx.created_at ? tx.created_at.split('T')[0] : '')

      return {
        id: tx.id,
        date: tx.date || rawDateStr,
        rawDate: rawDateStr,
        time: tx.time ? `${tx.time} WIB` : '12:00 WIB',
        type: tx.type,
        amount: Number(tx.amount) || 0,
        category: catName,
        categoryId: tx.category_id || tx.category?.id || '',
        wallet: walletName,
        walletId: tx.wallet_id || '',
        notes: tx.notes || tx.note || (tx.type === 'income' ? 'Pemasukan' : tx.type === 'transfer' ? 'Transfer' : 'Pengeluaran'),
        isReceipt: !!tx.receipt_image_url || tx.source === 'telegram_photo',
        items: tx.items,
      }
    })
  }, [rawTransactions])

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return processedTransactions.filter((tx) => {
      if (dateStart && tx.rawDate && tx.rawDate < dateStart) return false
      if (dateEnd && tx.rawDate && tx.rawDate > dateEnd) return false

      if (selectedCategory !== 'all') {
        const matchId = tx.categoryId === selectedCategory
        const matchName = tx.category.toLowerCase().includes(selectedCategory.toLowerCase())
        if (!matchId && !matchName) return false
      }

      if (selectedWallet !== 'all') {
        const matchId = tx.walletId === selectedWallet
        const matchName = tx.wallet.toLowerCase().includes(selectedWallet.toLowerCase())
        if (!matchId && !matchName) return false
      }

      if (searchNotes.trim()) {
        const q = searchNotes.toLowerCase()
        const matches =
          tx.notes.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q) ||
          tx.wallet.toLowerCase().includes(q)
        if (!matches) return false
      }

      return true
    })
  }, [processedTransactions, dateStart, dateEnd, selectedCategory, selectedWallet, searchNotes])

  // Summary computed from live filtered transactions
  const summary = useMemo(() => {
    let totalIncome = 0
    let totalExpense = 0
    const catExpenseMap: Record<string, number> = {}

    for (const tx of filteredTransactions) {
      if (tx.type === 'income') {
        totalIncome += tx.amount
      } else if (tx.type === 'expense') {
        totalExpense += tx.amount
        catExpenseMap[tx.category] = (catExpenseMap[tx.category] || 0) + tx.amount
      }
    }

    const topCategories = Object.entries(catExpenseMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 1000) / 10 : 0,
      }))

    return {
      totalIncome,
      totalExpense,
      netCashflow: totalIncome - totalExpense,
      topCategories,
    }
  }, [filteredTransactions])

  const handleExport = async (type: 'pdf' | 'excel' | 'csv') => {
    setIsExporting(type)
    try {
      const format = type === 'excel' ? 'xlsx' : type === 'csv' ? 'csv' : 'pdf'
      let url = `/api/reports/export?format=${format}&startDate=${dateStart}&endDate=${dateEnd}`
      if (selectedWallet !== 'all') url += `&walletId=${encodeURIComponent(selectedWallet)}`
      if (selectedCategory !== 'all') url += `&categoryId=${encodeURIComponent(selectedCategory)}`

      const res = await authFetch(url, { method: 'GET' })
      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText)
        alert('Gagal mengekspor laporan: ' + errText)
        return
      }

      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      const ext = format === 'xlsx' ? 'xlsx' : format === 'csv' ? 'csv' : 'pdf'
      const fileName = `Laporan_TataDana_${dateStart}_sd_${dateEnd}.${ext}`
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)

      const sizeStr = `${Math.max(1, Math.round(blob.size / 1024))} KB`
      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
      const newExp: ExportItem = {
        id: `exp-${Date.now()}`,
        fileName,
        type: format,
        period: `${dateStart} – ${dateEnd}`,
        size: sizeStr,
        createdAt: `Hari ini, ${nowStr}`,
      }
      setExportHistories((prev) => [newExp, ...prev])
    } catch (err: any) {
      alert('Gagal mengekspor laporan: ' + (err.message || err))
    } finally {
      setIsExporting(null)
    }
  }

  const toggleSort = (field: 'date' | 'amount' | 'category' | 'wallet') => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let cmp = 0
      if (sortField === 'date') cmp = a.rawDate.localeCompare(b.rawDate)
      else if (sortField === 'amount') cmp = a.amount - b.amount
      else if (sortField === 'category') cmp = a.category.localeCompare(b.category)
      else if (sortField === 'wallet') cmp = a.wallet.localeCompare(b.wallet)
      return sortAsc ? cmp : -cmp
    })
  }, [filteredTransactions, sortField, sortAsc])

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            Laporan Keuangan
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Analisis arus kas mendalam, ringkasan per periode, dan generate export file PDF / Excel on-demand.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => fetchLiveReportData()}
            title="Refresh Data"
            className="p-2.5 rounded-xl bg-[#0a0f16] border border-[#152332] text-slate-400 hover:text-white hover:border-[#10b981]/50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#10b981]' : ''}`} />
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting !== null}
            className="px-3.5 py-2.5 rounded-xl bg-[#0a0f16] hover:bg-[#0e1622] border border-[#152332] text-xs font-bold text-slate-200 hover:text-white flex items-center gap-2 shadow-sm transition-all"
          >
            <span className="text-[#10b981]">📋</span>
            <span>{isExporting === 'csv' ? 'Mengekspor...' : 'Export CSV'}</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting !== null}
            className="px-3.5 py-2.5 rounded-xl bg-[#0a0f16] hover:bg-[#0e1622] border border-[#152332] text-xs font-bold text-slate-200 hover:text-white flex items-center gap-2 shadow-sm transition-all"
          >
            <FileText className="w-4 h-4 text-rose-400" />
            <span>{isExporting === 'pdf' ? 'Generating PDF...' : 'Export PDF'}</span>
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={isExporting !== null}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-[#10b981]/20 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-white" />
            <span>{isExporting === 'excel' ? 'Generating Excel...' : 'Export Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* RINGKASAN PERIODE (3 STATS CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 rounded-3xl bg-[#0a0f16] border border-[#152332] shadow-xl hover:border-[#064e3b] transition-all">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Pemasukan</p>
          <p className="text-2xl font-black text-[#10b981] mt-2">{formatRupiah(summary.totalIncome)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Periode {dateStart} s/d {dateEnd}</p>
        </div>

        <div className="p-6 rounded-3xl bg-[#0a0f16] border border-[#152332] shadow-xl hover:border-[#064e3b] transition-all">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Pengeluaran</p>
          <p className="text-2xl font-black text-rose-400 mt-2">{formatRupiah(summary.totalExpense)}</p>
          <p className="text-[11px] text-slate-400 mt-1">{filteredTransactions.length} transaksi dalam filter</p>
        </div>

        <div className="p-6 rounded-3xl bg-[#0a0f16] border border-[#152332] shadow-xl hover:border-[#064e3b] transition-all">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Net Cashflow</p>
          <p className={`text-2xl font-black mt-2 ${summary.netCashflow >= 0 ? 'text-[#10b981]' : 'text-rose-400'}`}>
            {summary.netCashflow >= 0 ? '+' : ''}{formatRupiah(summary.netCashflow)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 font-semibold">
            {summary.netCashflow >= 0 ? 'Surplus positif sehat' : 'Defisit arus kas'}
          </p>
        </div>
      </div>

      {/* TOP 5 KATEGORI PENGELUARAN */}
      <div className="p-6 rounded-3xl bg-[#0a0f16] border border-[#152332] shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white">Top 5 Kategori Pengeluaran Terbesar</h3>
        {summary.topCategories.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">Belum ada pengeluaran pada rentang tanggal yang dipilih.</p>
        ) : (
          <div className="space-y-3">
            {summary.topCategories.map((cat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300">{cat.name}</span>
                  <span className="font-bold text-white">
                    {formatRupiah(cat.amount)} ({cat.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-[#152332] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#10b981] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, cat.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FILTER & DATE RANGE BAR */}
      <div className="p-4 rounded-3xl bg-[#0a0f16] border border-[#152332] flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-[#080d14] px-3 py-2 rounded-xl border border-[#152332] text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-[#10b981]" />
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="bg-transparent focus:outline-none text-white text-xs"
            />
            <span className="text-slate-500">s/d</span>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className="bg-transparent focus:outline-none text-white text-xs"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#080d14] border border-[#152332] text-xs text-slate-300 focus:outline-none focus:border-[#10b981]"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.name}>
                {c.emoji || '🏷️'} {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedWallet}
            onChange={(e) => setSelectedWallet(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#080d14] border border-[#152332] text-xs text-slate-300 focus:outline-none focus:border-[#10b981]"
          >
            <option value="all">Semua Dompet</option>
            {wallets.map((w: any) => (
              <option key={w.id} value={w.name}>
                {w.icon || '💳'} {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari catatan transaksi..."
            value={searchNotes}
            onChange={(e) => setSearchNotes(e.target.value)}
            className="pl-8 pr-3 py-2 rounded-xl bg-[#080d14] border border-[#152332] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#10b981]"
          />
        </div>
      </div>

      {/* SORTABLE NATIVE REPORT TABLE */}
      <div className="rounded-3xl bg-[#0a0f16] border border-[#152332] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080d14] border-b border-[#152332] text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th
                  onClick={() => toggleSort('date')}
                  className="p-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Tanggal & Jam</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('category')}
                  className="p-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Kategori</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('wallet')}
                  className="p-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Dompet</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="p-4">Catatan / Rincian</th>
                <th
                  onClick={() => toggleSort('amount')}
                  className="p-4 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Nominal</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#152332]">
              {sortedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500 text-xs">
                    {loading ? 'Memuat laporan...' : 'Tidak ada transaksi pada filter ini.'}
                  </td>
                </tr>
              ) : (
                sortedTransactions.map((tx) => (
                  <React.Fragment key={tx.id}>
                    <tr className="hover:bg-[#0e1622]/60 transition-colors">
                      <td className="p-4 text-slate-300 font-mono">
                        <div>{tx.date}</div>
                        <div className="text-[10px] text-slate-500">{tx.time}</div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-[#152332] text-slate-200 border border-[#152332]">
                          {tx.category}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">{tx.wallet}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300">{tx.notes}</span>
                          {tx.isReceipt && (
                            <button
                              onClick={() =>
                                setExpandedReceiptId(expandedReceiptId === tx.id ? null : tx.id)
                              }
                              className="px-2 py-0.5 rounded-lg bg-brand-500/20 text-brand-400 border border-brand-500/40 font-bold text-[10px] flex items-center gap-1"
                            >
                              <Receipt className="w-3 h-3" />
                              <span>{expandedReceiptId === tx.id ? 'Tutup' : 'Expand Struk'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span
                          className={`font-black text-sm ${
                            tx.type === 'income' ? 'text-[#10b981]' : 'text-rose-400'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'}
                          {formatRupiah(tx.amount)}
                        </span>
                      </td>
                    </tr>

                    {/* Multi-item Receipt Expanded Row */}
                    {tx.isReceipt && expandedReceiptId === tx.id && tx.items && (
                      <tr className="bg-[#080d14] border-b border-[#10b981]/30">
                        <td colSpan={5} className="p-4">
                          <div className="p-3.5 rounded-2xl bg-[#06090e] border border-[#10b981]/30 font-mono text-xs space-y-2">
                            <p className="text-[#10b981] font-bold font-sans flex items-center gap-1.5">
                              <Receipt className="w-4 h-4" />
                              Rincian Item Struk Belanja:
                            </p>
                            <div className="divide-y divide-[#152332]">
                              {tx.items.map((item, idx) => (
                                <div key={idx} className="py-1 flex justify-between text-slate-300">
                                  <span>
                                    {item.qty}x {item.name}
                                  </span>
                                  <span className="font-bold text-white">{formatRupiah(item.price)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIWAYAT EXPORT FILE TERSIMPAN */}
      <div className="p-6 rounded-3xl bg-[#0a0f16] border border-[#152332] shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#10b981]" />
            <h3 className="text-base font-bold text-white">Riwayat Export Laporan Tersimpan</h3>
          </div>
          <span className="text-xs text-slate-400">Download ulang file laporan</span>
        </div>

        <div className="divide-y divide-[#152332]">
          {exportHistories.map((exp) => (
            <div key={exp.id} className="py-3 flex items-center justify-between hover:bg-[#0e1622]/60 px-2 rounded-xl transition-colors">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                    exp.type === 'pdf' ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'
                  }`}
                >
                  {exp.type === 'pdf' ? <FileText className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{exp.fileName}</p>
                  <p className="text-[10px] text-slate-400">
                    Periode: {exp.period} • Ukuran: {exp.size} • Dibuat: {exp.createdAt}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleExport(exp.type === 'pdf' ? 'pdf' : exp.type === 'csv' ? 'csv' : 'excel')}
                className="px-3 py-1.5 rounded-xl bg-[#152332] hover:bg-[#1e3046] text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
