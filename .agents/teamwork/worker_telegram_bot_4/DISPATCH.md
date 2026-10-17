# Task Assignment: Agent 4 — Telegram Bot & Automation Specialist Worker

Working directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_telegram_bot_4
Project root: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana
User request file: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md
Spec miner survey report: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\spec_miner_survey_3\survey.md

## Objective
Implement R4 (Perbaikan Auto-Responder Bot Telegram Real-Time Response Fix with long-polling daemon, `scripts/start-telegram-bot.bat`, webhook deletion, message handlers) and R5 Telegram Alert Integration (proactive alerts at >=80% and 100% budget limit).

## Exclusive Write Ownership
You ONLY write/modify these files:
- `scripts/start-telegram-bot.bat`
- `scripts/telegram-daemon.mjs`
- `app/api/telegram/poll/route.ts`
- `lib/telegram/bot-api.ts`
- `lib/telegram/message-handler.ts`
- `lib/services/budget-alert.ts`
- `app/api/transactions/route.ts` (wiring budget alert hook)
DO NOT touch frontend pages, wallet page, budget page, or admin pages.

## Detailed Requirements
1. **Telegram Bot Real-Time Auto-Responder (R4)**:
   - Provide `scripts/telegram-daemon.mjs`:
     - Standalone Node.js daemon that runs alongside Next.js.
     - Calls Telegram `deleteWebhook({ drop_pending_updates: false })` on startup to avoid HTTP 409 Conflict.
     - Performs long-polling (`getUpdates` with `timeout=15` or 1-2s interval).
     - Maintains persistent `offset` so messages are never skipped or processed twice.
     - Forwards updates to `MessageHandler.handleUpdate()` or `/api/telegram/webhook`.
     - Supports graceful shutdown and reconnect on network interruption.
     - Works in local development environment.
   - Provide `scripts/start-telegram-bot.bat`:
     - Double-clickable Windows batch script that launches the background daemon.
   - Ensure `MessageHandler` in `lib/telegram/message-handler.ts` responds instantly to:
     - Text transactions ("beli sate 20rb" -> record expense + show remaining budget).
     - Photo receipt OCR.
     - Voice notes (audio STT).
     - Commands: `/start`, `/saldo`, `/budget`, `/hari_ini`, `/minggu_ini`, `/bulan_ini`, `/bantuan`.
   - Update `app/api/telegram/poll/route.ts` to allow manual polling fallback with automatic webhook cleanup.
2. **Multi-Period Budget Alert Integration (R5)**:
   - Create `lib/services/budget-alert.ts`:
     - Evaluate budget limits for Harian, Mingguan, and Bulanan.
     - On ANY transaction created (via Web `/api/transactions` or via Telegram bot), calculate total spent in that category.
     - If spent >= 80% and < 100%, trigger Telegram warning alert message (e.g. "⚠️ *Peringatan Budget:* Pengeluaran kategori X sudah mencapai 80% (Rp... dari limit Rp...)").
     - If spent >= 100%, trigger Telegram critical alert message (e.g. "🚨 *Overbudget Alert:* Anda telah melebihi batas budget kategori X!").
     - Debounce/track sent alerts so the user is not spammed.
   - Wire `lib/services/budget-alert.ts` into `app/api/transactions/route.ts` and `lib/telegram/message-handler.ts`.

## Verification & Completion Criteria
- Test daemon and poll runner, test budget alert logic, verify syntax and execution.
- Document in `handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.


## 2026-10-16T03:43:07Z
You are Telegram Bot & Automation Specialist Worker (worker_telegram_bot_4).
Your working directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_telegram_bot_4
Project root: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana
User request file: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md
Task assignment: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_telegram_bot_4\DISPATCH.md

Instructions:
1. Read ORIGINAL_REQUEST.md, PROJECT.md, and DISPATCH.md carefully.
2. Implement:
   - R4 Telegram Bot Real-Time Auto-Responder:
     - scripts/telegram-daemon.mjs (standalone long-polling daemon polling getUpdates every 1-2s with deleteWebhook on startup and persistent offset).
     - scripts/start-telegram-bot.bat (Windows batch script to launch the background bot daemon).
     - app/api/telegram/poll/route.ts (support webhook cleanup & manual polling fallback).
     - lib/telegram/message-handler.ts (handle text transactions, photo receipt OCR, voice notes, and commands /start, /saldo, /budget, /hari_ini, /minggu_ini, /bulan_ini, /bantuan).
   - R5 Multi-Period Budget Alert Integration:
     - lib/services/budget-alert.ts (evaluate Harian, Mingguan, Bulanan budget thresholds and dispatch Telegram alert messages at >=80% warning and 100% overbudget).
     - Wire budget alert evaluation into app/api/transactions/route.ts and Telegram transaction handling.
3. Your exclusive write ownership is strictly:
   - scripts/start-telegram-bot.bat
   - scripts/telegram-daemon.mjs
   - app/api/telegram/poll/route.ts
   - lib/telegram/bot-api.ts
   - lib/telegram/message-handler.ts
   - lib/services/budget-alert.ts
   - app/api/transactions/route.ts
   Do NOT touch other files.
4. Verify execution and syntax of daemon and alert service. Document in handoff.md.
5. When finished, send a message to orchestrator with your results.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
