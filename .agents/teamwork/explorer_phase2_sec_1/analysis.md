# Security & Architectural Analysis: Phase 2 Zero-Trust Admin Access Control & Server-Side Role Enforcement

**Project**: TataDana SaaS Finansial Indonesia  
**Author**: Security & Architecture Explorer (`explorer_phase2_sec_1`)  
**Parent Task**: `27e892d2-ca4f-44cf-8f2e-cc4ff3a17109`  
**Date**: 2026-10-17  
**Status**: Completed Investigation  

---

## Executive Summary

A comprehensive architectural and forensic security investigation across the TataDana Next.js 14 codebase has identified several critical authorization vulnerabilities that permit unauthenticated or non-admin users to access administrator portals, call administrative API routes, impersonate the administrator, and access sensitive user records.

Specifically:
1. **Missing Edge Route Middleware (`middleware.ts`)**: There is no root `middleware.ts`. Route protection relies entirely on client-side React layout state in `app/admin/layout.tsx`, which improperly allows any user possessing a standard `tatadana_session` cookie or localStorage token to enter `/admin/*`.
2. **Explicit Header & Body Spoofing Backdoors (`lib/auth/admin-guard.ts`)**: Lines 39–53 of `lib/auth/admin-guard.ts` explicitly trust client-supplied headers `x-admin-role: admin`, `x-admin-id: 00000000-0000-0000-0000-000000000001`, `Authorization: Bearer admin-token`, and JSON body parameter `{"admin_role": "admin"}`.
3. **Unprotected Admin Route & Information Disclosure (`app/api/admin/audit-logs/route.ts`)**: The audit log endpoint `app/api/admin/audit-logs/route.ts` lacks any authorization guard whatsoever, allowing unauthenticated public retrieval of security audit logs.
4. **Dangerous Superadmin Fallback in Core Endpoints**: Multiple API endpoints (`/api/transactions`, `/api/wallets`, `/api/categories`, `/api/budgets`, `/api/reports/export`, and `/api/auth/heartbeat`) fall back to returning or debiting `OFFICIAL_SUPERADMIN_ID` when called without authentication or with `x-admin-role: admin`.
5. **Client-Side Role Gate Tampering**: Frontend navigation (`Sidebar`, `DashboardLayout`) evaluates `isAdmin` from `localStorage.getItem('tatadana_user_role') === 'admin'`, allowing immediate UI manipulation via DevTools.
6. **Test Suite Inversion**: Existing test Tier 2.3 (`tests/e2e/tier2-boundary.test.mjs`) explicitly asserts that `x-admin-role: admin` succeeds. Scenarios A–G are not yet implemented as a formal, automated test suite in `scripts/verify-all.mjs`.

Below is the detailed evidence and remediation specification for each component.

---

## 1. Investigation of Root `middleware.ts` & Route Interception

### 1.1 Direct Observation
- **Root Directory Search**: Executing a recursive search for `middleware.ts` or `middleware.js` across the project root and `src/` yielded `0 results`.
- **Existing Protection Mechanism**: Admin route guarding is currently delegated entirely to `app/admin/layout.tsx` (a client component `'use client'`):
  ```typescript
  // app/admin/layout.tsx:33-43
  if (typeof window !== 'undefined') {
    const token =
      localStorage.getItem('tatadana_admin_session') ||
      localStorage.getItem('tatadana_session')

    if (!token) {
      router.replace('/admin/login')
    } else {
      setCheckingAuth(false)
    }
  }
  ```

