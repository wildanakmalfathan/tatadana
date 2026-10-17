# Dispatch: Remediation Specialist (worker_remediation_6_1)

## Identity & Context
- Role: Remediation Specialist
- Working Directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_remediation_6_1
- Project Root: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana
- Original Request File: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md (Refer to section ## 2026-10-17T16:59:31Z)
- Scope Document: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md
- Reviewer 1 Findings: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\reviewer_master_1\handoff.md
- Challenger 1 Findings: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\challenger_master_1\handoff.md

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Owned Files (Strict Boundaries)
- `lib/services/ledger.ts`
- `lib/db/store.ts`
- `lib/ai/multi-provider.ts`
- `data/tatadana-db.json`

## Objectives & Remediation Tasks
1. **Wallet Ownership Validation (Prevent Cross-User Mutations & Orphan Wallets)**:
   - In `lib/services/ledger.ts:createTransaction`:
     Validate that `txData.wallet_id` belongs to `txData.user_id`:
     ```typescript
     if (txData.wallet_id) {
       const wallet = PersistentStore.getWalletById(txData.wallet_id, txData.user_id)
       if (!wallet) {
         throw new Error('Dompet tidak ditemukan atau bukan milik pengguna')
       }
     }
     if (txData.destination_wallet_id) {
       const destWallet = PersistentStore.getWalletById(txData.destination_wallet_id, txData.user_id)
       if (!destWallet) {
         throw new Error('Dompet tujuan tidak ditemukan atau bukan milik pengguna')
       }
     }
     ```
   - In `lib/db/store.ts:insertTransaction`:
     When updating `w.balance`, strictly verify `item.id === newTx.wallet_id && item.user_id === newTx.user_id`. Do NOT debit a wallet if the user does not own it.

2. **Tata AI Number Extraction Robustness (`lib/ai/multi-provider.ts:parseIndonesianNumber`)**:
   - Inspect `parseIndonesianNumber`. When input contains sentence text with numbers (e.g. timestamps like "1792259973390" in wallet names or notes), stripping all non-digits concatenates them into gigantic 18-digit numbers (`350001792259973400`), corrupting wallet balances.
   - Refactor `parseIndonesianNumber` to extract the amount token specifically (e.g. matching currency patterns `(?:rp\.?|sebesar|sejumlah|\b)\s*(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta|m|miliar)?\b` or isolating the financial nominal) instead of stripping non-digits from the entire string.

3. **Data Hygiene & SSoT Reconciliation in `data/tatadana-db.json`**:
   - Remove/sanitize the two corrupt test wallets with negative `-3.5e17` balances.
   - Remove/reassign cross-user transaction `eea26e51-f088-406f-8cb1-e1cd48016939` and orphan transaction `e10be9f8-d728-42f1-9ca7-44e48b257366`.
   - Reconcile `wildan fathan` (`wildanoces123@gmail.com`):
     - BCA Utama (`35ed38ca-e9fb-440f-8e4f-f97a7d0beb7f`): balance = `8500000`
     - Cash Dompet (`ebd718e6-6374-480e-a832-cca9ee9bf0ab`): balance = `450000`
     - GoPay / OVO (`gopay-wildan-fathan-01`): balance = `1500000`
     - Total: exactly `10450000`.
     - Remove the test transactions created during live test runs (e.g. "pengeluaran 25rb bakso" and "beli kopi susu 5rb") from Wildan Fathan so `computeWalletBalanceFromLedger(walletId, 0)` produces exactly 0 diff for all 3 wallets.

4. **Empirical Verification**:
   - Run Challenger 1's test script:
     ```powershell
     node .agents/teamwork/challenger_master_1/test-mandate1.mjs
     ```
     (Must pass 100% with 0 failures!)
   - Run the master verification suite:
     ```powershell
     node scripts/verify-all.mjs
     ```
     (Must report 115 passed, 0 failed).

5. **Deliverables**:
   - Write `handoff.md` in `worker_remediation_6_1`.
   - Send completion message to orchestrator.


## 2026-10-17T18:16:18Z
You are the Remediation Specialist for the TataDana Master Restoration project.
Working Directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_remediation_6_1
Project Root: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana
Dispatch Instructions: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_remediation_6_1\DISPATCH.md
Scope Document: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md
Original Request File: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md (Mandatory: Read section ## 2026-10-17T16:59:31Z)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Tasks:
1. In lib/services/ledger.ts:createTransaction and lib/db/store.ts:insertTransaction, add strict wallet ownership validation: verify wallet_id exists and belongs to user_id.
2. In lib/ai/multi-provider.ts:parseIndonesianNumber, fix number extraction so sentence timestamps or extraneous numbers are not concatenated into huge 18-digit transaction amounts.
3. In data/tatadana-db.json, clean up the 2 negative test wallets, remove cross-user tx eea26e51 and orphan tx e10be9f8, and restore Wildan Fathan's BCA balance to 8.500.000 (total 10.450.000, SSoT diff 0).
4. Run `node .agents/teamwork/challenger_master_1/test-mandate1.mjs` and `node scripts/verify-all.mjs`.
5. Deliver handoff.md and send message to orchestrator upon completion.
