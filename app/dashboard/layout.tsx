'use client'

import React, { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { CreateTransactionModal } from '@/components/transactions/create-transaction-modal'
import { FloatingAIWidget } from '@/components/ai/floating-ai-widget'
import { Wallet, Category } from '@/types/database'
import { useRouter } from 'next/navigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // User state
  const [userPlan, setUserPlan] = useState<'starter' | 'pro'>('pro')
  const [userName, setUserName] = useState('Sobat TataDana')
  const [userPhone, setUserPhone] = useState('+628123456789')
  const [userAvatar, setUserAvatar] = useState<string>('🧑‍💼')
  const [userAvatarType, setUserAvatarType] = useState<'uploaded' | 'emoji'>('emoji')
  const [telegramConnected, setTelegramConnected] = useState(true)

  // Initial wallets state starts empty
  const [wallets, setWallets] = useState<Wallet[]>([])

  const [categories, setCategories] = useState<Category[]>([
    {
      id: 'c-1',
      user_id: 'u-1',
      name: 'Makanan & Minuman',
      type: 'expense',
      emoji: '🍜',
      color: '#f97316',
      budget_amount: 2500000,
      is_system: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'c-2',
      user_id: 'u-1',
      name: 'Transportasi & Bensin',
      type: 'expense',
      emoji: '🚗',
      color: '#3b82f6',
      budget_amount: 1000000,
      is_system: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'c-3',
      user_id: 'u-1',
      name: 'Tagihan & Utilitas',
      type: 'expense',
      emoji: '🏠',
      color: '#8b5cf6',
      budget_amount: 2000000,
      is_system: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'c-4',
      user_id: 'u-1',
      name: 'Hiburan & Hobi',
      type: 'expense',
      emoji: '🎮',
      color: '#ec4899',
      budget_amount: 800000,
      is_system: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'c-5',
      user_id: 'u-1',
      name: 'Belanja Bulanan',
      type: 'expense',
      emoji: '🛒',
      color: '#10b981',
      budget_amount: 1500000,
      is_system: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'c-6',
      user_id: 'u-1',
      name: 'Gaji Pokok',
      type: 'income',
      emoji: '💰',
      color: '#10b981',
      budget_amount: 0,
      is_system: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'c-7',
      user_id: 'u-1',
      name: 'Bonus & Side Project',
      type: 'income',
      emoji: '✨',
      color: '#f59e0b',
      budget_amount: 0,
      is_system: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ])

  const [isAdmin, setIsAdmin] = useState(false)

  const fetchWalletsAndCategories = async () => {
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('tatadana_session') || localStorage.getItem('tatadana_admin_session')
          : null
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const [wRes, cRes] = await Promise.all([
        fetch('/api/wallets', { headers, credentials: 'include', cache: 'no-store' }),
        fetch('/api/categories', { headers, credentials: 'include', cache: 'no-store' }),
      ])
      if (wRes.ok) {
        const wData = await wRes.json()
        if (wData.success && Array.isArray(wData.data)) {
          setWallets(wData.data)
        }
      }
      if (cRes.ok) {
        const cData = await cRes.json()
        if (cData.success && Array.isArray(cData.data)) {
          setCategories(cData.data)
        }
      }
    } catch (err) {
      console.error('Failed to load wallets or categories:', err)
    }
  }

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token =
          typeof window !== 'undefined'
            ? localStorage.getItem('tatadana_session') || localStorage.getItem('tatadana_admin_session')
            : null
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`

        const res = await fetch('/api/profile', { headers, credentials: 'include', cache: 'no-store' })
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.data) {
            if (json.data.full_name) setUserName(json.data.full_name)
            if (json.data.phone_number) setUserPhone(json.data.phone_number)
            if (json.data.avatar_url) setUserAvatar(json.data.avatar_url)
            if (json.data.avatar_type) {
              setUserAvatarType(json.data.avatar_type)
            } else if (json.data.avatar_url?.startsWith('/')) {
              setUserAvatarType('uploaded')
            }
          }
        }
      } catch {}
    }

    if (typeof window !== 'undefined') {
      const isAuth =
        localStorage.getItem('tatadana_user_authenticated') === 'true' ||
        !!localStorage.getItem('tatadana_session') ||
        !!localStorage.getItem('tatadana_user_id')

      if (!isAuth) {
        router.replace('/login')
        return
      }

      const storedName = localStorage.getItem('tatadana_user_name')
      const storedPhone = localStorage.getItem('tatadana_user_phone')
      const storedPlan = localStorage.getItem('tatadana_user_plan')
      // Note: tatadana_user_role in localStorage is untrusted client data and strictly IGNORED.
      // Admin privileges are determined exclusively via cryptographic server-side verification (/api/auth/verify-admin).

      if (storedName) setUserName(storedName)
      if (storedPhone) setUserPhone(storedPhone)
      if (storedPlan === 'pro' || storedPlan === 'pro_lifetime') setUserPlan('pro')

      const storedAvatar = localStorage.getItem('tatadana_user_avatar')
      const storedAvatarType = localStorage.getItem('tatadana_user_avatar_type') as 'uploaded' | 'emoji' | null
      if (storedAvatar) setUserAvatar(storedAvatar)
      if (storedAvatarType) setUserAvatarType(storedAvatarType)

      fetchProfile()

      // Server-side verification for genuine admin privileges (Zero-Trust)
      const verifyAdminRole = async () => {
        try {
          const token =
            localStorage.getItem('tatadana_admin_session') ||
            localStorage.getItem('tatadana_session')
          if (!token) {
            setIsAdmin(false)
            return
          }

          // Pre-check token claims: Must be official admin email and role
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
                setIsAdmin(false)
                return
              }
            }
          } catch {
            // If token cannot be decoded, let the server-side guard reject it
          }

          const headers: Record<string, string> = {
            Authorization: `Bearer ${token}`,
          }

          const res = await fetch('/api/auth/verify-admin', {
            headers,
            credentials: 'include',
          })
          if (res.ok) {
            const data = await res.json()
            if (data.success && data.authorized) {
              setIsAdmin(true)
              return
            }
          }
          setIsAdmin(false)
        } catch {
          setIsAdmin(false)
        }
      }
      verifyAdminRole()
    }

    fetchWalletsAndCategories()

    const handleRefresh = () => {
      fetchWalletsAndCategories()
    }

    window.addEventListener('tatadana_transaction_created', handleRefresh)
    window.addEventListener('tatadana_wallet_created', handleRefresh)

    const handleProfileUpdate = (e: any) => {
      if (e?.detail) {
        if (e.detail.avatar_url) setUserAvatar(e.detail.avatar_url)
        if (e.detail.avatar_type) setUserAvatarType(e.detail.avatar_type)
        if (e.detail.full_name) setUserName(e.detail.full_name)
      } else {
        fetchProfile()
      }
    }
    window.addEventListener('tatadana_profile_updated', handleProfileUpdate)

    return () => {
      window.removeEventListener('tatadana_transaction_created', handleRefresh)
      window.removeEventListener('tatadana_wallet_created', handleRefresh)
      window.removeEventListener('tatadana_profile_updated', handleProfileUpdate)
    }
  }, [router])

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tatadana_user_authenticated')
      localStorage.removeItem('tatadana_session')
      localStorage.removeItem('tatadana_user_id')
      localStorage.removeItem('tatadana_user_name')
      localStorage.removeItem('tatadana_user_avatar')
      localStorage.removeItem('tatadana_user_avatar_type')
      localStorage.removeItem('tatadana_user_role')
      localStorage.removeItem('tatadana_user_plan')
    }
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        userPlan={userPlan}
        userName={userName}
        userPhone={userPhone}
        userAvatar={userAvatar}
        avatarType={userAvatarType}
        userAvatarType={userAvatarType}
        isAdmin={isAdmin}
        onLogout={handleLogout}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0 transition-all">
        <Header
          onMenuClick={() => setIsMobileOpen(true)}
          onNewTransactionClick={() => setIsModalOpen(true)}
          telegramConnected={telegramConnected}
          title="Dashboard TataDana"
          userAvatar={userAvatar}
          avatarType={userAvatarType}
          userAvatarType={userAvatarType}
          userName={userName}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>

      {/* Floating AI Assistant Widget */}
      <FloatingAIWidget />

      {/* Transaction Modal */}
      <CreateTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          // Trigger refresh event
          window.dispatchEvent(new CustomEvent('tatadana_transaction_created'))
        }}
        wallets={wallets}
        categories={categories}
      />
    </div>
  )
}