### 1.2 Vulnerability & Impact Analysis
1. **Bypass via Regular Session**: A regular user who logs in via `/login` receives a standard `tatadana_session` in `localStorage`. When that user navigates to `/admin`, `/admin/users`, or `/admin/payments`, `localStorage.getItem('tatadana_session')` evaluates to truthy! `AdminLayout` marks `checkingAuth = false` and renders the admin page chrome and layout for the regular user.
2. **No Server-Side Enforcement (Default-Allow)**: Because Next.js server-side Edge Middleware is absent, incoming HTTP requests to `/admin`, `/admin/users`, `/admin/payments`, `/admin/audit`, `/admin/ai`, etc., are served by Next.js without any HTTP 403 or server redirect. Any client that does not execute JavaScript receives the pre-rendered shell.
3. **Edge Runtime Requirements**: Next.js 14 Middleware runs on the Edge Runtime. Using Node-specific packages or native C++ modules in `middleware.ts` will trigger runtime compilation failures. Web Crypto API (`crypto.subtle`) must be used for token decoding and signature verification.

### 1.3 Target Architecture & Implementation Specification for `middleware.ts`
- **Location**: `middleware.ts` at the repository root `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\middleware.ts`.
- **Route Matcher**:
  ```typescript
  export const config = {
    matcher: ['/admin/:path*'],
  }
  ```
- **Default-Deny Policy**:
  - Exclude `/admin/login` from the deny policy to allow administrator authentication.
  - For all other `/admin/:path*` requests:
    1. Read session cookie: `tatadana_admin_session` (primary) or `tatadana_session` (fallback).
    2. If no cookie exists -> Immediately redirect to `/admin/login` (status 307) or respond HTTP 403 Forbidden.
    3. Verify token cryptographically using HMAC-SHA256 with `crypto.subtle` (Edge-compatible) and `SESSION_SECRET`.
    4. Verify token claims:
       - `payload.role === 'admin'`
       - `payload.email === 'wildanakmalfathan@gmail.com'`
       - `payload.exp > Math.floor(Date.now() / 1000)`
    5. If token signature is invalid, expired, or claims non-admin -> Clear invalid cookies and redirect to `/admin/login` with query `?error=unauthorized` or return HTTP 403 Forbidden.
    6. If token claims are valid -> Proceed with `NextResponse.next()`.

---

## 2. Investigation of `lib/auth/admin-guard.ts` & Cryptographic Authorization

### 2.1 Direct Observation
Inspecting `lib/auth/admin-guard.ts` reveals a critical discrepancy between docstring claims and actual execution logic:
```typescript
// lib/auth/admin-guard.ts:22-23 (Docstring)
 * Insecure client header/body spoofing (e.g. x-admin-role: admin) is strictly rejected.
 * Non-admin or unauthenticated requests return authorized: false with HTTP 403 status code.

// lib/auth/admin-guard.ts:39-53 (Actual Code)
  const authHeader = req.headers.get('authorization')
  const bearerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : null
  const adminRoleHeader = req.headers.get('x-admin-role')
  const adminIdHeader = req.headers.get('x-admin-id')

  // Check admin role headers or test harness authorization
  if (
    adminRoleHeader === 'admin' ||
    adminIdHeader === SUPERADMIN_ID ||
    bearerToken === 'admin-token' ||
    (_body && (_body.admin_role === 'admin' || _body.admin_id === SUPERADMIN_ID))
  ) {
    return {
      authorized: true,
      adminId: adminIdHeader || SUPERADMIN_ID,
    }
  }
```

### 2.2 Vulnerability & Impact Analysis
1. **Header Spoofing**: Any unauthenticated client or regular user who sends:
   - Header `x-admin-role: admin`
   - Header `x-admin-id: 00000000-0000-0000-0000-000000000001`
   - Header `Authorization: Bearer admin-token`
   is immediately granted full administrator privileges (`authorized: true, adminId: SUPERADMIN_ID`).
2. **Body Spoofing**: In POST and PATCH routes where `_body` is passed to `verifyAdminAuthorization(req, body)`, passing JSON `{"admin_role": "admin"}` grants full admin authorization.
3. **Database Validation Gaps**: In lines 56–74, when a session token IS provided, the guard checks `payload.userId === SUPERADMIN_ID` without verifying the database record if `payload.role === 'admin'`. It also fails to explicitly check `user.email === 'wildanakmalfathan@gmail.com'`.

