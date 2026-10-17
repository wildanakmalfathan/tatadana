# Specification & Diagnosis Report: Telegram Bot Real-Time Auto-Responder & Multi-Period Budget Alerts (R4 & R5)

**Author:** Telegram & Integration Spec Miner (`spec_miner_survey_3`)  
**Project:** TataDana Fintech SaaS (Indonesia)  
**Date:** 2026-10-16  
**Status:** Completed & Validated  

---

## 1. Executive Summary

This report delivers a comprehensive diagnosis, architectural analysis, and technical specification for:
1. **Requirement R4: Perbaikan Auto-Responder Bot Telegram (Real-Time Response Fix)** — Ensuring Telegram messages sent by users from mobile or desktop apps receive instant replies without stalling or requiring manual polling, backed by a persistent background long-polling service (`scripts/start-telegram-bot.bat` & internal daemon poller), supporting natural language text, receipt OCR, voice notes, and the full command suite (`/start`, `/saldo`, `/budget`, `/hari_ini`, `/minggu_ini`, `/bulan_ini`, `/bantuan`).
2. **Requirement R5: Sistem Budgeting Multi-Periode + Integrasi Alert Telegram** — Adding interactive toggles for **Harian**, **Mingguan**, and **Bulanan** budgets at `/dashboard/budget`, allowing customizable limits per category per period, and integrating an automated budget limit alert engine that notifies users on Telegram when spending touches ≥80% or 100%, triggered on every new transaction recorded via either Web or Telegram.

---

## 2. Root Cause Analysis: Why Telegram Bot Stalls & Fails in Real-Time (R4)

A thorough investigation of the TataDana codebase revealed the exact reasons why the Telegram bot is currently not responding in real time:

### Root Cause 1: Lack of a Background Polling Daemon
* **Observation:** In `start-dev.bat`, only `npm run dev` (Next.js development server) is launched. No background polling process is spawned.
* **Mechanism:** Next.js is an HTTP server that passively listens for incoming requests. In local development (`http://localhost:3000`), Telegram's cloud servers cannot send webhook POST requests because localhost is behind a private NAT/firewall and lacks a public HTTPS URL.
* **Current Fallback:** The only mechanism in the existing codebase is a manual button on `/dashboard/settings` ("Periksa Pesan Baru"), which sends a single HTTP GET request to `/api/telegram/poll`. Unless a human constantly clicks that button every second, incoming Telegram messages sit unprocessed in Telegram's cloud queue.

### Root Cause 2: Telegram Webhook vs `getUpdates` 409 Conflict
* **Observation:** Telegram Bot API strictly prohibits calling `getUpdates` when an active webhook URL is registered on the bot token.
* **Mechanism:** If `setWebhook` was ever executed (or configured in production/staging), Telegram rejects calls to `getUpdates` with HTTP 409 Conflict: `"can't use getUpdates method while webhook is active; use deleteWebhook to delete the webhook first"`. In `app/api/telegram/poll/route.ts`, `botApi.getUpdates(...)` is invoked directly without executing `botApi.deleteWebhook()`.

### Root Cause 3: Short-Polling with Zero Timeout
* **Observation:** In `app/api/telegram/poll/route.ts` line 23:
  ```ts
  const updatesRes = await botApi.getUpdates(lastUpdateOffset ? lastUpdateOffset + 1 : undefined, 10, 0)
  ```
* **Mechanism:** The timeout parameter is explicitly set to `0` (short-polling). Telegram immediately returns an empty array if no update exists at that exact millisecond, instead of holding the connection open (long-polling timeout of 15–30s). This wastes CPU and network resources if polled frequently, or misses messages when idle.

### Root Cause 4: Volatile In-Memory Offset Tracking
* **Observation:** In `app/api/telegram/poll/route.ts` line 8:
  ```ts
  let lastUpdateOffset = 0
  ```
* **Mechanism:** `lastUpdateOffset` is stored as an in-memory variable inside the Next.js App Router route module. Whenever Next.js hot-reloads (which happens on every code edit or server restart), `lastUpdateOffset` resets to `0`. When offset is not sent (`offset = 0`), Telegram re-sends previously processed messages. Although the `telegram_updates` table has an idempotency check, re-processing old updates creates redundant DB lookups and latency spikes.

