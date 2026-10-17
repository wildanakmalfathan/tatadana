# Dispatch: Milestone 2 — Worker 2 (Database & Ledger Integrity Specialist)

## Role & Mission
You are Worker 2 in the 5-agent team for TataDana Master Restoration.
Your mission is to establish the rock-solid data and ledger foundation in `data/tatadana-db.json`, `lib/db/store.ts`, and `lib/services/ledger.ts` according to requirement R2.

## Mandatory Reading
- `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md` (Section ## 2026-10-17T16:59:31Z)
- `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md`
- Survey report: `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_survey_6_2\survey_report.md`
- Survey report: `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_survey_6_1\survey_report.md`

## Specific Tasks
1. **Unify Category IDs in `data/tatadana-db.json`**:
   - In `data/tatadana-db.json`, user Wildan Fathan (`67fb270e-6748-40df-91f8-d055f8f16c15`) has categories with UUIDs (`60ffb874-...`), but transactions use string IDs (`cat-makan`, `cat-belanja`, etc.).
   - Standardize category IDs so that EVERY transaction `category_id` matches an existing category in `categories`. Ensure categories have both standard string IDs or UUID aliases (e.g. `cat-makan`, `cat-belanja`, `cat-trans`, `cat-tagih`, `cat-gaji`, `cat-freelance`, `cat-hiburan`) so `LedgerService.enrichTransaction` successfully attaches the category object `{ id, name, emoji, color, type }`.
2. **Fix Wallet Balances & Real Inflows (R2)**:
   - For user Wildan Fathan (`wildanoces123@gmail.com`):
     - BCA Utama: `Rp8.500.000`
     - Cash Dompet: `Rp450.000`
     - GoPay: `Rp1.500.000`
     - Total Saldo: `Rp10.450.000`
   - Fix the negative anomaly (-Rp80.000 caused by cross-user admin transaction). Ensure no wallets have negative balance.
   - Seed realistic transaction history matching each wallet:
     - Gaji Pokok (BCA Utama inflow)
     - Belanja Bulanan Supermarket (BCA/GoPay outflow)
     - Makan Siang (Cash Dompet outflow)
     - Tagihan Listrik PLN & Wi-Fi (BCA outflow)
     - Servis Motor (Cash outflow)
     - Pulsa Data (GoPay outflow)
   - Ensure the Single Source of Truth ledger matches the wallet balances: transactions sum to the wallet balances!
3. **Enhance `PersistentStore` in `lib/db/store.ts`**:
   - Add `StoredBudget` interface:
     ```ts
     export interface StoredBudget {
       id: string
       user_id: string
       category_id: string
       period: 'daily' | 'weekly' | 'monthly'
       limit_amount: number
       created_at: string
       updated_at: string
     }
     ```
   - Add budget methods to `PersistentStore`: `getBudgets(userId)`, `createBudget(data)`, `updateBudget(id, data)`, `deleteBudget(id)`.
   - Seed default budgets in `data/tatadana-db.json` for Wildan Fathan across main categories (Makanan & Minuman, Transportasi, Tagihan, Belanja Bulanan, Hiburan) for monthly and weekly periods.
4. **Verify Atomic Ledger Mutations**:
   - Ensure `/api/transactions` and `/api/wallets` update wallet balances atomically without floating-point error.
   - Verify `LedgerService` enriches category properly.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Working Directory
`C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_backend_6_2`

## Output
Write `handoff.md` in your working directory and notify orchestrator_6 via `send_message`.


## 2026-10-17T17:14:17Z
[Message] timestamp=2026-10-17T17:14:17Z sender=5726d6dd-154e-43e0-ad89-a3c6411b84ed priority=MESSAGE_PRIORITY_HIGH content=You are Worker 2 (Database & Ledger Integrity Specialist).
Your working directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_backend_6_2

Please read:
- C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md (specifically Section ## 2026-10-17T16:59:31Z)
- C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md
- C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_backend_6_2\DISPATCH.md
- Survey reports in C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_survey_6_2\survey_report.md and explorer_survey_6_1\survey_report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Execute the tasks defined in DISPATCH.md:
1. Unify Category IDs in `data/tatadana-db.json` so every transaction has a category matching `categories` and `LedgerService.enrichTransaction` successfully attaches `{ id, name, emoji, color, type }`.
2. Fix Wildan Fathan's wallet balances to BCA Rp8.500.000, Cash Rp450.000, GoPay Rp1.500.000 (Total Rp10.450.000) with realistic seed transactions matching inflows/outflows for each wallet. Remove negative anomalies.
3. Enhance `PersistentStore` in `lib/db/store.ts` with `StoredBudget` interface and CRUD methods (`getBudgets`, `createBudget`, `updateBudget`, `deleteBudget`), and seed realistic budgets in `data/tatadana-db.json`.
4. Run verification tests (e.g. node -e scripts or unit tests) to confirm ledger integrity and single source of truth.

When completed, write `handoff.md` and send a message back to orchestrator_6.
