# Master Investigation & Architectural Specification: Requirements R4, R5, & R12
**TataDana SaaS Finansial Indonesia**
**Investigator:** `explorer_daemon_3` (Daemon Integration Architect)  
**Date:** 2026-10-17  
**Working Directory:** `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_daemon_3`  
**Target Requirements:** R4 (Registration Approval & WhatsApp), R5 (Admin Dashboard & Heartbeat), R12 (Telegram Long Polling & Reminder)

---

## 1. Executive Summary

An exhaustive, read-only architectural investigation was performed on the TataDana codebase across requirements **R4**, **R5**, and **R12**. The objective is to identify current architectural gaps, simulated/mocked artifacts, missing endpoints, connection handling, background loops, and honest integration statuses, and to produce a hardened blueprint for implementation.

### Key Discoveries & Status Matrix

| Requirement | Area | Current Codebase State | Critical Deficiencies | Severity |
|---|---|---|---|---|
| **R4** | Registration Approval Workflow | `app/(auth)/register/page.tsx:51-78` sets client `localStorage` and immediately redirects to `/dashboard`. No backend `/api/auth/register` exists. | No server persistence, no status `pending_approval`, no password hashing, no email/phone normalization. | **CRITICAL** |
| **R4** | Admin Registration Queue | `app/api/admin/admin-store.ts:4-17` only supports `'active' \| 'suspended'`. `app/admin/users/page.tsx` has no approval queue. `/api/admin/approval` is absent. | Admins cannot approve or reject registrations; no queue UI exists. | **CRITICAL** |
| **R4** | WhatsApp Notification (`081460932853`) | `081460932853` does not appear anywhere in code; only UI placeholder strings exist in login/register forms. | Zero WhatsApp integration; no notification sent; no honest config reporting endpoint. | **HIGH** |
| **R4** | Audit Logging | `AdminStore.addAuditLog` exists and writes to `audit_logs` table, but is only used for `user_update` and payment transactions. | No audit logs recorded for user registration approval or rejection. | **MEDIUM** |
| **R5** | Admin Dashboard (`/admin`) | `app/admin/page.tsx:18-25` hardcodes static mock numbers (`totalUsers: 1428`, etc.) and still refers to "Status Webhook Telegram". | No live database/store metric aggregation; regression against polling-first requirement. | **HIGH** |
| **R5** | Real-Time Session Heartbeat | No `/api/auth/heartbeat` exists. No `last_seen_at` field exists in `AdminUserRecord` or SQL schema. | Active users cannot be determined by 60–90s activity; real-time user count is static. | **HIGH** |
| **R5** | User Management Table | `app/admin/users/page.tsx` lacks pagination, lacks `pending_approval` / `rejected` filters, and lacks Approve/Reject buttons. | Inability to manage pending approval lifecycle or handle large user lists. | **HIGH** |
| **R12** | Telegram Bot Polling Mode | `scripts/telegram-daemon.mjs`, `scripts/start-telegram-bot.bat`, `/api/telegram/poll`, and `/api/telegram/setup-bot` are operational with Long Polling (`timeout: 25`). Token `@danaanananabot` is configured. | Architecture is sound for basic polling, but lacks deep-link account linking. | **LOW (Base ready)** |
| **R12** | Deep-Link Token Account Linking | `lib/telegram/message-handler.ts:135-189` only links accounts via manual phone text or contact cards. `/start <token>` is ignored. | Users clicking `t.me/danaanananabot?start=<token>` are greeted with unlinked error asking for phone numbers. | **HIGH** |
| **R12** | Daily WIB Reminder | `app/api/telegram/send-reminder/route.ts` sends messages based on hour, but has NO message deduplication and NO exponential backoff. | Multiple runs per hour trigger duplicate spam; Telegram 429 errors crash the handler. | **HIGH** |

---

## 2. Requirement R4: Registration Approval Workflow & WhatsApp Notification

### 2.1 Current Implementation State

1. **User Registration Bypass**:
   - Location: `app/(auth)/register/page.tsx:51-78`
   - Form submission does not communicate with any registration API. It invokes `fetch('/api/categories/recommend')` optionally, then writes mock keys to `localStorage` (`tatadana_user_authenticated = 'true'`) and redirects directly to `/dashboard`.
   - The user never enters a `pending_approval` state and completely bypasses administrative governance.

