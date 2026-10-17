# Frontend UI Architecture & Requirements Analysis: R7, R8, R9, R10, R11, R13, R14

**Author**: `explorer_frontend_3` (Frontend UI Architect)  
**Target Project**: TataDana SaaS Finansial Indonesia  
**Date**: 2026-10-17  
**Scope**: In-depth read-only architectural investigation of requirements R7, R8, R9, R10, R11, R13, and R14.

---

## Executive Summary

An exhaustive inspection of the TataDana codebase was performed across UI components, client pages, state management, layouts, API routes, database models, and theme styling. While significant parts of the UI foundation exist (e.g. interactive calendar, multi-wallet cards, multi-period budget bars, and dark luxury aesthetic), critical functional gaps and architectural disconnects were uncovered:

1. **R7 (Tata AI Bot)**: The web AI chat is currently limited to conversational advising. It lacks intent detection for natural language Indonesian transactions ("Gajian 5 juta", "Beli makan siang 25 ribu"), proactive clarification ("Tadi bayar 50"), and does not execute writes to the central transaction ledger.
2. **R8 (Multi-Wallet)**: Has CRUD UI and API routes, but lacks an "Archive" capability (hard DELETE can violate FK constraints or orphan data), and `app/dashboard/layout.tsx` hardcodes wallet state, desynchronizing the header modal from the wallet manager.
3. **R9 (Multi-Period Budget & Interactive Calendar)**: The calendar and budget pages feature rich visuals, but an underlying database schema column mismatch (`date`/`notes` in API queries vs `transaction_date`/`note` in database migrations) causes queries to fail, forcing fallback to static mock datasets.
4. **R10 (Real Report Export & Download)**: The `/dashboard/laporan` export button executes a dummy `setTimeout` with an `alert()` and does not download any file. Furthermore, the export API lacks CSV support and CSV formula injection protection (`=`, `+`, `-`, `@`).
5. **R11 (Profile & Custom Categories)**: The settings profile form is not hooked to `/api/profile`, lacks avatar file upload/validation, and categories in settings are isolated in temporary component state rather than persisted to `/api/categories`.
6. **R13 (Pro Entitlements & Subscription Tiers)**: There is no user-facing subscription/upgrade page or plan selector (1 bulan Rp19.000, 1 tahun Rp149.000, Lifetime Rp399.000), clicking "Upgrade" points to a non-existent `?tab=plan`, and payment status enums deviate from specifications.
7. **R14 (Theme Consistency)**: The primary luxury theme tokens (`#06090e`, `#10b981`, `#080d14`, `#064e3b`) are present in `tailwind.config.js` and `globals.css`, but several core UI components (`modal.tsx`, `laporan/page.tsx`, `settings/page.tsx`) still utilize generic slate (`#0f172a`, `border-slate-800`).

---

## 1. Requirement R7: Tata AI Bot Financial Assistant

### 1.1 Inspected Files
- `app/dashboard/tata-ai/page.tsx` (Dedicated Fullscreen AI Chat Page)
- `components/ai/floating-ai-widget.tsx` (Floating AI Assistant Widget)
- `app/api/ai/chat/route.ts` (AI Chat Backend Route)
- `lib/ai/financial-context.ts` (Financial Context Aggregator & Heuristic Fallback)
- `lib/ai/multi-provider.ts` (Multi-Provider Engine & Parser)
- `app/dashboard/layout.tsx` (Layout integration)

### 1.2 Observed Component Structure
- **Floating Widget** (`components/ai/floating-ai-widget.tsx`):
  - Fixed trigger button at bottom-right (`fixed bottom-6 right-6 z-40`).
  - Hides automatically when on `/dashboard/tata-ai` (`pathname === '/dashboard/tata-ai'`).
  - Contains quick prompt chips ("Analisa Pengeluaran", "Tips Hemat", "Alokasi 50/30/20").
  - Sends requests to `/api/ai/chat` with `{ message, history }`.
