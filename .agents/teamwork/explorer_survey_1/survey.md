# TataDana Frontend Architecture & UI Survey Report

**Surveyor:** Frontend Explorer (`explorer_survey_1`)  
**Date:** 2026-10-16  
**Project Path:** `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana`  
**Target Milestone:** Milestone 1 — In-depth Reconnaissance & Survey  

---

## 1. Executive Summary

TataDana is an Indonesian SaaS financial management platform with an aesthetic based on **Luxury Obsidian Black & Deep Emerald Green**. This survey systematically analyzed the existing frontend codebase across routing, layout systems, navigation components, wallet and budget pages, admin interfaces, theme implementations, and AI/calendar readiness to support requirements **R1** (Financial Calendar), **R2** (Tata AI Bot Assistant), **R3** (Multi-Wallet), **R5** (Multi-Period Budgeting), **R6** (Admin Approval Module), and **R7** (Visual Consistency).

### Key Findings & Gap Matrix

| Requirement | Existing Status in Codebase | Identified Gaps | Recommended Implementation Path |
|---|---|---|---|
| **R1. Kalender Keuangan (`/dashboard/kalender`)** | ❌ Not implemented. No folder or component in `app/dashboard/` or `components/`. | Rute `/dashboard/kalender` 404, missing in sidebar navigation, no grid 1-31 visualizer, no daily cashflow badges, no date-click drawer. | Create `app/dashboard/kalender/page.tsx` with date-fns grid generator, wallet filter dropdown, daily badge calculations, and transaction drill-down modal/drawer. |
| **R2. Tata AI Bot Assistant (`/dashboard/tata-ai` & Floating Widget)** | ⚠️ Partial backend only (`MultiAIProviderService` in `lib/ai/multi-provider.ts`). No web UI. | No `/dashboard/tata-ai` page, no floating widget, no chat state, no financial context injection into prompt. | Create `app/dashboard/tata-ai/page.tsx`, `components/ai/floating-ai-widget.tsx`, and `app/api/tata-ai/route.ts` with quick prompts and financial state summary. |
| **R3. Multi-Wallet (`/dashboard/wallet`)** | ⚠️ Mock prototype in `app/dashboard/wallet/page.tsx`. | In-memory `useState` only (does not persist to DB); missing account/phone number input in form; missing "Edit Saldo/Nama" action; missing "Riwayat Transaksi per Dompet"; default telegram toggle not wired to API. | Refactor `app/dashboard/wallet/page.tsx` to integrate with `app/api/wallets` (GET/POST/PATCH/DELETE), add complete form fields, edit modal, and transaction history drawer. |
| **R5. Budgeting Multi-Period (`/dashboard/budget`)** | ⚠️ Mock prototype in `app/dashboard/budget/page.tsx`. | Only displays hardcoded monthly budgets; NO toggle for **Harian**, **Mingguan**, and **Bulanan**; no dynamic calculation per timeframe; no trigger check for Telegram alerts (80% & 100%). | Add multi-period toggle tabs (Harian / Mingguan / Bulanan), period-specific limit definitions, dynamic progress bar indicators, and integration with backend budget evaluation. |
| **R6. Admin Approval (`/admin/payments` & `/admin/users`)** | ⚠️ Mock prototype in `app/admin/payments/page.tsx` & `app/admin/users/page.tsx`. | Approve/Reject buttons only alter local array and trigger `alert()`; does not update DB, does not upgrade user profile to `pro`, does not write audit log. In `/admin/users`, missing instant status switcher (Aktif/Suspended/Pro). | Create admin APIs (`/api/admin/payments`, `/api/admin/users`), wire Approve/Reject to update `payment_transactions` & `profiles.plan = 'pro'`, write to `audit_logs`, and add account status dropdown. |
| **R7. Luxury Theme Consistency** | ⚠️ Partially applied. Defined in `tailwind.config.js` and `app/globals.css`, but several pages use default slate styles. | `app/dashboard/wallet`, `app/dashboard/budget`, and admin pages use `bg-slate-900` / `border-slate-800` rather than the official Obsidian `#06090e`, `#0a0f16`, `#080d14`, `#064e3b`. | Standardize all panels, cards, inputs, and badges using project glassmorphism and emerald theme classes. |

---

## 2. Architecture & Tech Stack Details

