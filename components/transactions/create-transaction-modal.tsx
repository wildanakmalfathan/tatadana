'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Wallet, Category } from '@/types/database'
import { formatRupiah, parseRupiahInput } from '@/lib/utils/currency'
import { getISODateWIB } from '@/lib/utils/date'
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react'

interface CreateTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  wallets: Wallet[]
  categories: Category[]
}

export const CreateTransactionModal: React.FC<CreateTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  wallets,
  categories,
}) => {
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense')
  const [rawAmount, setRawAmount] = useState<string>('')
  const [walletId, setWalletId] = useState<string>('')
  const [destinationWalletId, setDestinationWalletId] = useState<string>('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [date, setDate] = useState<string>(getISODateWIB())
  const [notes, setNotes] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (wallets.length > 0) {
      const def = wallets.find((w) => w.is_default) || wallets[0]
      setWalletId(def.id)
      if (wallets.length > 1) {
        const dest = wallets.find((w) => w.id !== def.id)
        if (dest) setDestinationWalletId(dest.id)
      }
    }
  }, [wallets])

  useEffect(() => {
    const filteredCats = categories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense'))
    if (filteredCats.length > 0) {
      setCategoryId(filteredCats[0].id)
    } else {
      setCategoryId('')
    }
  }, [type, categories])

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseRupiahInput(e.target.value)
    setRawAmount(parsed > 0 ? parsed.toLocaleString('id-ID') : '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (wallets.length === 0) {
      setError('Anda belum memiliki dompet. Harap buat dompet terlebih dahulu di menu Dompet sebelum mencatat transaksi.')
      return
    }

    const amount = parseRupiahInput(rawAmount)
    if (amount <= 0) {
      setError('Nominal harus lebih dari Rp0.')
      return
    }

    if (type === 'transfer' && walletId === destinationWalletId) {
      setError('Dompet asal dan tujuan transfer tidak boleh sama.')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          amount,
          walletId,
          destinationWalletId: type === 'transfer' ? destinationWalletId : null,
          categoryId: type !== 'transfer' ? categoryId : null,
          date,
          notes: notes.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menyimpan transaksi.')
      }

      // Reset & close
      setRawAmount('')
      setNotes('')
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredCategories = categories.filter(
    (c) => c.type === (type === 'income' ? 'income' : 'expense')
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catat Transaksi Baru"
      description="Catat keuangan manual ke sistem TataDana"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
              type === 'expense'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
              type === 'income'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Pemasukan
          </button>
          <button
            type="button"
            onClick={() => setType('transfer')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
              type === 'transfer'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Transfer
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 font-medium">
            {error}
          </div>
        )}

        {wallets.length === 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <span>⚠️</span> Belum Ada Dompet Aktif
            </p>
            <p className="text-[11px] text-slate-300">
              Anda belum memiliki dompet. Harap buat dompet terlebih dahulu di menu Dompet sebelum mencatat transaksi.
            </p>
            <a
              href="/dashboard/wallet"
              onClick={onClose}
              className="inline-block mt-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 underline"
            >
              Ke Menu Dompet Sekarang →
            </a>
          </div>
        )}

        {/* Nominal Field */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Nominal (Rp) *
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
              Rp
            </span>
            <input
              type="text"
              required
              placeholder="0"
              value={rawAmount}
              onChange={handleAmountChange}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-base font-bold text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>

        {/* Category (if not transfer) */}
        {type !== 'transfer' && (
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Kategori *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 text-sm text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-slate-900"
            >
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Wallet Selection */}
        {type === 'transfer' ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Dari Dompet *
              </label>
              <select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-700 text-xs text-white focus:outline-none focus:border-brand-500 bg-slate-900"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id} className="bg-slate-900 text-white">
                    {w.icon} {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Ke Dompet *
              </label>
              <select
                value={destinationWalletId}
                onChange={(e) => setDestinationWalletId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-700 text-xs text-white focus:outline-none focus:border-brand-500 bg-slate-900"
              >
                {wallets
                  .filter((w) => w.id !== walletId)
                  .map((w) => (
                    <option key={w.id} value={w.id} className="bg-slate-900 text-white">
                      {w.icon} {w.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Dompet / Rekening *
            </label>
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 text-sm text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-slate-900"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id} className="bg-slate-900 text-white">
                  {w.icon} {w.name} ({formatRupiah(Number(w.balance))})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date Field */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Tanggal Transaksi (WIB) *
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 text-sm text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-slate-900"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Catatan / Keterangan
          </label>
          <input
            type="text"
            placeholder="Contoh: Beli kopi susu & roti bakar"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-slate-900"
          />
        </div>

        {/* Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={isLoading}>
            Batal
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={isLoading} disabled={isLoading || wallets.length === 0}>
            Simpan Transaksi
          </Button>
        </div>
      </form>
    </Modal>
  )
}