- **Dedicated Page** (`app/dashboard/tata-ai/page.tsx`):
  - Left column: Displays real-time financial context (Total Saldo, Pemasukan, Pengeluaran, Kategori Paling Boros, Status Kesehatan Kas) and quick action suggestion cards.
  - Right column: Full chat window with message history stream, thinking state, and input bar with quick prompt chips.
- **Backend Flow** (`app/api/ai/chat/route.ts`):
  - Aggregates user metrics via `getUserFinancialContext(userId)`.
  - Injects persona instructions into system prompt (friendly, Indonesian, 50/30/20 rule).
  - Tries Gemini -> OpenAI -> `generateHeuristicFinancialAdvice`.

### 1.3 Gaps & Discrepancies
1. **Absence of Natural Language Transaction Recording**:
   - Requirement R7 explicitly requires: *"Tata AI memahami bahasa alami Indonesia untuk pemasukan ('Gajian 5 juta'), pengeluaran ('Beli makan siang 25 ribu'), dan tanggal transaksi... Transaksi yang dicatat oleh Tata AI disimpan melalui service transaksi yang sama persis dengan form web UI, sehingga saldo dan budget langsung terupdate."*
   - Current status: `/api/ai/chat` treats all incoming user messages as advisory questions. If a user enters `"Beli bakso 25rb"` or `"Gajian 5 juta"`, the AI provides conversational advice rather than parsing and recording the transaction.
2. **Multi-Provider NLP Disconnect**:
   - `MultiAIProviderService.parseNaturalLanguageTransaction` exists in `lib/ai/multi-provider.ts` (with `parseIndonesianNumber` supporting `15rb`, `1.5jt`, `500k`, etc.), but it is **only called in `lib/telegram/message-handler.ts`**!
   - `/api/ai/chat` does not invoke `parseNaturalLanguageTransaction` or perform intent classification.
3. **Missing Proactive Clarification**:
   - R7 requires: *"Meminta klarifikasi secara proaktif jika nominal atau konteks transaksi ambigu (contoh: 'Tadi bayar 50')."*
   - When ambiguity occurs, `/api/ai/chat` does not return a structured clarification intent (e.g., asking *"Bayar 50 ribu atau 50 juta? Dan untuk keperluan apa?"*).
4. **No Visual Transaction Confirmation in UI**:
   - In both `tata-ai/page.tsx` and `floating-ai-widget.tsx`, there are no UI components (e.g., transaction preview cards or confirmation buttons) to show that a transaction was created, and no `tatadana_transaction_created` CustomEvent is dispatched to update dashboard cards or wallet totals.

### 1.4 Recommendations for Implementer
- Update `/api/ai/chat/route.ts` to first run intent detection on incoming messages. If a financial transaction intent is detected:
  - Call `MultiAIProviderService.parseNaturalLanguageTransaction(message, userId)`.
  - If ambiguous (e.g. `success: false` or nominal lacks magnitude), return clarification prompt proactively.
  - If valid, execute transaction insertion using the identical transaction ledger logic as `app/api/transactions/route.ts` (updating wallet balance and evaluating budget alerts).
  - Return a structured response: `{ reply: "...", transaction_recorded: { ... } }`.
- Update `tata-ai/page.tsx` and `floating-ai-widget.tsx` to render a confirmation card whenever `transaction_recorded` is returned and dispatch `window.dispatchEvent(new CustomEvent('tatadana_transaction_created'))`.

---

## 2. Requirement R8: Multi-Wallet Management

### 2.1 Inspected Files
- `app/dashboard/wallet/page.tsx` (Wallet Management Page)
- `app/api/wallets/route.ts` (Wallets CRUD API Route)
- `types/database.ts` (Wallet TypeScript Interface)
- `supabase/migrations/20261010000001_initial_schema.sql` (Database Schema)
- `app/dashboard/layout.tsx` (Dashboard Layout State)

### 2.2 Observed Component Structure
- **Wallet Cards Grid** (`app/dashboard/wallet/page.tsx`):
  - Renders wallet cards with balance, icon, type badge, account number, and default Telegram badge.
  - Action buttons: "Jadikan Default Telegram", "Riwayat Transaksi", "Edit", and "Hapus".
