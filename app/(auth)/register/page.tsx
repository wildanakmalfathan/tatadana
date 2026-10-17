'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  ArrowRight,
  Phone,
  Mail,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  ShieldCheck,
} from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPendingApproval, setIsPendingApproval] = useState(false)
  const [registeredData, setRegisteredData] = useState<any>(null)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!fullName.trim() || !phone.trim() || !email.trim() || !password || !confirmPassword) {
      setErrorMsg('Semua kolom wajib diisi: Nama lengkap, email, nomor HP, kata sandi, dan konfirmasi sandi.')
      return
    }

    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          password,
          confirmPassword,
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        setErrorMsg(json.message || 'Gagal mendaftar. Silakan periksa kembali data Anda.')
        setIsLoading(false)
        return
      }

      // Registration created with status: pending_approval
      setIsPendingApproval(true)
      setRegisteredData(json.data)
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses pendaftaran.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 flex flex-col lg:flex-row font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* KIRI (42%) — Branding Panel (Desktop Only) */}
      <div className="hidden lg:flex lg:w-[42%] bg-gradient-to-br from-[#06140e] via-[#042014] to-[#02130c] border-r border-emerald-500/20 text-white p-12 flex-col justify-between relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        {/* Top Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
              TD
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight flex items-center gap-1.5 text-white">
                TataDana
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </span>
              <p className="text-xs text-emerald-300/80 font-medium tracking-wide">Fintech Personal Assistant</p>
            </div>
          </Link>
        </div>

        {/* Center Tagline & Benefits */}
        <div className="relative z-10 space-y-7 my-auto py-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 backdrop-blur-md border border-emerald-500/30 text-xs font-semibold text-emerald-400">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Manajemen Finansial Terverifikasi & Aman</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Mulai Kelola Finansial Anda dengan Ketepatan Integer Ledger.
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed max-w-md">
              Pencatatan mutasi multi-wallet otomatis, bot asisten Telegram real-time, dan kalkulasi budget akurat berbasis zona waktu WIB.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#080d14]/70 border border-emerald-500/20 backdrop-blur-md space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Persetujuan Administrator Resmi</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Setiap pendaftaran pengguna baru diverifikasi langsung oleh Admin untuk menjaga keamanan data dan integritas transaksi keuangan.
            </p>
          </div>
        </div>

        {/* Bottom Security Note */}
        <div className="relative z-10 text-xs text-slate-400 flex items-center gap-2">
          <span>&copy; {new Date().getFullYear()} TataDana SaaS Indonesia. Hak cipta dilindungi.</span>
        </div>
      </div>

      {/* KANAN (58%) — Form / Approval Notice Panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12 max-w-xl mx-auto w-full">
        <div className="w-full">
          {/* Back link */}
          <div className="mb-6">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors font-semibold"
            >
              <span>&larr; Sudah punya akun? Masuk di sini</span>
            </Link>
          </div>

          {/* SCREEN: PENDING APPROVAL CONFIRMATION (Clause F) */}
          {isPendingApproval ? (
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0a0f16] border border-amber-500/30 shadow-2xl space-y-6 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
                <Clock className="w-8 h-8 text-amber-400" />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Status: PENDING_APPROVAL
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Pendaftaran Berhasil Terkirim!
                </h2>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  Terima kasih, <strong className="text-white">{registeredData?.name || fullName}</strong>. Akun Anda saat ini sedang menunggu persetujuan resmi dari Administrator TataDana.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#06090e] border border-[#152332] text-left text-xs space-y-2 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Email Terdaftar:</span>
                  <span className="text-white font-bold">{registeredData?.email || email}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Nomor WhatsApp:</span>
                  <span className="text-white font-bold">{registeredData?.phone || phone}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tujuan Notifikasi:</span>
                  <span className="text-emerald-400 font-bold">Admin (081460932853)</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-left text-xs text-emerald-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Notifikasi WhatsApp Telah Diteruskan</span>
                </p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Administrator telah menerima rincian pendaftaran Anda. Setelah disetujui, akun Anda akan aktif dan siap digunakan untuk masuk.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/login"
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
                >
                  <span>Kembali ke Halaman Login</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* REGISTRATION FORM */}
              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Buat Akun TataDana
                </h2>
                <p className="text-xs text-slate-400 mt-1.5">
                  Daftarkan diri Anda untuk mulai mencatat keuangan pribadi dengan akurat.
                </p>
              </div>

              {/* Error Box */}
              {errorMsg && (
                <div className="mb-5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs sm:text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <p className="font-semibold">Pendaftaran Belum Lengkap</p>
                    <p className="mt-0.5">{errorMsg}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                {/* Nama Lengkap */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Wildan Akmal Fathan"
                      className="w-full pl-11 pr-4 py-2.5 bg-[#0e1622] border border-slate-800 rounded-xl text-white text-sm font-medium focus:bg-[#121c2b] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>

                {/* Nomor HP / WhatsApp */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Nomor WhatsApp / HP (E.164)
                  </label>
                  <div className="relative">
                    <Phone className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="081460932853 atau 08123456789"
                      className="w-full pl-11 pr-4 py-2.5 bg-[#0e1622] border border-slate-800 rounded-xl text-white text-sm font-medium focus:bg-[#121c2b] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Alamat Email (Tunggal & Unik)
                  </label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contoh@gmail.com"
                      className="w-full pl-11 pr-4 py-2.5 bg-[#0e1622] border border-slate-800 rounded-xl text-white text-sm font-medium focus:bg-[#121c2b] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full pl-11 pr-4 py-2.5 bg-[#0e1622] border border-slate-800 rounded-xl text-white text-sm font-medium focus:bg-[#121c2b] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>

                {/* Konfirmasi Password (Clause D1) */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Konfirmasi Kata Sandi
                  </label>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang kata sandi"
                      className="w-full pl-11 pr-4 py-2.5 bg-[#0e1622] border border-slate-800 rounded-xl text-white text-sm font-medium focus:bg-[#121c2b] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-4 py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  {isLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin text-slate-950" />
                  ) : (
                    <>
                      <span>Daftar Akun Baru</span>
                      <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-6 border-t border-slate-800/80 text-center text-xs text-slate-500 mt-6">
                Setelah mendaftar, akun Anda akan diverifikasi oleh Admin demi keamanan data keuangan Anda.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
