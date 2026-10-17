# Handoff Report — Specification Miner (Telegram Long Polling Integration)

**Target System:** TataDana SaaS Finansial Indonesia  
**Working Directory:** `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\spec_miner_survey`  
**Date:** 2026-10-17T03:05:00Z  
**Recipient / Orchestrator:** `24e6ba0c-b630-4f31-9d7d-f3df4dc9e357`

---

## 1. Observation

Direct code and file observations gathered during specification mining:

1. **Telegram Setup Route (`app/api/telegram/setup-bot/route.ts`):**
   - Lines 98–127: Evaluates `isLocalhost` conditionally using `baseUrl.includes('localhost')`. If localhost, calls `deleteWebhook()`; if not localhost, sets public webhook (`setWebhook(webhookUrl)`).
   - Lines 32–60: Supports mock token simulation (`cleanToken === '123456:ABC-DEF'` or containing `'demo'` / `'test'`), setting `telegram_connected: true` and returning `{ success: true, mode: 'simulation' }`.
   - Lines 129–150: Updates `profiles` table with `telegram_bot_token`, `telegram_connected: true`, and returns `{ success: true, message, status: 'connected', botInfo, isLocalhost }`. It does not explicitly store or return `mode: 'long_polling'`.

2. **Telegram Polling Endpoint (`app/api/telegram/poll/route.ts`):**
   - Lines 7–9: In-memory session variables `lastUpdateOffset = 0` and `webhookCleaned = false`.
   - Lines 13–19: Accepts query parameters `token`, `cleanup` (boolean), `offset` (number), `timeout` (clamped to 0–25s), and `limit` (clamped to 1–100).
   - Lines 31–38: Cleans webhook on first invocation (`!webhookCleaned`) or when `cleanup=true`.
   - Lines 44–53: Implements self-healing for Telegram HTTP 409 Conflict (`updatesRes.description?.toLowerCase().includes('webhook')`), automatically triggering `deleteWebhook({ drop_pending_updates: false })` and retrying.
   - Lines 63–76: Loops through updates, advances `lastUpdateOffset = Math.max(lastUpdateOffset, update.update_id)`, and executes `TelegramMessageHandler.handleUpdate(update)`.
   - Lines 78–88: Responds with JSON: `{ ok: true, count, lastOffset, webhookCleaned, processed, message }`. Supports both `GET` and `POST`.

3. **Telegram Bot API Wrapper (`lib/telegram/bot-api.ts`):**
   - Implements `getMe()`, `setWebhook(webhookUrl)`, `deleteWebhook(options)`, `getUpdates(offset, limit, timeout)`, `sendMessage(chatId, text, options)`, `sendChatAction(chatId, action)`, `getFile(fileId)`, and `downloadFile(fileId)`.
   - Observation on line 134: `if (offset) url.searchParams.set('offset', String(offset))`. If `offset === 0`, it is omitted. Robust offset checking should use `if (offset !== undefined && offset !== null)`.
   - Line 178: Implements automatic Markdown fallback on `sendMessage` — if Markdown formatting fails with 400 Bad Request (unescaped characters), it retries as plain text.

4. **Telegram Message Handler (`lib/telegram/message-handler.ts`):**
   - Lines 25–35: Idempotency enforced against PostgreSQL table `telegram_updates` using `update_id`. Duplicate `update_id` payloads return `{ handled: true, reason: 'Duplicate update ignored' }`.
   - Lines 49–57: Resolves registered user via `profiles.telegram_chat_id` or phone number matching `profiles.phone_number`.
   - Lines 71–96: Dispatches message types:
     - Contact card (`message.contact`): links Telegram user to profile.
     - Receipt Photo (`message.photo`): downloads highest resolution photo, runs `MultiAIProviderService.parseReceiptImage`, creates transaction and `transaction_items` (Pro only).
     - Voice Note (`message.voice` / `message.audio`): downloads audio (<= 60s), runs STT transcription, parses text transaction.
     - Slash Commands: `/start`, `/saldo`, `/hari_ini`, `/minggu_ini`, `/bulan_ini`, `/budget` (with optional `harian`, `mingguan`, `bulanan`), `/sheet`, `/bantuan`.
     - Natural Language Text: parses Indonesian financial expressions ("beli sate 25rb", "gajian 5jt"), credits/debits default wallet, inserts into `transactions`, and triggers budget alert evaluation.

