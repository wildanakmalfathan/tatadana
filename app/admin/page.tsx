'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Users,
  Cpu,
  CreditCard,
  FileText,
  Activity,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Clock,
  Radio,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import { formatRupiah } from '@/lib/utils/currency'

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true)
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('tatadana_admin_session') || localStorage.getItem('tatadana_session')
          : ''

      const res = await fetch('/api/admin/metrics', {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
      })
      const json = await res.json()
      if (json.success && json.data) {
        setMetrics(json.data)
      }
    } catch (err) {
      console.error('Fetch admin metrics error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
    // Periodic refresh every 10 seconds for real-time heartbeat monitoring
    const interval = setInterval(fetchMetrics, 10000)
    return () => clearInterval(interval)
  }, [fetchMetrics])

  return (
    <div className="space-y-6 bg-[#06090e] min-h-screen text-slate-100 p-2 sm:p-4 rounded-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#152332]">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            TataDana Command Center
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Pemantauan langsung basis pengguna persisten, heartbeat real-time, status integrasi WhatsApp & Telegram, dan perputaran finansial.
          </p>
        </div>

        <button
          onClick={fetchMetrics}
          className="px-3.5 py-2 rounded-xl bg-[#0a0f16] border border-[#152332] text-slate-300 hover:text-white hover:border-emerald-500/50 transition-all text-xs font-bold flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Primary Real-time Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registered Users */}
        <div className="p-5 rounded-3xl bg-[#0a0f16] border border-[#152332] shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Pengguna</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2">
            {metrics ? metrics.totalUsers : '...'}
          </p>
          <div className="mt-2 pt-2 border-t border-[#152332]/60 flex items-center justify-between text-[11px]">
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {metrics ? metrics.activeUsers : 0} online saat ini
            </span>
            <span className="text-slate-500 font-mono">+{metrics ? metrics.todayUsers : 0} hari ini</span>
          </div>
        </div>

        {/* Pending Approval Queue */}
        <div className="p-5 rounded-3xl bg-[#0a0f16] border border-[#152332] shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Pending Persetujuan</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-400 mt-2">
            {metrics ? metrics.pendingUsers : '...'}
          </p>
          <div className="mt-2 pt-2 border-t border-[#152332]/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Rasio Approved:</span>
            <span className="text-emerald-400 font-bold font-mono">
              {metrics ? `${metrics.approvalRatio}%` : '100%'}
            </span>
          </div>
        </div>

        {/* Real Revenue from Confirmed Transactions */}
        <div className="p-5 rounded-3xl bg-[#0a0f16] border border-[#152332] shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Revenue Real</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-2">
            {metrics ? formatRupiah(metrics.totalRevenue) : 'Rp 0'}
          </p>
          <div className="mt-2 pt-2 border-t border-[#152332]/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">User Pro Aktif:</span>
            <span className="text-emerald-400 font-bold font-mono">
              {metrics ? metrics.proUsers : 0} pengguna
            </span>
          </div>
        </div>

        {/* Heartbeat Status */}
        <div className="p-5 rounded-3xl bg-[#0a0f16] border border-[#152332] shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Heartbeat Liveness</span>
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <p className="text-base font-black text-emerald-400 mt-2 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span>Aktif (60-90s Window)</span>
          </p>
          <div className="mt-2 pt-2 border-t border-[#152332]/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Audit Logs:</span>
            <span className="text-slate-300 font-mono font-bold">
              {metrics ? metrics.auditLogsCount : 0} tercatat
            </span>
          </div>
        </div>
      </div>

      {/* Real External Integration Status Cards (Clause F, G & O) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* WhatsApp Notification Integration Card */}
        <div className="p-5 rounded-3xl bg-[#0a0f16] border border-[#152332] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">Notifikasi WhatsApp Admin</h4>
                <p className="text-[11px] text-slate-400 font-mono">Tujuan: 081460932853</p>
              </div>
            </div>

            <span
              className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                metrics?.whatsapp?.configured
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              {metrics?.whatsapp?.configured ? 'GATEWAY AKTIF' : 'PENDING CREDENTIAL'}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {metrics?.whatsapp?.setupGuide || 'Status notifikasi WhatsApp ke admin 081460932853.'}
          </p>
        </div>

        {/* Telegram Long Polling Integration Card */}
        <div className="p-5 rounded-3xl bg-[#0a0f16] border border-[#152332] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">Telegram Bot Daemon</h4>
                <p className="text-[11px] text-sky-400 font-mono">@danaanananabot</p>
              </div>
            </div>

            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LONG POLLING
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Bot terhubung dalam mode Long Polling lokal (bebas ngrok / webhook conflict). Offset pemrosesan sinkron dengan daemon.
          </p>
        </div>
      </div>

      {/* Quick Navigation Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/users"
          className="p-5 rounded-3xl bg-[#0a0f16] border border-[#152332] hover:border-emerald-500/50 transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <h4 className="text-sm font-bold text-white">Kelola & Persetujuan Pengguna</h4>
          <p className="text-xs text-slate-400">
            Setujui atau tolak antrean pendaftaran pengguna baru, modifikasi paket (Starter/Pro), dan lakukan impersonasi teknis.
          </p>
        </Link>

        <Link
          href="/admin/payments"
          className="p-5 rounded-3xl bg-[#0a0f16] border border-[#152332] hover:border-emerald-500/50 transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors" />
          </div>
          <h4 className="text-sm font-bold text-white">Persetujuan Pembayaran Pro</h4>
          <p className="text-xs text-slate-400">
            Validasi mutasi Midtrans & manual transfer, aktivasi paket Pro instan, dan pencatatan audit log keuangan.
          </p>
        </Link>

        <Link
          href="/admin/audit"
          className="p-5 rounded-3xl bg-[#0a0f16] border border-[#152332] hover:border-emerald-500/50 transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
          </div>
          <h4 className="text-sm font-bold text-white">Audit Log & Keamanan</h4>
          <p className="text-xs text-slate-400">
            Lihat rekaman audit persisten setiap aksi login admin, persetujuan pendaftaran, mutasi saldo, dan penolakan akun.
          </p>
        </Link>
      </div>
    </div>
  )
}