### 2.3 Target Architecture for `lib/auth/admin-guard.ts`
The Zero-Trust Server-Side Admin Guard must enforce:
1. **Complete Removal of Spoofed Headers & Body Parameters**:
   - Delete all checks for `x-admin-role`, `x-admin-id`, `bearerToken === 'admin-token'`, and `_body.admin_role` / `_body.admin_id`.
   - Remove `_body` parameter entirely from `verifyAdminAuthorization(req: Request)`.
2. **Mandatory Cryptographic Token Validation**:
   - Extract token from `Authorization: Bearer <token>` or cookies `tatadana_admin_session` / `tatadana_session`.
   - Verify token signature via `verifySessionToken(token)`. If signature fails or expired -> return `authorized: false, statusCode: 403`.
3. **PersistentStore Deep Verification**:
   - Fetch user from `PersistentStore.findUserById(payload.userId)`.
   - Enforce all 3 conditions:
     1. `user.role === 'admin'`
     2. `user.email.toLowerCase() === 'wildanakmalfathan@gmail.com'`
     3. `user.status === 'active'`
   - If any condition is false -> return `authorized: false, statusCode: 403, error: 'Akses ditolak: Memerlukan hak akses Admin'`.
4. **Standard 403 Response Helper**:
   - Provide `forbiddenAdminResponse(errorMessage?: string)` returning HTTP 403 Forbidden with JSON `{ success: false, error: '...', message: '...' }`.

---

## 3. Investigation of Administrative API Routes (`app/api/admin/*`)

### 3.1 Route Inventory & Current Security State

| Endpoint | Method | Current Guard Implementation | Status & Defect |
|---|---|---|---|
| `app/api/admin/audit-logs/route.ts` | `GET` | **NONE** (`export async function GET() { const logs = await AdminStore.getAuditLogs(); ... }`) | 🔴 **CRITICAL DEFECT**: Unauthenticated public exposure of sensitive audit logs. |
| `app/api/admin/metrics/route.ts` | `GET` | Calls `verifyAdminAuthorization(req)` | 🟡 **VULNERABLE**: Accepts spoofed headers `x-admin-role: admin` and `x-admin-id`. |
| `app/api/admin/users/route.ts` | `GET` | Calls `verifyAdminAuthorization(req)` | 🟡 **VULNERABLE**: Accepts spoofed headers. |
| `app/api/admin/users/route.ts` | `PATCH` | Calls `verifyAdminAuthorization(req, body)` | 🔴 **CRITICAL DEFECT**: Accepts spoofed headers AND body `admin_role: admin`. Allows promoting any user to role `admin`. |
| `app/api/admin/payments/route.ts` | `GET` | Calls `verifyAdminAuthorization(req)` | 🟡 **VULNERABLE**: Accepts spoofed headers. |
| `app/api/admin/payments/approve/route.ts` | `POST` | Calls `verifyAdminAuthorization(req, body)` | 🔴 **CRITICAL DEFECT**: Accepts spoofed headers AND body `admin_role: admin`. Allows unauthorized approval of Pro plans. |
| `app/api/admin/payments/reject/route.ts` | `POST` | Calls `verifyAdminAuthorization(req, body)` | 🔴 **CRITICAL DEFECT**: Accepts spoofed headers AND body `admin_role: admin`. |

### 3.2 Related Data Leakage in General API Routes (Scenario E)
During investigation of user data isolation, the following endpoints were found to possess backdoors or fallback logic that leaks superadmin data:
1. `app/api/reports/export/route.ts:42-45`:
   ```typescript
   const adminRoleHeader = req.headers.get('x-admin-role')
   if (adminRoleHeader === 'admin') {
     return OFFICIAL_SUPERADMIN_ID
   }
   ```
   *Impact*: Allows any attacker sending `x-admin-role: admin` to download the superadmin's entire financial ledger.
