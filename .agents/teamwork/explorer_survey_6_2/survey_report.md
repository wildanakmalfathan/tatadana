# Comprehensive Survey Report: Database & Ledger Integrity Specialist

**Agent:** Explorer 2 (Database & Ledger Integrity Specialist)  
**Date:** 2026-10-18 (WIB)  
**Scope:** Backend Data Layer, Database Persistence (`data/tatadana-db.json`), `lib/db/store.ts`, Wallet Balances, Transaction Ledger Integrity, Atomic Ledger Logic, Calendar Aggregation, and Multi-Period Budgeting.

---

## 1. Executive Summary

This investigation analyzed the backend data layer and database integrity of TataDana, focusing on requirement **R2** (Dompet & Ledger Synchronization) and requirement **R4** (Budgeting Multi-Periode) of the Master Restoration request (`ORIGINAL_REQUEST.md` dated 2026-10-17T16:59:31Z).

### Core Findings Matrix
| Area | Status | Critical Findings |
|---|---|---|
| **User: wildan fathan** (`wildanoces123@gmail.com`) | ⚠️ Partial | Account active, but `role` and `plan` are `undefined` in `tatadana-db.json`. Avatar is uploaded (`.jpg`). |
| **User: Superadmin** (`wildanakmalfathan@gmail.com`) | ✅ Healthy | Admin role, `pro_lifetime` plan, 3 active wallets, scrypt password hash valid. |
| **Negative Balance Anomaly (-Rp80.000)** | 🔍 Root Cause Isolated | An admin transaction (`a33e73a0-ed38-4ced-9b1d-c4250b42ed14`, 80k "beli bakso") referenced `wildan fathan`'s wallet when his balance was 0, resulting in -Rp80.000. `populate-user-data.mjs` recently set positive balances, but the cross-user transaction remains. |
| **Wallet Balances** | ⚠️ Static Match Only | `wildan fathan` currently has BCA Utama (Rp8.500.000), Cash Dompet (Rp450.000), GoPay (Rp1.500.000), Total = Rp10.450.000. However, Cash and GoPay have 0 income/inflow transactions in the ledger, leading to mathematical drift. |
| **Transaction Category Disconnect** | ❌ Severe Bug | All 25 transactions for `wildan fathan` reference admin category IDs (`cat-makan`, `cat-belanja`, etc.) instead of his own category UUIDs. Consequently, `LedgerService.enrichTransaction` resolves category to `null`, breaking Donut Chart, Calendar category badges, and Budget spent metrics. |
| **Budget Multi-Period Persistence** | ❌ Severe Bug | `data/tatadana-db.json` has `"budgets": []`. `PersistentStore` has NO budget methods. `/api/budgets` relies on an in-memory `globalBudgetStore` hardcoded to `DEFAULT_USER_ID` with incompatible category IDs (`c-1` to `c-5`). `wildan fathan` receives 0 budgets. |
| **Telegram Bot Mutation Persistence** | ⚠️ Inconsistency | `TelegramMessageHandler` inserts transactions and updates balances only in Supabase (`adminClient`), never calling `PersistentStore.insertTransaction`. In local/offline mode, Telegram transactions never appear in `data/tatadana-db.json` or the web UI. |
| **Automated Verification Pipeline** | ✅ Passing | `scripts/verify-all.mjs` passes 115/115 tests (100%). Any fixes must maintain this benchmark. |

---

## 2. Deep Dive: Account & Wallet Status

### 2.1. Account Profiles (`data/tatadana-db.json`)

#### 1. Wildan Fathan (`wildanoces123@gmail.com`)
- **ID:** `67fb270e-6748-40df-91f8-d055f8f16c15`
- **Name:** `wildan fathan`
- **Phone:** `+6285643410551`
- **Status:** `active`
- **Role:** `undefined` (Missing key in JSON record; should explicitly be `"user"`)
- **Plan:** `undefined` (Missing key in JSON record; should explicitly be `"pro"` or `"starter"`)
- **Avatar:** `/uploads/avatars/avatar-67fb270e-6748-40df-91f8-d055f8f16c15-1792241319935-a44efb7a.jpg` (`avatar_type: "uploaded"`)
- **Monthly Tx Count:** 15

#### 2. Superadmin (`wildanakmalfathan@gmail.com`)
- **ID:** `00000000-0000-0000-0000-000000000001` (`OFFICIAL_SUPERADMIN_ID`)
- **Name:** `Wildan Akmal Fathan`
- **Phone:** `+6281460932853`
- **Role:** `admin`
- **Plan:** `pro_lifetime`
- **Status:** `active`
- **Avatar:** `💎` (`avatar_type: "emoji"`)
- **Telegram Connected:** `true` (`chat_id: 123456789`)