- **Modals**:
  - Add Wallet Modal: Name, Type (`bank`, `cash`, `ewallet`, `other`), Initial Balance, Account Number/Phone, Default Telegram checkbox.
  - Edit Wallet Modal: Name, Balance, Account Number.
  - Transaction History Drawer: Slides in from right, displays transactions filtered by wallet.

### 2.3 Gaps & Discrepancies
1. **Missing Archive Capability**:
   - Requirement R8 specifies: *"CRUD & archive wallets, user_id isolation, default Telegram wallet marker."*
   - Current implementation only supports hard DELETE (`handleDeleteWallet` calls `DELETE /api/wallets?id=...`).
   - In PostgreSQL, if transactions exist referencing `wallet_id` (foreign key `ON DELETE SET NULL` or `RESTRICT`), deleting a wallet either fails or detaches historical transactions. An `is_archived: boolean` field with Archive/Unarchive toggles and an Archived Wallets tab is missing.
2. **Layout State Desynchronization**:
   - In `app/dashboard/layout.tsx` lines 27-64, initial wallets are hardcoded in React state (`w-1`, `w-2`, `w-3`) and passed to `CreateTransactionModal`.
   - When a user creates or modifies a wallet in `/dashboard/wallet`, `layout.tsx` does NOT fetch from `/api/wallets`, so the header's "Catat Transaksi" modal still displays the stale hardcoded wallets.
3. **Database Column Discrepancy**:
   - `types/database.ts` has optional `is_default_telegram?: boolean`.
   - The initial database migration `20261010000001_initial_schema.sql` only defines `is_default BOOLEAN`. If the database lacks column `is_default_telegram`, raw Supabase inserts with `is_default_telegram` will fail unless handled dynamically.

### 2.4 Recommendations for Implementer
- Add `is_archived: boolean DEFAULT false` to the `wallets` table and `types/database.ts`.
- In `app/dashboard/wallet/page.tsx`, replace the destructive Delete action with an "Arsipkan Dompet" / "Pulihkan" toggle, with a filter tab for Active vs Archived wallets.
- In `app/dashboard/layout.tsx`, replace hardcoded wallets state with a live `fetch('/api/wallets')` hook and listen to `tatadana_wallet_updated` events.

---

## 3. Requirement R9: Multi-Period Budget & Interactive Financial Calendar

### 3.1 Inspected Files
- `app/dashboard/kalender/page.tsx` (Calendar Main Page)
- `components/calendar/calendar-header.tsx` (Month Navigator & Wallet Filter)
- `components/calendar/calendar-summary.tsx` (Monthly In/Out/Net Summary Cards)
- `components/calendar/calendar-grid.tsx` (1-31 Visual Date Grid with Badges)
- `components/calendar/date-detail-drawer.tsx` (Day Click Transaction Drawer)
- `app/dashboard/budget/page.tsx` (Budget Multi-Period Page)
- `app/api/budgets/route.ts` (Budgets Calculation & Update API)
- `app/api/transactions/calendar/route.ts` (Calendar Aggregation API)
- `lib/utils/date.ts` (WIB Date Utilities: `getISODateWIB`, `getWIBDate`)

### 3.2 Observed Component Structure
- **Kalender Page** (`app/dashboard/kalender/page.tsx`):
  - Month navigation (Prev, Next, Today).
  - Filter per wallet (Semua, BCA, Cash, GoPay) dynamically re-aggregating values.
  - Visual 1-31 grid: Displays daily cash flow badges (green `+` for income, red `-` for expense, count badge).
  - Clicking any date opens `DateDetailDrawer` displaying that day's transaction details (time, category, wallet, notes, receipt items).
- **Budgeting Page** (`app/dashboard/budget/page.tsx`):
  - Toggle between 3 periods: **Harian**, **Mingguan**, and **Bulanan**.
  - Overview KPI cards: Total Alokasi, Total Terpakai, Kesehatan Budget badge.
  - Telegram alert info card explaining 80% & 100% threshold notifications.
  - Dynamic category progress bars: Green (safe <80%), Amber (warning 80-99%), Red (overbudget >=100%).
  - Edit limit modal allowing instant budget adjustments.