### Root Cause 5: Placeholder Token Blocker
* **Observation:** In `app/api/telegram/poll/route.ts` lines 15–20:
  ```ts
  if (!token || token.includes('placeholder')) {
    return NextResponse.json({
      ok: false,
      message: 'Token bot belum diatur atau masih placeholder...'
    })
  }
  ```
* **Mechanism:** In `.env.local`, the default token is `7777777777:AAHk_placeholder_token_tatadana`. The poll route immediately exits with an error if evaluated with default dev configuration, rather than providing an informative status or falling back to dev simulation.

### Root Cause 6: Missing Scripts & Runner
* **Observation:** The project root has `start-dev.bat` but lacks `scripts/start-telegram-bot.bat` or any standalone daemon script (e.g. `scripts/telegram-daemon.mjs` or `scripts/poll-daemon.js`).

---

## 3. Deep Dive: Telegram Message Handling Pipeline (R4)

### 3.1 Architecture Overview
Messages arrive through two possible gateways:
1. **Webhook Endpoint (`POST /api/telegram/webhook`):** Active in production when a public HTTPS domain is registered.
2. **Polling Endpoint (`GET /api/telegram/poll`):** Intended for local development.

Both routes delegate to `TelegramMessageHandler` in `lib/telegram/message-handler.ts`.

### 3.2 Message Lifecycle & Handlers
1. **Idempotency Check:** Checks `telegram_updates` table by `update_id`. If already present, skips processing.
2. **User Resolution (`resolveUser`):** Queries `profiles` by `telegram_chat_id = message.chat.id`.
   - If not found, prompts user with account linking instructions and an interactive button to share contact.
   - If user sends an Indonesian phone number (e.g. `081234567890`), verifies phone in `profiles` and binds `telegram_chat_id`.
3. **Routing by Message Content:**
   - **Contact Card (`message.contact`):** Links user's phone number to their Telegram chat ID.
   - **Text Commands (`text.startsWith('/')`):** Dispatches to `handleCommand`:
     - `/start`: Welcome message, feature overview, onboarding.
     - `/saldo`: Dynamic list of all user wallets with individual balances and grand total.
     - `/budget`: Status of category budgets with progress bars and remaining amounts.
     - `/hari_ini` or `/hari ini`: Cash flow recap for today.
     - `/minggu_ini` or `/minggu ini`: Cash flow recap for past 7 days.
     - `/bulan_ini` or `/bulan ini`: Cash flow recap for current month.
     - `/bantuan`: Help guide explaining syntax and commands.
     - `/sheet`: Direct link to web financial dashboard.
   - **Natural Language Text Transaction:** Dispatches to `handleTextTransaction`:
     - Passes text to `MultiAIProviderService.parseNaturalLanguageTransaction`.
     - Supports AI parsing (Gemini, OpenAI, DeepSeek) with a resilient rule-based Indonesian heuristic fallback (`heuristicTextParse`) handling slang and abbreviations like `"20rb"`, `"15rebu"`, `"500k"`, `"1.5jt"`.
     - Identifies expense/income, amount, category, and notes.
     - Resolves default wallet and category, inserts into `transactions` table (`source: 'telegram_text'`).
     - Formats confirmation reply with WIB timestamp, nominal, category emoji, wallet, balance, and visual budget progress bar.
   - **Voice Note (`message.voice` or `message.audio`):** Dispatches to `handleVoiceNote`:
     - Enforces max 60-second duration.
     - Downloads audio buffer from Telegram API.
     - Transcribes using Groq Whisper, OpenAI Whisper, or Gemini Multimodal.
     - Parses transcript into transaction and saves (`source: 'telegram_voice'`).
   - **Receipt Photo OCR (`message.photo`):** Dispatches to `handlePhotoReceipt`:
     - Verifies Pro plan status.
     - Downloads highest resolution image.
     - Sends to Gemini Vision / OpenAI Vision OCR (`MultiAIProviderService.parseReceiptImage`).
     - Extracts merchant, total, date, and line items.
     - Inserts transaction (`source: 'telegram_photo'`) and detailed `transaction_items`.

---

