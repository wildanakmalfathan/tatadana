# Handoff Report: Telegram Bot Real-Time Auto-Responder & Multi-Period Budget Alert System (R4 & R5)

**Agent:** Telegram and Integration Spec Miner (`spec_miner_survey_3`)  
**Target:** Orchestrator & Implementation Agents  
**Date:** 2026-10-16  

---

## 1. Observation

1. **Existing Telegram Bot Scripts & Background Runners:**
   - In `start-dev.bat`, line 9 executes only `npm run dev`. No Telegram poller or daemon is initiated.
   - `scripts/start-telegram-bot.bat` does not exist in the repository (confirmed via `find_by_name` across `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana`).
   - No daemon process exists in `scripts/` (the entire `scripts/` folder does not exist yet).

2. **Telegram Polling Endpoint Implementation:**
   - In `app/api/telegram/poll/route.ts`:
     - Line 8: `let lastUpdateOffset = 0` (in-memory variable in route module; resets upon any hot-reload).
     - Lines 15–20: Rejects any token containing `'placeholder'`, which is the default in `.env.local` (`TELEGRAM_BOT_TOKEN=7777777777:AAHk_placeholder_token_tatadana`).
     - Line 23: `const updatesRes = await botApi.getUpdates(lastUpdateOffset ? lastUpdateOffset + 1 : undefined, 10, 0)`. The `timeout` argument is `0` (short-polling), returning immediately rather than holding the connection open.
     - Does not call `deleteWebhook()`. If a webhook was ever active, Telegram returns `409 Conflict: can't use getUpdates method while webhook is active`.

3. **Current User Interaction in UI:**
   - In `app/dashboard/settings/page.tsx` lines 103–127, the only way Telegram updates are pulled in development is when the user manually clicks the `"Periksa Pesan Baru"` button, which executes `fetch('/api/telegram/poll?token=...')`. When idle, incoming messages are never processed.

4. **Telegram Message Handlers (`lib/telegram/message-handler.ts`):**
   - Text transactions are routed via `handleTextTransaction` (lines 238–268), parsed via `MultiAIProviderService.parseNaturalLanguageTransaction` or fallback `heuristicTextParse` (supporting slang like `"15rb"`, `"500k"`), and saved with `saveAndReplyTransaction`.
   - Photo receipts are handled via `handlePhotoReceipt` (lines 347–444) for Pro users, using Vision OCR.
   - Voice notes are handled via `handleVoiceNote` (lines 273–342), limited to 60s, transcribed via Whisper/Gemini.
   - Commands handled: `/start`, `/saldo`, `/budget`, `/hari_ini` (and `/hari ini`), `/minggu_ini` (and `/minggu ini`), `/bulan_ini` (and `/bulan ini`), `/bantuan`, and `/sheet`.

5. **Budget Architecture & Alerts:**
   - In `app/api/transactions/route.ts` lines 84–111, when a transaction is created via the Web UI, it inserts into `transactions` but **does not evaluate budget limits and does not send any Telegram message**.
   - In `app/dashboard/budget/page.tsx`, budget limits are hardcoded in `useState` (lines 8–64). There is no toggle for Daily (Harian) or Weekly (Mingguan), only a monthly card view.
   - In `lib/telegram/message-handler.ts` lines 500–538, budget progress is calculated exclusively for the monthly period and appended as text (`[████░░░░░░] 40%`) to the transaction confirmation message. No dedicated 80% or 100% alert message is dispatched.
   - In `supabase/migrations/20261010000001_initial_schema.sql` lines 142–154, `budgets` table has columns `(id, user_id, category_id, amount, month, year, alert_80_sent, alert_100_sent)`. There are no columns for daily or weekly periods.

---

## 2. Logic Chain

