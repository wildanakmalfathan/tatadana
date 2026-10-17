'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Wallet as WalletIcon,
  Plus,
  Check,
  Star,
  CreditCard,
  Edit3,
  Trash2,
  History,
  X,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react'
import { formatRupiah } from '@/lib/utils/currency'
import { Wallet } from '@/types/database'
import { authFetch } from '@/lib/utils/auth-client'

interface WalletTransaction {
  id: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  date: string
  note: string
  category?: { name: string; emoji: string }
}

export default function WalletPage() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Add Wallet Modal state
  const [showAddModal, setShowAddModal] = useState<boolean>(false)
  const [addName, setAddName] = useState<string>('')
  const [addType, setAddType] = useState<'bank' | 'cash' | 'ewallet' | 'other'>('bank')
  const [addBalance, setAddBalance] = useState<string>('')
  const [addAccount, setAddAccount] = useState<string>('')
  const [addIsDefault, setAddIsDefault] = useState<boolean>(false)
  const [submittingAdd, setSubmittingAdd] = useState<boolean>(false)

  // Edit Wallet Modal state
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null)
  const [editName, setEditName] = useState<string>('')
  const [editBalance, setEditBalance] = useState<string>('')
  const [editAccount, setEditAccount] = useState<string>('')
  const [submittingEdit, setSubmittingEdit] = useState<boolean>(false)

  // Transaction History Drawer state
  const [historyWallet, setHistoryWallet] = useState<Wallet | null>(null)
  const [historyTransactions, setHistoryTransactions] = useState<WalletTransaction[]>([])
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false)

  // Fetch wallets from live API
  const fetchWallets = useCallback(async () => {
    try {
      setLoading(true)
      setErrorMsg(null)
      const res = await authFetch('/api/wallets', { cache: 'no-store' })
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setWallets(json.data)
      } else {
        throw new Error(json.message || 'Gagal mengambil data dompet')
      }
    } catch (err: any) {
      console.error('Fetch wallets error:', err)
      setErrorMsg(err.message || 'Gagal memuat dompet.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWallets()
    const handleTxCreated = () => fetchWallets()
    window.addEventListener('tatadana_transaction_created', handleTxCreated)
    return () => window.removeEventListener('tatadana_transaction_created', handleTxCreated)
  }, [fetchWallets])

  // Set default Telegram wallet
  const handleSetDefault = async (id: string) => {
    try {
      const res = await authFetch('/api/wallets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_default_telegram: true }),
      })
      const json = await res.json()
      if (json.success) {
        setWallets((prev) =>
          prev.map((w) => ({
            ...w,
            is_default: w.id === id,
            is_default_telegram: w.id === id,
          }))
        )
      }
    } catch (err) {
      console.error('Failed to set default wallet:', err)
    }
  }

  // Create new wallet
  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addName.trim()) return

    try {
      setSubmittingAdd(true)
      const icons = { bank: '🏦', cash: '💵', ewallet: '📱', other: '💳' }
      const colors = { bank: '#3b82f6', cash: '#10b981', ewallet: '#0d9488', other: '#8b5cf6' }

      const payload = {
        name: addName.trim(),
        type: addType,
        balance: Number(addBalance) || 0,
        account_number: addType === 'cash' ? 'Uang Fisik' : addAccount.trim() || '••••',
        is_default_telegram: addIsDefault,
        icon: icons[addType] || '💳',
        color: colors[addType] || '#10b981',
      }

      const res = await authFetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (json.success && json.data) {
        if (addIsDefault) {
          setWallets((prev) => [
            json.data,
            ...prev.map((w) => ({ ...w, is_default: false, is_default_telegram: false })),
          ])
        } else {
          setWallets((prev) => [...prev, json.data])
        }
        setShowAddModal(false)
        setAddName('')
        setAddBalance('')
        setAddAccount('')
        setAddIsDefault(false)
      } else {
        alert(json.message || 'Gagal menambahkan dompet.')
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan dompet.')
    } finally {
      setSubmittingAdd(false)
    }
  }

  // Open edit modal
  const openEditModal = (wallet: Wallet) => {
    setEditingWallet(wallet)
    setEditName(wallet.name)
    setEditBalance(String(wallet.balance))
    setEditAccount(wallet.account_number || '')
  }

  // Save edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingWallet || !editName.trim()) return

    try {
      setSubmittingEdit(true)
      const res = await authFetch('/api/wallets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingWallet.id,
          name: editName.trim(),
          balance: Number(editBalance) || 0,
          account_number: editAccount.trim(),
        }),
      })
      const json = await res.json()
      if (json.success) {
        setWallets((prev) =>
          prev.map((w) =>
            w.id === editingWallet.id
              ? {
                  ...w,
                  name: editName.trim(),
                  balance: Number(editBalance) || 0,
                  account_number: editAccount.trim(),
                }
              : w
          )
        )
        setEditingWallet(null)
      } else {
        alert(json.message || 'Gagal memperbarui dompet.')
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan pembaruan dompet.')
    } finally {
      setSubmittingEdit(false)
    }
  }

  // Delete wallet
  const handleDeleteWallet = async (id: string, name: string) => {
    if (!confirm(`Hapus dompet "${name}"? Saldo dan transaksi terkait akan disesuaikan.`)) return

    try {
      const res = await authFetch(`/api/wallets?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setWallets((prev) => prev.filter((w) => w.id !== id))
        if (historyWallet?.id === id) setHistoryWallet(null)
      } else {
        alert(json.message || 'Gagal menghapus dompet.')
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus dompet.')
    }
  }

  // Open transaction history drawer
  const openHistoryDrawer = async (wallet: Wallet) => {
    setHistoryWallet(wallet)
    setLoadingHistory(true)
    try {
      const res = await authFetch('/api/transactions?limit=100', { cache: 'no-store' })
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        const filtered = json.data
          .filter((tx: any) => tx.wallet_id === wallet.id || tx.destination_wallet_id === wallet.id)
          .map((tx: any) => ({
            id: tx.id,
            amount: Number(tx.amount),
            type: tx.type,
            date: tx.date || tx.transaction_date || new Date(tx.created_at || Date.now()).toISOString().split('T')[0],
            note: tx.note || tx.notes || (tx.type === 'income' ? 'Pemasukan' : tx.type === 'transfer' ? 'Transfer' : 'Pengeluaran'),
            category: tx.category || { name: 'Umum', emoji: '💸' },
          }))
        setHistoryTransactions(filtered)
      } else {
        setHistoryTransactions([])
      }
    } catch {
      setHistoryTransactions([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const totalBalance = wallets.reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0);

  return (
    <div className="space-y-8 bg-[#06090e] min-h-screen text-slate-100 p-2 sm:p-4 rounded-3xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#064e3b]/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#064e3b]/30 text-[#10b981] border border-[#064e3b]/50">
              <WalletIcon className="w-5 h-5 text-[#10b981]" />
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Multi-Wallet & Rekening
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
            Kelola dompet fisik, rekening bank, dan saldo e-wallet. Tentukan 1 dompet default untuk transaksi Telegram otomatis.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={fetchWallets}
            title="Refresh Data"
            className="p-2.5 rounded-xl bg-[#0a0f16] border border-[#152332] text-slate-400 hover:text-white hover:border-[#10b981]/50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#10b981]' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#10b981]/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Dompet Baru</span>
          </button>
        </div>
      </div>

      {/* Aggregate Overview Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0a0f16] via-[#080d14] to-[#0a0f16] border border-[#064e3b]/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Total Likuiditas Seluruh Dompet
          </span>
          <h3 className="text-3xl font-black text-white mt-1 text-gradient-emerald">
            {formatRupiah(totalBalance)}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Terbagi dalam <span className="text-[#10b981] font-semibold">{wallets.length} dompet aktif</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-[#06090e] px-4 py-2 rounded-2xl border border-[#152332]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
          <span className="text-slate-300">Sinkronisasi Real-Time API</span>
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/50 flex items-center gap-3 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && wallets.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 rounded-3xl bg-[#0a0f16]/60 border border-[#152332] animate-pulse" />
          ))}
        </div>
      ) : wallets.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 p-8 rounded-3xl bg-[#0a0f16] border border-[#152332]">
          <WalletIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-bold text-white">Belum Ada Dompet</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-5">
            Daftar dompet Anda masih kosong. Buat dompet pertama Anda untuk mulai mengelola keuangan.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-[#10b981]/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Dompet Pertama</span>
          </button>
        </div>
      ) : (
        /* Wallets Grid */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {wallets.map((w) => {
            const isDefault = !!(w.is_default_telegram ?? w.is_default)
            return (
              <div
                key={w.id}
                className={`p-6 rounded-3xl transition-all shadow-xl relative overflow-hidden flex flex-col justify-between group ${
                  isDefault
                    ? 'bg-gradient-to-br from-[#064e3b]/25 via-[#0a0f16] to-[#080d14] border-2 border-[#10b981]/70 shadow-[#10b981]/10'
                    : 'bg-[#0a0f16] border border-[#152332] hover:border-[#064e3b]/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl p-2.5 rounded-2xl bg-[#080d14] border border-[#152332]">
                      {w.icon || '💳'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isDefault ? (
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-[#10b981] text-white flex items-center gap-1 shadow-md shadow-[#10b981]/30">
                          <Star className="w-3 h-3 fill-white" />
                          <span>Default Telegram</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(w.id)}
                          className="text-[10px] font-bold text-slate-400 hover:text-white px-2.5 py-1 rounded-full bg-[#080d14] hover:bg-[#064e3b]/40 border border-[#152332] hover:border-[#10b981]/40 transition-colors"
                        >
                          Jadikan Default
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-black text-white tracking-tight">{w.name}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {w.account_number || (w.type === 'cash' ? 'Uang Fisik' : '••••')}
                  </p>
                </div>

                <div className="pt-6 border-t border-[#152332] mt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        Saldo Saat Ini
                      </span>
                      <p className="text-2xl font-black text-white mt-0.5">
                        {formatRupiah(w.balance)}
                      </p>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 pt-3 border-t border-[#152332]/60 flex items-center justify-between gap-2">
                    <button
                      onClick={() => openHistoryDrawer(w)}
                      className="text-xs text-[#10b981] hover:text-[#34d399] font-semibold flex items-center gap-1 transition-colors"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Riwayat</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(w)}
                        title="Edit Dompet"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#152332] transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteWallet(w.id, w.name)}
                        title="Hapus Dompet"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Wallet Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0a0f16] rounded-3xl p-6 border border-[#064e3b]/60 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#152332]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#10b981]" />
                <h3 className="text-lg font-black text-white">Tambah Dompet Baru</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddWallet} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Nama Dompet / Rekening
                </label>
                <input
                  type="text"
                  placeholder="Contoh: BCA Payroll, GoPay, Tunai Dompet"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06090e] border border-[#152332] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#10b981] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Jenis Dompet
                </label>
                <select
                  value={addType}
                  onChange={(e) => setAddType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06090e] border border-[#152332] text-xs text-white focus:outline-none focus:border-[#10b981] transition-colors"
                >
                  <option value="bank">🏦 Bank (BCA, Mandiri, BRI, BNI, Jago, dll)</option>
                  <option value="ewallet">📱 E-Wallet (GoPay, OVO, Dana, ShopeePay)</option>
                  <option value="cash">💵 Cash / Uang Tunai Fisik</option>
                  <option value="other">💳 Lainnya / Investasi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Nomor Rekening / Nomor HP
                </label>
                <input
                  type="text"
                  placeholder={
                    addType === 'cash'
                      ? 'Uang Fisik'
                      : addType === 'ewallet'
                      ? 'Contoh: 0812-3456-7890'
                      : 'Contoh: 1234-5678-90'
                  }
                  value={addAccount}
                  disabled={addType === 'cash'}
                  onChange={(e) => setAddAccount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06090e] border border-[#152332] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#10b981] disabled:opacity-50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Saldo Awal (Rp)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={addBalance}
                  onChange={(e) => setAddBalance(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06090e] border border-[#152332] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#10b981] transition-colors"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="addIsDefault"
                  checked={addIsDefault}
                  onChange={(e) => setAddIsDefault(e.target.checked)}
                  className="rounded border-[#152332] bg-[#06090e] text-[#10b981] focus:ring-[#10b981]"
                />
                <label htmlFor="addIsDefault" className="text-xs text-slate-300 font-medium cursor-pointer">
                  Jadikan dompet default untuk transaksi Telegram
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-[#152332]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-bold text-xs shadow-md shadow-[#10b981]/20 disabled:opacity-50"
                >
                  {submittingAdd ? 'Menyimpan...' : 'Simpan Dompet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Wallet Modal */}
      {editingWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0a0f16] rounded-3xl p-6 border border-[#064e3b]/60 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#152332]">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#10b981]" />
                <h3 className="text-lg font-black text-white">Edit Dompet: {editingWallet.name}</h3>
              </div>
              <button
                onClick={() => setEditingWallet(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Nama Dompet
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06090e] border border-[#152332] text-xs text-white focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Nomor Rekening / HP
                </label>
                <input
                  type="text"
                  value={editAccount}
                  onChange={(e) => setEditAccount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06090e] border border-[#152332] text-xs text-white focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Saldo (Rp)
                </label>
                <input
                  type="number"
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06090e] border border-[#152332] text-xs text-white focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-[#152332]">
                <button
                  type="button"
                  onClick={() => setEditingWallet(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-bold text-xs shadow-md shadow-[#10b981]/20 disabled:opacity-50"
                >
                  {submittingEdit ? 'Menyimpan...' : 'Perbarui Dompet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction History Drawer */}
      {historyWallet && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#0a0f16] h-full border-l border-[#064e3b]/50 p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-[#152332]">
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-2 rounded-xl bg-[#080d14] border border-[#152332]">
                    {historyWallet.icon || '💳'}
                  </span>
                  <div>
                    <h3 className="text-base font-black text-white">{historyWallet.name}</h3>
                    <p className="text-xs text-slate-400">Riwayat Transaksi Dompet</p>
                  </div>
                </div>
                <button
                  onClick={() => setHistoryWallet(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-[#080d14] border border-[#152332]">
                <span className="text-[10px] font-bold uppercase text-slate-400">Saldo Dompet Ini</span>
                <p className="text-xl font-black text-white mt-0.5">{formatRupiah(historyWallet.balance)}</p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-wider">
                  Daftar Transaksi Terakhir
                </h4>

                {loadingHistory ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-14 rounded-xl bg-[#080d14] border border-[#152332] animate-pulse" />
                    ))}
                  </div>
                ) : historyTransactions.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    Belum ada transaksi tercatat untuk dompet ini.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {historyTransactions.map((tx) => {
                      const isIncome = tx.type === 'income'
                      return (
                        <div
                          key={tx.id}
                          className="p-3.5 rounded-2xl bg-[#080d14] border border-[#152332] flex items-center justify-between gap-3 hover:border-[#064e3b]/50 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                isIncome ? 'bg-emerald-950/60 text-emerald-400' : 'bg-rose-950/60 text-rose-400'
                              }`}
                            >
                              {isIncome ? (
                                <ArrowDownLeft className="w-4 h-4" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white line-clamp-1">{tx.note}</p>
                              <p className="text-[10px] text-slate-500">{tx.date}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span
                              className={`text-xs font-black font-mono ${
                                isIncome ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {isIncome ? '+' : '-'} {formatRupiah(tx.amount)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-[#152332] mt-6">
              <button
                onClick={() => setHistoryWallet(null)}
                className="w-full py-2.5 rounded-xl bg-[#152332] hover:bg-[#1e3046] text-slate-200 text-xs font-bold transition-colors"
              >
                Tutup Riwayat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 