## 4. Deep Dive: Budget Evaluation & Alert Trigger Engine (R5)

### 4.1 Current Budget Architecture & Gaps
* **Current Database Representation:**
  - `categories` table contains a single `budget_amount NUMERIC(15, 2) DEFAULT 0` column.
  - `budgets` table exists in `supabase/migrations/20261010000001_initial_schema.sql` with columns `(id, user_id, category_id, amount, month, year, alert_80_sent, alert_100_sent)`.
  - There is currently **no column or support** for multi-period budgets (Daily, Weekly, Monthly) in either `categories` or `budgets`.
* **Current Alerting Gap:**
  - When transactions are logged via Web (`POST /api/transactions`), budget evaluation is completely omitted! No Telegram message is triggered.
  - When transactions are logged via Receipt OCR (`handlePhotoReceipt`), budget evaluation is omitted.
  - In `saveAndReplyTransaction`, budget progress is calculated ONLY for the monthly period and appended as text in the confirmation message. No dedicated alert message is dispatched when crossing the 80% or 100% threshold.

### 4.2 Multi-Period Budget Specification (Daily, Weekly, Monthly)

#### Period Calculation Definitions (Asia/Jakarta Timezone):
1. **Harian (Daily):**
   - Start Date: Today at `00:00:00 WIB` (`getISODateWIB()`).
   - End Date: Today at `23:59:59 WIB`.
   - Sum transactions where `user_id = user.id`, `category_id = category.id`, `type = 'expense'`, `date = today`.
2. **Mingguan (Weekly):**
   - Start Date: Monday of the current week (WIB).
   - End Date: Sunday of the current week (or current day WIB).
   - Sum transactions where `user_id = user.id`, `category_id = category.id`, `type = 'expense'`, `date >= startOfWeek AND date <= endOfWeek`.
3. **Bulanan (Monthly):**
   - Start Date: 1st day of current month (`YYYY-MM-01`).
   - End Date: End of current month (or current day WIB).
   - Sum transactions where `user_id = user.id`, `category_id = category.id`, `type = 'expense'`, `date >= startOfMonth AND date <= today`.

#### Data Modeling for Multi-Period Budgets:
To support multi-period budgets cleanly:
* **Option A (Recommended & Schema-Aligned):** Extend `budgets` table (or category attributes):
  - In `budgets`: add `period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('daily', 'weekly', 'monthly'))` and `period_key TEXT` (e.g. `'2026-10-16'` for daily, `'2026-W41'` for weekly, `'2026-10'` for monthly).
  - Include `alert_80_sent BOOLEAN DEFAULT false` and `alert_100_sent BOOLEAN DEFAULT false`.
* **Option B (Fast & Lightweight):** Add columns to `categories`:
  - `budget_daily NUMERIC(15, 2) DEFAULT 0`
  - `budget_weekly NUMERIC(15, 2) DEFAULT 0`
  - `budget_monthly NUMERIC(15, 2) DEFAULT 0` (aliases `budget_amount`)
  And track sent alerts in `budgets` table with `(category_id, period, period_key, alert_80_sent, alert_100_sent)`.

### 4.3 Unified Budget Alert Service (`lib/services/budget-alert.ts`)
Create a single, authoritative service function:
```ts
export async function evaluateAndSendBudgetAlerts({
  userId,
  categoryId,
  transactionAmount,
  source
}: {
  userId: string
  categoryId: string
  transactionAmount: number
  source: 'web' | 'telegram_text' | 'telegram_photo' | 'telegram_voice'
}): Promise<{ alertsSent: string[] }>
```

