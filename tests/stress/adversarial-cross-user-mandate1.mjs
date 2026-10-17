import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { generateSessionToken } from '../../lib/auth/tokens.ts';
import { LedgerService } from '../../lib/services/ledger.ts';
import { PersistentStore } from '../../lib/db/store.ts';
import { MultiAIProviderService } from '../../lib/ai/multi-provider.ts';
const parseIndonesianNumber = MultiAIProviderService.parseIndonesianNumber;

const PROJECT_ROOT = path.resolve(process.cwd());
const DB_PATH = path.join(PROJECT_ROOT, 'data', 'tatadana-db.json');

console.log('====================================================================');
console.log('   Adversarial Cross-User Injection & Mandate 1 Stress Harness');
console.log('====================================================================\n');

async function run() {
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error('   ', err.message);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error('   ', err.message);
      failed++;
    }
  }

  // Read initial DB
  const initialDbRaw = fs.readFileSync(DB_PATH, 'utf8');
  const initialDb = JSON.parse(initialDbRaw);

  const wildan = initialDb.users.find(u => u.email === 'wildanoces123@gmail.com');
  const superadmin = initialDb.users.find(u => u.email === 'wildanakmalfathan@gmail.com');

  assert(wildan, 'Wildan user must exist');
  assert(superadmin, 'Superadmin user must exist');

  const wildanBca = initialDb.wallets.find(w => w.user_id === wildan.id && w.name.toLowerCase().includes('bca'));
  assert(wildanBca, 'Wildan BCA wallet must exist');

  const superadminWallets = initialDb.wallets.filter(w => w.user_id === superadmin.id);
  // Ensure superadmin has at least one wallet to test transfer
  let superadminWallet = superadminWallets[0];
  if (!superadminWallet) {
    // If superadmin has no wallet in DB, we use a mock wallet ID or created wallet
    console.log('Superadmin currently has no wallets; verifying with mock ID');
  }

  const superadminToken = generateSessionToken({
    userId: superadmin.id,
    email: superadmin.email,
    name: superadmin.name,
    role: 'admin',
    plan: 'pro_lifetime',
    status: 'active',
  });

  const wildanToken = generateSessionToken({
    userId: wildan.id,
    email: wildan.email,
    name: wildan.name,
    role: 'user',
    plan: 'starter',
    status: 'active',
  });

  // -------------------------------------------------------------------------
  // 1. LIVE HTTP ENDPOINT STRESS: Cross-User Injection via POST /api/transactions
  // -------------------------------------------------------------------------
  console.log('--- 1. HTTP API: CROSS-USER WALLET INJECTION ATTEMPTS ---');

  await testAsync('HTTP POST: Superadmin targeting Wildan BCA wallet is rejected with HTTP 400', async () => {
    const res = await fetch('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superadminToken}`,
      },
      body: JSON.stringify({
        type: 'expense',
        amount: 50000,
        walletId: wildanBca.id,
        date: '2026-10-17',
        notes: 'Malicious cross-user injection attempt by superadmin',
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 400, `Expected status 400, got ${res.status}`);
    assert.equal(data.success, false, 'Expected success: false');
    assert.match(data.message, /tidak ditemukan atau bukan milik pengguna/i, 'Expected error message indicating wallet ownership error');
  });

  await testAsync('HTTP POST: Superadmin targeting non-existent fake wallet is rejected with HTTP 400', async () => {
    const res = await fetch('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superadminToken}`,
      },
      body: JSON.stringify({
        type: 'expense',
        amount: 25000,
        walletId: '00000000-fake-0000-0000-000000000000',
        date: '2026-10-17',
        notes: 'Orphan wallet injection attempt',
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 400, `Expected status 400, got ${res.status}`);
    assert.equal(data.success, false);
  });

  await testAsync('HTTP POST: Transfer with destination wallet belonging to another user is rejected with HTTP 400', async () => {
    const res = await fetch('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wildanToken}`,
      },
      body: JSON.stringify({
        type: 'transfer',
        amount: 100000,
        walletId: wildanBca.id,
        destinationWalletId: superadminWallet ? superadminWallet.id : '00000000-0000-0000-0000-000000000001',
        date: '2026-10-17',
        notes: 'Transfer cross-user destination hijacking',
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 400, `Expected status 400, got ${res.status}`);
    assert.equal(data.success, false);
    assert.match(data.message, /bukan milik pengguna/i);
  });

  await testAsync('HTTP POST: Negative amount (-50000) is rejected with HTTP 400', async () => {
    const res = await fetch('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wildanToken}`,
      },
      body: JSON.stringify({
        type: 'expense',
        amount: -50000,
        walletId: wildanBca.id,
        date: '2026-10-17',
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.success, false);
  });

  await testAsync('HTTP POST: Zero amount (0) is rejected with HTTP 400', async () => {
    const res = await fetch('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wildanToken}`,
      },
      body: JSON.stringify({
        type: 'expense',
        amount: 0,
        walletId: wildanBca.id,
        date: '2026-10-17',
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.success, false);
  });

  // -------------------------------------------------------------------------
  // 2. DIRECT SERVICE LAYER INVARIANCE TESTS
  // -------------------------------------------------------------------------
  console.log('\n--- 2. SERVICE LAYER: DIRECT INVARIANCE TESTS ---');

  await testAsync('LedgerService.createTransaction: rejects cross-user wallet_id', async () => {
    let threw = false;
    try {
      await LedgerService.createTransaction({
        user_id: superadmin.id,
        wallet_id: wildanBca.id,
        amount: 10000,
        type: 'expense',
        date: '2026-10-17',
      });
    } catch (err) {
      threw = true;
      assert.equal(err.status, 400);
      assert.match(err.message, /bukan milik pengguna/i);
    }
    assert(threw, 'Should have thrown error on cross-user wallet_id');
  });

  await testAsync('LedgerService.createTransaction: rejects cross-user destination_wallet_id', async () => {
    let threw = false;
    try {
      await LedgerService.createTransaction({
        user_id: wildan.id,
        wallet_id: wildanBca.id,
        destination_wallet_id: 'non-existent-or-other-user',
        amount: 10000,
        type: 'transfer',
        date: '2026-10-17',
      });
    } catch (err) {
      threw = true;
      assert.equal(err.status, 400);
      assert.match(err.message, /bukan milik pengguna/i);
    }
    assert(threw, 'Should have thrown error on cross-user destination_wallet_id');
  });

  // -------------------------------------------------------------------------
  // 3. STORAGE LAYER: PersistentStore INVARIANCE
  // -------------------------------------------------------------------------
  console.log('\n--- 3. STORAGE LAYER: PERSISTENTSTORE GUARDS ---');

  test('PersistentStore.getWalletById: enforces user_id check when supplied', () => {
    const crossCheck = PersistentStore.getWalletById(wildanBca.id, superadmin.id);
    assert.equal(crossCheck, null, 'getWalletById must return null when wallet does not belong to user');

    const validCheck = PersistentStore.getWalletById(wildanBca.id, wildan.id);
    assert.notEqual(validCheck, null, 'getWalletById must return wallet when user matches');
    assert.equal(validCheck.id, wildanBca.id);
  });

  // -------------------------------------------------------------------------
  // 4. NATURAL INDONESIAN NUMBER PARSING ROBUSTNESS
  // -------------------------------------------------------------------------
  console.log('\n--- 4. TATA AI / PARSE INDONESIAN NUMBER STRESS ---');

  test('parseIndonesianNumber does not concatenate timestamps or extraneous numbers', () => {
    // Crucial bug test: "Beli makan malam 35000 pakai SSoT Isolated 1792259973390"
    const parsed1 = parseIndonesianNumber('Beli makan malam 35000 pakai SSoT Isolated 1792259973390');
    assert.equal(parsed1, 35000, `Expected 35000, got ${parsed1}`);

    const parsed2 = parseIndonesianNumber('Beli pulsa 50rb no rek 08123456789');
    assert.equal(parsed2, 50000, `Expected 50000, got ${parsed2}`);

    const parsed3 = parseIndonesianNumber('Beli kopi 25k jam 15:30');
    assert.equal(parsed3, 25000, `Expected 25000, got ${parsed3}`);

    const parsed4 = parseIndonesianNumber('Makan siang 35.000 rupiah');
    assert.equal(parsed4, 35000, `Expected 35000, got ${parsed4}`);

    const parsed5 = parseIndonesianNumber('Beli sate 15 rebu');
    assert.equal(parsed5, 15000, `Expected 15000, got ${parsed5}`);

    const parsed6 = parseIndonesianNumber('Gaji bulanan 1.5jt');
    assert.equal(parsed6, 1500000, `Expected 1500000, got ${parsed6}`);

    const parsed7 = parseIndonesianNumber('Beli bensin 25.000');
    assert.equal(parsed7, 25000, `Expected 25000, got ${parsed7}`);

    const parsed8 = parseIndonesianNumber('Tagihan internet Rp 350.000');
    assert.equal(parsed8, 350000, `Expected 350000, got ${parsed8}`);
  });

  // -------------------------------------------------------------------------
  // 5. POST-ATTACK DATABASE INTEGRITY VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- 5. POST-ATTACK DATABASE HYGIENE & SSOT CHECK ---');

  const finalDb = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const finalWildanWallets = finalDb.wallets.filter(w => w.user_id === wildan.id && !w.is_archived);
  const finalBca = finalWildanWallets.find(w => w.name.toLowerCase().includes('bca'));
  const finalCash = finalWildanWallets.find(w => w.name.toLowerCase().includes('cash') || w.name.toLowerCase().includes('dompet'));
  const finalGoPay = finalWildanWallets.find(w => w.name.toLowerCase().includes('gopay'));

  test('BCA wallet balance is undisturbed at exactly 8,500,000', () => {
    assert.equal(finalBca.balance, 8500000);
  });

  test('Cash wallet balance is undisturbed at exactly 450,000', () => {
    assert.equal(finalCash.balance, 450000);
  });

  test('GoPay wallet balance is undisturbed at exactly 1,500,000', () => {
    assert.equal(finalGoPay.balance, 1500000);
  });

  test('Total wallet balance is undisturbed at exactly 10,450,000', () => {
    const total = finalBca.balance + finalCash.balance + finalGoPay.balance;
    assert.equal(total, 10450000);
  });

  test('Zero negative wallet balances in DB', () => {
    const negatives = finalDb.wallets.filter(w => w.balance < 0);
    assert.equal(negatives.length, 0);
  });

  test('Zero orphan transactions in DB', () => {
    const walletMap = new Map(finalDb.wallets.map(w => [w.id, w]));
    const orphans = finalDb.transactions.filter(tx => tx.wallet_id && !walletMap.has(tx.wallet_id));
    assert.equal(orphans.length, 0);
  });

  test('Zero cross-user transactions in DB', () => {
    const walletMap = new Map(finalDb.wallets.map(w => [w.id, w]));
    const cross = finalDb.transactions.filter(tx => {
      if (!tx.wallet_id) return false;
      const w = walletMap.get(tx.wallet_id);
      return w && w.user_id !== tx.user_id;
    });
    assert.equal(cross.length, 0);
  });

  console.log(`\n====================================================================`);
  console.log(`Stress Test Results: ${passed} passed, ${failed} failed`);
  console.log(`====================================================================`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Unhandled harness failure:', err);
  process.exit(1);
});