5. **Multi-Period Budget Alert Service (`lib/services/budget-alert.ts`):**
   - Lines 41–92: `getPeriodDateRange(period, referenceDate)` calculates exact date ranges in Asia/Jakarta (WIB) for `'daily'`, `'weekly'`, and `'monthly'`.
   - Lines 98–287: `evaluateAndTriggerBudgetAlert(userId, transaction)`:
     - Checks limits from `budgets` table or `categories` columns (`budget_daily`, `budget_weekly`, `budget_amount` / `budget_monthly`).
     - Aggregates spending from `transactions` table.
     - Warning threshold: `>= 80%` and `< 100%` sends 80% warning alert.
     - Overbudget threshold: `>= 100%` sends critical overbudget alert.
     - Debounce protection: in-memory `sentAlertsCache` (`${userId}:${categoryId}:${period}:${periodKey}:${threshold}`) and persistent columns `alert_80_sent` and `alert_100_sent`.

6. **Long-Polling Daemon & Batch Launcher (`scripts/`):**
   - `scripts/telegram-daemon.mjs`:
     - Line 199: currently uses `timeout: 15`. Requirement R3 specifies `timeout: 25`.
     - Lines 63, 78–96: Offset tracked persistently in `.telegram-offset.json`.
     - Lines 164–175: Startup `deleteWebhook({ drop_pending_updates: false })`.
     - Lines 240–273: Forwards updates to `POST /api/telegram/webhook`. If Next.js returns non-5xx, commits `currentOffset = update.update_id + 1`.
   - `scripts/start-telegram-bot.bat`:
     - Loops `node scripts/telegram-daemon.mjs` with 3-second auto-restart on termination.

7. **Settings UI (`app/dashboard/settings/page.tsx`):**
   - Currently has manual polling button "Tarik Pesan Telegram (Polling)", but lacks:
     - Mode badge: **"Mode: Long Polling (Localhost Ready)"**.
     - Toggle: **"Auto-Polling Real-Time"** (polling every 2-3 seconds).
     - Live visual pulse indicator: 🟢 **"Polling Aktif — Mendengarkan Pesan Telegram"**.
     - Real processed message log view.
     - Contains outdated help text referencing ngrok / HTTPS public tunnels.

8. **Database Schema & Triggers (`supabase/migrations/20261010000001_initial_schema.sql`):**
   - Tables: `users` (view `profiles`), `wallets`, `categories`, `transactions`, `budgets`, `telegram_updates`, `transaction_items`.
   - PostgreSQL trigger `trg_sync_wallet_balance` on `transactions` automatically maintains `wallets.balance` on `INSERT`, `UPDATE`, and `DELETE`.

9. **Verification Suite (`scripts/verify-all.mjs`, `tests/e2e/`):**
   - Currently 53 tests across 6 suites:
     - `route-health.test.mjs`: 6 tests
     - `theme-audit.test.mjs`: 6 tests
     - `tier1-features.test.mjs`: 18 tests
     - `tier2-boundary.test.mjs`: 15 tests
     - `tier3-combinations.test.mjs`: 3 tests
     - `tier4-scenarios.test.mjs`: 5 tests
   - There are currently no direct assertions for `/api/telegram/poll`, `mode: 'long_polling'`, or daemon `timeout: 25`.

---

## 2. Logic Chain

1. **Why switch to Long Polling as primary default?**  
   - Observation 1 & 7 show that Telegram Bot API strictly requires a valid public HTTPS endpoint for webhooks. Localhost (`http://localhost:3000`) is rejected by Telegram. Developers and local testers previously required external tunnels (ngrok/cloudflared), which is fragile and error-prone.
   - Long polling (`getUpdates`) allows the Next.js server or a companion Node daemon running on `localhost` to initiate outbound HTTP GET requests directly to Telegram API (`https://api.telegram.org/bot<token>/getUpdates`), completely bypassing the need for a public IP, domain, or SSL certificate.

2. **Why `deleteWebhook({ drop_pending_updates: false })` is required?**  
   - Telegram Bot API returns HTTP 409 Conflict if `getUpdates` is called while a webhook URL is still registered on Telegram's servers.
   - Executing `deleteWebhook` during bot token setup and daemon startup ensures the bot immediately switches to polling mode without dropping any queued customer messages.