2. **Admin User Store Status Limitations**:
   - Location: `app/api/admin/admin-store.ts:4-17`
   ```typescript
   export interface AdminUserRecord {
     id: string
     name: string
     full_name: string
     phone: string
     plan: 'starter' | 'pro'
     status: 'active' | 'suspended' // Missing 'pending_approval' | 'rejected'
     role: 'user' | 'admin'
     telegram_connected: boolean
     telegram_username: string | null
     monthly_tx_count: number
     created_at: string
     updated_at?: string
   }
   ```
   - In `AdminStore`, `status` is strictly binary (`'active' | 'suspended'`).
   - There are no methods for `approveRegistration(userId, adminId)` or `rejectRegistration(userId, reason, adminId)`.

3. **Absence of Registration Approval API**:
   - `/api/admin/approval` does not exist.
   - `/app/api/admin/payments/approve` and `reject` exist, but are scoped strictly to payment orders (`payment_id`), not user registration requests.

4. **Zero WhatsApp Integration**:
   - Grep search for `whatsapp` revealed only 6 UI label occurrences in `app/(auth)/login/page.tsx` and `app/(auth)/register/page.tsx`.
   - Phone `081460932853` is completely absent from all source files.
   - No notification dispatcher exists in `lib/` or `app/api/`.

### 2.2 Forensic Analysis: Honest WhatsApp Status & Anti-Cheating

The master specification explicitly mandates:
> *"Jika integrasi WhatsApp API belum memiliki kredensial aktif, sistem harus secara jujur menampilkan status integrasi belum aktif beserta panduan setup, bukan memalsukan status pengiriman pesan."*

**Defects & Integrity Risks to Avoid**:
- Never mock a successful WhatsApp send (`{ success: true, message: "Notifikasi terkirim via WhatsApp" }`) if no external WhatsApp provider is configured.
- Never hardcode a "Connected" status badge in the Admin Command Center if credentials are dummy or missing.

### 2.3 Proposed Architecture & Concrete Implementation Blueprint

#### A. Data Model Extension
In `app/api/admin/admin-store.ts` and `types/database.ts`:
```typescript
export type UserAccountStatus = 'pending_approval' | 'active' | 'suspended' | 'rejected'

export interface AdminUserRecord {
  id: string
  name: string
  full_name: string
  email: string                      // Added: lowercase normalized email
  phone: string                      // Added: E.164 normalized (+62...)
  plan: 'starter' | 'pro'
  status: UserAccountStatus          // Extended with pending_approval & rejected
  role: 'user' | 'admin'
  rejection_reason?: string | null  // Added: permanent audit reason
  approved_by?: string | null        // Added: admin ID or email
  approved_at?: string | null        // Added: ISO timestamp
  last_seen_at?: string | null       // Added for R5 Heartbeat
  telegram_connected: boolean
  telegram_username: string | null
  monthly_tx_count: number
  created_at: string
  updated_at?: string
}
```

#### B. User Registration API (`/api/auth/register`)
- Input validation: `fullName`, `email`, `phone`, `password`, `confirmPassword`.
- Normalization:
  - `email = email.trim().toLowerCase()`
  - `phone = normalizeIndonesianPhone(phone)` (from `lib/utils/phone.ts`)
- Validation:
  - Check phone validity via `isValidIndonesianPhone(phone)`.
  - Check unique constraint on email & phone against `AdminStore.getUsers()`.
