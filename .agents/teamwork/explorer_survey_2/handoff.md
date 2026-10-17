# Handoff Report — Frontend & Layout Investigation

**Agent**: `explorer_survey_2` (Frontend & Layout Explorer)  
**Date**: 2026-10-17T12:35:45Z  
**Target Milestone**: Real & Persistent Profile Photo Upload with Multi-Format Support, Storage Persistence, Global Layout Synchronization, and Preserved Built-in Avatars  
**Working Directory**: `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_survey_2\`

---

## 1. Observation

### A. `app/dashboard/settings/page.tsx`
- **File Structure & Navigation**:
  - Contains tab navigation at lines 663–689: `'telegram'`, `'plan'`, `'reminder'`, `'categories'`, and `'profile'`.
  - Active tab is driven by URL query parameter `?tab=profile` (parsed in `useEffect` at lines 68–72) or user click (`setActiveTab('profile')`).
- **Profile Tab State**:
  - Profile state is defined at lines 47–58:
    ```tsx
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
    ```
- **Data Hydration**:
  - `useEffect` (lines 80–95) fetches `GET /api/profile` (`cache: 'no-store'`) and extracts `full_name`, `avatar_url`, and `avatar_type`:
    ```tsx
    if (json.data.full_name) setUserName(json.data.full_name)
    if (json.data.avatar_url) setAvatar(json.data.avatar_url)
    if (json.data.avatar_type) {
      setAvatarType(json.data.avatar_type)
    } else if (json.data.avatar_url?.startsWith('/')) {
      setAvatarType('uploaded')
    }
    ```
- **File Selection & Validation**:
  - Hidden native file input at lines 1471–1477:
    ```tsx
    <input
      type="file"
      ref={fileInputRef}
      accept="image/jpeg,image/png,image/webp"
      className="hidden"
      onChange={handleFileSelect}
    />
    ```
  - `handleFileSelect` at lines 97–126 validates allowed MIME types (`['image/jpeg', 'image/png', 'image/webp']`) and extensions (`['jpg', 'jpeg', 'png', 'webp']`), and rejects files exceeding 5MB (`5 * 1024 * 1024` bytes) with clear inline error messages. If valid, generates a local DataURL preview via `FileReader`.
- **Circular 1:1 Preview & Action Controls**:
  - When `previewUrl` is present (uncommitted file state, lines 1508–1544):
    - Circular 1:1 preview container: `w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-400 shadow-md shadow-emerald-500/20 shrink-0` rendering `<img src={previewUrl} alt="Pratinjau Foto" className="w-full h-full object-cover" />`.
    - Displays selected filename and size in KB.
    - Button **"Unggah & Simpan Foto"**: triggers `handleUploadPhoto` (lines 135–189). Displays `<Loader2 className="w-3.5 h-3.5 animate-spin" />` and disables button when `isUploadingPhoto === true`.
    - Button **"Batal"**: triggers `handleCancelPreview` (lines 128–134), resetting `selectedFile`, `previewUrl`, and clearing `fileInputRef.current.value`.
  - When no `previewUrl` is selected (lines 1546–1591):
    - Displays status indicator: `"Foto Kustom Aktif"` (when `avatarType === 'uploaded'`) vs `"Belum Ada Foto Kustom"`.
    - Button **"Pilih Foto"** / **"Ganti Foto"**: triggers `fileInputRef.current?.click()`.
    - Button **"Hapus Foto"** (Trash2 icon): only rendered when `avatarType === 'uploaded'`, triggers `handleDeletePhoto` (`DELETE /api/profile/avatar`, lines 190–238).
- **Emoji Picker & Dual-Mode Switching**:
  - Lines 1595–1615 render the 8 built-in emojis: `['🧑‍💼', '👑', '💎', '🎩', '🦊', '🦁', '🚀', '💰']`.
  - Highlight ring active when `avatarType === 'emoji' && avatar === emo`.
  - Clicking triggers `handleSelectEmoji(emo)` (lines 240–245), setting `avatar(emo)` and `avatarType('emoji')`.
- **Top Card Avatar Badge**:
  - Lines 1451–1467 render the current avatar:
    - If `previewUrl` -> `<img src={previewUrl} ... />`
    - Else if `avatarType === 'uploaded' || avatar.startsWith('/')` -> `<img src={avatar} ... />`
    - Else -> `<span className="text-3xl">{avatar}</span>`
- **Feedback & Notifications**:
  - Success banner (lines 1480–1485): `uploadSuccessMsg` with `CheckCircle2` in `bg-emerald-500/20 border-emerald-500/40 text-emerald-200`.
  - Error banner (lines 1487–1492): `uploadError` with `AlertCircle` in `bg-rose-500/20 border-rose-500/40 text-rose-200`.
  - Profile save banner (lines 1494–1499): `profileSaveSuccess`.
  - Dispatches `CustomEvent('tatadana_profile_updated', { detail: { avatar_url, avatar_type, full_name } })` on successful upload, delete, and profile save.

---

### B. `components/layout/sidebar.tsx`
- **Current `SidebarProps` Interface** (lines 21–29):
  ```tsx
  interface SidebarProps {
    userPlan?: 'starter' | 'pro'
    userName?: string
    userPhone?: string
    isAdmin?: boolean
    onLogout?: () => void
    isMobileOpen?: boolean
    setIsMobileOpen?: (open: boolean) => void
  }
  ```
- **Observed Gap**:
  - `userAvatar` and `avatarType` props are completely absent.
- **Bottom User Info Card** (lines 186–196):
  ```tsx
  <div className="flex items-center gap-2.5 overflow-hidden">
    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-bold text-xs shrink-0">
      {userName.substring(0, 1).toUpperCase()}
    </div>
    <div className="truncate">
      <p className="text-xs font-bold text-white truncate">{userName}</p>
      <p className="text-[10px] text-slate-400 truncate">{userPhone || 'No Telegram'}</p>
    </div>
  </div>
  ```
- **Observed Gap**:
  - Hardcoded to show only the first letter of `userName`.
  - Does NOT display uploaded avatar image (`<img ... />`).
  - Does NOT display chosen emoji avatar.
  - Lacks image error fallback handling (`onError`).

---

### C. `components/layout/header.tsx`
- **Current `HeaderProps` Interface** (lines 8–13):
  ```tsx
  interface HeaderProps {
    onMenuClick: () => void
    onNewTransactionClick: () => void
    telegramConnected?: boolean
    title?: string
  }
  ```
- **Observed Gap**:
  - `userAvatar`, `avatarType`, and `userName` props are missing.
- **Header Actions Section** (lines 36–64):
  - Only contains the Telegram status badge and the "Catat Transaksi" button.
  - Does NOT render any user avatar profile shortcut link.
  - Violates Requirement R4: *"Tampilkan avatar pengguna (foto/emoji) di bar kanan header sebagai shortcut visual profil akun."*

---

### D. `app/dashboard/layout.tsx`
- **State Definition** (lines 20–25):
  - Contains `userPlan`, `userName`, `userPhone`, `telegramConnected`, `wallets`, `categories`, `isAdmin`.
  - **Observed Gap**: No state for `userAvatar` or `avatarType`.
- **Initialization & Hydration** (lines 185–206):
  - Reads `tatadana_user_name`, `tatadana_user_phone`, and `tatadana_user_plan` from `localStorage`.
  - **Observed Gap**: Does NOT read `tatadana_user_avatar` or `tatadana_user_avatar_type` from `localStorage`.
  - Does NOT fetch `/api/profile` to get fresh profile data.
- **Event Listeners** (lines 260–273):
  - Listens only to `tatadana_transaction_created` and `tatadana_wallet_created`.
  - **Observed Gap**: Does NOT listen to `tatadana_profile_updated`. Changes in settings do NOT propagate to the layout without a manual page refresh.
- **Component Prop Passing** (lines 289–307):
  - `<Sidebar>` is invoked without `userAvatar` or `avatarType`.
  - `<Header>` is invoked without `userAvatar` or `avatarType`.

---

## 2. Logic Chain

1. **User Action (Upload/Change/Delete/Emoji)**:
   - In `/dashboard/settings?tab=profile`, user selects a photo, uploads it, deletes it, or picks an emoji.
   - The settings page executes the respective API call:
     - `POST /api/profile/avatar` (multipart/form-data) -> stores image in `public/uploads/avatars/`, updates `PersistentStore` with `avatar_url: '/uploads/avatars/avatar-[userId]-[timestamp]-[hash].[ext]'` and `avatar_type: 'uploaded'`.
     - `DELETE /api/profile/avatar` -> deletes physical file, resets `avatar_url: '🧑‍💼'`, `avatar_type: 'emoji'`.
     - `PATCH /api/profile` -> saves custom emoji with `avatar_type: 'emoji'`.
2. **Local Notification & Dispatch**:
   - `SettingsPage` updates its local state (`setAvatar`, `setAvatarType`).
   - `SettingsPage` synchronizes `localStorage`: `tatadana_user_avatar` and `tatadana_user_avatar_type`.
   - `SettingsPage` dispatches a standard `CustomEvent`:
     ```js
     window.dispatchEvent(new CustomEvent('tatadana_profile_updated', {
       detail: { avatar_url, avatar_type, full_name }
     }))
     ```
3. **Global Layout Synchronization**:
   - `DashboardLayout` has an active listener for `'tatadana_profile_updated'`.
   - Upon receiving the event, `DashboardLayout` updates its `userAvatar` and `avatarType` states.
   - Cache-busting is ensured because uploaded avatar URLs contain unique timestamp hashes (and optional `?t=${Date.now()}` query parameter can be appended for instant cache invalidation).
4. **Prop Propagation & Layout Re-render**:
   - `DashboardLayout` re-renders and passes `userAvatar` and `avatarType` to `<Sidebar>` and `<Header>`.
   - In `<Sidebar>`, the user card renders:
     - An `<img>` tag with circular border if `avatarType === 'uploaded'`.
     - The emoji character if `avatarType === 'emoji'`.
     - Graceful fallback to initial letter `{userName[0]}` if `onError` fires.
   - In `<Header>`, a clickable circular badge shortcut linking to `/dashboard/settings?tab=profile` renders the avatar (photo or emoji).
   - This occurs completely client-side in real-time **without full page refresh or re-login**.

---

## 3. Caveats

1. **Authentication Mode**:
   - In production or hybrid setups, sessions may be stored in cookies or `localStorage` (`tatadana_session` / `tatadana_admin_session`). Frontend fetch calls must include `credentials: 'include'` and `Authorization: Bearer <token>` header to support both scenarios cleanly.
2. **Server-Side File Serving**:
   - Static files saved in `public/uploads/avatars/` are served via Next.js static asset routing or the dynamic fallback handler `app/uploads/avatars/[filename]/route.ts`. The route handler includes `Cache-Control: public, max-age=86400, stale-while-revalidate=43200`. Cache-busting query strings (`?t=...`) prevent browser caching stale images if filenames were ever reused.
3. **Image OnError Fallback**:
   - If an uploaded avatar image is missing from disk or network drops, an `onError` event must not leave an ugly broken image placeholder. It should switch to displaying the user's name initial or fallback emoji (`🧑‍💼`).
4. **Immediate Emoji Persistence**:
   - Requirement R5 states that selecting an emoji persists via `PATCH /api/profile`. To avoid requiring the user to also click "Simpan Profil" after clicking an emoji, `handleSelectEmoji` should call `PATCH /api/profile` immediately (with debounce or optimistic update).

---

## 4. Conclusion & Concrete Implementation Blueprint

### A. Proposed Modifications for `components/layout/sidebar.tsx`
```tsx
// 1. Extend SidebarProps
interface SidebarProps {
  userPlan?: 'starter' | 'pro'
  userName?: string
  userPhone?: string
  userAvatar?: string
  avatarType?: 'uploaded' | 'emoji'
  isAdmin?: boolean
  onLogout?: () => void
  isMobileOpen?: boolean
  setIsMobileOpen?: (open: boolean) => void
}

