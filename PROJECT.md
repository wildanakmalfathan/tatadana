# Project: TataDana — Master Restoration & System Perfection

## Architecture
TataDana is an enterprise-grade Indonesian Financial SaaS built on Next.js 14 (App Router), TypeScript, Tailwind CSS, local persistent store (`data/tatadana-db.json`), cryptographic session authentication, and Telegram Long-Polling Bot integration.
This master restoration fulfills requirements R1 through R6 via a coordinated team of 5 specialized agents:

1. **Agent 1: Frontend UI/UX & Visual Restoration Specialist (R1)**:
   - Restores Dashboard (`app/dashboard/page.tsx`) with 4 Metric Cards, colorful Donut Chart per category, 6-Month Cash Flow Bar Chart, Daily Trend Line, and Recent Transactions table.
   - Refines Transaction History (`app/dashboard/transaksi/page.tsx`), fixing `dateFilter` logic (Hari Ini, 7 Hari Terakhir, Bulan Ini) and adding category badges.
   - Fixes Wallet page (`app/dashboard/wallet/page.tsx`) empty state branch inversion and removes dummy fallbacks.
   - Connects Laporan page (`app/dashboard/laporan/page.tsx`) to live ledger data and real export `/api/reports/export`.
   - Enforces Luxury Obsidian Black (`#06090e`), Slate Card (`#0a0f16`), Deep Emerald (`#10b981`), and subtle border (`#152332` / `#064e3b`) consistently across all pages.

2. **Agent 2: Database & Ledger Integrity Specialist (R2)**:
   - Unifies Category IDs across transactions and categories in `data/tatadana-db.json` and `lib/db/store.ts`, eliminating the fragmentation that broke category enrichment in `LedgerService`.
   - Fixes wallet balances for user Wildan Fathan (`wildanoces123@gmail.com`) to exactly match R2 requirements: BCA Utama Rp8.500.000, Cash Dompet Rp450.000, GoPay Rp1.500.000 (Total Rp10.450.000).
   - Seeds realistic transaction history corresponding to each wallet (Gaji Pokok, Belanja Bulanan, Makan Siang, Listrik PLN & Wi-Fi, Servis Motor, Pulsa Data).
   - Ensures atomic debit/credit mutation without floating-point error, acting as the Single Source of Truth.

3. **Agent 3: Financial Calendar & Multi-Period Budgeting Specialist (R3 & R4)**:
   - Calendar (`app/dashboard/kalender/page.tsx` & `/api/transactions/calendar`): Interactive month grid with cash flow badges (green income, red expense), click-date drawer with itemized transaction breakdown, and dynamic wallet filtering.
   - Multi-Period Budgeting (`lib/db/store.ts`, `app/api/budgets/route.ts`, `app/dashboard/budget/page.tsx`): Persistent store for budgets supporting Daily, Weekly, and Monthly periods; automatic spent calculation from ledger transactions; dynamic progress bars (<80% green, 80-99% amber, >=100% red).

4. **Agent 4: Tata AI Bot & Telegram Long-Polling Specialist (R5)**:
   - Tata AI Bot (`app/dashboard/tata-ai/page.tsx`, `app/api/ai/chat/route.ts`): Connects left-column financial context card to live metrics; provides intelligent 50/30/20 allocation advice; clarifies ambiguous natural language inputs; commits atomic ledger transactions.
   - Telegram Bot (`scripts/telegram-daemon.mjs`, `app/api/telegram/*`): Maintains active long-polling connection for `@danaanananabot`, dual-writes transactions to `PersistentStore`, and triggers automated Telegram budget limit alerts upon reaching >=80% or 100% threshold.

5. **Agent 5: QA, Bug Elimination & Master Verification Specialist (R6)**:
   - Eliminates edge-case bugs: fixes multipart non-file string handling in `/api/profile/avatar` (returns HTTP 400 instead of 500 TypeError).
   - Harmonizes test assertions in `tests/e2e/challenger-adversarial.test.mjs` and unit suites.
   - Executes master verification runner `scripts/verify-all.mjs`, ensuring 100% test pass rate across all suites.
   - Verifies end-to-end stability and absence of console errors or broken links.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Category ID & Ledger Unification | Unify category IDs between transactions and user categories so `LedgerService` enriches category properly. | M2 (Agent 2) | ORIGINAL_REQUEST §R2 |
