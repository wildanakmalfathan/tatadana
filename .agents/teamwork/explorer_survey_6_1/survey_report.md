# Frontend UI/UX & Visual Restoration Survey Report
**Agent:** Explorer 1 (Frontend UI/UX Specialist)  
**Date:** 2026-10-17T17:12:00Z  
**Target:** TataDana Financial SaaS Platform (`app/dashboard/*`, `components/*`)  
**Directives:** R1 (Pemulihan Total Estetika Visual Luxury Obsidian & Emerald) & R3 (Visualisasi Kalender Keuangan & Drawer Detail)

---

## 1. Executive Summary

A comprehensive, file-by-file investigation of all frontend pages, shared layout components, charting modules, and theme styling was conducted.

### Key Conclusions:
1. **Core Feature Architecture Exists:** All requested pages (`/dashboard`, `/dashboard/transaksi`, `/dashboard/wallet`, `/dashboard/kalender`, `/dashboard/budget`, `/dashboard/tata-ai`, `/dashboard/settings`) exist and contain rich interactive UI elements.
2. **Category ID Fragmentation (Root Cause of Missing Visual Data):** A tripartite mismatch in category IDs (`cat-*` in pre-seeded transactions vs `c-*` in layout/budgets vs `UUIDs` in user categories) prevents `LedgerService.enrichTransaction` from resolving categories. This causes the Dashboard Donut Chart to collapse into generic `"Lainnya"`, transaction history to show generic `"Pengeluaran"`, calendar drawer items to display `"Umum 🏷️"`, and budget calculations to show 0% spent.
3. **Mock & Hardcoded Leftovers:**
   - `app/dashboard/tata-ai/page.tsx`: "Konteks Finansial Pengguna" sidebar card displays static hardcoded strings (`Rp10.450.000`, `+Rp15.000.000`, `-Rp2.850.000`, `Makanan 44%`) instead of querying live APIs.
   - `app/dashboard/laporan/page.tsx`: 100% hardcoded mock data for summary statistics, transaction list, and export history; export button only triggers a `setTimeout` alert.
   - `app/dashboard/wallet/page.tsx`: Contains hardcoded fallback transactions (`tx-s1`, `tx-s2`, `tx-s3`).
4. **Functional & UI Logic Bugs:**
   - `app/dashboard/transaksi/page.tsx`: `dateFilter` state (Hari Ini, 7 Hari Terakhir, Bulan Ini) is selected by the user but **never evaluated in the filter logic** (`filtered = transactions.filter(...)`).
   - `app/dashboard/wallet/page.tsx`: Empty state ("Belum Ada Dompet") is mistakenly nested inside `loading && wallets.length === 0`. When loading finishes with 0 wallets, it renders an empty grid with a blank screen.
   - Authentication Header Omission: `transaksi/page.tsx`, `wallet/page.tsx`, and `kalender/page.tsx` omit `Authorization: Bearer <token>` in their API `fetch` calls, risking HTTP 401 unauthenticated failures if cookies are not present.
5. **Theme & Aesthetic Inconsistencies:**
   - While `tailwind.config.js` and `app/globals.css` properly define Luxury Obsidian Black (`#06090e`), Slate Card (`#0a0f16`), Deep Forest Panel (`#0e1622`), and Emerald (`#10b981`), `app/dashboard/page.tsx` and `app/dashboard/laporan/page.tsx` heavily rely on generic Tailwind `bg-slate-900/80` and `border-slate-800`.
   - `app/dashboard/layout.tsx` defines body background as `bg-[#080C0A]` instead of the canonical `#06090e`.
   - Recharts Tooltips use slate-blue backgrounds (`#0f172a`, `#334155`) instead of obsidian glassmorphism.

---

## 2. Detailed Page-by-Page Audit

### 2.1. Dashboard Beranda (`app/dashboard/page.tsx`)

