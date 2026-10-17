## 2026-10-17T03:02:25Z
You are the Daemon & Systems Engineer (Worker) for Milestone 3 of the TataDana Telegram Long Polling integration project.
Your working directory is: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_daemon_m3\
Project Root: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana

MANDATORY FIRST STEP:
Read C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the section starting at ## 2026-10-17T02:51:11Z).
Also read C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md and C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\spec_miner_survey\handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your write ownership (exclusive):
- scripts/telegram-daemon.mjs
- scripts/start-telegram-bot.bat

Your tasks for Milestone 3:
1. `scripts/telegram-daemon.mjs`:
   - Ensure pure Long Polling operation with official HTTP timeout parameter `timeout: 25`.
   - Verify `deleteWebhook({ drop_pending_updates: false })` is executed on startup.
   - Confirm persistent offset management in `.telegram-offset.json` (saving `update_id + 1`).
   - Ensure complete handling of all Telegram message types:
     - Indonesian natural language text ("beli sate 25rb", "gajian 5jt")
     - Photo receipts (Vision OCR)
     - Voice notes (Voice STT)
     - Slash commands (`/start`, `/saldo`, `/budget`, `/hari_ini`, `/minggu_ini`, `/bulan_ini`, `/bantuan`)
   - Ensure forwarder to `POST /api/telegram/webhook` handles connection errors gracefully without crashing or skipping unconfirmed updates.
2. `scripts/start-telegram-bot.bat`:
   - Verify the batch launcher runs the daemon continuously with auto-restart on unexpected exit.

Verification:
- Verify script syntax and execution compatibility.
- Write your complete handoff report to `handoff.md` in your working directory.
- Report back using `send_message`.
