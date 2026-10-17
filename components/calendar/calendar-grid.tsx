'use client'

import React from 'react'
import { formatRupiah } from '@/lib/utils/currency'
import { DayData } from './types'

interface CalendarGridProps {
  currentDate: Date
  daysData: Record<string, DayData>
  selectedDate: string | null
  onSelectDate: (dateKey: string) => void
}

const WEEKDAYS = [
  { short: 'Sen', full: 'Senin' },
  { short: 'Sel', full: 'Selasa' },
  { short: 'Rab', full: 'Rabu' },
  { short: 'Kam', full: 'Kamis' },
  { short: 'Jum', full: 'Jumat' },
  { short: 'Sab', full: 'Sabtu' },
  { short: 'Min', full: 'Minggu' },
]

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentDate,
  daysData,
  selectedDate,
  onSelectDate,
}) => {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // First day of current month
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Calculate leading days (Monday = 0, Sunday = 6)
  const firstDayOfWeek = firstDay.getDay()
  const leadingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  // Days in previous month for dimmed preview
  const prevMonthDays = new Date(year, month, 0).getDate()

  // Real today check
  const now = new Date()
  const isCurrentMonthNow = now.getFullYear() === year && now.getMonth() === month
  const todayDate = now.getDate()

  // Calculate trailing days to complete rows (up to multiple of 7)
  const totalCells = leadingDays + daysInMonth
  const trailingDays = (7 - (totalCells % 7)) % 7

  return (
    <div className="rounded-3xl bg-[#0a0f16] border border-emerald-900/30 shadow-card overflow-hidden">
      {/* Weekday Header */}
      <div className="grid grid-cols-7 border-b border-emerald-950/80 bg-[#080d14]/70">
        {WEEKDAYS.map((day, idx) => (
          <div
            key={day.short}
            className={`py-3 text-center text-xs font-bold tracking-wider uppercase ${
              idx >= 5 ? 'text-emerald-400/80' : 'text-slate-400'
            }`}
          >
            <span className="sm:hidden">{day.short}</span>
            <span className="hidden sm:inline">{day.full}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid Cells */}
      <div className="grid grid-cols-7 divide-x divide-y divide-emerald-950/60 bg-[#06090e]">
        {/* Leading Days from Previous Month */}
        {Array.from({ length: leadingDays }).map((_, idx) => {
          const prevDay = prevMonthDays - leadingDays + idx + 1
          return (
            <div
              key={`prev-${idx}`}
              className="min-h-[95px] sm:min-h-[110px] p-2 bg-[#06090e]/40 text-slate-600 select-none cursor-default flex flex-col justify-between"
            >
              <span className="text-xs font-semibold opacity-40">{prevDay}</span>
            </div>
          )
        })}

        {/* Days of Current Month */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = isCurrentMonthNow && day === todayDate
          const isSelected = selectedDate === dateKey
          const data = daysData[dateKey]

          const hasIncome = data && data.income > 0
          const hasExpense = data && data.expense > 0
          const hasTransactions = data && data.count > 0

          return (
            <div
              key={dateKey}
              onClick={() => onSelectDate(dateKey)}
              className={`min-h-[95px] sm:min-h-[115px] p-2 sm:p-2.5 flex flex-col justify-between transition-all duration-200 cursor-pointer relative group ${
                isSelected
                  ? 'bg-emerald-950/40 ring-2 ring-emerald-400/80 z-10 shadow-lg shadow-emerald-950/50'
                  : 'bg-[#0a0f16]/90 hover:bg-[#0e1622] hover:border-emerald-500/30'
              }`}
            >
              {/* Day Number & Indicator */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs sm:text-sm font-bold flex items-center justify-center rounded-xl transition-all ${
                    isToday
                      ? 'w-6 h-6 sm:w-7 sm:h-7 bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/40 ring-2 ring-emerald-300'
                      : isSelected
                      ? 'w-6 h-6 sm:w-7 sm:h-7 bg-emerald-900/60 text-white border border-emerald-400'
                      : 'text-slate-300 group-hover:text-white'
                  }`}
                >
                  {day}
                </span>

                {hasTransactions && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {data.count} tx
                  </span>
                )}
              </div>

              {/* Cashflow Badges */}
              <div className="space-y-1 mt-auto">
                {hasIncome && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-500/40 text-[10px] sm:text-[11px] font-bold text-emerald-300 truncate shadow-xs">
                    <span className="text-emerald-400 font-extrabold shrink-0">+</span>
                    <span className="truncate">{formatRupiah(data.income)}</span>
                  </div>
                )}
                {hasExpense && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-950/90 border border-rose-500/40 text-[10px] sm:text-[11px] font-bold text-rose-300 truncate shadow-xs">
                    <span className="text-rose-400 font-extrabold shrink-0">-</span>
                    <span className="truncate">{formatRupiah(data.expense)}</span>
                  </div>
                )}
                {!hasIncome && !hasExpense && (
                  <div className="h-4 sm:h-5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-[9px] text-slate-500">Klik rincian</span>
                  </div>
                )}
              </div>

              {/* Bottom active pill */}
              {isSelected && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" />
              )}
            </div>
          )
        })}

        {/* Trailing Days for Next Month */}
        {Array.from({ length: trailingDays }).map((_, idx) => (
          <div
            key={`next-${idx}`}
            className="min-h-[95px] sm:min-h-[110px] p-2 bg-[#06090e]/40 text-slate-600 select-none cursor-default flex flex-col justify-between"
          >
            <span className="text-xs font-semibold opacity-40">{idx + 1}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
