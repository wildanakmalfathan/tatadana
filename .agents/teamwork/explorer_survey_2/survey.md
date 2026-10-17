# Backend & Data Layer Survey Report — TataDana

> **Date:** 2026-10-16  
> **Explorer:** Backend Explorer (`explorer_survey_2`)  
> **Project Root:** `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana`  
> **Objective:** Comprehensive survey of Database/Schema, API routes, Auth & Session context, AI Provider/LLM integration, and Telegram Bot poller to support the 6 key requirements (Kalender, Tata AI Bot, Multi-Wallet, Telegram Auto-Responder, Multi-Period Budgeting, Admin Approval).

---

## 1. Executive Summary

TataDana is built on **Next.js 14 (App Router)** with **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL)** for the data and authentication layer. Contrary to an initial presumption of Prisma ORM, the project does **not** use Prisma; instead, database schemas, tables, views, triggers, and Row Level Security (RLS) policies are defined in PostgreSQL migration scripts (`supabase/migrations/20261010000001_initial_schema.sql`) and interfaced via `@supabase/supabase-js` and `@supabase/ssr` with strong TypeScript typings in `types/database.ts`.

AI functionality is centralized in `lib/ai/multi-provider.ts` (`MultiAIProviderService`), featuring intelligent failover across **Google Gemini (1.5 Flash Vision / Audio)**, **OpenAI (GPT-4o-mini / Whisper)**, **DeepSeek (V3 Chat)**, and an offline Indonesian natural language heuristic parser.

To fulfill all requirements from `ORIGINAL_REQUEST.md`, several specific additions and structural updates are identified across the data schema, API routes, and background polling service.

---

## 2. Database & Data Layer Architecture

### 2.1 Database Technology
- **Engine:** PostgreSQL via Supabase.
- **Migration Location:** `supabase/migrations/20261010000001_initial_schema.sql` (569 lines of SQL).
- **Client Connectors:**
  - `lib/supabase/client.ts` (`createClient` using `createBrowserClient` from `@supabase/ssr`).
  - `lib/supabase/server.ts` (`createServerSupabaseClient` with cookies from Next.js headers).
  - `lib/supabase/admin.ts` (`createAdminClient` with `SUPABASE_SERVICE_ROLE_KEY` bypassing RLS for server-side logic and Telegram webhook handling).

### 2.2 Model Audit & Field Analysis

| Model / Table | Existing Database Columns | Missing / Needed Fields for Requirements | Assessment & Action Required |
|---|---|---|---|
| **`wallets`** | `id`, `user_id`, `name`, `type ('cash'\|'bank'\|'ewallet'\|'other')`, `balance`, `is_default`, `icon`, `color`, `created_at`, `updated_at` | - `account_number TEXT`<br>- `is_default_telegram BOOLEAN DEFAULT false` (or mapped to `is_default`) | **R3 Requirement:** Form modal in `/dashboard/wallet` requires inputting nomor rekening / nomor HP. `account_number` must be added to table and `types/database.ts`. |
| **`budgets`** | `id`, `user_id`, `category_id`, `amount`, `month`, `year`, `alert_80_sent`, `alert_100_sent`, `created_at`, `updated_at`. Unique on `(user_id, category_id, month, year)`. | - `period TEXT DEFAULT 'monthly' CHECK (period IN ('daily', 'weekly', 'monthly'))`<br>- Unique constraint adjusted to `(user_id, category_id, period, month, year)` | **R5 Requirement:** Multi-period budgeting (Harian, Mingguan, Bulanan). Existing schema only supports monthly budgets. Schema update needed for `period` support. |
| **`categories`** | `id`, `user_id`, `name`, `emoji`, `type ('income'\|'expense')`, `color`, `budget_amount`, `is_system`, `created_at`, `updated_at` | Legacy `budget_amount` column exists. | Works in tandem with `budgets` table. Can store default monthly budget or be synchronized with `budgets`. |
| **`transactions`** | `id`, `user_id`, `wallet_id`, `destination_wallet_id`, `category_id`, `amount`, `type ('income'\|'expense'\|'transfer')`, `note`/`notes`, `transaction_date`/`date`, `time`, `receipt_url`, `source ('web'\|'telegram_text'\|'telegram_photo'\|'telegram_voice')`, `telegram_message_id`, `raw_input`, `is_multi_item`, `created_at` | None missing in core schema. | **R1 & R5:** Needs calendar aggregation endpoint (`/api/transactions/calendar`) and post-insert budget limit alert evaluation. |
| **`transaction_items`** | `id`, `transaction_id`, `item_name`, `quantity`, `price`, `category_id`, `created_at` | None missing. | Supports multi-item OCR receipts. |
| **`payment_transactions`** | `id`, `user_id`, `order_id`, `plan ('starter'\|'pro')`, `amount`, `status ('pending'\|'approved'\|'rejected'\|'settlement'\|'expire'\|'cancel')`, `payment_method ('midtrans'\|'manual_transfer')`, `proof_image_url`, `approved_by`, `approved_at`, `midtrans_response`, `created_at`, `updated_at` | None missing in table schema. | **R6 Requirement:** Table exists, but there is NO functional admin approve/reject API route or frontend integration. |
| **`audit_logs`** | `id`, `admin_id`, `action`, `target_user_id`, `reason`, `metadata (JSONB)`, `created_at` | None missing in table schema. | **R6 Requirement:** Table exists, but is not currently populated upon payment approvals or user status changes. |
| **`users` / `profiles`** | `id`, `name`/`full_name`, `phone`/`phone_number`, `role ('user'\|'admin')`, `plan ('starter'\|'pro')`, `telegram_chat_id`, `telegram_username`, `telegram_bot_token`, `telegram_connected`, `monthly_tx_count`, `tx_count_reset_at`, `reminder_enabled`, `created_at`, `updated_at` | None missing. | Seeded with Superadmin: `Wildan Akmal Fathan` (`00000000-0000-0000-0000-000000000001`). Supports instant plan changes. |
| **`telegram_updates`** | `id`, `update_id (UNIQUE)`, `chat_id`, `message_id`, `user_id`, `payload (JSONB)`, `status`, `error_message`, `processed_at` | None missing. | Ensures strict idempotency for Telegram message processing. |

