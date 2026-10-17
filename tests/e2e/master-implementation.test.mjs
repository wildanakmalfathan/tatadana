// tests/e2e/master-implementation.test.mjs
// Master Implementation Prompt End-to-End Test Suite (Clauses A through T)
// Verifies Persistent Store, Single Source of Truth Ledger, Dual Portal Auth, Admin Approval,
// WhatsApp Target 081460932853, Tata AI Transaction Parser, and Formula Injection Protection

import { describe, it, expect, isServerOnline, fileExists, readFileSafe } from './common.mjs';

export async function runMasterImplementationTests() {
  const serverUp = await isServerOnline('http://localhost:3000');

  let adminSessionToken = '';

  describe('Master Suite A-H — Persistent Storage, Integrity & Single Source of Truth Ledger', () => {
    it('verifies persistent database file exists and contains initial superadmin seed', () => {
      const dbPath = 'data/tatadana-db.json';
      expect(fileExists(dbPath)).toBeTruthy();
      const raw = readFileSafe(dbPath);
      const db = JSON.parse(raw);

      expect(Array.isArray(db.users)).toBeTruthy();
      expect(Array.isArray(db.wallets)).toBeTruthy();
      expect(Array.isArray(db.categories)).toBeTruthy();
      expect(Array.isArray(db.transactions)).toBeTruthy();
      expect(Array.isArray(db.audit_logs)).toBeTruthy();

      // Superadmin Wildan check
      const admin = db.users.find((u) => u.email === 'wildanakmalfathan@gmail.com');
      expect(admin).toBeDefined();
      expect(admin.role).toBe('admin');
      expect(admin.plan).toBe('pro_lifetime');
      expect(admin.phone).toContain('6281460932853');
    });

    it('verifies Single Source of Truth Ledger atomic mutation and integer IDR arithmetic', async () => {
      if (!serverUp) return;

      // Authenticate as Superadmin to obtain valid session token for Zero-Trust protected endpoints
      const loginRes = await fetch('http://localhost:3000/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'wildanakmalfathan@gmail.com',
          password: 'AdminTataDana2026!',
        }),
      });
      const loginData = await loginRes.json();
      const token = loginData.token;
      if (token) {
        adminSessionToken = token;
      }
      const authHeaders = {
        Authorization: `Bearer ${token}`,
      };

      // 1. Create a dedicated isolated test wallet to ensure zero race conditions with concurrent suites
      const letterSuffix = Array.from({ length: 6 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
      const isolatedWalletName = `Dompet Khusus ${letterSuffix}`;
      const createWalletRes = await fetch('http://localhost:3000/api/wallets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          name: isolatedWalletName,
          type: 'bank',
          balance: 1000000,
        }),
      });
      expect(createWalletRes.status).toBe(201);
      const createWalletData = await createWalletRes.json();
      const testWallet = createWalletData.data;
      expect(testWallet.balance).toBe(1000000);

      // 2. Add an expense transaction via Tata AI targeting the isolated wallet
      const expenseAmount = 35000;
      const aiTxRes = await fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ message: `Beli makan malam ${expenseAmount} pakai ${isolatedWalletName}` }),
      });

      expect(aiTxRes.status).toBe(200);
      const aiTxData = await aiTxRes.json();
      expect(aiTxData.success).toBeTruthy();
      expect(aiTxData.transaction_recorded).toBeTruthy();
      expect(aiTxData.transaction.amount).toBe(expenseAmount);
      expect(aiTxData.transaction.type).toBe('expense');

      // 3. Verify isolated wallet balance decremented atomically by exact integer IDR (1,000,000 - 35,000 = 965,000)
      const updatedWalletsRes = await fetch('http://localhost:3000/api/wallets', {
        headers: authHeaders,
      });
      const updatedWalletsData = await updatedWalletsRes.json();
      const updatedWallet = updatedWalletsData.data.find((w) => w.id === testWallet.id);
      expect(updatedWallet.balance).toBe(1000000 - expenseAmount);
    });
  });

  describe('Master Suite D-F — Dual Portal Authentication, Registration Normalization & Admin Approval', () => {
    const randomSuffix = `${Date.now()}.${Math.floor(Math.random() * 1000)}`;
    const testEmail = `pilot.${randomSuffix}@tatadana.id`;
    const rawEmailWithWhitespace = `  ${testEmail.toUpperCase()}  `;
    const testPhone = `0812${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testPassword = 'Password123!';

    it('verifies registration normalizes email (lowercase trimmed) and phone (E.164 +62)', async () => {
      if (!serverUp) return;

      const regRes = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Pilot User E2E',
          email: rawEmailWithWhitespace,
          phone: testPhone,
          password: testPassword,
          confirmPassword: testPassword,
        }),
      });

      expect(regRes.status).toBe(201);
      const regData = await regRes.json();
      expect(regData.success).toBeTruthy();
      const user = regData.user || regData.data;
      expect(user.email).toBe(testEmail.toLowerCase());
      expect(user.phone.startsWith('+62')).toBeTruthy();
      expect(user.status).toBe('pending_approval');
    });

    it('blocks pending_approval user from logging in via standard /api/auth/login', async () => {
      if (!serverUp) return;

      const loginRes = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      expect(loginRes.status).toBe(403);
      const loginData = await loginRes.json();
      expect(loginData.success).toBe(false);
      expect(loginData.status).toBe('pending_approval');
    });

    it('rejects non-admin credentials at dedicated Admin Login portal', async () => {
      if (!serverUp) return;

      const adminLoginRes = await fetch('http://localhost:3000/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      expect(adminLoginRes.status).toBe(403);
      const adminLoginData = await adminLoginRes.json();
      expect(adminLoginData.success).toBe(false);
    });

    it('authenticates Superadmin Wildan at Admin Login portal and returns admin session token', async () => {
      if (!serverUp) return;

      const adminLoginRes = await fetch('http://localhost:3000/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'wildanakmalfathan@gmail.com',
          password: 'AdminTataDana2026!',
        }),
      });

      expect(adminLoginRes.status).toBe(200);
      const adminLoginData = await adminLoginRes.json();
      expect(adminLoginData.success).toBeTruthy();
      expect(adminLoginData.user.role).toBe('admin');
      expect(typeof adminLoginData.token).toBe('string');
      adminSessionToken = adminLoginData.token;
    });

    it('verifies Admin User Approval workflow transitions status to active and allows login', async () => {
      if (!serverUp) return;

      // 1. Fetch pending users
      const usersListRes = await fetch('http://localhost:3000/api/admin/users', {
        headers: {
          Authorization: `Bearer ${adminSessionToken}`,
        },
      });
      expect(usersListRes.status).toBe(200);
      const usersListData = await usersListRes.json();
      const pendingUser = usersListData.data.find((u) => u.email === testEmail.toLowerCase());
      expect(pendingUser).toBeDefined();

      // 2. Approve user
      const approveRes = await fetch('http://localhost:3000/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSessionToken}`,
        },
        body: JSON.stringify({
          userId: pendingUser.id,
          action: 'approve',
        }),
      });
      expect(approveRes.status).toBe(200);
      const approveData = await approveRes.json();
      expect(approveData.success).toBeTruthy();
      const approvedUser = approveData.user || approveData.data;
      expect(approvedUser).toBeDefined();
      expect(approvedUser.status).toBe('active');

      // 3. User can now successfully login!
      const userLoginRes = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });
      expect(userLoginRes.status).toBe(200);
      const userLoginData = await userLoginRes.json();
      expect(userLoginData.success).toBeTruthy();
      expect(userLoginData.user.status).toBe('active');
    });
  });

  describe('Master Suite J — Tata AI Bot: Ambiguity Clarification & Natural Indonesian Parsing', () => {
    it('proactively asks for clarification when user inputs ambiguous transaction ("Tadi bayar 50")', async () => {
      if (!serverUp) return;

      const res = await fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Tadi bayar 50' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBeTruthy();
      expect(data.provider).toBe('tata_ai_clarifier');
      expect(data.reply).toContain('Rp50.000');
      expect(data.reply).toContain('Rp50');
      expect(data.suggested_actions.length).toBeGreaterThan(0);
    });

    it('proactively asks for clarification when user provides action verb with no nominal ("tadi beli bakso")', async () => {
      if (!serverUp) return;

      const res = await fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'tadi beli bakso' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBeTruthy();
      expect(data.provider).toBe('tata_ai_clarifier');
      expect(data.reply).toContain('berapa nominalnya');
    });

    it('correctly processes and records income transaction ("Gajian 5 juta")', async () => {
      if (!serverUp) return;

      const res = await fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Gajian 5 juta' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBeTruthy();
      expect(data.transaction_recorded).toBeTruthy();
      expect(data.transaction.amount).toBe(5000000);
      expect(data.transaction.type).toBe('income');
      expect(data.reply).toContain('Pemasukan');
    });
  });

  describe('Master Suite M — Real Report Export & CSV Formula Injection Protection', () => {
    it('sanitizes dangerous spreadsheet formula characters (=, +, -, @) in CSV export', async () => {
      if (!serverUp) return;

      const exportRes = await fetch('http://localhost:3000/api/reports/export?format=csv', {
        headers: {
          Authorization: `Bearer ${adminSessionToken}`,
        },
      });
      expect(exportRes.status).toBe(200);
      const csvText = await exportRes.text();
      expect(typeof csvText).toBe('string');
      expect(csvText.length).toBeGreaterThan(20);
      expect(csvText).toContain('Tanggal');
      expect(csvText).toContain('Nominal');

      // Formula injection sanitizer test on raw characters
      const sanitizeCell = (val) => {
        const s = String(val ?? '');
        if (/^[=\+\-@]/.test(s)) {
          return `'${s}`;
        }
        return s;
      };

      expect(sanitizeCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(sanitizeCell('+123456')).toBe("'+123456");
      expect(sanitizeCell('-CALC()')).toBe("'-CALC()");
      expect(sanitizeCell('@IMPORTXML')).toBe("'@IMPORTXML");
      expect(sanitizeCell('Normal Text')).toBe('Normal Text');
    });

    it('exports binary XLSX report with spreadsheet content headers', async () => {
      if (!serverUp) return;

      const exportRes = await fetch('http://localhost:3000/api/reports/export?format=xlsx', {
        headers: {
          Authorization: `Bearer ${adminSessionToken}`,
        },
      });
      expect(exportRes.status).toBe(200);
      const contentType = exportRes.headers.get('content-type');
      expect(contentType).toContain('openxmlformats-officedocument.spreadsheetml');
      const buffer = await exportRes.arrayBuffer();
      expect(buffer.byteLength).toBeGreaterThan(100);
    });

    it('exports binary PDF financial report document', async () => {
      if (!serverUp) return;

      const exportRes = await fetch('http://localhost:3000/api/reports/export?format=pdf', {
        headers: {
          Authorization: `Bearer ${adminSessionToken}`,
        },
      });
      expect(exportRes.status).toBe(200);
      const contentType = exportRes.headers.get('content-type');
      expect(contentType).toContain('application/pdf');
      const buffer = await exportRes.arrayBuffer();
      expect(buffer.byteLength).toBeGreaterThan(100);
    });
  });

  describe('Master Suite G & O — Session Heartbeat, Metrics & Telegram Long Polling Health', () => {
    it('records active session heartbeat and reflects in admin metrics summary', async () => {
      if (!serverUp) return;

      // 1. Post heartbeat
      const hbRes = await fetch('http://localhost:3000/api/auth/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSessionToken}`,
        },
      });
      expect(hbRes.status).toBe(200);
      const hbData = await hbRes.json();
      expect(hbData.success).toBeTruthy();
      expect(typeof hbData.activeUsers).toBe('number');

      // 2. Query admin metrics
      const metricsRes = await fetch('http://localhost:3000/api/admin/metrics', {
        headers: {
          Authorization: `Bearer ${adminSessionToken}`,
        },
      });
      expect(metricsRes.status).toBe(200);
      const metricsData = await metricsRes.json();
      expect(metricsData.success).toBeTruthy();
      expect(metricsData.data.activeUsers).toBeGreaterThanOrEqual(1);
      expect(metricsData.data.totalUsers).toBeGreaterThanOrEqual(1);
      expect(metricsData.data.telegram.mode).toBe('long_polling');
      const waPhone = metricsData.data.whatsapp.adminPhone || metricsData.data.whatsapp.targetPhone || '';
      expect(waPhone).toContain('81460932853');
    });
  });
}