### 2.1 Framework & Core Libraries
From `package.json`:
- **Next.js:** `^14.2.24` (App Router architecture strictly used).
- **React:** `^18.3.1` and `react-dom: ^18.3.1`.
- **Styling:** `tailwindcss: ^3.4.17`, `postcss: ^8.5.2`, `autoprefixer: ^10.4.20`, `clsx: ^2.1.1`, `tailwind-merge: ^3.0.1`.
- **Icons:** `lucide-react: ^0.475.0` (Comprehensive SVG icons).
- **Charts:** `recharts: ^2.15.1` (PieChart, BarChart, LineChart, ResponsiveContainer).
- **Date & Timezone:** `date-fns: ^4.1.0` and `date-fns-tz: ^3.2.0` (Standardized to `Asia/Jakarta` / WIB in `lib/utils/date.ts`).
- **AI SDK:** `openai: ^4.85.4` (Used in addition to REST calls to Gemini, DeepSeek, and Groq).
- **Supabase Client:** `@supabase/ssr: ^0.5.2` and `@supabase/supabase-js: ^2.49.1`.
- **Export Formats:** `exceljs: ^4.4.0`, `jspdf: ^2.5.2`, `jspdf-autotable: ^3.8.4`.

### 2.2 Directory Hierarchy
```
tatadana/
├── app/
│   ├── (auth)/login & register
│   ├── admin/
│   │   ├── ai/ (AI Switchboard)
│   │   ├── ai-logs/ (AI Call Logs)
│   │   ├── audit/ (Audit Log)
│   │   ├── payments/ (Payment Approval Mock)
│   │   ├── users/ (User Management Mock)
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── api/
│   │   ├── auth/ (send-otp, verify-otp)
│   │   ├── categories/ (route, recommend)
│   │   ├── payments/midtrans/ (charge, webhook)
│   │   ├── profile/
│   │   ├── reports/ (export, history, summary, transactions)
│   │   ├── telegram/ (poll, send-reminder, setup-bot, webhook)
│   │   ├── transactions/ (route.ts)
│   │   └── wallets/ (route.ts)
│   ├── dashboard/
│   │   ├── budget/ (page.tsx - static mock)
│   │   ├── laporan/ (page.tsx)
│   │   ├── settings/ (page.tsx - telegram & sim)
│   │   ├── transaksi/ (page.tsx)
│   │   ├── wallet/ (page.tsx - static mock)
│   │   ├── layout.tsx
│   │   └── page.tsx (Beranda)
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── layout/
│   │   ├── header.tsx
│   │   └── sidebar.tsx
│   ├── transactions/
│   │   └── create-transaction-modal.tsx
│   └── ui/
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── empty-state.tsx
│       ├── modal.tsx
│       └── skeleton.tsx
├── lib/
│   ├── ai/multi-provider.ts
│   ├── payments/midtrans.ts
│   ├── services/ (reports.ts, export-manager.ts)
│   ├── supabase/ (client.ts, server.ts, admin.ts)
│   ├── telegram/ (bot-api.ts, message-handler.ts)
│   └── utils/ (currency.ts, date.ts, phone.ts)
└── types/database.ts
```

---

## 3. Layout & Navigation Survey

### 3.1 Dashboard Layout (`app/dashboard/layout.tsx`)
- **Structure:** Client component (`'use client'`).
- **Sidebar Integration:** Renders `<Sidebar>` passing `userPlan`, `userName`, `userPhone`, `isAdmin={true}`, `isMobileOpen`, and `onLogout`.
- **Header Integration:** Renders `<Header>` with `onMenuClick`, `onNewTransactionClick`, `telegramConnected`, and `title`.
- **Global Transaction Modal:** Houses `<CreateTransactionModal>` which listens to events and triggers a window refresh event `tatadana_transaction_created`.
- **Observation:** Currently provides default local state for `wallets` (3 wallets) and `categories` (7 categories).
- **Required Enhancement for R2:** Add the global `<FloatingAIWidget />` inside `app/dashboard/layout.tsx` so users can invoke the Tata AI assistant from anywhere within the dashboard.

### 3.2 Navigation Sidebar (`components/layout/sidebar.tsx`)
- **Current `navItems` (lines 41–48):**
  1. `/dashboard` — Beranda (`Home`)
  2. `/dashboard/transaksi` — Transaksi (`CreditCard`)
  3. `/dashboard/laporan` — Laporan (`BarChart3`)
  4. `/dashboard/budget` — Budget (`Target`)
  5. `/dashboard/wallet` — Wallet (`WalletIcon`)
  6. `/dashboard/settings` — Settings (`Settings`)
  7. `/admin` — Admin Panel (`ShieldCheck`, shown conditionally when `isAdmin = true`)
