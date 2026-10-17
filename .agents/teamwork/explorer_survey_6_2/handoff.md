# Handoff Report: Explorer 2 (Database & Ledger Integrity Specialist)

## 1. Observation

1. **User Records in `data/tatadana-db.json`:**
   - User `wildan fathan` (`wildanoces123@gmail.com`, ID: `67fb270e-6748-40df-91f8-d055f8f16c15`) exists with `status: "active"`, but has NO `role` or `plan` attributes defined in the JSON object (evaluating to `undefined`).
   - Superadmin `Wildan Akmal Fathan` (`wildanakmalfathan@gmail.com`, ID: `00000000-0000-0000-0000-000000000001`) has `role: "admin"`, `plan: "pro_lifetime"`, and `phone: "+6281460932853"`.

2. **Negative Balance Anomaly (-Rp80.000) & Cross-User Wallet Reference:**
   - In `data/tatadana-db.json`, transaction `a33e73a0-ed38-4ced-9b1d-c4250b42ed14` (amount: 80000, type: "expense", notes: "beli bakso", date: "2026-10-17") is assigned to `user_id: "00000000-0000-0000-0000-000000000001"` (Admin), but points to `wallet_id: "35ed38ca-e9fb-440f-8e4f-f97a7d0beb7f"` (belonging to `wildan fathan`).
   - Before `scripts/populate-user-data.mjs` was executed, `wildan fathan`'s wallet had Rp0 balance; deducting Rp80.000 produced the `-Rp80.000` anomaly.
   - Two orphan transactions (`37d7f81e-eb96-4134-8f0a-904629bb9964` and `5202aea7-5e25-44d1-b05f-247138535c4b`) reference non-existent wallet `'w-1'`.

3. **Wallet Balances vs Ledger Net Cashflow:**
   - `wildan fathan`'s stored wallet balances in `data/tatadana-db.json` are:
     - BCA Utama (`35ed38ca-e9fb-440f-8e4f-f97a7d0beb7f`): Rp 8.500.000
     - Cash Dompet (`ebd718e6-6374-480e-a832-cca9ee9bf0ab`): Rp 450.000
     - GoPay / OVO (`gopay-wildan-fathan-01`): Rp 1.500.000
     - Total: Rp 10.450.000 (Matches R2 target).
   - In `data/tatadana-db.json`, Cash Dompet has 3 expense transactions totaling Rp118.000 and 0 income transactions (net: -Rp118.000).
   - GoPay has 5 expense transactions totaling Rp623.500 and 0 income transactions (net: -Rp623.500).
   - BCA Utama has net cashflow of +Rp63.905.000 due to historical salaries (May-Sept) of Rp66.000.000 and expenses of Rp14.800.000.

4. **Category Foreign Key Mismatch:**
   - In `lib/services/ledger.ts:46-47`:
     `const categories = PersistentStore.getCategories(tx.user_id)`
     `const category = tx.category_id ? categories.find((c) => c.id === tx.category_id) || null : null`
   - In `data/tatadana-db.json`, `wildan fathan`'s 25 transactions use category IDs: `cat-gaji`, `cat-belanja`, `cat-makan`, `cat-trans`, `cat-tagih`, `cat-freelance`, `cat-hiburan`.
   - In `data/tatadana-db.json`, `wildan fathan`'s categories have UUIDs (`60ffb874-c3fc-46bf-bb3d-d2413b29bc3a`, etc.).
   - As a result, `categories.find` returns `null` for 100% of `wildan fathan`'s transactions, causing the Donut Chart, Transaction History, and Calendar to fallback to generic labels ("Lainnya", "Umum").

5. **Budget Multi-Period Persistence in `/api/budgets/route.ts` & `lib/db/store.ts`:**
   - `data/tatadana-db.json` has `"budgets": []`.
   - `lib/db/store.ts` lacks any budget access/persistence methods on `PersistentStore`.
   - `/api/budgets/route.ts` relies on an in-memory variable `globalBudgetStore` populated only for `DEFAULT_USER_ID` with category IDs `'c-1'` to `'c-5'`.
   - For `wildan fathan`, `/api/budgets` returns `data: []` (empty).

6. **Telegram Bot Persistence in `lib/telegram/message-handler.ts`:**
   - `TelegramMessageHandler.saveAndReplyTransaction` (lines 572-605) and `handlePhotoReceipt` (lines 476-519) only call `this.adminClient.from('transactions').insert` and `this.adminClient.from('wallets').update`.
   - `PersistentStore.insertTransaction` is never called. Mutations are not persisted to `data/tatadana-db.json`.

7. **Test Pipeline Execution:**
   - Running `node scripts/verify-all.mjs` completed with:
     `Summary: 115 passed, 0 failed, 115 total (76729ms)`.

