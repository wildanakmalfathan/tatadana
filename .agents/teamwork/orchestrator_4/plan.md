# Execution Plan: Phase 2 — Critical Admin Access Control Fix & Zero-Trust Server-Side Role Enforcement

## Overview
Transform TataDana into a hardened Zero-Trust administrative security model across routes, APIs, middleware, session verification, user registration, and UI presentation, verified via an expanded 85+ test case suite covering Scenarios A–G.

## 5-Agent Specialist Team Topology
1. **Agent 1: Security & Vulnerability Explorer (`teamwork_preview_explorer`)**
   - Working Dir: `.agents/teamwork/explorer_phase2_sec_1/`
   - Scope: Map existing admin route handling, `middleware.ts` status, `lib/auth/admin-guard.ts` vulnerabilities (e.g. `x-admin-role`), all `/api/admin/*` handlers, `/api/auth/register` role assignment, UI sidebar/header admin links, current `scripts/verify-all.mjs`, and database user records.
   - Deliverable: Detailed vulnerability map, exact file edits, and interface contracts.

2. **Agent 2: Backend Zero-Trust Worker (`teamwork_preview_worker`)**
   - Working Dir: `.agents/teamwork/worker_phase2_backend_1/`
   - Scope:
     - Implement root `middleware.ts` with Edge runtime route protection for `/admin/*` (except `/admin/login`). Default-deny unauthorized/user roles with 403 or redirect.
     - Harden `lib/auth/admin-guard.ts` to strip header spoofing (`x-admin-role`), enforce cryptographic token verification against `PersistentStore`, verify `user.role === 'admin'`, `user.email === 'wildanakmalfathan@gmail.com'`, and `user.status === 'active'`.
     - Secure all `/api/admin/*` endpoints (`/users`, `/payments`, `/metrics`, `/audit-logs`, `/payments/approve`, `/payments/reject`).
     - Isolate `/api/auth/register` to ignore incoming role and enforce `role: 'user'` with `status: 'pending_approval'`. Ensure `wildanakmalfathan@gmail.com` retains admin credentials.
   - Deliverable: Code modifications with passing syntax and backend unit tests.

3. **Agent 3: UI Admin Masking & Test Suite Worker (`teamwork_preview_worker`)**
   - Working Dir: `.agents/teamwork/worker_phase2_ui_tests_1/`
   - Scope:
     - Hide all administrative buttons, links, and navigation items in `Sidebar`, `Header`, `DashboardLayout` for non-admin users.
     - Expand `scripts/verify-all.mjs` to systematically cover Scenarios A–G (85+ test cases) with rigorous checks against header spoofing, middleware redirection, 403 API responses, admin exclusivity, and data isolation.
     - Run `node scripts/verify-all.mjs` and ensure 100% test pass rate.
   - Deliverable: UI changes, expanded verification script, and passing test results report.

4. **Agent 4: Adversarial Security Challenger (`teamwork_preview_challenger`)**
   - Working Dir: `.agents/teamwork/challenger_phase2_sec_1/`
   - Scope:
     - Execute adversarial penetration tests covering Scenarios A–G:
       - Scenario A: Regular user login
       - Scenario B: Direct `/admin/*` route access without admin credentials
       - Scenario C: Direct `/api/admin/*` calls with regular user token
       - Scenario D: Header/body spoofing (`x-admin-role`, `admin_role`)
       - Scenario E: Unauthorized access to other users' financial data
       - Scenario F: Legitimate admin login (`wildanakmalfathan@gmail.com`)
       - Scenario G: Admin exclusive access verification
     - Verify test robustness and return empirical verdict.

5. **Agent 5: Forensic Integrity Auditor (`teamwork_preview_auditor`)**
   - Working Dir: `.agents/teamwork/auditor_phase2_sec_1/`
   - Scope:
     - Inspect source code, git diff, and execution logs.
     - Verify zero mock bypasses, no dummy auth routines, no hardcoded spoof passes.
     - Confirm authentic cryptographic session and persistent DB validation.
     - Issue gate verdict: CLEAN or INTEGRITY VIOLATION.

## Success Criteria
- [ ] Root `middleware.ts` protects all `/admin/*` routes.
- [ ] `lib/auth/admin-guard.ts` rejects all header/body spoofing attempts.
- [ ] `/api/admin/*` returns HTTP 403 Forbidden for unauthorized requests.
- [ ] Only `wildanakmalfathan@gmail.com` can hold active admin privileges.
- [ ] No admin UI elements visible to regular users.
- [ ] 85+ test cases in `scripts/verify-all.mjs` pass 100%.
- [ ] Challenger confirms Scenarios A–G security.
- [ ] Auditor issues CLEAN verdict.