- **Gaps Identified:**
  - Missing `/dashboard/kalender` (Kalender Keuangan).
  - Missing `/dashboard/tata-ai` (Tata AI Bot Assistant).
- **Recommended Navigation Additions:**
  ```tsx
  { href: '/dashboard/kalender', label: 'Kalender', icon: Calendar },
  { href: '/dashboard/tata-ai', label: 'Tata AI Bot', icon: Bot, badge: 'PRO' },
  ```

### 3.3 Dashboard Header (`components/layout/header.tsx`)
- Contains mobile hamburger toggle, page title, Telegram connection status pill (`Bot` icon), and primary action button "Catat Transaksi".
- **Recommended Addition:** Include a quick access button or badge for "Tata AI Assistant" next to the Telegram status indicator.

---

## 4. In-Depth Component & Page Analysis

### 4.1 Existing Wallet Page (`app/dashboard/wallet/page.tsx`)
- **Lines 8–39:** State is completely mock and local (`useState` with `w-1`, `w-2`, `w-3`).
- **Lines 55–75 (`handleAddWallet`):** Creates in-memory item `id: w-${Date.now()}`. Does not call `/api/wallets`.
- **Modal Fields (`showAddModal` lines 142–207):**
  - Has inputs for: `newWalletName`, `newWalletType` (bank, ewallet, cash), `newWalletBalance`.
  - **Missing:** Account number / Phone number input field (`accountNumber`), even though cards render `w.accountNumber` (e.g. `•••• 4892`, `0812-3456-7890`).
- **Backend API Availability:**
  - `app/api/wallets/route.ts` is fully implemented:
    - `GET`: returns user wallets sorted by `is_default` and `created_at`.
    - `POST`: inserts new wallet, checks starter plan wallet quota (max 3 wallets).
    - `PATCH`: supports `isDefault: true` (unsets other defaults) as well as updating `name` and `balance`.
    - `DELETE`: deletes wallet by ID.
- **Action Buttons Gap:**
  - Only has "Jadikan Default" which modifies local state.
  - Missing: "Edit Saldo/Nama" modal/dialog.
  - Missing: "Riwayat Transaksi per Dompet" drawer/link.

### 4.2 Existing Budget Page (`app/dashboard/budget/page.tsx`)
- **Lines 8–64:** Contains 5 hardcoded category budgets: Makanan & Minuman, Tagihan & Utilitas, Transportasi, Belanja Bulanan, Hiburan.
- **Single Period Only:** Title says "Budget Bulanan per Kategori".
- **Requirement R5 Specifications:**
  1. Toggle 3 budget periods: **Harian** (Daily), **Mingguan** (Weekly), **Bulanan** (Monthly).
  2. Set category budget limits per period (e.g., Makanan: Rp75k/hari, Rp500k/minggu, Rp2.5jt/bulan).
  3. Dynamic spent calculation corresponding to the active timeframe (spending today, spending this week, spending this month).
  4. Status color indicators: Aman (<80% green), Mendekati Limit (≥80% amber), Overbudget (≥100% red).
  5. Telegram bot integration: alert threshold trigger status.
- **Gaps:** The current page is a static UI shell with inline editing for monthly limit only. It has neither timeframe toggle nor real transaction spent computation.

### 4.3 Existing Admin Pages (`app/admin/`)
- **Layout (`app/admin/layout.tsx`):**
  - Includes superbar with "TataDana Command Center", "SUPERADMIN", and owner "Wildan Akmal Fathan".
  - Nav items: Overview (`/admin`), AI Provider Manager (`/admin/ai`), Kelola Pengguna (`/admin/users`), Persetujuan Midtrans (`/admin/payments`), Log AI & Token (`/admin/ai-logs`), Audit Log Akses (`/admin/audit`).
- **Payment Approvals (`app/admin/payments/page.tsx`):**
  - Lists 3 static mock orders: `ORDER-TD-98214` (settlement), `ORDER-TD-98215` (pending manual transfer with proof image URL), `ORDER-TD-98211` (approved).
  - `handleApprove(id)` and `handleReject(id)` (lines 42–54) only mutate local state in React and display `window.alert()`.
  - **Gap:** No backend API to update `payment_transactions`, upgrade `profiles.plan = 'pro'`, or insert into `audit_logs`.
