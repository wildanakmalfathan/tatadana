'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { CalendarHeader } from '@/components/calendar/calendar-header'
import { CalendarSummary } from '@/components/calendar/calendar-summary'
import { CalendarGrid } from '@/components/calendar/calendar-grid'
import { DateDetailDrawer } from '@/components/calendar/date-detail-drawer'
import { CalendarResponse, DayData, CalendarTransaction } from '@/components/calendar/types'
import { authFetch } from '@/lib/utils/auth-client'

// Clean calendar transactions (no dummy mock data)
const BASE_MOCK_TRANSACTIONS: Array<CalendarTransaction & { date: string }> = []

export default function KalenderPage() {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date())
  const [selectedWallet, setSelectedWallet] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [apiData, setApiData] = useState<CalendarResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const [wallets, setWallets] = useState<{ id: string; name: string; icon?: string }[]>([
    { id: 'all', name: 'Semua Dompet', icon: '👛' },
  ])

  useEffect(() => {
    authFetch('/api/wallets', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const list = [
            { id: 'all', name: 'Semua Dompet', icon: '👛' },
            ...json.data.map((w: any) => ({
              id: w.id,
              name: w.name,
              icon: w.icon || (w.type === 'bank' ? '🏦' : w.type === 'cash' ? '💵' : '📱'),
            })),
          ]
          setWallets(list)
        }
      })
      .catch(() => {})
  }, [])

  // Fetch from backend calendar API if available
  const fetchCalendarData = useCallback(async (month: number, year: number, wallet: string) => {
    setIsLoading(true)
    try {
      const walletParam = wallet !== 'all' ? `&wallet_id=${wallet}` : ''
      const res = await authFetch(`/api/transactions/calendar?month=${month}&year=${year}${walletParam}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (data && data.days) {
          setApiData(data)
          return
        }
      }
    } catch {
      // Graceful fallback to rich local state
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCalendarData(currentDate.getMonth() + 1, currentDate.getFullYear(), selectedWallet)
    const handleTxCreated = () => {
      fetchCalendarData(currentDate.getMonth() + 1, currentDate.getFullYear(), selectedWallet)
    }
    window.addEventListener('tatadana_transaction_created', handleTxCreated)
    return () => window.removeEventListener('tatadana_transaction_created', handleTxCreated)
  }, [currentDate, selectedWallet, fetchCalendarData])

  // Computed data: uses API if provided, otherwise calculates from realistic transactions
  const { daysData, summary } = useMemo(() => {
    if (apiData && apiData.days) {
      return {
        daysData: apiData.days,
        summary: apiData.summary || { total_income: 0, total_expense: 0, net_savings: 0, transaction_count: 0 },
      }
    }

    // Filter local transactions by wallet
    const filteredTx = BASE_MOCK_TRANSACTIONS.filter((tx) => {
      if (selectedWallet === 'all') return true
      return tx.wallet.toLowerCase().includes(selectedWallet.toLowerCase())
    })

    const days: Record<string, DayData> = {}
    let totalIncome = 0
    let totalExpense = 0
    let txCount = 0

    filteredTx.forEach((tx) => {
      if (!days[tx.date]) {
        days[tx.date] = {
          income: 0,
          expense: 0,
          count: 0,
          transactions: [],
        }
      }

      days[tx.date].transactions.push(tx)
      days[tx.date].count += 1
      txCount += 1

      if (tx.type === 'income') {
        days[tx.date].income += tx.amount
        totalIncome += tx.amount
      } else if (tx.type === 'expense') {
        days[tx.date].expense += tx.amount
        totalExpense += tx.amount
      }
    })

    return {
      daysData: days,
      summary: {
        total_income: totalIncome,
        total_expense: totalExpense,
        net_savings: totalIncome - totalExpense,
        transaction_count: txCount,
      },
    }
  }, [apiData, selectedWallet])

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    setSelectedDate(null)
  }

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    setSelectedDate(null)
  }

  const handleToday = () => {
    const today = new Date()
    setCurrentDate(today)
    const pad = (n: number) => String(n).padStart(2, '0')
    setSelectedDate(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`)
  }

  // Handle cell click
  const handleSelectDate = (dateKey: string) => {
    setSelectedDate(dateKey)
    setIsDrawerOpen(true)
  }

  return (
    <div className="space-y-6 luxury-calendar-container">
      {/* Calendar Header with Nav & Filter */}
      <CalendarHeader
        currentDate={currentDate}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
        selectedWallet={selectedWallet}
        onSelectWallet={setSelectedWallet}
        wallets={wallets}
      />

      {/* Monthly Summary Cards */}
      <CalendarSummary summary={summary} />

      {/* Main Calendar 1-31 Visual Grid */}
      <CalendarGrid
        currentDate={currentDate}
        daysData={daysData}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
      />

      {/* Date Detail Drawer / Modal */}
      <DateDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        dateKey={selectedDate}
        dayData={selectedDate ? daysData[selectedDate] : undefined}
      />
    </div>
  )
}
