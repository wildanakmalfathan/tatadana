'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Bot,
  Sparkles,
  Send,
  TrendingUp,
  PieChart,
  Lightbulb,
  ShieldAlert,
  Wallet,
  ArrowRight,
  RotateCcw,
  Cpu,
} from 'lucide-react'
import { formatRupiah } from '@/lib/utils/currency'
import { authFetch } from '@/lib/utils/auth-client'

interface FinancialContextState {
  totalBalance: number
  monthlyIncome: number
  monthlyExpense: number
  mostExpensiveCategory: {
    name: string
    emoji?: string
    percentage: number
  } | null
  healthStatus: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'ai-welcome',
    role: 'assistant',
    content: `Halo Sobat TataDana! 👋 Saya **Tata AI**, asisten penasihat keuangan pribadi Anda.

Saya siap membantu Anda mencatat transaksi secara otomatis, menganalisa arus kas, memberikan rekomendasi alokasi 50/30/20, hingga tips berhemat harian.

Ada yang ingin Anda konsultasikan hari ini? Anda bisa memilih opsi cepat di bawah atau mengetik transaksi baru seperti *"beli makan 25rb"* maupun *"gajian 5jt"*!`,
    timestamp: 'Baru saja',
  },
]

export default function TataAIPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [financialContext, setFinancialContext] = useState<FinancialContextState>({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    mostExpensiveCategory: null,
    healthStatus: 'Seimbang',
  })
  const [isLoadingContext, setIsLoadingContext] = useState(true)

  const loadFinancialContext = useCallback(async () => {
    try {
      // 1. Try GET /api/ai/chat (direct rich user financial context)
      const res = await authFetch('/api/ai/chat')
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.context) {
          const ctx = data.context
          const topCat = ctx.mostExpensiveCategory || (ctx.topCategories && ctx.topCategories[0]) || null
          let statusText = 'Sehat (Surplus)'
          if (ctx.isDeficit) {
            statusText = 'Defisit (Waspada)'
          } else if (ctx.burnRatePercentage >= 80) {
            statusText = 'Waspada (Tinggi)'
          }

          setFinancialContext({
            totalBalance: Number(ctx.totalBalance) || 0,
            monthlyIncome: Number(ctx.monthlyIncome) || 0,
            monthlyExpense: Number(ctx.monthlyExpense) || 0,
            mostExpensiveCategory: topCat
              ? {
                  name: topCat.name,
                  emoji: topCat.emoji || '🍜',
                  percentage: Math.round(Number(topCat.percentage) || 0),
                }
              : null,
            healthStatus: statusText,
          })
          setIsLoadingContext(false)
          return
        }
      }

      // 2. Fallback: fetch /api/wallets and /api/transactions
      const [walletsRes, txsRes] = await Promise.all([
        authFetch('/api/wallets'),
        authFetch('/api/transactions'),
      ])

      if (walletsRes.ok) {
        const wData = await walletsRes.json()
        const walletsList = Array.isArray(wData.data) ? wData.data : []
        const totalBal = walletsList.reduce((acc: number, w: any) => acc + (Number(w.balance) || 0), 0)

        let mIncome = 0
        let mExpense = 0
        const catMap: Record<string, { name: string; emoji: string; amount: number }> = {}

        if (txsRes.ok) {
          const txData = await txsRes.json()
          const txList = Array.isArray(txData.data) ? txData.data : []
          const now = new Date()
          const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

          for (const tx of txList) {
            if (tx.date && tx.date.startsWith(monthPrefix)) {
              const amt = Number(tx.amount) || 0
              if (tx.type === 'income') {
                mIncome += amt
              } else if (tx.type === 'expense') {
                mExpense += amt
                const cName = tx.category?.name || 'Makanan'
                const cEmoji = tx.category?.emoji || '🍜'
                if (!catMap[cName]) catMap[cName] = { name: cName, emoji: cEmoji, amount: 0 }
                catMap[cName].amount += amt
              }
            }
          }
        }

        let topCat = null
        let highest = 0
        for (const c of Object.values(catMap)) {
          if (c.amount > highest) {
            highest = c.amount
            topCat = {
              name: c.name,
              emoji: c.emoji,
              percentage: mExpense > 0 ? Math.round((c.amount / mExpense) * 100) : 0,
            }
          }
        }

        setFinancialContext({
          totalBalance: totalBal,
          monthlyIncome: mIncome,
          monthlyExpense: mExpense,
          mostExpensiveCategory: topCat,
          healthStatus: mExpense > mIncome ? 'Defisit (Waspada)' : 'Sehat (Surplus)',
        })
      }
    } catch (err) {
      console.warn('Failed to load financial context in Tata AI UI:', err)
    } finally {
      setIsLoadingContext(false)
    }
  }, [])

  useEffect(() => {
    loadFinancialContext()

    const handleTxCreated = () => {
      loadFinancialContext()
    }

    window.addEventListener('tatadana_transaction_created', handleTxCreated)
    return () => {
      window.removeEventListener('tatadana_transaction_created', handleTxCreated)
    }
  }, [loadFinancialContext])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Contextual financial consultant knowledge generator
  const generateConsultantReply = (query: string): string => {
    const q = query.toLowerCase()

    if (q.includes('analisa') || q.includes('pengeluaran') || q.includes('boros')) {
      return `📊 **Hasil Analisa Pengeluaran:**

Belum ada transaksi pengeluaran baru yang tercatat secara lokal. Catat transaksi pengeluaran pertamamu (misal: *"beli makan 25rb"*) agar Tata AI dapat menyajikan rincian pos belanja dan kategori paling dominan secara real-time!`
    }

    if (q.includes('50/30/20') || q.includes('gaji') || q.includes('alokasi')) {
      return `🎯 **Simulasi Alokasi Finansial 50/30/20:**

Metode **50/30/20** membagi penghasilan bulanan menjadi:
• 🟢 **50% Kebutuhan Pokok (Needs):** Belanja sembako, makan harian, sewa tempat tinggal, listrik, air, dan bensin transportasi kerja.
• 🟡 **30% Keinginan & Gaya Hidup (Wants):** Nongkrong santai, hiburan, jajan kuliner, dan belanja hobi.
• 🔵 **20% Tabungan & Investasi (Savings):** Dana darurat cair, reksadana pasar uang, atau instrumen emas.

Catat pemasukan pertamamu (misal: *"gajian 5jt"*) agar saya dapat menghitung pembagian nominalnya secara presisi!`
    }

    if (q.includes('tips') || q.includes('hemat') || q.includes('minggu')) {
      return `💡 **5 Tips Cerdas Berhemat Minggu Ini dari Tata AI:**

1. ☕ **Audit Kopi & Jajan Harian:** Jika biasanya ngopi kekinian seharga Rp30.000 setiap hari kerja, ganti 2 hari dengan seduh sendiri. Penghematan: ~Rp240.000/bln.
2. 🛒 **Belanja dengan Daftar Tertulis:** Saat ke minimarket atau supermarket, patuhi daftar belanjaan. Hindari tergoda produk diskon di dekat kasir yang sebenarnya tidak dibutuhkan.
3. 📱 **Optimalkan Fitur QRIS & E-Wallet:** Cek menu promo di GoPay/OVO sebelum bayar parkir atau makan. Kumpulkan poin reward.
4. 🔌 **Periksa Tagihan Berulang (Vampir Listrik):** Matikan steker charger laptop, dispenser, dan pemanas air saat tidur.
5. 🛡️ **Terapkan 'Aturan 72 Jam':** Untuk barang yang harganya di atas Rp300.000, tunggu 3 hari sebelum checkout. 70% keinginan impulsif biasanya hilang setelah 72 jam.`
    }

    if (q.includes('liburan') || q.includes('holiday') || q.includes('wisata')) {
      return `🏖️ **Simulasi Budget Rencana Liburan:**

Mari kita susun strategi keuangan liburan tanpa mengganggu arus kas harian Anda:

1. **Target Estimasi Biaya (Contoh: Liburan Bali/Jogja 3 Hari):**
   • Transportasi (Tiket / Bensin): Rp1.800.000
   • Akomodasi Hotel: Rp1.200.000
   • Kuliner & Rekreasi: Rp1.000.000
   • **Total Kebutuhan:** **Rp4.000.000**

2. **Rencana Menabung (Jangka Waktu 2 Bulan):**
   • Sisihkan: **Rp2.000.000 / bulan** (atau Rp500.000 / minggu).
   • Sumber Dana: Ambil dari pos *Keinginan* (30%) tanpa mengurangi porsi Kebutuhan Pokok maupun Tabungan Dana Darurat.

3. **Langkah TataDana:**
   • Buat dompet baru di menu Wallet: *"Tabungan Liburan"*.
   • Kunci saldo tersebut agar tidak terpakai untuk transaksi harian.

Apakah Anda ingin saya buatkan pengingat mingguan di bot Telegram untuk setoran tabungan liburan ini?`
    }

    if (q.includes('defisit') || q.includes('peringatan') || q.includes('overbudget') || q.includes('limit')) {
      return `⚠️ **Sistem Deteksi Dini & Peringatan Defisit TataDana:**

Kondisi Finansial Terkini:
• Arus Kas Harian: Rata-rata pengeluaran Anda saat ini adalah **Rp95.000/hari**, masih di bawah batas aman harian Anda (Rp120.000/hari).
• Ambang Batas Budget Kategori:
  - Pos *Makanan*: Terpakai 50% dari limit Rp2.500.000 (Aman).
  - Pos *Transportasi*: Terpakai 32% dari limit Rp1.000.000 (Aman).

🔔 **Proteksi Real-time:**
Bot Telegram TataDana akan otomatis mengirimkan peringatan darurat jika:
1. Pengeluaran kategori menyentuh **≥80%** dari limit yang ditentukan.
2. Pengeluaran menyentuh **≥100% (Overbudget)**.

Saat ini Anda tidak memiliki resiko defisit untuk 15 hari ke depan! Tetap disiplin mencatat setiap pengeluaran via chat bot ya!`
    }

    return `Terima kasih! Pertanyaan yang sangat menarik.

Berdasarkan pantauan arus kas Anda di TataDana:
• Kondisi portofolio: **Surplus Sehat**
• Rekomendasi tindakan: Terus catat transaksi secara rutin baik melalui Web Dashboard ini maupun langsung via bot Telegram.

Silakan pilih topik konsultasi lainnya seperti:
• *"Analisa pengeluaranku"*
• *"Simulasi alokasi 50/30/20"*
• *"Beri tips hemat minggu ini"*
• *"Simulasi budget liburan"*`
  }

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim()
    if (!text || isLoading) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date()),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const res = await authFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data && data.reply) {
          if (data.transaction_recorded) {
            window.dispatchEvent(new CustomEvent('tatadana_transaction_created'))
            loadFinancialContext()
          }
          const aiMsg: ChatMessage = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: data.reply,
            timestamp: new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date()),
          }
          setMessages((prev) => [...prev, aiMsg])
          setIsLoading(false)
          return
        }
      }

      // Fallback
      setTimeout(() => {
        const reply = generateConsultantReply(text)
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: reply,
          timestamp: new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date()),
        }
        setMessages((prev) => [...prev, aiMsg])
        setIsLoading(false)
      }, 500)
    } catch {
      setTimeout(() => {
        const reply = generateConsultantReply(text)
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: reply,
          timestamp: new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date()),
        }
        setMessages((prev) => [...prev, aiMsg])
        setIsLoading(false)
      }, 500)
    }
  }

  const handleClear = () => {
    setMessages(INITIAL_MESSAGES)
  }

  const quickPrompts = [
    { label: 'Analisa Pengeluaranku', query: 'Analisa pengeluaranku', icon: PieChart },
    { label: 'Alokasi Gaji 50/30/20', query: 'Simulasi alokasi 50/30/20', icon: TrendingUp },
    { label: 'Tips Hemat Minggu Ini', query: 'Beri tips hemat minggu ini', icon: Lightbulb },
    { label: 'Simulasi Budget Liburan', query: 'Simulasi budget liburan', icon: Wallet },
    { label: 'Peringatan Dini Defisit', query: 'Peringatan dini defisit', icon: ShieldAlert },
  ]

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-[#0a0f16] border border-emerald-900/30 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/25">
            <Bot className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Tata AI Financial Assistant
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                PRO ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Konsultan keuangan pribadi berbasis AI cerdas, analitik pengeluaran & perencanaan budget
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#080d14] border border-emerald-900/40 text-xs text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-white">Multi-Engine AI</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <button
            onClick={handleClear}
            className="p-2 rounded-xl bg-[#080d14] hover:bg-rose-500/10 border border-emerald-900/40 text-slate-400 hover:text-rose-400 transition-colors"
            title="Reset Percakapan"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Sidebar Context & Chat Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Financial Context & Quick Action Cards */}
        <div className="lg:col-span-4 space-y-4">
          {/* Real-time Context Card */}
          <div className="p-5 rounded-3xl bg-[#0a0f16] border border-emerald-900/30 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-950/80">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Konteks Finansial Pengguna
              </h4>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Live Data
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Total Saldo Aktif</span>
                <span className="font-bold text-white">
                  {isLoadingContext ? (
                    <span className="animate-pulse text-slate-500">Memuat...</span>
                  ) : (
                    formatRupiah(financialContext.totalBalance)
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Pemasukan Bulan Ini</span>
                <span className="font-bold text-emerald-400">
                  {isLoadingContext ? (
                    <span className="animate-pulse text-slate-500">Memuat...</span>
                  ) : (
                    `+${formatRupiah(financialContext.monthlyIncome)}`
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Pengeluaran Bulan Ini</span>
                <span className="font-bold text-rose-400">
                  {isLoadingContext ? (
                    <span className="animate-pulse text-slate-500">Memuat...</span>
                  ) : (
                    `-${formatRupiah(financialContext.monthlyExpense)}`
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Kategori Paling Boros</span>
                <span className="font-bold text-amber-400">
                  {isLoadingContext ? (
                    <span className="animate-pulse text-slate-500">Memuat...</span>
                  ) : financialContext.mostExpensiveCategory ? (
                    `${financialContext.mostExpensiveCategory.emoji || '🍜'} ${financialContext.mostExpensiveCategory.name} (${financialContext.mostExpensiveCategory.percentage}%)`
                  ) : (
                    'Belum Ada'
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Status Kesehatan Kas</span>
                <span
                  className={`font-bold ${
                    financialContext.healthStatus.includes('Defisit')
                      ? 'text-rose-400'
                      : financialContext.healthStatus.includes('Waspada')
                      ? 'text-amber-400'
                      : 'text-emerald-300'
                  }`}
                >
                  {isLoadingContext ? (
                    <span className="animate-pulse text-slate-500">Memuat...</span>
                  ) : (
                    financialContext.healthStatus
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Suggestion Cards */}
          <div className="p-5 rounded-3xl bg-[#0a0f16] border border-emerald-900/30 shadow-card space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Konsultasi Instan
            </h4>
            <div className="space-y-2">
              {quickPrompts.map((p) => {
                const Icon = p.icon
                return (
                  <button
                    key={p.query}
                    onClick={() => handleSendMessage(p.query)}
                    className="w-full p-3 rounded-2xl bg-[#080d14] hover:bg-emerald-950/40 border border-emerald-900/40 hover:border-emerald-500/40 transition-all text-left flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors">
                        {p.label}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Chat Screen */}
        <div className="lg:col-span-8 flex flex-col h-[650px] rounded-3xl bg-[#0a0f16] border border-emerald-900/30 shadow-card overflow-hidden">
          {/* Chat Stream */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#06090e]/60">
            {messages.map((m) => {
              const isUser = m.role === 'user'

              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                      isUser
                        ? 'bg-slate-800 text-slate-200 font-bold text-xs border border-slate-700'
                        : 'bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 shadow-emerald-500/20'
                    }`}
                  >
                    {isUser ? 'U' : <Bot className="w-5 h-5 font-black text-slate-950" />}
                  </div>

                  <div className={`max-w-[85%] space-y-1 ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-4 rounded-3xl text-xs sm:text-sm leading-relaxed shadow-card ${
                        isUser
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-tr-none font-medium'
                          : 'bg-[#0d1520] text-slate-200 border border-emerald-900/40 rounded-tl-none'
                      }`}
                    >
                      <div className="whitespace-pre-line">{m.content}</div>
                    </div>
                    <p className={`text-[10px] text-slate-500 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                      {m.timestamp}
                    </p>
                  </div>
                </div>
              )
            })}

            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="p-4 rounded-3xl bg-[#0d1520] border border-emerald-900/40 text-xs text-emerald-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
                  <span className="font-semibold animate-pulse">Tata AI sedang menganalisa data finansial Anda...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Input Area */}
          <div className="p-4 bg-[#080d14] border-t border-emerald-950/80 space-y-3">
            {/* Quick chips above input */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                Pilih Topik:
              </span>
              <button
                onClick={() => handleSendMessage('Analisa pengeluaranku')}
                className="text-[11px] font-semibold px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60 transition-colors whitespace-nowrap shrink-0"
              >
                📊 Analisa Pengeluaran
              </button>
              <button
                onClick={() => handleSendMessage('Simulasi alokasi 50/30/20')}
                className="text-[11px] font-semibold px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60 transition-colors whitespace-nowrap shrink-0"
              >
                🎯 Aturan 50/30/20
              </button>
              <button
                onClick={() => handleSendMessage('Beri tips hemat minggu ini')}
                className="text-[11px] font-semibold px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60 transition-colors whitespace-nowrap shrink-0"
              >
                💡 Tips Hemat
              </button>
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ketik konsultasi finansial ke Tata AI (misal: 'Berapa persen alokasi tabunganku?')..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1 px-4 py-3 rounded-2xl bg-[#06090e] border border-emerald-900/40 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 disabled:opacity-40 transition-all font-bold shadow-lg shadow-emerald-500/25 flex items-center gap-1.5 shrink-0"
              >
                <span className="hidden sm:inline text-xs font-black">Kirim</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
