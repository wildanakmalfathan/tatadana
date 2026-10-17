'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  Search,
  Eye,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  UserX,
  Sparkles,
  Clock,
  XCircle,
  Mail,
  Phone,
} from 'lucide-react'
import { AdminUserRecord } from '@/app/api/admin/admin-store'

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<AdminUserRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [search, setSearch] = useState<string>('')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

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

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/users', {
        cache: 'no-store',
        headers: getAuthHeaders(),
      })
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setUsers(json.data)
      }
    } catch (err) {
      console.error('Fetch admin users error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Approve a pending user registration
  const handleApproveUser = async (user: AdminUserRecord) => {
    try {
      setActionLoadingId(user.id)
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_id: user.id, status: 'active' }),
      })
      const json = await res.json()
      if (json.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, status: 'active' } : u))
        )
        showToast(`Pendaftaran ${user.name} BERHASIL DISETUJUI! Pengguna kini dapat login.`)
      } else {
        alert(json.message || 'Gagal menyetujui pendaftaran pengguna.')
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menyetujui pengguna.')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Reject a user registration
  const handleRejectUser = async (user: AdminUserRecord) => {
    const reason = window.prompt(
      `Alasan penolakan pendaftaran untuk ${user.name}:`,
      'Data pendaftaran tidak valid atau tidak memenuhi syarat.'
    )
    if (reason === null) return // user cancelled

    try {
      setActionLoadingId(user.id)
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_id: user.id, status: 'rejected', reason }),
      })
      const json = await res.json()
      if (json.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, status: 'rejected' } : u))
        )
        showToast(`Pendaftaran ${user.name} telah DITOLAK.`)
      } else {
        alert(json.message || 'Gagal menolak pendaftaran pengguna.')
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menolak pengguna.')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Toggle user status (Active <-> Suspended)
  const handleToggleStatus = async (user: AdminUserRecord) => {
    const newStatus: 'active' | 'suspended' = user.status === 'active' ? 'suspended' : 'active'
    try {
      setActionLoadingId(user.id)
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_id: user.id, status: newStatus }),
      })
      const json = await res.json()
      if (json.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
        )
        showToast(`Status akun ${user.name} diubah menjadi ${newStatus === 'active' ? 'Aktif' : 'Suspended'}.`)
      } else {
        alert(json.message || 'Gagal mengubah status pengguna.')
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status pengguna.')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Toggle user plan (Starter <-> Pro)
  const handleTogglePlan = async (user: AdminUserRecord) => {
    const newPlan: 'starter' | 'pro' = user.plan === 'pro' || user.plan === 'pro_lifetime' ? 'starter' : 'pro'
    try {
      setActionLoadingId(user.id)
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_id: user.id, plan: newPlan }),
      })
      const json = await res.json()
      if (json.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, plan: newPlan } : u))
        )
        showToast(`Paket akun ${user.name} berhasil diubah menjadi ${newPlan.toUpperCase()}.`)
      } else {
        alert(json.message || 'Gagal mengubah paket pengguna.')
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah paket pengguna.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleImpersonate = (user: AdminUserRecord) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tatadana_user_id', user.id)
      localStorage.setItem('tatadana_user_name', user.name)
      localStorage.setItem('tatadana_user_phone', user.phone)
      localStorage.setItem('tatadana_user_email', user.email || '')
      localStorage.setItem('tatadana_user_authenticated', 'true')
    }
    router.push('/dashboard')
  }

  const handleExportCSV = () => {
    const headers = ['ID', 'Nama', 'Email', 'Nomor HP', 'Paket', 'Status', 'Role', 'Telegram', 'Tx Bulan Ini', 'Bergabung']
    // Enforce formula injection sanitization on all exported cells
    const sanitize = (val: any) => {
      let str = String(val ?? '').trim()
      if (/^[=+\-@]/.test(str)) {
        str = `'` + str
      }
      return `"${str.replace(/"/g, '""')}"`
    }

    const rows = filteredUsers.map((u) => [
      sanitize(u.id),
      sanitize(u.name),
      sanitize(u.email || '-'),
      sanitize(u.phone),
      sanitize(u.plan),
      sanitize(u.status),
      sanitize(u.role),
      sanitize(u.telegram_username ? `@${u.telegram_username}` : '-'),
      sanitize(u.monthly_tx_count),
      sanitize(u.created_at),
    ])

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `tatadana_users_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Export basis pengguna aman (proteksi formula injection) berhasil diunduh.')
  }

  const pendingUsers = users.filter((u) => u.status === 'pending_approval')

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
      u.phone.includes(search) ||
      (u.telegram_username && u.telegram_username.toLowerCase().includes(search.toLowerCase()))

    const matchesPlan = planFilter === 'all' ? true : u.plan === planFilter
    const matchesStatus = statusFilter === 'all' ? true : u.status === statusFilter

    return matchesSearch && matchesPlan && matchesStatus
  })

  return (
    <div className="space-y-6 bg-[#06090e] min-h-screen text-slate-100 p-2 sm:p-4 rounded-3xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#152332]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Users className="w-5 h-5 text-emerald-400" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Kelola Pengguna TataDana
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Persetujuan pendaftaran baru (Approval Admin), manajemen status akun (Aktif/Ditolak/Suspended), dan pengaturan paket.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchUsers}
            className="p-2.5 rounded-xl bg-[#0a0f16] border border-[#152332] text-slate-400 hover:text-white hover:border-emerald-500/50 transition-all text-xs font-bold"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-[#0a0f16] hover:bg-[#152332] border border-[#152332] text-xs font-bold text-white flex items-center gap-2 transition-all shadow-md"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-fade-in shadow-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* PENDING APPROVAL QUEUE (Clause F) */}
      {pendingUsers.length > 0 && (
        <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-300">
                  Antrean Persetujuan Pendaftaran Akun ({pendingUsers.length})
                </h3>
                <p className="text-[11px] text-amber-200/80">
                  Pengguna baru menunggu keputusan administrator untuk mengaktifkan akun mereka.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
              PENDING APPROVAL
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingUsers.map((user) => {
              const isActionLoading = actionLoadingId === user.id
              return (
                <div
                  key={user.id}
                  className="p-4 rounded-2xl bg-[#0a0f16] border border-amber-500/20 flex flex-col justify-between gap-3 shadow-md"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-white text-sm">{user.name}</p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(user.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 space-y-0.5 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{user.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#152332]">
                    <button
                      onClick={() => handleApproveUser(user)}
                      disabled={isActionLoading}
                      className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#06090e] font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-50"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Setujui (Approve)</span>
                    </button>
                    <button
                      onClick={() => handleRejectUser(user)}
                      disabled={isActionLoading}
                      className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                      <UserX className="w-3.5 h-3.5 text-rose-400" />
                      <span>Tolak</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0a0f16] border border-[#152332]">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total User</span>
          <p className="text-xl font-black text-white mt-0.5">{users.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#0a0f16] border border-[#152332]">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">User Pro</span>
          <p className="text-xl font-black text-emerald-400 mt-0.5">
            {users.filter((u) => u.plan === 'pro' || u.plan === 'pro_lifetime').length}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-[#0a0f16] border border-[#152332]">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Pending Approval</span>
          <p className="text-xl font-black text-amber-400 mt-0.5">
            {pendingUsers.length}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-[#0a0f16] border border-[#152332]">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Suspended / Ditolak</span>
          <p className="text-xl font-black text-rose-400 mt-0.5">
            {users.filter((u) => u.status === 'suspended' || u.status === 'rejected').length}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[#0a0f16] border border-[#152332]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, email, nomor HP, atau @telegram..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#06090e] border border-[#152332] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#06090e] border border-[#152332] text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Semua Paket</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="pro_lifetime">Pro Lifetime</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#06090e] border border-[#152332] text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Semua Status</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="active">Aktif</option>
            <option value="rejected">Ditolak</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl bg-[#0a0f16] border border-[#152332] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080d14] border-b border-[#152332] text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Pengguna</th>
                <th className="p-4">Paket (Switch)</th>
                <th className="p-4">Status Akun</th>
                <th className="p-4">Telegram Bot</th>
                <th className="p-4">Transaksi Bulan Ini</th>
                <th className="p-4">Bergabung</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#152332]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Tidak ditemukan pengguna yang cocok dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isActionLoading = actionLoadingId === u.id
                  const isPro = u.plan === 'pro' || u.plan === 'pro_lifetime'

                  return (
                    <tr key={u.id} className="hover:bg-[#0e1622]/40 transition-colors">
                      {/* Name & Identifiers */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white">{u.name}</p>
                          {u.role === 'admin' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{u.phone}</p>
                      </td>

                      {/* Plan Modifier Toggle */}
                      <td className="p-4">
                        <button
                          onClick={() => handleTogglePlan(u)}
                          disabled={isActionLoading}
                          title="Klik untuk mengubah paket Starter / Pro"
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                            isPro
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>{u.plan}</span>
                          <span className="text-[9px] text-slate-500 underline ml-0.5">ubah</span>
                        </button>
                      </td>

                      {/* Status Badges & Quick Action */}
                      <td className="p-4">
                        {u.status === 'pending_approval' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Pending</span>
                            </span>
                            <button
                              onClick={() => handleApproveUser(u)}
                              disabled={isActionLoading}
                              className="px-2 py-0.5 rounded bg-emerald-500 text-[#06090e] text-[10px] font-black hover:bg-emerald-400"
                              title="Setujui sekarang"
                            >
                              Approve
                            </button>
                          </div>
                        ) : u.status === 'active' ? (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isActionLoading}
                            title="Klik untuk suspend akun"
                            className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all flex items-center gap-1.5"
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>Aktif</span>
                            <span className="text-[9px] text-slate-500 underline ml-0.5">suspend</span>
                          </button>
                        ) : u.status === 'rejected' ? (
                          <button
                            onClick={() => handleApproveUser(u)}
                            disabled={isActionLoading}
                            title="Klik untuk menyetujui akun yang pernah ditolak"
                            className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30 transition-all flex items-center gap-1.5"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Ditolak</span>
                            <span className="text-[9px] text-emerald-400 underline ml-0.5">aktifkan</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isActionLoading}
                            title="Klik untuk mengaktifkan kembali akun"
                            className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 hover:bg-emerald-500/20 hover:text-emerald-300 transition-all flex items-center gap-1.5"
                          >
                            <UserX className="w-3 h-3" />
                            <span>Suspended</span>
                            <span className="text-[9px] text-emerald-400 underline ml-0.5">aktifkan</span>
                          </button>
                        )}
                      </td>

                      {/* Telegram Connection */}
                      <td className="p-4">
                        {u.telegram_connected ? (
                          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>@{u.telegram_username || 'linked'}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">Belum Terhubung</span>
                        )}
                      </td>

                      {/* Monthly Transactions */}
                      <td className="p-4 text-slate-300 font-mono">
                        {u.monthly_tx_count} tx{' '}
                        {u.plan === 'starter' && u.monthly_tx_count >= 50 && (
                          <span className="text-[10px] text-rose-400 font-bold ml-1">(Limit 50)</span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="p-4 text-slate-400">
                        {new Date(u.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Impersonate Action */}
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleImpersonate(u)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-[#06090e] border border-emerald-500/30 text-[11px] font-bold transition-all flex items-center gap-1.5 ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Impersonate</span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