---

### 2.2. Wallet Balances Inspection

#### `wildan fathan` Wallets:
| Wallet Name | Wallet ID | Type | Stored Balance | Default / Telegram | Account No |
|---|---|---|---|---|---|
| **BCA Utama** | `35ed38ca-e9fb-440f-8e4f-f97a7d0beb7f` | `bank` | **Rp 8.500.000** | `true` / `true` | `1400085412` |
| **Cash Dompet** | `ebd718e6-6374-480e-a832-cca9ee9bf0ab` | `cash` | **Rp 450.000** | `false` / `false` | `Uang Fisik` |
| **GoPay / OVO** | `gopay-wildan-fathan-01` | `ewallet` | **Rp 1.500.000** | `false` / `false` | `085643410551` |
| **Total** | — | — | **Rp 10.450.000** | — | — |

*Observation:* The stored balances match Requirement R2 verbatim (BCA Rp8.500.000, Cash Rp450.000, GoPay Rp1.500.000 = Total Rp10.450.000).

#### Superadmin Wallets:
| Wallet Name | Wallet ID | Type | Stored Balance | Default / Telegram |
|---|---|---|---|---|
| **BCA Utama** | `w-admin-bca` | `bank` | **Rp 188.720.000** | `true` / `true` |
| **Cash Dompet** | `w-admin-cash` | `cash` | **Rp 750.000** | `false` / `false` |
| **GoPay / OVO** | `w-admin-ewallet` | `ewallet` | **Rp 1.250.000** | `false` / `false` |
| **Total** | — | — | **Rp 190.720.000** | — |

---

## 3. The -Rp80.000 Negative Balance Anomaly & Ledger Discrepancies

### 3.1. Root Cause of -Rp80.000
In `data/tatadana-db.json`, transaction `a33e73a0-ed38-4ced-9b1d-c4250b42ed14` was discovered:
```json
{
  "id": "a33e73a0-ed38-4ced-9b1d-c4250b42ed14",
  "user_id": "00000000-0000-0000-0000-000000000001",
  "wallet_id": "35ed38ca-e9fb-440f-8e4f-f97a7d0beb7f",
  "category_id": "60ffb874-c3fc-46bf-bb3d-d2413b29bc3a",
  "amount": 80000,
  "type": "expense",
  "date": "2026-10-17",
  "time": "19:06",
  "notes": "beli bakso",
  "source": "web"
}
```
**Anomalies Identified:**
1. **Cross-User Leakage:** The transaction belongs to Superadmin (`00000000-0000-0000-0000-000000000001`), but its `wallet_id` is `35ed38ca-e9fb-440f-8e4f-f97a7d0beb7f`, which is `wildan fathan`'s BCA Utama wallet!
2. **Negative Balance Trigger:** When `wildan fathan` was first created with 0 balance, this expense deducted Rp80.000 from his wallet, resulting in the `-Rp80.000` balance noted in the user request.
3. **Orphan Wallets:** Two other admin transactions reference a non-existent wallet `w-1`:
   - `37d7f81e-eb96-4134-8f0a-904629bb9964` (Rp25.000, "beli kopi")
   - `5202aea7-5e25-44d1-b05f-247138535c4b` (Rp25.000, "beli kopi")

### 3.2. Ledger vs Stored Balance Mathematical Reconciliation
In `data/tatadana-db.json`, `wildan fathan` has 25 transactions:
- **Total Income:** Rp 81.000.000 (Gaji May-Oct + Freelance)
- **Total Expense:** Rp 17.836.500
- **Net Cashflow:** +Rp 63.163.500

Breaking down by wallet:
1. **Cash Dompet (`ebd718e6-6374-480e-a832-cca9ee9bf0ab`):**
   - Stored Balance: **Rp 450.000**
   - Transactions: 3 expenses (Oct 03: 35k, Oct 16: 38k, Oct 22: 45k = Total Rp118.000).
   - Inflow transactions: **Rp 0**!
   - Pure Ledger Sum: `0 - 118.000 = -Rp118.000` (Discrepancy: Rp568.000).
   - *Fix Needed:* Add an opening balance transaction or transfer from BCA Utama (`amount: 568.000`), so that `568.000 - 118.000 = 450.000`.

