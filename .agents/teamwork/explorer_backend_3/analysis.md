# TataDana Master Backend & Database Architecture Analysis
**Author:** explorer_backend_3 (Backend Database Architect)  
**Date:** 2026-10-17  
**Scope:** Requirements R1, R2, R3, R6 (Sections C, D, E, F, H, I)  
**Status:** Complete Architectural Investigation & Gap Analysis  

---

## 1. Executive Summary

A comprehensive, read-only architectural investigation was conducted across the TataDana codebase to evaluate readiness against the Master Implementation requirements:
- **R1: Persistent Database & Data Integrity (Sections C & H)**
- **R2: Auth, Registration & Identity Normalization (Sections D & E)**
- **R3: Dual Login Separation & Dedicated Admin Access (Sections D, E & F)**
- **R6: Atomic Financial Transactions & Balance Sync (Section I)**

### Key Findings Summary:
1. **Critical Persistent Fallback & Mock Data Gap (R1)**:
   The application does not possess a true persistent local fallback database. Instead, when Supabase connection parameters are unset or placeholder (`https://placeholder.supabase.co`), the application falls back to ephemeral in-memory JavaScript arrays (`memoryUsers`, `globalWalletsStore`, `globalBudgetStore`), hardcoded template datasets (17 mock calendar transactions, 14 UI mock transactions), and client-side `localStorage`. Data mutations are wiped upon process restart.
2. **Schema & Query Column Mismatches (R1)**:
   The database migration (`supabase/migrations/20261010000001_initial_schema.sql`) declares `transaction_date DATE`, `note TEXT`, and `receipt_url TEXT`. However, application queries and TypeScript interfaces (`types/database.ts`, `app/api/transactions/route.ts`, `lib/services/reports.ts`) query for `date`, `time`, `notes`, `receipt_image_url`, and `is_multi_item`. Furthermore, the `public.users` table lacks `email`, `password_hash`, `status`, and `last_seen_at` columns.
3. **Missing Core Authentication APIs & Client-Side Facade (R2)**:
   The endpoints `/api/auth/register` and `/api/auth/login` do not exist in the codebase. Registration and login pages (`app/(auth)/register/page.tsx` and `app/(auth)/login/page.tsx`) store user credentials and profile state directly into browser `localStorage`, bypass password hashing, omit E.164 phone and lowercase email normalization, and immediately redirect to `/dashboard` without enforcing the required `pending_approval` status.
4. **Vulnerable Admin Security & Missing Dedicated Portal (R3)**:
   There is no separate `/admin/login` page or `/api/auth/admin-login` endpoint. Admin route protection relies on `lib/auth/admin-guard.ts`, which dangerously trusts unauthenticated client HTTP request headers (`x-admin-role: admin`) or JSON body attributes (`admin_role: "admin"`), allowing any caller to bypass authorization. The official admin credentials (`wildanakmalfathan@gmail.com` and `081460932853`) are not configured in the database seed or auth checks.
5. **Missing Transaction Edit/Delete & Mutation Inconsistencies (R6)**:
   The endpoint `/api/transactions/route.ts` only implements `GET` and `POST`. There are no `PUT`, `PATCH`, or `DELETE` handlers. There is zero support for `idempotency_key`. A severe concurrency conflict exists: PostgreSQL trigger `trg_sync_wallet_balance` automatically adjusts wallet balances on mutation, while `lib/telegram/message-handler.ts` concurrently performs non-atomic read-modify-write queries on `wallets`, causing double-counting and race conditions.

---

## 2. Requirement R1: Persistent Database & Data Integrity

### 2.1 Database Schema Audit (`supabase/migrations/20261010000001_initial_schema.sql`)