### 3.3 Gaps & Discrepancies
1. **Critical Schema Column Mismatch Breaking Live Calendar**:
   - In `app/api/transactions/calendar/route.ts` line 378 & line 387:
     ```ts
     .select('id, amount, type, date, time, notes, wallet_id, category_id...')
     .gte('date', startDateStr)
     .lte('date', endDateStr)
     ```
   - BUT in migration `20261010000001_initial_schema.sql` line 128:
     ```sql
     transaction_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
     note TEXT,
     ```
   - In `app/api/budgets/route.ts` line 132:
     ```ts
     .gte('transaction_date', startDate)
     .lte('transaction_date', endDate)
     ```
   - This discrepancy causes Supabase queries in `/api/transactions/calendar` to fail with error `column "date" does not exist`. Because of this failure, the route falls back to `getFallbackMonthlyTransactions`, causing newly created real user transactions to never appear on the calendar!
2. **Static Mock Dataset Fallback in UI**:
   - `app/dashboard/kalender/page.tsx` contains a 160-line hardcoded `BASE_MOCK_TRANSACTIONS` array. If the API returns empty (or fails due to the schema bug), it renders October 2026 dummy transactions instead of an empty state or actual user data.

### 3.4 Recommendations for Implementer
- Standardize transaction date and note column naming across the entire database and API layer. The recommended approach is to support both or ensure the migration matches `date` and `notes` (or update calendar API to query `transaction_date` and alias it as `date`).
- Remove reliance on hardcoded mock transactions in `kalender/page.tsx`, displaying an empty state when a date has no activity.
- Verify WIB date boundary consistency in `getDateRangeForPeriod` (`app/api/budgets/route.ts`).

---

## 4. Requirement R10: Real Report Export & Download

### 4.1 Inspected Files
- `app/dashboard/laporan/page.tsx` (Reports Dashboard Page)
- `app/api/reports/export/route.ts` (Report Export Route)
- `lib/services/export-manager.ts` (Export Orchestration Service)
- `lib/export/excel.ts` (ExcelJS Generator)
- `lib/export/pdf.ts` (PDF Generator)
- `lib/services/reports.ts` (Report Metrics Calculation)

### 4.2 Observed Component Structure
- **Laporan Page** (`app/dashboard/laporan/page.tsx`):
  - Date filter (`dateStart`, `dateEnd`), category filter, wallet filter, search note input.
  - Summary KPI cards (Pemasukan, Pengeluaran, Arus Kas Bersih, Top 5 Kategori).
  - Transaction list table with sortable columns and multi-item receipt drawer toggle.
  - Saved export history table.
- **Backend Generator** (`lib/export/excel.ts`):
  - Uses `ExcelJS.Workbook` to create a 3-sheet workbook:
    - Sheet 1: Ringkasan Laporan & Top 5 Kategori.
    - Sheet 2: Daftar Transaksi (No, Tanggal, Waktu, Jenis, Dompet, Kategori, Nominal, Catatan, Sumber).
    - Sheet 3: Rincian Struk Multi-Item.

### 4.3 Gaps & Discrepancies
1. **Fake Export Handler on Frontend**:
   - In `app/dashboard/laporan/page.tsx` lines 145-160:
     ```ts
     const handleExport = (type: 'pdf' | 'excel') => {
       setIsExporting(type)
       setTimeout(() => {
         const newExp = { ... }
         setExportHistories([newExp, ...exportHistories])
         setIsExporting(null)
         alert(`Laporan ${type.toUpperCase()} berhasil digenerate dan siap diunduh!`)
       }, 1200)
     }
     ```
   - **The export button does NOT make any API request to `/api/reports/export`!** It only triggers a `setTimeout` and an `alert()`. No file is actually downloaded by the user's browser.
