import assert from 'node:assert/strict'

const BASE_URL = 'http://localhost:3000'

async function run() {
  console.log('--- Starting Independent Reviewer 2 Adversarial Stress Tests ---')

  // 1. Authenticate as Superadmin
  console.log('1. Authenticating as Superadmin...')
  const loginRes = await fetch(`${BASE_URL}/api/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'wildanakmalfathan@gmail.com',
      password: process.env.ADMIN_INITIAL_PASSWORD || 'AdminTataDana2026!',
    }),
  })
  assert.equal(loginRes.status, 200, 'Admin login should succeed with 200')
  const loginData = await loginRes.json()
  assert.equal(loginData.success, true)
  const token = loginData.token
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  // 2. Multi-Period Budget API Tests (R4)
  console.log('2. Testing Multi-Period Budgeting API...')
  for (const period of ['daily', 'weekly', 'monthly']) {
    const res = await fetch(`${BASE_URL}/api/budgets?period=${period}`, {
      headers: authHeaders,
    })
    assert.equal(res.status, 200, `GET /api/budgets?period=${period} should return 200`)
    const data = await res.json()
    assert.equal(data.success, true)
    assert.equal(data.period, period)
    assert.ok(Array.isArray(data.data), 'data should be an array')
    assert.ok(data.summary, 'summary should be present')

    // Verify mathematical integrity of each budget item
    for (const item of data.data) {
      assert.equal(item.period, period)
      assert.equal(typeof item.limit_amount, 'number')
      assert.equal(typeof item.spent_amount, 'number')
      assert.equal(typeof item.percentage, 'number')
      assert.ok(['safe', 'warning', 'overbudget'].includes(item.status))

      if (item.limit_amount > 0) {
        const expectedRatio = item.spent_amount / item.limit_amount
        const expectedPct = Number((expectedRatio * 100).toFixed(1))
        assert.equal(item.percentage, expectedPct, 'Percentage calculation must match formula')

        if (expectedRatio >= 1.0 || item.spent_amount >= item.limit_amount) {
          assert.equal(item.status, 'overbudget')
        } else if (expectedRatio >= 0.8) {
          assert.equal(item.status, 'warning')
        } else {
          assert.equal(item.status, 'safe')
        }
      }
    }
  }

  // 3. Test Budget CRUD operations
  console.log('3. Testing Budget CRUD operations (POST & DELETE)...')
  const testCatId = 'cat-test-adversarial'
  const postRes = await fetch(`${BASE_URL}/api/budgets`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      category_id: testCatId,
      period: 'daily',
      amount: 125000,
    }),
  })
  assert.equal(postRes.status, 200)
  const postData = await postRes.json()
  assert.equal(postData.success, true)
  assert.equal(postData.data.limit_amount, 125000)
  assert.equal(postData.data.period, 'daily')

  // Clean up test budget
  const delRes = await fetch(`${BASE_URL}/api/budgets?category_id=${testCatId}&period=daily`, {
    method: 'DELETE',
    headers: authHeaders,
  })
  assert.equal(delRes.status, 200)

  // 4. Test Tata AI Proactive Ambiguity Clarification (R5)
  console.log('4. Testing Tata AI Ambiguity Clarification...')
  const ambiguousRes1 = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      message: 'Tadi bayar 50',
    }),
  })
  assert.equal(ambiguousRes1.status, 200)
  const ambData1 = await ambiguousRes1.json()
  assert.equal(ambData1.provider, 'tata_ai_clarifier')
  assert.ok(ambData1.reply.includes('50.000'), 'Should suggest thousands clarification')

  const ambiguousRes2 = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      message: 'tadi beli bakso',
    }),
  })
  assert.equal(ambiguousRes2.status, 200)
  const ambData2 = await ambiguousRes2.json()
  assert.equal(ambData2.provider, 'tata_ai_clarifier')
  assert.ok(ambData2.reply.includes('mau dicatat berapa nominalnya'), 'Should ask for nominal')

  // 5. Test Tata AI 50/30/20 Financial Advice (R5)
  console.log('5. Testing Tata AI 50/30/20 Advice...')
  const adviceRes = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      message: 'Bagaimana simulasi alokasi 50/30/20 untuk gajiku?',
    }),
  })
  assert.equal(adviceRes.status, 200)
  const adviceData = await adviceRes.json()
  assert.ok(adviceData.reply.includes('50/30/20') || adviceData.reply.includes('Kebutuhan'), 'Must contain 50/30/20 principles')

  // 6. Test GET /api/ai/chat context binding (R5)
  console.log('6. Testing GET /api/ai/chat Live Context...')
  const contextRes = await fetch(`${BASE_URL}/api/ai/chat`, {
    headers: authHeaders,
  })
  assert.equal(contextRes.status, 200)
  const contextData = await contextRes.json()
  assert.equal(contextData.success, true)
  assert.ok(contextData.context.totalBalance !== undefined)
  assert.ok(contextData.context.rule503020 !== undefined)

  // 7. Test Avatar API Multipart Non-File Guard (R6)
  console.log('7. Testing Avatar API Multipart Non-File Guard...')
  // Send multipart/form-data where 'image' is a string primitive, not a file
  const boundary = '----WebKitFormBoundaryAdversarialTest'
  const stringFieldBody = `--${boundary}\r\nContent-Disposition: form-data; name="image"\r\n\r\njust-a-plain-string\r\n--${boundary}--\r\n`

  const avatarStringRes = await fetch(`${BASE_URL}/api/profile/avatar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: stringFieldBody,
  })
  assert.equal(avatarStringRes.status, 400, 'Must return HTTP 400 for string primitive instead of file')
  const avatarStringData = await avatarStringRes.json()
  assert.equal(avatarStringData.success, false)
  assert.equal(avatarStringData.error, 'File gambar tidak valid')

  console.log('🎉 ALL INDEPENDENT ADVERSARIAL STRESS TESTS PASSED CLEANLY!')
}

run().catch((err) => {
  console.error('❌ Adversarial Test Failed:', err)
  process.exit(1)
})