| Table | SQL Migration Definition | Application Code & TypeScript Expectation | Architectural Gap / Risk |
|---|---|---|---|
| `public.users` | Columns: `id`, `name`, `phone` (unique), `role` ('user'/'admin'), `plan` ('starter'/'pro'), `telegram_chat_id`, `monthly_tx_count`, `tx_count_reset_at`, `reminder_enabled`, `created_at`, `updated_at`. | `types/database.ts` (lines 9-27) & R2/R3 requirements expect `email`, `password_hash`, `status` ('pending_approval', 'approved', 'active', 'rejected', 'suspended'), and `last_seen_at`. | **CRITICAL**: No `email` or `password_hash` column exists in SQL! No `status` column exists for registration approval. Any SQL insert with email or password will fail with `column does not exist`. |
| `public.transactions` | Columns: `id`, `user_id`, `wallet_id`, `destination_wallet_id`, `category_id`, `amount`, `type`, `note`, `transaction_date`, `receipt_url`, `source`, `telegram_message_id`, `raw_input`, `created_at`. | `types/database.ts` (lines 100-121), `app/api/transactions/route.ts` (lines 30-31, 94-95), `lib/services/reports.ts` (line 61-63) query `date`, `time`, `notes`, `receipt_image_url`, `is_multi_item`. | **CRITICAL**: Name mismatch (`transaction_date` vs `date`, `note` vs `notes`). In PostgreSQL, `SELECT date, time, notes FROM transactions` throws error code `42703 (undefined_column)`. |
| `public.transactions` | `amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0)` | Supports numeric rupiah. | Missing `idempotency_key TEXT UNIQUE` column for deduplication. |
| `public.budgets` | Columns: `id`, `user_id`, `category_id`, `amount`, `month`, `year`, `alert_80_sent`, `alert_100_sent`. `UNIQUE(user_id, category_id, month, year)`. | `app/api/budgets/route.ts` (line 15) and `lib/services/budget-alert.ts` (lines 156-160) query `period: 'daily' \| 'weekly' \| 'monthly'`. | **HIGH**: SQL table has no `period` column! Attempting to store multi-period budgets in PostgreSQL will fail or violate unique constraints. |
| Admin Seed | Migration lines 284-308 seeds user `00000000-0000-0000-0000-000000000001` with name `'Wildan Akmal Fathan'`, phone `'+6281234567890'`. | Requirement R3 requires official admin email `wildanakmalfathan@gmail.com` and phone `081460932853` (`+6281460932853`). | **MEDIUM**: Phone number mismatch (`+6281234567890` vs `+6281460932853`) and email is omitted from seed. |

### 2.2 Fallback Engine & Dummy Mock Data Audit

The codebase currently contains extensive dummy mock data in place of a genuine persistent fallback database:

1. **`app/api/admin/admin-store.ts` (lines 47-189)**:
   - Contains hardcoded module-level arrays `memoryUsers` (5 mock users: Dimas Aditya, Rizky Pratama, Siti Rahmawati, Budi Santoso, Wildan Akmal Fathan), `memoryPayments` (4 mock payments), and `memoryAuditLogs` (2 mock logs).
   - All methods (`getUsers`, `updateUser`, `getPayments`, `approvePayment`, `rejectPayment`, `addAuditLog`, `getAuditLogs`) wrap database calls in `try ... catch` and fall back to these arrays.
   - Any state change (e.g. approving a payment) is lost when Next.js worker restarts.
2. **`app/api/wallets/route.ts` (lines 11-54, 94-102, 194-198)**:
   - Contains hardcoded `globalWalletsStore` (BCA Utama, Cash Dompet, GoPay / OVO).
   - If Supabase auth or query fails, it returns this hardcoded array and mutates it in memory.
3. **`app/api/budgets/route.ts` (lines 37-58, 148-173)**:
   - Contains hardcoded `globalBudgetStore` (15 budget items for daily, weekly, monthly).
   - Calculates spent using hardcoded category multipliers (e.g. `c-1: 52500, c-2: 29500`) instead of aggregating from the ledger.
4. **`app/api/transactions/calendar/route.ts` (lines 55-323, 425-427)**:
   - Contains `getFallbackMonthlyTransactions()` with 17 hardcoded template transactions (Gaji PT Digital Finansial, Belanja supermarket, Ayam geprek, Token PLN, Kopi Kenangan, Bensin, Struk Indomaret, etc.).
   - If DB returns empty (even for a genuine new user with 0 transactions!), it injects these 17 fake transactions into the API response!