---

## 3. API Routes Survey

### 3.1 Existing Endpoints

| Route Path | Method | Purpose | Implementation Status |
|---|---|---|---|
| `/api/auth/send-otp` | `POST` | Generate & send 6-digit OTP code to Indonesian phone number | Fully functional with sandbox fallback (`123456`) |
| `/api/auth/verify-otp` | `POST` | Verify OTP code and connect phone number | Fully functional |
| `/api/wallets` | `GET, POST, PATCH, DELETE` | CRUD operations for user wallets | Functional, but ignores `account_number` and has starter wallet limit (max 3) |
| `/api/categories` | `GET, POST, PATCH, DELETE` | CRUD operations for transaction categories | Functional with starter category limit (max 5) |
| `/api/categories/recommend` | `POST` | AI-suggested categories for new users | Functional via `MultiAIProviderService` |
| `/api/transactions` | `GET, POST` | Query and create financial transactions | Functional; handles wallet balance trigger, but does NOT check budget thresholds or trigger alerts |
| `/api/reports/summary` | `GET` | Calculate total income, expense, cash flow, top categories | Fully functional (`ReportsService.getSummary`) |
| `/api/reports/transactions` | `GET` | Paginated and filtered transaction history | Fully functional |
| `/api/reports/export` | `POST` | Generate PDF and Excel report documents | Functional using `jspdf` and `exceljs` |
| `/api/reports/history` | `GET` | Fetch list of previously exported report documents | Functional |
| `/api/payments/midtrans/charge` | `POST` | Create Midtrans Snap token & redirect URL | Functional with mock fallback |
| `/api/payments/midtrans/webhook` | `POST` | Process Midtrans webhook notifications and upgrade user to Pro | Functional |
| `/api/telegram/webhook` | `GET, POST` | Webhook endpoint for Telegram updates | Functional; delegates to `TelegramMessageHandler` |
| `/api/telegram/poll` | `GET` | Manual polling endpoint for Telegram updates | Functional, but halts if token has "placeholder" |
| `/api/telegram/setup-bot` | `POST` | Registers public webhook with Telegram API | Functional |
| `/api/telegram/send-reminder` | `POST` | Sends scheduled daily expense reminder via Telegram | Functional |
| `/api/profile` | `GET, PATCH` | Fetch and update user profile settings | Functional |

### 3.2 Missing Endpoints Required for Implementation

To meet all requirements in `ORIGINAL_REQUEST.md`, the following new routes or enhancements must be created:

1. **Calendar Aggregation Endpoint (`/api/transactions/calendar`):**
   - **Method:** `GET`
   - **Query Params:** `month` (1-12), `year` (e.g. 2026), `walletId` (optional, "all" or specific UUID).
   - **Response:** Array of day aggregates (1..31):
     ```json
     {
       "success": true,
       "month": 10,
       "year": 2026,
       "days": [
         {
           "date": "2026-10-10",
           "day": 10,
           "totalIncome": 12000000,
           "totalExpense": 143500,
           "netCashflow": 11856500,
           "transactionCount": 3,
           "transactions": [...]
         }
       ]
     }
     ```