// 2. Update bottom user card rendering (around line 186):
<div className="flex items-center justify-between pt-1 px-1">
  <div className="flex items-center gap-2.5 overflow-hidden">
    <div className="w-8 h-8 rounded-full border border-emerald-500/30 overflow-hidden flex items-center justify-center bg-emerald-950/60 shrink-0 shadow-sm relative">
      {avatarType === 'uploaded' || userAvatar?.startsWith('/') || userAvatar?.startsWith('http') ? (
        <img
          src={userAvatar}
          alt={userName}
          className="w-full h-full object-cover rounded-full"
          onError={(e) => {
            // Graceful fallback to initial if image fails
            ;(e.currentTarget as HTMLElement).style.display = 'none'
            const fb = (e.currentTarget.parentNode as HTMLElement)?.querySelector('.avatar-fallback')
            if (fb) (fb as HTMLElement).style.display = 'flex'
          }}
        />
      ) : null}
      <div
        className={`avatar-fallback w-full h-full flex items-center justify-center text-xs font-bold text-slate-200 ${
          avatarType === 'uploaded' || userAvatar?.startsWith('/') ? 'hidden' : 'flex'
        }`}
      >
        {avatarType === 'emoji' && userAvatar ? (
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
```

---

### B. Proposed Modifications for `components/layout/header.tsx`
```tsx
// 1. Extend HeaderProps:
import Link from 'next/link'

interface HeaderProps {
  onMenuClick: () => void
  onNewTransactionClick: () => void
  telegramConnected?: boolean
  title?: string
  userAvatar?: string
  avatarType?: 'uploaded' | 'emoji'
  userName?: string
}

// 2. Add profile shortcut avatar to the right side of the header (lines 53–64):
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

  {/* Profile Avatar Shortcut Link */}
  <Link
    href="/dashboard/settings?tab=profile"
    title="Pengaturan Profil Akun"
    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#0a0f16] border border-emerald-500/30 hover:border-emerald-400 flex items-center justify-center overflow-hidden transition-all shadow-sm hover:scale-105 shrink-0"
  >
    {avatarType === 'uploaded' || userAvatar?.startsWith('/') || userAvatar?.startsWith('http') ? (
      <img
        src={userAvatar}
        alt={userName || 'Profil'}
        className="w-full h-full object-cover rounded-full"
        onError={(e) => {
          ;(e.currentTarget as HTMLElement).style.display = 'none'
          const fb = (e.currentTarget.parentNode as HTMLElement)?.querySelector('.header-avatar-fallback')
          if (fb) (fb as HTMLElement).style.display = 'flex'
        }}
      />
    ) : null}
    <div
      className={`header-avatar-fallback w-full h-full flex items-center justify-center text-xs font-bold text-slate-200 ${
        avatarType === 'uploaded' || userAvatar?.startsWith('/') ? 'hidden' : 'flex'
      }`}
    >
      {avatarType === 'emoji' && userAvatar ? (
        <span className="text-sm sm:text-base leading-none select-none">{userAvatar}</span>
      ) : (
        (userName || 'S').substring(0, 1).toUpperCase()
      )}
    </div>
  </Link>
</div>
```

---

### C. Proposed Modifications for `app/dashboard/layout.tsx`
```tsx
// 1. Add userAvatar & avatarType state:
const [userAvatar, setUserAvatar] = useState<string>('🧑‍💼')
const [avatarType, setAvatarType] = useState<'emoji' | 'uploaded'>('emoji')

// 2. In useEffect (initialization & hydration):
useEffect(() => {
  if (typeof window !== 'undefined') {
    // ... auth check ...
    const storedName = localStorage.getItem('tatadana_user_name')
    const storedPhone = localStorage.getItem('tatadana_user_phone')
    const storedPlan = localStorage.getItem('tatadana_user_plan')
    const storedAvatar = localStorage.getItem('tatadana_user_avatar')
    const storedAvatarType = localStorage.getItem('tatadana_user_avatar_type') as 'uploaded' | 'emoji' | null

    if (storedName) setUserName(storedName)
    if (storedPhone) setUserPhone(storedPhone)
    if (storedPlan === 'pro' || storedPlan === 'pro_lifetime') setUserPlan('pro')
    if (storedAvatar) setUserAvatar(storedAvatar)
    if (storedAvatarType) setAvatarType(storedAvatarType)

    // Fetch fresh profile from DB
    const fetchUserProfile = async () => {
      try {
        const token =
          localStorage.getItem('tatadana_session') ||
          localStorage.getItem('tatadana_admin_session')
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`

        const res = await fetch('/api/profile', {
          headers,
          credentials: 'include',
          cache: 'no-store',
        })
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.data) {
            if (json.data.full_name) setUserName(json.data.full_name)
            if (json.data.avatar_url) setUserAvatar(json.data.avatar_url)
            if (json.data.avatar_type) setAvatarType(json.data.avatar_type)
          }
        }
      } catch {}
    }
    fetchUserProfile()
  }

  // 3. Listen to profile update event
  const handleProfileUpdated = (event: Event) => {
    const customEv = event as CustomEvent
    if (customEv.detail) {
      if (customEv.detail.avatar_url) setUserAvatar(customEv.detail.avatar_url)
      if (customEv.detail.avatar_type) setAvatarType(customEv.detail.avatar_type)
      if (customEv.detail.full_name) setUserName(customEv.detail.full_name)
    }
  }

  window.addEventListener('tatadana_profile_updated', handleProfileUpdated)

  return () => {
    window.removeEventListener('tatadana_profile_updated', handleProfileUpdated)
    // ... existing cleanups ...
  }
}, [router])

// 4. Pass down to Sidebar and Header:
<Sidebar
  userPlan={userPlan}
  userName={userName}
  userPhone={userPhone}
  userAvatar={userAvatar}
  avatarType={avatarType}
  isAdmin={isAdmin}
  onLogout={handleLogout}
  isMobileOpen={isMobileOpen}
  setIsMobileOpen={setIsMobileOpen}
/>

<Header
  onMenuClick={() => setIsMobileOpen(true)}
  onNewTransactionClick={() => setIsModalOpen(true)}
  telegramConnected={telegramConnected}
  userAvatar={userAvatar}
  avatarType={avatarType}
  userName={userName}
  title="Dashboard TataDana"
/>
```

---

### D. Proposed Refinements for `app/dashboard/settings/page.tsx`
1. **Immediate Emoji Persistence**:
   Update `handleSelectEmoji` to call `PATCH /api/profile` immediately so choosing an emoji saves instantly to the database:
   ```tsx
   const handleSelectEmoji = async (emo: string) => {
     setSelectedFile(null)
     setPreviewUrl(null)
     setAvatar(emo)
     setAvatarType('emoji')
     try {
       const token =
         localStorage.getItem('tatadana_session') ||
         localStorage.getItem('tatadana_admin_session')
       const headers: Record<string, string> = { 'Content-Type': 'application/json' }
       if (token) headers['Authorization'] = `Bearer ${token}`

       const res = await fetch('/api/profile', {
         method: 'PATCH',
         headers,
         credentials: 'include',
         body: JSON.stringify({ avatarUrl: emo, avatarType: 'emoji' }),
       })
       if (res.ok) {
         localStorage.setItem('tatadana_user_avatar', emo)
         localStorage.setItem('tatadana_user_avatar_type', 'emoji')
         window.dispatchEvent(
           new CustomEvent('tatadana_profile_updated', {
             detail: { avatar_url: emo, avatar_type: 'emoji', full_name: userName },
           })
         )
       }
     } catch {}
   }
   ```
2. **Top Card Avatar Badge Fallback**:
   In line 1459, replace simple display hiding with fallback text/emoji to prevent empty boxes when image fails.

---

## 5. Verification Method

To verify these changes independently:

1. **Static Analysis & TypeScript Type Check**:
   ```powershell
   npx tsc --noEmit
   ```
   Ensures that `<Sidebar>` and `<Header>` receive matching props and that no undefined prop errors occur across the layout tree.

2. **UI Component Inspection**:
   - Check that `components/layout/sidebar.tsx` contains `userAvatar` and `avatarType` in `SidebarProps`.
   - Check that `components/layout/header.tsx` contains `userAvatar` and a `<Link href="/dashboard/settings?tab=profile">`.
   - Check that `app/dashboard/layout.tsx` registers `tatadana_profile_updated`.
   - Check that `app/dashboard/settings/page.tsx` contains the file input, circular preview, upload/delete handlers, and 8 built-in emojis.

3. **E2E Test Execution (`profile-avatar.test.mjs` & `verify-all.mjs`)**:
   ```powershell
   node tests/e2e/profile-avatar.test.mjs
   node scripts/verify-all.mjs
   ```
   Verifies:
   - Scenario 12: Built-in emoji toggling persists to DB.
   - Scenario 14: UI components (`Sidebar`, `Settings`, `Header`) load photo and emoji references.
   - All tests in `verify-all.mjs` pass 100%.