| Element | Status | Real Data Wired? | Issues / Observations |
| :--- | :--- | :--- | :--- |
| **4 Metric Cards** (Saldo Total, Pemasukan, Pengeluaran, Budget Tersisa) | Implemented | Yes (`/api/wallets`, `/api/transactions`, `/api/budgets`) | Uses `bg-slate-900/80` and `border-slate-800` rather than Luxury Obsidian `#0a0f16` / `#152332`. Budget remaining progress bar correctly calculates percentage. |
| **Donut Chart** (Pengeluaran per Kategori) | Implemented | Partial | Built with Recharts `PieChart`, innerRadius 55, outerRadius 80, center total display. **Bug:** Due to Category ID mismatch, `tx.category` returns null, collapsing all transactions into a single `'Lainnya'` slice. Recharts tooltip uses slate-blue `#0f172a`. |
| **Bar Chart 6 Bulan** (Arus Kas Pemasukan vs Pengeluaran) | Implemented | Yes | Dynamically computes the past 6 months from `now`. Emerald green (`#10b981`) for income, Rose red (`#f43f5e`) for expense. Works accurately once 6-month historical transactions exist in DB. |
| **Trend Line Harian** (Pengeluaran Harian) | Implemented | Partial | Recharts `LineChart` with emerald stroke. **Bug:** Loop is hardcoded to 10 days (`for (let d = 1; d <= 10; d++)`), ignoring days 11-31 of the current month. |
| **10 Transaksi Terkini** | Implemented | Yes | Shows title, category, wallet, WIB time, formatted Rupiah, and OCR receipt badge. Due to category mismatch, categories show generic fallbacks. |
| **Onboarding Banner** | Implemented | Yes | Conditionally displayed when `walletsList.length === 0`. |

---

### 2.2. Riwayat Transaksi (`app/dashboard/transaksi/page.tsx`)

| Feature | Status | Real Data Wired? | Issues / Observations |
| :--- | :--- | :--- | :--- |
| **Transaction List Table** | Implemented | Yes (`/api/transactions`) | Includes icons, category, wallet name, date, WIB time, source badge (Telegram Teks, Foto Struk, Voice Note, Web), and notes. |
| **Realtime Live Pulse** | Implemented | Yes | Visual indicator with `animate-ping` for live transactions. |
| **Export PDF & Excel** | Implemented | Yes | Connected to real endpoint `/api/reports/export?format=pdf` and `xlsx`. |
| **Search Filter** | Implemented | Yes | Searches across title, category name, and notes. |
| **Type Filter** | Implemented | Yes | Filters by `all`, `expense`, `income`, `transfer`. |
| **Wallet Filter** | Implemented | Yes | Dynamically populated from `/api/wallets`. |
| **Date Filter Dropdown** | **Broken** | No | `dateFilter` state (`today`, `week`, `month`) is selectable in UI, but lines 147-155 omit `dateFilter` from the filter predicate. Changing the date filter does nothing! |
| **Network / Auth** | **Risk** | Partial | `fetch('/api/transactions')` and `fetch('/api/wallets')` omit `Authorization: Bearer <token>` and `credentials: 'include'`. |
| **Styling** | Needs alignment | - | Uses dark-green tint `#101412` and `#141A17` instead of standard `#0a0f16` and `#080d14`. |

---

### 2.3. Multi-Wallet & Rekening (`app/dashboard/wallet/page.tsx`)

| Feature | Status | Real Data Wired? | Issues / Observations |
| :--- | :--- | :--- | :--- |
| **Total Liquidity Card** | Implemented | Yes | Aggregates all active wallet balances with gradient emerald text. |
| **Wallet Cards Grid** | Implemented | Yes (`/api/wallets`) | Shows icon, wallet name, masked account number, current balance, default badge, and action buttons. |
| **Default Telegram Toggle** | Implemented | Yes | `PATCH /api/wallets` sets `is_default_telegram: true`. |
| **Add Wallet Modal** | Implemented | Yes | `POST /api/wallets` with types: Bank, E-Wallet, Cash, Other. |
| **Edit Wallet Modal** | Implemented | Yes | `PATCH /api/wallets` updates name, balance, account number. |
| **Delete Wallet Action** | Implemented | Yes | `DELETE /api/wallets?id=...`. |
| **History Drawer** | Implemented | Yes | Filters transactions by wallet ID. **Caveat:** Lines 247-273 inject mock fallback transactions on error. |
| **Empty State Bug** | **Broken** | - | Lines 347-371: Empty state markup is placed inside `loading && wallets.length === 0`. If `!loading && wallets.length === 0`, it renders an empty grid (blank screen). |
| **Network / Auth** | **Risk** | Partial | `fetch('/api/wallets')` lacks `Authorization: Bearer <token>`. |