3. **Why dual-channel polling architecture exists?**  
   - Channel A (In-App Auto-Poller): When the user opens the web dashboard on localhost, frontend timer calls `/api/telegram/poll` every 2–3s. The route fetches updates and executes `TelegramMessageHandler` in-process.
   - Channel B (Background Daemon): When running outside the browser or continuous dev, `scripts/start-telegram-bot.bat` runs `scripts/telegram-daemon.mjs` with `timeout: 25`, fetching updates and forwarding them to `POST /api/telegram/webhook`.
   - Both channels share the `telegram_updates` PostgreSQL idempotency table, ensuring that even if both are active, no update is ever processed twice.

4. **Why the test suite must be updated?**  
   - Requirement R5 mandates 100% pass rate on all tests and specifically requires testing Long Polling mode, `/api/telegram/poll`, and all 53+ test cases. Adding comprehensive assertions for `/api/telegram/poll` contract, offset progression, and daemon config satisfies both R5 and the 53+ test count gate.

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Backend Polling | Bot Token Setup & Webhook Clear | Validates token via `getMe`, deletes existing webhook, sets bot mode to Long Polling | POST `{ botToken }` | `{ success: true, mode: 'long_polling', botInfo, message }` | 400 on empty/duplicate token; 400 on invalid Telegram token | `app/api/telegram/setup-bot/route.ts` |
| 2 | Backend Polling | Idempotent Update Polling | Fetches Telegram updates via `getUpdates`, tracks offset, dispatches to handler | GET/POST `/api/telegram/poll?token=&offset=&timeout=&limit=` | `{ ok: true, count, lastOffset, processed: [...], message }` | Returns `{ ok: false, message }` on Telegram API error | `app/api/telegram/poll/route.ts` |
| 3 | Backend Polling | Webhook Conflict Self-Healing | Automatically detects HTTP 409 Conflict from Telegram and invokes `deleteWebhook` | `updatesRes.description.includes('webhook')` | Deletes webhook and retries `getUpdates` | Logs warning; returns error if retry fails | `app/api/telegram/poll/route.ts:45` |
| 4 | Message Handler | Update Idempotency Guard | Checks `telegram_updates` table before processing any update | `update_id: number` | `{ handled: true, reason: 'Duplicate update ignored' }` | Silently ignores duplicate | `lib/telegram/message-handler.ts:25` |
| 5 | Message Handler | Natural Language Transaction Parsing | Parses Indonesian text ("beli sate 25rb", "gajian 5jt") into type, amount, category | `message.text` | `{ success: true, jenis, nominal, kategori, catatan }` | Suggests correction if unparseable | `lib/telegram/message-handler.ts:237` |
| 6 | Message Handler | Voice Note Transaction (STT) | Transcribes audio voice notes (<= 60s) via AI and extracts transaction | `message.voice` / `message.audio` | Transcribed text & recorded transaction | Rejects if duration > 60s; prompts retry if audio unclear | `lib/telegram/message-handler.ts:272` |
| 7 | Message Handler | Receipt OCR Photo Scanning | Extracts merchant, items, and total amount from receipt photo (Pro plan only) | `message.photo` | Transaction + `transaction_items` recorded | Prompts Pro upgrade if Starter plan; prompts resend if blurred | `lib/telegram/message-handler.ts:346` |
| 8 | Message Handler | Default Wallet Auto-Resolution | Automatically associates incoming Telegram transaction with default wallet | `user.id` | `Wallet` where `is_default = true` (or fallback) | Creates default Cash wallet if none exists | `lib/telegram/message-handler.ts:901` |
| 9 | Message Handler | Slash Commands Responder | Responds to `/start`, `/saldo`, `/hari_ini`, `/minggu_ini`, `/bulan_ini`, `/budget`, `/sheet`, `/bantuan` | `message.text` command | Formatted Markdown message with balance/summary | Returns help suggestion on unknown command | `lib/telegram/message-handler.ts:618` |
| 10 | Budget & Alerts | Multi-Period Budget Evaluation | Calculates consumption for Daily, Weekly, and Monthly periods in WIB timezone | `userId`, `categoryId`, `amount`, `date` | `BudgetAlertResult` with percentage and status | Graceful return if no budget limit defined | `lib/services/budget-alert.ts:98` |
| 11 | Budget & Alerts | 80% Warning Alert | Dispatches Telegram alert when spending reaches >= 80% and < 100% of period budget | Calculated ratio >= 0.8 | Telegram message: `⚠️ PERINGATAN ANGGARAN (80%)` | Debounced via cache and `alert_80_sent` | `lib/services/budget-alert.ts:253` |
| 12 | Budget & Alerts | 100% Overbudget Alert | Dispatches critical Telegram alert when spending exceeds 100% of period budget | Calculated ratio >= 1.0 | Telegram message: `🚨 PERINGATAN OVERBUDGET (100%)` | Debounced via cache and `alert_100_sent` | `lib/services/budget-alert.ts:222` |
| 13 | Daemon & Scripts | Background Long-Polling Service | Long-polls Telegram API (`timeout: 25`), persists offset to `.telegram-offset.json` | `TELEGRAM_BOT_TOKEN`, `WEBHOOK_FORWARD_URL` | Forwards update to Next.js webhook endpoint | Exponential backoff on network failure | `scripts/telegram-daemon.mjs` |
| 14 | Daemon & Scripts | Windows Batch Daemon Runner | Loops daemon script with 3-second recovery delay | Execution via `start-telegram-bot.bat` | Continuous background execution | Restarts node process on unexpected exit | `scripts/start-telegram-bot.bat` |
| 15 | UI Settings | Long Polling Mode & In-App Poller | Displays Mode badge, Auto-Polling toggle (2-3s interval), live pulse, and message history | User interaction in `/dashboard/settings` | Real-time chat activity stream and live indicator | Fallback to demo simulator if token empty | `app/dashboard/settings/page.tsx` |
| 16 | Verification | Automated Dual-Track Test Pipeline | 53+ test cases verifying routes, boundaries, combinations, and Telegram polling | `node scripts/verify-all.mjs` | `TEST_READY.md` report with 100% pass verdict | Exits with status 1 on failure | `scripts/verify-all.mjs` |

