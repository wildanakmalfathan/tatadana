// tests/e2e/challenger-adversarial.test.mjs
// Adversarial Security Challenger Test Harness for Phase 2
// Thoroughly stress-tests Scenarios A through G against edge cases, spoofing, and privilege escalation

import { describe, it, expect, isServerOnline, fileExists, readFileSafe, registry } from './common.mjs';

export async function runChallengerAdversarialTests() {
  const serverUp = await isServerOnline('http://localhost:3000');
  if (!serverUp) {
    console.error('Server offline at http://localhost:3000 — cannot run live adversarial suite');
    return;
  }

  describe('Adversarial Security Suite — Deep Stress Testing (Scenarios A through G)', () => {
    const officialAdminEmail = 'wildanakmalfathan@gmail.com';
    const officialAdminPassword = 'AdminTataDana2026!';
    let adminToken = '';

    const normalUserEmail = `adv.user.${Date.now()}@tatadana.id`;
    const normalUserPassword = 'NormalUserPass123!';
    let normalUserId = '';
    let normalUserToken = '';

    // Setup: obtain official admin token first
    it('Setup: authenticates official superadmin and retrieves session token', async () => {
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
      expect(typeof data.token).toBe('string');
      adminToken = data.token;
    });

    // =========================================================================
    // SCENARIO A: Registration Privilege Escalation Stress Testing
    // =========================================================================
    it('Scenario A.1: rejects registration attempt using official admin email in various casing and padding', async () => {
      const emailVariations = [
        officialAdminEmail,
        officialAdminEmail.toUpperCase(),
        'WildanAkmalFathan@Gmail.Com',
        '  wildanakmalfathan@gmail.com  ',
      ];

      for (const emailVar of emailVariations) {
        const res = await fetch('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Attacker Admin Impersonator',
            email: emailVar,
            phone: `0812${Math.floor(10000000 + Math.random() * 90000000)}`,
            password: 'AnyPassword123!',
            confirmPassword: 'AnyPassword123!',
          }),
        });
        expect(res.status).toBe(409);
        const data = await res.json();
        expect(data.success).toBe(false);
      }
    });

    it('Scenario A.2: rejects role injection payloads (admin, superadmin, root) and forces role: "user"', async () => {
      const maliciousRoles = ['admin', 'superadmin', 'ADMIN', 'root', 'administrator'];

      for (const malRole of maliciousRoles) {
        const testEmail = `mal.role.${Math.random().toString(36).substring(2, 8)}@example.com`;
        const res = await fetch('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Role Attack ${malRole}`,
            email: testEmail,
            phone: `0819${Math.floor(10000000 + Math.random() * 90000000)}`,
            password: 'AttackPass123!',
            confirmPassword: 'AttackPass123!',
            role: malRole,
          }),
        });

        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.success).toBe(true);
        const user = data.user || data.data;
        expect(user.role).toBe('user');
        expect(user.status).toBe('pending_approval');
      }
    });

    it('Scenario A.3: creates standard test user and verifies pending status blocks standard login until approved', async () => {
      const regRes = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Adversarial Verification User',
          email: normalUserEmail,
          phone: `0815${Math.floor(10000000 + Math.random() * 90000000)}`,
          password: normalUserPassword,
          confirmPassword: normalUserPassword,
        }),
      });
      expect(regRes.status).toBe(201);
      const regData = await regRes.json();
      const user = regData.user || regData.data;
      normalUserId = user.id;
      expect(user.role).toBe('user');
      expect(user.status).toBe('pending_approval');

      // Attempt login while pending_approval -> MUST fail
      const loginPending = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalUserEmail,
          password: normalUserPassword,
        }),
      });
      expect(loginPending.status).toBe(403);
      const pendingData = await loginPending.json();
      expect(pendingData.success).toBe(false);

      // Approve user using Admin token
      const approveRes = await fetch('http://localhost:3000/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          userId: normalUserId,
          action: 'approve',
        }),
      });
      expect(approveRes.status).toBe(200);

      // Now login succeeds
      const loginActive = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalUserEmail,
          password: normalUserPassword,
        }),
      });
      expect(loginActive.status).toBe(200);
      const activeData = await loginActive.json();
      expect(activeData.success).toBe(true);
      expect(activeData.user.role).toBe('user');
      normalUserToken = activeData.token;
    });

    // =========================================================================
    // SCENARIO B: Route Interception & Middleware Default-Deny
    // =========================================================================
    it('Scenario B: verifies middleware redirects unauthenticated callers and regular users with HTTP 307', async () => {
      const protectedPaths = [
        '/admin',
        '/admin/users',
        '/admin/payments',
        '/admin/nonexistent-subpath',
      ];

      for (const p of protectedPaths) {
        // 1. Unauthenticated request
        const unauth = await fetch(`http://localhost:3000${p}`, { redirect: 'manual' });
        expect([307, 308]).toContain(unauth.status);
        const unauthLoc = unauth.headers.get('location') || '';
        expect(unauthLoc).toContain('/admin/login');

        // 2. Regular user session cookie
        const userCookie = await fetch(`http://localhost:3000${p}`, {
          headers: { Cookie: `tatadana_session=${normalUserToken}` },
          redirect: 'manual',
        });
        expect([307, 308]).toContain(userCookie.status);
        const userLoc = userCookie.headers.get('location') || '';
        expect(userLoc).toContain('/admin/login');

        // 3. Fake / malformed token
        const malformedToken = await fetch(`http://localhost:3000${p}`, {
          headers: { Cookie: 'tatadana_admin_session=eyJhbGciOiJIUzI1NiJ9.fake.signature' },
          redirect: 'manual',
        });
        expect([307, 308]).toContain(malformedToken.status);
      }

      // Public admin login page remains accessible
      const loginPage = await fetch('http://localhost:3000/admin/login');
      expect(loginPage.status).toBe(200);
    });

    // =========================================================================
    // SCENARIO C: Direct Invocations to Admin APIs with Regular User Token
    // =========================================================================
    it('Scenario C: verifies all /api/admin/* endpoints strictly return HTTP 403 Forbidden for normal user', async () => {
      const endpoints = [
        { url: '/api/admin/users', method: 'GET' },
        { url: '/api/admin/users', method: 'PATCH', body: { userId: normalUserId, status: 'active' } },
        { url: '/api/admin/payments', method: 'GET' },
        { url: '/api/admin/payments/approve', method: 'POST', body: { payment_id: 'test' } },
        { url: '/api/admin/payments/reject', method: 'POST', body: { payment_id: 'test' } },
        { url: '/api/admin/metrics', method: 'GET' },
        { url: '/api/admin/audit-logs', method: 'GET' },
        { url: '/api/auth/verify-admin', method: 'GET' },
      ];

      for (const ep of endpoints) {
        const res = await fetch(`http://localhost:3000${ep.url}`, {
          method: ep.method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${normalUserToken}`,
          },
          body: ep.body ? JSON.stringify(ep.body) : undefined,
        });

        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.success).toBe(false);
        // Ensure no data arrays leaked
        expect(data.data).toBeUndefined();
      }
    });

    // =========================================================================
    // SCENARIO D: Header and Body Spoofing Attacks
    // =========================================================================
    it('Scenario D: strictly denies spoofing via headers, cookies, or body parameters', async () => {
      // 1. Spoofing x-admin-role header
      const h1 = await fetch('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-admin-role': 'admin' },
      });
      expect(h1.status).toBe(403);

      // 2. Spoofing x-admin-id header
      const h2 = await fetch('http://localhost:3000/api/admin/audit-logs', {
        headers: {
          'x-admin-id': '00000000-0000-0000-0000-000000000001',
          'x-admin-role': 'admin',
        },
      });
      expect(h2.status).toBe(403);

      // 3. Spoofed Bearer token strings
      const fakeTokens = ['admin-token', 'Bearer admin-token', 'undefined', 'null', 'admin'];
      for (const ft of fakeTokens) {
        const h3 = await fetch('http://localhost:3000/api/admin/users', {
          headers: { Authorization: `Bearer ${ft}` },
        });
        expect(h3.status).toBe(403);
      }

      // 4. Body parameter spoofing on approve
      const b1 = await fetch('http://localhost:3000/api/admin/payments/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: 'test',
          admin_role: 'admin',
          admin_id: '00000000-0000-0000-0000-000000000001',
          user_role: 'admin',
        }),
      });
      expect(b1.status).toBe(403);

      // 5. Attempting to assign role: 'admin' to normal user via PATCH /api/admin/users
      const elevate = await fetch('http://localhost:3000/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          userId: normalUserId,
          role: 'admin', // Malicious attempt to elevate normal user to admin
        }),
      });
      expect(elevate.status).toBe(200);
      const elevateData = await elevate.json();
      expect(elevateData.data.role).toBe('user'); // AdminStore suppresses role: 'admin'
    });

    // =========================================================================
    // SCENARIO E: Data Isolation for Sensitive Financial & User Endpoints
    // =========================================================================
    it('Scenario E: verifies unauthenticated requests to financial routes receive HTTP 401 Unauthorized', async () => {
      const sensitiveEndpoints = [
        { url: '/api/reports/export?format=csv', method: 'GET' },
        { url: '/api/reports/export?format=xlsx', method: 'GET' },
        { url: '/api/transactions', method: 'GET' },
        { url: '/api/wallets', method: 'GET' },
        { url: '/api/auth/heartbeat', method: 'POST', body: {} },
      ];

      for (const sep of sensitiveEndpoints) {
        const res = await fetch(`http://localhost:3000${sep.url}`, {
          method: sep.method,
          headers: { 'Content-Type': 'application/json' },
          body: sep.body ? JSON.stringify(sep.body) : undefined,
        });

        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.success).toBe(false);
      }
    });

    // =========================================================================
    // SCENARIO F: Official Administrator Authentication
    // =========================================================================
    it('Scenario F: authenticates official Superadmin and rejects non-admin credentials at admin portal', async () => {
      // 1. Valid admin login
      const validAdmin = await fetch('http://localhost:3000/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: officialAdminEmail,
          password: officialAdminPassword,
        }),
      });
      expect(validAdmin.status).toBe(200);
      const validData = await validAdmin.json();
      expect(validData.success).toBe(true);
      expect(validData.user.role).toBe('admin');
      expect(validData.user.email).toBe(officialAdminEmail);

      // 2. Admin login with invalid password
      const invalidPass = await fetch('http://localhost:3000/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: officialAdminEmail,
          password: 'WrongPassword999!',
        }),
      });
      expect(invalidPass.status).toBe(401);

      // 3. Regular user attempting admin portal login
      const userAdminLogin = await fetch('http://localhost:3000/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalUserEmail,
          password: normalUserPassword,
        }),
      });
      expect([401, 403].includes(userAdminLogin.status)).toBe(true);
    });

    // =========================================================================
    // SCENARIO G: Exclusive Administrator Privileges
    // =========================================================================
    it('Scenario G: validates full administrative capabilities with verified admin token', async () => {
      // 1. Verify admin status
      const vRes = await fetch('http://localhost:3000/api/auth/verify-admin', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(vRes.status).toBe(200);
      const vData = await vRes.json();
      expect(vData.authorized).toBe(true);
      expect(vData.admin.role).toBe('admin');
      expect(vData.admin.email).toBe(officialAdminEmail);

      // 2. Access metrics
      const mRes = await fetch('http://localhost:3000/api/admin/metrics', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(mRes.status).toBe(200);
      const mData = await mRes.json();
      expect(mData.success).toBe(true);
      expect(mData.data.totalUsers).toBeGreaterThanOrEqual(1);

      // 3. Access users list
      const uRes = await fetch('http://localhost:3000/api/admin/users', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(uRes.status).toBe(200);
      const uData = await uRes.json();
      expect(uData.success).toBe(true);
      expect(Array.isArray(uData.data)).toBe(true);

      // 4. Access audit logs
      const aRes = await fetch('http://localhost:3000/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(aRes.status).toBe(200);
      const aData = await aRes.json();
      expect(aData.success).toBe(true);
      expect(Array.isArray(aData.data)).toBe(true);
    });
  });
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('challenger-adversarial.test.mjs')) {
  (async () => {
    await runChallengerAdversarialTests();
    const result = await registry.runAll();
    process.exit(result.success ? 0 : 1);
  })();
}
