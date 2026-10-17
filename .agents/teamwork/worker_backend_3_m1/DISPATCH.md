## 2026-10-17T05:32:05Z

You are worker_backend_3_m1 working on Milestone 1: Core Backend, Persistent DB & Auth Engine for TataDana.

Your identity and working directory:
- Role: Core Backend & Database Worker
- Working Directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_backend_3_m1
- Project Root: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana
- Original Request File: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md (read this thoroughly!)
- Master Plan: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\orchestrator_3\PROJECT.md
- Prior Explorer & Auditor Reports to consult:
  - C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_backend_3\analysis.md
  - C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\auditor_survey_3\audit_report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Milestone 1 Scope & Exclusive Write Ownership:
1. `lib/db/` — Implement genuine persistent database storage engine (`lib/db/store.ts` or repository) supporting PostgreSQL/Supabase and a robust local persistent JSON file fallback (e.g. `data/tatadana-db.json` with fs atomic writes).
   - Single Source of Truth ledger (`public.transactions`) where wallet balances, calendar, and reports are calculated from real records.
   - Pure integer Rupiah arithmetic (no floating-point drift).
   - Pre-seed official admin user: email `wildanakmalfathan@gmail.com`, phone `+6281460932853`, name `Wildan Akmal Fathan`, role `admin`, plan `pro_lifetime`, status `active`, with genuine scrypt password hash.
2. `lib/auth/password.ts` — Implement cryptographic password hashing and verification using Node.js native `crypto.scrypt` (or scryptSync) with random salt. No plaintext, no fake hashes.
3. `lib/auth/normalization.ts` — Implement email normalization (trim and lowercase) and phone normalization to E.164 (`081460932853` -> `+6281460932853`, `628...` -> `+628...`).
4. `lib/auth/tokens.ts` — Session token generation and verification for authenticated users and admins.
5. `app/api/auth/register/route.ts` — Create genuine registration endpoint:
   - Validates required fields (`full_name`, `email`, `phone`, `password`, `confirmPassword`).
   - Normalizes email (lowercase) and phone (E.164).
   - Checks uniqueness in the persistent store (409 Conflict if duplicate).
   - Hashes password using `lib/auth/password.ts`.
   - Saves new user with initial status `pending_approval`, role `user`, plan `starter`. Returns clean response (never expose password hash).
6. `app/api/auth/login/route.ts` — Create genuine user login endpoint:
   - Validates email and password against persistent store.
   - Rejects unapproved users: status `pending_approval` returns 403 with message: "Akun Anda sedang menunggu persetujuan admin. Silakan hubungi admin jika membutuhkan akses segera."
   - Rejects rejected users: status `rejected` returns 403.
   - Successful login returns auth token and user profile.
7. `app/api/auth/admin-login/route.ts` — Create dedicated admin login endpoint:
   - Strictly permits ONLY `wildanakmalfathan@gmail.com`.
   - Validates admin password hash.
   - Issues admin session token with `role: 'admin'`, plan `pro_lifetime`.
8. `lib/auth/admin-guard.ts` — Protect admin routes and endpoints. Remove insecure `x-admin-role` header spoofing. Enforce genuine session token verification, returning HTTP 403 Forbidden for non-admins.
9. `app/api/transactions/route.ts` & `lib/services/ledger.ts` — Full CRUD for transactions:
   - GET: list transactions from persistent store.
   - POST: create transaction with `idempotency_key` deduplication, atomic wallet balance mutation, and ledger insertion.
   - PUT/PATCH: update transaction with balance difference adjustment.
   - DELETE: delete transaction and rollback the wallet balance atomically.
10. `supabase/migrations/005_master_schema.sql` — Complete SQL migration file reflecting these tables and constraints.

Verification:
- Run `npx tsc --noEmit` via run_command to ensure zero TypeScript compilation errors.
- Document all implemented files and verification commands.
- Keep progress.md updated.
- Write handoff.md in your working directory and notify parent via send_message when done.
