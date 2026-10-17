'use client'

import React, { useState } from 'react'
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Receipt,
  Trash2,
  Calendar,
  Wallet,
} from 'lucide-react'
import { formatRupiah } from '@/lib/utils/currency'
import { authFetch } from '@/lib/utils/auth-client'

export default function TransaksiPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<'all' | 'expense' | 'income' | 'transfer'>('all')
  const [selectedWallet, setSelectedWallet] = useState<string>('all')

  interface DisplayTransaction {
    id: string
    date: string
    rawDate: string
    time: string
    title: string
    category: string
    categoryEmoji?: string
    wallet: string
    type: 'expense' | 'income' | 'transfer'
    amount: number
    notes: string
    source: string
    isReceipt?: boolean
    items?: any[]
  }

  const [transactions, setTransactions] = useState<DisplayTransaction[]>([])
  const [userWallets, setUserWallets] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [expandedReceiptId, setExpandedReceiptId] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [isExporting, setIsExporting] = useState<'pdf' | 'excel' | null>(null)
  const [realtimePulse, setRealtimePulse] = useState(true)

  const fetchTransactions = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await authFetch('/api/transactions', { cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        const formatted: DisplayTransaction[] = json.data.map((tx: any) => {
          let categoryName = tx.type === 'income' ? '💰 Pemasukan' : tx.type === 'transfer' ? '🔄 Transfer' : '💸 Pengeluaran'
          let categoryEmoji = tx.type === 'income' ? '💰' : tx.type === 'transfer' ? '🔄' : '💸'

          if (tx.category && tx.category.name) {
            categoryName = `${tx.category.emoji || '🔖'} ${tx.category.name}`
            categoryEmoji = tx.category.emoji || '🔖'
          } else if (tx.category_name) {
            categoryName = `${tx.category_emoji || '🔖'} ${tx.category_name}`
            categoryEmoji = tx.category_emoji || '🔖'
          } else if (tx.category_id) {
            const knownMap: Record<string, { name: string; emoji: string }> = {
              'cat-makan': { name: 'Makanan & Minuman', emoji: '🍜' },
              'cat-trans': { name: 'Transportasi', emoji: '🚗' },
              'cat-belanja': { name: 'Belanja Bulanan', emoji: '🛒' },
              'cat-tagih': { name: 'Tagihan & Utilitas', emoji: '🏠' },
              'cat-hiburan': { name: 'Hiburan & Hobi', emoji: '🎮' },
              'cat-gaji': { name: 'Gaji Pokok', emoji: '💰' },
              'cat-freelance': { name: 'Freelance & Bonus', emoji: '✨' },
            }
            if (knownMap[tx.category_id]) {
              categoryName = `${knownMap[tx.category_id].emoji} ${knownMap[tx.category_id].name}`
              categoryEmoji = knownMap[tx.category_id].emoji
            }
          }

          const walletName = tx.wallet
            ? tx.wallet.name
            : tx.destination_wallet
              ? `Transfer ke ${tx.destination_wallet.name}`
              : 'BCA Utama'

          const rawDateStr = tx.date || (tx.created_at ? tx.created_at.split('T')[0] : '')

          return {
            id: tx.id,
            date: tx.date || new Date(tx.created_at || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
            rawDate: rawDateStr,
            time: tx.time ? `${tx.time} WIB` : '12:00 WIB',
            title: tx.notes || (tx.type === 'income' ? 'Pemasukan' : tx.type === 'transfer' ? 'Transfer' : 'Pengeluaran'),
            category: categoryName,
            categoryEmoji,
            wallet: walletName,
            type: tx.type,
            amount: Number(tx.amount) || 0,
            notes: tx.notes || '',
            source: tx.source || 'web',
            isReceipt: !!tx.receipt_image_url || tx.source === 'telegram_photo',
          }
        })
        setTransactions(formatted)
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchTransactions()

    authFetch('/api/wallets', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setUserWallets(json.data)
        }
      })
      .catch(() => {})

    const onTxCreated = () => {
      fetchTransactions()
      authFetch('/api/wallets', { cache: 'no-store' })
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            setUserWallets(json.data)
          }
        })
        .catch(() => {})
    }
    window.addEventListener('tatadana_transaction_created', onTxCreated)
    return () => {
      window.removeEventListener('tatadana_transaction_created', onTxCreated)
    }
  }, [fetchTransactions])

  const handleExport = async (type: 'pdf' | 'excel') => {
    setIsExporting(type)
    try {
      const format = type === 'excel' ? 'xlsx' : 'pdf'
      const res = await authFetch(`/api/reports/export?format=${format}`, {
        method: 'GET',
      })
      if (!res.ok) {
        alert('Gagal mengekspor laporan: ' + res.statusText)
        return
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `TataDana_Report_${type}_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      console.error(e)
      alert('Gagal mengekspor laporan: ' + (e.message || 'Unknown error'))
    } finally {
      setIsExporting(null)
    }
  }

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.notes.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = selectedType === 'all' || tx.type === selectedType
    const matchesWallet = selectedWallet === 'all' || tx.wallet.includes(selectedWallet)

    let matchesDate = true
    if (dateFilter !== 'all') {
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
      const currentMonthPrefix = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
      const txDateStr = tx.rawDate || ''

      if (dateFilter === 'today') {
        matchesDate = txDateStr.startsWith(todayStr)
      } else if (dateFilter === 'week') {
        const txTime = new Date(txDateStr || tx.date).getTime()
        const diffDays = (now.getTime() - txTime) / (1000 * 3600 * 24)
        matchesDate = !isNaN(diffDays) && diffDays >= -0.5 && diffDays <= 7.5
      } else if (dateFilter === 'month') {
        matchesDate = txDateStr.startsWith(currentMonthPrefix)
      }
    }

    return matchesSearch && matchesType && matchesWallet && matchesDate
  })

  return (
    <div className="space-y-6">
      {/* Page Header with Export Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              Riwayat Transaksi
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#152332] text-[#10b981] border border-[#10b981]/20">
                {filtered.length} Transaksi
              </span>
            </h2>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#10b981]/10 border border-[#10b981]/20 text-[10px] font-bold text-[#10b981]">
              <span className={`w-2 h-2 rounded-full bg-[#10b981] ${realtimePulse ? 'animate-ping' : ''}`} />
              <span>Realtime Live</span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Semua pemasukan, pengeluaran, dan transfer terintegrasi dengan Telegram Bot & Supabase Realtime.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting !== null}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-[#0a0f16] hover:bg-[#0e1622] border border-[#152332] text-xs font-bold text-slate-200 hover:text-white flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <span className="text-rose-400">📄</span>
            <span>{isExporting === 'pdf' ? 'Mengekspor...' : 'Ekspor PDF'}</span>
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={isExporting !== null}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-[#0a0f16] hover:bg-[#0e1622] border border-[#152332] text-xs font-bold text-slate-200 hover:text-white flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <span className="text-[#10b981]">📊</span>
            <span>{isExporting === 'excel' ? 'Mengekspor...' : 'Ekspor Excel / CSV'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-[#0a0f16] border border-[#152332] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-emerald-500/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari transaksi, kategori, atau tag #tunai..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080d14] border border-[#152332] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#10b981]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-3 py-2.5 rounded-xl bg-[#080d14] border border-[#152332] text-xs text-slate-300 focus:outline-none focus:border-[#10b981]"
          >
            <option value="all">Semua Tanggal</option>
            <option value="today">Hari Ini</option>
            <option value="week">7 Hari Terakhir</option>
            <option value="month">Bulan Ini</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="px-3 py-2.5 rounded-xl bg-[#080d14] border border-[#152332] text-xs text-slate-300 focus:outline-none focus:border-[#10b981]"
          >
            <option value="all">Semua Jenis</option>
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
            <option value="transfer">Transfer</option>
          </select>

          {/* Wallet Filter */}
          <select
            value={selectedWallet}
            onChange={(e) => setSelectedWallet(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-[#080d14] border border-[#152332] text-xs text-slate-300 focus:outline-none focus:border-[#10b981]"
          >
            <option value="all">Semua Dompet</option>
            {userWallets.map((w) => (
              <option key={w.id} value={w.name}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="rounded-3xl bg-[#0a0f16] border border-[#152332] shadow-xl overflow-hidden">
        <div className="divide-y divide-[#152332]">
          {transactions.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] flex items-center justify-center mx-auto text-2xl">
                💳
              </div>
              <h4 className="text-base font-bold text-white">Belum Ada Transaksi Tercatat</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Riwayat transaksi Anda masih kosong (Rp0). Mulai catat transaksi pertama Anda secara manual atau gunakan Tata AI Bot!
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <p className="text-4xl">🔍</p>
              <h4 className="text-sm font-bold text-white">Tidak ada transaksi yang cocok</h4>
              <p className="text-xs text-slate-400">Coba ubah filter atau kata kunci pencarian kamu.</p>
            </div>
          ) : (
            filtered.map((tx) => (
              <div key={tx.id} className="p-4 sm:p-5 hover:bg-[#0e1622]/60 transition-colors">
                <div className="flex items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0 ${
                        tx.type === 'income'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : tx.type === 'transfer'
                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {tx.type === 'income' ? '💰' : tx.type === 'transfer' ? '🔄' : '💸'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white">{tx.title}</h4>
                        {tx.isReceipt && (
                          <button
                            onClick={() =>
                              setExpandedReceiptId(expandedReceiptId === tx.id ? null : tx.id)
                            }
                            className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-brand-500/20 text-brand-400 border border-brand-500/40 hover:bg-brand-500/30 transition-colors flex items-center gap-1"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>{expandedReceiptId === tx.id ? 'Tutup Rincian' : 'Lihat 3 Item Struk'}</span>
                          </button>
                        )}
                        <span className="text-[10px] text-slate-500">
                          via{' '}
                          {tx.source === 'telegram_text'
                            ? 'Telegram Teks'
                            : tx.source === 'telegram_photo'
                            ? 'Telegram Foto Struk'
                            : tx.source === 'telegram_voice'
                            ? 'Telegram Voice Note'
                            : 'Web Dashboard'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-[#152332] text-slate-200 border border-[#152332]">
                          {tx.category}
                        </span>
                        <span className="text-xs text-slate-400">
                          <span className="text-slate-400 font-medium">{tx.wallet}</span> •{' '}
                          <span className="text-slate-500">{tx.date} — {tx.time}</span>
                        </span>
                      </div>
                      {tx.notes && (
                        <p className="text-[11px] text-slate-500 mt-1 italic">&ldquo;{tx.notes}&rdquo;</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      className={`text-base font-black ${
                        tx.type === 'income'
                          ? 'text-[#10b981]'
                          : tx.type === 'transfer'
                          ? 'text-blue-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '' : '-'}
                      {formatRupiah(tx.amount)}
                    </p>
                  </div>
                </div>

                {/* Struk OCR Multi-Item Expansion */}
                {tx.isReceipt && expandedReceiptId === tx.id && tx.items && (
                  <div className="mt-3.5 p-3.5 rounded-2xl bg-[#080d14] border border-[#10b981]/30 space-y-2 text-xs font-mono">
                    <p className="text-[#10b981] font-bold font-sans flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5" />
                      Rincian Item Hasil Ekstraksi Struk OCR:
                    </p>
                    <div className="divide-y divide-[#152332]">
                      {tx.items.map((item, idx) => (
                        <div key={idx} className="py-1.5 flex justify-between items-center text-slate-300">
                          <span>
                            {item.qty}x {item.name}
                          </span>
                          <span className="font-bold text-white">{formatRupiah(item.price)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-[#152332] flex justify-between items-center font-bold text-white">
                      <span>Total Struk Terverifikasi</span>
                      <span className="text-[#10b981]">{formatRupiah(tx.amount)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
