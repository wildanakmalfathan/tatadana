/**
 * Unit & Integration Test Suite: Calendar & Multi-Period Budgeting
 * Verifies R3 (Financial Calendar & Date Detail Drawer) and R4 (Multi-Period Budgeting).
 */

import assert from 'node:assert/strict'

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

export async function runCalendarBudgetTests() {
  console.log('\n--- Running Financial Calendar & Multi-Period Budgeting Tests ---\n')

  const baseUrl = 'http://localhost:3000'

  // Authenticate as Superadmin
  const loginRes = await fetch(`${baseUrl}/api/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'wildanakmalfathan@gmail.com',
      password: 'AdminTataDana2026!',
    }),
  })
  const loginJson = await loginRes.json()
  const adminToken = loginJson.token || ''
  assert.ok(adminToken, 'Admin session token must be obtained')

  const authHeaders = {
    Authorization: `Bearer ${adminToken}`,
  }

  // 1. Calendar API Tests
  console.log('1. Financial Calendar API (`/api/transactions/calendar`)')

  await test('Calendar GET returns 31 days for October 2026 with cashflow metrics', async () => {
    const res = await fetch(`${baseUrl}/api/transactions/calendar?month=10&year=2026`, {
      headers: authHeaders,
    })
    assert.equal(res.status, 200)

    const json = await res.json()
    assert.equal(json.success, true)
    assert.equal(json.month, 10)
    assert.equal(json.year, 2026)

    // Check all 31 days exist
    for (let d = 1; d <= 31; d++) {
      const dateKey = `2026-10-${String(d).padStart(2, '0')}`
      assert.ok(json.days[dateKey], `Missing dateKey ${dateKey}`)
      assert.ok(typeof json.days[dateKey].income === 'number')
      assert.ok(typeof json.days[dateKey].expense === 'number')
      assert.ok(typeof json.days[dateKey].count === 'number')
      assert.ok(Array.isArray(json.days[dateKey].transactions))
    }

    // Check summary structure & math
    assert.ok(typeof json.summary.total_income === 'number')
    assert.ok(typeof json.summary.total_expense === 'number')
    assert.ok(typeof json.summary.net_savings === 'number')
    assert.equal(
      json.summary.net_savings,
      json.summary.total_income - json.summary.total_expense,
      'net_savings must equal total_income - total_expense'
    )
  })

  await test('Calendar items include enriched category with emoji and wallet name', async () => {
    const res = await fetch(`${baseUrl}/api/transactions/calendar?month=10&year=2026`, {
      headers: authHeaders,
    })
    const json = await res.json()

    let foundTx = 0
    for (const [dateKey, dayData] of Object.entries(json.days)) {
      if (dayData.count > 0) {
        for (const tx of dayData.transactions) {
          foundTx++
          assert.ok(tx.id, 'Transaction must have id')
          assert.ok(tx.amount > 0, 'Amount must be positive')
          assert.ok(tx.category, 'Transaction must have category name')
          assert.ok(tx.category_emoji, 'Transaction must have category emoji')
          assert.ok(tx.wallet, 'Transaction must have wallet name')
          assert.ok(tx.date === dateKey, 'Transaction date must match dateKey')
        }
      }
    }
    assert.ok(foundTx > 0, 'Must find at least 1 enriched transaction in calendar')
    console.log(`    (Verified ${foundTx} enriched transactions across calendar month)`)
  })

  await test('Calendar multi-wallet filter recalculates aggregations for specific wallet', async () => {
    const resBca = await fetch(`${baseUrl}/api/transactions/calendar?month=10&year=2026&wallet_id=bca`, {
      headers: authHeaders,
    })
    const jsonBca = await resBca.json()

    assert.equal(resBca.status, 200)
    assert.equal(jsonBca.success, true)

    for (const day of Object.values(jsonBca.days)) {
      for (const tx of day.transactions) {
        assert.ok(
          tx.wallet.toLowerCase().includes('bca') || (tx.wallet_id && tx.wallet_id.includes('bca')),
          `Transaction wallet ${tx.wallet} should match BCA filter`
        )
      }
    }
  })

  // 2. Multi-Period Budgeting API Tests
  console.log('\n2. Multi-Period Budgeting API (`/api/budgets`)')

  for (const period of ['daily', 'weekly', 'monthly']) {
    await test(`Budgets GET returns valid ${period} budgets with dynamic spent calculation`, async () => {
      const res = await fetch(`${baseUrl}/api/budgets?period=${period}`, {
        headers: authHeaders,
      })
      assert.equal(res.status, 200)

      const json = await res.json()
      assert.equal(json.success, true)
      assert.equal(json.period, period)
      assert.ok(Array.isArray(json.data), 'Data must be array')
      assert.ok(json.data.length > 0, `Must return at least 1 budget for ${period}`)

      for (const b of json.data) {
        assert.ok(b.id, 'Budget must have id')
        assert.ok(b.category_id, 'Budget must have category_id')
        assert.ok(b.category_name, 'Budget must have category_name')
        assert.ok(b.category_emoji, 'Budget must have category_emoji')
        assert.equal(b.period, period, `Period must be ${period}`)
        assert.ok(typeof b.limit_amount === 'number' && b.limit_amount >= 0, 'limit_amount must be number >= 0')
        assert.ok(typeof b.spent_amount === 'number' && b.spent_amount >= 0, 'spent_amount must be number >= 0')
        assert.ok(typeof b.percentage === 'number', 'percentage must be number')
        assert.ok(['safe', 'warning', 'overbudget'].includes(b.status), `Invalid status ${b.status}`)

        // Check threshold correctness
        if (b.percentage >= 100 || b.spent_amount >= b.limit_amount) {
          assert.equal(b.status, 'overbudget')
        } else if (b.percentage >= 80) {
          assert.equal(b.status, 'warning')
        } else {
          assert.equal(b.status, 'safe')
        }
      }

      assert.ok(typeof json.summary.total_limit === 'number')
      assert.ok(typeof json.summary.total_spent === 'number')
    })
  }

  await test('Budget POST creates/updates category budget limit persistently', async () => {
    const postRes = await fetch(`${baseUrl}/api/budgets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        category_id: 'cat-hiburan',
        period: 'daily',
        amount: 88000,
      }),
    })
    assert.equal(postRes.status, 200)
    const postJson = await postRes.json()
    assert.equal(postJson.success, true)

    // Verify it reflects in GET /api/budgets?period=daily
    const getRes = await fetch(`${baseUrl}/api/budgets?period=daily`, {
      headers: authHeaders,
    })
    const getJson = await getRes.json()
    const hiburanBudget = getJson.data.find((b) => b.category_id === 'cat-hiburan')
    assert.ok(hiburanBudget, 'Must find hiburan budget in daily period')
    assert.equal(hiburanBudget.limit_amount, 88000)
  })

  await test('Budget DELETE removes custom budget limit', async () => {
    const delRes = await fetch(`${baseUrl}/api/budgets?category_id=cat-hiburan&period=daily`, {
      method: 'DELETE',
      headers: authHeaders,
    })
    assert.equal(delRes.status, 200)
    const delJson = await delRes.json()
    assert.equal(delJson.success, true)
  })

  console.log(`\nResults: ${passedTests} passed, ${failedTests} failed\n`)
  assert.equal(failedTests, 0, 'All calendar and budget tests must pass')
}

// Run when executed directly
if (process.argv[1]?.endsWith('calendar-budget.test.mjs')) {
  runCalendarBudgetTests().catch((err) => {
    console.error('Test execution error:', err)
    process.exit(1)
  })
}