1. **Root cause of Telegram bot stalling / not responding in real time:**
   - From Observation 1, Next.js runs on `http://localhost:3000`. Telegram cannot send webhooks to localhost without a public tunnel.
   - From Observation 1 & 3, no background polling daemon exists; polling only occurred when the user manually clicked a button in settings.
   - From Observation 2, even when polled, `timeout=0` (short-polling) causes empty responses unless polled continuously, and `lastUpdateOffset` resets on hot-reload, re-fetching old updates or failing to advance the Telegram offset.
   - *Therefore*, the bot appears unresponsive in real-time. Creating `scripts/start-telegram-bot.bat` running a background daemon (`scripts/telegram-daemon.mjs`) with long-polling (`timeout=15` or 1–2s interval), automated `deleteWebhook` on startup, and persistent offset forwarding directly to `/api/telegram/webhook` completely resolves real-time auto-response.

2. **Root cause of missing budget alerts:**
   - From Observation 5, web transaction creation (`/api/transactions`) contains zero budget check logic.
   - In Telegram transaction creation, only monthly progress is appended to confirmation text; no threshold alert is triggered for daily or weekly periods, nor is an alert triggered at ≥80% or 100%.
   - *Therefore*, creating a centralized `lib/services/budget-alert.ts` called by both web and Telegram pipelines, with daily/weekly/monthly period aggregation and debounced alerts (`alert_80_sent`, `alert_100_sent`), satisfies R5 end-to-end.

3. **Multi-period budgeting in frontend:**
   - From Observation 5, the frontend currently hardcodes monthly budgets.
   - Adding a 3-tab toggle (`Harian`, `Mingguan`, `Bulanan`) at `/dashboard/budget` with Luxury Obsidian & Deep Emerald styling, connected to `/api/budget`, satisfies R5.

---

## 3. Caveats

- **Active Webhook Conflict in Dev:** If a developer tests with a bot token that previously had a public webhook URL registered, Telegram API returns HTTP 409 Conflict until `botClient.deleteWebhook()` is executed. The daemon MUST execute `deleteWebhook()` before invoking `getUpdates()`.
- **Placeholder AI Keys:** AI vision OCR and audio transcription depend on valid external API keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`). However, text transaction parsing is 100% resilient due to `heuristicTextParse` in `lib/ai/multi-provider.ts`.
- **Database Column Aliases:** `transactions` table in SQL migration uses `transaction_date`, while route handlers and types use `date`. Any new service querying `transactions` should ensure correct column referencing.

---

## 4. Conclusion

1. **R4 (Telegram Auto-Responder & Real-Time Fix) is fully mapped:**
   - Needs `scripts/start-telegram-bot.bat` and `scripts/telegram-daemon.mjs` running an interval/long-polling daemon pulling every 1–2 seconds.
   - Needs `/api/telegram/poll` enhanced to auto-clear webhooks and manage offsets.
   - Telegram message handlers (`/start`, `/saldo`, `/budget`, `/hari_ini`, `/minggu_ini`, `/bulan_ini`, `/bantuan`, text, voice, OCR) are functionally ready and require only multi-period budget integration.
2. **R5 (Multi-Period Budgeting & Alerts) is fully mapped:**
   - Needs `/dashboard/budget` updated with Harian, Mingguan, and Bulanan tabs, Luxury Obsidian styling, and dynamic progress bars.
   - Needs `lib/services/budget-alert.ts` to evaluate daily (today WIB), weekly (current week Mon–Sun WIB), and monthly thresholds on every transaction from web and Telegram, sending early warning alerts at ≥80% and overbudget alerts at 100%.

---

## 5. Verification Method

To independently verify the diagnosis and future implementation:
1. **Inspect Survey Report:** Read `.agents/teamwork/spec_miner_survey_3/survey.md`.
2. **Verify Daemon Startup:** Run `scripts/start-telegram-bot.bat` in a terminal; verify it outputs bot username, clears webhooks, and enters polling loop without 409 errors.
3. **Verify Telegram Auto-Response:** Send a transaction message (e.g. `"beli kopi 25rb"`) from the Telegram mobile app; verify instant response within 1–2 seconds.
4. **Verify Budget Alerts:** Log an expense exceeding 80% or 100% of a category limit from `/dashboard/transaksi` (Web); verify that the Telegram bot immediately receives and delivers the budget alert notification.
5. **Verify Multi-Period Budget UI:** Navigate to `http://localhost:3000/dashboard/budget`; verify tabs for Harian, Mingguan, and Bulanan toggle views and update progress bars dynamically.
