'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  ArrowRight,
  Bot,
  Receipt,
  FileSpreadsheet,
  BrainCircuit,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  Play,
  Wallet,
  PieChart,
  TrendingUp,
  MessageSquare,
  Zap,
} from 'lucide-react'

export default function LandingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'lifetime'>('monthly')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [activeTabChat, setActiveTabChat] = useState<'text' | 'receipt' | 'voice'>('text')

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* 1. NAVBAR (Sticky) */}
      <nav className="sticky top-0 z-50 bg-[#06090e]/85 backdrop-blur-md border-b border-emerald-950/80 px-4 sm:px-8 py-4 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
              <span className="font-extrabold text-xl tracking-tight">TD</span>
            </div>
            <div>
              <span className="text-xl font-black text-white tracking-tight flex items-center gap-1.5">
                TataDana
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </span>
              <p className="text-[10px] text-emerald-400/80 font-semibold tracking-wider uppercase">Luxury Fintech ID</p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#fitur" className="hover:text-emerald-300 transition-colors">
              Fitur
            </a>
            <a href="#cara-kerja" className="hover:text-emerald-300 transition-colors">
              Cara Kerja
            </a>
            <a href="#harga" className="hover:text-emerald-300 transition-colors">
              Harga
            </a>
            <a href="#faq" className="hover:text-emerald-300 transition-colors">
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-300 hover:text-white px-4 py-2 rounded-xl hover:bg-emerald-950/40 transition-colors"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="text-sm font-bold bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:from-emerald-700 active:to-teal-600 text-slate-950 px-4.5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 transition-all flex items-center gap-1.5"
            >
              <span>Coba Gratis</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative pt-20 pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-500/12 blur-[140px] pointer-events-none rounded-full" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Pre-headline badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-xs sm:text-sm font-semibold text-emerald-300 mb-8 shadow-inner shadow-emerald-500/10 animate-fade-in">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>✨ Catat keuangan langsung dari Telegram</span>
          </div>

          {/* Headline (H1) */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] text-white max-w-4xl mx-auto mb-6">
            Gaji habis sebelum akhir bulan?{' '}
            <span className="text-gradient-emerald">Sudah saatnya kamu tahu ke mana uangmu pergi.</span>
          </h1>

          {/* Sub-headline */}
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed mb-10">
            TataDana mencatat setiap pengeluaranmu langsung dari chat Telegram atau foto struk — sisanya kami yang urus.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-base shadow-xl shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>Mulai Gratis Sekarang</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#demo-interactive"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#0a0f16] hover:bg-[#0e1622] border border-emerald-900/40 text-slate-200 font-semibold text-base transition-all flex items-center justify-center gap-2"
            >
              <span>Lihat cara kerjanya</span>
              <span className="text-emerald-400">→</span>
            </a>
          </div>

          {/* Hero Video Placeholder */}
          <div className="relative mx-auto max-w-4xl rounded-3xl p-2 bg-gradient-to-b from-emerald-900/30 to-slate-950/80 border border-emerald-500/20 shadow-2xl overflow-hidden group">
            {/* TODO: ganti dengan video asli presentasi produk TataDana */}
            <div className="relative aspect-video w-full rounded-2xl bg-[#080d14] flex flex-col items-center justify-center overflow-hidden border border-emerald-950">
              <div className="absolute inset-0 bg-radial-gradient from-emerald-500/10 via-transparent to-transparent opacity-60" />
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform cursor-pointer shadow-lg shadow-emerald-500/20">
                <Play className="w-7 h-7 fill-emerald-400 translate-x-0.5" />
              </div>
              <p className="text-sm font-semibold text-slate-300">Video Demo TataDana (2 Menit)</p>
              <p className="text-xs text-slate-500 mt-1">Placeholder video interaktif — klik untuk melihat alur chat bot</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PROBLEM AWARE BULLET POINTS */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-800/60 bg-[#070b12]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-bold tracking-widest text-brand-400 uppercase">Masalah Finansial Kita</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              Kenapa mengontrol pengeluaran selalu terasa berat?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center text-2xl mb-6">
                ⏳
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                &ldquo;Buka aplikasi keuangan? Nanti dulu deh...&rdquo;
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Aplikasi keuangan tradisional punya terlalu banyak tombol, menu berbelit, dan form panjang. Niat mencatat
                pun akhirnya buyar karena keburu malas.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center text-2xl mb-6">
                💸
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                &ldquo;Kok uangnya habis ya? Padahal kayak tidak beli apa-apa&rdquo;
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Jajan kopi 25rb, parkir 5rb, transfer 10rb. Pengeluaran mikro yang bocor halus ini tidak pernah tercatat,
                sampai saldo rekening tiba-tiba tersisa tipis.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/30 text-brand-400 flex items-center justify-center text-2xl mb-6">
                🎯
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                &ldquo;Udah niat bikin budget, tapi seminggu lupa&rdquo;
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Bikin resolusi keuangan di Excel rapi di awal bulan, tapi tidak ada pengingat otomatis. Budget tanpa
                pantauan harian sama saja tidak ada budget.
              </p>
            </div>
          </div>

          {/* Solusi Transisi */}
          <div className="mt-16 p-8 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-950 to-emerald-950/60 border border-emerald-500/30 text-center">
            <p className="text-base sm:text-lg text-slate-300">
              Bagaimana kalau mencatat keuangan semudah kirim pesan ke teman akrab?
            </p>
            <p className="text-2xl sm:text-3xl font-black text-white mt-2">
              Memperkenalkan <span className="text-gradient-emerald">TataDana</span>.
            </p>
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE DEMO PREVIEW (Telegram Bot Chat Simulation) */}
      <section id="demo-interactive" className="py-24 px-4 sm:px-6 lg:px-8 relative bg-[#06090e]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">Live Interaktif</span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mt-2">
              Ketik di Telegram, Otomatis Masuk Dashboard
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto mt-4 text-sm sm:text-base">
              Coba simulasi interaktif di bawah ini untuk melihat format respons Telegram Bot dan grafik dashboard TataDana secara langsung.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Telegram Chat Mockup (5 Cols) */}
            <div className="lg:col-span-5 rounded-3xl bg-[#080d14] border border-emerald-900/40 shadow-2xl overflow-hidden flex flex-col h-[520px]">
              {/* Telegram Header */}
              <div className="bg-[#0e1622] p-4 flex items-center justify-between border-b border-emerald-950/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-sm">
                    TD
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      TataDana Bot
                      <Bot className="w-3.5 h-3.5 text-emerald-400" />
                    </h4>
                    <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      bot online
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveTabChat('text')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                      activeTabChat === 'text' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Teks
                  </button>
                  <button
                    onClick={() => setActiveTabChat('receipt')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                      activeTabChat === 'receipt' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Struk
                  </button>
                  <button
                    onClick={() => setActiveTabChat('voice')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                      activeTabChat === 'voice' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Voice
                  </button>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs font-mono">
                {activeTabChat === 'text' && (
                  <>
                    <div className="flex justify-end">
                      <div className="bg-brand-600/90 text-white px-3.5 py-2 rounded-2xl rounded-tr-xs max-w-[80%] font-sans">
                        beli bakso malang 25rb
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-[#1e293b] border border-slate-700/70 text-slate-200 p-3.5 rounded-2xl rounded-tl-xs max-w-[90%] space-y-2 font-mono">
                        <p className="text-slate-400 font-sans text-[11px]">📅 Sabtu, 10 Okt 2026 — 12:30 WIB</p>
                        <p className="font-bold text-rose-400 font-sans">💸 Pengeluaran tercatat!</p>
                        <div className="space-y-0.5 text-slate-300">
                          <p>├ Nominal : Rp25.000</p>
                          <p>├ Kategori : 🍜 Makanan</p>
                          <p>├ Dompet : 👛 BCA Utama</p>
                          <p>├ Catatan : beli bakso malang</p>
                          <p className="text-white font-bold">└ Saldo : Rp3.475.000</p>
                        </div>
                        <div className="pt-2 border-t border-slate-700/60 font-sans">
                          <p className="text-slate-400 text-[11px]">📊 Budget Makanan bulan ini:</p>
                          <p className="font-mono text-brand-400 mt-0.5">██████░░░░ 60% — sisa Rp400.000</p>
                          <p className="text-emerald-400 text-[10px] mt-1">💪 Pengeluaranmu masih dalam batas wajar!</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeTabChat === 'receipt' && (
                  <>
                    <div className="flex justify-end">
                      <div className="bg-brand-600/90 text-white p-2.5 rounded-2xl rounded-tr-xs max-w-[80%] font-sans flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-white" />
                        <span>[Foto Struk Supermarket Indomaret]</span>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-[#1e293b] border border-slate-700/70 text-slate-200 p-3.5 rounded-2xl rounded-tl-xs max-w-[90%] space-y-2 font-mono">
                        <p className="text-brand-400 font-sans font-bold flex items-center gap-1.5">
                          ✨ AI OCR Vision Struk (Pro)
                        </p>
                        <p className="font-bold text-rose-400 font-sans">💸 1 Transaksi Utama (3 Item Rincian):</p>
                        <div className="space-y-0.5 text-slate-300 text-[11px]">
                          <p>• Roti Tawar — Rp18.000 (🍜 Makanan)</p>
                          <p>• Sabun Cuci — Rp22.500 (🏠 Kebutuhan Rumah)</p>
                          <p>• Kopi Kaleng — Rp9.500 (🍜 Makanan)</p>
                          <p className="text-white font-bold pt-1">└ Total Struk: Rp50.000</p>
                        </div>
                        <p className="text-slate-400 font-sans text-[10px] pt-1 border-t border-slate-700/60">
                          Tersimpan di dashboard dengan rincian per-item yang bisa di-expand!
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {activeTabChat === 'voice' && (
                  <>
                    <div className="flex justify-end">
                      <div className="bg-brand-600/90 text-white px-3.5 py-2 rounded-2xl rounded-tr-xs max-w-[80%] font-sans flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping" />
                        <span>🎙️ Pesan Suara (0:08)</span>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-[#1e293b] border border-slate-700/70 text-slate-200 p-3.5 rounded-2xl rounded-tl-xs max-w-[90%] space-y-2 font-mono">
                        <p className="text-amber-400 font-sans text-[11px]">
                          🎙️ Transkrip: &ldquo;bensin motor lima puluh ribu di pertamina&rdquo;
                        </p>
                        <p className="font-bold text-rose-400 font-sans">💸 Pengeluaran tercatat!</p>
                        <div className="space-y-0.5 text-slate-300">
                          <p>├ Nominal : Rp50.000</p>
                          <p>├ Kategori : 🚗 Transport</p>
                          <p>├ Dompet : 👛 Cash Dompet</p>
                          <p className="text-white font-bold">└ Saldo : Rp250.000</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 bg-[#1e293b]/80 border-t border-slate-700/60 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value="gajian bonus 5jt..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-400 focus:outline-none"
                />
                <button className="p-2 bg-brand-500 rounded-xl text-white">
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Dashboard Mirror Preview (7 Cols) */}
            <div className="lg:col-span-7 rounded-3xl bg-slate-900/80 border border-slate-800 p-6 shadow-2xl h-[520px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-brand-400" />
                      Dashboard Ringkasan Bulan Ini
                    </h3>
                    <p className="text-xs text-slate-400">Sinkronisasi Realtime dengan Telegram</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                    Realtime Online
                  </span>
                </div>

                {/* 4 Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] text-slate-400 font-medium">Saldo Total</p>
                    <p className="text-sm sm:text-base font-bold text-white mt-1">Rp8.750.000</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] text-slate-400 font-medium">Pemasukan</p>
                    <p className="text-sm sm:text-base font-bold text-emerald-400 mt-1">Rp12.000.000</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] text-slate-400 font-medium">Pengeluaran</p>
                    <p className="text-sm sm:text-base font-bold text-rose-400 mt-1">Rp3.250.000</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] text-slate-400 font-medium">Budget Sisa</p>
                    <p className="text-sm sm:text-base font-bold text-brand-400 mt-1">Rp2.750.000</p>
                  </div>
                </div>

                {/* Mock Chart & Recent Transactions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <p className="text-xs font-bold text-slate-300">Pengeluaran per Kategori</p>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400">🍜 Makanan</span>
                          <span className="text-slate-200 font-semibold">Rp1.450.000</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-brand-500 h-full w-[45%]" />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400">🚗 Transport</span>
                          <span className="text-slate-200 font-semibold">Rp650.000</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-amber-500 h-full w-[25%]" />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400">🏠 Tagihan</span>
                          <span className="text-slate-200 font-semibold">Rp1.150.000</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full w-[30%]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <p className="text-xs font-bold text-slate-300">Transaksi Terbaru</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-900/60">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🍜</span>
                          <div>
                            <p className="font-semibold text-white text-[11px]">Beli Bakso Malang</p>
                            <p className="text-[10px] text-slate-500">BCA • 12:30 WIB</p>
                          </div>
                        </div>
                        <span className="text-rose-400 font-bold text-[11px]">-Rp25.000</span>
                      </div>
                      <div className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-900/60">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🛒</span>
                          <div>
                            <p className="font-semibold text-white text-[11px]">Belanja Indomaret (Struk)</p>
                            <p className="text-[10px] text-slate-500">GoPay • 10:15 WIB</p>
                          </div>
                        </div>
                        <span className="text-rose-400 font-bold text-[11px]">-Rp50.000</span>
                      </div>
                      <div className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-900/60">
                        <div className="flex items-center gap-2">
                          <span className="text-base">💰</span>
                          <div>
                            <p className="font-semibold text-white text-[11px]">Gaji Bulanan</p>
                            <p className="text-[10px] text-slate-500">Mandiri • 08:00 WIB</p>
                          </div>
                        </div>
                        <span className="text-emerald-400 font-bold text-[11px]">+Rp12.000.000</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <p className="text-xs text-slate-400">Ingin melihat dashboard aslimu?</p>
                <Link
                  href="/register"
                  className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1"
                >
                  Buka Dashboard Sekarang →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. 3 FITUR ALTERNATING LAYOUT */}
      <section id="fitur" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-slate-800/60 bg-[#070b12]">
        <div className="max-w-6xl mx-auto space-y-28">
          {/* Fitur 1: Catat via Telegram */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/30 text-brand-400 flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                Catat Pengeluaran Semudah Chat Teman. Tanpa Buka Aplikasi.
              </h3>
              <p className="text-slate-400 leading-relaxed text-base">
                Cukup ketik natural seperti <span className="text-brand-400 font-mono">&ldquo;kopi 18rb&rdquo;</span> atau{' '}
                <span className="text-brand-400 font-mono">&ldquo;gajian 6.5jt&rdquo;</span>. AI cerdas kami otomatis
                memahami nominal rupiah Indonesia, kategori, dan mencatatnya ke dompet defaultmu dalam sekejap.
              </p>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />
                  <span>Mendukung teks, foto struk OCR, dan rekaman pesan suara</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />
                  <span>Langsung dapat info sisa budget kategori seketika</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />
                  <span>Semua riwayat otomatis tersimpan aman di cloud Supabase</span>
                </li>
              </ul>
            </div>
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-2xl">
              <div className="space-y-3 font-mono text-xs">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300">
                  <p className="text-brand-400 font-bold mb-2">💡 Variasi Format yang Didukung:</p>
                  <p>• &quot;makan siang padang 24ribu&quot; → Rp24.000 (Makanan)</p>
                  <p>• &quot;bensin 35k pake ovo&quot; → Rp35.000 (Transport • OVO)</p>
                  <p>• &quot;gaji kantor 8.5jt&quot; → Rp8.500.000 (Pemasukan)</p>
                  <p>• &quot;beli token listrik 100rb&quot; → Rp100.000 (Tagihan)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Fitur 2: Laporan & Export Otomatis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center lg:flex-row-reverse">
            <div className="lg:order-2 space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                Laporan Keuangan Rapi & Siap Unduh Kapan Saja.
              </h3>
              <p className="text-slate-400 leading-relaxed text-base">
                Tidak perlu bikin spreadsheet manual lagi. TataDana menyajikan halaman Laporan native dengan filter
                lengkap per kategori, dompet, dan tanggal, serta fitur generate file PDF & Excel (.xlsx) dengan signed
                link aman.
              </p>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Export on-demand ke PDF dan Excel (.xlsx) rapi</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Struk multi-item tersimpan rapi dengan rincian per-item</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Pencatatan real-time tanpa perlu refresh halaman</span>
                </li>
              </ul>
            </div>
            <div className="lg:order-1 p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-300">Preview Export File</span>
                  <span className="text-xs font-semibold text-emerald-400">PDF & Excel Ready</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Total Pemasukan</span>
                    <span className="text-emerald-400 font-bold">Rp12.000.000</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Total Pengeluaran</span>
                    <span className="text-rose-400 font-bold">Rp3.250.000</span>
                  </div>
                  <div className="flex justify-between items-center py-1 text-white font-bold">
                    <span>Net Cashflow</span>
                    <span className="text-brand-400">+Rp8.750.000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fitur 3: AI Financial Advisor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                AI Financial Advisor Pribadi di Saku Kamu.
              </h3>
              <p className="text-slate-400 leading-relaxed text-base">
                Khusus paket Pro, AI akan memantau pola keuanganmu. Jika pengeluaran satu kategori melonjak lebih dari
                50% dibanding minggu lalu atau budget hampir tembus 80%, AI otomatis memberikan saran solutif langsung di
                Telegram kamu.
              </p>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" />
                  <span>Peringatan dini lonjakan pengeluaran mendadak</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" />
                  <span>Saran penghematan yang actionable dan personal</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" />
                  <span>Bekerja otomatis tanpa perlu pemicu command khusus</span>
                </li>
              </ul>
            </div>
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-2xl">
              <div className="p-5 rounded-2xl bg-[#1e293b] border border-purple-500/30 space-y-3 font-mono text-xs">
                <p className="text-purple-400 font-bold flex items-center gap-1.5 font-sans">
                  🤖 Financial Advisor TataDana
                </p>
                <p className="text-slate-200 font-sans">
                  Hei Dimas! Pengeluaran kategori <span className="text-brand-400 font-semibold">🍜 Makanan</span> kamu
                  minggu ini melonjak <span className="text-rose-400 font-bold">54%</span> dibanding minggu lalu karena sering
                  pesan pesan antar ojol malam hari.
                </p>
                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 font-sans">
                  <p className="text-purple-300 font-semibold">💡 Saran:</p>
                  <p className="text-slate-300 text-[11px] mt-1">
                    Coba alokasikan meal prep untuk 3 hari ke depan agar budget makan kamu tidak jebol sebelum akhir bulan!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. TESTIMONI (Masonry Grid Placeholder) */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-slate-800/60 bg-[#090d16]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-bold tracking-widest text-brand-400 uppercase">Testimoni Pengguna</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              Cerita Mereka yang Sudah Bebas dari Gaji Numpang Lewat
            </h2>
          </div>

          {/* TODO: ganti dengan testimoni asli setelah fase beta user */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
              <p className="text-sm text-slate-300 italic mb-6 leading-relaxed">
                &ldquo;Dulu setiap tanggal 20 rekening udah sisa puluhan ribu. Sejak pakai TataDana via Telegram, setiap
                jajan langsung inget ngetik. Akhirnya bulan ini bisa nabung 2 juta!&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center">
                  R
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Rizky Pratama</p>
                  <p className="text-xs text-slate-500">Software Engineer, Jakarta</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
              <p className="text-sm text-slate-300 italic mb-6 leading-relaxed">
                &ldquo;Fitur foto struk di paket Pro beneran ngebantu banget. Habis belanja bulanan tinggal jepret struk
                dari kasir, item-itemnya langsung kepisah rapi otomatis.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center">
                  A
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Anindya Putri</p>
                  <p className="text-xs text-slate-500">Freelance Designer, Bandung</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
              <p className="text-sm text-slate-300 italic mb-6 leading-relaxed">
                &ldquo;Paling suka sama reminder harian di Telegramnya. Nggak ganggu tapi pas jam santai malam selalu
                ingetin cek pengeluaran hari ini.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center">
                  F
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Fajar Nugroho</p>
                  <p className="text-xs text-slate-500">Marketing Specialist, Surabaya</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. PRICING SECTION */}
      <section id="harga" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-slate-800/60 bg-[#070b12]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-bold tracking-widest text-brand-400 uppercase">Pilihan Paket</span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mt-2">
              Investasi Kecil untuk Kontrol Keuangan Selamanya
            </h2>
            <p className="text-slate-400 mt-4 text-sm sm:text-base">Pilih paket yang paling sesuai dengan kebutuhanmu.</p>

            {/* Pricing Toggle */}
            <div className="inline-flex items-center p-1.5 rounded-2xl bg-slate-900 border border-slate-800 mt-8">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                  billingPeriod === 'monthly'
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Langganan Bulanan
              </button>
              <button
                onClick={() => setBillingPeriod('lifetime')}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${
                  billingPeriod === 'lifetime'
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Sekali Bayar (Pro)</span>
                <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-md uppercase font-black">
                  Hemat
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Starter Plan */}
            <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white">Starter</h3>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-300">
                    Pemula
                  </span>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-white">Rp49.000</span>
                  <span className="text-slate-400 text-sm"> / bulan</span>
                </div>
                <p className="text-sm text-slate-400 mb-8">
                  Cocok untuk yang baru mulai membiasakan diri mencatat pengeluaran harian via chat.
                </p>

                <ul className="space-y-4 text-sm text-slate-300 border-t border-slate-800 pt-6">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />
                    <span>Catat transaksi via teks Telegram</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />
                    <span>Maksimal 50 transaksi / bulan</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />
                    <span>Maksimal 3 wallet & 5 kategori budget</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />
                    <span>Input via Voice Note Telegram</span>
                  </li>
                  <li className="flex items-center gap-3 text-slate-500 line-through">
                    <span>Input foto struk dengan AI OCR</span>
                  </li>
                  <li className="flex items-center gap-3 text-slate-500 line-through">
                    <span>AI Financial Advisor</span>
                  </li>
                  <li className="flex items-center gap-3 text-slate-500 line-through">
                    <span>Export laporan PDF & Excel</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <Link
                  href="/register"
                  className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition-colors"
                >
                  Pilih Starter
                </Link>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-brand-950/40 via-slate-900 to-slate-900 border-2 border-brand-500/80 shadow-2xl shadow-brand-500/10 flex flex-col justify-between relative">
              <div className="absolute -top-3.5 right-8 bg-brand-500 text-white text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                Paling Populer
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    Pro Lifetime
                    <Sparkles className="w-4 h-4 text-brand-400" />
                  </h3>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/40">
                    Sekali Bayar
                  </span>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-white">Rp99.000</span>
                  <span className="text-slate-400 text-sm"> / sekali bayar</span>
                </div>
                <p className="text-sm text-slate-300 mb-8">
                  Solusi lengkap tanpa batas untuk kamu yang serius ingin keuangan terkontrol selamanya.
                </p>

                <ul className="space-y-4 text-sm text-slate-200 border-t border-slate-800 pt-6">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />
                    <span className="font-semibold text-white">Semua fitur Starter</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />
                    <span className="font-semibold text-white">Unlimited transaksi, wallet, & kategori</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />
                    <span className="font-semibold text-white">Input foto struk AI OCR (Multi-Item)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />
                    <span className="font-semibold text-white">AI Financial Advisor aktif otomatis</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />
                    <span className="font-semibold text-white">Export PDF & Excel (.xlsx) tak terbatas</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />
                    <span>Reminder custom hingga 2x sehari</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />
                    <span>Prioritas dukungan support</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <Link
                  href="/register"
                  className="w-full py-4 rounded-2xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-bold text-base shadow-xl shadow-brand-500/30 flex items-center justify-center transition-all"
                >
                  Beli Pro Sekarang
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FAQ SECTION (Minimal 7 Pertanyaan) */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-slate-800/60 bg-[#090d16]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-bold tracking-widest text-brand-400 uppercase">Pertanyaan Umum</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              Sering Ditanyakan Seputar TataDana
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'Bagaimana cara menghubungkan Telegram dengan TataDana?',
                a: 'Sangat mudah! Buka menu Settings di aplikasi web TataDana, ikuti panduan singkat menghubungkan token bot via @BotFather, lalu klik "Test Koneksi". Akunmu langsung terhubung dalam 1 menit.',
              },
              {
                q: 'Apakah bisa pakai foto struk di paket Starter?',
                a: 'Fitur ekstraksi foto struk menggunakan AI OCR eksklusif untuk pengguna paket Pro. Pengguna Starter dapat mencatat transaksi lewat teks Telegram dan Voice Note hingga 50 transaksi per bulan.',
              },
              {
                q: 'Bagaimana keamanan data transaksi saya di TataDana?',
                a: 'Data transaksi Anda 100% tersimpan di database Supabase terisolasi dengan Row Level Security (RLS). Kami tidak menjual atau membagikan data keuangan Anda ke pihak ketiga manapun.',
              },
              {
                q: 'Bagaimana AI memahami format nominal rupiah Indonesia?',
                a: 'AI kami dilatih secara spesifik untuk mengenali berbagai bahasa natural sehari-hari di Indonesia, seperti "15rb", "1.5jt", "500k", "dua puluh lima ribu", hingga nama merchant lokal.',
              },
              {
                q: 'Apakah saya bisa membuat beberapa dompet / rekening bank?',
                a: 'Ya, Anda bisa menambahkan rekening BCA, Mandiri, Cash, OVO, GoPay, dan lainnya. Anda juga bisa menentukan satu dompet default untuk transaksi cepat dari Telegram.',
              },
              {
                q: 'Bagaimana cara kerja AI Financial Advisor?',
                a: 'AI Financial Advisor otomatis mendeteksi jika pengeluaran kategori melonjak >50% dari minggu lalu atau melebihi 80% dari batas budget, lalu memberikan saran actionable langsung lewat chat Telegram.',
              },
              {
                q: 'Metode pembayaran apa saja yang didukung?',
                a: 'Kami mendukung pembayaran instan via Midtrans (QRIS, Virtual Account BCA/Mandiri/BRI/BNI, GoPay) serta opsi transfer manual yang disetujui tim admin.',
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left flex items-center justify-between font-bold text-sm sm:text-base text-white hover:text-brand-400 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180 text-brand-400' : ''}`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-sm text-slate-400 leading-relaxed border-t border-slate-800/50 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FINAL CTA SECTION */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#081510] via-[#041c13] to-[#06090e] border-y border-emerald-500/20 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-600/15 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mulai Dalam 60 Detik</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 text-white">
            Mulai Kendalikan Keuanganmu Hari Ini
          </h2>
          <p className="text-base sm:text-lg text-emerald-200/80 max-w-2xl mx-auto mb-8 font-medium">
            Tinggalkan cara lama yang ribet. Cukup kirim chat ke Telegram, dan biarkan TataDana merapikan masa depan finansialmu.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2.5 px-9 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-base hover:from-emerald-400 hover:to-teal-300 shadow-xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all"
          >
            <span>Daftar Gratis Sekarang</span>
            <ArrowRight className="w-5 h-5 text-slate-950" />
          </Link>
        </div>
      </section>

      {/* 10. FOOTER (4 Kolom) */}
      <footer className="bg-[#05080e] border-t border-slate-800/80 py-16 px-4 sm:px-6 lg:px-8 text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Kolom 1: Brand & Tagline */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center text-white font-black text-sm">
                TD
              </div>
              <span className="font-extrabold text-white text-lg tracking-tight">TataDana</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Catat keuangan semudah chat — langsung dari Telegram kamu. Membantu generasi muda Indonesia melek finansial.
            </p>
            <p className="text-xs text-slate-500">© 2026 TataDana Indonesia. Hak Cipta Dilindungi.</p>
          </div>

          {/* Kolom 2: Produk */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Produk</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#fitur" className="hover:text-white transition-colors">
                  Integrasi Telegram Bot
                </a>
              </li>
              <li>
                <a href="#fitur" className="hover:text-white transition-colors">
                  AI OCR Foto Struk
                </a>
              </li>
              <li>
                <a href="#fitur" className="hover:text-white transition-colors">
                  Laporan & Export Excel/PDF
                </a>
              </li>
              <li>
                <a href="#fitur" className="hover:text-white transition-colors">
                  AI Financial Advisor
                </a>
              </li>
            </ul>
          </div>

          {/* Kolom 3: Perusahaan */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Perusahaan</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Tentang Kami
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Karier
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Blog Finansial
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Media Kit
                </a>
              </li>
            </ul>
          </div>

          {/* Kolom 4: Legal & Kontak */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Legal & Dukungan</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Kebijakan Privasi
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Syarat & Ketentuan
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Hubungi Support (@TataDanaCare)
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Status Server
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  )
}