5. **`app/dashboard/kalender/page.tsx` (lines 11-160)**:
   - Contains `BASE_MOCK_TRANSACTIONS` with 14 hardcoded transactions rendered whenever API fetch fails.
6. **`app/(auth)/login/page.tsx` & `app/(auth)/register/page.tsx`**:
   - Store user authentication state and credentials in `localStorage` without persisting to database.

### 2.3 Single Source of Truth (SSOT) Ledger Integrity

- Requirement R1 mandates: *“Ledger transaksi (`public.transactions`) menjadi satu-satunya sumber kebenaran (Single Source of Truth) untuk seluruh perhitungan saldo wallet, kalender, laporan, dan budget.”*
- Currently, this rule is violated:
  - Wallet balances in `globalWalletsStore` are independent numbers not computed from transaction history.
  - Budget spending in `/api/budgets` uses fake static multipliers when DB queries fail.
  - Calendar cashflows in `/api/transactions/calendar` use a static template instead of computing from `public.transactions`.

---

## 3. Requirement R2: Auth, Registration & Identity Normalization

### 3.1 Route Investigation (`app/api/auth/*`)

A thorough search across `app/api/auth` revealed:
- `app/api/auth/send-otp/route.ts`: Exists (sends OTP for phone verification).
- `app/api/auth/verify-otp/route.ts`: Exists (verifies 6-digit OTP code).
- `app/api/auth/register/route.ts`: **DOES NOT EXIST**.
- `app/api/auth/login/route.ts`: **DOES NOT EXIST**.
- `app/api/auth/admin-login/route.ts`: **DOES NOT EXIST**.
- `app/api/auth/heartbeat/route.ts`: **DOES NOT EXIST**.

### 3.2 Registration Flow Audit (`app/(auth)/register/page.tsx`)

1. **Client-Side Simulation**:
   Lines 63-74 demonstrate that when a user registers:
   ```typescript
   if (typeof window !== 'undefined') {
     localStorage.setItem('tatadana_user_name', fullName)
     localStorage.setItem('tatadana_user_phone', phone)
     localStorage.setItem('tatadana_user_email', email)
     localStorage.setItem('tatadana_user_persona', persona)
     localStorage.setItem('tatadana_user_authenticated', 'true')
   }
   router.push('/dashboard')
   ```
   No database insert occurs for the new user. The user is stored purely in browser storage.
2. **Missing Identity Normalization**:
   - **Email**: No trimming or lowercase conversion (`email.trim().toLowerCase()`). Emails like `User@Domain.COM` and `user@domain.com` are treated inconsistently.
   - **Phone**: Phone number is not normalized using E.164. In `lib/utils/phone.ts`, `normalizeIndonesianPhone(phone)` exists but is NOT invoked by the registration page.
3. **No Password Hashing**:
   - Password is stored neither in hashed form nor in the database.
   - R2 requires: *“Password wajib di-hash menggunakan mekanisme hashing aman (scrypt/PBKDF2/Argon2id dengan salt unik), dilarang menyimpan password dalam bentuk teks biasa di database, log, maupun API response.”*
4. **Approval Status Bypass**:
   - R2 requires: *“Akun yang baru mendaftar otomatis memiliki status `pending_approval` dan dilarang mengakses dashboard privat sebelum disetujui.”*
   - In `register/page.tsx`, the user is immediately routed to `/dashboard`.
   - In `app/dashboard/layout.tsx` (lines 153-160), the layout simply checks `localStorage` and renders the full private dashboard with `isAdmin={true}`.

### 3.3 Login Flow Audit (`app/(auth)/login/page.tsx`)

1. **Email Login Bypass**:
   Lines 154-165:
   ```typescript
   setTimeout(() => {
     if (typeof window !== 'undefined') {
       localStorage.setItem('tatadana_user_email', email)
       localStorage.setItem('tatadana_user_authenticated', 'true')
       localStorage.setItem('tatadana_user_name', 'Wildan Akmal Fathan')
     }
     setSuccessMsg('Berhasil masuk! Mengalihkan ke dashboard...')
     router.push('/dashboard')
   }, 700)
   ```
   Any user entering any random email and password is treated as authenticated and given the name `"Wildan Akmal Fathan"`.