- **User Management (`app/admin/users/page.tsx`):**
  - Displays 4 mock users with plan badge and "Impersonate" button (which saves user credentials into `localStorage` and redirects to `/dashboard`).
  - **Gap:** R6 specifies: "Pada halaman `/admin/users`, admin dapat mengubah status akun (Aktif/Suspended/Pro) secara instan." No status switcher or plan dropdown currently exists in this table.

---

## 5. Design System & Theme Survey

### 5.1 Color Tokens in `tailwind.config.js`
- **Brand Palette (Emerald):**
  - `brand-500`: `#10b981` (Primary Emerald Accent)
  - `brand-600`: `#059669` (Deep Forest Green)
  - `brand-900`: `#064e3b` (Dark Emerald Border)
  - `brand-950`: `#022c22` (Obsidian Forest)
- **Luxury Theme Tokens:**
  - `luxury-bg`: `#06090e` (Deepest Obsidian Black background)
  - `luxury-card`: `#0a0f16` (Obsidian Slate Card)
  - `luxury-panel`: `#0e1622` (Deep Forest Panel; prompt also specifies `#080d14`)
  - `luxury-border`: `#152332` (Subtle Luxury Border; prompt also specifies `#064e3b`)
  - `luxury-accent`: `#10b981` (Vibrant Emerald Glow)
- **Shadows:**
  - `shadow-card`: `0 1px 3px 0 rgba(0, 0, 0, 0.4)`
  - `shadow-premium`: `0 10px 30px -5px rgba(16, 185, 129, 0.15)`
  - `shadow-glow`: `0 0 25px rgba(16, 185, 129, 0.35)`
  - `shadow-emerald`: `0 4px 20px 0 rgba(16, 185, 129, 0.35)`

### 5.2 CSS Utilities in `app/globals.css`
- `.glass-panel`: `background: rgba(10, 15, 22, 0.85); backdrop-filter: blur(16px); border: 1px solid rgba(16, 185, 129, 0.18);`
- `.glass-card`: `background: linear-gradient(145deg, rgba(14, 22, 32, 0.8) 0%, rgba(8, 12, 18, 0.95) 100%); border: 1px solid rgba(16, 185, 129, 0.16);`
- `.glass-card-hover`: transitions to border `rgba(16, 185, 129, 0.4)` with hover lift.
- `.emerald-glow` & `.emerald-glow-sm`: subtle glowing drop shadows for active elements.
- `.text-gradient-emerald`: `linear-gradient(135deg, #6ee7b7 0%, #10b981 50%, #059669 100%)`.
- `.telegram-bubble-in` (`#0d1520`) & `.telegram-bubble-out` (`#064e3b` to `#022c22`).

---

## 6. Blueprint for New & Enhanced Features

### 6.1 R1: Financial Calendar (`/dashboard/kalender`) Blueprint
1. **Route Location:** `app/dashboard/kalender/page.tsx`.
2. **Key Capabilities:**
   - **Header Controls:** Month/Year selector (e.g. "Oktober 2026") with `<` and `>` buttons; Today button.
   - **Wallet Filter Dropdown:** "Semua Dompet", "BCA Utama", "Cash Dompet", "GoPay / OVO".
   - **Monthly Summary Cards:** Total Pemasukan Bulan Ini (hijau), Total Pengeluaran Bulan Ini (merah), Net Cashflow.
   - **Calendar Grid:** 7 columns (Sen, Sel, Rab, Kam, Jum, Sab, Min) with padded days for month start.
   - **Date Cell Display:**
     - Day number (1–31) with visual highlight for today.
     - Income badge (`+Rp...` emerald pill) if income > 0.
     - Expense badge (`-Rp...` rose/red pill) if expense > 0.
     - Dot indicators for transaction count.
   - **Date Detail Drawer / Modal:**
     - Triggered when clicking any day.
     - Displays full transaction list for that day (time, icon, category, wallet, amount, notes, receipt badge).
     - Quick "Catat Transaksi di Tanggal Ini" button.

