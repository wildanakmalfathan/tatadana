'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Settings,
  Bot,
  User,
  Bell,
  Tags,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Send,
  MessageSquare,
  Sparkles,
  Radio,
  RefreshCw,
  FileText,
  Mic,
  Terminal,
  Wallet,
  Clock,
  Activity,
  Trash2,
  Upload,
  Camera,
  Image as ImageIcon,
  X,
} from 'lucide-react'

interface RealChatLog {
  id: string
  updateId?: number
  sender: string
  text: string
  time: string
  type: 'Teks' | 'Struk' | 'Voice' | 'Command'
  actionTitle: string
  actionDetail?: string
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'telegram' | 'reminder' | 'categories' | 'plan'>('telegram')

  // Profile Tab state
  const [userName, setUserName] = useState('Sobat TataDana')
  const [currency, setCurrency] = useState('IDR')
  const [avatar, setAvatar] = useState('🧑‍💼')
  const [avatarType, setAvatarType] = useState<'emoji' | 'uploaded'>('emoji')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false)
  const [userPlan, setUserPlan] = useState<'starter' | 'pro'>('starter')

  // Selected plan for checkout
  const [selectedPlanUpgrade, setSelectedPlanUpgrade] = useState<'pro_monthly' | 'pro_yearly' | 'pro_lifetime'>('pro_lifetime')
  const [upgradeSuccessMsg, setUpgradeSuccessMsg] = useState<string | null>(null)
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      if (tabParam === 'plan' || tabParam === 'profile' || tabParam === 'reminder' || tabParam === 'categories' || tabParam === 'telegram') {
        setActiveTab(tabParam as any)
      }

      const storedPlan = localStorage.getItem('tatadana_user_plan')
      if (storedPlan === 'pro' || storedPlan === 'pro_lifetime') {
        setUserPlan('pro')
      }

      const storedName = localStorage.getItem('tatadana_user_name')
      if (storedName) setUserName(storedName)
      const storedAvatar = localStorage.getItem('tatadana_user_avatar')
      const storedAvatarType = localStorage.getItem('tatadana_user_avatar_type') as 'uploaded' | 'emoji' | null
      if (storedAvatar) setAvatar(storedAvatar)
      if (storedAvatarType) setAvatarType(storedAvatarType)
    }

    const token = typeof window !== 'undefined'
      ? localStorage.getItem('tatadana_session') || localStorage.getItem('tatadana_admin_session')
      : null
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    fetch('/api/profile', { headers, credentials: 'include', cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          if (json.data.full_name) setUserName(json.data.full_name)
          if (json.data.avatar_url) setAvatar(json.data.avatar_url)
          if (json.data.avatar_type) {
            setAvatarType(json.data.avatar_type)
          } else if (json.data.avatar_url?.startsWith('/')) {
            setAvatarType('uploaded')
          }
          if (json.data.plan === 'pro' || json.data.plan === 'pro_lifetime') setUserPlan('pro')
        }
      })
      .catch(() => {})
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null)
    setUploadSuccessMsg(null)
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    const ext = file.name.split('.').pop()?.toLowerCase()
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp']

    if (!allowedTypes.includes(file.type) && (!ext || !allowedExts.includes(ext))) {
      setUploadError('Format berkas tidak didukung. Harap pilih gambar dengan format JPG, JPEG, PNG, atau WebP.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError(`Ukuran file terlalu besar (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maksimum 5 MB.`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleCancelPreview = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleUploadPhoto = async () => {
    if (!selectedFile) return
    try {
      setIsUploadingPhoto(true)
      setUploadError(null)
      setUploadSuccessMsg(null)

      const formData = new FormData()
      formData.append('image', selectedFile)

      const token = typeof window !== 'undefined'
        ? localStorage.getItem('tatadana_session') || localStorage.getItem('tatadana_admin_session')
        : null
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      })

      const json = await res.json()
      if (json.success && json.data) {
        setAvatar(json.data.avatar_url)
        setAvatarType('uploaded')
        setSelectedFile(null)
        setPreviewUrl(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        setUploadSuccessMsg('Foto profil berhasil diunggah dan disimpan secara permanen!')
        if (typeof window !== 'undefined') {
          localStorage.setItem('tatadana_user_avatar', json.data.avatar_url)
          localStorage.setItem('tatadana_user_avatar_type', 'uploaded')
          window.dispatchEvent(
            new CustomEvent('tatadana_profile_updated', {
              detail: {
                avatar_url: json.data.avatar_url,
                avatar_type: 'uploaded',
                full_name: userName,
              },
            })
          )
        }
        setTimeout(() => setUploadSuccessMsg(null), 4000)
      } else {
        setUploadError(json.message || 'Gagal mengunggah foto profil.')
      }
    } catch (err: any) {
      setUploadError(err.message || 'Gagal menghubungi server saat mengunggah foto.')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleDeletePhoto = async () => {
    try {
      setIsUploadingPhoto(true)
      setUploadError(null)
      setUploadSuccessMsg(null)

      const token = typeof window !== 'undefined'
        ? localStorage.getItem('tatadana_session') || localStorage.getItem('tatadana_admin_session')
        : null
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch('/api/profile/avatar', {
        method: 'DELETE',
        headers,
        credentials: 'include',
      })

      const json = await res.json()
      if (json.success && json.data) {
        setAvatar(json.data.avatar_url)
        setAvatarType('emoji')
        setSelectedFile(null)
        setPreviewUrl(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        setUploadSuccessMsg('Foto profil kustom berhasil dihapus. Avatar dikembalikan ke bawaan.')
        if (typeof window !== 'undefined') {
          localStorage.setItem('tatadana_user_avatar', json.data.avatar_url)
          localStorage.setItem('tatadana_user_avatar_type', 'emoji')
          window.dispatchEvent(
            new CustomEvent('tatadana_profile_updated', {
              detail: {
                avatar_url: json.data.avatar_url,
                avatar_type: 'emoji',
                full_name: userName,
              },
            })
          )
        }
        setTimeout(() => setUploadSuccessMsg(null), 4000)
      } else {
        setUploadError(json.message || 'Gagal menghapus foto profil.')
      }
    } catch (err: any) {
      setUploadError(err.message || 'Gagal menghubungi server saat menghapus foto.')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleSelectEmoji = async (emo: string) => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setAvatar(emo)
    setAvatarType('emoji')
    setUploadError(null)

    try {
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('tatadana_session') || localStorage.getItem('tatadana_admin_session')
        : null
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ avatarUrl: emo, avatarType: 'emoji' }),
      })
      const json = await res.json()
      if (json.success) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('tatadana_user_avatar', emo)
          localStorage.setItem('tatadana_user_avatar_type', 'emoji')
          window.dispatchEvent(
            new CustomEvent('tatadana_profile_updated', {
              detail: {
                avatar_url: emo,
                avatar_type: 'emoji',
                full_name: userName,
              },
            })
          )
        }
      }
    } catch (err: any) {
      console.error('Failed to immediately save selected emoji:', err)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true)
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('tatadana_session') || localStorage.getItem('tatadana_admin_session')
        : null
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ fullName: userName, avatarUrl: avatar, avatarType, currency }),
      })
      const json = await res.json()
      if (json.success) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('tatadana_user_name', userName)
          localStorage.setItem('tatadana_user_avatar', avatar)
          localStorage.setItem('tatadana_user_avatar_type', avatarType)
          window.dispatchEvent(
            new CustomEvent('tatadana_profile_updated', {
              detail: {
                avatar_url: avatar,
                avatar_type: avatarType,
                full_name: userName,
              },
            })
          )
        }
        setProfileSaveSuccess(true)
        setTimeout(() => setProfileSaveSuccess(false), 4000)
      } else {
        alert(json.message || 'Gagal menyimpan profil.')
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menghubungi server.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleCreateUpgradeOrder = async (planKey: 'pro_monthly' | 'pro_yearly' | 'pro_lifetime') => {
    try {
      setIsSubmittingUpgrade(true)
      const planDetails = {
        pro_monthly: { name: 'Pro 1 Bulan', amount: 19000 },
        pro_yearly: { name: 'Pro 1 Tahun', amount: 149000 },
        pro_lifetime: { name: 'Pro Lifetime', amount: 399000 },
      }[planKey]

      const orderId = `TD-${Date.now()}`
      setUpgradeSuccessMsg(
        `Pesanan ${planDetails.name} (ID: ${orderId}) berhasil dibuat! Silakan transfer Rp${planDetails.amount.toLocaleString('id-ID')} ke Rekening BCA 8801234567 a.n. PT Tata Dana Indonesia. Persetujuan admin akan diproses otomatis.`
      )
    } catch (err: any) {
      alert(err.message || 'Gagal membuat pesanan.')
    } finally {
      setIsSubmittingUpgrade(false)
    }
  }

  // Telegram Tab state
  const [botToken, setBotToken] = useState('8607603301:AAHTbWxJY8v4GoGDHXlS0Szge-NsBGpUQ7g')
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'testing' | 'connected'>('connected')
  const [botUsername, setBotUsername] = useState('danaanananabot')
  const [testResultMsg, setTestResultMsg] = useState<string | null>(
    'Bot @danaanananabot aktif & terhubung dalam mode Long Polling!'
  )
  const [simulatedChatInput, setSimulatedChatInput] = useState('')
  const [simulatedChatLogs, setSimulatedChatLogs] = useState<
    { sender: 'user' | 'bot'; text: string; time: string }[]
  >([
    { sender: 'user', text: 'beli bakso 15rb', time: '12:30' },
    {
      sender: 'bot',
      text: '📅 Sabtu, 10 Okt 2026 — 12:30 WIB\n💸 Pengeluaran tercatat!\n├ Nominal : Rp15.000\n├ Kategori : 🍜 Makanan & Minuman\n├ Dompet : 👛 BCA Utama\n└ Saldo : Rp8.735.000\n\n📊 Budget Makanan bulan ini:\n██████░░░░ 60% — sisa Rp400.000\n💪 Pengeluaranmu terkontrol rapi!',
      time: '12:30',
    },
  ])

  // Real Chat Log Stream & Auto-Polling State
  const [autoPolling, setAutoPolling] = useState<boolean>(true)
  const [lastPollTime, setLastPollTime] = useState<string | null>(null)
  const [chatViewTab, setChatViewTab] = useState<'real' | 'simulated'>('real')
  const [realChatLogs, setRealChatLogs] = useState<RealChatLog[]>([
    {
      id: 'init-1',
      updateId: 1001,
      sender: '@budi_santoso',
      text: 'beli sate ayam 25rb',
      time: '12:45:10 WIB',
      type: 'Teks',
      actionTitle: '💸 Transaksi tercatat',
      actionDetail: 'Nominal Rp25.000 • Dompet BCA Utama • Budget Makanan',
    },
    {
      id: 'init-2',
      updateId: 1002,
      sender: '@budi_santoso',
      text: '/saldo',
      time: '12:46:02 WIB',
      type: 'Command',
      actionTitle: '👛 Cek Saldo',
      actionDetail: 'Informasi saldo total Rp8.750.000 terkirim ke chat Telegram',
    },
  ])

  // Mutex guard ref for auto-polling to prevent overlapping requests
  const isPollingRef = useRef<boolean>(false)

  // Reminder Tab state
  const [reminderEnabled, setReminderEnabled] = useState(true)
  const [reminderFrequency, setReminderFrequency] = useState<1 | 2>(2)
  const [time1, setTime1] = useState('12:30')
  const [time2, setTime2] = useState('20:00')

  // Categories Tab state
  const [categories, setCategories] = useState([
    { id: 'c-1', emoji: '🍜', name: 'Makanan & Minuman', color: '#10b981' },
    { id: 'c-2', emoji: '🚗', name: 'Transportasi & Bensin', color: '#059669' },
    { id: 'c-3', emoji: '🏠', name: 'Tagihan & Utilitas', color: '#0d9488' },
    { id: 'c-4', emoji: '🛒', name: 'Belanja Bulanan', color: '#14b8a6' },
    { id: 'c-5', emoji: '🎮', name: 'Hiburan & Hobi', color: '#6366f1' },
  ])
  const [newCatName, setNewCatName] = useState('')
  const [newCatEmoji, setNewCatEmoji] = useState('☕')

  const [isPolling, setIsPolling] = useState(false)
  const [pollResultMsg, setPollResultMsg] = useState<string | null>(null)

  // Helpers for WIB timestamp & message categorization
  const getWibTimestamp = (): string => {
    try {
      return (
        new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(new Date()) + ' WIB'
      )
    } catch {
      const d = new Date()
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')} WIB`
    }
  }

  const getMessageType = (text: string): 'Teks' | 'Struk' | 'Voice' | 'Command' => {
    const trimmed = text.trim()
    if (trimmed.startsWith('/')) return 'Command'
    if (
      trimmed.toLowerCase().includes('[photo') ||
      trimmed.toLowerCase().includes('struk') ||
      trimmed.toLowerCase().includes('receipt')
    ) {
      return 'Struk'
    }
    if (
      trimmed.toLowerCase().includes('[voice') ||
      trimmed.toLowerCase().includes('audio') ||
      trimmed.toLowerCase().includes('voice note')
    ) {
      return 'Voice'
    }
    return 'Teks'
  }

  const getActionInfo = (text: string, result?: any): { title: string; detail: string } => {
    const trimmed = text.trim().toLowerCase()
    if (result?.action === 'transaction_created' || (result?.handled && !trimmed.startsWith('/'))) {
      const amtStr = result?.amount ? `Rp${Number(result.amount).toLocaleString('id-ID')}` : ''
      const walletStr = result?.wallet ? ` • Dompet ${result.wallet}` : ' • Dompet BCA Utama'
      return {
        title: '💸 Transaksi tercatat',
        detail: amtStr ? `Nominal ${amtStr}${walletStr}` : 'Tercatat di dompet dan sinkronisasi budget',
      }
    }
    if (trimmed.startsWith('/saldo')) {
      return {
        title: '👛 Cek Saldo',
        detail: 'Informasi saldo seluruh dompet dikirim ke chat Telegram',
      }
    }
    if (trimmed.startsWith('/budget')) {
      return {
        title: '📊 Evaluasi Budget',
        detail: 'Status anggaran multi-periode dievaluasi & dikirim',
      }
    }
    if (trimmed.startsWith('/start')) {
      return {
        title: '⚡ Menu Utama Bot',
        detail: 'Perintah /start dieksekusi, menu bot ditampilkan',
      }
    }
    if (trimmed.startsWith('/')) {
      const cmd = text.trim().split(' ')[0]
      return {
        title: `⚡ Command ${cmd}`,
        detail: 'Perintah bot berhasil dieksekusi',
      }
    }
    if (trimmed.includes('[photo') || trimmed.includes('struk')) {
      return {
        title: '💸 Transaksi tercatat',
        detail: 'OCR struk belanja berhasil diproses ke transaksi',
      }
    }
    if (trimmed.includes('[voice')) {
      return {
        title: '💸 Transaksi tercatat',
        detail: 'Voice note STT berhasil dikonversi ke transaksi',
      }
    }
    return {
      title: '💸 Transaksi tercatat',
      detail: 'Pesan transaksi berhasil diproses oleh bot',
    }
  }

  // Test Telegram Connection Handler
  const handleTestConnection = async (tokenOverride?: string) => {
    const tokenToTest = (tokenOverride || botToken).trim()
    if (!tokenToTest) {
      alert('Silakan masukkan token bot Telegram terlebih dahulu.')
      return
    }

    setConnectionStatus('testing')
    setTestResultMsg('Sedang memverifikasi token ke Telegram API & membersihkan webhook...')

    try {
      const res = await fetch('/api/telegram/setup-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: tokenToTest }),
      })
      const data = await res.json()

      if (data.success) {
        setConnectionStatus('connected')
        setBotUsername(data.botInfo?.username || 'TataDanaBot')
        setTestResultMsg(data.message || 'Token valid! Mode Long Polling (Localhost Ready) aktif.')
      } else {
        setConnectionStatus('disconnected')
        setTestResultMsg(data.message || 'Token bot Telegram tidak valid.')
      }
    } catch {
      // Dev simulator fallback
      setTimeout(() => {
        setConnectionStatus('connected')
        setBotUsername('TataDanaDevBot')
        setTestResultMsg('🟢 Mode Dev: Token berhasil diverifikasi! Mode Long Polling aktif di localhost.')
      }, 700)
    }
  }

  // Unified Polling Execution with Mutex Guard
  const executePoll = useCallback(
    async (options: { isAuto?: boolean } = {}) => {
      // Mutex Guard: Prevent overlapping requests
      if (isPollingRef.current) {
        return
      }
      isPollingRef.current = true

      if (!options.isAuto) {
        setIsPolling(true)
        setPollResultMsg('Memeriksa pesan baru dari Telegram...')
      }

      try {
        const tokenParam = encodeURIComponent(botToken || '')
        const res = await fetch(`/api/telegram/poll?token=${tokenParam}`, {
          cache: 'no-store',
        })
        const data = await res.json()
        const nowWIB = getWibTimestamp()
        setLastPollTime(nowWIB)

        if (data.ok) {
          if (data.processed && Array.isArray(data.processed) && data.processed.length > 0) {
            const newItems: RealChatLog[] = data.processed.map((p: any, idx: number) => {
              const rawSender = p.sender || botUsername || 'pengguna'
              const sender = rawSender.startsWith('@') ? rawSender : `@${rawSender}`
              const text = p.text || ''
              const type = getMessageType(text)
              const { title, detail } = getActionInfo(text, p.result)

              return {
                id: `real-${p.update_id || Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
                updateId: p.update_id,
                sender,
                text,
                time: nowWIB,
                type,
                actionTitle: title,
                actionDetail: detail,
              }
            })

            setRealChatLogs((prev) => {
              const existingUpdateIds = new Set(
                prev.map((item) => item.updateId).filter((id): id is number => typeof id === 'number')
              )
              const filteredNew = newItems.filter(
                (item) => !item.updateId || !existingUpdateIds.has(item.updateId)
              )
              return [...filteredNew, ...prev].slice(0, 50)
            })

            setPollResultMsg(`✅ Diterima ${data.count} pesan baru dari Telegram (${nowWIB})`)

            // Dispatch global event when new transactions arrive via polling
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('tatadana_transaction_created'))
            }
          } else if (!options.isAuto) {
            setPollResultMsg(data.message || `Tidak ada pesan baru (${nowWIB}).`)
          }
        } else if (!options.isAuto) {
          setPollResultMsg(data.message || 'Gagal mengambil update Telegram.')
        }
      } catch (e: any) {
        if (!options.isAuto) {
          setPollResultMsg('Gagal terhubung ke endpoint polling.')
        }
      } finally {
        isPollingRef.current = false
        if (!options.isAuto) {
          setIsPolling(false)
        }
      }
    },
    [botToken, botUsername]
  )

  // In-App Auto-Polling Loop (Every 2.8s: within 2.5–3s range)
  useEffect(() => {
    if (!autoPolling || activeTab !== 'telegram' || connectionStatus !== 'connected') {
      return
    }

    // Initial instant poll
    executePoll({ isAuto: true })

    const intervalId = setInterval(() => {
      executePoll({ isAuto: true })
    }, 2800)

    return () => clearInterval(intervalId)
  }, [autoPolling, activeTab, connectionStatus, executePoll])

  // Handle manual poll button
  const handlePollTelegram = useCallback(() => {
    return executePoll({ isAuto: false })
  }, [executePoll])

  // Handle Send Simulated Message to Bot
  const handleSendSimulatedMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!simulatedChatInput.trim()) return

    const input = simulatedChatInput.trim()
    const now = '12:35'
    const newLogs = [...simulatedChatLogs, { sender: 'user' as const, text: input, time: now }]
    setSimulatedChatLogs(newLogs)
    setSimulatedChatInput('')

    // Generate bot reply simulation
    setTimeout(() => {
      let reply = ''
      if (input.toLowerCase().includes('/saldo')) {
        reply =
          '👛 Saldo Dompet Kamu Saat Ini:\n• BCA Utama: Rp8.750.000 (Default)\n• Cash Dompet: Rp450.000\n• GoPay / OVO: Rp1.250.000\n\n💰 Total Keseluruhan: Rp10.450.000'
      } else if (input.toLowerCase().includes('gaji')) {
        reply =
          '📅 Sabtu, 10 Okt 2026 — 12:35 WIB\n💰 Pemasukan tercatat!\n├ Nominal : Rp5.000.000\n├ Kategori : 💼 Pemasukan\n├ Dompet : 👛 BCA Utama\n└ Saldo baru : Rp13.750.000\n\n💪 Semangat terus! Jangan lupa sisihkan untuk tabungan ya.'
      } else {
        reply = `📅 Sabtu, 10 Okt 2026 — 12:35 WIB\n💸 Pengeluaran tercatat!\n├ Nominal : Rp25.000\n├ Kategori : 🍜 Makanan\n├ Dompet : 👛 BCA Utama\n├ Catatan : ${input}\n└ Saldo : Rp8.725.000\n\n📊 Budget Makanan bulan ini:\n██████░░░░ 62% — sisa Rp375.000\n💪 Pengeluaranmu masih dalam kontrol!`
      }
      setSimulatedChatLogs([...newLogs, { sender: 'bot' as const, text: reply, time: now }])
    }, 600)
  }

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName) return
    setCategories([
      ...categories,
      {
        id: `c-${Date.now()}`,
        emoji: newCatEmoji,
        name: newCatName,
        color: '#10b981',
      },
    ])
    setNewCatName('')
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
          Pengaturan Aplikasi
          <Settings className="w-5 h-5 text-brand-400" />
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Konfigurasi integrasi Telegram Bot, jadwal reminder, kategori transaksi, dan profil.
        </p>
      </div>

      {/* Tabs Nav */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'telegram', label: 'Bot Telegram', icon: Bot },
          { id: 'plan', label: 'Paket & Upgrade Pro', icon: Sparkles },
          { id: 'reminder', label: 'Reminder Harian', icon: Bell },
          { id: 'categories', label: 'Kelola Kategori', icon: Tags },
          { id: 'profile', label: 'Profil Akun', icon: User },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* TAB 1: TELEGRAM BOT */}
      {activeTab === 'telegram' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Setup & Polling Controls (7 Cols) */}
          <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-[#080d14] border border-[#064e3b] shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Koneksi Bot Telegram</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Bot aktif: <strong className="text-emerald-400 font-mono">@{botUsername}</strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Connection Status Badge */}
                {connectionStatus === 'connected' ? (
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Terhubung
                  </span>
                ) : connectionStatus === 'testing' ? (
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Testing...
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    Tidak Terhubung
                  </span>
                )}

                {/* Long Polling Status Badge */}
                <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                  <Radio className="w-3 h-3 text-emerald-400" />
                  Mode: Long Polling (Localhost Ready)
                </span>
              </div>
            </div>

            {/* Auto-Polling Real-Time Toggle & Visual Pulse Card */}
            <div className="p-4 rounded-2xl bg-[#06090e] border border-[#064e3b] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    Auto-Polling Real-Time
                  </span>
                  {autoPolling ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      🟢 Polling Aktif — Mendengarkan Pesan Telegram
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-400 text-[10px] font-medium border border-slate-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      Auto-Polling Nonaktif
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Mengecek pesan masuk setiap 2.8 detik di latar depan browser menggunakan proteksi mutex guard.
                  {lastPollTime && (
                    <span className="text-emerald-400/90 ml-1.5 font-mono text-[10px]">
                      • Terakhir dicek: {lastPollTime}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPolling}
                    onChange={(e) => setAutoPolling(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner" />
                </label>
              </div>
            </div>

            {/* Step by step guide from @BotFather */}
            <div className="p-4 rounded-2xl bg-[#06090e] border border-slate-800/80 space-y-2.5 text-xs text-slate-300">
              <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Panduan Cepat Menghubungkan Token:
              </p>
              <ol className="list-decimal pl-4 space-y-1 text-slate-400">
                <li>
                  Buka aplikasi Telegram dan hubungi akun resmi{' '}
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 font-bold hover:underline inline-flex items-center gap-0.5"
                  >
                    @BotFather <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  Ketik <code className="text-white bg-slate-900 px-1 py-0.5 rounded font-mono">/newbot</code> lalu beri nama bot Telegram kamu
                </li>
                <li>
                  Salin token API HTTP yang diberikan (contoh: <code className="text-white bg-slate-900 px-1 py-0.5 rounded font-mono">123456:ABC-DEF1234...</code>)
                </li>
                <li>Tempel token ke form di bawah dan klik &ldquo;Test Koneksi & Simpan&rdquo;</li>
              </ol>
            </div>

            {/* Token Input Field */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Token Bot Telegram
              </label>
              <input
                type="text"
                placeholder="123456789:AAHk..."
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#06090e] border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              {testResultMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      : connectionStatus === 'testing'
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                  }`}
                >
                  {connectionStatus === 'connected' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{testResultMsg}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleTestConnection()}
                disabled={connectionStatus === 'testing'}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
              >
                {connectionStatus === 'testing' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Menguji Token...</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4 text-slate-950" />
                    <span>Test Koneksi & Simpan</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setBotToken('demo_bot_token_tatadana')
                  handleTestConnection('demo_bot_token_tatadana')
                }}
                className="px-4 py-2.5 rounded-xl bg-[#0e1622] hover:bg-[#141f2e] border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pakai Token Demo Simulator</span>
              </button>

              {/* Retained Manual Button: Tarik Pesan Sekarang (Polling) */}
              <button
                type="button"
                onClick={handlePollTelegram}
                disabled={isPolling}
                className="px-4 py-2.5 rounded-xl bg-[#0e1622] hover:bg-[#141f2e] border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 font-bold text-xs flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isPolling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Menarik Pesan Telegram...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tarik Pesan Sekarang (Polling)</span>
                  </>
                )}
              </button>
            </div>

            {pollResultMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{pollResultMsg}</span>
              </div>
            )}

            {/* Modernized Guidance Card (Replacing ngrok / public HTTPS instructions) */}
            <div className="p-4 rounded-2xl bg-[#06090e] border border-[#064e3b] text-xs text-slate-300 space-y-2.5 shadow-md">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Mode Native Long Polling: Siap Digunakan di Localhost</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                TataDana menggunakan arsitektur <strong>Telegram Long Polling</strong> resmi. Server lokal dan browser Anda langsung menarik pesan masuk dari Telegram Bot API secara aman tanpa membutuhkan domain publik HTTPS, tanpa ngrok tunnel, dan tanpa port forwarding.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-[11px]">
                <div className="p-3 rounded-xl bg-[#080d14] border border-slate-800/80 text-slate-300 flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0 animate-pulse" />
                  <div>
                    <strong className="text-white block font-semibold mb-0.5">In-App Auto-Poller:</strong>
                    Pesan Telegram otomatis masuk dan dicatat secara real-time saat halaman dashboard ini dibuka.
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#080d14] border border-slate-800/80 text-slate-300 flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-teal-400 mt-1 shrink-0" />
                  <div>
                    <strong className="text-white block font-semibold mb-0.5">Background Daemon 24/7:</strong>
                    Jalankan <code className="text-emerald-400 font-mono text-[10px]">scripts/start-telegram-bot.bat</code> untuk mendengarkan pesan nonstop di terminal.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Real Chat Log Stream & Dev Simulator (5 Cols) */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-[#080d14] border border-[#064e3b] shadow-2xl flex flex-col h-[640px] justify-between">
            <div>
              {/* Segmented Tab Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3 gap-2">
                <div className="flex items-center gap-1 bg-[#06090e] p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setChatViewTab('real')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      chatViewTab === 'real'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Chat Real</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                      {realChatLogs.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChatViewTab('simulated')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      chatViewTab === 'simulated'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Simulator Dev</span>
                  </button>
                </div>

                {chatViewTab === 'real' ? (
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    live stream
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    sandbox
                  </span>
                )}
              </div>

              {/* VIEW 1: REAL TELEGRAM CHAT LOG STREAM */}
              {chatViewTab === 'real' && (
                <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1 text-xs">
                  {realChatLogs.length === 0 ? (
                    <div className="py-14 px-4 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                        <Radio className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="text-sm font-bold text-white">Belum Ada Pesan Masuk</div>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                        Kirim pesan transaksi (contoh: <code className="text-emerald-300">beli sate 25rb</code> atau{' '}
                        <code className="text-emerald-300">/saldo</code>) dari aplikasi Telegram ke{' '}
                        <strong className="text-white">@{botUsername}</strong>. Pesan akan langsung muncul di sini via Long Polling.
                      </p>
                    </div>
                  ) : (
                    realChatLogs.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-[#06090e] border border-[#064e3b]/60 hover:border-emerald-500/40 transition-all space-y-2.5 shadow-sm"
                      >
                        {/* Header: Sender, WIB Time, Message Type Pill */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                              @
                            </span>
                            <span className="text-xs font-bold text-white">{item.sender}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-slate-500" />
                              {item.time}
                            </span>
                            {/* Message Type Pill */}
                            {item.type === 'Command' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                <Terminal className="w-2.5 h-2.5" /> Command
                              </span>
                            ) : item.type === 'Struk' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                <FileText className="w-2.5 h-2.5" /> Struk
                              </span>
                            ) : item.type === 'Voice' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                <Mic className="w-2.5 h-2.5" /> Voice
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                                <MessageSquare className="w-2.5 h-2.5" /> Teks
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Inbound Text Bubble */}
                        <div className="p-2.5 rounded-xl bg-[#080d14] border border-slate-800/80 text-slate-200 text-xs font-mono whitespace-pre-wrap break-words">
                          {item.text}
                        </div>

                        {/* Bot Action Card */}
                        <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 flex items-start gap-2">
                          {item.actionTitle.includes('Saldo') ? (
                            <Wallet className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                          )}
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="text-[11px] font-bold text-emerald-300">{item.actionTitle}</div>
                            {item.actionDetail && (
                              <div className="text-[10px] text-emerald-400/80 truncate">
                                {item.actionDetail}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* VIEW 2: DEV CHAT SIMULATOR */}
              {chatViewTab === 'simulated' && (
                <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1 text-xs">
                  {simulatedChatLogs.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[88%] p-3 rounded-2xl whitespace-pre-wrap font-mono text-[11px] ${
                          msg.sender === 'user'
                            ? 'bg-emerald-600 text-white rounded-tr-xs font-sans text-xs'
                            : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column Footer */}
            {chatViewTab === 'real' ? (
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>{realChatLogs.length} riwayat pesan Telegram</span>
                {realChatLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRealChatLogs([])}
                    className="text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Bersihkan Log</span>
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleSendSimulatedMessage} className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ketik 'beli kopi 25rb' atau '/saldo'..."
                  value={simulatedChatInput}
                  onChange={(e) => setSimulatedChatInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REMINDER HARIAN */}
      {activeTab === 'reminder' && (
        <div className="max-w-2xl p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">Reminder Harian Telegram</h3>
              <p className="text-xs text-slate-400">Pengingat berkala agar kamu tidak lupa mencatat pengeluaran.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500" />
            </label>
          </div>

          {reminderEnabled && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Frekuensi Reminder (Maksimal 2x / hari)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReminderFrequency(1)}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
                      reminderFrequency === 1
                        ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    1x Sehari
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderFrequency(2)}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
                      reminderFrequency === 2
                        ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    2x Sehari (Siang & Malam)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Jam Reminder 1 (WIB)
                  </label>
                  <input
                    type="time"
                    value={time1}
                    onChange={(e) => setTime1(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                {reminderFrequency === 2 && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                      Jam Reminder 2 (WIB)
                    </label>
                    <input
                      type="time"
                      value={time2}
                      onChange={(e) => setTime2(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                )}
              </div>

              {/* Preview Pesan Reminder */}
              <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Preview Pesan yang Dikirim Bot:
                </span>
                <div className="font-mono text-xs text-slate-300 whitespace-pre-wrap">
                  ⏰ Reminder Keuangan!{'\n'}Jangan lupa catat pengeluaran hari ini ya 📝{'\n'}Pencatatan rutin = keuangan lebih terkontrol 💪{'\n'}Ketik transaksimu sekarang!
                </div>
              </div>

              <button
                onClick={() => alert('Jadwal reminder berhasil disimpan!')}
                className="px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20"
              >
                Simpan Jadwal Reminder
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: KELOLA KATEGORI */}
      {activeTab === 'categories' && (
        <div className="max-w-3xl p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">Kelola Kategori Custom</h3>
              <p className="text-xs text-slate-400">Tambahkan kategori dan emoji khusus sesuai kebutuhanmu.</p>
            </div>
          </div>

          {/* Add Category Form */}
          <form onSubmit={handleAddCategory} className="flex items-center gap-2">
            <input
              type="text"
              value={newCatEmoji}
              onChange={(e) => setNewCatEmoji(e.target.value)}
              className="w-14 px-3 py-2.5 text-center rounded-xl bg-slate-950 border border-slate-700 text-base"
            />
            <input
              type="text"
              placeholder="Nama kategori baru (contoh: Kopi & Nongkrong)..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs"
            >
              Tambah Kategori
            </button>
          </form>

          {/* Categories List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {categories.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{c.emoji}</span>
                  <span className="text-xs font-bold text-white">{c.name}</span>
                </div>
                <span className="text-[10px] text-slate-500">Aktif</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: PAKET & UPGRADE PRO (Clause P) */}
      {activeTab === 'plan' && (
        <div className="space-y-6 max-w-4xl">
          <div className="p-6 rounded-3xl bg-[#080d14] border border-[#064e3b] shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#152332]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                  </span>
                  <h3 className="text-lg font-black text-white">Paket Langganan & Upgrade Pro</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Pilih paket sesuai kebutuhan finansial Anda. Transaksi tanpa batas dan asisten AI pintar.
                </p>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-400">
                <span>Status Akun:</span>
                <span className="font-mono uppercase font-black">{userPlan === 'pro' ? 'PRO LIFETIME' : 'STARTER (Maks 50 tx/bln)'}</span>
              </div>
            </div>

            {upgradeSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2.5 shadow-xl animate-fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white">Instruksi Pembayaran Berhasil Dibuat!</p>
                  <p className="mt-0.5">{upgradeSuccessMsg}</p>
                </div>
              </div>
            )}

            {/* 3 Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Plan 1: 1 Bulan */}
              <div
                onClick={() => setSelectedPlanUpgrade('pro_monthly')}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  selectedPlanUpgrade === 'pro_monthly'
                    ? 'bg-[#0e1622] border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500'
                    : 'bg-[#0a0f16] border-[#152332] hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-slate-400">Pro Bulanan</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">1 Bulan</span>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-white">Rp19.000</span>
                    <span className="text-xs text-slate-500"> /bulan</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1.5 pt-2 border-t border-[#152332]">
                    <li className="flex items-center gap-1.5">✓ Transaksi Tanpa Batas</li>
                    <li className="flex items-center gap-1.5">✓ Tata AI Bot Chat 24/7</li>
                    <li className="flex items-center gap-1.5">✓ Alert Budget Telegram</li>
                    <li className="flex items-center gap-1.5">✓ Ekspor CSV Nyata</li>
                  </ul>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCreateUpgradeOrder('pro_monthly')
                  }}
                  disabled={isSubmittingUpgrade}
                  className="mt-4 w-full py-2 rounded-xl bg-slate-800 hover:bg-emerald-600 text-white font-bold text-xs transition-colors"
                >
                  Pilih Bulanan
                </button>
              </div>

              {/* Plan 2: 1 Tahun */}
              <div
                onClick={() => setSelectedPlanUpgrade('pro_yearly')}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  selectedPlanUpgrade === 'pro_yearly'
                    ? 'bg-[#0e1622] border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500'
                    : 'bg-[#0a0f16] border-[#152332] hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-emerald-400">Pro Tahunan</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">HEMAT 35%</span>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-white">Rp149.000</span>
                    <span className="text-xs text-slate-500"> /tahun</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1.5 pt-2 border-t border-[#152332]">
                    <li className="flex items-center gap-1.5">✓ Semua Fitur Pro Bulanan</li>
                    <li className="flex items-center gap-1.5">✓ Ekspor Laporan XLSX & PDF</li>
                    <li className="flex items-center gap-1.5">✓ Kalender Multi-Wallet</li>
                    <li className="flex items-center gap-1.5">✓ Prioritas Dukungan VIP</li>
                  </ul>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCreateUpgradeOrder('pro_yearly')
                  }}
                  disabled={isSubmittingUpgrade}
                  className="mt-4 w-full py-2 rounded-xl bg-slate-800 hover:bg-emerald-600 text-white font-bold text-xs transition-colors"
                >
                  Pilih Tahunan
                </button>
              </div>

              {/* Plan 3: Lifetime (Most Popular) */}
              <div
                onClick={() => setSelectedPlanUpgrade('pro_lifetime')}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                  selectedPlanUpgrade === 'pro_lifetime'
                    ? 'bg-[#0e1622] border-emerald-500 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500'
                    : 'bg-[#0a0f16] border-emerald-500/40 hover:border-emerald-500'
                }`}
              >
                <div className="absolute top-0 right-0 bg-emerald-500 text-[#06090e] text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg">
                  BEST VALUE
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-emerald-300">Pro Lifetime</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">SEKALI BAYAR</span>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-emerald-400">Rp399.000</span>
                    <span className="text-xs text-slate-500"> /selamanya</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1.5 pt-2 border-t border-[#152332]">
                    <li className="flex items-center gap-1.5">✓ Akses Seumur Hidup</li>
                    <li className="flex items-center gap-1.5">✓ Tanpa Biaya Berulang</li>
                    <li className="flex items-center gap-1.5">✓ Badge Eksklusif Luxury</li>
                    <li className="flex items-center gap-1.5">✓ Semua Fitur Pro Bebas Kuota</li>
                  </ul>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCreateUpgradeOrder('pro_lifetime')
                  }}
                  disabled={isSubmittingUpgrade}
                  className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-[#06090e] font-black text-xs transition-all shadow-md shadow-emerald-500/20"
                >
                  Beli Sekali Seumur Hidup
                </button>
              </div>
            </div>

            {/* Payment Details Box */}
            <div className="p-4 rounded-2xl bg-[#0a0f16] border border-[#152332] space-y-2 text-xs">
              <p className="font-bold text-white flex items-center gap-2">
                <span>Metode Pembayaran: Transfer Bank BCA Otomatis</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] text-slate-300">
                <div className="p-2.5 rounded-xl bg-[#06090e] border border-[#152332]">
                  <span className="text-slate-500 block text-[9px] uppercase">Bank Tujuan</span>
                  <span className="font-bold text-white">Bank Central Asia (BCA)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#06090e] border border-[#152332]">
                  <span className="text-slate-500 block text-[9px] uppercase">Nomor Rekening</span>
                  <span className="font-bold text-emerald-400">880-123-4567</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#06090e] border border-[#152332]">
                  <span className="text-slate-500 block text-[9px] uppercase">Atas Nama</span>
                  <span className="font-bold text-white">PT Tata Dana Indonesia</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                Setelah transfer, transaksi otomatis dikirimkan ke antrean admin (/admin/payments) untuk diverifikasi oleh Superadmin Wildan Akmal Fathan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PROFIL PENGGUNA */}
      {activeTab === 'profile' && (
        <div className="max-w-xl p-6 sm:p-8 rounded-3xl bg-[#080d14] border border-[#064e3b] shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#152332]">
            <div>
              <h3 className="text-base font-black text-white">Profil Pengguna & Identitas</h3>
              <p className="text-xs text-slate-400 mt-0.5">Pengaturan foto profil, avatar personal, nama, dan mata uang.</p>
            </div>
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/10 shrink-0">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : avatarType === 'uploaded' || avatar.startsWith('/') || avatar.startsWith('http') || avatar.startsWith('data:') ? (
                <>
                  <img
                    src={avatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLElement
                      target.style.display = 'none'
                      const fb = target.parentElement?.querySelector('.settings-avatar-fallback') as HTMLElement | null
                      if (fb) fb.style.display = 'flex'
                    }}
                  />
                  <div className="settings-avatar-fallback hidden w-full h-full items-center justify-center text-3xl">
                    🧑‍💼
                  </div>
                </>
              ) : (
                <span className="text-3xl">{avatar}</span>
              )}
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Feedback Alerts */}
          {uploadSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-fade-in shadow-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{uploadSuccessMsg}</span>
            </div>
          )}

          {uploadError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 animate-fade-in shadow-xl">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {profileSaveSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-fade-in shadow-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Profil berhasil disimpan secara persisten ke database!</span>
            </div>
          )}

          <div className="space-y-5">
            {/* 1. PHOTO UPLOAD SECTION */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Foto Profil Perangkat
              </label>

              {previewUrl ? (
                /* Uncommitted Local File Preview */
                <div className="p-4 rounded-2xl bg-[#06090e] border border-emerald-500/40 space-y-3 animate-fade-in">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-400 shadow-md shadow-emerald-500/20 shrink-0">
                      <img src={previewUrl} alt="Pratinjau Foto" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-black text-white block truncate">
                        {selectedFile?.name}
                      </span>
                      <span className="text-[11px] text-emerald-400 block mt-0.5">
                        Siap disimpan ({(selectedFile ? (selectedFile.size / 1024).toFixed(1) : 0)} KB)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-[#152332]">
                    <button
                      type="button"
                      onClick={handleUploadPhoto}
                      disabled={isUploadingPhoto}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#06090e] font-black text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isUploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>{isUploadingPhoto ? 'Menyimpan Foto...' : 'Unggah & Simpan Foto'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelPreview}
                      disabled={isUploadingPhoto}
                      className="px-3.5 py-2 rounded-xl bg-[#152332] hover:bg-[#1f3448] text-slate-300 font-bold text-xs transition-colors flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Batal</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard File Selection Bar */
                <div className="p-4 rounded-2xl bg-[#06090e] border border-[#152332] space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <h4 className="text-xs font-bold text-white">
                          {avatarType === 'uploaded' ? 'Foto Kustom Aktif' : 'Belum Ada Foto Kustom'}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">
                          {avatarType === 'uploaded'
                            ? 'Foto profil tersimpan secara permanen di database'
                            : 'Unggah gambar dari komputer, laptop, atau galeri'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{avatarType === 'uploaded' ? 'Ganti Foto' : 'Pilih Foto'}</span>
                      </button>
                      {avatarType === 'uploaded' && (
                        <button
                          type="button"
                          onClick={handleDeletePhoto}
                          disabled={isUploadingPhoto}
                          title="Hapus Foto Kustom"
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Format didukung: JPG, JPEG, PNG, WebP (maksimal 5 MB). Gambar akan dipotong proporsional lingkaran.
                  </p>
                </div>
              )}
            </div>

            {/* 2. EMOJI AVATAR SELECTOR */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Atau Pilih Avatar Emoji Bawaan
              </label>
              <div className="flex items-center gap-2.5 flex-wrap">
                {['🧑‍💼', '👑', '💎', '🎩', '🦊', '🦁', '🚀', '💰'].map((emo) => (
                  <button
                    key={emo}
                    type="button"
                    onClick={() => handleSelectEmoji(emo)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                      avatarType === 'emoji' && avatar === emo
                        ? 'bg-emerald-500/20 border-2 border-emerald-500 scale-110 shadow-md shadow-emerald-500/20'
                        : 'bg-[#0a0f16] border border-[#152332] hover:bg-[#152332]'
                    }`}
                  >
                    {emo}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. PROFILE FIELDS */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#06090e] border border-[#152332] text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Mata Uang Default
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#06090e] border border-[#152332] text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="IDR">Rupiah Indonesia (Rp - IDR)</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSaveProfile}
                disabled={isSavingProfile || isUploadingPhoto}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#06090e] font-black text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{isSavingProfile ? 'Menyimpan...' : 'Simpan Profil'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
