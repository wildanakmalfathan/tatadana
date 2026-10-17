'use client'

import React from 'react'
import Link from 'next/link'
import { Menu, Plus, Bot, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface HeaderProps {
  onMenuClick: () => void
  onNewTransactionClick: () => void
  telegramConnected?: boolean
  title?: string
  userAvatar?: string
  avatarType?: 'uploaded' | 'emoji'
  userAvatarType?: 'uploaded' | 'emoji'
  userName?: string
}

export const Header: React.FC<HeaderProps> = ({
  onMenuClick,
  onNewTransactionClick,
  telegramConnected = false,
  title = 'Beranda',
  userAvatar,
  avatarType,
  userAvatarType,
  userName = 'User',
}) => {
  const effectiveAvatarType = avatarType || userAvatarType || (userAvatar?.startsWith('/') || userAvatar?.startsWith('http') || userAvatar?.startsWith('data:') ? 'uploaded' : 'emoji')
  return (
    <header className="sticky top-0 z-30 bg-[#06090e]/90 backdrop-blur-md border-b border-emerald-950/80 px-4 lg:px-8 py-3.5 flex items-center justify-between transition-all">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-emerald-950/40 lg:hidden transition-colors"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg lg:text-xl font-black text-white tracking-tight">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Telegram Status Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0a0f16] border border-emerald-500/20 text-xs">
          <Bot className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-400 font-medium">Bot Telegram:</span>
          {telegramConnected ? (
            <span className="flex items-center gap-1 font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Aktif
            </span>
          ) : (
            <span className="flex items-center gap-1 font-bold text-slate-500">
              <span className="w-2 h-2 rounded-full bg-slate-600" />
              Belum Link
            </span>
          )}
        </div>

        {/* Quick Action Button */}
        <Button
          variant="primary"
          size="sm"
          onClick={onNewTransactionClick}
          leftIcon={<Plus className="w-4 h-4" />}
          className="shadow-sm shadow-brand-500/20"
        >
          Catat Transaksi
        </Button>

        {/* User Profile Avatar Link */}
        <Link
          href="/dashboard/settings?tab=profile"
          title="Pengaturan Profil"
          className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-slate-800 border border-emerald-500/40 hover:border-emerald-400 flex items-center justify-center text-slate-200 font-bold text-xs shrink-0 transition-all hover:scale-105 shadow-sm ml-1"
        >
          {userAvatar && (effectiveAvatarType === 'uploaded' || userAvatar.startsWith('/') || userAvatar.startsWith('http') || userAvatar.startsWith('data:')) ? (
            <img
              src={userAvatar}
              alt={userName || 'User'}
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                const target = e.currentTarget as HTMLElement
                target.style.display = 'none'
                const fb = target.parentElement?.querySelector('.header-avatar-fallback') as HTMLElement | null
                if (fb) fb.style.display = 'flex'
              }}
            />
          ) : null}
          <div
            className={`header-avatar-fallback w-full h-full flex items-center justify-center text-xs font-bold text-slate-200 ${
              effectiveAvatarType === 'uploaded' || userAvatar?.startsWith('/') || userAvatar?.startsWith('http') || userAvatar?.startsWith('data:')
                ? 'hidden'
                : 'flex'
            }`}
          >
            {effectiveAvatarType === 'emoji' && userAvatar ? (
              <span className="text-sm sm:text-base leading-none select-none">{userAvatar}</span>
            ) : (
              <span>{(userName || 'U').substring(0, 1).toUpperCase()}</span>
            )}
          </div>
        </Link>
      </div>
    </header>
  )
}