2. **Phone OTP Verification**:
   In `handleVerifyOtp` (lines 109-114), the verify-otp API is called with a hardcoded `userId = '00000000-0000-0000-0000-000000000001'`. If the OTP code equals `'123456'`, it sets `tatadana_user_name = 'Wildan Akmal Fathan'` in `localStorage` and redirects to `/dashboard`.
3. **No Rejection for Pending or Suspended Users**:
   Because no database lookup occurs, users with status `pending_approval`, `rejected`, or `suspended` are not blocked.

---

## 4. Requirement R3: Dual Login Separation & Dedicated Admin Access

### 4.1 Route & Portal Separation Audit

- **User Login (`/login`)**: Located at `app/(auth)/login/page.tsx`.
- **Admin Portal Login (`/admin/login`)**: **DOES NOT EXIST**. There is no admin login page in `app/admin/` or `app/(auth)/`.
- Users and administrators currently share the generic login page, violating R3:
  *“Pemisahan menu login yang jelas: User Login (`/login`) khusus pengguna biasa... Admin Portal Login (`/admin/login`) halaman terpisah khusus administrator dengan proteksi keamanan ekstra.”*

### 4.2 Official Administrator Specification Audit

- Official Administrator Identity defined in prompt:
  - **Email**: `wildanakmalfathan@gmail.com`
  - **Phone / WhatsApp**: `081460932853` (Normalized E.164: `+6281460932853`)
  - **Role**: `admin`
  - **Entitlement**: Pro Lifetime
  - **Policy**: Only this specific identity can obtain the `admin` role. Public registration must never allow creation of admin accounts.
- Codebase check:
  - Neither `wildanakmalfathan@gmail.com` nor `+6281460932853` is present in `supabase/migrations/20261010000001_initial_schema.sql` (migration lines 296-298 contain `+6281234567890` with no email; line 335 references `wildanakmal@tatadana.id`).
  - In `app/api/admin/admin-store.ts` line 104, admin phone is `+6281234567890`.

### 4.3 Admin Route Protection & Security Vulnerabilities

An inspection of `app/admin/layout.tsx` and `lib/auth/admin-guard.ts` revealed severe security gaps:

1. **Unprotected Admin Layout (`app/admin/layout.tsx`)**:
   - The layout contains no authentication checks, no session verification, and no role checks.
   - Navigating directly to `/admin`, `/admin/users`, or `/admin/payments` in a browser renders the superadmin dashboard without prompting for login.
2. **Header-Based Authorization Bypass (`lib/auth/admin-guard.ts`)**:
   Lines 28-56:
   ```typescript
   export async function verifyAdminAuthorization(req: Request, body?: any): Promise<AdminAuthResult> {
     const adminRoleHeader = req.headers.get('x-admin-role')
     const adminIdHeader = req.headers.get('x-admin-id')
     ...
     if (adminRoleHeader === 'admin') {
       return {
         authorized: true,
         adminId: adminIdHeader || SUPERADMIN_ID,
       }
     }
   ```
   Lines 117-128:
   ```typescript
   if (body) {
     if (body.admin_role === 'admin') {
       return {
         authorized: true,
         adminId: body.admin_id || SUPERADMIN_ID,
       }
     }
   ```
   **Security Vulnerability**: Any unauthenticated client or malicious actor can simply pass `x-admin-role: admin` in HTTP headers or `{"admin_role": "admin"}` in JSON body to execute administrative actions (e.g. approve payments, update users, read audit logs).
3. **Missing Next.js Middleware**:
   There is no `middleware.ts` in the project root. Requests to `/admin/*` are not intercepted or validated at the network layer.

---

## 5. Requirement R6: Atomic Financial Transactions & Balance Sync

### 5.1 Transaction Handlers & Method Support (`app/api/transactions/route.ts`)

