## 2026-10-17T10:43:09Z

You are the Backend Zero-Trust & Middleware Specialist for Phase 2: Critical Admin Access Control Fix & Zero-Trust Server-Side Role Enforcement on the TataDana project.

Your Working Directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_phase2_backend_1\
Parent Conversation ID: 27e892d2-ca4f-44cf-8f2e-cc4ff3a17109
Authoritative Request: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md
Scope Document: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\orchestrator_4\SCOPE.md
Explorer Handoff: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_phase2_sec_1\handoff.md
Explorer Analysis: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_phase2_sec_1\analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Exclusive Write Ownership:
- `middleware.ts`
- `lib/auth/admin-guard.ts`
- `app/api/admin/audit-logs/route.ts`
- `app/api/admin/users/route.ts`
- `app/api/admin/payments/approve/route.ts`
- `app/api/admin/payments/reject/route.ts`
- `app/api/admin/metrics/route.ts`
- `app/api/admin/payments/route.ts`
- `app/api/reports/export/route.ts`
- `app/api/transactions/route.ts`
- `app/api/wallets/route.ts`
- `app/api/auth/heartbeat/route.ts`
- `app/api/auth/register/route.ts`

Your Mission & Concrete Tasks:
1. Read the Explorer Handoff (`C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_phase2_sec_1\handoff.md`) and Analysis thoroughly.
2. Implement root `middleware.ts`:
   - Enforce Default-Deny for all `/admin/*` routes (matcher: `['/admin/:path*']`), excluding `/admin/login`.
   - Read session cookies (`tatadana_admin_session`, fallback to `tatadana_session`).
   - In Next.js Edge Runtime, verify cryptographic JWT signature using Web Crypto API (`crypto.subtle`) or HMAC-SHA256, extract token payload, and verify `payload.role === 'admin'` and `payload.email === 'wildanakmalfathan@gmail.com'`.
   - If invalid or unauthenticated, redirect to `/admin/login` (status 307) or respond 403 Forbidden.
3. Harden `lib/auth/admin-guard.ts`:
   - Completely REMOVE lines 39-53 that trust `x-admin-role`, `x-admin-id`, `bearerToken === 'admin-token'`, and `_body.admin_role`.
   - Require valid cryptographic JWT from cookie or `Authorization: Bearer <token>`.
   - Validate token against `PersistentStore.getUsers()`, enforcing:
     `user.role === 'admin' && user.email === 'wildanakmalfathan@gmail.com' && user.status === 'active'`
   - Return `{ authorized: true, user, adminId }` or `{ authorized: false, error: '...', statusCode: 403 }`.
4. Shield all `/api/admin/*` endpoints:
   - In `app/api/admin/audit-logs/route.ts`: add `verifyAdminAuthorization(req)` check and return 403 if unauthorized.
   - In `app/api/admin/users/route.ts`, `app/api/admin/payments/approve/route.ts`, `app/api/admin/payments/reject/route.ts`: stop passing `body` into `verifyAdminAuthorization` to prevent body parameter spoofing.
   - Ensure all admin API routes return HTTP 403 Forbidden when unauthorized.
5. Clean superadmin fallbacks in data routes:
   - In `app/api/reports/export/route.ts`, `app/api/transactions/route.ts`, `app/api/wallets/route.ts`, and `app/api/auth/heartbeat/route.ts`: eliminate `adminRoleHeader === 'admin'` backdoors and `OFFICIAL_SUPERADMIN_ID` fallbacks. Return HTTP 401 Unauthorized if unauthenticated.
6. Verify registration and admin persistence:
   - Ensure `app/api/auth/register/route.ts` strictly ignores any client role and sets `role: 'user'`, `status: 'pending_approval'`.
   - Ensure `wildanakmalfathan@gmail.com` in `data/tatadana-db.json` retains its password hash, active status, and admin role.
7. Verification:
   - Run tests (`node tests/unit/backend-milestone1.test.mjs` or similar targeted verification scripts). Ensure build / TypeScript check succeeds without errors.

Deliverable:
Write `handoff.md` in `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_phase2_backend_1\handoff.md` with full details of changes made, build/test commands executed, and verification output. Notify parent (Recipient: 27e892d2-ca4f-44cf-8f2e-cc4ff3a17109).
