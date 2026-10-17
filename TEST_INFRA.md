# E2E Test Infra: TataDana Telegram Long Polling Integration

## Test Philosophy
- Opaque-box, requirement-driven verification covering the full user journey of Telegram bot integration on localhost.
- Dual-track testing methodology:
  - Tier 1: Feature Coverage (Isolation verification of endpoints, polling mechanisms, UI components, daemon scripts)
  - Tier 2: Boundary & Corner Cases (Invalid tokens, HTTP 409 conflict, empty updates, zero amounts, unlinked users, rapid polling)
  - Tier 3: Cross-Feature Combinations (Simultaneous auto-polling + transaction recording + wallet deduction + multi-period budget evaluation)
  - Tier 4: Real-World Application Scenarios (End-to-end Indonesian financial chats: text transactions, slash commands, budget threshold breach alerts)

## Feature Inventory
| # | Feature | Source (Requirement) | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|----------------------|:------:|:------:|:------:|:------:|
| 1 | Polling-First Bot Setup (`/api/telegram/setup-bot`) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 2 | Idempotent Polling Endpoint (`/api/telegram/poll`) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 3 | In-App Auto-Poller & Settings UI Refresh | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 4 | Background Long-Polling Daemon (`telegram-daemon.mjs`) | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 5 | Default Wallet Debit/Credit (BCA Utama) | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| 6 | Multi-Period Budget Alerts (80% & 100% WIB) | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Master Test Runner**: `node scripts/verify-all.mjs`
- **Sub-Suites in `tests/e2e/`**:
  - `route-health.test.mjs`: HTTP status 200 checks across all pages and API endpoints (including `/api/telegram/poll`).
  - `theme-audit.test.mjs`: Luxury Obsidian Black & Deep Emerald Green design tokens audit.
  - `tier1-features.test.mjs`: Unit & feature contract tests for Setup Bot, Polling Route, and Message Handlers.
  - `tier2-boundary.test.mjs`: Edge case handling (409 conflict, missing tokens, invalid payloads).
  - `tier3-combinations.test.mjs`: Cross-module state flow (Polling -> Transaction -> Default Wallet -> Budget Alert).
  - `tier4-scenarios.test.mjs`: Full real-world simulation workloads.
- **Pass/Fail Semantics**: All test suites must exit with code 0 and report 0 failures.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Expected Outcome |
|---|----------|--------------------|------------------|
| 1 | User sets bot token in Settings | Setup Bot, deleteWebhook, UI mode badge | Webhook cleared, mode `long_polling` saved, UI renders `"Mode: Long Polling (Localhost Ready)"`. |
| 2 | Auto-Polling receives text transaction "beli makan siang 35000" | `/api/telegram/poll`, MessageHandler, BCA Utama wallet | Expense recorded, BCA Utama balance debited, log visible in Settings chat stream. |
| 3 | Expense reaches 85% of Daily Food Budget | MessageHandler, BudgetAlertService, TelegramBotApi | Evaluation detects 85% >= 80%, generates 80% warning alert message to Telegram. |
| 4 | Subsequent expense pushes spending past 100% of Weekly Budget | MessageHandler, BudgetAlertService, TelegramBotApi | Evaluation detects >= 100%, generates 100% overbudget alert message to Telegram. |
| 5 | User checks balance with `/saldo` command | Polling / Webhook, MessageHandler command execution | Returns formatted breakdown of all active wallets (BCA Utama, Cash, etc.). |

## Coverage Thresholds
- Tier 1: ≥ 18 tests
- Tier 2: ≥ 15 tests
- Tier 3: ≥ 3 tests
- Tier 4: ≥ 5 tests
- Route Health & Theme Audit: ≥ 12 tests
- Total Minimum Test Count: ≥ 53 passing test cases
