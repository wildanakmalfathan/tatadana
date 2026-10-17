export interface CalendarTransaction {
  id: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  category: string
  category_id?: string
  category_emoji?: string
  category_color?: string
  wallet: string
  wallet_id?: string
  note?: string | null
  notes?: string | null
  time?: string
  source?: string
  items?: Array<{ name: string; qty: number; price: number }>
}

export interface DayData {
  income: number
  expense: number
  count: number
  transactions: CalendarTransaction[]
}

export interface CalendarSummary {
  total_income: number
  total_expense: number
  net_savings: number
  transaction_count?: number
}

export interface CalendarResponse {
  month: number
  year: number
  days: Record<string, DayData>
  summary: CalendarSummary
}
