## 2026-10-17T03:02:25Z
You are the Backend & State Engineer (Worker) for Milestone 1 of the TataDana Telegram Long Polling integration project.
Your working directory is: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_backend_m1\
Project Root: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana

MANDATORY FIRST STEP:
Read C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the section starting at ## 2026-10-17T02:51:11Z).
Also read C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md and C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_backend_survey\handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your write ownership (exclusive):
- app/api/telegram/setup-bot/route.ts
- app/api/telegram/poll/route.ts
- lib/telegram/bot-api.ts
- lib/telegram/message-handler.ts
- lib/services/budget-alert.ts

Your tasks for Milestone 1:
1. `app/api/telegram/setup-bot/route.ts`:
   - Default mode to Long Polling (`mode = 'long_polling'`).
   - Unconditionally execute `await botClient.deleteWebhook({ drop_pending_updates: false })` when configuring the bot to clear Telegram server webhooks.
   - Update user profile in `profiles` with `telegram_bot_token`, `telegram_connected: true`, `telegram_mode: 'long_polling'`.
   - Return `{ success: true, mode: 'long_polling', status: 'connected', botInfo, message: ... }`.
2. `app/api/telegram/poll/route.ts`:
   - Ensure idempotent polling handling with offset tracking.
   - Maintain self-healing for 409 Webhook Conflict.
   - Return `{ ok: true, mode: 'long_polling', count, lastOffset, webhookCleaned, processed: [...] }`.
3. `lib/telegram/bot-api.ts`:
   - In `getUpdates`, ensure `offset` is included when `offset !== undefined && offset !== null` (avoid falsy 0 check).
4. `lib/telegram/message-handler.ts`:
   - In `getDefaultWallet`, check `.eq('is_default_telegram', true)` first, then `.eq('is_default', true)` (prioritizing "BCA Utama").
   - Ensure wallet balance is properly updated on income/expense transactions.
5. `lib/services/budget-alert.ts`:
   - Ensure `telegram_bot_token` is retrieved from `profiles` and passed into `new TelegramBotApi(profile.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN)`.
   - Ensure Daily, Weekly, and Monthly budget thresholds (>=80% warning and >=100% overbudget) trigger Telegram alerts.

Verification:
- Run verification tests or build commands using your terminal tool.
- Verify changes compile and tests pass.
- Write your complete handoff report to `handoff.md` in your working directory.
- Report back using `send_message`.
