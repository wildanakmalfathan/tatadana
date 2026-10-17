# Dispatch: Milestone 1 — Worker 1 (Frontend UI/UX & Visual Restoration Specialist)

## Role & Mission
You are Worker 1 in the 5-agent team for TataDana Master Restoration.
Your mission is to restore the visual aesthetics and interactivity of the TataDana frontend according to requirement R1.

## Mandatory Reading
- `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md` (Section ## 2026-10-17T16:59:31Z)
- `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md`
- Survey report: `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_survey_6_1\survey_report.md`

## File Ownership
You exclusively own and modify:
- `app/dashboard/page.tsx`
- `app/dashboard/transaksi/page.tsx`
- `app/dashboard/wallet/page.tsx`
- `app/dashboard/laporan/page.tsx`
- `app/dashboard/layout.tsx` (styling/background only)

DO NOT modify `lib/db/store.ts` or `data/tatadana-db.json` (owned by Worker 2).

## Specific Tasks
1. **Dashboard Home (`app/dashboard/page.tsx`)**:
   - Ensure the 4 Metric Cards (Saldo Total, Pemasukan Bulan Ini, Pengeluaran Bulan Ini, Budget Tersisa with dynamic progress bar) display properly.
   - Restore colorful Donut Chart per category, 6-Month Cash Flow Bar Chart, and Daily Trend Line.
   - Upgrade theme classes: replace generic `bg-slate-900/80` and `border-slate-800` with Luxury Obsidian (`#06090e`, card `#0a0f16`, border `#152332` / `#064e3b`, emerald accent `#10b981`). Update Recharts tooltip styling to Obsidian theme (`#0a0f16`, border `#152332`).
2. **Transaction History (`app/dashboard/transaksi/page.tsx`)**:
   - Fix the `dateFilter` bug! In the transaction filter expression, ensure `dateFilter` ('all' | 'today' | 'week' | 'month') filters transactions by date properly.
   - Ensure category display uses category name and emoji when available.
   - Add `Authorization: Bearer <token>` in fetch headers from localStorage/cookie.
3. **Wallet Page (`app/dashboard/wallet/page.tsx`)**:
   - Fix the empty state bug: ensure "Belum Ada Dompet" is rendered when `!loading && wallets.length === 0`, and wallets grid is rendered when `wallets.length > 0`.
   - Remove hardcoded mock fallback transactions (`tx-s1`, `tx-s2`, `tx-s3`).
   - Add `Authorization: Bearer <token>` in fetch calls.
4. **Laporan Page (`app/dashboard/laporan/page.tsx`)**:
   - Replace 100% hardcoded mock summary (`12500000`, `3850000`) and fake transactions (`tx-1`..`tx-7`) with live data from `/api/transactions` and `/api/wallets`.
   - Wire the export button to download real files via `/api/reports/export?format=csv` (and xlsx/pdf) instead of the fake `setTimeout` alert.
   - Standardize Luxury Obsidian theme.
5. **Dashboard Layout (`app/dashboard/layout.tsx`)**:
   - Ensure canonical background `#06090e` is applied.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Working Directory
`C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_frontend_6_1`

## Output
Write `handoff.md` in your working directory and notify orchestrator_6 via `send_message`.


## 2026-10-17T17:14:37Z
You are Worker 1 (Frontend UI/UX Specialist).
Your working directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_frontend_6_1

Please read:
- C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md (specifically Section ## 2026-10-17T16:59:31Z)
- C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md
- C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\worker_frontend_6_1\DISPATCH.md
- Survey report: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_survey_6_1\survey_report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Execute the tasks defined in DISPATCH.md:
1. `app/dashboard/page.tsx`: 4 Metric cards, colorful Donut chart, 6-Month Bar chart, daily trend line, theme classes to Luxury Obsidian (#06090e, card #0a0f16, border #152332 / #064e3b, emerald accent #10b981), Recharts tooltip obsidian theme.
2. `app/dashboard/transaksi/page.tsx`: Fix `dateFilter` bug so today/week/month actually filters, add category badges, add Bearer auth header in fetch.
3. `app/dashboard/wallet/page.tsx`: Fix empty state rendering bug, remove dummy fallback transactions, add Bearer auth.
4. `app/dashboard/laporan/page.tsx`: Replace mock summary & transactions with live ledger data, connect export button to real `/api/reports/export`.
5. `app/dashboard/layout.tsx`: Canonical theme background `#06090e`.

Build/verify your UI changes. When done, write `handoff.md` and send a message back to orchestrator_6.