2. **Tata AI Chat Assistant Endpoint (`/api/ai/chat` or `/api/tata-ai/chat`):**
   - **Method:** `POST`
   - **Body:** `{ message: string, history?: Array<{ role: 'user' | 'assistant', content: string }> }`
   - **Capabilities:**
     - Injects real user financial context: total balance across all wallets, current month's income & expenses, highest spending category, and budget usage status.
     - Formulates responses adhering to Indonesian financial persona ("Tata AI Asisten Keuangan Pribadi").
     - Provides consultation for 50/30/20 salary allocation, weekly saving tips, deficit warnings, and vacation budget simulations.
     - Has rich offline fallback when AI API keys are in demo/placeholder mode.

3. **Multi-Period Budget Endpoint (`/api/budgets`):**
   - **Methods:** `GET, POST, PUT, DELETE`
   - **GET Query Params:** `period` (`'daily' | 'weekly' | 'monthly'`), `month`, `year`.
   - **Calculations:** Returns each category's budget limit, current period's spent amount (computed from transactions within today, current week, or current month), percentage, remaining budget, and status (`safe`, `warning` >=80%, `overbudget` >=100%).
   - **POST/PUT Body:** `{ categoryId: string, period: 'daily' | 'weekly' | 'monthly', amount: number }`.

4. **Admin Approval & Payment Operations (`/api/admin/payments`):**
   - **Method:** `GET` (Fetch all payments, filterable by status `pending`, `settlement`, `approved`, `rejected`).
   - **Method:** `POST /api/admin/payments/approve`
     - Payload: `{ paymentId: string, plan: 'pro', note?: string }`.
     - Actions: Updates `payment_transactions` status to `'approved'`, updates target user's `plan` to `'pro'`, and writes audit record to `audit_logs`.
   - **Method:** `POST /api/admin/payments/reject`
     - Payload: `{ paymentId: string, reason?: string }`.
     - Actions: Updates `payment_transactions` status to `'rejected'`, writes audit record to `audit_logs`.

5. **Admin User Status Management (`/api/admin/users`):**
   - **Method:** `GET` (Fetch all users with plan, telegram connection, transaction count).
   - **Method:** `PATCH`
     - Payload: `{ userId: string, plan?: 'starter' | 'pro', role?: 'user' | 'admin', status?: 'active' | 'suspended' }`.
     - Actions: Updates user profile and records `audit_logs`.

---

## 4. Authentication, Sessions & Context Handling

### 4.1 Authentication Mechanism
- **Primary Auth:** Phone Number + 6-digit OTP verification (`PhoneAuthService` in `lib/auth/phone-otp.ts`).
  - Stored in `phone_verifications` table with expiration (5 mins) and attempt limiting (max 5).
  - In development mode, `sandboxCode: "123456"` is supported for rapid local testing.
- **Session Layer:**
  - Client-side: `localStorage` keys `tatadana_user_authenticated`, `tatadana_user_phone`, and `tatadana_user_name`.
  - Server-side: Supabase session cookie read via `@supabase/ssr` `createServerSupabaseClient()`.
  - Default Fallback Identity: Superadmin `Wildan Akmal Fathan` (UUID: `00000000-0000-0000-0000-000000000001`, Phone: `+6281234567890`, Role: `admin`, Plan: `pro`).
  - In server API endpoints, if no cookie session is found in development, routes should safely resolve to this default Superadmin user to allow seamless local verification.

---

## 5. AI Provider & LLM Integration Architecture

### 5.1 MultiAIProviderService (`lib/ai/multi-provider.ts`)
The AI layer is structured around `MultiAIProviderService` with configurable routing:
- **Routing Modes:** `single` or `parallel_failover` (stored in `system_settings` table under `ai_routing`).
- **Configured Providers:**
  1. **Google Gemini:** Primary model `gemini-1.5-flash` (or `gemini-2.5-flash`) via `https://generativelanguage.googleapis.com`.
  2. **OpenAI:** `gpt-4o-mini` for chat and `whisper-1` for voice transcription.
  3. **DeepSeek:** `deepseek-chat` (V3) for cost-effective natural language parsing.
  4. **Groq:** `whisper-large-v3-turbo` for ultra-low-latency (<1s) audio STT.

### 5.2 Heuristic Offline Resilience
- If API keys are unset or placeholder (`AIzaSy_placeholder_gemini_api_key`), `MultiAIProviderService` seamlessly falls back to `heuristicTextParse` and `parseIndonesianNumber`.
- Handles typical Indonesian financial slang:
  - `15rb`, `15k`, `15ribu`, `15rebu` -> `15000`
  - `1.5jt`, `1,5jt`, `1.5 juta` -> `1500000`
  - `500k` -> `500000`
  - Income keywords (`gaji`, `transferan`, `bonus`, `cair`) vs Expense keywords (`beli`, `bayar`, `jajan`, `makan`, `bensin`, `pulsa`).
