'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bot,
  Sparkles,
  X,
  Send,
  Maximize2,
  Trash2,
} from 'lucide-react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-init-1',
    role: 'assistant',
    content: 'Halo Sobat TataDana! 👋 Saya Tata AI, asisten finansial pribadi kamu. Ada yang bisa saya bantu analisa atau konsultasikan hari ini?',
    timestamp: 'Baru saja',
  },
]

export const FloatingAIWidget: React.FC = () => {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Hide floating widget if currently on the dedicated /dashboard/tata-ai page
  const isDedicatedPage = pathname === '/dashboard/tata-ai'

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  if (isDedicatedPage) {
    return null
  }

  // Fallback intelligent consultant responder
  const generateFallbackResponse = (query: string): string => {
    const q = query.toLowerCase()
    if (q.includes('analisa') || q.includes('pengeluaran') || q.includes('boros')) {
      return `📊 **Analisa Keuangan TataDana:**\n\nBelum ada transaksi pengeluaran baru yang tercatat secara lokal. Catat transaksi pengeluaran pertamamu (misal: "beli makan 25rb") agar Tata AI dapat menyajikan rincian pos belanja dan kategori paling dominan secara real-time!`
    }
    if (q.includes('50/30/20') || q.includes('gaji') || q.includes('alokasi')) {
      return `🎯 **Simulasi Alokasi Finansial 50/30/20:**\n\n• 🟢 **50% Kebutuhan Pokok:** Makanan, tempat tinggal, listrik & air, kuota internet.\n• 🟡 **30% Keinginan:** Hiburan bioskop, makan di resto, hobi.\n• 🔵 **20% Tabungan & Investasi:** Dana darurat & tabungan masa depan.\n\nCatat pemasukan pertamamu (misal: "gajian 5jt") agar saya dapat menghitungkan pembagian nominalnya secara presisi!`
    }
    if (q.includes('tips') || q.includes('hemat') || q.includes('minggu')) {
      return `💡 **3 Tips Hemat Minggu Ini:**\n\n1. **Gunakan Aturan 24 Jam:** Tunda pembelian barang e-commerce non-esensial selama 24 jam.\n2. **Manfaatkan Promo QRIS:** Selalu cek cashback atau diskon di GoPay/OVO sebelum bayar.\n3. **Cek Tagihan Rutin:** Pastikan mematikan AC & listrik saat ruangan tidak terpakai.`
    }
    if (q.includes('liburan') || q.includes('holiday')) {
      return `🏖️ **Simulasi Budget Liburan:**\n\n• **Target Dana:** Rp4.000.000\n• **Jangka Waktu:** 2 bulan (Rp2.000.000/bln)\n• **Saran Alokasi:** Ambil dari pos Keinginan (30%) tanpa mengurangi porsi dana darurat utama.`
    }
    return `Terima kasih atas pertanyaannya! Saya siap membantu kamu mencatat keuangan atau konsultasi finansial di TataDana. Silakan tanyakan hal spesifik seperti "analisa pengeluaranku", "simulasi 50/30/20", atau "tips hemat minggu ini"! 😊`
  }

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim()
    if (!text || isLoading) return

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
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

      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('tatadana_session') || localStorage.getItem('tatadana_admin_session')
          : null
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers,
        credentials: 'include',
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
        const reply = generateFallbackResponse(text)
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: reply,
          timestamp: new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date()),
        }
        setMessages((prev) => [...prev, aiMsg])
        setIsLoading(false)
      }, 400)
    } catch {
      setTimeout(() => {
        const reply = generateFallbackResponse(text)
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: reply,
          timestamp: new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date()),
        }
        setMessages((prev) => [...prev, aiMsg])
        setIsLoading(false)
      }, 400)
    }
  }

  const handleClearHistory = () => {
    setMessages(INITIAL_MESSAGES)
  }

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 group">
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-slate-950 font-bold shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-500/60 hover:scale-105 active:scale-95 transition-all duration-300"
            title="Tanya Tata AI"
          >
            <div className="relative">
              <Bot className="w-5 h-5 text-slate-950" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping" />
            </div>
            <span className="text-xs font-black tracking-tight">Tanya Tata AI</span>
            <Sparkles className="w-3.5 h-3.5 text-slate-950" />
          </button>
        </div>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-88 sm:w-96 max-w-[calc(100vw-2rem)] h-[540px] max-h-[85vh] rounded-3xl bg-[#080d14] border border-emerald-500/30 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-4 bg-[#0a0f16] border-b border-emerald-950/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/30">
                <Bot className="w-5 h-5 text-slate-950 font-black" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-black text-white">Tata AI Assistant</h4>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[10px] text-emerald-400 font-medium">Asisten Finansial Pro</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/dashboard/tata-ai"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-emerald-950/40 transition-colors"
                title="Buka Layar Penuh"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={handleClearHistory}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Bersihkan Chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-emerald-950/40 transition-colors"
                title="Tutup Widget"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#06090e]">
            {messages.map((m) => {
              const isUser = m.role === 'user'

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-br-none shadow-md shadow-emerald-900/30 font-medium'
                        : 'bg-[#0e1622] text-slate-200 border border-emerald-900/30 rounded-bl-none shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-line">{m.content}</div>
                  </div>
                  <span className="text-[9px] text-slate-500 px-1">{m.timestamp}</span>
                </div>
              )
            })}

            {isLoading && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#0e1622] border border-emerald-900/30 text-xs text-emerald-400 max-w-[70%]">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span className="text-[11px] font-semibold animate-pulse">Tata AI sedang berpikir...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Chips */}
          <div className="p-2 border-t border-emerald-950/80 bg-[#0a0f16]/90 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
            <button
              onClick={() => handleSendMessage('Analisa pengeluaranku')}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60 transition-colors whitespace-nowrap shrink-0"
            >
              📊 Analisa Pengeluaran
            </button>
            <button
              onClick={() => handleSendMessage('Beri tips hemat minggu ini')}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60 transition-colors whitespace-nowrap shrink-0"
            >
              💡 Tips Hemat
            </button>
            <button
              onClick={() => handleSendMessage('Simulasi alokasi 50/30/20')}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60 transition-colors whitespace-nowrap shrink-0"
            >
              🎯 Alokasi 50/30/20
            </button>
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-[#080d14] border-t border-emerald-950/80">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Tanya finansial ke Tata AI..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#06090e] border border-emerald-900/40 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 disabled:opacity-40 transition-all font-bold shadow-md shadow-emerald-500/20"
                title="Kirim Pesan"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