2. **Missing CSV Export Option**:
   - Requirement R10 mandates: *"Modul export di `/api/reports/export` menghasilkan berkas nyata yang dapat diunduh (format CSV dan XLSX/PDF)."*
   - In `app/api/reports/export/route.ts` line 25:
     ```ts
     if (!fileType || (fileType !== 'pdf' && fileType !== 'excel')) {
       return NextResponse.json({ success: false, message: 'Format file harus berupa "pdf" atau "excel".' }, { status: 400 })
     }
     ```
   - There is NO CSV format support in `/api/reports/export` and NO CSV button on `/dashboard/laporan`.
3. **Missing CSV Formula Injection Sanitization**:
   - Requirement R10 explicitly states: *"Proteksi terhadap CSV Formula Injection (sanitasi karakter awal `=`, `+`, `-`, `@`)."*
   - There is currently no sanitization helper in `lib/export` or `lib/services/export-manager.ts` to neutralize dangerous prefix characters before writing to CSV/Excel text cells.
4. **Hardcoded Mock Data on Reports Page**:
   - The transactions and summary stats on `/dashboard/laporan` are hardcoded in React state (`useState`) with 7 static transactions rather than fetched from `/api/reports/transactions` and `/api/reports/summary`.

### 4.4 Recommendations for Implementer
- Update `app/dashboard/laporan/page.tsx`:
  - Fetch real transactions and summary from `/api/reports/transactions` and `/api/reports/summary`.
  - Rewrite `handleExport` to call `POST /api/reports/export`, obtain `downloadUrl` (or trigger direct streaming download), and trigger an actual browser download (`window.location.href = ...` or anchor click).
  - Add a dedicated "Export CSV" button.
