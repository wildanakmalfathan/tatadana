# Dispatch: Milestone 3 — Worker 3 (Financial Calendar & Multi-Period Budgeting Specialist)

## Role & Mission
You are Worker 3 in the 5-agent team for TataDana Master Restoration.
Your mission is to implement and polish the Financial Calendar with interactive transaction drawer and the Multi-Period Budgeting system according to requirements R3 and R4.

## Mandatory Reading
- `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md` (Section ## 2026-10-17T16:59:31Z)
- `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md`
- Survey report: `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_survey_6_1\survey_report.md`
- Survey report: `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_survey_6_2\survey_report.md`

## File Ownership
You exclusively own and modify:
- `app/dashboard/kalender/page.tsx`
- `app/api/transactions/calendar/route.ts`
- `app/dashboard/budget/page.tsx`
- `app/api/budgets/route.ts`

DO NOT modify `lib/db/store.ts` or `data/tatadana-db.json` directly (owned by Worker 2).

## Specific Tasks
1. **Financial Calendar UI (`app/dashboard/kalender/page.tsx`)**:
   - Monthly and yearly grid navigation with cash flow badges (green total pemasukan, red total pengeluaran).
   - Interactive date click: opens a drawer/modal showing full itemized transaction list for that day (nominal, time WIB, category with emoji, wallet, notes).
   - Multi-wallet filter (Semua, BCA Utama, Cash Dompet, GoPay) instantly recalculating and updating the calendar numbers.
   - Include `Authorization: Bearer <token>` in fetch headers from localStorage/cookie.
   - Apply Luxury Obsidian Black & Deep Emerald Green styling.
2. **Calendar API (`app/api/transactions/calendar/route.ts`)**:
   - Ensure it returns daily cashflow aggregations and itemized transactions with enriched category information (emoji, name) and wallet name.
3. **Multi-Period Budgeting UI (`app/dashboard/budget/page.tsx`)**:
   - Provide toggle tabs for 3 periods: **Harian (Daily)**, **Mingguan (Weekly)**, and **Bulanan (Monthly)**.
   - Limit per category (Makanan & Minuman, Transportasi, Tagihan, Belanja Bulanan, Hiburan).
   - Dynamic progress bars: Safe (<80% emerald green), Warning (80-99% amber), Overbudget (>=100% red).
   - Include modal to add/edit budget limits.
   - Include `Authorization: Bearer <token>`.
4. **Budget API (`app/api/budgets/route.ts`)**:
   - Read budgets via `PersistentStore.getBudgets(userId)` (with sensible category defaults if empty).
   - Dynamically compute `spent_amount` from ledger transactions matching the category and date range corresponding to the period (daily, weekly, monthly in WIB).
   - Return `{ id, category_id, category_name, category_emoji, period, limit_amount, spent_amount, percentage, status }`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Working Directory
`C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_calendar_budget_6_3`

## Output
Write `handoff.md` in your working directory and notify orchestrator_6 via `send_message`.


## 2026-10-17T17:15:11Z
[Message] timestamp=2026-10-17T17:15:11Z sender=5726d6dd-154e-43e0-ad89-a3c6411b84ed priority=MESSAGE_PRIORITY_HIGH
content=You are Worker 3 (Financial Calendar & Multi-Period Budgeting Specialist).
Your working directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_calendar_budget_6_3

Please read:
- C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md (specifically Section ## 2026-10-17T16:59:31Z)
- C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md
- C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_calendar_budget_6_3\DISPATCH.md
- Survey reports: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_survey_6_1\survey_report.md and explorer_survey_6_2\survey_report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Execute the tasks defined in DISPATCH.md:
1. `app/dashboard/kalender/page.tsx` & `app/api/transactions/calendar/route.ts`: Interactive calendar grid with income/expense badges, click-date drawer with detailed transaction breakdown, dynamic wallet filter, Bearer token auth, Luxury Obsidian styling.
2. `app/dashboard/budget/page.tsx` & `app/api/budgets/route.ts`: Multi-period budget (Daily, Weekly, Monthly) with dynamic progress bars (<80% green, 80-99% amber, >=100% red), dynamic spent calculation from transactions ledger, Bearer auth.

Verify your changes. When done, write `handoff.md` and send a message back to orchestrator_6.
