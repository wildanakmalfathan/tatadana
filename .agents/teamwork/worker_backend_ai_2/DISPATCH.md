# Task Assignment: Agent 2 — AI & Analytics Backend Specialist Worker

Working directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_backend_ai_2
Project root: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana
User request file: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md
Backend survey report: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_survey_2\survey.md

## Objective
Implement backend API routes for R1 (Calendar Aggregation API) and R2 (Tata AI Chat Backend with financial context injection, 50/30/20 salary allocation, and courteous Indonesian responses).

## Exclusive Write Ownership
You ONLY write/modify these files:
- `app/api/transactions/calendar/route.ts`
- `app/api/ai/chat/route.ts`
- `lib/ai/financial-context.ts`
DO NOT modify any frontend pages, wallet/budget/admin UI, or telegram daemon scripts.

## Detailed Requirements
1. **Calendar Aggregation API (`app/api/transactions/calendar/route.ts`)**:
   - Query params: `month` (1-12), `year` (e.g. 2026), `wallet_id` (optional filter).
   - Fetch transactions for the user for that month/year (and optional wallet).
   - Group by date (`YYYY-MM-DD`). Compute total `income`, `expense`, and `count` per day.
   - Return detailed transaction items per day (`id`, `amount`, `type`, `category`, `wallet`, `notes`, `date`).
   - Include monthly summary: `total_income`, `total_expense`, `net_savings`.
   - Provide realistic fallback data if database is empty or Supabase is offline.
2. **Tata AI Chat Backend (`app/api/ai/chat/route.ts` & `lib/ai/financial-context.ts`)**:
   - Accepts `POST` with `{ message: string, history: Array<{ role: 'user' | 'assistant', content: string }> }`.
   - Injects user financial context: total wallet balance, recent monthly average spending, top spending categories, and active budgets.
   - Answers financial consultation queries:
     - 50/30/20 salary allocation method (50% Kebutuhan Pokok, 30% Keinginan, 20% Tabungan/Investasi).
     - Spending analysis and deficit early warnings.
     - Polite, encouraging, and actionable Indonesian responses.
     - Supports quick prompts: "Analisa pengeluaranku", "Beri tips hemat minggu ini", "Simulasi budget liburan".
   - Integrates with `MultiAIProviderService` (Gemini, OpenAI, Groq) with smart conversational heuristic fallback when API keys are unconfigured or offline.
   - Returns `{ reply: string, suggested_actions: string[] }`.

## Verification & Completion Criteria
- Run tests or execute sample queries to verify endpoints respond with HTTP 200 OK and expected JSON contracts.
- Document in `handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## 2026-10-16T03:43:07Z
You are AI & Analytics Backend Specialist Worker (worker_backend_ai_2).
Your working directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_backend_ai_2
Project root: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana
User request file: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md
Task assignment: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_backend_ai_2\DISPATCH.md
