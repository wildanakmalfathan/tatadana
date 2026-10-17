# Project: TataDana Master Implementation (R1 – R15)

## Architecture
TataDana is a production-grade Indonesian Financial SaaS application built on Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase / persistent fallback engine, and multi-channel bots (Telegram & WhatsApp).
The Master Implementation replaces all client-side mocks and in-memory arrays with genuine persistent data storage, single source of truth ledger (`public.transactions`), cryptographic authentication, strict dual-portal login separation, honest external integration status, and an exhaustive 106-test acceptance verification suite.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Persistent Database Engine & SSoT Ledger (R1) | PostgreSQL / Supabase with file-backed JSON/SQLite fallback engine; eliminates in-memory arrays and localStorage; integer rupiah math; cascading foreign keys. | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Auth, Identity Normalization & Cryptographic Hash (R2) | `/api/auth/register` & `/api/auth/login`; lowercase trimmed email; E.164 phone (`+62...`); scrypt/Argon2id password hash; initial `pending_approval` status. | M1 | ORIGINAL_REQUEST §R2 |
| 3 | Dual Login Separation & Admin Portal (R3) | Separate `/login` and `/admin/login`; strictly `wildanakmalfathan@gmail.com` / `081460932853` with Pro Lifetime; HTTP 403 on `/admin/*` and `/api/admin/*`. | M1 | ORIGINAL_REQUEST §R3 |
| 4 | Registration Approval Workflow & WhatsApp Notification (R4) | `/api/admin/approval`; admin queue with Approve/Reject; WhatsApp alert to `081460932853` with signed link; honest unconfigured status check; permanent audit log. | M2 | ORIGINAL_REQUEST §R4 |
| 5 | Real-Time Admin Dashboard & Session Heartbeat (R5) | `/api/auth/heartbeat` updating `last_seen_at`; active users counted within 60-90s window; dynamic stats calculation; user management search/filter/pagination. | M2 | ORIGINAL_REQUEST §R5 |
| 6 | Atomic Financial Transactions & Balance Sync (R6) | Atomic ledger mutations; `idempotency_key` deduplication; edit/delete rollback; Single Source of Truth `public.transactions`. | M1 | ORIGINAL_REQUEST §R6 |
| 7 | Tata AI Bot Financial Assistant (R7) | Indonesian NLP parsing for income/expense ("Gajian 5jt", "Beli makan 25rb"); proactive clarification on ambiguous amounts; identical ledger service. | M3 | ORIGINAL_REQUEST §R7 |
| 8 | Multi-Wallet Management (R8) | Bank BCA/Mandiri/BRI/BNI, e-Wallets, Cash; soft-delete archiving; user_id isolation; default Telegram wallet marker. | M3 | ORIGINAL_REQUEST §R8 |
| 9 | Daily Budget & Interactive Financial Calendar (R9) | Multi-period (Daily, Weekly, Monthly) Asia/Jakarta (WIB); `/dashboard/kalender` grid & drawer breakdown; database column alignment. | M3 | ORIGINAL_REQUEST §R9 |
| 10 | Real Report Export & Download (R10) | `/api/reports/export` generating real downloadable CSV and XLSX/PDF; CSV formula injection defense (`=`, `+`, `-`, `@` prepended with `'`). | M3 | ORIGINAL_REQUEST §R10 |
| 11 | Settings & Account Profile (R11) | Profile name update; avatar file size & MIME type validation; persistent custom categories CRUD. | M3 | ORIGINAL_REQUEST §R11 |
| 12 | Telegram Long Polling & Reminders (R12) | Long Polling daemon (`@danaanananabot`, timeout: 25); deep-link token `/start <token>` linking; scheduled WIB daily reminder with deduplication & backoff. | M2 | ORIGINAL_REQUEST §R12 |
| 13 | Pro Entitlements & Subscription Tiers (R13) | Starter (50 tx/month limit) vs Pro (unlimited); pricing 1 mo Rp19k, 1 yr Rp149k, Lifetime Rp399k; invoice states (`pending_payment`, `paid`, `failed`, `expired`, `cancelled`). | M3 | ORIGINAL_REQUEST §R13 |
| 14 | Luxury Obsidian & Deep Emerald Theme (R14) | Obsidian Black (`#06090e`), Deep Emerald (`#10b981`), Panel (`#080d14`), Border (`#064e3b`); purge legacy slate classes. | M3 | ORIGINAL_REQUEST §R14 |
| 15 | Acceptance Verification Pipeline (R15) | Updated `scripts/verify-all.mjs` running 106 tests across 17 suites (100% pass rate); comprehensive `TEST_READY.md`. | M4 | ORIGINAL_REQUEST §R15 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Backend, Persistent DB & Auth Engine | R1, R2, R3, R6 | none | PLANNED |
| M2 | Admin Modules, Daemons & Notifications | R4, R5, R12 | M1 | PLANNED |
| M3 | Frontend Modules, UI, Tata AI & Reports | R7, R8, R9, R10, R11, R13, R14 | M1 | PLANNED |
| M4 | E2E Master Test Suite & Verification Pipeline | R15 (Tiers 1-5, 106 tests, scripts/verify-all.mjs) | M1, M2, M3 | PLANNED |

