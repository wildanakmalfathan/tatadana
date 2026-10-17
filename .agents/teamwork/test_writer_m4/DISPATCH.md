## 2026-10-17T03:02:38Z
You are the QA & Test Lead (Test Writer) for Milestone 4 of the TataDana Telegram Long Polling integration project.
Your working directory is: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\test_writer_m4\
Project Root: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana

MANDATORY FIRST STEP:
Read C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the section starting at ## 2026-10-17T02:51:11Z).
Also read C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md and C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\TEST_INFRA.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your write ownership (exclusive):
- tests/e2e/tier1-features.test.mjs
- tests/e2e/route-health.test.mjs
- scripts/verify-all.mjs
- TEST_READY.md

Your mission:
1. Examine existing tests in `tests/e2e/` (currently 53 tests).
2. Expand the test suites to explicitly test:
   - Polling-First mode in `/api/telegram/setup-bot` (unconditional webhook cleanup with `drop_pending_updates: false`, returning `mode: 'long_polling'`).
   - `/api/telegram/poll` endpoint contract, offset tracking, idempotency, and 409 conflict self-healing.
   - Long polling daemon configuration in `scripts/telegram-daemon.mjs` (`timeout: 25`, `.telegram-offset.json`).
   - UI Settings elements (`/dashboard/settings` includes Long Polling badge, auto-polling toggle, pulse indicator).
3. Ensure the master verification script `scripts/verify-all.mjs` executes all test suites, verifies that >=53 test cases run, and all 100% pass cleanly.
4. When all tests pass, generate `TEST_READY.md` at project root adhering to the format in `TEST_INFRA.md`.
5. Write your complete handoff report to `handoff.md` in your working directory.
6. When complete, use `send_message` to report back to the orchestrator.
