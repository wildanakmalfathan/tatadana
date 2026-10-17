'use client'

import React, { useEffect } from 'react'
import { X, Calendar as CalendarIcon, ArrowDownLeft, ArrowUpRight, Wallet, Receipt, Clock } from 'lucide-react'
import { formatRupiah } from '@/lib/utils/currency'
import { DayData } from './types'

interface DateDetailDrawerProps {
  isOpen: boolean
  onClose: () => void
  dateKey: string | null
  dayData?: DayData
}

export const DateDetailDrawer: React.FC<DateDetailDrawerProps> = ({
  isOpen,
  onClose,
  dateKey,
  dayData,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !dateKey) return null

  // Format date in Indonesian
  const [yearStr, monthStr, dayStr] = dateKey.split('-')
  const dateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10))
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dateObj)

  const transactions = dayData?.transactions ?? []
  const income = dayData?.income ?? 0
  const expense = dayData?.expense ?? 0
  const net = income - expense

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-lg h-full bg-[#080d14] border-l border-emerald-900/40 shadow-2xl z-10 flex flex-col justify-between animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-emerald-950/80 bg-[#0a0f16]/90">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{formattedDate}</h3>
                <p className="text-xs text-slate-400">Rincian Arus Kas & Transaksi</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-emerald-950/50 transition-colors"
              title="Tutup"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Day Metrics */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-emerald-950/80">
            <div className="p-2.5 rounded-xl bg-[#06090e] border border-emerald-900/30 text-center">
              <span className="text-[10px] text-slate-400 font-medium">Masuk</span>
              <p className="text-xs font-extrabold text-emerald-400 mt-0.5 truncate">
                +{formatRupiah(income)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#06090e] border border-rose-900/30 text-center">
              <span className="text-[10px] text-slate-400 font-medium">Keluar</span>
              <p className="text-xs font-extrabold text-rose-400 mt-0.5 truncate">
                -{formatRupiah(expense)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#06090e] border border-emerald-900/30 text-center">
              <span className="text-[10px] text-slate-400 font-medium">Selisih</span>
              <p className={`text-xs font-extrabold mt-0.5 truncate ${net >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                {net >= 0 ? '+' : ''}{formatRupiah(net)}
              </p>
            </div>
          </div>
        </div>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Daftar Transaksi ({transactions.length})
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-[#0a0f16]/60 border border-emerald-950/80 space-y-3 mt-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xl">
                🍃
              </div>
              <h4 className="text-sm font-bold text-white">Tidak ada transaksi</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Belum ada pemasukan atau pengeluaran yang tercatat pada tanggal {dayStr}/{monthStr}/{yearStr}.
              </p>
            </div>
          ) : (
            transactions.map((tx) => {
              const isIncome = tx.type === 'income'
              const isTransfer = tx.type === 'transfer'

              return (
                <div
                  key={tx.id}
                  className="p-4 rounded-2xl bg-[#0a0f16] border border-emerald-900/30 hover:border-emerald-500/40 transition-all space-y-2 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 ${
                          isIncome
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : isTransfer
                            ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {isIncome ? <ArrowDownLeft className="w-5 h-5" /> : isTransfer ? <Wallet className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                            {tx.category_emoji && <span className="text-base">{tx.category_emoji}</span>}
                            <span>{tx.category || (isIncome ? 'Pemasukan' : 'Pengeluaran')}</span>
                          </h4>
                          {tx.source && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                              {tx.source}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Wallet className="w-3 h-3 text-emerald-400" />
                            {tx.wallet}
                          </span>
                          {tx.time && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                {tx.time.includes('WIB') ? tx.time : `${tx.time} WIB`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-sm sm:text-base font-black ${
                          isIncome ? 'text-emerald-400' : isTransfer ? 'text-blue-400' : 'text-rose-400'
                        }`}
                      >
                        {isIncome ? '+' : isTransfer ? '' : '-'}
                        {formatRupiah(tx.amount)}
                      </p>
                    </div>
                  </div>

                  {(tx.notes || tx.note) && (
                    <div className="p-2 rounded-xl bg-[#06090e] border border-emerald-950/60 text-xs text-slate-300 italic">
                      &ldquo;{tx.notes || tx.note}&rdquo;
                    </div>
                  )}

                  {/* Receipt items if any */}
                  {tx.items && tx.items.length > 0 && (
                    <div className="pt-2 border-t border-emerald-950/60 text-xs space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                        <Receipt className="w-3 h-3" />
                        <span>Rincian Item Struk</span>
                      </div>
                      <div className="divide-y divide-emerald-950/40">
                        {tx.items.map((it, idx) => (
                          <div key={idx} className="py-1 flex justify-between text-slate-300 text-[11px]">
                            <span>{it.qty}x {it.name}</span>
                            <span className="font-semibold text-white">{formatRupiah(it.price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-emerald-950/80 bg-[#0a0f16]/90 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors"
          >
            Tutup Drawer
          </button>
        </div>
      </div>
    </div>
  )
}
