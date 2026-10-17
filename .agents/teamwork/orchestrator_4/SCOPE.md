# Scope: Phase 2 — Critical Admin Access Control Fix & Zero-Trust Server-Side Role Enforcement

## Architecture
TataDana Next.js 14 App Router application with dual-portal authentication:
1. **Next.js Edge Middleware (`middleware.ts`)**: Server-side route interceptor enforcing Zero-Trust Default-Deny on all `/admin/*` routes (except `/admin/login`). Checks cryptographic session token cookie (`tatadana_admin_session` / `tatadana_session`), verifies claims, and redirects unauthorized/non-admin users to `/admin/login` or `/login`.
2. **Server-Side Admin Guard (`lib/auth/admin-guard.ts`)**: Deep authorization guard executed on API handlers and Server Actions. Completely eliminates header spoofing (`x-admin-role`) and body manipulation (`admin_role`). Verifies cryptographic session tokens against `PersistentStore`, enforcing `user.role === 'admin'`, `user.email === 'wildanakmalfathan@gmail.com'`, and `user.status === 'active'`.
3. **Admin API Gateways (`app/api/admin/*`)**: All endpoints (`/users`, `/payments`, `/metrics`, `/audit-logs`, `/payments/approve`, `/payments/reject`) strictly enforce 403 Forbidden on unverified requests.
4. **Registration Role Sanitization (`app/api/auth/register`)**: Ignores incoming `role` attributes, defaulting unconditionally to `role: 'user'` and `status: 'pending_approval'`. Rejects registration using `wildanakmalfathan@gmail.com` with HTTP 409 Conflict.
5. **UI Role-Aware Rendering**: `Sidebar`, `Header`, and dashboard layouts suppress any administrative links and buttons unless the verified user role is `admin`.
6. **Comprehensive Automated Verification (`scripts/verify-all.mjs`)**: Suite covering Scenarios A–G (94 test cases) executing negative tests, boundary attacks, and positive verifications with 100% pass rate.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Middleware Route Guard | `middleware.ts` intercepts `/admin/*` routes, checks session token, redirects non-admins. | M2 | ORIGINAL_REQUEST §R1 |
| 2 | Cryptographic Admin Guard | `lib/auth/admin-guard.ts` removes spoofable headers, checks DB store for admin email & role. | M2 | ORIGINAL_REQUEST §R2 |
| 3 | Admin API Endpoints Shield | All `/api/admin/*` routes return 403 Forbidden for unauthorized requests; zero data leakage. | M2 | ORIGINAL_REQUEST §R3 |
| 4 | Registration Isolation | `/api/auth/register` prevents role escalation, locks admin role to `wildanakmalfathan@gmail.com`. | M2 | ORIGINAL_REQUEST §R4 |
| 5 | UI Admin Masking | Admin buttons, links, and navigation completely hidden from regular users in UI components. | M3 | ORIGINAL_REQUEST §R5 |
| 6 | E2E Security Suite (94 Tests) | Automated verification of Scenarios A–G in `scripts/verify-all.mjs` passing 100%. | M3 | ORIGINAL_REQUEST §R6 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Security & Architecture Exploration | Investigate codebase vulnerabilities, routing, middleware, and tests | none | DONE |
| M2 | Backend Zero-Trust Enforcement | Implement middleware.ts, admin-guard.ts, /api/admin/* routes, register lock | M1 | DONE |
| M3 | UI Sanitization & 85+ Test Cases | Clean UI components, expand scripts/verify-all.mjs for Scenarios A–G | M2 | DONE |
| M4 | Adversarial Security Verification | Challenger executes penetration tests across Scenarios A–G | M2, M3 | DONE (APPROVE) |
| M5 | Forensic Integrity Audit | Auditor conducts static and runtime integrity checks | M2, M3, M4 | DONE (CLEAN) |

## Interface Contracts
### `lib/auth/admin-guard.ts` ↔ API Route Handlers
```typescript
export interface AdminAuthResult {
  authorized: boolean;
  user?: UserRecord;
  error?: string;
  statusCode?: number;
  adminId?: string;
}

export async function verifyAdminAuthorization(req: Request | NextRequest): Promise<AdminAuthResult>;
```
- Reads session token strictly from cookie (`tatadana_admin_session` or `tatadana_session`) or `Authorization: Bearer <token>`.
- Client header spoofing (`x-admin-role`, `x-admin-id`) and body spoofing are completely eradicated.
- Verifies cryptographic HMAC-SHA256 signature and matches with user record in persistent storage.
- Enforces `user.role === 'admin'` AND `user.email === 'wildanakmalfathan@gmail.com'` AND `user.status === 'active'`.

### `middleware.ts` Route Rules
- Matcher: `['/admin/:path*']`
- Exclusions: `['/admin/login']`
- Validates token claims via Edge Web Crypto API (`lib/auth/edge-tokens.ts`).
- If no valid admin session -> redirect to `/admin/login` (status 307).

## Code Layout
- `middleware.ts` — Edge middleware route interceptor (M2)
- `lib/auth/edge-tokens.ts` — Edge runtime Web Crypto HMAC-SHA256 token verification (M2)
- `lib/auth/admin-guard.ts` — Server-side Zero-Trust admin authorization utility (M2)
- `lib/auth/tokens.ts` — Cryptographic session token creation & verification (M2)
- `lib/db/persistent-store.ts` — Persistent user and data store (M2)
- `app/api/auth/register/route.ts` — User registration endpoint with admin identity lock (M2)
- `app/api/admin/` — Admin API route handlers (`audit-logs`, `users`, `payments`, `metrics`, `approve`, `reject`) (M2)
- `components/layout/sidebar.tsx` & `app/dashboard/layout.tsx` — UI navigation components with verified admin gates (M3)
- `app/admin/layout.tsx` — Admin layout with token claims pre-validation (M3)
- `tests/e2e/admin-access-control.test.mjs` — Scenarios A through G automated verification tests (M3)
- `scripts/verify-all.mjs` — Comprehensive automated test suite (94/94 passed) (M3)
- `TEST_READY.md` — Published acceptance report (M3)
