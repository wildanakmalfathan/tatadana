## 2026-10-17T11:09:45Z
You are the UI Sanitization & E2E Test Suite Specialist for Phase 2: Critical Admin Access Control Fix & Zero-Trust Server-Side Role Enforcement on the TataDana project.

Your Working Directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_phase2_ui_tests_1\
Parent Conversation ID: 27e892d2-ca4f-44cf-8f2e-cc4ff3a17109
Authoritative Request: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md
Scope Document: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\orchestrator_4\SCOPE.md
Explorer Handoff: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_phase2_sec_1\handoff.md
Backend Worker Handoff: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_phase2_backend_1\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Exclusive Write Ownership:
- `components/layout/sidebar.tsx`
- `app/dashboard/layout.tsx`
- `app/admin/layout.tsx`
- `app/admin/page.tsx`
- `app/admin/users/page.tsx`
- `app/admin/payments/page.tsx`
- `tests/e2e/tier2-boundary.test.mjs`
- `tests/e2e/master-implementation.test.mjs`
- `scripts/verify-all.mjs`
- `TEST_READY.md`

Your Mission & Concrete Tasks:
1. Review Backend Worker Handoff (`C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_phase2_backend_1\handoff.md`).
2. UI Sanitization (R5):
   - In `components/layout/sidebar.tsx` and `app/dashboard/layout.tsx`: Ensure the Admin Panel link (`/admin`) is completely hidden from regular users. Do not rely on untrusted `localStorage.getItem('tatadana_user_role')` — verify the user role from authenticated session token or `/api/auth/me` / user session state.
   - In `app/admin/layout.tsx`: Upgrade the client auth check so it doesn't simply check if ANY token exists, but validates the token payload claims or calls `/api/auth/me`.
   - In `app/admin/page.tsx`, `app/admin/users/page.tsx`, and `app/admin/payments/page.tsx`: Remove `'x-admin-role': 'admin'` and `'x-admin-id'` from all `fetch` request headers! Rely exclusively on cookies or `Authorization: Bearer <token>` as enforced by the backend Zero-Trust guard.
3. Test Suite Alignment & 100% Pass Rate (R6):
   - In `tests/e2e/tier2-boundary.test.mjs:342-353`: Invert the obsolete assertion that previously expected `x-admin-role: admin` to return HTTP 200. Now it must assert that `x-admin-role: admin` returns HTTP 403 Forbidden!
   - In `tests/e2e/master-implementation.test.mjs:38`: Attach an authenticated token (Bearer token or cookie) when calling `/api/wallets` since unauthenticated requests are now strictly rejected with HTTP 401.
   - Verify that Scenarios A through G in `scripts/verify-all.mjs` (already present and passing 9/9) are properly integrated and reported.
4. Run the entire test suite:
   - Run `node scripts/verify-all.mjs`
   - Ensure 100% pass rate: 0 failed, 94+ tests passed!
5. Update `TEST_READY.md` to reflect the 100% passing state and Phase 2 completion.

Deliverable:
Write `handoff.md` in `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_phase2_ui_tests_1\handoff.md` with full details of changes, test commands and output, and notify parent (Recipient: 27e892d2-ca4f-44cf-8f2e-cc4ff3a17109).