| 2 | Wallet Balances & Real Seed Transactions | Set BCA Rp8.5M, Cash Rp450k, GoPay Rp1.5M (Total Rp10.45M) with realistic seed transactions. | M2 (Agent 2) | ORIGINAL_REQUEST §R2 |
| 3 | Single Source of Truth Atomic Sync | Ensure all mutations (web UI, bot, AI) update wallet balance atomically without precision loss. | M2 (Agent 2) | ORIGINAL_REQUEST §R2 |
| 4 | Dashboard Visual Metrics & Charts Restoration | Restore 4 metric cards, colorful Donut Chart, 6-Month Bar Chart, Daily Trend line, Recent Transactions. | M1 (Agent 1) | ORIGINAL_REQUEST §R1 |
| 5 | Transaction History & `dateFilter` Fix | Fix `dateFilter` in `transaksi/page.tsx`, category badges, search, and wallet filters. | M1 (Agent 1) | ORIGINAL_REQUEST §R1 |
| 6 | Wallet Empty State & Clean UI | Fix empty state branch in `wallet/page.tsx`, remove mock fallback transactions. | M1 (Agent 1) | ORIGINAL_REQUEST §R1 |
| 7 | Laporan Real Ledger Data & Export | Replace mock summary & dummy export in `laporan/page.tsx` with live ledger data and `/api/reports/export`. | M1 (Agent 1) | ORIGINAL_REQUEST §R1 |
| 8 | Luxury Obsidian & Deep Emerald Theme | Standardize Obsidian `#06090e`, card `#0a0f16`, border `#152332` / `#064e3b`, accent `#10b981`. | M1 (Agent 1) | ORIGINAL_REQUEST §R1 |
| 9 | Interactive Financial Calendar & Drawer | Month/year grid with green/red badges, interactive click-date drawer, wallet filter in `/dashboard/kalender`. | M3 (Agent 3) | ORIGINAL_REQUEST §R3 |
| 10 | Multi-Period Budget Persistence & Calculation | Add budget store methods to `PersistentStore`, support Daily/Weekly/Monthly, real spent from ledger. | M3 (Agent 3) | ORIGINAL_REQUEST §R4 |
| 11 | Budget Progress & Threshold Status | Display dynamic progress bars (<80% green, 80-99% amber, >=100% red) in `budget/page.tsx`. | M3 (Agent 3) | ORIGINAL_REQUEST §R4 |
| 12 | Dynamic Tata AI Context Card | Bind left sidebar in `tata-ai/page.tsx` to live financial context and metrics. | M4 (Agent 4) | ORIGINAL_REQUEST §R5 |
| 13 | Tata AI 50/30/20 & Natural Transaction Parsing | Provide intelligent 50/30/20 recommendations, proactive clarification, and atomic transaction booking. | M4 (Agent 4) | ORIGINAL_REQUEST §R5 |
| 14 | Telegram Poller Dual-Write & Budget Alerts | Maintain Telegram daemon with dual-write to PersistentStore and auto-alerts on >=80% or 100% budget limit. | M4 (Agent 4) | ORIGINAL_REQUEST §R5 |
| 15 | Bug Elimination & Avatar API Hardening | Fix TypeError 500 in `/api/profile/avatar`, update test assertions, ensure no runtime errors. | M5 (Agent 5) | ORIGINAL_REQUEST §R6 |
| 16 | Master Verification Runner 100% Pass | Run `scripts/verify-all.mjs`, execute all test suites, verify 100% pass rate. | M5 (Agent 5) | ORIGINAL_REQUEST §R6 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M2 | Database & Ledger Integrity (Agent 2) | `lib/db/store.ts`, `data/tatadana-db.json`, `lib/services/ledger.ts`, `/api/wallets/*`, `/api/transactions/*` | Survey | IN_PROGRESS |
| M3 | Calendar & Multi-Period Budgeting (Agent 3) | `app/api/budgets/route.ts`, `app/api/transactions/calendar/route.ts`, `app/dashboard/kalender/*`, `app/dashboard/budget/*` | M2 | PLANNED |
| M1 | Frontend UI/UX & Visual Restoration (Agent 1) | `app/dashboard/page.tsx`, `app/dashboard/transaksi/page.tsx`, `app/dashboard/wallet/page.tsx`, `app/dashboard/laporan/page.tsx` | M2 | PLANNED |
| M4 | Tata AI & Telegram Poller Integration (Agent 4) | `app/dashboard/tata-ai/page.tsx`, `app/api/ai/chat/route.ts`, `scripts/telegram-daemon.mjs`, `lib/telegram/message-handler.ts` | M2, M3 | PLANNED |
| M5 | QA, Bug Elimination & Master Verification (Agent 5) | `app/api/profile/avatar/route.ts`, `tests/*`, `scripts/verify-all.mjs` | M1, M2, M3, M4 | PLANNED |
| M6 | Independent Review, Challenger & Forensic Audit | Reviewers, Challengers, and Forensic Auditor verification | M1, M2, M3, M4, M5 | PLANNED |