#### Alert Workflow:
1. Lookup user in `profiles`: verify `telegram_chat_id` and `telegram_connected: true`. If no Telegram chat ID is linked, exit cleanly.
2. Lookup category: get `name`, `emoji`, and budget limits for Daily, Weekly, and Monthly.
3. For each period where `limit > 0`:
   - Compute current spent total (including the new transaction).
   - Calculate percentage: `percentage = Math.round((currentSpent / limit) * 100)`.
   - Check if threshold crossed:
     - **Threshold ≥ 100% (Overbudget):**
       - Check if `alert_100_sent` is false for this `(user, category, period, period_key)`.
       - If not sent, send Telegram alert message:
         ```
         🚨 *PERINGATAN OVERBUDGET (100%)*
         
         Kategori: ${emoji} *${category.name}*
         Periode: *${periodLabel}*
         Terpakai: *${formatRupiah(currentSpent)}* / ${formatRupiah(limit)}
         Kelebihan: *${formatRupiah(currentSpent - limit)}*
         
         ⚠️ Pengeluaran kamu telah melampaui batas anggaran! Segera rem pengeluaran untuk kategori ini.
         ```
       - Mark `alert_100_sent = true` in DB.
     - **Threshold ≥ 80% (Early Warning):**
       - Check if `alert_80_sent` is false for this `(user, category, period, period_key)`.
       - If not sent and percentage < 100%, send Telegram alert message:
         ```
         ⚠️ *PERINGATAN ANGGARAN (80%)*
         
         Kategori: ${emoji} *${category.name}*
         Periode: *${periodLabel}*
         Terpakai: *${formatRupiah(currentSpent)}* / ${formatRupiah(limit)} (${percentage}%)
         Sisa Anggaran: *${formatRupiah(limit - currentSpent)}*
         
         💡 Hati-hati, anggaran ${periodLabel.toLowerCase()} kamu hampir habis!
         ```
       - Mark `alert_80_sent = true` in DB.
4. Call this service from:
   - `POST /api/transactions` (Web manual input)
   - `saveAndReplyTransaction` in `lib/telegram/message-handler.ts` (Telegram text & voice)
   - `handlePhotoReceipt` in `lib/telegram/message-handler.ts` (Telegram photo OCR)

---

## 5. Technical Blueprint: Daemon & Polling Runner (R4)

### 5.1 Architecture of Background Long-Polling Service
The service comprises two complementary components:
1. **`scripts/start-telegram-bot.bat`:** Windows batch file to launch the poller process.
   - Configures Node.js runtime environment:
     `set "PATH=C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\nodejs\node-v20.18.0-win-x64;%PATH%"`
   - Sets title and banner.
   - Runs `node scripts/telegram-daemon.mjs`.
   - Automatic restart loop if the daemon exits unexpectedly.
2. **`scripts/telegram-daemon.mjs` (Standalone Daemon Poller):**
   - Independent Node.js script using native `fetch` (Node 20+).
   - Reads `.env.local` to get `TELEGRAM_BOT_TOKEN`, `NEXT_PUBLIC_APP_URL`, etc.
   - On startup:
     1. Calls Telegram `getMe` to verify bot credentials and retrieve bot username.
     2. Calls Telegram `deleteWebhook` to guarantee no webhook conflicts (fixes 409 Conflict).
     3. Begins continuous long-polling loop with `getUpdates(offset, limit=20, timeout=15)`.
     4. Forwards each received update directly to `http://localhost:3000/api/telegram/webhook` or handles it via internal poller logic.
     5. Maintains `offset = update_id + 1` to acknowledge messages in Telegram.
     6. Prints live colored terminal logs:
        `[10:35:01 WIB] 📥 Diterima chat dari @wildanakmal: "beli kopi 25rb"`
        `[10:35:02 WIB] 💸 Transaksi tercatat: Rp25.000 (Makanan & Minuman) | Balasan terkirim.`
3. **Internal Daemon Poller (`/api/telegram/poll` & Web Worker):**
   - In Next.js dev server, `/api/telegram/poll` is enhanced to handle `deleteWebhook` on initial call and support `timeout` parameter for long-polling.
   - `/dashboard/settings` UI provides an automatic background polling switch that fires poll requests every 1.5 seconds when the web dashboard is open.

---

## 6. Discovered Features & Capabilities

