# Backend Survey & Architecture Report: Telegram Long Polling Integration

**Author:** Backend Explorer  
**Date:** 2026-10-17  
**Working Directory:** `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_backend_survey\`  
**Project Root:** `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana`  
**Target Milestone:** Telegram Long Polling Mode Transition, Polling Endpoint, Background Daemon, Default Wallet, and Multi-Period Budget Alerts

---

## 1. Observation

Direct examination of the project repository reveals the following concrete implementations, line numbers, and behavior:

### A. Setup Route: `app/api/telegram/setup-bot/route.ts`
- **Location:** Lines 97–150
- **Lines 105–109 (Current Webhook Handling):**
  ```typescript
  let webhookStatusMsg = ''
  if (isLocalhost) {
    // Telegram menolak http://localhost untuk webhook.
    // Bersihkan webhook lama agar Telegram mengizinkan mode Polling lokal (/api/telegram/poll).
    await botClient.deleteWebhook()
    webhookStatusMsg = `Token bot valid (@${botInfo.username})! Berjalan di localhost (Webhook dibersihkan agar bot siap menerima chat via polling/tunnel).`
  } else {
    // Production HTTPS URL -> daftarkan setWebhook
    const webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/telegram/webhook`
    const webhookResult = await botClient.setWebhook(webhookUrl)
    ...
  ```
  - **Observation 1:** `botClient.deleteWebhook()` is called without arguments; it does NOT pass `{ drop_pending_updates: false }`.
  - **Observation 2:** Webhook deletion only executes when `isLocalhost` is true. If `baseUrl` points to a non-localhost domain, it still attempts `setWebhook`.
- **Lines 40–47 & 130–139 (Mode Persistence):**
  ```typescript
  await adminClient
    .from('profiles')
    .update({
      telegram_bot_token: cleanToken,
      telegram_connected: true,
      telegram_connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
  ```
  - **Observation 3:** `profiles` is updated with token and connection status, but `telegram_mode` is never written.
- **Lines 140–150 (Response Payload):**
  ```typescript
  return NextResponse.json({
    success: true,
    message: webhookStatusMsg,
    status: 'connected',
    botInfo: {
      id: botInfo.id,
      firstName: botInfo.first_name,
      username: botInfo.username,
    },
    isLocalhost,
  })
  ```
  - **Observation 4:** In mock simulation mode (line 58), `mode: 'simulation'` is returned, but in real token verification (line 140), `mode: 'long_polling'` is NOT returned.

### B. Telegram Bot API: `lib/telegram/bot-api.ts`
- **Lines 104–119 (`deleteWebhook` method):**
  ```typescript
  async deleteWebhook(options?: { drop_pending_updates?: boolean }): Promise<{ ok: boolean; description?: string }> {
    if (!this.isConfigured()) {
      return { ok: false, description: 'Token bot belum diatur atau masih placeholder' }
    }
    try {
      const url = new URL(`${this.baseUrl}/deleteWebhook`)
      if (options?.drop_pending_updates !== undefined) {
        url.searchParams.set('drop_pending_updates', String(options.drop_pending_updates))
      }
      const res = await fetch(url.toString(), { method: 'POST' })
      const data = await res.json()
      return data
    } catch (error: any) {
      return { ok: false, description: error.message || 'Gagal menghapus webhook Telegram' }
    }
  }
  ```
  - **Observation 5:** `deleteWebhook` supports `options.drop_pending_updates` via URL query param on POST `deleteWebhook`.

### C. Polling Route: `app/api/telegram/poll/route.ts`
- **Lines 8–18 (Offset & Query Parameters):**
  ```typescript
  // Store last processed update_id in memory for local polling session
  let lastUpdateOffset = 0
  let webhookCleaned = false

  export async function GET(req: Request) {
    try {
      const { searchParams } = new URL(req.url)
      const token = searchParams.get('token') || process.env.TELEGRAM_BOT_TOKEN
      const forceCleanup = searchParams.get('cleanup') === 'true'
      const queryOffset = searchParams.get('offset')
      const timeout = Math.min(25, Math.max(0, Number(searchParams.get('timeout')) || 0))
      const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20))
  ```
- **Lines 41–53 (Offset Calculation & Self-Healing 409):**
  ```typescript
  const currentOffset = queryOffset !== null ? Number(queryOffset) : (lastUpdateOffset ? lastUpdateOffset + 1 : undefined)
  let updatesRes = await botApi.getUpdates(currentOffset, limit, timeout)

  // 3. Self-healing 409 Conflict: if webhook is still registered on Telegram servers, delete it and retry
  if (!updatesRes.ok && updatesRes.description?.toLowerCase().includes('webhook')) {
    console.warn('[Telegram Poll] 409 Conflict detected: Webhook still active. Deleting webhook and retrying...')
    const delRes = await botApi.deleteWebhook({ drop_pending_updates: false })
    if (delRes.ok) {
      webhookCleaned = true
      cleanedThisCall = true
      updatesRes = await botApi.getUpdates(currentOffset, limit, timeout)
    }
  }
  ```
- **Lines 67–76 (Update Processing Loop):**
  ```typescript
  for (const update of updates) {
    lastUpdateOffset = Math.max(lastUpdateOffset, update.update_id)
    const res = await handler.handleUpdate(update)
    processed.push({
      update_id: update.update_id,
      sender: update.message?.from?.username || update.message?.from?.first_name || 'unknown',
      text: update.message?.text || (update.message?.photo ? '[Photo Receipt]' : update.message?.voice ? '[Voice Note]' : '[Other]'),
      result: res,
    })
  }
  ```
  - **Observation 6:** Endpoint exists and supports both GET and POST. It includes self-healing 409 conflict handling.
  - **Observation 7:** Offset tracking relies on an in-memory variable `let lastUpdateOffset = 0` which resets to 0 upon Next.js server reload or route re-compilation, and is disconnected from the daemon's `.telegram-offset.json` file.

### D. Daemon Script & Batch Launcher: `scripts/telegram-daemon.mjs` & `scripts/start-telegram-bot.bat`
- **`scripts/telegram-daemon.mjs` Lines 62–64, 78–96:**
  - `WEBHOOK_FORWARD_URL = ${APP_URL}/api/telegram/webhook`
  - `OFFSET_FILE = path.join(__dirname, '.telegram-offset.json')`
  - Uses `readSavedOffset()` and `saveOffset(currentOffset)` on disk.
- **Lines 164–175:**
  - Calls `deleteWebhook({ drop_pending_updates: false })` on startup.
- **Lines 197–205 (Polling Parameter):**
  ```typescript
  const params = {
    limit: 20,
    timeout: 15,
  }
  if (currentOffset > 0) {
    params.offset = currentOffset
  }
  const updatesRes = await callTelegram('getUpdates', params, 'GET')
  ```
  - **Observation 8:** Polling timeout is set to `15` seconds, whereas Requirement R3 states: "Menggunakan `getUpdates` dengan parameter `timeout: 25` (long-polling HTTP resmi Telegram)."
- **Lines 246–265 (Forwarding to Webhook):**
  - Forwards update payload to `http://localhost:3000/api/telegram/webhook`. If HTTP status < 500, increments offset to `update.update_id + 1` and persists to `.telegram-offset.json`.
- **`scripts/start-telegram-bot.bat` Lines 6–26:**
  - Sets `PATH` to include Node.js v20 in scratch directory, sets project directory, runs `node scripts/telegram-daemon.mjs` in an auto-restarting `:LOOP` with 3-second delay.

### E. Message Handler & Wallet Balance Integration: `lib/telegram/message-handler.ts`
- **Lines 901–934 (`getDefaultWallet`):**
  ```typescript
  private async getDefaultWallet(userId: string): Promise<Wallet> {
    const { data: defWallet } = await this.adminClient
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .maybeSingle()

    if (defWallet) return defWallet as Wallet
    ...
  ```
  - **Observation 9:** `getDefaultWallet` queries `.eq('is_default', true)`. It does NOT check `is_default_telegram: true`. In `app/api/wallets/route.ts` (lines 15–19), wallet `w-1` ("BCA Utama") has both `is_default: true` and `is_default_telegram: true`. If a user assigns a different wallet as the default Telegram wallet, `getDefaultWallet` would fail to honor the `is_default_telegram` selection.
- **Lines 481–506 (`saveAndReplyTransaction` balance update):**
  ```typescript
  const { data: newTx, error: txError } = await this.adminClient
    .from('transactions')
    .insert({ ... })
    .select()
    .single()

  // 4. Ambil saldo terbaru dompet setelah trigger update
  const updatedWallet = await this.getWalletById(defaultWallet.id)
  const currentBalance = Number(updatedWallet?.balance) || 0
  ```
  - **Observation 10:** Transaction insertion assumes database trigger `sync_wallet_balance` exists in Postgres. In local development or mocked environments where Postgres triggers are absent, `updatedWallet.balance` is not updated unless explicitly modified.

### F. Multi-Period Budget Alert System: `lib/services/budget-alert.ts`
- **Lines 41–92 (`getPeriodDateRange`):**
  - Accurately computes ISO dates and boundaries for `daily` (today), `weekly` (Monday–Sunday), and `monthly` (1st to last day of current month) under WIB (`Asia/Jakarta`).
- **Lines 140–177 (Budget Limits):**
  - Resolves limits for daily, weekly, and monthly from `budgets` table records or category fallback columns (`budget_daily`, `budget_weekly`, `budget_monthly` / `budget_amount`).
- **Lines 190–211 (Consumption calculation):**
  - Sums expenses from `transactions` in the date range and calculates `percentage = (spent / limit) * 100`.
  - Flags `warning` when `percentage >= 80%` and `overbudget` when `percentage >= 100%`.
- **Lines 222–284 (Alert Dispatching & Deduplication):**
  - Deduplicates via `sentAlertsCache` (`${userId}:${categoryId}:${period}:${periodKey}:${threshold}`) and updates `budgets.alert_80_sent` and `alert_100_sent`.
  - Dispatches message using `botApi.sendMessage(profile.telegram_chat_id, alertMsg, { parse_mode: 'Markdown' })`.
- **Lines 180–182 (Bot API instantiation):**
  ```typescript
  const botApi = new TelegramBotApi()
  const canSendTelegram = Boolean(profile?.telegram_chat_id && profile?.telegram_connected)
  ```
  - **Observation 11:** Line 122 selects `id, full_name, telegram_chat_id, telegram_connected` from `profiles`, but does NOT select `telegram_bot_token`. Line 180 instantiates `new TelegramBotApi()` without passing a token, falling back only to `process.env.TELEGRAM_BOT_TOKEN`. If the user entered their own bot token in Settings, budget alerts will fail if the global environment variable is placeholder.

---

## 2. Logic Chain

1. **Long Polling Mode Transition (R1):**
   - *Premise:* Local development environments cannot receive incoming webhooks directly from Telegram without public HTTPS tunnels (which cause HTTP 409 Conflict if active webhooks exist on Telegram servers).
   - *Observation References:* Obs 1, Obs 2, Obs 3, Obs 4.
   - *Inference:* In `app/api/telegram/setup-bot/route.ts`, switching to Polling-First architecture requires:
     1. Unconditional execution of `deleteWebhook({ drop_pending_updates: false })` during bot configuration.
     2. Saving `telegram_mode: 'long_polling'` in the database/profile record.
     3. Returning `mode: 'long_polling'` in the JSON response so the UI immediately knows long polling is active.

2. **Idempotency and Offset Tracking in Polling (R1 & R2):**
   - *Premise:* An in-app poller (`/api/telegram/poll`) and a background daemon (`scripts/telegram-daemon.mjs`) may both interact with Telegram's `getUpdates` API.
   - *Observation References:* Obs 6, Obs 7.
   - *Inference:* Next.js hot module reloading resets in-memory variables (`lastUpdateOffset = 0`). If `/api/telegram/poll` does not receive an `offset` query parameter and `lastUpdateOffset` is 0, it asks Telegram for unconfirmed updates. If synchronized with the persistent `.telegram-offset.json` or by reading the max `update_id` from `telegram_updates` table, polling requests remain consistent across server reboots.

3. **Daemon Long Polling Specification Compliance (R3):**
   - *Premise:* Telegram's official long-polling protocol uses HTTP keep-alive timeouts up to 25–30 seconds to minimize network churn and latency.
   - *Observation References:* Obs 8.
   - *Inference:* Modifying `timeout: 15` to `timeout: 25` in `scripts/telegram-daemon.mjs` directly satisfies requirement R3.

4. **Multi-Wallet Default Routing (R4):**
   - *Premise:* The application provides a "Jadikan Default Telegram" toggle on wallet cards (e.g. BCA Utama). Incoming transactions through Telegram must debit/credit the selected default Telegram wallet.
   - *Observation References:* Obs 9, Obs 10.
   - *Inference:* In `lib/telegram/message-handler.ts:getDefaultWallet`, querying `.eq('is_default_telegram', true)` before falling back to `.eq('is_default', true)` ensures user-selected Telegram default wallets (BCA Utama) receive all incoming transactions. Additionally, adding an explicit wallet balance update fallback guarantees balance changes reflect immediately in dev/sandbox environments without depending solely on database triggers.

5. **Budget Alerts with User Bot Tokens (R4 & R5):**
   - *Premise:* Multi-period budget threshold alerts must be delivered to the user's Telegram chat.
   - *Observation References:* Obs 11.
   - *Inference:* Selecting `telegram_bot_token` from `profiles` in `lib/services/budget-alert.ts` and passing it to `new TelegramBotApi(profile.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN)` ensures that alert messages are sent through the user's active bot instance.

---

## 3. Caveats

1. **Database Triggers vs. Application Logic:** In production Supabase with Postgres migration `20261010000001_initial_schema.sql` applied, the `sync_wallet_balance` trigger automatically recalculates `wallets.balance`. In local test runners or when Supabase client operates with mocked/fallback data, explicit application-level updates are safer.
2. **Concurrent Polling Conflict:** If both the background daemon (`scripts/telegram-daemon.mjs`) and the in-app auto-poller (`/api/telegram/poll`) run simultaneously on the same Telegram Bot Token with different offsets, Telegram will alternate update deliveries between them. Because both forward to the idempotent `TelegramMessageHandler` (which deduplicates via `telegram_updates`), no duplicate transactions will be created, but sharing persistent offset minimizes duplicate fetches.
3. **No Caveats Beyond Above:** All target files, routes, daemon scripts, and test suites have been directly inspected.

---

## 4. Conclusion & Actionable Implementation Plan

The current backend implementation provides a solid foundation (message parser, vision OCR, voice STT, budget calculation engine, and background daemon). To fully fulfill the Telegram Long Polling specification, the following specific code edits are required:

### Summary of Recommended Changes by File

| File Path | Nature of Change | Specific Details |
|---|---|---|
| `app/api/telegram/setup-bot/route.ts` | Edit | 1. Replace conditional webhook registration with unconditional `deleteWebhook({ drop_pending_updates: false })`.<br>2. Store `telegram_mode: 'long_polling'` in `profiles` update payload.<br>3. Return `mode: 'long_polling'` in JSON response. |
| `app/api/telegram/poll/route.ts` | Edit | 1. Initialize `lastUpdateOffset` from persistent `.telegram-offset.json` or `telegram_updates` table when in-memory offset is 0.<br>2. Ensure returned payload includes `mode: 'long_polling'` and verified count. |
| `scripts/telegram-daemon.mjs` | Edit | 1. Update `timeout: 15` to `timeout: 25` in polling params per R3.<br>2. Ensure `deleteWebhook({ drop_pending_updates: false })` is preserved on startup. |
| `lib/telegram/message-handler.ts` | Edit | 1. In `getDefaultWallet()`, check `.eq('is_default_telegram', true)` first, then `.eq('is_default', true)`, defaulting to "BCA Utama".<br>2. In `saveAndReplyTransaction()` and `handlePhotoReceipt()`, ensure explicit wallet balance update fallback if trigger is inactive. |
| `lib/services/budget-alert.ts` | Edit | 1. In line 122, add `telegram_bot_token` to selected profile fields.<br>2. In line 180, pass `profile?.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN` to `TelegramBotApi`. |

---

## 5. Verification Method

To independently verify the backend implementation after changes are applied:

1. **Setup Route Verification:**
   - Send POST to `http://localhost:3000/api/telegram/setup-bot` with body `{"botToken": "demo_bot_token_tatadana"}`.
   - Verify HTTP 200 response contains:
     ```json
     {
       "success": true,
       "mode": "long_polling",
       "status": "connected"
     }
     ```
2. **Polling Route Verification:**
   - Send GET to `http://localhost:3000/api/telegram/poll`.
   - Verify HTTP 200 OK response with `{ ok: true, webhookCleaned: true, lastOffset: ... }`.
3. **Daemon Configuration Verification:**
   - Check `scripts/telegram-daemon.mjs` for `timeout: 25` and `drop_pending_updates: false`.
4. **Default Wallet & Budget Alert Verification:**
   - Inspect `getDefaultWallet` query in `lib/telegram/message-handler.ts` to confirm `is_default_telegram` is queried first.
   - Run verification suite:
     ```powershell
     node scripts/verify-all.mjs
     ```
   - Verify that all 53+ test cases across Tier 1 through Tier 4 pass 100%.