2. **GoPay / OVO (`gopay-wildan-fathan-01`):**
   - Stored Balance: **Rp 1.500.000**
   - Transactions: 5 expenses (Oct 05: 150k, Oct 10: 68.5k, Oct 12: 100k, Oct 18: 180k, Oct 25: 125k = Total Rp623.500).
   - Inflow transactions: **Rp 0**!
   - Pure Ledger Sum: `0 - 623.500 = -Rp623.500` (Discrepancy: Rp2.123.500).
   - *Fix Needed:* Add an opening balance/top-up transfer from BCA Utama (`amount: 2.123.500`), so that `2.123.500 - 623.500 = 1.500.000`.

3. **BCA Utama (`35ed38ca-e9fb-440f-8e4f-f97a7d0beb7f`):**
   - Stored Balance: **Rp 8.500.000**
   - Inflows: Rp 81.000.000 (May-Sept historical salaries 66M + Oct 12.5M + Oct freelance 2.5M).
   - Outflows: Rp 17.095.000.
   - Net Ledger: +Rp 63.905.000.
   - *Fix Needed:* Adjust historical entries or provide a balancing transfer/expense so that the Single Source of Truth `computeWalletBalanceFromLedger` matches `w.balance` of Rp8.500.000.

---

## 4. Category Foreign Key Mismatch (Critical Bug)

### 4.1. Observation & Code Evidence
In `lib/services/ledger.ts`:
```typescript
// Line 46-47
const categories = PersistentStore.getCategories(tx.user_id)
const category = tx.category_id ? categories.find((c) => c.id === tx.category_id) || null : null
```
`PersistentStore.getCategories(userId)` returns only categories where `c.user_id === userId`.

In `data/tatadana-db.json`:
- `wildan fathan`'s categories have random UUIDs:
  - `60ffb874-c3fc-46bf-bb3d-d2413b29bc3a` -> Makanan & Minuman
  - `66912659-c4e0-4437-b711-691822c2c528` -> Transportasi
  - `cfe9c0be-6914-4576-b008-c29218f55385` -> Tagihan & Utilitas
  - `310e0cb5-bb2b-40fe-a336-246f5c98c521` -> Belanja
  - `9f1c0812-733d-411c-b476-4f28741578bd` -> Gaji Pokok
- But in `scripts/populate-user-data.mjs`, all transactions were assigned hardcoded string IDs:
  `cat-gaji`, `cat-belanja`, `cat-makan`, `cat-trans`, `cat-tagih`, `cat-freelance`, `cat-hiburan`.
  These IDs belong to Superadmin (`00000000-0000-0000-0000-000000000001`), NOT `wildan fathan`!

### 4.2. Impact on Application
1. **Donut Chart on `/dashboard`:**
   Because `tx.category` is `null`, `app/dashboard/page.tsx:147` executes:
   `const catName = tx.category ? ... : 'Lainnya'`
   All expenses are grouped into a single bucket ("Lainnya") or render empty!
2. **Transaction History on `/dashboard/transaksi`:**
   Shows fallback "🍜 Pengeluaran" instead of real category names and emojis.
3. **Calendar on `/dashboard/kalender`:**
   Shows "Umum" instead of the transaction category.
4. **Missing Categories:**
   `wildan fathan` lacks categories for `Freelance & Bisnis` and `Hiburan`, which are referenced in transactions.

---

## 5. Budgeting Multi-Period Architecture & Persistence Analysis

### 5.1. Observation & Gaps in `/api/budgets/route.ts`
1. **In-Memory Volatility:**
   `app/api/budgets/route.ts` uses an in-memory array `const globalBudgetStore: BudgetStoreItem[] = [...]`.
   It does not read or write to `data/tatadana-db.json`.
2. **Missing `PersistentStore` Methods:**
   In `lib/db/store.ts`, `budgets: StoredBudget[]` is present in `DatabaseSchema`, but there are NO helper methods on `PersistentStore` (e.g. `getBudgets(userId)`, `saveBudget(...)`).
3. **Category ID Incompatibility:**
   `globalBudgetStore` hardcodes category IDs as `'c-1'`, `'c-2'`, `'c-3'`, `'c-4'`, `'c-5'`.
   In `calculateCategorySpent`, transactions are matched via `tx.category_id`. Because transactions have `cat-makan` or UUIDs, the IDs never match, returning 0 spent.
4. **User Isolation Issue:**
   `globalBudgetStore` only seeds items for `DEFAULT_USER_ID`. For `wildan fathan`, `relevantBudgets` is empty `[]`, meaning `wildan fathan` has no budget data displayed on `/dashboard/budget`.