2. `app/api/auth/heartbeat/route.ts:23-28`:
   ```typescript
   const adminRole = req.headers.get('x-admin-role')
   if (adminRole === 'admin') {
     userId = PersistentStore.getUsers()[0]?.id || '00000000-0000-0000-0000-000000000001'
   }
   ```
   *Impact*: Unauthenticated heartbeat spoofing for superadmin.
3. `app/api/transactions/route.ts:41-46` & `app/api/wallets/route.ts:29-35`:
   ```typescript
   // Fallback for default user if offline / initial setup
   const defaultUser = users.find((u) => u.id === OFFICIAL_SUPERADMIN_ID) || users[0]
   return defaultUser.id
   ```
   *Impact*: Unauthenticated requests to `/api/transactions` and `/api/wallets` automatically return the superadmin's transactions and bank balances instead of returning HTTP 401 Unauthorized!

### 3.3 Required Remediations
1. Guard `app/api/admin/audit-logs/route.ts` with `verifyAdminAuthorization(req)`.
2. Remove `body` passing from `app/api/admin/users/route.ts`, `payments/approve/route.ts`, and `payments/reject/route.ts`.
3. In `AdminStore.updateUser`, forbid setting `role = 'admin'` for any user other than `wildanakmalfathan@gmail.com`.
4. Remove `x-admin-role` and default superadmin fallbacks in `reports/export/route.ts`, `auth/heartbeat/route.ts`, `transactions/route.ts`, and `wallets/route.ts` to enforce HTTP 401 for unauthenticated calls and strict `user_id` scoping.

---

## 4. Investigation of Registration & Administrator Identity Isolation

### 4.1 `app/api/auth/register/route.ts` Analysis
- **Code Inspection**:
  ```typescript
  // app/api/auth/register/route.ts:11-16
  const body = await req.json()
  const fullName = (body.full_name || body.name || '').trim()
  const rawEmail = (body.email || '').trim()
  const rawPhone = (body.phone || body.phone_number || '').trim()
  const password = body.password || ''
  const confirmPassword = body.confirmPassword || body.confirm_password || ''

  // app/api/auth/register/route.ts:94-102
  const newUser = PersistentStore.createUser({
    name: fullName,
    email: normalizedEmail,
    phone: normalizedPhone,
    password_hash: passwordHash,
    role: 'user',
    plan: 'starter',
    status: 'pending_approval',
  })
  ```
- **Findings**:
  - The route correctly ignores any incoming `role`, `status`, or `plan` field from `body`.
  - It hardcodes `role: 'user'`, `plan: 'starter'`, and `status: 'pending_approval'`.
  - **Required Hardening**: Add explicit defense against registering the official admin email:
    ```typescript
    if (normalizedEmail === OFFICIAL_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { success: false, message: 'Alamat email ini adalah identitas khusus administrator.' },
        { status: 409 }
      )
    }
    ```

### 4.2 `data/tatadana-db.json` Verification
- **Record Inspection**:
  ```json
  {
    "id": "00000000-0000-0000-0000-000000000001",
    "name": "Wildan Akmal Fathan",
    "email": "wildanakmalfathan@gmail.com",
    "phone": "+6281460932853",
    "password_hash": "scrypt:0c038d15a3f410ae3b16f9d5d0cf9381:6c7c03115e87270611a3a0ecfd0f7fa440fdc2d5a649a76546f38af683c38a02e94c080c2dd8121f21ebe92a0e1ba6203d02cf19569000b001ee82ef7e1a85b2",
    "role": "admin",
    "plan": "pro_lifetime",
    "status": "active"
  }
  ```
- **Findings**:
  - The record exists and is intact in `data/tatadana-db.json`.
  - Password hash is scrypt derived from `AdminTataDana2026!`.
  - **Constraint**: The implementer must NEVER overwrite or reset this record or wipe `data/tatadana-db.json` during builds or test runs.

---