- Update `/api/reports/export/route.ts` and `ExportManagerService` to support `fileType: 'csv'`.
- Implement a CSV Formula Injection sanitizer:
  ```ts
  export function sanitizeCSVFormula(val: string): string {
    if (!val) return ''
    const trimmed = String(val).trim()
    if (/^[=+@\-\t\r]/.test(trimmed)) {
      return `'${trimmed}`
    }
    return trimmed
  }
  ```

---

## 5. Requirement R11: Profile & Custom Categories

### 5.1 Inspected Files
- `app/dashboard/settings/page.tsx` (Settings & Profile Page)
- `app/api/profile/route.ts` (Profile API Route)
- `app/api/categories/route.ts` (Categories API Route)
- `types/database.ts` (Profile & Category Interfaces)

### 5.2 Observed Component Structure
- **Settings Page** (`app/dashboard/settings/page.tsx`):
  - 4 tabs: "Bot Telegram", "Reminder Harian", "Kelola Kategori", "Profil Akun".
  - Profil tab: Text inputs for Full Name and Currency.
  - Kelola Kategori tab: Input for emoji and category name, and an Add button.

### 5.3 Gaps & Discrepancies
1. **No Avatar Upload or Animation Picker**:
   - Requirement R11 specifies: *"Pengguna dapat memperbarui profil (nama, avatar animasi / upload foto profil dengan validasi ukuran dan MIME type)."*
   - In `settings/page.tsx`, the Profil tab contains no file upload element, no animated avatar selector, no MIME type validation (`image/jpeg`, `image/png`, `image/webp`), and no file size boundary checks (e.g., max 2MB).
2. **Profile Save Button Disconnected**:
   - In `settings/page.tsx` line 1030:
     ```ts
     <button onClick={() => alert('Profil berhasil diperbarui!')}>Simpan Profil</button>
     ```
   - The button only triggers an `alert()` and never calls `PATCH /api/profile`!
3. **Categories Tab Disconnected from Database**:
   - In `settings/page.tsx` line 102: Categories are kept in local React state (`[categories, setCategories] = useState([...])`).
   - The "Tambah Kategori" form only calls `setCategories([...])` and never calls `POST /api/categories`. Newly added categories vanish upon page refresh.
4. **Missing Edit, Delete, and Archive Actions for Categories**:
   - R11 specifies: *"Pengelolaan kategori kustom (tambah, edit, arsip) yang konsisten di seluruh modul."*
   - The UI does not provide Edit, Delete, or Archive buttons for categories.
5. **Cross-Component Inconsistency**:
   - Categories in `app/dashboard/layout.tsx` (hardcoded `c-1` to `c-7`), `app/dashboard/budget/page.tsx`, and `app/dashboard/settings/page.tsx` are managed independently rather than synchronized via `/api/categories`.

### 5.4 Recommendations for Implementer
- In `app/dashboard/settings/page.tsx`:
  - Hook the Profile tab to `GET /api/profile` and `PATCH /api/profile`.
  - Add avatar upload UI with client-side validation for MIME types (`image/jpeg`, `image/png`, `image/webp`) and size limit (<= 2MB), plus a grid of animated avatar presets (SVG/Lottie/emojis).
  - Hook the Categories tab to `GET /api/categories`, `POST /api/categories`, `PATCH /api/categories`, and `DELETE /api/categories`.
  - Add Edit modal and Archive toggle for categories.

---

## 6. Requirement R13: Pro Entitlements & Subscription Tiers

### 6.1 Inspected Files
- `app/api/transactions/route.ts` (Transaction Limit Enforcement)
- `components/layout/sidebar.tsx` (Sidebar Plan Banner & Upgrade Link)
- `app/admin/payments/page.tsx` (Admin Payment Approval Panel)
- `app/api/admin/payments/route.ts` (Admin Payments API)
- `app/api/admin/payments/approve/route.ts` (Admin Payment Approve)
- `app/api/admin/payments/reject/route.ts` (Admin Payment Reject)
- `app/api/admin/admin-store.ts` (Memory Store for Admin Records)
- `types/database.ts` (Plan Types)

### 6.2 Observed Component Structure
- **Entitlement Guard** (`app/api/transactions/route.ts` lines 67-83):
  - Checks user profile: If `plan === 'starter'` and `monthly_tx_count >= 50`, returns HTTP 403 Forbidden with message: *"Batas transaksi bulanan paket Starter (50 transaksi) sudah tercapai. Silakan upgrade ke Pro untuk transaksi tanpa batas."*
- **Admin Approval Interface** (`app/admin/payments/page.tsx`):
  - Displays table of payments with filters (Semua, Pending, Approved, Rejected).
  - Approve and Reject buttons with real-time audit logging and modal proof preview.
- **Admin Endpoints** (`/api/admin/payments/approve` & `/reject`):
  - Updates user's plan to `'pro'` upon approval.

### 6.3 Gaps & Discrepancies
1. **Missing User-Facing Pricing / Upgrade Screen**:
   - Requirement R13 defines:
     - Starter: 50 transaksi/bulan.
     - Pro: Transaksi tanpa batas.
     - Paket langganan: Pro 1 bulan (Rp19.000), Pro 1 tahun (Rp149.000), Pro Lifetime (Rp399.000).
     - Admin otomatis mendapatkan akses Pro Lifetime (`wildanakmalfathan@gmail.com`).
   - In `components/layout/sidebar.tsx` line 173:
     ```tsx
     <Link href="/dashboard/settings?tab=plan">Upgrade</Link>
     ```
   - In `app/dashboard/settings/page.tsx`, **there is NO `plan` tab**! Clicking "Upgrade" in the sidebar routes to `/dashboard/settings?tab=plan`, which defaults to the `telegram` tab. Users have no way to upgrade their plan from the frontend!
2. **Missing Unique Invoice Flow**:
   - R13 specifies: *"Alur invoice unik dengan status pembayaran (`pending_payment`, `paid`, `failed`, `expired`, `cancelled`) dan konfirmasi admin."*
   - There is no user invoice generation route or screen showing unique payment codes (e.g. `INV-TD-202610-8291`), payment instructions (BCA Virtual Account / QRIS / Manual Transfer), and proof upload.
3. **Status Enum Inconsistency**:
   - `admin-store.ts` uses statuses: `'pending' | 'approved' | 'rejected' | 'settlement' | 'expire' | 'cancel'` rather than the standardized `pending_payment`, `paid`, `failed`, `expired`, `cancelled`.
4. **Hardcoded User Plan in Dashboard Layout**:
   - `app/dashboard/layout.tsx` hardcodes `userPlan = 'pro'`, so the Starter banner, transaction counter, and upgrade prompts never show for regular users unless dynamically driven.

### 6.4 Recommendations for Implementer
- Create a dedicated Pricing / Upgrade modal or a dedicated `plan` tab in `/dashboard/settings` with the 3 tiers:
  - Pro 1 Bulan (Rp19.000)
  - Pro 1 Tahun (Rp149.000)
  - Pro Lifetime (Rp399.000)
- Build an invoice checkout drawer/page displaying unique order ID, payment instructions, and proof upload.
- Align payment statuses to standard enums (`pending_payment`, `paid`, `failed`, `expired`, `cancelled`).
- Fetch the real user plan in `app/dashboard/layout.tsx` from `/api/profile`.

---

## 7. Requirement R14: Luxury Obsidian Black & Deep Emerald Green Theme

### 7.1 Inspected Files
- `tailwind.config.js` (Tailwind Theme Tokens)
- `app/globals.css` (Global Styles & Color Variables)
- `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/modal.tsx`, `components/ui/badge.tsx`
- `components/layout/sidebar.tsx`, `components/layout/header.tsx`
- `app/dashboard/layout.tsx`, `app/dashboard/kalender/page.tsx`, `app/dashboard/wallet/page.tsx`, `app/dashboard/budget/page.tsx`, `app/dashboard/laporan/page.tsx`, `app/dashboard/settings/page.tsx`

### 7.2 Theme Specification
The prompt establishes the following color palette:
- **Base Background**: Luxury Obsidian Black (`#06090e`)
- **Accent Primary**: Deep Emerald Green (`#10b981`)
- **Panel / Card Background**: Deep Obsidian Panel (`#080d14` / `#0a0f16`)
- **Border**: Subtle Emerald Forest Border (`#064e3b` / `rgba(6, 78, 59, 0.4)`)