1. **Missing CRUD Methods**:
   - `GET`: Queries transactions from Supabase (lines 8-41).
   - `POST`: Creates transaction (lines 43-131).
   - `PUT` / `PATCH`: **MISSING**. Users cannot edit existing transactions.
   - `DELETE`: **MISSING**. Users cannot delete transactions.
2. **Missing `idempotency_key`**:
   - `POST` accepts `{ type, amount, walletId, destinationWalletId, categoryId, date, notes }`.
   - No `idempotency_key` is accepted or validated.
   - If a client resends a request (e.g. double-click on submit button), duplicate transactions are inserted into the ledger.

### 5.2 Atomic Balance Sync & Concurrency Conflicts

A critical discrepancy exists between the database trigger and application-level mutation code:

1. **Database Level Trigger (`supabase/migrations/20261010000001_initial_schema.sql` lines 425-484)**:
   ```sql
   CREATE OR REPLACE FUNCTION public.sync_wallet_balance()
   RETURNS TRIGGER AS $$
   BEGIN
     IF TG_OP = 'INSERT' THEN
       IF NEW.type = 'expense' THEN
         UPDATE public.wallets SET balance = balance - NEW.amount WHERE id = NEW.wallet_id;
       ELSIF NEW.type = 'income' THEN
         UPDATE public.wallets SET balance = balance + NEW.amount WHERE id = NEW.wallet_id;
       ELSIF NEW.type = 'transfer' THEN
         UPDATE public.wallets SET balance = balance - NEW.amount WHERE id = NEW.wallet_id;
         UPDATE public.wallets SET balance = balance + NEW.amount WHERE id = NEW.destination_wallet_id;
       END IF;
     ...
     END IF;
   END;
   $$ LANGUAGE plpgsql;
   ```
2. **Application Level Double Mutation (`lib/telegram/message-handler.ts` lines 431-440, 515-526)**:
   ```typescript
   // Insert main transaction
   await this.adminClient.from('transactions').insert({ ... })

   // Explicit update in application layer:
   const prevBalance = Number(defaultWallet.balance) || 0
   const calculatedBalance = prevBalance - ocr.totalAmount
   await this.adminClient
     .from('wallets')
     .update({ balance: calculatedBalance })
     .eq('id', defaultWallet.id)
   ```
   **Defect**:
   - When PostgreSQL triggers are active, the database trigger executes and subtracts `amount` from `wallets.balance`.
   - Then `message-handler.ts` executes an explicit `update({ balance: calculatedBalance })`, which was calculated from `prevBalance` before the insert.
   - If concurrent transactions occur, this pattern results in **lost updates** and race conditions.
   - Conversely, in `/api/transactions/route.ts` (lines 85-106), the route *only* inserts into `transactions` and does NOT perform an application-level wallet update. In fallback mode without PostgreSQL triggers, the wallet balance is never updated!

### 5.3 Rollback & Recalculation Consistency

- When editing or deleting a transaction:
  - If an expense of Rp50.000 is changed to Rp70.000, the wallet balance must atomically adjust by -Rp20.000.
  - If the wallet was changed from BCA to Cash, Rp50.000 must be credited back to BCA and Rp70.000 debited from Cash.
  - If a transaction is deleted, the original amount must be reversed.
  - Because no `PATCH` or `DELETE` endpoints exist, this entire lifecycle is unimplemented in the web API layer.

---

## 6. Comprehensive Defect & Gap Matrix