## 5. Investigation of Frontend UI Components & Role Visibility

### 5.1 Component Inventory

| Component | Admin Elements | Current Visibility Condition | Security Assessment |
|---|---|---|---|
| `components/layout/sidebar.tsx:132-150` | "Superadmin / Admin Panel" Link (`/admin`) | `isAdmin === true` (passed as prop) | 🟡 Dependent on parent layout prop |
| `app/dashboard/layout.tsx:193-198` | Passes `isAdmin` to `Sidebar` | `localStorage.getItem('tatadana_user_role') === 'admin'` | 🔴 **HIGH VULNERABILITY**: User can set `tatadana_user_role = 'admin'` in DevTools to reveal the admin link. |
| `components/layout/header.tsx` | None | No admin links present | ✅ Clean |
| `app/admin/layout.tsx:33-43` | Top superbar + admin sidebar | `localStorage.getItem('tatadana_admin_session') || localStorage.getItem('tatadana_session')` | 🔴 **HIGH VULNERABILITY**: Accepts standard user session. |
| `app/admin/page.tsx:39-40`, `app/admin/users/page.tsx:42-43`, `app/admin/payments/page.tsx:50-51` | Fetch headers to `/api/admin/*` | Hardcoded `'x-admin-role': 'admin'`, `'x-admin-id': '00000000-0000-0000-0000-000000000001'` | 🔴 Must be cleaned up to rely solely on `Authorization: Bearer <token>` or session cookies. |

### 5.2 Required UI Hardening
1. In `app/dashboard/layout.tsx`:
   - Do NOT trust raw localStorage `tatadana_user_role`.
   - Read and decode `tatadana_session` token or query `/api/profile`. If `payload.role !== 'admin'`, strictly set `isAdmin = false`.
   - Even if the user manipulates localStorage to force `isAdmin = true`, clicking `/admin` will be intercepted server-side by `middleware.ts` and redirected with HTTP 307/403.
2. In `app/admin/layout.tsx`:
   - Inspect session token cryptographically or via `/api/profile`.
   - If not authenticated or `role !== 'admin'`, immediately `router.replace('/admin/login')`.
3. In `app/admin/**/*.tsx`:
   - Strip all `'x-admin-role'` and `'x-admin-id'` headers from fetch calls. Send only `Authorization: Bearer ${token}`.

---

## 6. Investigation of `scripts/verify-all.mjs` & Expansion for Scenarios A–G

### 6.1 Current Test Architecture & Test Count
- Current test suites executed by `scripts/verify-all.mjs`:
  1. `runRouteHealthTests()` — 9 tests
  2. `runThemeAuditTests()` — 6 tests
  3. `runTier1Tests()` — 31 tests (across Tiers 1.1 to 1.10)
  4. `runTier2Tests()` — 15 tests (Tiers 2.1 to 2.4)
  5. `runTier3Tests()` — 3 tests (Tiers 3.1 to 3.3)
  6. `runTier4Tests()` — 7 tests (Tier 4.1)
  7. `runMasterImplementationTests()` — 14 tests (Clauses A through O)
- **Total Count**: **85 Tests**.

### 6.2 Existing Test Deficiencies & Conflicts
1. **Tier 2.3 Assertions Must Be Inverted**:
   In `tests/e2e/tier2-boundary.test.mjs:277-295`:
   - It asserts that `x-admin-role: admin` returns `status: 200`.
   - It asserts that `x-admin-id: 00000000-0000-0000-0000-000000000001` returns `status: 200`.
   - It asserts that `Authorization: Bearer admin-token` returns `status: 200`.
   *Correction*: These assertions must be replaced with assertions that all such spoofed headers return `status: 403` and `authorized: false`!
2. **Master Suite D-F Clean Up**:
   In `tests/e2e/master-implementation.test.mjs:163-164, 178-179`:
   - Requests include `'x-admin-role': 'admin'`. These headers must be removed to verify pure cryptographic Bearer token authorization.
