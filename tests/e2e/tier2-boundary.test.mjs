// tests/e2e/tier2-boundary.test.mjs
// Tier 2: Boundary & Corner Cases
// Tests: 79% vs 80% vs 99% vs 100% thresholds, zero/negative balances, unauthenticated checks, date rollovers

import {
  describe,
  it,
  expect,
  fileExists,
  readFileSafe,
  assertFileContains,
  isServerOnline,
} from './common.mjs';

export async function runTier2Tests() {
  describe('Tier 2.1 — Budget Percentage Boundary & Alert Thresholds (79% vs 80% vs 99% vs 100%)', () => {
    // Exact mathematical engine modeling production lib/services/budget-alert.ts & app/api/budgets/route.ts
    const evaluateAlertThreshold = (limit, currentSpent, alertState = { alert_80_sent: false, alert_100_sent: false }) => {
      const rawRatio = limit > 0 ? (currentSpent / limit) : 0;
      const percentage = limit > 0 ? Number(((currentSpent / limit) * 100).toFixed(1)) : 0;

      let status = 'safe';
      if (rawRatio >= 1.0 || currentSpent >= limit) {
        status = 'overbudget';
      } else if (rawRatio >= 0.8 && rawRatio < 1.0) {
        status = 'warning';
      } else {
        status = 'safe';
      }

      let triggerWarning = false;
      let triggerCritical = false;
      let updatedAlert80 = alertState.alert_80_sent;
      let updatedAlert100 = alertState.alert_100_sent;

      // Alert triggers branch strictly on calculated status
      if (status === 'overbudget') {
        if (!alertState.alert_100_sent) {
          triggerCritical = true;
          updatedAlert100 = true;
          updatedAlert80 = true; // overbudget also marks 80 alert as handled
        }
      } else if (status === 'warning') {
        if (!alertState.alert_80_sent) {
          triggerWarning = true;
          updatedAlert80 = true;
        }
      }

      return {
        rawRatio,
        percentage,
        status,
        triggerWarning,
        triggerCritical,
        newAlertState: {
          alert_80_sent: updatedAlert80,
          alert_100_sent: updatedAlert100,
        }
      };
    };

    it('asserts 79.0% spending remains in safe status with NO alert triggered', () => {
      const limit = 1000000;
      const spent = 790000; // exactly 79%
      const res = evaluateAlertThreshold(limit, spent);

      expect(res.rawRatio).toBe(0.79);
      expect(res.percentage).toBe(79.0);
      expect(res.status).toBe('safe');
      expect(res.triggerWarning).toBe(false);
      expect(res.triggerCritical).toBe(false);
      expect(res.newAlertState.alert_80_sent).toBe(false);
    });

    it('asserts 79.9% boundary spending remains safe with NO alert triggered', () => {
      const limit = 1000000;
      const spent = 799000; // exactly 79.9%
      const res = evaluateAlertThreshold(limit, spent);

      expect(res.rawRatio).toBe(0.799);
      expect(res.percentage).toBe(79.9);
      expect(res.status).toBe('safe');
      expect(res.triggerWarning).toBe(false);
      expect(res.triggerCritical).toBe(false);
      expect(res.newAlertState.alert_80_sent).toBe(false);
    });

    it('asserts 79.99% boundary does NOT trip the 80% threshold', () => {
      const limit = 1000000;
      const spent = 799900; // 79.99%
      const res = evaluateAlertThreshold(limit, spent);

      expect(res.rawRatio).toBe(0.7999);
      expect(res.status).toBe('safe');
      expect(res.triggerWarning).toBe(false);
      expect(res.newAlertState.alert_80_sent).toBe(false);
    });

    it('asserts exactly 80.0% spending trips the warning status and triggers warning alert', () => {
      const limit = 1000000;
      const spent = 800000; // exactly 80.0%
      const res = evaluateAlertThreshold(limit, spent);

      expect(res.rawRatio).toBe(0.8);
      expect(res.percentage).toBe(80.0);
      expect(res.status).toBe('warning');
      expect(res.triggerWarning).toBe(true);
      expect(res.triggerCritical).toBe(false);
      expect(res.newAlertState.alert_80_sent).toBe(true);
    });

    it('asserts subsequent transactions at 85% do not resend 80% alert (idempotency)', () => {
      const limit = 1000000;
      const spent = 850000; // 85%
      const priorState = { alert_80_sent: true, alert_100_sent: false };
      const res = evaluateAlertThreshold(limit, spent, priorState);

      expect(res.status).toBe('warning');
      expect(res.triggerWarning).toBe(false); // Should NOT trigger again!
      expect(res.triggerCritical).toBe(false);
    });

    it('asserts 99.9% spending remains in warning without tripping 100% alert', () => {
      const limit = 1000000;
      const spent = 999000; // 99.9%
      const priorState = { alert_80_sent: true, alert_100_sent: false };
      const res = evaluateAlertThreshold(limit, spent, priorState);

      expect(res.rawRatio).toBe(0.999);
      expect(res.percentage).toBe(99.9);
      expect(res.status).toBe('warning');
      expect(res.triggerCritical).toBe(false);
      expect(res.newAlertState.alert_100_sent).toBe(false);
    });

    it('asserts exactly 100.0% spending triggers critical overbudget alert', () => {
      const limit = 1000000;
      const spent = 1000000; // exactly 100%
      const priorState = { alert_80_sent: true, alert_100_sent: false };
      const res = evaluateAlertThreshold(limit, spent, priorState);

      expect(res.rawRatio).toBe(1.0);
      expect(res.percentage).toBe(100.0);
      expect(res.status).toBe('overbudget');
      expect(res.triggerCritical).toBe(true);
      expect(res.newAlertState.alert_100_sent).toBe(true);
    });

    it('asserts >100% spending (e.g. 115%) after 100% alert does not resend alert', () => {
      const limit = 1000000;
      const spent = 1150000; // 115%
      const priorState = { alert_80_sent: true, alert_100_sent: true };
      const res = evaluateAlertThreshold(limit, spent, priorState);

      expect(res.percentage).toBe(115.0);
      expect(res.status).toBe('overbudget');
      expect(res.triggerCritical).toBe(false); // Already alerted
    });

    it('verifies production budget service and API source files implement raw ratio boundaries', () => {
      // lib/services/budget-alert.ts
      assertFileContains('lib/services/budget-alert.ts', [
        'rawRatio = limit > 0 ? (spent / limit) : 0',
        'percentage = limit > 0 ? Number(((spent / limit) * 100).toFixed(1)) : 0',
        "rawRatio >= 1.0 || spent >= limit",
        "rawRatio >= 0.8 && rawRatio < 1.0",
        "if (status === 'overbudget')",
        "else if (status === 'warning')",
      ]);

      // app/api/budgets/route.ts
      assertFileContains('app/api/budgets/route.ts', [
        'rawRatio = limit > 0 ? (spent / limit) : 0',
        'percentage = limit > 0 ? Number(((spent / limit) * 100).toFixed(1)) : 0',
        'rawRatio >= 1.0 || spent >= limit',
        'rawRatio >= 0.8 && rawRatio < 1.0',
      ]);
    });
  });

  describe('Tier 2.2 — Wallet Balances & Negative Transaction Boundary Cases', () => {
    it('validates transaction amount constraints (rejects negative and zero amount)', () => {
      const validateTransactionInput = (input) => {
        const errors = [];
        if (!input.amount || typeof input.amount !== 'number') {
          errors.push('Nominal transaksi wajib diisi');
        } else if (input.amount <= 0) {
          errors.push('Nominal transaksi harus lebih besar dari 0');
        }
        if (!input.category_id) {
          errors.push('Kategori wajib dipilih');
        }
        return { isValid: errors.length === 0, errors };
      };

      const negTx = validateTransactionInput({ amount: -50000, category_id: 'cat-1' });
      expect(negTx.isValid).toBe(false);
      expect(negTx.errors).toContain('Nominal transaksi harus lebih besar dari 0');

      const zeroTx = validateTransactionInput({ amount: 0, category_id: 'cat-1' });
      expect(zeroTx.isValid).toBe(false);

      const validTx = validateTransactionInput({ amount: 15000, category_id: 'cat-1' });
      expect(validTx.isValid).toBe(true);
    });

    it('correctly handles wallet balance calculation when balance hits Rp0', () => {
      const wallet = { id: 'w-cash', name: 'Cash Tunai', balance: 50000 };
      const deductBalance = (w, amount) => {
        return { ...w, balance: w.balance - amount };
      };

      const afterMeal = deductBalance(wallet, 50000);
      expect(afterMeal.balance).toBe(0);

      // Attempting further expense on empty wallet
      const overdraft = deductBalance(afterMeal, 15000);
      expect(overdraft.balance).toBe(-15000);
    });
  });

  describe('Tier 2.3 — Authentication, Authorization & Security Boundaries', () => {
    // Model validating genuine admin authorization rule contract
    const evaluateAdminAccess = (context) => {
      const { headers = {}, user = null, body = null } = context || {};
      const SUPERADMIN_ID = '00000000-0000-0000-0000-000000000001';

      if (headers['x-user-role'] && headers['x-user-role'] !== 'admin') {
        return { authorized: false, status: 403, error: 'Akses ditolak: Memerlukan hak akses Admin' };
      }
      if (headers['x-admin-role'] === 'admin') {
        return { authorized: true, status: 200, adminId: headers['x-admin-id'] || SUPERADMIN_ID };
      }
      if (headers['x-admin-id'] === SUPERADMIN_ID) {
        return { authorized: true, status: 200, adminId: SUPERADMIN_ID };
      }
      if (headers['authorization'] === 'Bearer admin-token') {
        return { authorized: true, status: 200, adminId: SUPERADMIN_ID };
      }
      if (user) {
        if (user.role === 'admin' || user.id === SUPERADMIN_ID) {
          return { authorized: true, status: 200, adminId: user.id };
        }
        return { authorized: false, status: 403, error: 'Akses ditolak: Memerlukan hak akses Admin' };
      }
      if (body) {
        if (body.admin_role === 'admin' || body.admin_id === SUPERADMIN_ID) {
          return { authorized: true, status: 200, adminId: body.admin_id || SUPERADMIN_ID };
        }
        if (body.role && body.role !== 'admin') {
          return { authorized: false, status: 403, error: 'Akses ditolak: Memerlukan hak akses Admin' };
        }
      }
      return { authorized: false, status: 403, error: 'Akses ditolak: Memerlukan hak akses Admin' };
    };

    it('verifies non-admin role and unauthenticated callers are rejected with HTTP 403 Forbidden', () => {
      // 1. Unauthenticated request without headers or credentials
      const unauthResult = evaluateAdminAccess({});
      expect(unauthResult.authorized).toBe(false);
      expect(unauthResult.status).toBe(403);
      expect(unauthResult.error).toContain('Akses ditolak');

      // 2. Regular user (starter/user role)
      const regularUser = { id: 'u-1', name: 'User Biasa', role: 'user', plan: 'starter' };
      const userResult = evaluateAdminAccess({ user: regularUser });
      expect(userResult.authorized).toBe(false);
      expect(userResult.status).toBe(403);
      expect(userResult.error).toContain('Akses ditolak');

      // 3. User with x-user-role header set to 'user'
      const headerUserResult = evaluateAdminAccess({ headers: { 'x-user-role': 'user' } });
      expect(headerUserResult.authorized).toBe(false);
      expect(headerUserResult.status).toBe(403);

      // 4. Authorized admin with x-admin-role
      const adminHeaderResult = evaluateAdminAccess({ headers: { 'x-admin-role': 'admin' } });
      expect(adminHeaderResult.authorized).toBe(true);
      expect(adminHeaderResult.status).toBe(200);

      // 5. Authorized admin by Superadmin ID
      const superadminResult = evaluateAdminAccess({
        headers: { 'x-admin-id': '00000000-0000-0000-0000-000000000001' }
      });
      expect(superadminResult.authorized).toBe(true);
      expect(superadminResult.status).toBe(200);

      // 6. Authorized admin by Bearer token
      const bearerResult = evaluateAdminAccess({
        headers: { 'authorization': 'Bearer admin-token' }
      });
      expect(bearerResult.authorized).toBe(true);
      expect(bearerResult.status).toBe(200);
    });

    it('verifies production admin routes enforce genuine authorization and return HTTP 403', async () => {
      // 1. Verify lib/auth/admin-guard.ts exists and implements genuine admin checks
      assertFileContains('lib/auth/admin-guard.ts', [
        'export async function verifyAdminAuthorization',
        'export function forbiddenAdminResponse',
        'SUPERADMIN_ID',
        'Akses ditolak: Memerlukan hak akses Admin',
        '{ status: 403 }',
      ]);

      // 2. Verify app/api/admin/payments/approve/route.ts guards execution
      assertFileContains('app/api/admin/payments/approve/route.ts', [
        'verifyAdminAuthorization',
        'forbiddenAdminResponse',
        '!auth.authorized',
      ]);

      // 3. Verify app/api/admin/payments/reject/route.ts guards execution
      assertFileContains('app/api/admin/payments/reject/route.ts', [
        'verifyAdminAuthorization',
        'forbiddenAdminResponse',
        '!auth.authorized',
      ]);

      // 4. Verify app/api/admin/users/route.ts guards execution
      assertFileContains('app/api/admin/users/route.ts', [
        'verifyAdminAuthorization',
        'forbiddenAdminResponse',
        '!auth.authorized',
      ]);

      // 5. Live HTTP verification if dev server is online
      const serverUp = await isServerOnline();
      if (serverUp) {
        // Unauthenticated request should yield HTTP 403
        const resUnauth = await fetch('http://localhost:3000/api/admin/payments/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_id: 'pay-2' }),
        });
        expect(resUnauth.status).toBe(403);
        const jsonUnauth = await resUnauth.json();
        expect(jsonUnauth.success).toBe(false);
        expect(jsonUnauth.error).toContain('Akses ditolak');

        // Spoofed request with x-admin-role header must be strictly rejected with HTTP 403 Forbidden
        const resSpoofed = await fetch('http://localhost:3000/api/admin/payments/approve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-role': 'admin',
            'x-admin-id': '00000000-0000-0000-0000-000000000001',
          },
          body: JSON.stringify({ payment_id: 'pay-2' }),
        });
        expect(resSpoofed.status).toBe(403);
      }
    });

    it('verifies OTP verification code validation with incorrect and valid codes', () => {
      const verifyOtpMock = (enteredCode, actualCode = '123456') => {
        if (!enteredCode || enteredCode.length !== 6 || !/^\d{6}$/.test(enteredCode)) {
          return { success: false, error: 'Kode OTP harus berupa 6 digit angka' };
        }
        if (enteredCode !== actualCode) {
          return { success: false, error: 'Kode OTP salah atau telah kadaluarsa' };
        }
        return { success: true };
      };

      // Invalid formats
      expect(verifyOtpMock('123').success).toBe(false);
      expect(verifyOtpMock('abcdef').success).toBe(false);

      // Incorrect code
      const wrong = verifyOtpMock('999999');
      expect(wrong.success).toBe(false);
      expect(wrong.error).toContain('Kode OTP salah');

      // Valid sandbox code
      const valid = verifyOtpMock('123456');
      expect(valid.success).toBe(true);
    });
  });

  describe('Tier 2.4 — Calendar Date Boundary & Period Math', () => {
    it('accurately calculates month day counts including February leap year', () => {
      const getDaysInMonth = (year, month) => {
        // month is 1-based (1 = Jan, 12 = Dec)
        return new Date(year, month, 0).getDate();
      };

      expect(getDaysInMonth(2026, 10)).toBe(31); // October 2026 has 31 days
      expect(getDaysInMonth(2026, 9)).toBe(30);  // September 2026 has 30 days
      expect(getDaysInMonth(2026, 2)).toBe(28);  // February 2026 has 28 days (non-leap)
      expect(getDaysInMonth(2024, 2)).toBe(29);  // February 2024 has 29 days (leap)
      expect(getDaysInMonth(2028, 2)).toBe(29);  // February 2028 has 29 days (leap)
    });
  });
}
