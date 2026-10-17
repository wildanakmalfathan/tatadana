// tests/e2e/new-user-clean-state.test.mjs
// Master Suite: New User Clean Initial State & Data Isolation (Tests A through F)
// Verifies:
// Test A: Registrasi Pengguna Baru & Kondisi Awal Bersih (0 wallets, 0 transactions, Rp0)
// Test B: Riwayat Transaksi Kosong & Clean State
// Test C: Halaman Dompet & Pembuatan Dompet Pertama Secara Mandiri
// Test D: Pencatatan Transaksi Pertama & Mutasi Saldo Atomik
// Test E: Isolasi Data Ketat Antar Pengguna (User 1 vs User 2)
// Test F: Preservasi Data Pengguna Lama & Akun Superadmin

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, isServerOnline, PROJECT_ROOT, registry } from './common.mjs';

const DB_FILE = path.join(PROJECT_ROOT, 'data', 'tatadana-db.json');

function getDb() {
  if (!fs.existsSync(DB_FILE)) return { users: [], wallets: [], transactions: [] };
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function getDbWallets(userId) {
  const db = getDb();
  return (db.wallets || []).filter((w) => w.user_id === userId && !w.is_archived);
}

function getDbWalletById(walletId, userId) {
  const db = getDb();
  return (db.wallets || []).find((w) => w.id === walletId && w.user_id === userId);
}

function getDbTransactions(userId) {
  const db = getDb();
  return (db.transactions || []).filter((t) => t.user_id === userId);
}

export async function runNewUserCleanStateTests() {
  const serverBase = 'http://localhost:3000';
  const serverUp = await isServerOnline(serverBase, 4000);

  const timestamp = Date.now();
  const user1Email = `clean.user1.${timestamp}@tatadana.id`;
  const user1Phone = `0812${String(timestamp).slice(-8)}`;
  let user2Email = `clean.user2.${timestamp}@tatadana.id`;
  let user2Phone = `0813${String(timestamp).slice(-8)}`;

  let user1Token = '';
  let user1Id = '';
  let user2Token = '';
  let user2Id = '';
  let createdWalletId = '';

  const adminEmail = 'wildanakmalfathan@gmail.com';
  const adminPassword = 'AdminTataDana2026!';

  describe('Master Suite: New User Clean Initial State & Data Isolation (Tests A through F)', () => {
    // ============================================================================
    // Test A: Registrasi Pengguna Baru & Kondisi Awal Bersih
    // ============================================================================
    it('Test A: New user registration starts with 0 wallets, 0 transactions, Rp0 balance and income/expense', async () => {
      if (!serverUp) return;

      // 1. Register User 1
      const regRes = await fetch(`${serverBase}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: 'Sobat Bersih Satu',
          email: user1Email,
          phone: user1Phone,
          password: 'Password123!',
          confirm_password: 'Password123!',
        }),
      });

      expect(regRes.status).toBe(201);
      const regData = await regRes.json();
      expect(regData.success).toBe(true);
      user1Id = regData.user.id;

      // 2. Admin logs in and approves User 1
      const adminLoginRes = await fetch(`${serverBase}/api/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
        }),
      });
      const adminLoginData = await adminLoginRes.json();
      const adminToken = adminLoginData.token;

      const approveRes = await fetch(`${serverBase}/api/admin/users`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          userId: user1Id,
          action: 'approve',
        }),
      });
      expect(approveRes.status).toBe(200);

      // 3. Login User 1
      const loginRes = await fetch(`${serverBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user1Email,
          password: 'Password123!',
        }),
      });

      expect(loginRes.status).toBe(200);
      const loginData = await loginRes.json();
      expect(loginData.success).toBe(true);
      user1Token = loginData.session?.access_token;
      expect(user1Token).toBeDefined();

      // 4. Query /api/wallets — MUST BE COMPLETELY EMPTY []
      const walletsRes = await fetch(`${serverBase}/api/wallets`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      expect(walletsRes.status).toBe(200);
      const walletsData = await walletsRes.json();
      expect(walletsData.success).toBe(true);
      expect(Array.isArray(walletsData.data)).toBe(true);
      expect(walletsData.data.length).toBe(0); // Exactly 0 wallets

      // 5. Query /api/transactions — MUST BE COMPLETELY EMPTY []
      const txRes = await fetch(`${serverBase}/api/transactions`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      expect(txRes.status).toBe(200);
      const txData = await txRes.json();
      expect(txData.success).toBe(true);
      expect(Array.isArray(txData.data)).toBe(true);
      expect(txData.data.length).toBe(0); // Exactly 0 transactions

      // 6. Query /api/transactions/calendar — MUST BE Rp0
      const calRes = await fetch(`${serverBase}/api/transactions/calendar?month=10&year=2026`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      expect(calRes.status).toBe(200);
      const calData = await calRes.json();
      expect(calData.success).toBe(true);
      expect(calData.summary.total_income).toBe(0);
      expect(calData.summary.total_expense).toBe(0);
      expect(calData.summary.net_savings).toBe(0);
      expect(calData.summary.transaction_count).toBe(0);
    });

    // ============================================================================
    // Test B: Riwayat Transaksi Kosong & Clean State
    // ============================================================================
    it('Test B: Transaction history returns empty array with zero dummy/sample data', async () => {
      if (!serverUp) return;

      const res = await fetch(`${serverBase}/api/transactions`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(0);

      // Verify in persistent storage
      const storeTxs = getDbTransactions(user1Id);
      expect(storeTxs.length).toBe(0);
    });

    // ============================================================================
    // Test C: Halaman Dompet & Pembuatan Dompet Pertama Secara Mandiri
    // ============================================================================
    it('Test C: User manually creates their first wallet and sets default', async () => {
      if (!serverUp) return;

      // 1. Initial wallet count is 0
      const initialWallets = getDbWallets(user1Id);
      expect(initialWallets.length).toBe(0);

      // 2. User creates their first wallet (e.g. Bank Mandiri)
      const createRes = await fetch(`${serverBase}/api/wallets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify({
          name: 'Bank Mandiri Payroll',
          type: 'bank',
          balance: 0,
          account_number: '1400012345678',
          is_default: true,
          is_default_telegram: true,
        }),
      });

      expect(createRes.status).toBe(201);
      const createData = await createRes.json();
      expect(createData.success).toBe(true);
      expect(createData.data.name).toBe('Bank Mandiri Payroll');
      expect(createData.data.balance).toBe(0);
      expect(createData.data.is_default).toBe(true);
      createdWalletId = createData.data.id;

      // 3. Verify /api/wallets now returns exactly 1 wallet
      const checkRes = await fetch(`${serverBase}/api/wallets`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      const checkData = await checkRes.json();
      expect(checkData.data.length).toBe(1);
      expect(checkData.data[0].id).toBe(createdWalletId);
    });

    // ============================================================================
    // Test D: Pencatatan Transaksi Pertama & Mutasi Saldo Atomik
    // ============================================================================
    it('Test D: Recording first transaction mutates wallet balance atomically from Rp0', async () => {
      if (!serverUp) return;

      // 1. Record first income: Gaji Rp 7.500.000
      const inRes = await fetch(`${serverBase}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify({
          type: 'income',
          amount: 7500000,
          walletId: createdWalletId,
          date: '2026-10-17',
          notes: 'Gaji Pertama PT Mandiri Jaya',
        }),
      });

      expect(inRes.status).toBe(201);
      const inData = await inRes.json();
      expect(inData.success).toBe(true);
      expect(inData.data.amount).toBe(7500000);

      // Verify wallet balance is now exactly Rp 7.500.000
      const walletAfterIn = getDbWalletById(createdWalletId, user1Id);
      expect(walletAfterIn?.balance).toBe(7500000);

      // 2. Record first expense: Belanja Sembako Rp 350.000
      const outRes = await fetch(`${serverBase}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify({
          type: 'expense',
          amount: 350000,
          walletId: createdWalletId,
          date: '2026-10-17',
          notes: 'Belanja Sembako Mingguan',
        }),
      });

      expect(outRes.status).toBe(201);
      const outData = await outRes.json();
      expect(outData.success).toBe(true);

      // Verify wallet balance is now exactly 7.500.000 - 350.000 = Rp 7.150.000
      const walletAfterOut = getDbWalletById(createdWalletId, user1Id);
      expect(walletAfterOut?.balance).toBe(7150000);

      // 3. Verify transaction count is exactly 2
      const txList = getDbTransactions(user1Id);
      expect(txList.length).toBe(2);
    });

    // ============================================================================
    // Test E: Isolasi Data Ketat Antar Pengguna (User 1 vs User 2)
    // ============================================================================
    it('Test E: Strict inter-user data isolation — User 2 starts at Rp0 with zero access to User 1 data', async () => {
      if (!serverUp) return;

      const randomSuffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
      user2Email = `clean.user2.${randomSuffix}@tatadana.id`;
      user2Phone = `0819${Math.floor(10000000 + Math.random() * 89999999)}`;

      // 1. Register User 2
      const regRes = await fetch(`${serverBase}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: 'Sobat Bersih Dua',
          email: user2Email,
          phone: user2Phone,
          password: 'Password123!',
          confirm_password: 'Password123!',
        }),
      });

      expect(regRes.status).toBe(201);
      const regData = await regRes.json();
      user2Id = regData.user.id;

      // Admin approves User 2
      const adminLoginRes = await fetch(`${serverBase}/api/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
        }),
      });
      const adminLoginData = await adminLoginRes.json();
      const adminToken = adminLoginData.token;

      await fetch(`${serverBase}/api/admin/users`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          userId: user2Id,
          action: 'approve',
        }),
      });

      // Login User 2
      const login2Res = await fetch(`${serverBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user2Email,
          password: 'Password123!',
        }),
      });
      const login2Data = await login2Res.json();
      user2Token = login2Data.session?.access_token;
      expect(user2Token).toBeDefined();

      // 2. User 2 checks /api/wallets — MUST BE 0 (Does not see User 1's Bank Mandiri wallet)
      const u2Wallets = await fetch(`${serverBase}/api/wallets`, {
        headers: { Authorization: `Bearer ${user2Token}` },
      });
      const u2WJson = await u2Wallets.json();
      expect(u2WJson.data.length).toBe(0);
      expect(u2WJson.data.some((w) => w.id === createdWalletId)).toBe(false);

      // 3. User 2 checks /api/transactions — MUST BE 0 (Does not see User 1's transactions)
      const u2Txs = await fetch(`${serverBase}/api/transactions`, {
        headers: { Authorization: `Bearer ${user2Token}` },
      });
      const u2TJson = await u2Txs.json();
      expect(u2TJson.data.length).toBe(0);

      // 4. User 2 cannot access or mutate User 1's wallet
      const mutateAttempt = await fetch(`${serverBase}/api/wallets`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user2Token}`,
        },
        body: JSON.stringify({
          id: createdWalletId,
          name: 'Hacked Wallet Name',
        }),
      });
      expect(mutateAttempt.status).toBe(404);

      // Verify User 1's wallet name was NOT mutated
      const user1Wallet = getDbWalletById(createdWalletId, user1Id);
      expect(user1Wallet?.name).toBe('Bank Mandiri Payroll');
    });

    // ============================================================================
    // Test F: Preservasi Data Pengguna Lama & Akun Superadmin
    // ============================================================================
    it('Test F: Preserves official Superadmin Wildan credentials, role, and existing seeded wallets', async () => {
      const db = getDb();

      // 1. Verify Superadmin User in Persistent Database
      const superadmin = (db.users || []).find((u) => u.email === adminEmail);
      expect(superadmin).toBeDefined();
      expect(superadmin?.email).toBe(adminEmail);
      expect(superadmin?.role).toBe('admin');
      expect(superadmin?.plan).toBe('pro_lifetime');
      expect(superadmin?.status).toBe('active');

      // 2. Verify Superadmin Wallets are completely preserved and intact
      const adminWallets = (db.wallets || []).filter(
        (w) => w.user_id === superadmin.id && !w.is_archived
      );
      expect(adminWallets.length).toBeGreaterThanOrEqual(3);
      const bca = adminWallets.find((w) => w.name === 'BCA Utama');
      expect(bca).toBeDefined();
      expect(bca?.is_default).toBe(true);

      // 3. Verify Admin Transactions exist and are intact
      const adminTxs = (db.transactions || []).filter((t) => t.user_id === superadmin.id);
      expect(adminTxs.length).toBeGreaterThanOrEqual(1);
    });
  });
}

if (process.argv[1]?.endsWith('new-user-clean-state.test.mjs')) {
  runNewUserCleanStateTests()
    .then(() => registry.runAll())
    .catch((err) => {
      console.error('Test error:', err);
      process.exit(1);
    });
}