---

## 2. Logic Chain

1. **From Observation 1:** Because `wildan fathan` lacks explicit `role` and `plan` fields in `data/tatadana-db.json`, code relying on `user.role` or `user.plan` (e.g. Starter limit checks in `LedgerService.createTransaction`) evaluates to `undefined`, risking unexpected default fallback or permission errors.
2. **From Observation 2:** Admin transaction `a33e73a0-ed38-4ced-9b1d-c4250b42ed14` was inserted with `wallet_id` pointing to `wildan fathan`'s BCA wallet. Because this happened when the wallet had a balance of 0, `0 - 80000 = -80000` created the -Rp80.000 anomaly. While `scripts/populate-user-data.mjs` forced wallet balances to positive values, the faulty transaction still crosses user boundaries.
3. **From Observation 3:** In a true Single Source of Truth ledger, `wallet.balance` must equal starting balance + sum of ledger mutations. Since Cash Dompet and GoPay have expenses but 0 recorded inflow transactions, calling `PersistentStore.computeWalletBalanceFromLedger` yields negative numbers instead of Rp450.000 and Rp1.500.000. Adding opening balance/topup transfers reconciles the ledger mathematically.
4. **From Observation 4:** `scripts/populate-user-data.mjs` used admin category string IDs (`cat-makan`) instead of `wildan fathan`'s actual category UUIDs. Because `LedgerService` isolates categories by `tx.user_id`, category enrichment fails completely (`category: null`). This directly breaks the Donut Chart (`/dashboard`), the Category column in transaction history (`/dashboard/transaksi`), and category tags in calendar (`/dashboard/kalender`).
5. **From Observation 5:** Because `PersistentStore` lacks budget methods and `/api/budgets` stores items in memory for `DEFAULT_USER_ID`, any budget set for `wildan fathan` is lost, and the UI displays an empty budget state.
6. **From Observation 6:** In local environments without live Supabase credentials, Telegram bot mutations do not reach `data/tatadana-db.json`, causing transactions entered via Telegram to never appear on the web dashboard.

---

## 3. Caveats

- **Supabase Cloud State:** We operated exclusively against the local persistent store engine (`data/tatadana-db.json`). If Supabase credentials are provided in `.env.local`, Supabase tables may contain differing state.
- **Historical Salary Assumptions:** The historical transactions (May-Sept 2026) totaling Rp66M income were injected for 6-month bar chart visual appeal. Reconciling BCA Utama's balance to exactly Rp8.5M requires either treating past months as pre-opening historical snapshots or adding an adjustment/savings transfer.

---

## 4. Conclusion

The data layer is functional and passes all 115 test cases in `scripts/verify-all.mjs`, but contains three critical data-integrity flaws:
1. **Broken Category Foreign Keys:** `wildan fathan`'s transactions cannot resolve their categories, breaking UI charts and labels across Dashboard, Transaksi, and Kalender.
2. **Volatile Multi-Period Budgeting:** Budgets are stored in memory only for Superadmin; `wildan fathan` has no budget data and persistence is missing in `tatadana-db.json`.
3. **Ledger Balance Asymmetry & Cross-User Pollution:** Cash and GoPay wallets have expenses with zero inflows, and an admin transaction still crosses into `wildan fathan`'s wallet.

All three flaws can be resolved cleanly without breaking any existing test gates.

---

## 5. Verification Method

1. **Verify Automated Suite (Zero Regressions):**
   ```powershell
   node scripts/verify-all.mjs
   ```
   *Expected:* 115 passed, 0 failed.

2. **Verify Cross-User and Orphan Transactions Removal:**
   ```powershell
   node -e "const db = require('./data/tatadana-db.json'); const wIds = new Set(db.wallets.map(w => w.id)); console.log('Cross-user txs:', db.transactions.filter(t => t.wallet_id && db.wallets.find(w => w.id === t.wallet_id)?.user_id !== t.user_id).length); console.log('Orphan wallet txs:', db.transactions.filter(t => t.wallet_id && !wIds.has(t.wallet_id)).length);"
   ```
   *Expected:* `Cross-user txs: 0`, `Orphan wallet txs: 0`.

3. **Verify Category Enrichment for `wildan fathan`:**
   ```powershell
   node -e "const db = require('./data/tatadana-db.json'); const u = db.users.find(u => u.email === 'wildanoces123@gmail.com'); const uCats = new Set(db.categories.filter(c => c.user_id === u.id).map(c => c.id)); const unmatched = db.transactions.filter(t => t.user_id === u.id && !uCats.has(t.category_id)); console.log('Unmatched category txs:', unmatched.length);"
   ```
   *Expected:* `Unmatched category txs: 0`.