- Password Security:
  - Secure hash (e.g. `scrypt` or PBKDF2 with unique salt via Node's `node:crypto`).
- Status Initialization:
  - Set `status: 'pending_approval'`.
  - Prevent login to `/dashboard` until status becomes `'active'`.
- Trigger WhatsApp Notification:
  - Call WhatsApp service to notify admin `+6281460932853`.

#### C. WhatsApp Notification Dispatcher (`lib/notifications/whatsapp.ts`)
```typescript
export interface WhatsAppSendResult {
  sent: boolean
  configured: boolean
  status: 'sent' | 'unconfigured' | 'failed'
  recipient: string
  message: string
  setupGuide?: {
    adminPhone: string
    recommendedProviders: string[]
    requiredEnvVars: string[]
    instructions: string
  }
}

export class WhatsAppNotificationService {
  static readonly ADMIN_PHONE = '+6281460932853'

  static isConfigured(): boolean {
    const token = process.env.WHATSAPP_API_KEY || process.env.FONNTE_TOKEN
    const url = process.env.WHATSAPP_API_URL
    return Boolean(token && !token.includes('placeholder') && url)
  }

  static async sendAdminRegistrationAlert(user: {
    id: string
    name: string
    email: string
    phone: string
    createdAt: string
  }): Promise<WhatsAppSendResult> {
    const recipient = this.ADMIN_PHONE
    const configured = this.isConfigured()

    if (!configured) {
      console.warn(`[WhatsApp Notification] Gateway UNCONFIGURED. Notification to ${recipient} deferred. Showing honest setup instructions.`)
      return {
        sent: false,
        configured: false,
        status: 'unconfigured',
        recipient,
        message: 'WhatsApp Gateway belum terkonfigurasi di server.',
        setupGuide: {
          adminPhone: recipient,
          recommendedProviders: ['Fonnte (fonnte.com)', 'Twilio WhatsApp API', 'WPPConnect'],
          requiredEnvVars: ['WHATSAPP_API_URL', 'WHATSAPP_API_KEY'],
          instructions: 'Setel WHATSAPP_API_URL dan WHATSAPP_API_KEY pada .env.local untuk mengaktifkan notifikasi otomatis ke nomor admin.',
        },
      }
    }

    // Live HTTP dispatch to gateway if configured...
    // (Omitted: live HTTP fetch implementation)
  }
}
```

#### D. Registration Approval API (`/api/admin/approval`)
- Methods: `GET` (list pending requests), `POST` (approve or reject)
- Authorization: Enforced via `verifyAdminAuthorization(req)`.
- Approval Action:
  - Sets `status: 'active'`.
  - Records audit log: `AdminStore.addAuditLog({ action: 'user_approval', target_user_id: user.id, admin_id, reason: 'Disetujui oleh admin' })`.
- Rejection Action:
  - Sets `status: 'rejected'`.
  - Requires `reason` parameter.
  - Records audit log: `AdminStore.addAuditLog({ action: 'user_rejection', target_user_id: user.id, admin_id, reason })`.

---

## 3. Requirement R5: Admin Dashboard & Real-Time Monitoring

### 3.1 Current Implementation State

1. **Static Mock Metrics in `/admin`**:
   - Location: `app/admin/page.tsx:18-25`
   - Hardcoded metrics object:
     - `totalUsers: 1428`
     - `proUsers: 384`
     - `monthlyRevenue: 37620000`
     - `aiCallsToday: 4892`
     - `telegramWebhookHealth: 'Healthy (0 error)'` (Direct contradiction with Polling-First mandate!)
   - The page has zero API calls to backend services.

2. **Session Heartbeat Mechanism**:
   - Endpoint `/api/auth/heartbeat` does not exist.
   - No tracking of user presence exists. Users are either statically in memory or authenticated in local storage.
   - Requirement R5 specifically states:
     > *"Mekanisme Session Heartbeat Real-Time: Pengguna aktif ditentukan berdasarkan aktivitas heartbeat dalam 60–90 detik terakhir, bukan hanya status login statis."*

3. **User Management Interface**:
   - Location: `app/admin/users/page.tsx`
   - Status filter dropdown (line 269) only provides `'all'`, `'active'`, `'suspended'`.
   - Table displays all users without pagination controls.
   - Action buttons only offer toggling active/suspended and starter/pro.
   - No indication of whether a user is currently online/active.

### 3.2 Proposed Architecture & Concrete Implementation Blueprint

#### A. Session Heartbeat API (`app/api/auth/heartbeat/route.ts`)
```typescript
import { NextResponse } from 'next/server'
import { AdminStore } from '@/app/api/admin/admin-store'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const userId = body.userId || req.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID diperlukan.' }, { status: 400 })
    }

    const now = new Date().toISOString()
    await AdminStore.updateHeartbeat(userId, now)

    return NextResponse.json({
      success: true,
      last_seen_at: now,
      interval_recommendation: 60, // Next heartbeat in 60 seconds
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
```

#### B. Active User Calculation (60–90s Window)
In `AdminStore`:
```typescript
static async getStats() {
  const users = await this.getUsers()
  const now = Date.now()
  const ACTIVE_WINDOW_MS = 90 * 1000 // 90 seconds threshold

  const activeUsers = users.filter((u) => {
    if (!u.last_seen_at) return false
    const diff = now - new Date(u.last_seen_at).getTime()
    return diff <= ACTIVE_WINDOW_MS
  }).length

  const todayIso = new Date().toISOString().split('T')[0]
  const registeredToday = users.filter((u) => u.created_at.startsWith(todayIso)).length
  const pendingApprovals = users.filter((u) => u.status === 'pending_approval').length
  const approvedCount = users.filter((u) => u.status === 'active').length
  const rejectedCount = users.filter((u) => u.status === 'rejected').length
  const totalDecided = approvedCount + rejectedCount
  const approvalRatio = totalDecided > 0 ? Math.round((approvedCount / totalDecided) * 100) : 100

  return {
    totalUsers: users.length,
    activeUsers,
    registeredToday,
    pendingApprovals,
    approvedCount,
    rejectedCount,
    approvalRatio,
    whatsappIntegration: {
      configured: WhatsAppNotificationService.isConfigured(),
      adminPhone: '+6281460932853',
      status: WhatsAppNotificationService.isConfigured() ? 'Online' : 'Belum Terkonfigurasi',
    },
    telegramIntegration: {
      configured: true,
      mode: 'long_polling',
      botUsername: '@danaanananabot',
      status: 'Long Polling Aktif',
    },
  }
}
```

#### C. Dashboard Overview Updates (`app/admin/page.tsx`)
1. Replace hardcoded `metrics` with live `fetch('/api/admin/stats')`.
2. Add Stat Cards:
   - **Total Pengguna**: `{stats.totalUsers}`
   - **Pengguna Aktif Saat Ini**: `{stats.activeUsers}` (🟢 Heartbeat 60-90s)
   - **Pendaftar Hari Ini**: `{stats.registeredToday}` (WIB)
   - **Pending Approval**: `{stats.pendingApprovals}` (Direct link to review queue)
   - **Rasio Approval**: `{stats.approvalRatio}%` ({stats.approvedCount} disetujui / {stats.rejectedCount} ditolak)
   - **Integrasi WhatsApp**: Honest badge (🟢 Terhubung / 🟡 Belum Terkonfigurasi)
   - **Integrasi Telegram Bot**: Mode Long Polling (`@danaanananabot`)
3. Fix the regression: Remove any reference to "Webhook Telegram" and replace with "Long Polling Telegram".

#### D. User Management Updates (`app/admin/users/page.tsx`)
1. **Tabs/Filters**:
   - `Semua` | `Pending Approval (N)` | `Aktif` | `Suspended` | `Ditolak`
2. **Table Columns**:
   - User identity: Full Name, Email, Phone
   - Online status indicator: 🟢 green pulse dot if `last_seen_at <= 90s`, else gray timestamp
   - Status badge: `pending_approval` (Amber), `active` (Emerald), `suspended` (Rose), `rejected` (Slate)
   - Action buttons:
     - For `pending_approval`: **Setujui (Approve)** and **Tolak (Reject)** with reason dialog
     - For `active`/`suspended`: **Toggle Suspend**
     - Plan Switcher: **Starter** / **Pro**
3. **Pagination Controls**:
   - `page` state, `pageSize = 10`
   - "Halaman X dari Y", "Sebelumnya", "Selanjutnya" buttons

---

## 4. Requirement R12: Telegram Bot Long Polling & Reminder

### 4.1 Current Implementation State

1. **Bot Identity & Tokens**:
   - Configured Token: `8607603301:AAHTbWxJY8v4GoGDHXlS0Szge-NsBGpUQ7g`
   - Username: `@danaanananabot`
   - Configured in `.env.local` and in `app/dashboard/settings/page.tsx`.

2. **Long Polling Daemon & Batch Script**:
   - Location: `scripts/telegram-daemon.mjs` and `scripts/start-telegram-bot.bat`
   - Operation:
     - Calls `deleteWebhook({ drop_pending_updates: false })` on boot.
     - Performs `getUpdates` with `timeout: 25` and offset tracking.
     - Offset persisted atomically to `.telegram-offset.json`.
     - Forwards updates to `POST http://localhost:3000/api/telegram/webhook`.
     - Handles 409 Webhook Conflict by cleaning webhooks and retrying.
   - Batch runner `start-telegram-bot.bat` loops and automatically restarts if daemon exits.

3. **In-App Auto-Poller**:
   - Location: `app/dashboard/settings/page.tsx`
   - Invokes `GET /api/telegram/poll` every 2.8 seconds when open.
   - Mutex guard `isPollingRef` prevents overlapping polling requests.
   - Displays real chat logs and connection status.

4. **Account Linking Defect (Critical)**:
   - In `lib/telegram/message-handler.ts:135-190`, `handleUnlinkedUser`:
     ```typescript
     private async handleUnlinkedUser(message: TelegramMessage) {
       const chatId = message.chat.id
       const text = message.text?.trim() || ''

       const normalized = normalizeIndonesianPhone(text)
       if (normalized.startsWith('+628') && normalized.length >= 11) {
         // links phone
       }
     }
     ```
   - When a user clicks `https://t.me/danaanananabot?start=<token>`, Telegram sends the command:
     `/start <token>`
   - Because `resolveUser` returns null, the message goes to `handleUnlinkedUser`.
   - `normalizeIndonesianPhone('/start <token>')` fails!
   - The bot responds: *"Halo! Balas pesan ini dengan mengetik Nomor HP yang kamu daftarkan..."*
   - The deep-link token is NEVER inspected or processed!

5. **WIB Reminder Defect (Deduplication & Exponential Backoff Missing)**:
   - Location: `app/api/telegram/send-reminder/route.ts`
   - Loops through users where `reminder_enabled = true`.
   - Checks hour match: `t.substring(0, 2) === currentHourStr.substring(0, 2)`.
   - If the endpoint is hit multiple times within that hour (e.g. cron retry or manual invocation), users receive multiple duplicate messages.
   - If Telegram API throws 429 Too Many Requests or transient network timeout, no exponential backoff retry occurs, causing immediate batch failure.

### 4.2 Proposed Architecture & Concrete Implementation Blueprint

#### A. Deep-Link Token Linking Engine
1. **Token Generator API (`app/api/telegram/link-token/route.ts`)**:
   - Endpoint: `POST /api/telegram/link-token`
   - Generates a cryptographically secure random token: `crypto.randomBytes(16).toString('hex')`.
   - Stores in token registry with: `{ token, user_id, expires_at: Date.now() + 15 * 60 * 1000, is_used: false }`.
   - Returns deep link URL: `https://t.me/danaanananabot?start=${token}`.

2. **Deep-Link Resolution in `TelegramMessageHandler`**:
   Update `handleUpdate` and `handleUnlinkedUser` in `lib/telegram/message-handler.ts`:
   ```typescript
   // Check if message is /start with a deep link token
   if (message.text && message.text.startsWith('/start ')) {
     const token = message.text.split(' ')[1]?.trim()
     if (token) {
       const linkResult = await this.resolveAndConsumeDeepLinkToken(token, message.chat.id, message.from)
       if (linkResult.success) {
         await this.botApi.sendMessage(
           chatId,
           `🎉 *Akun Berhasil Terhubung!*\n\nHalo *${linkResult.user.name}*, akun Telegram kamu (@${message.from?.username || 'user'}) berhasil ditautkan ke akun TataDana via Deep Link aman.\n\nKetik transaksimu sekarang, misal: _"beli kopi 18k"_`,
           { parse_mode: 'Markdown' }
         )
         return { handled: true }
       } else {
         await this.botApi.sendMessage(
           chatId,
           `⚠️ *Tautan Tidak Valid atau Kedaluwarsa*\n\n${linkResult.message}\nSilakan buka Pengaturan di web TataDana untuk membuat tautan baru.`,
           { parse_mode: 'Markdown' }
         )
         return { handled: true }
       }
     }
   }
   ```

3. **Settings UI Enhancement**:
   - In `app/dashboard/settings/page.tsx`, under the Telegram tab:
   - Provide a prominent button: **"Hubungkan Akun Telegram via Deep Link"**.
   - Displays the generated link `https://t.me/danaanananabot?start=...` and a one-click button to launch Telegram directly.

#### B. Scheduled Daily WIB Reminder Hardening
Update `app/api/telegram/send-reminder/route.ts`:
1. **Deduplication Key**:
   - Compute unique key: `${user.id}:${todayIsoDateWIB}:${timeSlot}` (e.g. `u-1:2026-10-17:20:00`).
   - Store in reminder log table or persistent in-memory set.
   - If key exists, skip sending to avoid duplicate reminders.

2. **Exponential Backoff Dispatcher**:
   ```typescript
   async function sendTelegramWithBackoff(
     bot: TelegramBotApi,
     chatId: number | string,
     text: string,
     maxAttempts = 3
   ): Promise<boolean> {
     let delayMs = 1000
     for (let attempt = 1; attempt <= maxAttempts; attempt++) {
       try {
         const res = await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' })
         if (res.ok) return true
         // If rate limited, inspect retry_after if available
         console.warn(`[Reminder] Attempt ${attempt} failed: ${res.description}`)
       } catch (err: any) {
         console.warn(`[Reminder] Attempt ${attempt} error: ${err.message}`)
       }
       if (attempt < maxAttempts) {
         const jitter = Math.random() * 500
         await new Promise((r) => setTimeout(r, delayMs + jitter))
         delayMs *= 2 // 1s -> 2s -> 4s
       }
     }
     return false
   }
   ```

---

## 5. Test Suite & Verification Alignment

Existing test runner `scripts/verify-all.mjs` runs 71 tests across Tiers 1–4.
To verify R4, R5, and R12 without regressing existing tests:

1. **R4 Tests to Add**:
   - Normalization of email (`lowercase`) and phone (`+62...`).
   - Initial state `status: 'pending_approval'`.
   - Admin approval transition (`pending_approval` -> `active`) + audit log entry.
   - Admin rejection transition (`pending_approval` -> `rejected`) + mandatory reason + audit log entry.
   - WhatsApp status honesty: unconfigured returns honest guide; no false success.

2. **R5 Tests to Add**:
   - Heartbeat endpoint `/api/auth/heartbeat` updates `last_seen_at`.
   - Active user query: includes users within 90s, excludes users >90s.
   - User table pagination logic (slice and total count).
   - Dynamic `/api/admin/stats` contract verification.

3. **R12 Tests to Add**:
   - Deep-link token validation (`/start <token>` links account and consumes single-use token).
   - Reminder deduplication: second call within same day/slot returns 0 new sent.
   - Exponential backoff retry simulator: handles simulated 429 and succeeds on retry.

---

## 6. Comprehensive File Action Matrix

| Target File | Action Required | Responsibility |
|---|---|---|
| `app/api/admin/admin-store.ts` | Expand `AdminUserRecord` (`pending_approval`, `rejected`, `email`, `last_seen_at`). Add `approveUser`, `rejectUser`, `updateHeartbeat`, `getStats`. | Backend Specialist |
| `app/api/auth/register/route.ts` | Create new endpoint with normalization, hashing, `pending_approval` status, WhatsApp alert trigger. | Backend Specialist |
| `app/api/auth/heartbeat/route.ts` | Create new heartbeat endpoint updating `last_seen_at`. | Backend Specialist |
| `app/api/admin/approval/route.ts` | Create new approval API (approve/reject with audit logs). | Backend Specialist |
| `app/api/admin/stats/route.ts` | Create new dynamic dashboard metrics aggregation route. | Backend Specialist |
| `lib/notifications/whatsapp.ts` | Create WhatsApp dispatcher with honest config status check and setup guide. | Daemon/Integration Specialist |
| `lib/telegram/message-handler.ts` | Add deep-link `/start <token>` resolution & single-use token consumption. | Daemon/Integration Specialist |
| `app/api/telegram/link-token/route.ts` | Create link token generation endpoint. | Daemon/Integration Specialist |
| `app/api/telegram/send-reminder/route.ts` | Add daily reminder deduplication & exponential backoff retry. | Daemon/Integration Specialist |
| `app/admin/page.tsx` | Replace hardcoded mock numbers with live `/api/admin/stats`, fix Webhook vs Polling text, display WhatsApp & Telegram status. | Frontend Specialist |
| `app/admin/users/page.tsx` | Add `pending_approval` queue filter, pagination controls, approve/reject buttons, online pulse dot. | Frontend Specialist |
| `app/dashboard/settings/page.tsx` | Add deep link generation button for `@danaanananabot`. | Frontend Specialist |
| `scripts/verify-all.mjs` | Add test suites covering R4, R5, R12 contracts. Ensure >=71 tests pass 100%. | Test Verifier |

---

*Report prepared and verified by `explorer_daemon_3`.*