---

## 6. Atomic Mutation Logic Across Modules

### 6.1. Web UI & Transaction API (`/api/transactions/route.ts`)
- **Execution:** Calls `LedgerService.createTransaction`, which delegates to `PersistentStore.insertTransaction`.
- **Integrity:**
  - Enforces pure integer IDR math (`Math.round(Number(amount))`).
  - Supports `idempotency_key` deduplication.
  - Updates `w.balance` atomically in `tatadana-db.json`.
  - Atomically rolls back previous balances on `updateTransaction` and `deleteTransaction`.
  - Fully sound.

### 6.2. Tata AI Chat Assistant (`/api/ai/chat/route.ts`)
- **Execution:** Calls `LedgerService.createTransaction`.
- **Integrity:**
  - Correctly updates `tatadana-db.json` and mutates `w.balance`.
  - Evaluates budget alerts.
  - Fully sound.

### 6.3. Telegram Bot Handler (`lib/telegram/message-handler.ts`)
- **Execution:** Calls `this.adminClient.from('transactions').insert(...)` and `this.adminClient.from('wallets').update(...)`.
- **Discrepancy:**
  - Only writes to Supabase.
  - Never writes to `PersistentStore.insertTransaction` or updates `data/tatadana-db.json`.
  - In local offline development, transactions recorded via Telegram bot are not saved to `data/tatadana-db.json` and do not appear in the web UI.

---

## 7. Recommended Action Plan for Implementers

### Step 1: Fix `wildan fathan` User Record & Categories (`data/tatadana-db.json`)
1. In `data/tatadana-db.json`, add `"role": "user"` and `"plan": "pro"` to `wildan fathan`'s user record.
2. Ensure `wildan fathan` has all 7 standard categories (Makanan & Minuman, Transportasi, Tagihan & Utilitas, Belanja, Hiburan, Gaji Pokok, Freelance & Bisnis).
3. Map transaction `category_id` in `data/tatadana-db.json` to `wildan fathan`'s actual category IDs so `LedgerService.enrichTransaction` properly populates category name, emoji, and color.

### Step 2: Remove Cross-User and Orphan Transactions
1. Fix transaction `a33e73a0-ed38-4ced-9b1d-c4250b42ed14`: change `wallet_id` to Superadmin's BCA wallet (`w-admin-bca`), removing the cross-user reference.
2. Fix orphan transactions `37d7f81e-eb96-4134-8f0a-904629bb9964` and `5202aea7-5e25-44d1-b05f-247138535c4b`: update `wallet_id` from `'w-1'` to `'w-admin-bca'`.

### Step 3: Reconcile Ledger Inflows for Cash and GoPay Wallets
1. Add initial top-up or transfer transactions from BCA Utama to Cash Dompet (Rp568.000) and GoPay (Rp2.123.500) dated 2026-10-01.
2. This ensures `computeWalletBalanceFromLedger` yields exactly Rp8.500.000 (BCA), Rp450.000 (Cash), and Rp1.500.000 (GoPay), achieving true Single Source of Truth integrity.

### Step 4: Add Persistent Budget Engine to `lib/db/store.ts` & `/api/budgets`
1. Add `getBudgets(userId, period?)`, `upsertBudget(...)` methods to `PersistentStore` in `lib/db/store.ts`.
2. Update `/api/budgets/route.ts` to read and write to `PersistentStore` (with Supabase fallback), linking budgets to user's real category IDs.
3. Seed default Multi-Period Budgets for both Superadmin and `wildan fathan` (Daily, Weekly, Monthly) across Makanan, Transportasi, Tagihan, Belanja, and Hiburan.

### Step 5: Dual-Write Telegram Mutations to `PersistentStore`
1. In `lib/telegram/message-handler.ts`, update `saveAndReplyTransaction` and `handlePhotoReceipt` to record transactions in `PersistentStore` as well as Supabase, ensuring full synchronization in localhost environments.

---

## 8. Verification Matrix & Commands
- **Automated Pipeline:** `node scripts/verify-all.mjs` (must maintain 115/115 passed).
- **Data Integrity Audit:**
  ```powershell
  node -e "const db = require('./data/tatadana-db.json'); console.log('Users:', db.users.length, 'Wallets:', db.wallets.length, 'Txs:', db.transactions.length);"
  ```
- **Reconciliation Audit:**
  ```powershell
  node scripts/populate-user-data.mjs
  ```