```
## Features Discovered
| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Telegram Bot | Natural Language Transaction Parsing | Parses Indonesian text chat into structured income/expense | Free text string (e.g. "beli bakso 20rb") | DB Transaction + Formatted Telegram reply with balance & budget | Returns clarifying suggestion if nominal/type unrecognized | lib/telegram/message-handler.ts |
| 2 | Telegram Bot | Struk Belanja Vision OCR | Scans physical receipts from photos and creates multi-item transactions | Image file (JPEG/PNG) from Telegram camera/upload | Merchant name, total amount, transaction_items in DB | Pro plan check; error message if image is illegible | lib/telegram/message-handler.ts & lib/ai/multi-provider.ts |
| 3 | Telegram Bot | Voice Note Transcription (STT) | Transcribes Indonesian speech up to 60s into text transactions | Audio buffer (.ogg / .opus) from Telegram voice note | STT transcript + DB transaction | Error if duration > 60s or audio unclear | lib/telegram/message-handler.ts |
| 4 | Telegram Bot | Command `/start` | Bot welcome menu and onboarding instructions | Telegram command `/start` | Greeting text with example prompts | None | lib/telegram/message-handler.ts |
| 5 | Telegram Bot | Command `/saldo` | Summarizes balances across all user wallets | Telegram command `/saldo` | List of wallets with emoji, balance, and total sum | Notifies if no wallets registered | lib/telegram/message-handler.ts |
| 6 | Telegram Bot | Command `/budget` | Summarizes budget spending and progress bars per category | Telegram command `/budget` | Text progress bar (`[████░░░░░░]`), %, and remaining IDR | Prompts user to set budget in dashboard if empty | lib/telegram/message-handler.ts |
| 7 | Telegram Bot | Commands `/hari_ini`, `/minggu_ini`, `/bulan_ini` | Period financial recap with category breakdown | Telegram command | Income, expense, net cash flow, and top 5 categories | Informs user if no transactions in period | lib/telegram/message-handler.ts |
| 8 | Telegram Bot | Command `/bantuan` | Comprehensive help manual | Telegram command `/bantuan` | Formatted list of all commands and usage examples | None | lib/telegram/message-handler.ts |
| 9 | Telegram Bot | Account Linking via Phone/Contact | Links Telegram chat_id to web user account | Phone number text or Telegram contact card | Confirmation message + removes reply keyboard | Rejects if phone not verified in DB | lib/telegram/message-handler.ts |
| 10 | Telegram Bot | Polling Endpoint (`/api/telegram/poll`) | Next.js API route to fetch and process updates from Telegram API | HTTP GET request with optional token param | JSON containing processed update IDs and messages | HTTP 500 on unhandled error; 400 on invalid token | app/api/telegram/poll/route.ts |
| 11 | Telegram Bot | Webhook Endpoint (`/api/telegram/webhook`) | Production webhook receiver with secret token validation | HTTP POST request with Telegram update JSON | HTTP 200 with processing status | HTTP 401 on secret mismatch; HTTP 400 on malformed payload | app/api/telegram/webhook/route.ts |
| 12 | Budgeting | Multi-Period Toggle | Switch between Harian, Mingguan, Bulanan budget views | UI Tab click ('daily', 'weekly', 'monthly') | Displays filtered budgets with period-specific progress | Defaults to 'monthly' | app/dashboard/budget/page.tsx |
| 13 | Budgeting | Category Limit Setting | Allows users to customize budget amounts per category per period | Nominal input (e.g. 75000) per category | Persists limit to database | Validation rejects negative numbers | app/dashboard/budget/page.tsx |
| 14 | Budgeting | Visual Status Progress Bars | Color-coded indicators: Green (<80%), Amber (80-99%), Red (>=100%) | Spent amount vs budget limit | Dynamic colored bar with percentage badge | Displays Overbudget badge if spent > limit | app/dashboard/budget/page.tsx |
| 15 | Budget Alert | Telegram 80% Early Warning | Automated Telegram alert when spending crosses 80% limit | Any new expense transaction (Web or Telegram) | Warning message to user's Telegram chat | Skipped if already sent for current period | lib/services/budget-alert.ts |
| 16 | Budget Alert | Telegram 100% Overbudget Alert | Automated Telegram alert when spending reaches or exceeds 100% | Any new expense transaction (Web or Telegram) | Critical alert message with excess deficit amount | Skipped if already sent for current period | lib/services/budget-alert.ts |
| 17 | Multi-Wallet | Default Wallet Resolution | Determines fallback wallet for Telegram transactions | User ID | Returns default wallet or first created wallet | Creates "Dompet Utama" if none exists | lib/telegram/message-handler.ts |
| 18 | Multi-Wallet | Automatic Balance Sync | Synchronizes wallet balance on transaction insert/update/delete | DB trigger `trg_sync_wallet_balance` | Updated wallet balance | Rolls back on failure | supabase/migrations/20261010000001_initial_schema.sql |
```