| ID | Category | Affected File(s) & Lines | Description of Defect / Gap | Severity | Remediation Strategy |
|---|---|---|---|---|---|
| **GAP-01** | R1 (Database) | `supabase/migrations/20261010000001_initial_schema.sql` (lines 25-43) | `public.users` table lacks `email`, `password_hash`, `status`, and `last_seen_at` columns. | **CRITICAL** | Update SQL migration and create migration patch adding these columns with proper constraints and indexes. |
| **GAP-02** | R1 (Database) | `supabase/migrations/...` vs `app/api/transactions/route.ts` (lines 30, 94) & `lib/services/reports.ts` (line 61) | Column name mismatch: Schema defines `transaction_date` and `note`, while application queries `date`, `time`, and `notes`. | **CRITICAL** | Unify column names across SQL schema, TypeScript types (`types/database.ts`), and API query builders. |
| **GAP-03** | R1 (Database) | `supabase/migrations/...` (lines 142-154) vs `app/api/budgets/route.ts` (line 15) | `public.budgets` table lacks `period` ('daily'/'weekly'/'monthly') column. | **HIGH** | Add `period` column and composite unique constraint `(user_id, category_id, period, month, year)` to `public.budgets`. |
| **GAP-04** | R1 (Storage) | `app/api/admin/admin-store.ts`, `app/api/wallets/route.ts`, `app/api/budgets/route.ts` | Fallback relies on ephemeral in-memory arrays (`memoryUsers`, `globalWalletsStore`, `globalBudgetStore`) that reset on process restart. | **CRITICAL** | Implement a file-backed persistent JSON engine (`lib/db/persistent-store.ts`) in `data/tatadana-local-db.json` with thread-safe file operations. |
| **GAP-05** | R1 (Mock Data) | `app/api/transactions/calendar/route.ts` (lines 55-323) & `app/dashboard/kalender/page.tsx` (lines 11-160) | 17 hardcoded template transactions are returned when DB is empty; UI has 14 hardcoded transactions. | **HIGH** | Remove hardcoded template transactions. Return genuine ledger aggregations (0 cashflow if empty). |
| **GAP-06** | R2 (Auth) | `app/api/auth/register/route.ts` | Endpoint does not exist. | **CRITICAL** | Implement `/api/auth/register/route.ts` validating name, email (lowercase trimmed), phone (E.164), password hashing (scrypt/PBKDF2), unique constraints, and initial `pending_approval` status. |
| **GAP-07** | R2 (Auth) | `app/api/auth/login/route.ts` | Endpoint does not exist. | **CRITICAL** | Implement `/api/auth/login/route.ts` validating credentials, rejecting `pending_approval` / `rejected` / `suspended` users with safe error messages, and issuing session cookies/tokens. |
| **GAP-08** | R2 (Auth) | `app/(auth)/register/page.tsx` & `app/(auth)/login/page.tsx` | Client pages bypass server auth and store credentials directly into `localStorage`. | **HIGH** | Refactor registration and login forms to POST to real API endpoints, handle server responses, and eliminate production `localStorage` substitution. |
| **GAP-09** | R2 (Auth) | `lib/auth/phone-otp.ts` & `app/(auth)/register/page.tsx` | No server-side scrypt/PBKDF2 password hashing implementation exists in the codebase. | **HIGH** | Implement `lib/auth/password.ts` using Node.js built-in `crypto.scryptSync` / `crypto.pbkdf2Sync` with cryptographically secure random salt. |
| **GAP-10** | R3 (Admin) | `app/admin/login/page.tsx` & `app/api/auth/admin-login/route.ts` | Dedicated admin login portal does not exist. | **CRITICAL** | Build `/admin/login/page.tsx` and `/api/auth/admin-login/route.ts` dedicated exclusively to administrator authentication. |
| **GAP-11** | R3 (Admin) | `lib/auth/admin-guard.ts` (lines 28-56, 117-128) | Unauthenticated callers can bypass admin authorization by passing `x-admin-role: admin` or `{"admin_role": "admin"}`. | **CRITICAL** | Strip spoofable header/body bypasses. Verify cryptographically signed session tokens or authenticated session cookies. Return HTTP 403 Forbidden on failure. |
| **GAP-12** | R3 (Admin) | `app/admin/layout.tsx` & project root | No Next.js middleware (`middleware.ts`) or layout guards exist to protect `/admin/*` routes. | **CRITICAL** | Implement `middleware.ts` to intercept `/admin/*` routes and redirect non-admin / unauthenticated users to `/admin/login`. |
| **GAP-13** | R3 (Admin) | `supabase/migrations/...` (lines 284-308) & `admin-store.ts` (line 104) | Official admin email (`wildanakmalfathan@gmail.com`) and phone (`081460932853`) are not seeded. | **HIGH** | Update default admin seed with exact official credentials, Pro Lifetime entitlement, and approved status. |
| **GAP-14** | R6 (Transactions) | `app/api/transactions/route.ts` | Route lacks `PUT`, `PATCH`, and `DELETE` handlers. | **CRITICAL** | Implement `PATCH` and `DELETE` on `/api/transactions` supporting atomic rollback of previous balances and budget recalculations. |
| **GAP-15** | R6 (Transactions) | `app/api/transactions/route.ts` & `public.transactions` table | No `idempotency_key` support exists to prevent double-spending or duplicate submission. | **HIGH** | Add `idempotency_key` column to `public.transactions` and enforce unique check in API and database. |
| **GAP-16** | R6 (Transactions) | `lib/telegram/message-handler.ts` (lines 431-440, 515-526) | Double wallet balance mutation conflict between PostgreSQL trigger and manual application updates. | **HIGH** | Standardize balance mutation: either rely strictly on database trigger, or execute a single atomic SQL statement `UPDATE wallets SET balance = balance + delta`. |
| **GAP-17** | R5 (Admin Heartbeat) | `app/api/auth/heartbeat/route.ts` | Route does not exist. | **MEDIUM** | Implement `/api/auth/heartbeat/route.ts` to update `users.last_seen_at` and calculate real-time active users (active in last 60-90s). |

