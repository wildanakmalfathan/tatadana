'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Target,
  AlertTriangle,
  Bell,
  Edit3,
  CheckCircle2,
  Calendar,
  Clock,
  CalendarDays,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  Check,
  X,
  Plus,
  Trash2,
} from 'lucide-react'
import { formatRupiah } from '@/lib/utils/currency'
import { authFetch } from '@/lib/utils/auth-client'

type BudgetPeriod = 'daily' | 'weekly' | 'monthly'

interface BudgetItem {
  id: string
  category_id: string
  period: BudgetPeriod
  limit: number
  spent: number
  remaining: number
  percentage: number
  status: 'safe' | 'warning' | 'overbudget'
  category: {
    id: string
    name: string
    emoji: string
    color: string
  }
}

interface BudgetResponseSummary {
  total_limit: number
  total_spent: number
  overbudget_count: number
  warning_count: number
}

interface CategoryOption {
  id: string
  name: string
  emoji: string
  color?: string
}

export default function BudgetPage() {
  const [period, setPeriod] = useState<BudgetPeriod>('monthly')
  const [budgets, setBudgets] = useState<BudgetItem[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [summary, setSummary] = useState<BudgetResponseSummary>({
    total_limit: 0,
    total_spent: 0,
    overbudget_count: 0,
    warning_count: 0,
  })
  const [loading, setLoading] = useState<boolean>(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Edit limit modal state
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null)
  const [editLimitInput, setEditLimitInput] = useState<string>('')
  const [savingLimit, setSavingLimit] = useState<boolean>(false)

  // Add new budget modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false)
  const [selectedCatForNew, setSelectedCatForNew] = useState<string>('')
  const [selectedPeriodForNew, setSelectedPeriodForNew] = useState<BudgetPeriod>('monthly')
  const [newLimitInput, setNewLimitInput] = useState<string>('')

  // Fetch budgets from API for the selected period
  const fetchBudgets = useCallback(async (selectedPeriod: BudgetPeriod) => {
    try {
      setLoading(true)
      setErrorMsg(null)
      const res = await authFetch(`/api/budgets?period=${selectedPeriod}`, { cache: 'no-store' })
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setBudgets(json.data)
        if (json.summary) {
          setSummary(json.summary)
        }
      } else {
        throw new Error(json.message || 'Gagal memuat data anggaran')
      }
    } catch (err: any) {
      console.error('Fetch budgets error:', err)
      setErrorMsg(err.message || 'Gagal memuat anggaran.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch categories on mount for budget creation
  useEffect(() => {
    authFetch('/api/categories', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const list = json.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            emoji: c.emoji || '🏷️',
            color: c.color || '#10b981',
          }))
          setCategories(list)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchBudgets(period)
    const handleTxCreated = () => fetchBudgets(period)
    window.addEventListener('tatadana_transaction_created', handleTxCreated)
    return () => window.removeEventListener('tatadana_transaction_created', handleTxCreated)
  }, [period, fetchBudgets])

  // Open edit modal
  const openEditModal = (item: BudgetItem) => {
    setEditingItem(item)
    setEditLimitInput(String(item.limit))
  }

  // Open add modal
  const openAddModal = () => {
    setSelectedPeriodForNew(period)
    if (categories.length > 0 && !selectedCatForNew) {
      setSelectedCatForNew(categories[0].id)
    }
    setNewLimitInput('')
    setIsAddModalOpen(true)
  }

  // Save edited limit
  const handleSaveEditLimit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    const amount = Number(editLimitInput)
    if (isNaN(amount) || amount < 0) {
      alert('Nominal anggaran harus angka positif.')
      return
    }

    try {
      setSavingLimit(true)
      const res = await authFetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: editingItem.category_id,
          period,
          amount,
        }),
      })
      const json = await res.json()
      if (json.success) {
        await fetchBudgets(period)
        setEditingItem(null)
      } else {
        alert(json.message || 'Gagal menyimpan anggaran.')
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan anggaran.')
    } finally {
      setSavingLimit(false)
    }
  }

  // Create new budget limit
  const handleCreateNewBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    const catId = selectedCatForNew || (categories.length > 0 ? categories[0].id : '')
    if (!catId) {
      alert('Pilih kategori anggaran.')
      return
    }

    const amount = Number(newLimitInput)
    if (isNaN(amount) || amount < 0) {
      alert('Nominal anggaran harus angka positif.')
      return
    }

    try {
      setSavingLimit(true)
      const res = await authFetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: catId,
          period: selectedPeriodForNew,
          amount,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setIsAddModalOpen(false)
        setNewLimitInput('')
        if (selectedPeriodForNew !== period) {
          setPeriod(selectedPeriodForNew)
        } else {
          await fetchBudgets(period)
        }
      } else {
        alert(json.message || 'Gagal menyimpan anggaran.')
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan anggaran.')
    } finally {
      setSavingLimit(false)
    }
  }

  // Delete budget limit
  const handleDeleteBudget = async (item: BudgetItem) => {
    if (!confirm(`Hapus batas anggaran ${periodLabels[period].title} untuk ${item.category.name}?`)) return

    try {
      const res = await authFetch(`/api/budgets?id=${item.id}&category_id=${item.category_id}&period=${period}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.success) {
        await fetchBudgets(period)
      } else {
        alert(json.message || 'Gagal menghapus batas anggaran.')
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus batas anggaran.')
    }
  }

  const periodLabels = {
    daily: { title: 'Harian', desc: 'Batas pengeluaran per hari ini (00:00 - 23:59 WIB)' },
    weekly: { title: 'Mingguan', desc: 'Batas pengeluaran 7 hari berjalan (Senin - Minggu)' },
    monthly: { title: 'Bulanan', desc: 'Batas pengeluaran 1 bulan kalender penuh' },
  }

  return (
    <div className="space-y-8 bg-[#06090e] min-h-screen text-slate-100 p-2 sm:p-4 rounded-3xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#064e3b]/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#064e3b]/30 text-[#10b981] border border-[#064e3b]/50">
              <Target className="w-5 h-5 text-[#10b981]" />
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Sistem Budgeting Multi-Periode
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
            Atur dan pantau limit pengeluaran per kategori dalam 3 skala waktu: Harian, Mingguan, dan Bulanan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-bold text-xs shadow-lg shadow-[#10b981]/25 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Anggaran</span>
          </button>

          <button
            onClick={() => fetchBudgets(period)}
            title="Refresh Data"
            className="p-2.5 rounded-xl bg-[#0a0f16] border border-[#152332] text-slate-400 hover:text-white hover:border-[#10b981]/50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#10b981]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3-Period Toggle Switcher */}
      <div className="p-2 rounded-2xl bg-[#0a0f16] border border-[#152332] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center p-1 rounded-xl bg-[#06090e] border border-[#152332] w-full sm:w-auto">
          <button
            onClick={() => setPeriod('daily')}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              period === 'daily'
                ? 'bg-gradient-to-r from-[#10b981] to-[#059669] text-white shadow-md shadow-[#10b981]/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Harian</span>
          </button>

          <button
            onClick={() => setPeriod('weekly')}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              period === 'weekly'
                ? 'bg-gradient-to-r from-[#10b981] to-[#059669] text-white shadow-md shadow-[#10b981]/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Mingguan</span>
          </button>

          <button
            onClick={() => setPeriod('monthly')}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              period === 'monthly'
                ? 'bg-gradient-to-r from-[#10b981] to-[#059669] text-white shadow-md shadow-[#10b981]/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Bulanan</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 px-2 sm:text-right">
          <span className="font-semibold text-[#10b981]">{periodLabels[period].title}:</span>{' '}
          {periodLabels[period].desc}
        </div>
      </div>

      {/* Overview Analytics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-[#0a0f16] border border-[#152332] shadow-xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Alokasi Budget ({periodLabels[period].title})
          </span>
          <p className="text-2xl font-black text-white mt-1 text-gradient-emerald">
            {formatRupiah(summary.total_limit)}
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-[#0a0f16] border border-[#152332] shadow-xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Terpakai
          </span>
          <p className="text-2xl font-black text-white mt-1">
            {formatRupiah(summary.total_spent)}
          </p>
          <div className="mt-2 text-[11px] text-slate-400">
            {summary.total_limit > 0
              ? `${Math.round((summary.total_spent / summary.total_limit) * 100)}% dari batas total`
              : 'Belum ada limit'}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#0a0f16] border border-[#152332] shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Kesehatan Budget
            </span>
            <div className="flex items-center gap-2 mt-2">
              {summary.overbudget_count > 0 ? (
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
                  {summary.overbudget_count} Overbudget!
                </span>
              ) : summary.warning_count > 0 ? (
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  {summary.warning_count} Mendekati Limit
                </span>
              ) : (
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Semua Kategori Aman
                </span>
              )}
            </div>
          </div>
          <ShieldCheck className="w-8 h-8 text-[#10b981]/50" />
        </div>
      </div>

      {/* Telegram Alert Info Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-[#064e3b]/20 via-[#0a0f16] to-[#080d14] border border-[#064e3b]/50 flex items-start sm:items-center gap-4 shadow-xl">
        <div className="w-10 h-10 rounded-2xl bg-[#10b981] text-[#06090e] flex items-center justify-center shrink-0 shadow-lg shadow-[#10b981]/25">
          <Bell className="w-5 h-5 font-black" />
        </div>
        <div className="text-xs">
          <h4 className="font-bold text-white flex items-center gap-2">
            Peringatan Dini Bot Telegram Aktif (Threshold 80% & 100%)
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
          </h4>
          <p className="text-slate-300 mt-1 leading-relaxed">
            Setiap ada transaksi baru (dari web atau chat Telegram), sistem mengevaluasi batas anggaran{' '}
            <strong className="text-white">Harian, Mingguan, dan Bulanan</strong>. Jika menyentuh{' '}
            <span className="text-amber-400 font-bold">≥80%</span> atau{' '}
            <span className="text-rose-400 font-bold">≥100%</span>, bot otomatis mengirim pesan peringatan dini.
          </p>
        </div>
      </div>

      {/* Budget Cards List */}
      {loading && budgets.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 rounded-3xl bg-[#0a0f16]/60 border border-[#152332] animate-pulse" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-12 p-6 rounded-3xl bg-[#0a0f16] border border-[#152332] space-y-4">
          <Target className="w-12 h-12 text-slate-600 mx-auto" />
          <div>
            <h4 className="text-base font-bold text-white">Belum Ada Kategori Anggaran {periodLabels[period].title}</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Anda belum menetapkan batas anggaran pengeluaran. Atur batas budget per kategori untuk mendapatkan peringatan dini otomatis.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] text-white font-bold text-xs shadow-md shadow-[#10b981]/25 inline-flex items-center gap-2 transition-all hover:brightness-110"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Anggaran Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {budgets.map((b) => {
            const isOver = b.status === 'overbudget'
            const isWarning = b.status === 'warning'
            const isSafe = b.status === 'safe'

            return (
              <div
                key={b.id}
                className={`p-6 rounded-3xl transition-all shadow-xl space-y-4 bg-[#0a0f16] border ${
                  isOver
                    ? 'border-rose-500/50 shadow-rose-500/10'
                    : isWarning
                    ? 'border-amber-500/50 shadow-amber-500/10'
                    : 'border-[#152332] hover:border-[#064e3b]/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2 rounded-xl bg-[#080d14] border border-[#152332]">
                      {b.category.emoji}
                    </span>
                    <div>
                      <h3 className="text-base font-black text-white">{b.category.name}</h3>
                      <p className="text-xs text-slate-400">
                        Batas {periodLabels[period].title}:{' '}
                        <strong className="text-slate-200">{formatRupiah(b.limit)}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOver ? (
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
                        Overbudget!
                      </span>
                    ) : isWarning ? (
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                        Mendekati 80%
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        Aman
                      </span>
                    )}

                    <button
                      onClick={() => openEditModal(b)}
                      title="Ubah Batas Budget"
                      className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#152332] transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteBudget(b)}
                      title="Hapus Batas Budget"
                      className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-[#152332] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">Terpakai: {formatRupiah(b.spent)}</span>
                    <span
                      className={
                        isOver
                          ? 'text-rose-400 font-bold'
                          : isWarning
                          ? 'text-amber-400 font-bold'
                          : 'text-[#10b981]'
                      }
                    >
                      {b.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-[#06090e] h-3 rounded-full overflow-hidden border border-[#152332]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOver
                          ? 'bg-rose-500'
                          : isWarning
                          ? 'bg-amber-500'
                          : 'bg-gradient-to-r from-[#10b981] to-[#34d399]'
                      }`}
                      style={{ width: `${Math.min(b.percentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Remaining Amount & Status Footer */}
                <div className="pt-2 border-t border-[#152332] flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {isOver ? (
                      <span className="text-rose-400 font-bold">
                        Defisit: {formatRupiah(Math.abs(b.remaining))}
                      </span>
                    ) : (
                      <span>
                        Sisa: <strong className="text-white">{formatRupiah(b.remaining)}</strong>
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#10b981]" />
                    Telegram Alert Ready
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Budget Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#0a0f16] rounded-3xl p-6 border border-[#064e3b]/60 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#152332]">
              <div className="flex items-center gap-2">
                <span className="text-xl">{editingItem.category.emoji}</span>
                <h3 className="text-base font-black text-white">
                  Atur Limit: {editingItem.category.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditLimit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Batas Anggaran {periodLabels[period].title} (Rp)
                </label>
                <input
                  type="number"
                  value={editLimitInput}
                  onChange={(e) => setEditLimitInput(e.target.value)}
                  placeholder="0"
                  required
                  min="0"
                  step="1000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06090e] border border-[#152332] text-sm font-mono text-white focus:outline-none focus:border-[#10b981]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Pengeluaran saat ini:{' '}
                  <span className="text-slate-300 font-semibold">{formatRupiah(editingItem.spent)}</span>
                </p>
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-[#152332]">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingLimit}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-bold text-xs shadow-md shadow-[#10b981]/20 disabled:opacity-50"
                >
                  {savingLimit ? 'Menyimpan...' : 'Simpan Limit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Budget Limit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0a0f16] rounded-3xl p-6 border border-[#064e3b]/60 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#152332]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Plus className="w-4 h-4" />
                </span>
                <h3 className="text-base font-black text-white">
                  Tambah Batas Anggaran Kategori
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewBudget} className="space-y-4">
              {/* Category Select */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Kategori Pengeluaran
                </label>
                <select
                  value={selectedCatForNew}
                  onChange={(e) => setSelectedCatForNew(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06090e] border border-[#152332] text-sm text-white focus:outline-none focus:border-[#10b981]"
                >
                  <option value="" disabled>Pilih Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Period Select */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Skala Periode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['daily', 'weekly', 'monthly'] as BudgetPeriod[]).map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setSelectedPeriodForNew(p)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        selectedPeriodForNew === p
                          ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
                          : 'bg-[#06090e] border-[#152332] text-slate-400 hover:text-white'
                      }`}
                    >
                      {periodLabels[p].title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Limit Amount Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Batas Anggaran Nominal (Rp)
                </label>
                <input
                  type="number"
                  value={newLimitInput}
                  onChange={(e) => setNewLimitInput(e.target.value)}
                  placeholder="Contoh: 500000"
                  required
                  min="0"
                  step="1000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06090e] border border-[#152332] text-sm font-mono text-white focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-[#152332]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingLimit}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-bold text-xs shadow-md shadow-[#10b981]/20 disabled:opacity-50"
                >
                  {savingLimit ? 'Menyimpan...' : 'Simpan Anggaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
