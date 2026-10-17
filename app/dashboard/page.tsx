'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Target,
  Sparkles,
  RefreshCw,
  PieChart as PieChartIcon,
  TrendingUp,
  CreditCard,
  Plus,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts'
import { formatRupiah } from '@/lib/utils/currency'

interface TransactionItem {
  id: string
  date: string
  time: string
  title: string
  category: string
  wallet: string
  type: 'expense' | 'income' | 'transfer'
  amount: number
  source: string
  isReceipt?: boolean
}

export default function DashboardBerandaPage() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [loading, setLoading] = useState(true)

  // Real stats data initialized to zero
  const [stats, setStats] = useState({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    remainingBudget: 0,
    budgetTotal: 0,
    walletCount: 0,
    txCount: 0,
  })

  // Dynamic chart data
  const [categoryData, setCategoryData] = useState<{ name: string; value: number; color: string }[]>([])
  const [sixMonthsData, setSixMonthsData] = useState<{ month: string; pemasukan: number; pengeluaran: number }[]>([])
  const [dailyTrendData, setDailyTrendData] = useState<{ day: string; expense: number }[]>([])
  const [recentTransactions, setRecentTransactions] = useState<TransactionItem[]>([])

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('tatadana_session') || localStorage.getItem('tatadana_admin_session')
          : null
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const [wRes, txRes, bRes] = await Promise.all([
        fetch('/api/wallets', { headers, credentials: 'include', cache: 'no-store' }),
        fetch('/api/transactions?limit=100', { headers, credentials: 'include', cache: 'no-store' }),
        fetch('/api/budgets?period=monthly', { headers, credentials: 'include', cache: 'no-store' }),
      ])

      let walletsList: any[] = []
      let totalBalance = 0
      if (wRes.ok) {
        const wJson = await wRes.json()
        if (wJson.success && Array.isArray(wJson.data)) {
          walletsList = wJson.data
          totalBalance = walletsList.reduce((acc, w) => acc + (Number(w.balance) || 0), 0)
        }
      }

      let txList: any[] = []
      if (txRes.ok) {
        const txJson = await txRes.json()
        if (txJson.success && Array.isArray(txJson.data)) {
          txList = txJson.data
        }
      }

      let budgetTotal = 0
      if (bRes.ok) {
        const bJson = await bRes.json()
        if (bJson.success && bJson.summary) {
          budgetTotal = Number(bJson.summary.total_limit) || 0
        }
      }

      // Compute income & expense based on current month (or selected period)
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const currentYear = now.getFullYear()
      const currentMonth = pad(now.getMonth() + 1)
      const currentMonthPrefix = `${currentYear}-${currentMonth}`
      const todayPrefix = `${currentYear}-${currentMonth}-${pad(now.getDate())}`

      let monthlyIncome = 0
      let monthlyExpense = 0
      const catMap: Record<string, { name: string; value: number; color: string }> = {}
      const dayExpenseMap: Record<string, number> = {}

      const defaultColors = ['#10b981', '#059669', '#0d9488', '#14b8a6', '#6366f1', '#ec4899', '#f59e0b', '#3b82f6']

      for (const tx of txList) {
        const txDate = tx.date || ''
        const amt = Number(tx.amount) || 0

        // Filter based on selected period
        let inPeriod = false
        if (period === 'daily') {
          inPeriod = txDate === todayPrefix
        } else if (period === 'weekly') {
          const diffDays = (now.getTime() - new Date(txDate).getTime()) / (1000 * 3600 * 24)
          inPeriod = diffDays >= 0 && diffDays <= 7
        } else if (period === 'yearly') {
          inPeriod = txDate.startsWith(String(currentYear))
        } else {
          inPeriod = txDate.startsWith(currentMonthPrefix)
        }

        if (inPeriod) {
          if (tx.type === 'income') {
            monthlyIncome += amt
          } else if (tx.type === 'expense') {
            monthlyExpense += amt
            let catName = 'Lainnya'
            let catColor = defaultColors[Object.keys(catMap).length % defaultColors.length]

            if (tx.category && tx.category.name) {
              catName = `${tx.category.emoji || '🏷️'} ${tx.category.name}`
              if (tx.category.color) catColor = tx.category.color
            } else if (tx.category_name) {
              catName = `${tx.category_emoji || '🏷️'} ${tx.category_name}`
            } else if (tx.category_id) {
              const knownMap: Record<string, { name: string; emoji: string; color: string }> = {
                'cat-makan': { name: 'Makanan & Minuman', emoji: '🍜', color: '#f97316' },
                'cat-trans': { name: 'Transportasi', emoji: '🚗', color: '#3b82f6' },
                'cat-belanja': { name: 'Belanja Bulanan', emoji: '🛒', color: '#10b981' },
                'cat-tagih': { name: 'Tagihan & Utilitas', emoji: '🏠', color: '#8b5cf6' },
                'cat-hiburan': { name: 'Hiburan & Hobi', emoji: '🎮', color: '#ec4899' },
                'cat-gaji': { name: 'Gaji Pokok', emoji: '💰', color: '#10b981' },
                'cat-freelance': { name: 'Freelance & Bonus', emoji: '✨', color: '#f59e0b' },
              }
              if (knownMap[tx.category_id]) {
                catName = `${knownMap[tx.category_id].emoji} ${knownMap[tx.category_id].name}`
                catColor = knownMap[tx.category_id].color
              }
            }

            if (!catMap[catName]) {
              catMap[catName] = { name: catName, value: 0, color: catColor }
            }
            catMap[catName].value += amt
          }
        }

        if (txDate.startsWith(currentMonthPrefix) && tx.type === 'expense') {
          const dayStr = txDate.split('-')[2] || '01'
          dayExpenseMap[dayStr] = (dayExpenseMap[dayStr] || 0) + amt
        }
      }

      // 1. Category Data
      const categoryArray = Object.values(catMap).sort((a, b) => b.value - a.value)
      setCategoryData(categoryArray)

      // 2. 6 Months Comparison
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
      const sixMonthsArr: { month: string; pemasukan: number; pengeluaran: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const y = d.getFullYear()
        const m = pad(d.getMonth() + 1)
        const prefix = `${y}-${m}`
        const label = monthNames[d.getMonth()]

        let inMonth = 0
        let outMonth = 0
        for (const tx of txList) {
          if ((tx.date || '').startsWith(prefix)) {
            if (tx.type === 'income') inMonth += Number(tx.amount) || 0
            else if (tx.type === 'expense') outMonth += Number(tx.amount) || 0
          }
        }
        sixMonthsArr.push({ month: label, pemasukan: inMonth, pengeluaran: outMonth })
      }
      setSixMonthsData(sixMonthsArr)

      // 3. Daily trend data (dynamic for current month)
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const currentDay = now.getDate()
      const displayDays = Math.min(daysInMonth, Math.max(currentDay, 15))
      const dailyArr: { day: string; expense: number }[] = []
      for (let d = 1; d <= displayDays; d++) {
        const dayStr = pad(d)
        dailyArr.push({ day: dayStr, expense: dayExpenseMap[dayStr] || 0 })
      }
      setDailyTrendData(dailyArr)

      // 4. Recent transactions
      const formattedRecents: TransactionItem[] = txList.slice(0, 10).map((tx) => {
        let catDisplay = tx.type === 'income' ? '💰 Pemasukan' : '💸 Pengeluaran'
        if (tx.category && tx.category.name) {
          catDisplay = `${tx.category.emoji || '🔖'} ${tx.category.name}`
        } else if (tx.category_name) {
          catDisplay = `${tx.category_emoji || '🔖'} ${tx.category_name}`
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
            catDisplay = `${knownMap[tx.category_id].emoji} ${knownMap[tx.category_id].name}`
          }
        }

        return {
          id: tx.id,
          date: tx.date || 'Hari ini',
          time: tx.time ? `${tx.time} WIB` : '12:00 WIB',
          title: tx.notes || (tx.type === 'income' ? 'Pemasukan' : tx.type === 'transfer' ? 'Transfer' : 'Pengeluaran'),
          category: catDisplay,
          wallet: tx.wallet ? tx.wallet.name : 'Dompet Utama',
          type: tx.type,
          amount: Number(tx.amount) || 0,
          source: tx.source || 'web',
          isReceipt: !!tx.receipt_image_url || tx.source === 'telegram_photo',
        }
      })
      setRecentTransactions(formattedRecents)

      const remainingBudget = Math.max(0, budgetTotal - monthlyExpense)

      setStats({
        totalBalance,
        monthlyIncome,
        monthlyExpense,
        remainingBudget,
        budgetTotal,
        walletCount: walletsList.length,
        txCount: txList.length,
      })

      if (walletsList.length === 0) {
        setShowOnboarding(true)
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    loadDashboardData()
    const handleTxCreated = () => loadDashboardData()
    window.addEventListener('tatadana_transaction_created', handleTxCreated)
    return () => window.removeEventListener('tatadana_transaction_created', handleTxCreated)
  }, [loadDashboardData])

  return (
    <div className="space-y-8">
      {/* Top Welcome & Period Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            Ringkasan Keuangan
            <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Pantau arus kas, sisa anggaran, dan tren pengeluaran harian secara real-time.
          </p>
        </div>

        {/* Period Selector & Refresh */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadDashboardData()}
            title="Refresh Data"
            className="p-2 rounded-xl bg-[#0a0f16] border border-[#152332] text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-400' : ''}`} />
          </button>
          <div className="flex items-center p-1 rounded-2xl bg-[#0a0f16] border border-[#152332] text-xs font-semibold">
            <button
              onClick={() => setPeriod('daily')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                period === 'daily' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Harian
            </button>
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                period === 'weekly' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Mingguan
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                period === 'monthly' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setPeriod('yearly')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                period === 'yearly' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tahunan
            </button>
          </div>
        </div>
      </div>

      {/* Onboarding Checklist (jika user baru / belum ada dompet) */}
      {showOnboarding && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-[#064e3b]/30 via-[#0a0f16] to-[#0a0f16] border border-[#10b981]/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-brand-400" />
              <h3 className="text-base font-bold text-white">Langkah Awal Memulai Akun TataDana</h3>
            </div>
            <button
              onClick={() => setShowOnboarding(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Tutup Panduan ✕
            </button>
          </div>
          <p className="text-xs text-slate-300">
            Akun Anda dalam kondisi bersih (Rp0). Selesaikan 3 langkah mudah berikut untuk mulai mengelola keuangan:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <Link
              href="/dashboard/wallet"
              className="p-4 rounded-2xl bg-[#080d14] border border-[#152332] hover:border-[#10b981]/50 transition-all flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <p className="text-xs font-bold text-white">Tambah Dompet Pertama</p>
                <p className="text-[10px] text-slate-400">BCA, Cash, atau e-Wallet</p>
              </div>
            </Link>
            <Link
              href="/dashboard/settings?tab=telegram"
              className="p-4 rounded-2xl bg-[#080d14] border border-[#152332] hover:border-[#10b981]/50 transition-all flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <p className="text-xs font-bold text-white">Hubungkan Bot Telegram</p>
                <p className="text-[10px] text-slate-400">Catat via chat & foto struk</p>
              </div>
            </Link>
            <Link
              href="/dashboard/budget"
              className="p-4 rounded-2xl bg-[#080d14] border border-[#152332] hover:border-[#10b981]/50 transition-all flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <p className="text-xs font-bold text-white">Pasang Budget Kategori</p>
                <p className="text-[10px] text-slate-400">Alert otomatis jika ≥80%</p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* 4 STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo Total */}
        <div className="p-6 rounded-3xl bg-[#0a0f16] border border-[#152332] shadow-xl relative overflow-hidden group hover:border-[#064e3b] transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Saldo Total</span>
            <div className="w-9 h-9 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {formatRupiah(stats.totalBalance)}
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <span>
              {stats.walletCount === 0
                ? 'Belum ada dompet aktif'
                : `Tersebar di ${stats.walletCount} dompet aktif`}
            </span>
          </p>
        </div>

        {/* Card 2: Pemasukan */}
        <div className="p-6 rounded-3xl bg-[#0a0f16] border border-[#152332] shadow-xl relative overflow-hidden group hover:border-[#064e3b] transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {period === 'daily'
                ? 'Pemasukan Hari Ini'
                : period === 'weekly'
                ? 'Pemasukan Minggu Ini'
                : period === 'yearly'
                ? 'Pemasukan Tahun Ini'
                : 'Pemasukan Bulan Ini'}
            </span>
            <div className="w-9 h-9 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#10b981] tracking-tight">
            {formatRupiah(stats.monthlyIncome)}
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1 font-semibold">
            <span>
              {stats.monthlyIncome > 0 ? 'Pemasukan terverifikasi' : 'Belum ada pemasukan'}
            </span>
          </p>
        </div>

        {/* Card 3: Pengeluaran */}
        <div className="p-6 rounded-3xl bg-[#0a0f16] border border-[#152332] shadow-xl relative overflow-hidden group hover:border-[#064e3b] transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {period === 'daily'
                ? 'Pengeluaran Hari Ini'
                : period === 'weekly'
                ? 'Pengeluaran Minggu Ini'
                : period === 'yearly'
                ? 'Pengeluaran Tahun Ini'
                : 'Pengeluaran Bulan Ini'}
            </span>
            <div className="w-9 h-9 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-400 tracking-tight">
            {formatRupiah(stats.monthlyExpense)}
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <span>
              {stats.budgetTotal > 0
                ? `${Math.round((stats.monthlyExpense / stats.budgetTotal) * 100)}% dari total budget`
                : 'Belum ada batas budget'}
            </span>
          </p>
        </div>

        {/* Card 4: Budget Tersisa */}
        <div className="p-6 rounded-3xl bg-[#0a0f16] border border-[#152332] shadow-xl relative overflow-hidden group hover:border-[#064e3b] transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Budget Tersisa</span>
            <div className="w-9 h-9 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#10b981] tracking-tight">
            {formatRupiah(stats.remainingBudget)}
          </div>
          <div className="w-full bg-[#152332] h-2 rounded-full overflow-hidden mt-3">
            <div
              className="bg-[#10b981] h-full transition-all duration-500"
              style={{
                width: `${
                  stats.budgetTotal > 0
                    ? Math.min(100, Math.round((stats.monthlyExpense / stats.budgetTotal) * 100))
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* CHARTS ROW (Pie Chart & 6 Months Comparison) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Donut Chart: Pengeluaran per Kategori (5 Cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-[#0a0f16] border border-[#152332] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-white">Pengeluaran per Kategori</h3>
                <p className="text-xs text-slate-400">Breakdown alokasi dana periode ini</p>
              </div>
            </div>

            {categoryData.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-center p-6 space-y-2">
                <PieChartIcon className="w-10 h-10 text-slate-600 mb-1" />
                <p className="text-xs font-bold text-white">Belum Ada Pengeluaran</p>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  Pengeluaran periode ini masih Rp0. Catat transaksi baru untuk melihat alokasi kategori secara otomatis.
                </p>
              </div>
            ) : (
              <div>
                <div className="h-56 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: number) => formatRupiah(val)}
                        contentStyle={{
                          backgroundColor: '#0a0f16',
                          borderColor: '#152332',
                          borderRadius: '12px',
                          color: '#fff',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
                        }}
                        itemStyle={{ color: '#e2e8f0' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Total</span>
                    <span className="text-sm font-black text-white">{formatRupiah(stats.monthlyExpense)}</span>
                  </div>
                </div>

                {/* Category Legend list */}
                <div className="space-y-2 mt-4 max-h-48 overflow-y-auto pr-1">
                  {categoryData.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs py-1 border-b border-[#152332]/60 last:border-none"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="text-slate-300 font-medium">{c.name}</span>
                      </div>
                      <span className="text-white font-bold">{formatRupiah(c.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bar Chart: Pemasukan vs Pengeluaran 6 Bulan (7 Cols) */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-[#0a0f16] border border-[#152332] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-white">Arus Kas 6 Bulan Terakhir</h3>
                <p className="text-xs text-slate-400">Perbandingan pemasukan vs pengeluaran</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-[#10b981]" />
                  <span className="text-slate-300 font-medium">Pemasukan</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-rose-500" />
                  <span className="text-slate-300 font-medium">Pengeluaran</span>
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sixMonthsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#152332" vertical={false} />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => (val >= 1000000 ? `${val / 1000000}jt` : `${val / 1000}k`)}
                  />
                  <Tooltip
                    formatter={(val: number) => formatRupiah(val)}
                    contentStyle={{
                      backgroundColor: '#0a0f16',
                      borderColor: '#152332',
                      borderRadius: '12px',
                      color: '#fff',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
                    }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="pemasukan" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="pengeluaran" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* TREND LINE & 10 TRANSAKSI TERBARU */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trend Line Pengeluaran Harian (5 Cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-[#0a0f16] border border-[#152332] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Tren Harian Bulan Ini</h3>
                <p className="text-xs text-slate-400">Fluktuasi pengeluaran per hari bulan ini</p>
              </div>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#152332" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => (val >= 1000 ? `${val / 1000}k` : `${val}`)}
                  />
                  <Tooltip
                    formatter={(val: number) => formatRupiah(val)}
                    contentStyle={{
                      backgroundColor: '#0a0f16',
                      borderColor: '#152332',
                      borderRadius: '12px',
                      color: '#fff',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
                    }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6, fill: '#34d399' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 10 Transaksi Terbaru (7 Cols) */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-[#0a0f16] border border-[#152332] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">10 Transaksi Terbaru</h3>
                <p className="text-xs text-slate-400">Diperbarui real-time via Web & Bot Telegram</p>
              </div>
              <Link
                href="/dashboard/transaksi"
                className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1"
              >
                Lihat Semua →
              </Link>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <CreditCard className="w-10 h-10 text-slate-600 mx-auto mb-1" />
                <h4 className="text-sm font-bold text-white">Belum Ada Transaksi Tercatat</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Kondisi keuangan akun Anda masih bersih (0 transaksi). Mulai dengan membuat dompet dan catat transaksi pertama Anda!
                </p>
                <Link
                  href="/dashboard/wallet"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30 hover:bg-brand-500/30 text-xs font-bold transition-all mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Dompet Pertama</span>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#152332] max-h-[360px] overflow-y-auto pr-1">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="py-2.5 flex items-center justify-between hover:bg-[#0e1622]/60 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm ${
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
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white">{tx.title}</p>
                          {tx.isReceipt && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/40">
                              Struk OCR
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {tx.category} • <span className="text-slate-500">{tx.wallet}</span> • {tx.time}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-xs font-extrabold ${
                          tx.type === 'income'
                            ? 'text-emerald-400'
                            : tx.type === 'transfer'
                            ? 'text-blue-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '' : '-'}
                        {formatRupiah(tx.amount)}
                      </p>
                      <span className="text-[9px] text-slate-500">{tx.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