## Code Layout Boundaries (Write Ownership)
- **Worker 1 (Backend & DB)**:
  - `lib/db/` — Persistent fallback engine (file-backed JSON store in project data directory) & Supabase client
  - `lib/auth/` — Password hashing (scrypt/PBKDF2), token signing, normalization (E.164, lowercase email)
  - `app/api/auth/register/route.ts` — Registration endpoint with validation and pending_approval
  - `app/api/auth/login/route.ts` — User login endpoint
  - `app/api/auth/admin-login/route.ts` — Dedicated admin login endpoint
  - `app/api/transactions/route.ts` — Complete CRUD with atomic balance sync, idempotency_key, and balance rollback
  - `lib/services/ledger.ts` — Single Source of Truth ledger calculations and integer IDR arithmetic
  - `supabase/migrations/` — Updated SQL migration scripts
- **Worker 2 (Admin & Daemons)**:
  - `app/api/admin/approval/route.ts` — User registration approval/rejection endpoint
  - `app/api/admin/users/route.ts` — Admin user management with pagination & search
  - `app/api/admin/stats/route.ts` — Real-time calculated admin statistics
  - `app/api/auth/heartbeat/route.ts` — Session heartbeat endpoint recording last_seen_at
  - `lib/notifications/whatsapp.ts` — Honest WhatsApp integration status and notification dispatcher
  - `lib/telegram/message-handler.ts` — Deep-link token handling and default wallet routing
  - `app/api/telegram/send-reminder/route.ts` — Daily reminder with deduplication & backoff
  - `app/admin/login/page.tsx` — Dedicated Admin Login Portal
  - `app/admin/users/page.tsx` — Approval action buttons and status filters
- **Worker 3 (Frontend & AI)**:
  - `app/(auth)/login/page.tsx` & `app/(auth)/register/page.tsx` — Connect to backend APIs, remove mock localStorage
  - `app/api/ai/chat/route.ts` — Indonesian NLP transaction parsing & proactive clarification
  - `app/dashboard/tata-ai/page.tsx` & `components/ai/floating-ai-widget.tsx`
  - `app/dashboard/wallet/page.tsx` & `app/api/wallets/route.ts` — Soft-delete archive and modal sync
  - `app/dashboard/kalender/page.tsx` & `app/api/transactions/calendar/route.ts` — Align column names
  - `app/api/reports/export/route.ts` & `app/dashboard/laporan/page.tsx` — Real CSV/PDF export & formula sanitization
  - `app/dashboard/settings/page.tsx` & `app/api/profile/route.ts` — Avatar validation & custom categories
  - `app/dashboard/billing/page.tsx` or plan selector modal — Pro tier selection (1 mo, 1 yr, lifetime)
- **Worker 4 (Test Lead & Verifier)**:
  - `tests/e2e/tier5-master-guardrails.test.mjs` — Master implementation test suite (35 new tests)
  - `tests/e2e/route-health.test.mjs` — Strict status code assertions
  - `scripts/verify-all.mjs` — Verification runner executing all suites (106 tests) and publishing `TEST_READY.md`
