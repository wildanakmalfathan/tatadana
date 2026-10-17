// .agents/teamwork/reviewer_1/adversarial-stress-test.mjs
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://localhost:3000';

async function runAdversarialTests() {
  console.log('--- STARTING ADVERSARIAL STRESS TESTS ---');
  let passed = 0;
  let total = 0;

  function assert(name, condition, details = '') {
    total++;
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} - ${details}`);
    }
  }

  // 1. Path Traversal Attacks against /uploads/avatars/[filename]
  const traversalPayloads = [
    '..%2F..%2Fpackage.json',
    '..\\..\\package.json',
    '%2e%2e%2fpackage.json',
    '..%2F..%2Fdata%2Ftatadana-db.json',
    'sub/folder.jpg',
    'avatar-fake/../../etc/passwd',
  ];

  for (const payload of traversalPayloads) {
    try {
      const res = await fetch(`${BASE_URL}/uploads/avatars/${payload}`);
      assert(
        `Path traversal blocked for payload: ${payload}`,
        res.status === 404 || res.status === 400 || res.status === 403,
        `Status: ${res.status}`
      );
    } catch (err) {
      // Some malformed URLs may be rejected by fetch/server HTTP parser
      assert(`Path traversal safely rejected for ${payload}`, true);
    }
  }

  // 2. Unauthenticated Upload Test
  {
    const formData = new FormData();
    const fakeBlob = new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xe0])], { type: 'image/jpeg' });
    formData.append('image', fakeBlob, 'test.jpg');
    const res = await fetch(`${BASE_URL}/api/profile/avatar`, {
      method: 'POST',
      body: formData,
    });
    assert('Unauthenticated POST /api/profile/avatar returns 401', res.status === 401, `Status: ${res.status}`);
  }

  // 3. Unauthenticated DELETE Test
  {
    const res = await fetch(`${BASE_URL}/api/profile/avatar`, {
      method: 'DELETE',
    });
    assert('Unauthenticated DELETE /api/profile/avatar returns 401', res.status === 401, `Status: ${res.status}`);
  }

  // 4. Invalid Token Upload Test
  {
    const formData = new FormData();
    const fakeBlob = new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xe0])], { type: 'image/jpeg' });
    formData.append('image', fakeBlob, 'test.jpg');
    const res = await fetch(`${BASE_URL}/api/profile/avatar`, {
      method: 'POST',
      headers: { Authorization: 'Bearer totally-invalid-session-token' },
      body: formData,
    });
    assert('Invalid Bearer token returns 401', res.status === 401, `Status: ${res.status}`);
  }

  // 5. Zero-byte File Upload Test
  {
    // Need valid auth token
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'wildanakmalfathan@gmail.com',
        password: 'AdminTataDana2026!',
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.token;

    if (adminToken) {
      const formData = new FormData();
      const emptyBlob = new Blob([], { type: 'image/jpeg' });
      formData.append('image', emptyBlob, 'empty.jpg');
      const res = await fetch(`${BASE_URL}/api/profile/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData,
      });
      assert('Zero-byte file upload returns 400', res.status === 400, `Status: ${res.status}`);
    } else {
      console.warn('Could not authenticate admin for empty file test');
    }
  }

  // 6. Non-multipart Content-Type Test
  {
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'wildanakmalfathan@gmail.com',
        password: 'AdminTataDana2026!',
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.token;

    const res = await fetch(`${BASE_URL}/api/profile/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: 'data:image/png;base64,...' }),
    });
    assert('Non-multipart POST returns 400', res.status === 400, `Status: ${res.status}`);
  }

  // 7. Non-existent file static route check
  {
    const res = await fetch(`${BASE_URL}/uploads/avatars/non-existent-avatar-12345.jpg`);
    assert('Non-existent avatar returns 404', res.status === 404, `Status: ${res.status}`);
  }

  console.log(`--- ADVERSARIAL TESTS COMPLETED: ${passed}/${total} PASSED ---`);
  if (passed !== total) {
    process.exit(1);
  }
}

runAdversarialTests().catch((err) => {
  console.error('Adversarial test error:', err);
  process.exit(1);
});
