'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ShieldCheck,
  Cpu,
  Users,
  CreditCard,
  FileText,
  Activity,
  Eye,
  LogOut,
} from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(pathname !== '/admin/login')

  useEffect(() => {
    if (pathname === '/admin/login') {
      setCheckingAuth(false)
      return
    }

    let isMounted = true

    const verifyAdmin = async () => {
      try {
        const token =
          localStorage.getItem('tatadana_admin_session') ||
          localStorage.getItem('tatadana_session')

        if (!token) {
          throw new Error('No admin token found')
        }

        // Validate token payload claims client-side before calling server
        try {
          const parts = token.split('.')
          if (parts.length === 3) {
            const base64Url = parts[1]
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
            const jsonPayload = JSON.parse(decodeURIComponent(escape(atob(base64))))
            if (
              jsonPayload.role !== 'admin' ||
              jsonPayload.email?.toLowerCase() !== 'wildanakmalfathan@gmail.com'
            ) {
              throw new Error('Invalid token claims: non-admin token')
            }
          }
        } catch (claimsErr: any) {
          throw new Error(`Token claims validation failed: ${claimsErr.message}`)
        }

        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
        }

        const res = await fetch('/api/auth/verify-admin', {
          headers,
          credentials: 'include',
        })

        if (!res.ok) {
          throw new Error('Unauthorized by server')
        }

        const data = await res.json()
        if (data.success && data.authorized && isMounted) {
          setCheckingAuth(false)
        } else {
          throw new Error('Forbidden by server')
        }
      } catch {
        if (isMounted) {
          router.replace('/admin/login')
        }
      }
    }

    verifyAdmin()

    return () => {
      isMounted = false
    }
  }, [pathname, router])

  // If on login route, render standalone login screen without admin chrome
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tatadana_admin_session')
      localStorage.removeItem('tatadana_session')
      localStorage.removeItem('tatadana_user_role')
      localStorage.removeItem('tatadana_admin_user')
    }
    router.push('/admin/login')
  }

  const navs = [
    { href: '/admin', label: 'Command Center', icon: Activity },
    { href: '/admin/users', label: 'Kelola Pengguna', icon: Users },
    { href: '/admin/payments', label: 'Persetujuan Pembayaran', icon: CreditCard },
    { href: '/admin/ai', label: 'AI Provider Manager', icon: Cpu },
    { href: '/admin/ai-logs', label: 'Log AI & Token', icon: FileText },
    { href: '/admin/audit', label: 'Audit Log Keamanan', icon: ShieldCheck },
  ]

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#06090e] flex items-center justify-center text-emerald-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-slate-400">Memverifikasi Otorisasi Superadmin...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Admin Superbar */}
      <header className="sticky top-0 z-50 bg-[#0a0f16]/95 backdrop-blur-md border-b border-[#152332] px-6 py-3.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-[#06090e] flex items-center justify-center font-black text-sm shadow-md shadow-emerald-500/30">
              TD
            </div>
            <div>
              <div className="text-sm font-black text-white flex items-center gap-2">
                <span>TataDana Command Center</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-bold tracking-wide">
                  SUPERADMIN
                </span>
              </div>
              <p className="text-[11px] text-emerald-400/90 font-medium">
                Administrator: <span className="text-white font-semibold">Wildan Akmal Fathan</span>
                <span className="text-slate-500 text-[10px] ml-1.5 font-mono">(081460932853)</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View User Dashboard Button */}
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-xl bg-[#0e1622] hover:bg-[#152332] border border-[#152332] text-xs font-bold text-emerald-300 hover:text-white flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>Lihat Dashboard User</span>
          </Link>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            title="Keluar dari Portal Admin"
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-bold text-rose-300 hover:text-white flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        {/* Admin Navigation Sidebar */}
        <aside className="w-60 hidden md:block shrink-0 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
            Menu Superadmin
          </div>
          {navs.map((n) => {
            const Icon = n.icon
            const isActive = pathname === n.href
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-[#06090e] shadow-md shadow-emerald-500/20 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-[#0a0f16] border border-transparent hover:border-[#152332]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{n.label}</span>
              </Link>
            )
          })}
        </aside>

        {/* Admin Main Body */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