### 7.3 Theme Compliance Audit

| File / Component | Expected Color | Actual Observed Color | Compliance Status | Gap Notes |
|---|---|---|---|---|
| `tailwind.config.js` | `#06090e`, `#10b981`, `#080d14`, `#064e3b` | `luxury.bg: #06090e`, `brand.500: #10b981`, `brand.900: #064e3b` | ✅ Compliant | Well-configured design tokens. |
| `app/globals.css` | `#06090e` base | `body { background-color: #06090e; }` | ✅ Compliant | Includes luxury emerald glow and gradients. |
| `app/dashboard/layout.tsx` | `#06090e` | `bg-[#080C0A]` | ⚠️ Minor Divergence | Slightly off-tone `#080C0A` instead of `#06090e`. |
| `components/layout/sidebar.tsx` | `#080d14` panel, `#064e3b` border | `bg-[#080d14]`, `border-emerald-900/40` | ✅ Compliant | Matches obsidian emerald aesthetic. |
| `components/layout/header.tsx` | `#06090e`, `#10b981` | `bg-[#06090e]/90`, `text-emerald-400` | ✅ Compliant | Matches aesthetic. |
| `components/ui/button.tsx` | Emerald gradient `#10b981` | `from-emerald-600 via-emerald-500 to-teal-500` | ✅ Compliant | Luxury emerald pill buttons. |
| `components/ui/card.tsx` | `#0a0f16` / `#080d14` | `bg-[#0a0f16]`, `border-emerald-900/30` | ✅ Compliant | Clean dark emerald card. |
| `components/ui/modal.tsx` | `#080d14`, `#064e3b` | `bg-[#0f172a]`, `border-slate-800` | ❌ Non-Compliant | Uses Tailwind Slate 900 (`#0f172a`) and `slate-800`. |
| `components/transactions/create-transaction-modal.tsx` | `#080d14`, `#10b981` | `bg-slate-900`, `bg-slate-950`, `border-slate-800` | ❌ Non-Compliant | Form inputs and tabs use cold slate instead of obsidian emerald. |
| `app/dashboard/kalender/page.tsx` | `#06090e`, `#0a0f16`, `#10b981` | `bg-[#06090e]`, `bg-[#0a0f16]`, `border-emerald-900/30` | ✅ Compliant | High quality aesthetic adherence. |
| `app/dashboard/budget/page.tsx` | `#06090e`, `#0a0f16`, `#064e3b` | `bg-[#06090e]`, `border-[#064e3b]/30`, `#10b981` | ✅ Compliant | Beautiful emerald progress indicators. |
| `app/dashboard/wallet/page.tsx` | `#06090e`, `#064e3b`, `#10b981` | `bg-[#06090e]`, `border-[#064e3b]/30` | ✅ Compliant | High quality aesthetic adherence. |
| `app/dashboard/laporan/page.tsx` | `#06090e`, `#080d14` | `bg-slate-900`, `border-slate-700` | ❌ Non-Compliant | Entire page uses generic slate gray rather than obsidian emerald. |
| `app/dashboard/settings/page.tsx` | `#06090e`, `#080d14` | Tabs 2, 3, 4 use `bg-slate-900/80`, `border-slate-800` | ❌ Partial | Only Tab 1 (Telegram) uses `#080d14` and `#064e3b`. |

