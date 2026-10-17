'use client'

import React from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Sparkles } from 'lucide-react'

interface CalendarHeaderProps {
  currentDate: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
  selectedWallet: string
  onSelectWallet: (wallet: string) => void
  wallets: Array<{ id: string; name: string; icon?: string }>
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  onPrevMonth,
  onNextMonth,
  onToday,
  selectedWallet,
  onSelectWallet,
  wallets,
}) => {
  const monthName = MONTH_NAMES[currentDate.getMonth()]
  const year = currentDate.getFullYear()

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-[#0a0f16] border border-emerald-900/30 shadow-card">
      {/* Month Title & Navigation */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
          <CalendarIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {monthName} {year}
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
              <Sparkles className="w-2.5 h-2.5" />
              Finansial
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Visualisasi kalender arus kas harian dan rincian transaksi
          </p>
        </div>
      </div>

      {/* Controls: Prev, Today, Next + Wallet Filter */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="flex items-center bg-[#080d14] rounded-2xl border border-emerald-900/40 p-1 shadow-inner">
          <button
            onClick={onPrevMonth}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-emerald-950/50 transition-colors"
            title="Bulan Sebelumnya"
            aria-label="Bulan Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onToday}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/50 transition-colors"
          >
            Bulan Ini
          </button>
          <button
            onClick={onNextMonth}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-emerald-950/50 transition-colors"
            title="Bulan Berikutnya"
            aria-label="Bulan Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Wallet Filter Dropdown */}
        <div className="relative flex items-center">
          <Filter className="w-3.5 h-3.5 text-emerald-400 absolute left-3.5 pointer-events-none" />
          <select
            value={selectedWallet}
            onChange={(e) => onSelectWallet(e.target.value)}
            className="pl-9 pr-8 py-2 rounded-2xl bg-[#080d14] border border-emerald-900/40 text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors appearance-none cursor-pointer hover:border-emerald-500/50"
          >
            <option value="all">Semua Dompet</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.icon ? `${w.icon} ` : ''}{w.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 text-slate-400 text-xs">▼</div>
        </div>
      </div>
    </div>
  )
}
