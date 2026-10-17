'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  CreditCard,
  BarChart3,
  Target,
  Wallet as WalletIcon,
  Settings,
  LogOut,
  Sparkles,
  Bot,
  ShieldCheck,
  Calendar,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SidebarProps {
  userPlan?: 'starter' | 'pro'
  userName?: string
  userPhone?: string
  userAvatar?: string
  avatarType?: 'uploaded' | 'emoji'
  userAvatarType?: 'uploaded' | 'emoji'
  isAdmin?: boolean
  onLogout?: () => void
  isMobileOpen?: boolean
  setIsMobileOpen?: (open: boolean) => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  userPlan = 'starter',
  userName = 'Sobat TataDana',
  userPhone = '',
  userAvatar,
  avatarType,
  userAvatarType,
  isAdmin = false,
  onLogout,
  isMobileOpen = false,
  setIsMobileOpen,
}) => {
  const pathname = usePathname()
  const effectiveAvatarType = avatarType || userAvatarType || (userAvatar?.startsWith('/') || userAvatar?.startsWith('http') || userAvatar?.startsWith('data:') ? 'uploaded' : 'emoji')

  const navItems = [
    { href: '/dashboard', label: 'Beranda', icon: Home },
    { href: '/dashboard/transaksi', label: 'Transaksi', icon: CreditCard },
    { href: '/dashboard/kalender', label: 'Kalender', icon: Calendar },
    { href: '/dashboard/tata-ai', label: 'Tata AI Bot', icon: Bot, badge: 'PRO' },
    { href: '/dashboard/laporan', label: 'Laporan', icon: BarChart3 },
    { href: '/dashboard/budget', label: 'Budget', icon: Target },
    { href: '/dashboard/wallet', label: 'Wallet', icon: WalletIcon },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen?.(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#080d14] border-r border-emerald-900/40 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="p-6 pb-5 flex items-center justify-between border-b border-emerald-950/80">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 group"
              onClick={() => setIsMobileOpen?.(false)}
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/25">
                <span className="font-extrabold text-xl tracking-tighter">TD</span>
              </div>
              <div>
                <span className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                  TataDana
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </span>
                <p className="text-[10px] text-emerald-400/70 font-semibold tracking-wider uppercase">Luxury Fintech ID</p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen?.(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-600/30'
                      : 'text-slate-400 hover:text-emerald-300 hover:bg-emerald-950/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        isActive
                          ? 'bg-emerald-950 text-emerald-200 border border-emerald-400/40'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}

            {isAdmin && (
              <div className="pt-3">
                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-500/60">
                  Superadmin
                </div>
                <Link
                  href="/admin"
                  onClick={() => setIsMobileOpen?.(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    pathname.startsWith('/admin')
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-600/25'
                      : 'text-slate-400 hover:text-emerald-300 hover:bg-emerald-950/30'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Admin Panel</span>
                </Link>
              </div>
            )}
          </nav>
        </div>

        {/* User Card & Plan Section */}
        <div className="p-4 border-t border-emerald-950/80 space-y-3">
          {/* Plan Banner */}
          <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-950/70 to-slate-950 border border-emerald-500/25 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-bold flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-white">
                  {userPlan === 'pro' ? 'Paket Pro Lifetime' : 'Paket Starter'}
                </p>
                <p className="text-[9px] text-emerald-400/80">
                  {userPlan === 'pro' ? 'Fitur luxury aktif' : 'Maks 50 transaksi/bln'}
                </p>
              </div>
            </div>
            {userPlan === 'starter' ? (
              <Link
                href="/dashboard/settings?tab=plan"
                className="text-[10px] font-bold text-emerald-300 hover:text-white bg-emerald-950/80 px-2 py-1 rounded-lg border border-emerald-500/40 shadow-xs"
              >
                Upgrade
              </Link>
            ) : (
              <Badge variant="success" size="sm">
                Active
              </Badge>
            )}
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center justify-between pt-1 px-1">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-slate-800 border border-emerald-500/30 flex items-center justify-center text-slate-200 font-bold text-xs shrink-0 shadow-sm">
                {userAvatar && (effectiveAvatarType === 'uploaded' || userAvatar.startsWith('/') || userAvatar.startsWith('http') || userAvatar.startsWith('data:')) ? (
                  <img
                    src={userAvatar}
                    alt={userName}
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLElement
                      target.style.display = 'none'
                      const fb = target.parentElement?.querySelector('.avatar-fallback') as HTMLElement | null
                      if (fb) fb.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div
                  className={`avatar-fallback w-full h-full flex items-center justify-center text-xs font-bold text-slate-200 ${
                    effectiveAvatarType === 'uploaded' || userAvatar?.startsWith('/') || userAvatar?.startsWith('http') || userAvatar?.startsWith('data:')
                      ? 'hidden'
                      : 'flex'
                  }`}
                >
                  {effectiveAvatarType === 'emoji' && userAvatar ? (
                    <span className="text-base select-none leading-none">{userAvatar}</span>
                  ) : (
                    userName.substring(0, 1).toUpperCase()
                  )}
                </div>
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{userName}</p>
                <p className="text-[10px] text-slate-400 truncate">{userPhone || 'No Telegram'}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Keluar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