## Interface Contracts

### M2 ↔ M1, M3, M4: Ledger & Category Contract
- User Categories in `data/tatadana-db.json` are canonically defined for each user.
- Every transaction `category_id` references a valid category in `PersistentStore.getCategories(user_id)`.
- `LedgerService.getTransactions(user_id)` returns enriched `category: { id, name, emoji, color, type }`.
- Donut chart, Calendar drawer, and Budget calculator can rely on `tx.category.id` and `tx.category.name`.

### M2 ↔ M3: Persistent Budget Contract
- `PersistentStore.getBudgets(user_id)` returns `Array<StoredBudget>`.
- `StoredBudget`: `{ id: string, user_id: string, category_id: string, period: 'daily' | 'weekly' | 'monthly', limit_amount: number, created_at: string, updated_at: string }`.
- `/api/budgets` returns budget items with:
  ```json
  {
    "id": "...",
    "category_id": "...",
    "category_name": "Makanan & Minuman",
    "category_emoji": "🍜",
    "period": "monthly",
    "limit_amount": 2000000,
    "spent_amount": 850000,
    "percentage": 42.5,
    "status": "safe" | "warning" | "danger"
  }
  ```

### M3 ↔ M4: Budget Alert Contract
- When new transaction is recorded (via web, AI, or Telegram), budget evaluator checks spent vs limit.
- If `percentage >= 80%` and `percentage < 100%`: trigger warning alert.
- If `percentage >= 100%`: trigger overbudget alert.

## Code Layout
- `data/tatadana-db.json` — Database store with unified categories, wallets, seed transactions, budgets (M2)
- `lib/db/store.ts` — Persistent store implementation with budget CRUD and atomic mutations (M2, M3)
- `lib/services/ledger.ts` — Ledger service enriching transactions with unified categories (M2)
- `app/api/wallets/route.ts` — Wallet list and creation API (M2)
- `app/api/transactions/route.ts` — Transaction list and creation API (M2)
- `app/api/budgets/route.ts` — Multi-period budget API with dynamic spent calculation (M3)
- `app/api/transactions/calendar/route.ts` — Calendar daily aggregation and itemized drawer API (M3)
- `app/dashboard/kalender/page.tsx` — Financial calendar interactive page with drawer (M3)
- `app/dashboard/budget/page.tsx` — Multi-period budget page with dynamic thresholds (M3)
- `app/dashboard/page.tsx` — Dashboard home with 4 metric cards, Donut Chart, 6-Month Bar Chart, Trend, Recent Tx (M1)
- `app/dashboard/transaksi/page.tsx` — Transaction history with working `dateFilter` and category badges (M1)
- `app/dashboard/wallet/page.tsx` — Multi-wallet cards with fixed empty state and default toggle (M1)
- `app/dashboard/laporan/page.tsx` — Financial report with live ledger data and real export (M1)
- `app/dashboard/tata-ai/page.tsx` — Tata AI chat page with dynamic financial context sidebar (M4)
- `app/api/ai/chat/route.ts` — Tata AI reasoning, clarification, and transaction executor (M4)
- `scripts/telegram-daemon.mjs` — Telegram Long-Polling daemon with dual-write and budget alerts (M4)
- `app/api/profile/avatar/route.ts` — Avatar upload API with fixed TypeError handling (M5)
- `tests/*` — Unit, boundary, adversarial, and E2E test suites (M5)
- `scripts/verify-all.mjs` — Master verification test runner (M5)