---

### 2.4. Visualisasi Kalender Keuangan (`app/dashboard/kalender/page.tsx` & `components/calendar/*`)

| Element | Component File | Status | Issues / Observations |
| :--- | :--- | :--- | :--- |
| **CalendarHeader** | `components/calendar/calendar-header.tsx` | Implemented | Month/year navigation buttons (`<`, `>`), "Hari ini" button, wallet filter dropdown populated from `/api/wallets`. |
| **CalendarSummary** | `components/calendar/calendar-summary.tsx` | Implemented | 4 metric cards: Total Pemasukan (+ green), Total Pengeluaran (- red), Arus Kas Bersih (surplus/defisit), and Aktivitas Transaksi (count tx). |
| **CalendarGrid** | `components/calendar/calendar-grid.tsx` | Implemented | Full 7-column grid (Senin-Minggu), leading previous-month days, trailing next-month days, current day highlight, cashflow badges (+ income green, - expense red), transaction count badge, and cell selection ring. |
| **DateDetailDrawer** | `components/calendar/date-detail-drawer.tsx` | Implemented | Slide-over drawer displaying Indonesian date header, Masuk/Keluar/Selisih pill summary, transaction list with jam, nominal, dompet, catatan, and multi-item receipt extraction. |
| **API Wiring** | `app/dashboard/kalender/page.tsx` | Partial | Calls `/api/transactions/calendar?month=...&year=...&wallet_id=...`. **Bugs:** Omits `Authorization: Bearer` header. Hardcoded prototype default date (`new Date(2026, 9, 16)`). Category enrichment falls back to `"Umum 🏷️"` due to Category ID mismatch. |

---

### 2.5. Sistem Budgeting Multi-Periode (`app/dashboard/budget/page.tsx`)

| Feature | Status | Real Data Wired? | Issues / Observations |
| :--- | :--- | :--- | :--- |
| **3-Period Switcher** | Implemented | Yes | Toggle tabs for Harian, Mingguan, and Bulanan. |
| **Overview Analytics** | Implemented | Yes | Total Limit, Total Spent, and Budget Health Badge (Aman, Warning, Overbudget). |
| **Telegram Alert Card** | Implemented | Informational | Explains real-time 80% & 100% threshold evaluation. |
| **Budget Progress Cards** | Implemented | Partial | Color-coded progress bar (<80% emerald, 80-99% amber, >=100% rose), remaining amount, and edit button. |
| **Edit Budget Modal** | Implemented | Yes | `POST /api/budgets` with `category_id`, `period`, `amount`. |
| **Critical Data Wiring Gap** | **Broken** | No | `data/tatadana-db.json` has `db.budgets: []`. In `/api/budgets/route.ts`, fallback budget store uses `c-1` to `c-5`, but transactions in ledger use `cat-makan`, `cat-trans`, etc. Consequently, `calculateCategorySpent` cannot match keys, causing `item.spent` to evaluate to 0 across all periods. |

---

### 2.6. Tata AI Assistant (`app/dashboard/tata-ai/page.tsx` & `components/ai/floating-ai-widget.tsx`)

| Feature | Status | Real Data Wired? | Issues / Observations |
| :--- | :--- | :--- | :--- |
| **Interactive Chat Screen** | Implemented | Yes (`POST /api/ai/chat`) | Full conversation history, auto-scroll, message timestamps, multi-engine status badge, reset button. Dispatches `tatadana_transaction_created` event on recorded transactions. |
| **Quick Consultation Chips** | Implemented | Yes | "Analisa Pengeluaran", "Aturan 50/30/20", "Tips Hemat", "Budget Liburan". |
| **Konteks Finansial Card** | **Stubbed / Mock** | **NO** | Lines 280-302 on `tata-ai/page.tsx` display static hardcoded strings: Saldo `Rp10.450.000`, Pemasukan `+Rp15.000.000`, Pengeluaran `-Rp2.850.000`, Boros `Makanan 44%`. It does not query `/api/wallets` or `/api/transactions`! |
| **Floating AI Widget** | Implemented | Yes | Global widget visible across all pages except `/dashboard/tata-ai`. |