### 7.4 Recommendations for Implementer
- Replace all occurrences of `bg-[#0f172a]` and `bg-slate-900` in modals and settings with `bg-[#080d14]` or `bg-[#0a0f16]`.
- Replace `border-slate-800` and `border-slate-700` with `border-[#064e3b]/40` or `border-emerald-900/30`.
- Update `app/dashboard/layout.tsx` background to `#06090e`.
- Update `app/dashboard/laporan/page.tsx` panels and inputs to match the obsidian emerald theme.

---

## 8. Consolidated Action Plan & Priority Matrix

| Priority | Requirement | Target File(s) | Key Action Required |
|---|---|---|---|
| **P0** | **R9** | `app/api/transactions/calendar/route.ts` | Fix column name mismatch (`transaction_date` vs `date`, `note` vs `notes`) so calendar queries live database ledger without throwing errors. |
| **P0** | **R10** | `app/dashboard/laporan/page.tsx`, `app/api/reports/export/route.ts` | Replace fake `setTimeout` alert with real API export trigger and browser download. Add CSV support and formula injection protection (`=`, `+`, `-`, `@`). |
| **P0** | **R7** | `app/api/ai/chat/route.ts`, `tata-ai/page.tsx` | Add natural language transaction parser to web AI chat (`parseNaturalLanguageTransaction`), proactive clarification, and atomic transaction ledger insertion. |
| **P1** | **R13** | `app/dashboard/settings/page.tsx`, `components/layout/sidebar.tsx` | Add user-facing subscription plan selector tab (`?tab=plan`) with tiers (1 mo Rp19k, 1 yr Rp149k, Lifetime Rp399k) and invoice flow. |
| **P1** | **R11** | `app/dashboard/settings/page.tsx`, `app/api/profile/route.ts` | Hook Profile and Categories tabs to live backend APIs. Add avatar upload with MIME/size validation. Add category edit and archive. |
| **P1** | **R8** | `app/dashboard/wallet/page.tsx`, `app/dashboard/layout.tsx` | Add wallet archiving instead of destructive hard delete. Connect `DashboardLayout` to live wallet API so header modal stays in sync. |
| **P2** | **R14** | `components/ui/modal.tsx`, `laporan/page.tsx`, `settings/page.tsx` | Eliminate legacy slate colors (`#0f172a`, `border-slate-800`) and enforce 100% Obsidian Black (`#06090e`), Deep Emerald (`#10b981`), Panel (`#080d14`), and Border (`#064e3b`). |

---

*Report compiled by explorer_frontend_3 (Frontend UI Architect)*
