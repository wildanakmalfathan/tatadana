'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  KeyRound,
  CheckCircle2,
} from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('wildanakmalfathan@gmail.com')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!email || !password) {
      setError('Email administrator dan kata sandi wajib diisi.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        setError(json.message || 'Kredensial administrator tidak valid atau akses ditolak.')
        return
      }

      setSuccess('Autentikasi Administrator Berhasil! Mengalihkan ke Command Center...')

      if (typeof window !== 'undefined' && json.token) {
        localStorage.setItem('tatadana_admin_session', json.token)
        localStorage.setItem('tatadana_session', json.token)
        localStorage.setItem('tatadana_user_role', 'admin')
        localStorage.setItem('tatadana_admin_user', JSON.stringify(json.user))
      }

      setTimeout(() => {
        router.push('/admin')
      }, 700)
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan jaringan saat menghubungi server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden selection:bg-emerald-500 selection:text-black">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-20 right-10 w-80 h-80 bg-teal-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md z-10 space-y-8">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-xl shadow-emerald-500/20 border border-emerald-400/40 mb-2">
            <ShieldCheck className="w-7 h-7 text-[#06090e]" />
          </div>

          <div className="inline-block">
            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Dedicated Command Center
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Admin Portal Login
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Akses khusus Administrator Utama TataDana. Memerlukan identitas terverifikasi dan hak akses penuh.
          </p>
        </div>

        {/* Card Box */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0a0f16]/90 border border-[#152332] shadow-2xl backdrop-blur-xl relative">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3 animate-shake">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Admin Email Field */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span>Email Administrator</span>
                <span className="text-[10px] text-emerald-400 font-mono">wildanakmalfathan@gmail.com</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="wildanakmalfathan@gmail.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#06090e] border border-[#152332] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Admin Password Field */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span>Kata Sandi Master</span>
                <span className="text-[10px] text-slate-500">Kriptografi scrypt</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-[#06090e] border border-[#152332] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-500 hover:text-slate-300 absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-[#06090e] font-black text-xs tracking-wider uppercase transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#06090e] border-t-transparent rounded-full animate-spin" />
                  <span>Memverifikasi Akses...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Masuk ke Command Center</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Separation Notice */}
          <div className="mt-6 pt-6 border-t border-[#152332]/80 text-center space-y-3">
            <p className="text-[11px] text-slate-500">
              Bukan Administrator? Kembali ke portal pengguna reguler:
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <span>Login Pengguna Reguler</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Security Badge Footer */}
        <div className="text-center text-[10px] text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/70" />
          <span>TataDana Security Guard • Token HMAC-SHA256 • Enkripsi Sesi Aktif</span>
        </div>
      </div>
    </div>
  )
}
