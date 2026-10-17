// tests/e2e/admin-access-control.test.mjs
// Phase 2: Critical Admin Access Control & Zero-Trust Server-Side Role Enforcement Test Suite
// Verifies Mandatory Scenarios A through G:
// A: Normal user login & role isolation
// B: Direct admin page access denial & redirect
// C: Direct admin API invocation denial (HTTP 403 Forbidden)
// D: Tampered role headers / payload rejection (anti-spoofing)
// E: Isolation of other users' data
// F: Genuine Superadmin login (wildanakmalfathan@gmail.com)
// G: Exclusive privilege grant for Superadmin only

import { describe, it, expect, isServerOnline, fileExists, readFileSafe } from './common.mjs';

export async function runAdminAccessControlTests() {
  const serverUp = await isServerOnline('http://localhost:3000');

  describe('Phase 2 — Mandatory Admin Access Control Verification (Scenarios A through G)', () => {
    let normalUserToken = '';
    let normalUserId = '';
    const normalUserEmail = `user.test.${Date.now()}@tatadana.id`;
    const normalUserPassword = 'TestPassword123!';

    let adminSessionToken = '';
    const officialAdminEmail = 'wildanakmalfathan@gmail.com';
    const officialAdminPassword = 'AdminTataDana2026!';

    // =========================================================================
    // SCENARIO A: Normal User Registration & Login Isolation
    // =========================================================================
    it('Scenario A: verifies normal user registration creates strictly role: "user" and login succeeds after active', async () => {
      if (!serverUp) return;

      // 1. Register a normal user
      const regRes = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Normal User ZeroTrust',
          email: normalUserEmail,
          phone: `0813${Math.floor(10000000 + Math.random() * 90000000)}`,
          password: normalUserPassword,
          confirmPassword: normalUserPassword,
          role: 'admin', // Malicious attempt to self-assign admin
        }),
      });

      expect(regRes.status).toBe(201);
      const regData = await regRes.json();
      expect(regData.success).toBe(true);
      const user = regData.user || regData.data;
      expect(user.role).toBe('user'); // MUST remain 'user', self-assigned 'admin' rejected!
      normalUserId = user.id;

      // 2. Admin approves user
      const adminLoginRes = await fetch('http://localhost:3000/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: officialAdminEmail,
          password: officialAdminPassword,
        }),
      });
      const adminLoginData = await adminLoginRes.json();
      const tempAdminToken = adminLoginData.token;

      await fetch('http://localhost:3000/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tempAdminToken}`,
        },
        body: JSON.stringify({
          userId: normalUserId,
          action: 'approve',
        }),
      });

      // 3. Normal user logs in
      const loginRes = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalUserEmail,
          password: normalUserPassword,
        }),
      });

      expect(loginRes.status).toBe(200);
      const loginData = await loginRes.json();
      expect(loginData.success).toBe(true);
      expect(loginData.user.role).toBe('user');
      expect(typeof loginData.token).toBe('string');
      normalUserToken = loginData.token;
    });

    // =========================================================================
    // SCENARIO B: Direct Access to Admin URLs (Redirect / Denied)
    // =========================================================================
    it('Scenario B: verifies unauthenticated and normal user direct access to /admin/* routes is redirected to login', async () => {
      if (!serverUp) return;

      const adminRoutes = ['/admin', '/admin/users', '/admin/payments'];

      for (const route of adminRoutes) {
        // 1. Unauthenticated direct access
        const unauthRes = await fetch(`http://localhost:3000${route}`, {
          redirect: 'manual',
        });
        // Middleware redirects to /admin/login (HTTP 307 or 308)
        expect([307, 308]).toContain(unauthRes.status);
        const redirectLocation = unauthRes.headers.get('location') || '';
        expect(redirectLocation).toContain('/admin/login');

        // 2. Normal user session token direct access
        const userRes = await fetch(`http://localhost:3000${route}`, {
          headers: {
            Cookie: `tatadana_session=${normalUserToken}`,
            Authorization: `Bearer ${normalUserToken}`,
          },
          redirect: 'manual',
        });
        expect([307, 308]).toContain(userRes.status);
        const userRedirect = userRes.headers.get('location') || '';
        expect(userRedirect).toContain('/admin/login');
      }
    });

    // =========================================================================
    // SCENARIO C: Direct Invocations to Admin APIs (HTTP 403 Forbidden)
    // =========================================================================
    it('Scenario C: verifies calling /api/admin/* endpoints with normal user credentials returns HTTP 403 Forbidden', async () => {
      if (!serverUp) return;

      const endpoints = [
        { url: '/api/admin/users', method: 'GET' },
        { url: '/api/admin/payments', method: 'GET' },
        { url: '/api/admin/metrics', method: 'GET' },
        { url: '/api/admin/audit-logs', method: 'GET' },
        { url: '/api/auth/verify-admin', method: 'GET' },
      ];

      for (const ep of endpoints) {
        const res = await fetch(`http://localhost:3000${ep.url}`, {
          method: ep.method,
          headers: {
            Authorization: `Bearer ${normalUserToken}`,
            Cookie: `tatadana_session=${normalUserToken}`,
          },
        });

        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.success).toBe(false);
      }
    });

    // =========================================================================
    // SCENARIO D: Header & Payload Role Spoofing Tamper Rejection
    // =========================================================================
    it('Scenario D: strictly rejects tampered role headers (x-admin-role: admin, admin_role: admin, etc.)', async () => {
      if (!serverUp) return;

      // 1. Unauthenticated request with spoofed header x-admin-role
      const spoof1 = await fetch('http://localhost:3000/api/admin/metrics', {
        headers: {
          'x-admin-role': 'admin',
          'x-admin-id': '00000000-0000-0000-0000-000000000001',
        },
      });
      expect(spoof1.status).toBe(403);

      // 2. Normal user token + spoofed header x-admin-role: admin
      const spoof2 = await fetch('http://localhost:3000/api/admin/users', {
        headers: {
          Authorization: `Bearer ${normalUserToken}`,
          'x-admin-role': 'admin',
          'x-admin-id': '00000000-0000-0000-0000-000000000001',
          'x-user-role': 'admin',
        },
      });
      expect(spoof2.status).toBe(403);

      // 3. Spoofed body parameters (admin_role: admin) in payment approve
      const spoof3 = await fetch('http://localhost:3000/api/admin/payments/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${normalUserToken}`,
          'x-admin-role': 'admin',
        },
        body: JSON.stringify({
          payment_id: 'dummy-payment-id',
          admin_role: 'admin',
          admin_id: '00000000-0000-0000-0000-000000000001',
        }),
      });
      expect(spoof3.status).toBe(403);

      // 4. Fake bearer token 'admin-token'
      const spoof4 = await fetch('http://localhost:3000/api/admin/audit-logs', {
        headers: {
          Authorization: 'Bearer admin-token',
        },
      });
      expect(spoof4.status).toBe(403);
    });

    // =========================================================================
    // SCENARIO E: Access to Other Users' Data Isolation
    // =========================================================================
    it('Scenario E: prevents normal user from accessing other users transactions and administrative records', async () => {
      if (!serverUp) return;

      // User calling admin users list to spy on all emails
      const res = await fetch('http://localhost:3000/api/admin/users', {
        headers: {
          Authorization: `Bearer ${normalUserToken}`,
        },
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.data).toBeUndefined(); // Sensitive users array never leaked
    });

    // =========================================================================
    // SCENARIO F: Valid Superadmin Authentication & Session Issuance
    // =========================================================================
    it('Scenario F: authenticates official Superadmin Wildan with valid credentials and issues genuine admin token', async () => {
      if (!serverUp) return;

      const res = await fetch('http://localhost:3000/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: officialAdminEmail,
          password: officialAdminPassword,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.email).toBe(officialAdminEmail);
      expect(data.user.role).toBe('admin');
      expect(typeof data.token).toBe('string');
      adminSessionToken = data.token;
    });

    // =========================================================================
    // SCENARIO G: Exclusive Administrative Privileges for Superadmin
    // =========================================================================
    it('Scenario G: grants exclusive administrative access across all admin functions to verified Superadmin token', async () => {
      if (!serverUp) return;

      // 1. Verify admin status via /api/auth/verify-admin
      const verifyRes = await fetch('http://localhost:3000/api/auth/verify-admin', {
        headers: {
          Authorization: `Bearer ${adminSessionToken}`,
        },
      });
      expect(verifyRes.status).toBe(200);
      const verifyData = await verifyRes.json();
      expect(verifyData.success).toBe(true);
      expect(verifyData.authorized).toBe(true);
      expect(verifyData.admin.email).toBe(officialAdminEmail);
      expect(verifyData.admin.role).toBe('admin');

      // 2. Fetch admin metrics
      const metricsRes = await fetch('http://localhost:3000/api/admin/metrics', {
        headers: {
          Authorization: `Bearer ${adminSessionToken}`,
        },
      });
      expect(metricsRes.status).toBe(200);
      const metricsData = await metricsRes.json();
      expect(metricsData.success).toBe(true);
      expect(metricsData.data.totalUsers).toBeGreaterThanOrEqual(1);

      // 3. Fetch admin audit logs
      const auditRes = await fetch('http://localhost:3000/api/admin/audit-logs', {
        headers: {
          Authorization: `Bearer ${adminSessionToken}`,
        },
      });
      expect(auditRes.status).toBe(200);
      const auditData = await auditRes.json();
      expect(auditData.success).toBe(true);
      expect(Array.isArray(auditData.data)).toBe(true);

      // 4. Fetch admin users list
      const usersRes = await fetch('http://localhost:3000/api/admin/users', {
        headers: {
          Authorization: `Bearer ${adminSessionToken}`,
        },
      });
      expect(usersRes.status).toBe(200);
      const usersData = await usersRes.json();
      expect(usersData.success).toBe(true);
      expect(Array.isArray(usersData.data)).toBe(true);
    });

    // =========================================================================
    // Middleware & File Integrity Verification
    // =========================================================================
    it('verifies root middleware.ts exists and enforces /admin route interception', () => {
      expect(fileExists('middleware.ts')).toBeTruthy();
      const content = readFileSafe('middleware.ts');
      expect(content).toContain('matcher');
      expect(content).toContain('/admin/:path*');
      expect(content).toContain('OFFICIAL_ADMIN_EMAIL');
      expect(content).toContain('verifySessionTokenEdge');
    });

    it('verifies lib/auth/admin-guard.ts has zero header-spoofing bypasses', () => {
      const content = readFileSafe('lib/auth/admin-guard.ts');
      expect(content.includes("adminRoleHeader === 'admin'")).toBeFalsy();
      expect(content.includes("bearerToken === 'admin-token'")).toBeFalsy();
      expect(content.includes("_body.admin_role === 'admin'")).toBeFalsy();
      expect(content).toContain('verifySessionToken');
      expect(content).toContain('OFFICIAL_ADMIN_EMAIL');
    });
  });
}