- **Enhancement Required:** Add a similar resilient offline response generator for Tata AI Chat Assistant (`/dashboard/tata-ai`) to ensure intelligent, contextual responses even when third-party AI keys are unavailable.

---

## 6. Telegram Bot Auto-Responder & Background Long-Polling Service

### 6.1 Current Telegram Bot State
- **Bot API Client:** `lib/telegram/bot-api.ts` implements `TelegramBotApi`:
  - `getMe()`, `setWebhook()`, `deleteWebhook()`, `getUpdates(offset, limit, timeout)`, `sendMessage()`, `sendChatAction()`, `downloadFile()`.
- **Message Handler:** `lib/telegram/message-handler.ts` implements `TelegramMessageHandler`:
  - Idempotency check via `telegram_updates` table.
  - User resolution by Telegram `chat_id`.
  - Natural language transaction parsing via AI / heuristic parser.
  - Receipt image OCR processing (Pro only).
  - Voice note STT processing (duration <= 60s).
  - Commands: `/start`, `/saldo`, `/budget`, `/hari_ini`, `/minggu_ini`, `/bulan_ini`, `/bantuan`, `/sheet`.
  - Automatic transaction recording and wallet balance update.

### 6.2 Identified Problems & Solutions for Real-Time Telegram Response (R4)
1. **Webhook Conflict on Localhost:**
   - If a webhook was previously set on Telegram, calling `getUpdates()` returns HTTP 409 Conflict (`can't use getUpdates method while webhook is active`).
   - **Fix:** Before starting the long-polling loop, the poller must call `botApi.deleteWebhook()`.
2. **Missing Standalone Background Poller Service:**
   - Currently, polling is only accessible via manual GET on `/api/telegram/poll`.
   - **Fix:** Provide a dedicated background daemon poller script (e.g. `scripts/telegram-daemon.mjs` or `scripts/poll-daemon.ts`) and a Windows batch script (`scripts/start-telegram-bot.bat`) that continuously calls `getUpdates()` with a 1-2 second interval, processing updates in real-time.
3. **Placeholder Token Handling:**
   - `app/api/telegram/poll/route.ts` rejects execution if `token.includes('placeholder')`.
   - **Fix:** Allow manual simulated chat or configure a real Telegram bot token in `.env.local` for live Telegram testing.
4. **Proactive Budget Limit Alert Integration (R5):**
   - When a transaction is recorded (either via web `POST /api/transactions` or Telegram text/voice/OCR), evaluate whether daily, weekly, or monthly budget thresholds are reached (>=80% or >=100%).
   - If triggered, send immediate warning message to the user's Telegram `chat_id`:
     `"⚠️ Peringatan Budget TataDana: Pengeluaran kategori Makanan & Minuman hari ini sudah mencapai 85% (Rp63.750 / Rp75.000)!"`

---

## 7. Gap Analysis & Roadmap for Implementation

| Requirement | Current Backend State | Required Additions |
|---|---|---|
| **R1. Kalender Keuangan** | Raw transactions exist in DB; no daily aggregation endpoint. | Create `/api/transactions/calendar` returning daily aggregates (income, expense, count, transaction list) filtered by month, year, and wallet. |
| **R2. Tata AI Bot Chat** | `MultiAIProviderService` has transaction parsing & advisor advice, but no chat endpoint. | Create `/api/ai/chat` (or `/api/tata-ai/chat`) with financial context injection (balance, expenses, top category, 50/30/20 calculation) and conversational flow. |
| **R3. Multi-Wallet** | `wallets` table exists; lacks `account_number` and explicit `is_default_telegram`. | Add `account_number` and `is_default_telegram` to `wallets` table & `types/database.ts`. Update `/api/wallets` CRUD to handle these fields. |
| **R4. Telegram Poller Fix** | Handler is complete, but lacks continuous background daemon and batch script. | Create `scripts/start-telegram-bot.bat` and daemon script with `deleteWebhook()` on init, 1-2s polling loop, and error handling. |
| **R5. Multi-Period Budget** | `budgets` table only supports `month` and `year`. `/dashboard/budget` is static mock. | Add `period` column (`daily`, `weekly`, `monthly`) to `budgets` table & `types/database.ts`. Create `/api/budgets` endpoint and auto-alert hook. |
| **R6. Admin Approval** | `payment_transactions` & `audit_logs` tables exist; `/admin/payments` is static mock. | Create `/api/admin/payments/approve`, `/api/admin/payments/reject`, `/api/admin/users`, and audit logging integration. |

---

## 8. Conclusion
The backend foundation of TataDana is well-architected with Supabase, clean TypeScript definitions, and robust AI multi-provider support. The primary tasks for the implementation phase involve creating the 5 missing API endpoints, extending the schema definitions for `wallets` and `budgets`, establishing the Telegram daemon long-poller, and connecting the frontend dashboards to live backend services.