---

## 7. Concrete Architecture & Recommendations

### 7.1 Architecture for Persistent Fallback Database Engine (`lib/db/persistent-store.ts`)
To satisfy R1 without depending on an external cloud Supabase instance, TataDana requires a deterministic, file-backed JSON database engine:
- **File Location**: `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\data\tatadana-db.json`.
- **Concurrency Safety**: Synchronous atomic file writes using temp file rename (`fs.writeFileSync(tmpPath, data); fs.renameSync(tmpPath, realPath)`).
- **Relational Integrity**:
  - `users`: stores `id`, `name`, `email` (unique, lowercase), `phone` (unique, E.164), `password_hash`, `role`, `status`, `plan`, `last_seen_at`, `created_at`.
  - `wallets`: stores `id`, `user_id` (FK cascade), `name`, `type`, `balance` (integer IDR), `is_default`, `is_default_telegram`.
  - `categories`: stores `id`, `user_id` (FK cascade), `name`, `type`, `emoji`, `color`, `budget_amount`.
  - `transactions`: stores `id`, `user_id` (FK cascade), `wallet_id` (FK set null), `destination_wallet_id`, `category_id`, `amount`, `type`, `date`, `time`, `notes`, `source`, `idempotency_key` (unique).
  - `budgets`: stores `id`, `user_id`, `category_id`, `period`, `amount`, `month`, `year`.
  - `audit_logs`: stores `id`, `admin_id`, `action`, `target_user_id`, `reason`, `metadata`, `created_at`.
- **Default Seed**: On initialization, if the database file does not exist, automatically bootstrap:
  - Superadmin User: `id: '00000000-0000-0000-0000-000000000001'`, `name: 'Wildan Akmal Fathan'`, `email: 'wildanakmalfathan@gmail.com'`, `phone: '+6281460932853'`, `role: 'admin'`, `status: 'active'`, `plan: 'pro'`.
  - Superadmin Default Wallets: BCA Utama (`is_default: true`, `is_default_telegram: true`), Cash Tunai, GoPay / OVO.
  - Standard Indonesian Categories (Makanan & Minuman, Transportasi, Tagihan, Belanja, Hiburan, Gaji Pokok, Freelance).

### 7.2 Architecture for Identity Normalization & Password Hashing (`lib/auth/password.ts`)
```typescript
import crypto from 'node:crypto'

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = crypto.scryptSync(password, salt, 64)
  return `scrypt:${salt}:${derivedKey.toString('hex')}`
}

export function verifyPassword(password: string, combinedHash: string): boolean {
  const [algo, salt, storedHash] = combinedHash.split(':')
  if (algo !== 'scrypt' || !salt || !storedHash) return false
  const derivedKey = crypto.scryptSync(password, salt, 64)
  return crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), derivedKey)
}

export function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase()
}
```

