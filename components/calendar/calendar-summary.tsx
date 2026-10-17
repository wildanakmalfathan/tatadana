'use client'

import React from 'react'
import { ArrowDownLeft, ArrowUpRight, Wallet, Activity } from 'lucide-react'
import { formatRupiah } from '@/lib/utils/currency'
import { CalendarSummary as SummaryType } from './types'

interface CalendarSummaryProps {
  summary: SummaryType
}

export const CalendarSummary: React.FC<CalendarSummaryProps> = ({ summary }) => {
  const isNetPositive = summary.net_savings >= 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Pemasukan */}
      <div className="p-4 rounded-3xl bg-[#0a0f16] border border-emerald-900/30 shadow-card transition-all hover:border-emerald-500/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">Total Pemasukan</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
        </div>
        <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-2">
          +{formatRupiah(summary.total_income)}
        </p>
        <p className="text-[10px] text-emerald-500/70 mt-0.5">Arus kas masuk bulan ini</p>
      </div>

      {/* Pengeluaran */}
      <div className="p-4 rounded-3xl bg-[#0a0f16] border border-emerald-900/30 shadow-card transition-all hover:border-rose-500/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">Total Pengeluaran</span>
          <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
        <p className="text-xl sm:text-2xl font-black text-rose-400 mt-2">
          -{formatRupiah(summary.total_expense)}
        </p>
        <p className="text-[10px] text-rose-400/70 mt-0.5">Arus kas keluar bulan ini</p>
      </div>

      {/* Arus Kas Bersih (Net) */}
      <div className="p-4 rounded-3xl bg-[#0a0f16] border border-emerald-900/30 shadow-card transition-all hover:border-emerald-500/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">Arus Kas Bersih</span>
          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${
            isNetPositive
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
          }`}>
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <p className={`text-xl sm:text-2xl font-black mt-2 ${
          isNetPositive ? 'text-emerald-300' : 'text-rose-400'
        }`}>
          {isNetPositive ? '+' : ''}{formatRupiah(summary.net_savings)}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {isNetPositive ? 'Surplus finansial aman' : 'Perhatian: defisit bulan ini'}
        </p>
      </div>

      {/* Total Transaksi */}
      <div className="p-4 rounded-3xl bg-[#0a0f16] border border-emerald-900/30 shadow-card transition-all hover:border-emerald-500/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">Aktivitas Transaksi</span>
          <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <p className="text-xl sm:text-2xl font-black text-white mt-2">
          {summary.transaction_count ?? 0} <span className="text-sm font-semibold text-slate-400">tx</span>
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">Tercatat di kalender</p>
      </div>
    </div>
  )
}
