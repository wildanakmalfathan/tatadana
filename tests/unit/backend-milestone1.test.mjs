/**
 * Backend Milestone 1 Verification Test Suite
 * Tests persistent DB, scrypt password hashing, identity normalization,
 * session tokens, ledger SSoT integer arithmetic, idempotency, and auth endpoints.
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// Test runners
let passedTests = 0
let failedTests = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
    passedTests++
  } catch (err) {
    console.error(`  ✗ ${name}`)
    console.error(`    ${err.message}`)
    failedTests++
  }
}

async function runTests() {
  console.log('\n--- Running Backend Milestone 1 Verification Tests ---\n')

  // Import compiled modules or dynamic imports via Next/Node
  // Since tatadana uses TypeScript and ES modules, we can import via dynamic import or relative paths
  // Let's test the modules using Node
  
  // 1. Test Password Hashing
  console.log('1. Password Hashing & Cryptography (scrypt + random salt)')
  const { hashPasswordSync, verifyPasswordSync, hashPassword, verifyPassword } = await import('../../lib/auth/password.ts')

  await test('hashPasswordSync produces scrypt format with 16-byte salt and derived key', () => {
    const hash = hashPasswordSync('PasswordRahasia123!')
    assert.match(hash, /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/)
  })

  await test('hashPasswordSync generates different salts for identical passwords', () => {
    const hash1 = hashPasswordSync('PasswordRahasia123!')
    const hash2 = hashPasswordSync('PasswordRahasia123!')
    assert.notEqual(hash1, hash2)
  })

  await test('verifyPasswordSync returns true for matching password and false for wrong password', () => {
    const hash = hashPasswordSync('PasswordRahasia123!')
    assert.equal(verifyPasswordSync('PasswordRahasia123!', hash), true)
    assert.equal(verifyPasswordSync('WrongPassword', hash), false)
    assert.equal(verifyPasswordSync('', hash), false)
  })

  await test('async hashPassword and verifyPassword succeed with constant-time equality', async () => {
    const hash = await hashPassword('AdminTataDana2026!')
    const isValid = await verifyPassword('AdminTataDana2026!', hash)
    assert.equal(isValid, true)
    const isInvalid = await verifyPassword('admin123', hash)
    assert.equal(isInvalid, false)
  })

  // 2. Test Identity Normalization
  console.log('\n2. Identity Normalization (Email & Indonesian Phone E.164)')
  const { normalizeEmail, normalizePhone, isValidEmail, isValidPhone } = await import('../../lib/auth/normalization.ts')

  await test('normalizeEmail trims and converts to lowercase', () => {
    assert.equal(normalizeEmail('  WildanAkmalFathan@GMAIL.com  '), 'wildanakmalfathan@gmail.com')
    assert.equal(normalizeEmail('USER@example.CO.ID'), 'user@example.co.id')
  })

  await test('isValidEmail validates RFC format', () => {
    assert.equal(isValidEmail('wildanakmalfathan@gmail.com'), true)
    assert.equal(isValidEmail('invalid-email'), false)
    assert.equal(isValidEmail(''), false)
  })

  await test('normalizePhone converts 08..., 628..., 8... to E.164 (+628...)', () => {
    assert.equal(normalizePhone('081460932853'), '+6281460932853')
    assert.equal(normalizePhone('6281460932853'), '+6281460932853')
    assert.equal(normalizePhone('81460932853'), '+6281460932853')
    assert.equal(normalizePhone('+62 814-6093-2853'), '+6281460932853')
    assert.equal(normalizePhone('0812-3456-7890'), '+6281234567890')
  })

  await test('isValidPhone validates Indonesian phone format', () => {
    assert.equal(isValidPhone('081460932853'), true)
    assert.equal(isValidPhone('+6281460932853'), true)
    assert.equal(isValidPhone('12345'), false)
    assert.equal(isValidPhone(''), false)
  })

  // 3. Test Session Tokens
  console.log('\n3. Cryptographic Session Tokens')
  const { generateSessionToken, verifySessionToken } = await import('../../lib/auth/tokens.ts')

  await test('generateSessionToken issues signed JWT-compatible token', () => {
    const token = generateSessionToken({
      userId: 'test-user-001',
      email: 'test@tatadana.id',
      name: 'Test User',
      role: 'user',
      plan: 'starter',
    })
    assert.equal(typeof token, 'string')
    assert.equal(token.split('.').length, 3)

    const payload = verifySessionToken(token)
    assert.ok(payload)
    assert.equal(payload.userId, 'test-user-001')
    assert.equal(payload.email, 'test@tatadana.id')
    assert.equal(payload.role, 'user')
    assert.equal(payload.plan, 'starter')
  })

  await test('verifySessionToken rejects tampered signature', () => {
    const token = generateSessionToken({
      userId: 'test-user-001',
      email: 'test@tatadana.id',
      name: 'Test User',
      role: 'user',
      plan: 'starter',
    })
    const tampered = token.substring(0, token.length - 4) + 'abcd'
    const result = verifySessionToken(tampered)
    assert.equal(result, null)
  })

  await test('verifySessionToken rejects expired token', () => {
    const expiredToken = generateSessionToken(
      {
        userId: 'test-user-001',
        email: 'test@tatadana.id',
        name: 'Test User',
        role: 'user',
        plan: 'starter',
      },
      { expiresInSeconds: -10 }
    )
    const result = verifySessionToken(expiredToken)
    assert.equal(result, null)
  })

  // 4. Test Persistent Store & Admin Pre-Seed
  console.log('\n4. Persistent Database Store & Official Admin Pre-Seed')
  const { PersistentStore, OFFICIAL_ADMIN_EMAIL, OFFICIAL_ADMIN_PHONE, OFFICIAL_SUPERADMIN_ID } = await import('../../lib/db/store.ts')

  await test('PersistentStore initializes with official pre-seeded admin user', () => {
    const admin = PersistentStore.findUserByEmail(OFFICIAL_ADMIN_EMAIL)
    assert.ok(admin, 'Official admin must exist in store')
    assert.equal(admin.id, OFFICIAL_SUPERADMIN_ID)
    assert.equal(admin.name, 'Wildan Akmal Fathan')
    assert.equal(admin.email, 'wildanakmalfathan@gmail.com')
    assert.equal(admin.phone, '+6281460932853')
    assert.equal(admin.role, 'admin')
    assert.equal(admin.plan, 'pro_lifetime')
    assert.equal(admin.status, 'active')
    assert.match(admin.password_hash, /^scrypt:/)
    assert.equal(verifyPasswordSync('AdminTataDana2026!', admin.password_hash), true)
  })

  await test('PersistentStore contains pre-seeded admin wallets with integer IDR balances', () => {
    const wallets = PersistentStore.getWallets(OFFICIAL_SUPERADMIN_ID)
    assert.ok(wallets.length >= 3, 'Must have at least 3 wallets')
    const bca = wallets.find((w) => w.name === 'BCA Utama')
    assert.ok(bca)
    assert.equal(bca.is_default, true)
    assert.equal(bca.is_default_telegram, true)
    assert.equal(Number.isInteger(bca.balance), true)
  })

  // 5. Test Ledger Service & Pure Integer IDR Arithmetic & Idempotency
  console.log('\n5. Ledger Service (SSoT, Atomic Mutation & Idempotency)')
  const { LedgerService } = await import('../../lib/services/ledger.ts')

  await test('createTransaction mutates wallet balance atomically with integer IDR', async () => {
    const testWallet = PersistentStore.createWallet({
      user_id: OFFICIAL_SUPERADMIN_ID,
      name: 'Test SSoT Wallet ' + Date.now(),
      type: 'bank',
      balance: 1000000,
    })
    const initialBalance = testWallet.balance

    // Create expense
    const resExpense = await LedgerService.createTransaction({
      user_id: OFFICIAL_SUPERADMIN_ID,
      type: 'expense',
      amount: 50000,
      wallet_id: testWallet.id,
      notes: 'Beli makan siang',
    })

    const updatedWallet = PersistentStore.getWalletById(testWallet.id)
    assert.equal(updatedWallet.balance, initialBalance - 50000)
    assert.equal(Number.isInteger(updatedWallet.balance), true)

    // SSoT verification: calculateWalletBalance matches opening balance + ledger delta
    const computed = LedgerService.calculateWalletBalance(testWallet.id, 1000000)
    assert.equal(computed, updatedWallet.balance)

    // Cleanup: rollback by deleting transaction and archiving test wallet
    await LedgerService.deleteTransaction(resExpense.transaction.id, OFFICIAL_SUPERADMIN_ID)
    const restoredWallet = PersistentStore.getWalletById(testWallet.id)
    assert.equal(restoredWallet.balance, initialBalance)
    PersistentStore.updateWallet(testWallet.id, OFFICIAL_SUPERADMIN_ID, { is_archived: true })
  })

  await test('createTransaction enforces idempotency_key deduplication', async () => {
    const adminWallets = PersistentStore.getWallets(OFFICIAL_SUPERADMIN_ID)
    const wallet = adminWallets[0]
    const initialBalance = wallet.balance
    const idemKey = 'idem-' + Date.now()

    // First call
    const res1 = await LedgerService.createTransaction({
      user_id: OFFICIAL_SUPERADMIN_ID,
      type: 'income',
      amount: 100000,
      wallet_id: wallet.id,
      idempotency_key: idemKey,
      notes: 'Bonus proyek',
    })
    assert.equal(res1.isDuplicate, false)
    assert.equal(PersistentStore.getWalletById(wallet.id).balance, initialBalance + 100000)

    // Second call with identical idempotency_key
    const res2 = await LedgerService.createTransaction({
      user_id: OFFICIAL_SUPERADMIN_ID,
      type: 'income',
      amount: 100000,
      wallet_id: wallet.id,
      idempotency_key: idemKey,
      notes: 'Bonus proyek duplikat',
    })
    assert.equal(res2.isDuplicate, true)
    assert.equal(res2.transaction.id, res1.transaction.id)
    // Balance must NOT have increased twice!
    assert.equal(PersistentStore.getWalletById(wallet.id).balance, initialBalance + 100000)

    // Cleanup
    await LedgerService.deleteTransaction(res1.transaction.id, OFFICIAL_SUPERADMIN_ID)
    assert.equal(PersistentStore.getWalletById(wallet.id).balance, initialBalance)
  })

  await test('updateTransaction adjusts balance difference atomically', async () => {
    const adminWallets = PersistentStore.getWallets(OFFICIAL_SUPERADMIN_ID)
    const wallet = adminWallets[0]
    const initialBalance = wallet.balance

    const created = await LedgerService.createTransaction({
      user_id: OFFICIAL_SUPERADMIN_ID,
      type: 'expense',
      amount: 40000,
      wallet_id: wallet.id,
      notes: 'Bensin motor',
    })
    assert.equal(PersistentStore.getWalletById(wallet.id).balance, initialBalance - 40000)

    // Update expense to 60000 (diff: -20000)
    await LedgerService.updateTransaction(created.transaction.id, OFFICIAL_SUPERADMIN_ID, {
      amount: 60000,
    })
    assert.equal(PersistentStore.getWalletById(wallet.id).balance, initialBalance - 60000)

    // Cleanup
    await LedgerService.deleteTransaction(created.transaction.id, OFFICIAL_SUPERADMIN_ID)
    assert.equal(PersistentStore.getWalletById(wallet.id).balance, initialBalance)
  })

  // 6. Test Admin Guard Security (No Header Spoofing)
  console.log('\n6. Admin Guard Security (No Spoofing, Verified Tokens Only)')
  const { verifyAdminAuthorization, forbiddenAdminResponse } = await import('../../lib/auth/admin-guard.ts')

  await test('verifyAdminAuthorization REJECTS x-admin-role: admin header spoofing', async () => {
    const spoofedReq = new Request('http://localhost:3000/api/admin/users', {
      headers: {
        'x-admin-role': 'admin',
        'x-admin-id': 'hacker-user-id',
      },
    })
    const auth = await verifyAdminAuthorization(spoofedReq)
    assert.equal(auth.authorized, false)
    assert.equal(auth.error, 'Akses ditolak: Memerlukan hak akses Admin')
  })

  await test('verifyAdminAuthorization REJECTS non-admin user session token', async () => {
    const userToken = generateSessionToken({
      userId: 'normal-user-123',
      email: 'user@tatadana.id',
      name: 'Normal User',
      role: 'user',
      plan: 'starter',
    })

    const req = new Request('http://localhost:3000/api/admin/users', {
      headers: {
        authorization: `Bearer ${userToken}`,
      },
    })
    const auth = await verifyAdminAuthorization(req)
    assert.equal(auth.authorized, false)
  })

  await test('verifyAdminAuthorization ACCEPTS genuine admin session token', async () => {
    const adminToken = generateSessionToken({
      userId: OFFICIAL_SUPERADMIN_ID,
      email: OFFICIAL_ADMIN_EMAIL,
      name: 'Wildan Akmal Fathan',
      role: 'admin',
      plan: 'pro_lifetime',
    })

    const req = new Request('http://localhost:3000/api/admin/users', {
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    })
    const auth = await verifyAdminAuthorization(req)
    assert.equal(auth.authorized, true)
    assert.equal(auth.adminId, OFFICIAL_SUPERADMIN_ID)
  })

  await test('forbiddenAdminResponse returns HTTP 403 Forbidden', () => {
    const res = forbiddenAdminResponse()
    assert.equal(res.status, 403)
  })

  // 7. Test Auth Endpoints (Register, Login, Admin Login)
  console.log('\n7. Auth API Handlers (Register, User Login, Dedicated Admin Login)')
  const { POST: registerHandler } = await import('../../app/api/auth/register/route.ts')
  const { POST: loginHandler } = await import('../../app/api/auth/login/route.ts')
  const { POST: adminLoginHandler } = await import('../../app/api/auth/admin-login/route.ts')

  const testEmail = `newuser_${Date.now()}@tatadana.id`
  const testPhone = `0812${Math.floor(10000000 + Math.random() * 90000000)}`

  await test('Register API creates user with pending_approval status and hashes password', async () => {
    const req = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Budi Kurniawan',
        email: testEmail,
        phone: testPhone,
        password: 'PasswordBudi123!',
        confirmPassword: 'PasswordBudi123!',
      }),
    })

    const res = await registerHandler(req)
    assert.equal(res.status, 201)
    const json = await res.json()
    assert.equal(json.success, true)
    assert.equal(json.data.status, 'pending_approval')
    assert.equal(json.data.email, testEmail.toLowerCase())
    assert.equal(json.data.password, undefined)
    assert.equal(json.data.password_hash, undefined)
  })

  await test('Register API rejects duplicate email with HTTP 409 Conflict', async () => {
    const req = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Budi Duplikat',
        email: testEmail,
        phone: '081299998888',
        password: 'PasswordBudi123!',
        confirmPassword: 'PasswordBudi123!',
      }),
    })

    const res = await registerHandler(req)
    assert.equal(res.status, 409)
  })

  await test('User Login API blocks pending_approval user with HTTP 403 Forbidden', async () => {
    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'PasswordBudi123!',
      }),
    })

    const res = await loginHandler(req)
    assert.equal(res.status, 403)
    const json = await res.json()
    assert.equal(json.success, false)
    assert.equal(
      json.message,
      'Akun Anda sedang menunggu persetujuan admin. Silakan hubungi admin jika membutuhkan akses segera.'
    )
  })

  await test('Admin Login API strictly rejects non-admin email with HTTP 403', async () => {
    const req = new Request('http://localhost:3000/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'PasswordBudi123!',
      }),
    })

    const res = await adminLoginHandler(req)
    assert.equal(res.status, 403)
  })

  await test('Admin Login API accepts wildanakmalfathan@gmail.com with AdminTataDana2026!', async () => {
    const req = new Request('http://localhost:3000/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'wildanakmalfathan@gmail.com',
        password: 'AdminTataDana2026!',
      }),
    })

    const res = await adminLoginHandler(req)
    assert.equal(res.status, 200)
    const json = await res.json()
    assert.equal(json.success, true)
    assert.equal(json.user.role, 'admin')
    assert.equal(json.user.plan, 'pro_lifetime')
    assert.ok(json.token)
  })

  // 8. Test SQL Migration File Integrity
  console.log('\n8. SQL Migration 005_master_schema.sql Integrity')
  await test('005_master_schema.sql exists and defines all required columns and constraints', () => {
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '005_master_schema.sql')
    assert.equal(fs.existsSync(migrationPath), true)
    const content = fs.readFileSync(migrationPath, 'utf-8')
    assert.ok(content.includes('wildanakmalfathan@gmail.com'))
    assert.ok(content.includes('+6281460932853'))
    assert.ok(content.includes('pro_lifetime'))
    assert.ok(content.includes('pending_approval'))
    assert.ok(content.includes('idempotency_key'))
    assert.ok(content.includes('sync_wallet_balance'))
    assert.ok(content.includes('check_plan_transaction_limit'))
  })

  console.log(`\n----------------------------------------------------`)
  console.log(`Results: ${passedTests} passed, ${failedTests} failed`)
  console.log(`----------------------------------------------------\n`)

  if (failedTests > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