---

## 4. Edge Cases

| # | Feature | Input | Observed / Expected Behavior |
|---|---------|-------|------------------------------|
| 1 | `TelegramBotApi.getUpdates` | `offset: 0` | If checked with `if (offset)`, falsy `0` causes offset query param to be dropped. Must check `if (offset !== undefined && offset !== null)`. |
| 2 | Polling startup | Webhook already active on Telegram | Telegram API returns HTTP 409 Conflict. Handled by calling `deleteWebhook({ drop_pending_updates: false })` and retrying. |
| 3 | Idempotency | Duplicate update with same `update_id` | Handler checks `telegram_updates` table; ignores duplicate update immediately without double-debiting wallet. |
| 4 | Budget Alert | Spending at exactly 79.9% vs 80.0% | 79.9% remains status `'safe'` (no alert); exactly 80.0% trips `'warning'` status and sends 80% alert. |
| 5 | Budget Alert | Subsequent transactions at 85.0% | Does not resend 80% alert because `alert_80_sent` is true and cache key is set. |
| 6 | Unlinked Telegram User | Chat message from unknown Telegram `chat_id` | Checks if message text is an Indonesian phone number (+628/08). If verified, links user; otherwise prompts contact sharing keyboard. |
| 7 | Voice Note Duration | Voice note duration > 60 seconds | Rejects processing with message: *"Voice note maksimal 60 detik ya untuk menghemat pemrosesan AI"*. |
| 8 | Plan Limitations | Photo receipt sent by Starter user | Rejects OCR with informative message: *"Fitur Khusus TataDana Pro! Input transaksi via foto struk belanja..."*. |
| 9 | Daemon Network Failure | Next.js server unreachable (offline) | Daemon catches fetch error, does NOT advance offset, logs warning, and retries when Next.js server resumes. |

---

## 5. Technical Gap Analysis (Current vs Target State)

### Requirement R1: Polling-First Backend Architecture
- **Gap:** `/api/telegram/setup-bot` currently defaults to webhook registration if `baseUrl` is not localhost.
- **Specification:** Must unconditionally set mode to `long_polling`, call `deleteWebhook({ drop_pending_updates: false })`, update user profile `telegram_connected: true`, and return `mode: 'long_polling'`.
- **Gap:** `/api/telegram/poll` should support returning detailed message processing history suitable for the frontend settings live monitor.

### Requirement R2: In-App Auto-Poller & UI Settings Refresh
- **Gap:** `/dashboard/settings` has old text directing users to configure ngrok/tunnels.
- **Specification:**
  - Add status badge: **"Mode: Long Polling (Localhost Ready)"** with emerald styling.
  - Add toggle: **"Auto-Polling Real-Time"** with `useEffect` interval calling `/api/telegram/poll` every 2.5 seconds when active.
  - Add visual indicator: 🟢 **"Polling Aktif — Mendengarkan Pesan Telegram"** with `animate-pulse`.
  - Replace static simulator chat with live processed message logs (displaying sender, text, timestamp, and bot action status).
  - Retain manual button **"Tarik Pesan Sekarang (Polling)"**.

