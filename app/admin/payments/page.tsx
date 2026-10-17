'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  CreditCard,
  Check,
  X,
  Clock,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
} from 'lucide-react'
import { formatRupiah } from '@/lib/utils/currency'

interface AdminPayment {
  id: string
  order_id: string
  user_id: string
  user_name: string
  user_phone: string
  plan: 'starter' | 'pro'
  amount: number
  payment_method: 'midtrans' | 'manual_transfer'
  status: 'pending' | 'approved' | 'rejected' | 'settlement' | 'expire' | 'cancel'
  proof_image_url?: string | null
  approved_by?: string | null
  approved_at?: string | null
  created_at: string
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null)

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (typeof window !== 'undefined') {
      const token =
        localStorage.getItem('tatadana_admin_session') ||
        localStorage.getItem('tatadana_session')
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }
    return headers
  }

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/payments', {
        cache: 'no-store',
        headers: getAuthHeaders(),
      })
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setPayments(json.data)
      }
    } catch (err) {
      console.error('Fetch admin payments error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  const handleApprove = async (id: string, orderId: string) => {
    try {
      setActionLoadingId(id)
      const res = await fetch('/api/admin/payments/approve', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ payment_id: id }),
      })
      const json = await res.json()
      if (json.success) {
        setPayments((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: 'approved', approved_at: new Date().toISOString() } : p))
        )
        showNotification('success', `Pembayaran ${orderId} berhasil di-approve! Akun pengguna telah ditingkatkan ke Pro.`)
      } else {
        showNotification('error', json.message || 'Gagal menyetujui pembayaran.')
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal menyetujui pembayaran.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleReject = async (id: string, orderId: string) => {
    const reason = prompt('Masukkan alasan penolakan pembayaran:', 'Bukti transfer tidak valid atau tidak terbaca')
    if (reason === null) return

    try {
      setActionLoadingId(id)
      const res = await fetch('/api/admin/payments/reject', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ payment_id: id, reason }),
      })
      const json = await res.json()
      if (json.success) {
        setPayments((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: 'rejected' } : p))
        )
        showNotification('success', `Pembayaran ${orderId} telah ditolak.`)
      } else {
        showNotification('error', json.message || 'Gagal menolak pembayaran.')
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal menolak pembayaran.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const filteredPayments = payments.filter((p) => {
    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'approved'
        ? p.status === 'approved' || p.status === 'settlement'
        : p.status === filterStatus

    const matchesSearch =
      p.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.user_phone.includes(searchTerm)

    return matchesStatus && matchesSearch
  })

  const pendingCount = payments.filter((p) => p.status === 'pending').length

  return (
    <div className="space-y-6 bg-[#06090e] min-h-screen text-slate-100 p-2 sm:p-4 rounded-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#064e3b]/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#064e3b]/30 text-[#10b981] border border-[#064e3b]/50">
              <CreditCard className="w-5 h-5 text-[#10b981]" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Persetujuan Pembayaran & Midtrans
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Validasi transfer manual bukti bayar dan monitoring settlement Midtrans gateway untuk aktivasi paket Pro.
          </p>
        </div>

        <button
          onClick={fetchPayments}
          className="p-2.5 rounded-xl bg-[#0a0f16] border border-[#152332] text-slate-400 hover:text-white hover:border-[#10b981]/50 transition-all flex items-center gap-2 text-xs font-bold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#10b981]' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs shadow-xl animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
              : 'bg-rose-950/80 border border-rose-800 text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Filter and Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0a0f16] border border-[#152332] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Transaksi</span>
            <p className="text-xl font-black text-white mt-0.5">{payments.length}</p>
          </div>
          <CreditCard className="w-6 h-6 text-slate-600" />
        </div>

        <div className="p-4 rounded-2xl bg-[#0a0f16] border border-[#152332] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Menunggu Review</span>
            <p className="text-xl font-black text-amber-400 mt-0.5">{pendingCount}</p>
          </div>
          <Clock className="w-6 h-6 text-amber-500/50" />
        </div>

        <div className="p-4 rounded-2xl bg-[#0a0f16] border border-[#152332] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Disetujui / Settlement</span>
            <p className="text-xl font-black text-[#10b981] mt-0.5">
              {payments.filter((p) => p.status === 'approved' || p.status === 'settlement').length}
            </p>
          </div>
          <CheckCircle2 className="w-6 h-6 text-[#10b981]/50" />
        </div>

        <div className="p-4 rounded-2xl bg-[#0a0f16] border border-[#152332] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Ditolak</span>
            <p className="text-xl font-black text-rose-400 mt-0.5">
              {payments.filter((p) => p.status === 'rejected').length}
            </p>
          </div>
          <X className="w-6 h-6 text-rose-500/50" />
        </div>
      </div>

      {/* Search and Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-[#0a0f16] border border-[#152332]">
        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'pending', label: `Pending (${pendingCount})` },
            { id: 'approved', label: 'Disetujui' },
            { id: 'rejected', label: 'Ditolak' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterStatus === tab.id
                  ? 'bg-gradient-to-r from-[#10b981] to-[#059669] text-white shadow-md shadow-[#10b981]/20'
                  : 'text-slate-400 hover:text-white hover:bg-[#152332]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari Order ID, nama, nomor HP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#06090e] border border-[#152332] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#10b981]"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-3xl bg-[#0a0f16] border border-[#152332] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080d14] border-b border-[#152332] text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Order ID & Waktu</th>
                <th className="p-4">Pengguna</th>
                <th className="p-4">Paket & Nominal</th>
                <th className="p-4">Metode Bayar</th>
                <th className="p-4">Bukti Transfer</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Aksi Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#152332]">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Tidak ada transaksi pembayaran yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const isApproved = p.status === 'approved' || p.status === 'settlement'
                  const isPending = p.status === 'pending'
                  const isActionLoading = actionLoadingId === p.id

                  return (
                    <tr key={p.id} className="hover:bg-[#0e1622]/40 transition-colors">
                      <td className="p-4">
                        <p className="font-mono font-bold text-white">{p.order_id}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(p.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          WIB
                        </p>
                      </td>

                      <td className="p-4">
                        <p className="font-bold text-white">{p.user_name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{p.user_phone}</p>
                      </td>

                      <td className="p-4">
                        <span className="font-bold text-white uppercase">{p.plan} Lifetime</span>
                        <p className="text-[#10b981] font-black">{formatRupiah(p.amount)}</p>
                      </td>

                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-md bg-[#080d14] border border-[#152332] text-slate-300 font-mono text-[11px]">
                          {p.payment_method === 'midtrans' ? 'Midtrans QRIS/VA' : 'Manual Transfer Bank'}
                        </span>
                      </td>

                      <td className="p-4">
                        {p.proof_image_url ? (
                          <button
                            onClick={() => setPreviewProofUrl(p.proof_image_url || null)}
                            className="text-[#10b981] hover:text-[#34d399] flex items-center gap-1 font-semibold underline text-[11px]"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Lihat Bukti</span>
                          </button>
                        ) : (
                          <span className="text-slate-600 text-[11px]">-</span>
                        )}
                      </td>

                      <td className="p-4">
                        {isApproved ? (
                          <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-max">
                            <CheckCircle2 className="w-3 h-3" />
                            Disetujui
                          </span>
                        ) : isPending ? (
                          <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-max">
                            <Clock className="w-3 h-3" />
                            Menunggu Review
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1 w-max">
                            <X className="w-3 h-3" />
                            Ditolak
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(p.id, p.order_id)}
                              disabled={isActionLoading}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isActionLoading ? '...' : 'Approve'}</span>
                            </button>
                            <button
                              onClick={() => handleReject(p.id, p.order_id)}
                              disabled={isActionLoading}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/40 font-bold text-xs flex items-center gap-1 disabled:opacity-50 transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px] font-medium">Selesai</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proof Preview Modal */}
      {previewProofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#0a0f16] rounded-3xl p-6 border border-[#064e3b]/60 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#152332]">
              <h3 className="text-sm font-bold text-white">Preview Bukti Transfer</h3>
              <button
                onClick={() => setPreviewProofUrl(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-[#152332] max-h-96 flex items-center justify-center bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewProofUrl}
                alt="Bukti Transfer"
                className="max-h-96 w-auto object-contain"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setPreviewProofUrl(null)}
                className="px-4 py-2 rounded-xl bg-[#152332] text-slate-200 text-xs font-bold hover:bg-[#1e3046]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