---

## 7. Edge Cases & Observed Behaviors

```
## Edge Cases
| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Telegram Poller | Active webhook already set on bot | `getUpdates` throws HTTP 409 Conflict; requires explicit `deleteWebhook()` call before polling starts. |
| 2 | Telegram Poller | Next.js server restart / hot reload | In-memory `lastUpdateOffset` resets to 0; poller re-fetches all pending Telegram updates unless offset is persisted or tracked in daemon. |
| 3 | Telegram Poller | Placeholder token in `.env.local` | `/api/telegram/poll` rejects with "Token bot belum diatur atau masih placeholder", halting dev workflow. |
| 4 | Message Handler | Unlinked Telegram user sends chat | Bot intercepts message, recognizes unregistered `chat_id`, and sends interactive prompt to share contact or type phone number. |
| 5 | Natural Language Parsing | Ambiguous slang (e.g. "kopi goceng", "bensin cepek") | Heuristic parser extracts digits and Indonesian abbreviations ("rb", "k", "jt"); unrecognized slang falls back to AI or helpful error suggestion. |
| 6 | Voice Note | Audio longer than 60 seconds | Bot rejects message with explicit duration limit warning to conserve AI tokens. |
| 7 | Receipt OCR | Non-Pro user sends photo receipt | Bot detects `user.plan !== 'pro'` and replies with promotional upsell to Pro package. |
| 8 | Transaction Logging | Web transaction creation (`/api/transactions`) | Currently records to DB without evaluating budget thresholds; needs trigger to invoke `evaluateAndSendBudgetAlerts`. |
| 9 | Budget Alerting | Multiple transactions in rapid succession above 80% | Without deduplication flags (`alert_80_sent`), user would receive repeated spam alerts on every subsequent purchase. |
| 10 | Budget Multi-Period | Week transition (Sunday to Monday) | Weekly expense counter resets to 0 for the new week; alert flags reset. |
| 11 | Budget Multi-Period | Month transition (last day to 1st) | Monthly expense counter resets to 0; `tx_count_reset_at` triggers starter transaction limit reset. |
| 12 | Database Schema | Column naming difference (`date` vs `transaction_date`) | `transactions` table in SQL migration uses `transaction_date`, while route handlers and frontend use `date`; code must handle or alias this consistently. |
```

---

## 8. Implementation Blueprint & Recommendations for Dev Agents

### File Action Plan:
1. **Create `scripts/start-telegram-bot.bat`:**
   - Standard batch launcher with Node.js path configuration and restart loop.
2. **Create `scripts/telegram-daemon.mjs`:**
   - Standalone long-polling service running every 1–2s.
   - Cleans webhooks on startup, tracks offset continuously, posts to `/api/telegram/webhook`, logs real-time transactions in console.
3. **Enhance `app/api/telegram/poll/route.ts`:**
   - Add automatic `deleteWebhook()` on initial poll, persist offset, and support configurable timeout.
4. **Create `lib/services/budget-alert.ts`:**
   - Centralized budget evaluation and Telegram alert dispatcher supporting Harian, Mingguan, Bulanan.
   - Alert debouncing (`alert_80_sent` and `alert_100_sent`).
5. **Update `app/api/transactions/route.ts`:**
   - Invoke `evaluateAndSendBudgetAlerts` immediately after saving transactions.
6. **Update `lib/telegram/message-handler.ts`:**
   - Integrate `evaluateAndSendBudgetAlerts` into text, voice, and photo receipt flows.
   - Update `/budget` command to display status across Harian, Mingguan, and Bulanan.
7. **Create `app/api/budget/route.ts`:**
   - Endpoints to fetch and update multi-period budget limits.
8. **Refactor `app/dashboard/budget/page.tsx`:**
   - Implement Harian, Mingguan, Bulanan tabs.
   - Dynamic progress bars with Luxury Obsidian & Deep Emerald aesthetic.
   - Real-time save of budget limits per category.