### 6.2 R2: Tata AI Bot Assistant Blueprint
1. **Dedicated Page:** `app/dashboard/tata-ai/page.tsx`.
2. **Floating Widget:** `components/ai/floating-ai-widget.tsx` (accessible globally from dashboard).
3. **Backend API Route:** `app/api/tata-ai/route.ts`
   - Computes live financial context: user balance, monthly income, monthly expenses, top spending category, budget utilization.
   - Connects to `MultiAIProviderService` (Gemini 1.5 Flash / DeepSeek / OpenAI) with friendly, consultative Indonesian prompt.
4. **Interactive Features:**
   - Quick action prompts:
     - 💡 *"Analisa pengeluaranku bulan ini"*
     - 🎯 *"Beri tips hemat minggu ini"*
     - 📊 *"Simulasi alokasi gaji 50/30/20"*
     - 🏖️ *"Simulasi budget liburan"*
   - Financial context cards (e.g. Saldo, Sisa Budget, Top Kategori) directly inside the AI conversation screen.
   - Markdown formatting for AI advice with bullet points, emojis, and actionable recommendations.

### 6.3 R3: Multi-Wallet Enhancement Blueprint
1. **Connect to Backend API:**
   - Replace in-memory state with `fetch('/api/wallets')`.
   - Update wallet list in real time upon create, edit, or delete.
2. **Enhanced Modal "Tambah Dompet Baru":**
   - Inputs: Nama Dompet, Jenis (Bank BCA/Mandiri/BRI/BNI, E-Wallet GoPay/OVO/Dana, Cash Tunai), Saldo Awal, Nomor Rekening / Nomor HP.
3. **Action Features:**
   - "Jadikan Default Telegram": sends `PATCH /api/wallets` with `{ id, isDefault: true }`.
   - "Edit Dompet": modal to update name and balance (`PATCH /api/wallets`).
   - "Riwayat Transaksi": modal or drawer querying `/api/reports/transactions?walletId=${wallet.id}`.

### 6.4 R5: Multi-Period Budgeting Blueprint
1. **Period Toggle Tabs:**
   - `[ Harian ]` | `[ Mingguan ]` | `[ Bulanan ]`
2. **Period Limit Computation:**
   - Allow user to view and edit limits for each timeframe.
   - Example default ratios: Harian = Bulanan / 30; Mingguan = Bulanan / 4.
3. **Dynamic Progress Bar:**
   - Green (<80%), Amber (80%–99%), Red (≥100% Defisit).
4. **Telegram Alert Indicator:**
   - Visual badge confirming active alert listener when transaction triggers threshold.

### 6.5 R6: Admin Approval Blueprint
1. **Admin Backend API Routes:**
   - `app/api/admin/payments/route.ts`: GET pending/all payments, POST approve/reject with audit log writing and profile plan update.
   - `app/api/admin/users/route.ts`: GET all users with pagination/search, PATCH user status (active, suspended) or plan (starter, pro).
2. **Functional UI Integration:**
   - `/admin/payments`: Wire Approve & Reject buttons to call API, instantly reflecting state and confirming pro upgrade.
   - `/admin/users`: Add interactive status dropdown (`Aktif` | `Suspended`) and plan toggle (`Starter` | `Pro`).

---

## 7. Recommended Action Plan for Team

1. **Role 1 (Frontend Calendar Specialist):**
   - Implement `app/dashboard/kalender/page.tsx`.
   - Add `/dashboard/kalender` to `components/layout/sidebar.tsx`.
2. **Role 2 (Frontend Tata AI Specialist):**
   - Implement `app/dashboard/tata-ai/page.tsx` and `components/ai/floating-ai-widget.tsx`.
   - Implement `app/api/tata-ai/route.ts`.
   - Add `/dashboard/tata-ai` to `components/layout/sidebar.tsx` and floating widget to `app/dashboard/layout.tsx`.
3. **Role 3 (Frontend Multi-Wallet & Budget Specialist):**
   - Upgrade `app/dashboard/wallet/page.tsx` with API integration, complete fields, edit modal, and transaction drawer.
   - Upgrade `app/dashboard/budget/page.tsx` with multi-period tabs (Harian/Mingguan/Bulanan) and dynamic progress bars.
4. **Role 4 (Admin Module & Telegram Integration Specialist):**
   - Create admin API endpoints (`/api/admin/payments`, `/api/admin/users`).
   - Upgrade `app/admin/payments/page.tsx` and `app/admin/users/page.tsx` to call live APIs.
   - Implement Telegram auto-responder daemon and budget limit alert trigger.