---

### 2.7. Pengaturan Akun & Profil (`app/dashboard/settings/page.tsx`)

| Tab | Status | Real Data Wired? | Issues / Observations |
| :--- | :--- | :--- | :--- |
| **Profile Tab** | Implemented | Yes (`/api/profile`, `/api/profile/avatar`) | Dual-mode avatar: 1:1 image file picker with client preview, Upload/Change/Delete photo actions (JPG, PNG, WebP <= 5MB), and 8 built-in emoji avatars (`['🧑‍💼', '👑', '💎', '🎩', '🦊', '🦁', '🚀', '💰']`). Broadcasts `tatadana_profile_updated` for instant layout synchronization. |
| **Telegram Tab** | Implemented | Yes | Shows bot token, active connection status, simulated chat view, and live auto-poll message stream with WIB timestamps. |
| **Reminder Tab** | Implemented | Yes | Configuration for reminder times (12:30 & 20:00 WIB). |
| **Categories Tab** | Implemented | Yes | List of categories with color pills, add category form. |
| **Plan Upgrade Tab** | Implemented | Yes | Pricing cards for Pro Monthly, Pro Yearly, and Pro Lifetime. |

---

### 2.8. Laporan Keuangan (`app/dashboard/laporan/page.tsx`) — *Noticeable Defect*

| Feature | Status | Real Data Wired? | Issues / Observations |
| :--- | :--- | :--- | :--- |
| **Summary & Statistics** | **Mock** | No | Lines 32-43: `summary` object is hardcoded (`totalIncome: 12500000`, `totalExpense: 3850000`, etc.). |
| **Transaction List** | **Mock** | No | Lines 46-123: `transactions` array contains 7 hardcoded static items. |
| **Export Action** | **Fake** | No | Line 145: Uses `setTimeout` and `alert` instead of calling `/api/reports/export`. |
| **Styling** | Inconsistent | - | Uses generic `bg-slate-900/80` and `border-slate-800`. |

---

## 3. Theme Consistency Audit: Luxury Obsidian & Deep Emerald

| Design Token | Specification | Current Implementation | Compliance Status |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `#06090e` | `app/globals.css` defines body `#06090e`. `layout.tsx` specifies `bg-[#080C0A]`. `wallet`, `kalender`, `budget`, `settings` use `#06090e`. | ⚠️ Minor divergence in `layout.tsx` (`#080C0A` vs `#06090e`). |
| **Cards & Panels** | `#0a0f16` / `#0e1622` / `glass-card` | `wallet`, `kalender`, `budget`, `tata-ai`, `settings` correctly use `#0a0f16` and `#080d14`. **`dashboard/page.tsx` and `laporan/page.tsx` heavily use `bg-slate-900/80` and `border-slate-800`**. | ❌ Dashboard & Laporan violate luxury obsidian theme. |
| **Borders** | `#064e3b/40` or `#152332` | `wallet`, `kalender`, `budget` use `border-[#064e3b]/30` and `border-[#152332]`. `dashboard/page.tsx` uses `border-slate-800`. | ⚠️ Inconsistent borders on Dashboard. |
| **Primary Emerald Accent** | `#10b981` | Uniformly utilized across buttons, badges, pulse rings, and income indicators. | ✅ Fully compliant. |
| **Recharts Tooltips** | Obsidian glassmorphism | `page.tsx` hardcodes `#0f172a` and `#334155` (Slate-Blue) for tooltip backgrounds. | ❌ Inconsistent tooltip styling. |

---

## 4. Root Cause Analysis: The Category ID Fragmentation

The single biggest blocker affecting visual data across the Dashboard, Transaksi, Kalender, and Budget pages is **Category ID Fragmentation**:

```
Scheme A (Superadmin / Pre-seeded Transactions):
  'cat-gaji', 'cat-belanja', 'cat-makan', 'cat-trans', 'cat-tagih', 'cat-freelance', 'cat-hiburan'

Scheme B (Dashboard Layout & In-Memory Budget Store):
  'c-1', 'c-2', 'c-3', 'c-4', 'c-5'

Scheme C (User-Created Categories in DB for Wildan Fathan):
  '60ffb874-c3fc-46bf-bb3d-d2413b29bc3a' (Makanan & Minuman)
  '66912659-c4e0-4437-b711-691822c2c528' (Transportasi)
  'cfe9c0be-6914-4576-b008-c29218f55385' (Tagihan & Utilitas)
  '310e0cb5-bb2b-40fe-a336-246f5c98c521' (Belanja)
  '9f1c0812-733d-411c-b476-4f28741578bd' (Gaji Pokok)
```

### Impact Chain:
1. `PersistentStore.getCategories(tx.user_id)` filters categories by `user_id`. For Wildan Fathan, it returns Scheme C UUIDs.
2. Wildan's 25 pre-seeded transactions in `tatadana-db.json` have `category_id` from Scheme A (`cat-makan`, `cat-belanja`, etc.).
3. `LedgerService.enrichTransaction` tries:
   ```ts
   const category = tx.category_id ? categories.find((c) => c.id === tx.category_id) || null : null
   ```
   Because `'cat-makan'` is never found in Scheme C, `tx.category` becomes `null`!
4. **Visual Failures:**
   - **Dashboard Donut Chart:** Collapses into a single `'Lainnya'` slice.
   - **Transaksi Page:** Shows `'🍜 Pengeluaran'` instead of specific category names.
   - **Kalender Drawer:** Shows `'Umum 🏷️'` instead of category details.
   - **Budgeting Page:** `calculateCategorySpent` accumulates by Scheme A keys, while `globalBudgetStore` looks up Scheme B keys. Result: 0% spent.

---

## 5. Actionable Remediation Matrix

| Priority | Component / File | Problem | Required Remediation |
| :---: | :--- | :--- | :--- |
| **P0** | `data/tatadana-db.json` & `lib/db/store.ts` | Category ID Fragmentation | Align pre-seeded transaction `category_id` values with user's actual category IDs, and enhance `PersistentStore.getCategories` to provide system fallback. |
| **P0** | `data/tatadana-db.json` & `/api/budgets/route.ts` | Empty persistent budgets | Seed active budgets for Wildan Fathan across Harian, Mingguan, and Bulanan in `tatadana-db.json` and sync with category IDs. |
| **P0** | `app/dashboard/transaksi/page.tsx` | Ignored `dateFilter` in filter predicate | Implement date range matching in `filtered = transactions.filter(...)` for `today`, `week`, `month`. Add auth header to `fetch`. |
| **P0** | `app/dashboard/wallet/page.tsx` | Empty state displayed only during loading | Move empty state out of `loading && wallets.length === 0` into `!loading && wallets.length === 0`. |
| **P1** | `app/dashboard/tata-ai/page.tsx` | Hardcoded context card | Replace static strings in "Konteks Finansial Pengguna" with dynamic fetch from `/api/wallets` and `/api/transactions`. |
| **P1** | `app/dashboard/laporan/page.tsx` | 100% hardcoded mock data & fake export | Wire summary and transactions to `/api/transactions` and wire export buttons to `/api/reports/export`. |
| **P1** | `app/dashboard/page.tsx` | Slate theme & hardcoded 10-day trend loop | Replace `bg-slate-900/80` and `border-slate-800` with `#0a0f16` and `#152332`. Expand trend line loop to dynamic month days. |
| **P2** | `app/dashboard/layout.tsx` | Background `#080C0A` | Change to canonical `#06090e`. |
| **P2** | `app/dashboard/kalender/page.tsx` & `wallet/page.tsx` | Missing Authorization headers | Add `Authorization: Bearer <token>` to client `fetch` calls. |