### 7.3 Architecture for Dual Login & Route Protection
1. **User Login (`/api/auth/login`)**:
   - Accepts `{ emailOrPhone, password }`.
   - Normalizes identifier (if phone, converts to E.164 via `normalizeIndonesianPhone`; if email, converts to lowercase trimmed).
   - Validates password hash.
   - If `status === 'pending_approval'`: Returns HTTP 403 Forbidden with `{ success: false, message: 'Akun Anda sedang menunggu persetujuan admin. Silakan tunggu konfirmasi melalui WhatsApp.' }`.
   - If `status === 'rejected'`: Returns HTTP 403 Forbidden with `{ success: false, message: 'Pendaftaran akun Anda telah ditolak oleh admin.' }`.
   - If `status === 'suspended'`: Returns HTTP 403 Forbidden with `{ success: false, message: 'Akun Anda telah dinonaktifkan.' }`.
   - On success: Issues session token stored in secure cookie `tatadana_session`.
2. **Admin Login (`/api/auth/admin-login` & `/admin/login`)**:
   - Accepts `{ email, password }`.
   - Normalizes email.
   - Enforces: Email MUST strictly equal `wildanakmalfathan@gmail.com` and user role MUST be `admin`.
   - Validates password hash.
   - On success: Issues admin session token stored in secure cookie `tatadana_admin_session`.
   - On failure: Returns HTTP 403 Forbidden (`{ success: false, message: 'Akses ditolak: Portal ini khusus Administrator resmi TataDana.' }`).
3. **Middleware (`middleware.ts`)**:
   - Intercepts `/admin/*` (except `/admin/login`).
   - If valid admin session cookie is missing: redirects to `/admin/login` or returns HTTP 403.
   - Intercepts `/dashboard/*` (except `/login` and `/register`).
   - If valid user session cookie is missing: redirects to `/login`.

### 7.4 Architecture for Atomic Financial Transactions (`/api/transactions`)
1. **Idempotency Check**:
   - Client sends `idempotency_key` (UUID v4 or nanoid).
   - Backend queries `transactions` where `idempotency_key = key AND user_id = userId`.
   - If existing transaction found: Returns HTTP 200 with existing transaction data without mutating wallet balance again.
2. **Atomic Ledger Balance Sync**:
   - Single atomic ledger entry:
     - Expense: `wallet.balance -= amount`.
     - Income: `wallet.balance += amount`.
     - Transfer: `sourceWallet.balance -= amount`, `destWallet.balance += amount`.
   - Synchronous update committed within the same database transaction / mutex lock.
3. **Full CRUD Handlers**:
   - `PATCH /api/transactions?id=...`:
     1. Retrieve existing transaction.
     2. Atomically reverse original balance mutation on old wallet(s).
     3. Apply new balance mutation on target wallet(s).
     4. Update transaction attributes.
   - `DELETE /api/transactions?id=...`:
     1. Retrieve existing transaction.
     2. Atomically reverse balance mutation.
     3. Delete transaction.
   - Both actions trigger dynamic re-evaluation of budgets and cashflow summaries.

---

## 8. Conclusion

The TataDana codebase possesses modern UI layouts, Tailwind styling, and working Telegram polling/bot integrations. However, the foundational backend and database layer currently exhibits critical architectural deficits:
- Dependence on in-memory mock arrays and browser `localStorage`.
- Absence of real user registration, login, and admin login endpoints.
- Insecure admin route protection relying on client-supplied headers.
- Lack of transaction edit/delete endpoints, idempotency tracking, and atomic balance rollbacks.

Implementing the recommended persistent fallback database engine, cryptographically secure auth services, dedicated admin portal, and atomic ledger synchronization will fully resolve all requirements (R1, R2, R3, R6) and elevate TataDana to a secure, production-grade financial platform.