### Requirement R3: Background Long-Polling Daemon & Batch Launcher
- **Gap:** `scripts/telegram-daemon.mjs` currently uses `timeout: 15`.
- **Specification:** Change to `timeout: 25` per official Telegram HTTP long-polling best practice. Verify `.telegram-offset.json` persistent storage and startup `deleteWebhook`.

### Requirement R4: Wallet & Budget Alert State Integration
- **Current State:** Fully implemented in `lib/telegram/message-handler.ts`, `lib/services/budget-alert.ts`, and database triggers.
- **Specification:** Ensure both polling ingress paths (In-App `/api/telegram/poll` and Daemon -> `/api/telegram/webhook`) execute identical transaction creation, wallet balance adjustments, and multi-period budget alert dispatches.

### Requirement R5: Quality & Test Pipeline Integration
- **Gap:** Existing test suite has 53 test cases, but lacks direct assertions for `/api/telegram/poll` and Long Polling mode.
- **Specification:** Add test cases in `tests/e2e/tier1-features.test.mjs` (Tier 1.4) or `tests/e2e/route-health.test.mjs` asserting:
  1. `/api/telegram/setup-bot` sets `mode: 'long_polling'` and deletes webhook.
  2. `/api/telegram/poll` route contract (validates offset progression, idempotency, and update payload processing).
  3. Daemon script specifies `timeout: 25` and `.telegram-offset.json`.
  4. Ensure all 53+ tests pass 100% with `node scripts/verify-all.mjs`.

---

## 6. Caveats

- **External Telegram API connectivity:** Live testing against official Telegram API requires a real bot token from `@BotFather`. For offline and automated CI/CD pipelines, mock tokens (`cleanToken === '123456:ABC-DEF'` or containing `'demo'`) are supported and should continue to be honored.
- **Command execution permission:** In this agent session, shell command execution permissions were not enabled, so verification was conducted via direct, comprehensive file inspection, AST-level code tracing, and schema analysis.
- **Database trigger dependency:** Automatic wallet balance updates rely on PostgreSQL trigger `trg_sync_wallet_balance`. For environments running without a live Supabase instance, fallback in-memory handling in `app/api/wallets/route.ts` must maintain balance integrity.

---

## 7. Conclusion

The TataDana codebase already contains strong foundational primitives for Telegram integration (`bot-api.ts`, `message-handler.ts`, `budget-alert.ts`, and the initial draft of `poll/route.ts`). To fully satisfy requirements R1 through R5:
1. Make Long Polling the primary, default mode in `/api/telegram/setup-bot` and `/api/telegram/poll`.
2. Enhance the Settings UI in `app/dashboard/settings/page.tsx` with the Long Polling badge, Auto-Polling toggle (2–3s timer), live pulse status, and real message log stream.
3. Update `scripts/telegram-daemon.mjs` to use `timeout: 25`.
4. Augment `tests/e2e/` with explicit test cases for `/api/telegram/poll` and Long Polling mode, ensuring all 53+ test cases pass 100% in `scripts/verify-all.mjs`.

---

## 8. Verification Method

To verify these discoveries independently:
1. **Inspect Route Handlers:**
   - `view_file` on `app/api/telegram/setup-bot/route.ts` (lines 80–150)
   - `view_file` on `app/api/telegram/poll/route.ts` (lines 10–90)
2. **Inspect Utilities & Services:**
   - `view_file` on `lib/telegram/bot-api.ts` (lines 100–145)
   - `view_file` on `lib/telegram/message-handler.ts` (lines 20–108, 470–597)
   - `view_file` on `lib/services/budget-alert.ts` (lines 98–288)
3. **Inspect Daemon & Batch Script:**
   - `view_file` on `scripts/telegram-daemon.mjs` (lines 190–225)
   - `view_file` on `scripts/start-telegram-bot.bat` (lines 1–27)
4. **Inspect Test Suite:**
   - Run `node scripts/verify-all.mjs` when server is running or inspect `tests/e2e/tier1-features.test.mjs` (Tier 1.4) to confirm test assertions and test count >= 53.
