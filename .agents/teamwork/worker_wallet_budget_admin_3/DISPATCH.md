# Task Assignment: Agent 3 — Wallet, Budget & Admin Specialist Worker

Working directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_wallet_budget_admin_3
Project root: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana
User request file: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md

## Objective
Implement R3 (Multi-Wallet Management with API persistence, account/phone number, default Telegram wallet, edit, transaction drawer), R5 (Multi-Period Budgeting UI & API for Harian, Mingguan, Bulanan), and R6 (Functional Admin Approval for Payments & User status management).

## Exclusive Write Ownership
You ONLY write/modify these files:
- `types/database.ts` (adding `account_number`, `is_default_telegram` to Wallet; `period` to Budget)
- `app/dashboard/wallet/page.tsx`
- `app/api/wallets/route.ts`
- `app/dashboard/budget/page.tsx`
- `app/api/budgets/route.ts`
- `app/admin/payments/page.tsx`
- `app/admin/users/page.tsx`
- `app/api/admin/payments/route.ts`
- `app/api/admin/payments/approve/route.ts`
- `app/api/admin/payments/reject/route.ts`
- `app/api/admin/users/route.ts`
- `app/api/admin/audit-logs/route.ts`
DO NOT modify calendar files, tata-ai files, telegram daemon scripts, or budget-alert service.

## Detailed Requirements
1. **Multi-Wallet (R3)**:
   - Update `types/database.ts` with `account_number?: string`, `is_default_telegram?: boolean`.
   - Update `app/api/wallets/route.ts` to accept `account_number` and `is_default_telegram`.
   - Upgrade `app/dashboard/wallet/page.tsx` from `useState` mock to live API calls (`/api/wallets`).
   - "Tambah Dompet Baru" modal with fields: Nama Dompet, Jenis (Bank BCA/Mandiri/BRI/BNI, E-Wallet GoPay/OVO/Dana, Cash Tunai), Saldo Awal, Nomor Rekening / Nomor HP.
   - Action buttons: "Jadikan Default Telegram", edit saldo/nama modal, and transaction history drawer per wallet.
2. **Multi-Period Budgeting (R5)**:
   - Create `/api/budgets/route.ts` supporting `GET` (by `?period=daily|weekly|monthly`) and `POST`/`PUT` (save limits per category and period). Compute spent amounts dynamically.
   - Upgrade `app/dashboard/budget/page.tsx`:
     - Toggle 3 periods: **Harian**, **Mingguan**, **Bulanan**.
     - Set budget limits per category for each period (e.g. Makanan Rp75rb/hari or Rp500rb/minggu or Rp2jt/bulan).
     - Dynamic progress bars with color indicators: Aman (<80% green), 80-99% amber, Overbudget (>=100% red).
     - Connect to live `/api/budgets`.
3. **Admin Approval Module (R6)**:
   - Create backend routes:
     - `GET /api/admin/payments`: list pending & confirmed payments.
     - `POST /api/admin/payments/approve`: approves payment (Midtrans pending or manual transfer), upgrades user to Pro (`profiles.plan = 'pro'`), writes audit log (`audit_logs`).
     - `POST /api/admin/payments/reject`: marks payment rejected, writes audit log.
     - `GET & PATCH /api/admin/users`: view users, toggle status (Aktif/Suspended/Pro).
     - `GET /api/admin/audit-logs`: view audit logs.
   - Update `app/admin/payments/page.tsx`: live Approve / Reject buttons that call `/api/admin/payments/approve` and `/reject`, update UI immediately, and confirm upgrade.
   - Update `app/admin/users/page.tsx`: instant status switch (Aktif / Suspended) and plan modifier (Starter / Pro).
4. **Theme Consistency (R7)**:
   - Use Luxury Obsidian Black & Deep Emerald Green tokens (`#06090e`, `#10b981`, `#080d14`, `#064e3b`).

## Verification & Completion Criteria
- Test endpoints and pages. Ensure all routes compile without errors and fulfill R3, R5, R6.
- Document in `handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.


## 2026-10-16T03:43:07Z
You are Wallet, Budget & Admin Specialist Worker (worker_wallet_budget_admin_3).
Your working directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_wallet_budget_admin_3
Project root: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana
User request file: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md
Task assignment: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_wallet_budget_admin_3\DISPATCH.md

Instructions:
1. Read ORIGINAL_REQUEST.md, PROJECT.md, and DISPATCH.md carefully.
2. Implement:
   - R3 Multi-Wallet: types/database.ts (account_number, is_default_telegram), app/api/wallets/route.ts, app/dashboard/wallet/page.tsx (live API persistence, add wallet modal with account/phone, set default Telegram, edit, transaction history drawer).
   - R5 Multi-Period Budgeting: app/api/budgets/route.ts, app/dashboard/budget/page.tsx (3-period toggle Harian, Mingguan, Bulanan, category limit setup, dynamic progress bars).
   - R6 Admin Approval: app/api/admin/payments/route.ts, app/api/admin/payments/approve/route.ts, app/api/admin/payments/reject/route.ts, app/api/admin/users/route.ts, app/api/admin/audit-logs/route.ts, app/admin/payments/page.tsx (Approve/Reject actions, upgrade to Pro), app/admin/users/page.tsx (Aktif/Suspended/Pro toggle).
3. Apply Luxury Obsidian & Emerald design (#06090e, #10b981, #080d14, #064e3b).
4. Your exclusive write ownership is strictly:
   - types/database.ts
   - app/dashboard/wallet/page.tsx
   - app/api/wallets/route.ts
   - app/dashboard/budget/page.tsx
   - app/api/budgets/route.ts
   - app/admin/payments/page.tsx
   - app/admin/users/page.tsx
   - app/api/admin/*
   Do NOT touch other files.
5. Verify build/typecheck and test all endpoints and pages. Document in handoff.md.
6. When finished, send a message to orchestrator with your results.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
