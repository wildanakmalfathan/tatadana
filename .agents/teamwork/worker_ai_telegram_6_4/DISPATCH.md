# Dispatch: Milestone 4 — Worker 4 (Tata AI & Telegram Integration Specialist)

## Role & Mission
You are Worker 4 in the 5-agent team for TataDana Master Restoration.
Your mission is to integrate Tata AI Bot and Telegram Long-Polling Bot with live user financial context and budget alerts according to requirement R5.

## Mandatory Reading
- `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md` (Section ## 2026-10-17T16:59:31Z)
- `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md`
- Survey report: `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_survey_6_3\survey_report.md`
- Survey report: `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_survey_6_1\survey_report.md`

## File Ownership
You exclusively own and modify:
- `app/dashboard/tata-ai/page.tsx`
- `app/api/ai/chat/route.ts`
- `scripts/telegram-daemon.mjs`
- `lib/telegram/message-handler.ts`

DO NOT touch `lib/db/store.ts` or `data/tatadana-db.json` directly.

## Specific Tasks
1. **Dynamic Financial Context in Tata AI UI (`app/dashboard/tata-ai/page.tsx`)**:
   - In `app/dashboard/tata-ai/page.tsx` (lines 280-302), replace the static hardcoded values (`Rp10.450.000`, `+Rp15.000.000`, `-Rp2.850.000`, `Makanan (44%)`) with real dynamic state loaded from `/api/dashboard/metrics` or `/api/wallets` and `/api/transactions`!
   - Ensure the context card updates when new transactions are logged.
   - Maintain Luxury Obsidian & Deep Emerald theme.
2. **Tata AI Chat Backend (`app/api/ai/chat/route.ts`)**:
   - Verify that Tata AI reads live context (total balance, income, biggest expense).
   - Ensure 50/30/20 budget recommendation prompt is solutif and polite Indonesian.
   - Ensure clarification logic for ambiguous transactions works as expected.
   - Ensure executed transactions are booked via standard ledger service.
3. **Telegram Long-Polling & Budget Alert Integration (`scripts/telegram-daemon.mjs`, `lib/telegram/message-handler.ts`)**:
   - Ensure Telegram poller maintains offset and handles text, receipt OCR, voice notes, and slash commands (`/saldo`, `/budget`, `/hari_ini`).
   - Ensure when transactions are booked via Telegram, the system checks budget threshold (>=80% warning, >=100% danger) and triggers an automated reply/alert if threshold is reached.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Working Directory
`C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_ai_telegram_6_4`

## Output
Write `handoff.md` in your working directory and notify orchestrator_6 via `send_message`.


## 2026-10-17T17:14:55Z
Received dispatch from 5726d6dd-154e-43e0-ad89-a3c6411b84ed:
You are Worker 4 (Tata AI & Telegram Integration Specialist).
Your working directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_ai_telegram_6_4

Please read:
- C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md (specifically Section ## 2026-10-17T16:59:31Z)
- C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md
- C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_ai_telegram_6_4\DISPATCH.md
- Survey reports: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_survey_6_3\survey_report.md and explorer_survey_6_1\survey_report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Execute the tasks defined in DISPATCH.md:
1. `app/dashboard/tata-ai/page.tsx`: Replace static hardcoded context card values (lines 280-302) with live dynamic data loaded from APIs.
2. `app/api/ai/chat/route.ts`: Ensure dynamic context, 50/30/20 advice, clarification of ambiguous transactions, and atomic ledger write.
3. `scripts/telegram-daemon.mjs` & `lib/telegram/message-handler.ts`: Ensure polling stability, receipt OCR, voice note, slash commands, and budget alert triggers on >=80% or 100% threshold.

Verify your changes. When done, write `handoff.md` and send a message back to orchestrator_6.