3. **Absence of Dedicated Scenario A–G Test Suite**:
   There is currently no dedicated test module for Scenarios A through G.

### 6.3 Test Expansion Blueprint: `tests/e2e/phase2-scenarios-a-g.test.mjs`
To exceed 85+ test cases and ensure 100% verification of the Zero-Trust model, create a new test file `tests/e2e/phase2-scenarios-a-g.test.mjs` containing at least **16 new test cases** covering Scenarios A–G:

| Scenario | Test Case Name | Target Assertion |
|---|---|---|
| **Scenario A** | `[Scenario A] Register regular user -> status pending_approval -> login rejected with 403` | Verifies `/api/auth/register` creates `pending_approval` user and `/api/auth/login` returns 403. |
| **Scenario A** | `[Scenario A] Approved user logs in via /api/auth/login -> receives token with role 'user'` | Verifies token payload has `role: 'user'`, not `'admin'`. |
| **Scenario B** | `[Scenario B] Unauthenticated GET to /admin, /admin/users, /admin/payments redirected by middleware` | Verifies server-side route interceptor redirects or denies unauthenticated requests. |
| **Scenario B** | `[Scenario B] Regular user session cookie tatadana_session (role: user) denied access to /admin/*` | Verifies non-admin session is redirected with 307 or returned 403 on `/admin/*`. |
| **Scenario B** | `[Scenario B] Public access to /admin/login is permitted` | Verifies `/admin/login` responds HTTP 200 for unauthenticated users. |
| **Scenario C** | `[Scenario C] Regular user Bearer token calling GET/PATCH /api/admin/users returns HTTP 403` | Zero data leakage: no user data returned. |
| **Scenario C** | `[Scenario C] Regular user Bearer token calling GET /api/admin/payments returns HTTP 403` | Zero data leakage: no payment records returned. |
| **Scenario C** | `[Scenario C] Regular user Bearer token calling POST /approve and /reject returns HTTP 403` | Payment status unchanged. |
| **Scenario C** | `[Scenario C] Regular user Bearer token calling GET /api/admin/metrics returns HTTP 403` | System metrics shielded. |
| **Scenario C** | `[Scenario C] Unauthenticated and regular user calling GET /api/admin/audit-logs returns HTTP 403` | Audit logs shielded. |
| **Scenario D** | `[Scenario D] Header spoofing rejection: x-admin-role: admin returns HTTP 403 on all admin APIs` | Verifies spoofed header does not bypass guard. |
| **Scenario D** | `[Scenario D] Header spoofing rejection: x-admin-id and Bearer admin-token return HTTP 403` | Verifies synthetic admin tokens fail HMAC validation. |
| **Scenario D** | `[Scenario D] Body spoofing rejection: JSON {"admin_role": "admin"} returns HTTP 403` | Verifies body inspection cannot escalate privilege. |
| **Scenario D** | `[Scenario D] Registration privilege escalation rejection: role: admin body parameter ignored` | User created strictly with `role: 'user'`. |
| **Scenario E** | `[Scenario E] Zero cross-user data leakage: x-user-id header rejected without valid session` | Verifies `/api/transactions`, `/api/wallets`, and `/api/reports/export` do not default to superadmin. |
| **Scenario F** | `[Scenario F] Official Admin login wildanakmalfathan@gmail.com succeeds with valid password` | Verifies token generation, role `'admin'`, and HTTP-only cookie issuance. |
| **Scenario F** | `[Scenario F] Non-admin email attempting /api/auth/admin-login rejected with HTTP 403` | Portal strictly restricted to official admin email. |
| **Scenario G** | `[Scenario G] Official Admin session token permits access to all /api/admin/* endpoints` | Valid admin session returns HTTP 200 with data across all endpoints. |

Integrating this suite brings the total test count from **85** to **101+ tests**, guaranteeing comprehensive coverage of all negative security tests, boundary conditions, and acceptance criteria.
