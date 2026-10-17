// tests/e2e/challenger-avatar-stress.test.mjs
// Adversarial Security & Isolation Stress Harness for Avatar System
// 
// 1. Multi-user isolation: User A attempts to overwrite User B's avatar via x-user-id header and body userId
// 2. Path traversal attack: Probe directory traversal sequences on avatar serving endpoint
// 3. Storage self-cleaning idempotency: Sequential uploads, exactly 1 file on disk, old files cleaned, zero cross-user impact
// 4. Unauthenticated denial: Missing, malformed, expired, forged tokens on POST and DELETE

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { describe, it, expect, isServerOnline, PROJECT_ROOT, registry } from './common.mjs';

function createJwt(payload, secret = 'tatadana-super-secure-production-jwt-key-2026-indonesia') {
  const b64url = (input) => {
    const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
    return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  };
  const header = { alg: 'HS256', typ: 'JWT' };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const sig = b64url(crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest());
  return `${h}.${p}.${sig}`;
}

export async function runChallengerAvatarStressTests() {
  // Binary fixtures
  const validJpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xff, 0xd9,
  ]);

  const validPng = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);

  const validWebp = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    0x56, 0x50, 0x38, 0x20, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x01, 0x00, 0x02, 0x00, 0x34, 0x25,
  ]);

  const avatarDir = path.join(PROJECT_ROOT, 'public', 'uploads', 'avatars');

  describe('Challenger Adversarial Security & Isolation Stress Suite', () => {
    let authContext = null;

    // Helper: Initialize users with approved status
    async function setupUsers() {
      if (authContext) return authContext;

      const ts = Date.now();
      const userAEmail = `adv.stress.a.${ts}@tatadana.id`;
      const userBEmail = `adv.stress.b.${ts}@tatadana.id`;
      const userCEmail = `adv.stress.c.${ts}@tatadana.id`;
      const pass = 'StressPass123!';

      // 1. Register User A
      const rA = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Stress Attacker User A',
          email: userAEmail,
          phone: `0811${Math.floor(10000000 + Math.random() * 90000000)}`,
          password: pass,
          confirmPassword: pass,
        }),
      });
      const dataA = await rA.json();
      const userAId = (dataA.user || dataA.data)?.id;

      // 2. Register User B
      const rB = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Stress Target User B',
          email: userBEmail,
          phone: `0812${Math.floor(10000000 + Math.random() * 90000000)}`,
          password: pass,
          confirmPassword: pass,
        }),
      });
      const dataB = await rB.json();
      const userBId = (dataB.user || dataB.data)?.id;

      // 3. Register User C (for isolated self-cleaning tests)
      const rC = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Stress Lifecycle User C',
          email: userCEmail,
          phone: `0813${Math.floor(10000000 + Math.random() * 90000000)}`,
          password: pass,
          confirmPassword: pass,
        }),
      });
      const dataC = await rC.json();
      const userCId = (dataC.user || dataC.data)?.id;

      // 4. Admin login and approve all 3 users
      const adminLogin = await fetch('http://localhost:3000/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'wildanakmalfathan@gmail.com',
          password: 'AdminTataDana2026!',
        }),
      });
      const adminData = await adminLogin.json();
      const adminToken = adminData.token;

      for (const uId of [userAId, userBId, userCId]) {
        if (uId) {
          await fetch('http://localhost:3000/api/admin/users', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({ userId: uId, action: 'approve' }),
          });
        }
      }

      // 5. Login all 3 users
      const lA = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userAEmail, password: pass }),
      });
      const lAData = await lA.json();

      const lB = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userBEmail, password: pass }),
      });
      const lBData = await lB.json();

      const lC = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userCEmail, password: pass }),
      });
      const lCData = await lC.json();

      authContext = {
        userA: { id: userAId, token: lAData.token, email: userAEmail },
        userB: { id: userBId, token: lBData.token, email: userBEmail },
        userC: { id: userCId, token: lCData.token, email: userCEmail },
        adminToken,
      };

      return authContext;
    }

    // =========================================================================
    // TASK 1: MULTI-USER ISOLATION STRESS TESTING
    // =========================================================================
    let userBInitialAvatarUrl = '';
    let userBInitialDiskFile = '';

    it('Multi-User Isolation 1.1: Sets up genuine target avatar for User B', async () => {
      const auth = await setupUsers();

      // User B uploads genuine avatar
      const form = new FormData();
      form.append('image', new Blob([validJpeg], { type: 'image/jpeg' }), 'user-b-original.jpg');

      const res = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.userB.token}` },
        body: form,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.avatar_type).toBe('uploaded');
      userBInitialAvatarUrl = data.data.avatar_url;

      userBInitialDiskFile = path.join(PROJECT_ROOT, 'public', userBInitialAvatarUrl.replace(/^\//, ''));
      expect(fs.existsSync(userBInitialDiskFile)).toBe(true);
    });

    it('Multi-User Isolation 1.2: User A attempts avatar upload spoofing x-user-id header with User B ID', async () => {
      const auth = await setupUsers();

      const form = new FormData();
      form.append('image', new Blob([validPng], { type: 'image/png' }), 'attack-x-user-id.png');

      const res = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.userA.token}`,
          'x-user-id': auth.userB.id,
        },
        body: form,
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      // Response must bind strictly to User A
      expect(json.data.id).toBe(auth.userA.id);

      // Verify User B profile is completely untouched
      const resB = await fetch('http://localhost:3000/api/profile', {
        headers: { Authorization: `Bearer ${auth.userB.token}` },
      });
      const dataB = await resB.json();
      expect(dataB.data.avatar_url).toBe(userBInitialAvatarUrl);
      expect(dataB.data.avatar_type).toBe('uploaded');
      expect(fs.existsSync(userBInitialDiskFile)).toBe(true);
    });

    it('Multi-User Isolation 1.3: User A attempts avatar upload injecting userId in multipart form body', async () => {
      const auth = await setupUsers();

      const form = new FormData();
      form.append('image', new Blob([validWebp], { type: 'image/webp' }), 'attack-body-userid.webp');
      form.append('userId', auth.userB.id);

      const res = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.userA.token}`,
        },
        body: form,
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(auth.userA.id);

      // Verify User B profile remains intact
      const resB = await fetch('http://localhost:3000/api/profile', {
        headers: { Authorization: `Bearer ${auth.userB.token}` },
      });
      const dataB = await resB.json();
      expect(dataB.data.avatar_url).toBe(userBInitialAvatarUrl);
      expect(fs.existsSync(userBInitialDiskFile)).toBe(true);
    });

    it('Multi-User Isolation 1.4: User A attempts DELETE with x-user-id and body targeting User B', async () => {
      const auth = await setupUsers();

      const res = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${auth.userA.token}`,
          'x-user-id': auth.userB.id,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: auth.userB.id }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(auth.userA.id);

      // Verify User B profile was NOT reset and physical file STILL exists
      const resB = await fetch('http://localhost:3000/api/profile', {
        headers: { Authorization: `Bearer ${auth.userB.token}` },
      });
      const dataB = await resB.json();
      expect(dataB.data.avatar_url).toBe(userBInitialAvatarUrl);
      expect(dataB.data.avatar_type).toBe('uploaded');
      expect(fs.existsSync(userBInitialDiskFile)).toBe(true);
    });

    // =========================================================================
    // TASK 2: PATH TRAVERSAL ATTACK VECTORS
    // =========================================================================
    it('Path Traversal 2.1: Probing /uploads/avatars/..%2F..%2Fpackage.json returns HTTP 404 with zero file leakage', async () => {
      const res = await fetch('http://localhost:3000/uploads/avatars/..%2F..%2Fpackage.json');
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text.includes('dependencies')).toBe(false);
      expect(text.includes('devDependencies')).toBe(false);
      expect(text).toBe('File avatar tidak ditemukan');
    });

    it('Path Traversal 2.2: Probing /uploads/avatars/..%2F..%2Fdata%2Ftatadana-db.json returns HTTP 404', async () => {
      const res = await fetch('http://localhost:3000/uploads/avatars/..%2F..%2Fdata%2Ftatadana-db.json');
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text.includes('wildanakmalfathan')).toBe(false);
      expect(text.includes('"users"')).toBe(false);
      expect(text).toBe('File avatar tidak ditemukan');
    });

    it('Path Traversal 2.3: Probing /uploads/avatars/..%2F..%2F.env.local returns HTTP 404', async () => {
      const res = await fetch('http://localhost:3000/uploads/avatars/..%2F..%2F.env.local');
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text.includes('SESSION_SECRET')).toBe(false);
      expect(text.includes('TELEGRAM_BOT_TOKEN')).toBe(false);
      expect(text).toBe('File avatar tidak ditemukan');
    });

    it('Path Traversal 2.4: Windows backslash traversal sequences (..%5C..%5Cpackage.json) return HTTP 404', async () => {
      const res1 = await fetch('http://localhost:3000/uploads/avatars/..%5C..%5Cpackage.json');
      expect(res1.status).toBe(404);
      const text1 = await res1.text();
      expect(text1.includes('"name": "tatadana"')).toBe(false);
      expect(text1).toBe('File avatar tidak ditemukan');

      const res2 = await fetch('http://localhost:3000/uploads/avatars/..%5c..%5cpackage.json');
      expect(res2.status).toBe(404);
      const text2 = await res2.text();
      expect(text2.includes('"name": "tatadana"')).toBe(false);
      expect(text2).toBe('File avatar tidak ditemukan');
    });

    it('Path Traversal 2.5: Double URL-encoded and dot-encoded sequences return HTTP 404', async () => {
      const doubleEncoded = await fetch('http://localhost:3000/uploads/avatars/..%252F..%252Fpackage.json');
      expect(doubleEncoded.status).toBe(404);

      const dotEncoded = await fetch('http://localhost:3000/uploads/avatars/%2e%2e%2f%2e%2e%2fpackage.json');
      expect(dotEncoded.status).toBe(404);
    });

    it('Path Traversal 2.6: Null byte injection (%00package.json) returns HTTP 404', async () => {
      const nullByteRes = await fetch('http://localhost:3000/uploads/avatars/%00package.json');
      expect(nullByteRes.status).toBe(404);
    });

    it('Path Traversal 2.7: HEAD requests against directory traversal return HTTP 404 without headers leak', async () => {
      const headRes = await fetch('http://localhost:3000/uploads/avatars/..%2F..%2Fpackage.json', {
        method: 'HEAD',
      });
      expect(headRes.status).toBe(404);
    });

    // =========================================================================
    // TASK 3: STORAGE SELF-CLEANING IDEMPOTENCY
    // =========================================================================
    it('Storage Self-Cleaning 3.1: Sequential uploads maintain strictly 1 avatar file on disk per user', async () => {
      const auth = await setupUsers();
      const userCId = auth.userC.id;
      const uploadedFiles = [];

      // Round 1: Upload JPG
      const form1 = new FormData();
      form1.append('image', new Blob([validJpeg], { type: 'image/jpeg' }), 'seq1.jpg');
      const r1 = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.userC.token}` },
        body: form1,
      });
      expect(r1.status).toBe(200);
      const d1 = await r1.json();
      const file1 = path.basename(d1.data.avatar_url);
      uploadedFiles.push(file1);

      let diskFiles = fs.readdirSync(avatarDir).filter((f) => f.startsWith(`avatar-${userCId}-`));
      expect(diskFiles.length).toBe(1);
      expect(diskFiles[0]).toBe(file1);

      // Round 2: Upload PNG
      const form2 = new FormData();
      form2.append('image', new Blob([validPng], { type: 'image/png' }), 'seq2.png');
      const r2 = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.userC.token}` },
        body: form2,
      });
      expect(r2.status).toBe(200);
      const d2 = await r2.json();
      const file2 = path.basename(d2.data.avatar_url);
      uploadedFiles.push(file2);

      diskFiles = fs.readdirSync(avatarDir).filter((f) => f.startsWith(`avatar-${userCId}-`));
      expect(diskFiles.length).toBe(1);
      expect(diskFiles[0]).toBe(file2);
      expect(fs.existsSync(path.join(avatarDir, file1))).toBe(false); // file1 cleaned up!

      // Round 3: Upload WebP
      const form3 = new FormData();
      form3.append('image', new Blob([validWebp], { type: 'image/webp' }), 'seq3.webp');
      const r3 = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.userC.token}` },
        body: form3,
      });
      expect(r3.status).toBe(200);
      const d3 = await r3.json();
      const file3 = path.basename(d3.data.avatar_url);
      uploadedFiles.push(file3);

      diskFiles = fs.readdirSync(avatarDir).filter((f) => f.startsWith(`avatar-${userCId}-`));
      expect(diskFiles.length).toBe(1);
      expect(diskFiles[0]).toBe(file3);
      expect(fs.existsSync(path.join(avatarDir, file2))).toBe(false); // file2 cleaned up!

      // Round 4: Upload JPG again
      const form4 = new FormData();
      form4.append('image', new Blob([validJpeg], { type: 'image/jpeg' }), 'seq4.jpg');
      const r4 = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.userC.token}` },
        body: form4,
      });
      expect(r4.status).toBe(200);
      const d4 = await r4.json();
      const file4 = path.basename(d4.data.avatar_url);
      uploadedFiles.push(file4);

      diskFiles = fs.readdirSync(avatarDir).filter((f) => f.startsWith(`avatar-${userCId}-`));
      expect(diskFiles.length).toBe(1);
      expect(diskFiles[0]).toBe(file4);
      expect(fs.existsSync(path.join(avatarDir, file3))).toBe(false); // file3 cleaned up!

      // Round 5: Upload PNG again
      const form5 = new FormData();
      form5.append('image', new Blob([validPng], { type: 'image/png' }), 'seq5.png');
      const r5 = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.userC.token}` },
        body: form5,
      });
      expect(r5.status).toBe(200);
      const d5 = await r5.json();
      const file5 = path.basename(d5.data.avatar_url);
      uploadedFiles.push(file5);

      diskFiles = fs.readdirSync(avatarDir).filter((f) => f.startsWith(`avatar-${userCId}-`));
      expect(diskFiles.length).toBe(1);
      expect(diskFiles[0]).toBe(file5);
      expect(fs.existsSync(path.join(avatarDir, file4))).toBe(false); // file4 cleaned up!

      // Verify User B's avatar file is still completely safe on disk
      expect(fs.existsSync(userBInitialDiskFile)).toBe(true);
    });

    it('Storage Self-Cleaning 3.2: DELETE purges avatar from disk and subsequent DELETE is idempotent', async () => {
      const auth = await setupUsers();
      const userCId = auth.userC.id;

      // First DELETE: purges file
      const del1 = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${auth.userC.token}` },
      });
      expect(del1.status).toBe(200);
      const d1 = await del1.json();
      expect(d1.success).toBe(true);
      expect(d1.data.avatar_type).toBe('emoji');

      let diskFiles = fs.readdirSync(avatarDir).filter((f) => f.startsWith(`avatar-${userCId}-`));
      expect(diskFiles.length).toBe(0);

      // Second DELETE: idempotent, returns 200, no crashes
      const del2 = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${auth.userC.token}` },
      });
      expect(del2.status).toBe(200);
      const d2 = await del2.json();
      expect(d2.success).toBe(true);
      expect(d2.data.avatar_type).toBe('emoji');

      diskFiles = fs.readdirSync(avatarDir).filter((f) => f.startsWith(`avatar-${userCId}-`));
      expect(diskFiles.length).toBe(0);

      // User B's file still untouched
      expect(fs.existsSync(userBInitialDiskFile)).toBe(true);
    });

    // =========================================================================
    // TASK 4: UNAUTHENTICATED DENIAL
    // =========================================================================
    it('Unauthenticated Denial 4.1: POST and DELETE without session token return HTTP 401', async () => {
      const form = new FormData();
      form.append('image', new Blob([validJpeg], { type: 'image/jpeg' }), 'no-auth.jpg');

      const postRes = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'POST',
        body: form,
      });
      expect(postRes.status).toBe(401);
      const postJson = await postRes.json();
      expect(postJson.success).toBe(false);

      const delRes = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'DELETE',
      });
      expect(delRes.status).toBe(401);
      const delJson = await delRes.json();
      expect(delJson.success).toBe(false);
    });

    it('Unauthenticated Denial 4.2: POST and DELETE with empty Authorization header return HTTP 401', async () => {
      const form = new FormData();
      form.append('image', new Blob([validJpeg], { type: 'image/jpeg' }), 'empty-auth.jpg');

      const postRes = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: '' },
        body: form,
      });
      expect(postRes.status).toBe(401);

      const delRes = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'DELETE',
        headers: { Authorization: '' },
      });
      expect(delRes.status).toBe(401);
    });

    it('Unauthenticated Denial 4.3: POST and DELETE with malformed non-JWT token return HTTP 401', async () => {
      const malformedTokens = [
        'not_a_valid_token',
        'Bearer abc.123',
        'Bearer invalid-token-without-three-segments',
        'Basic dXNlcjpwYXNz',
      ];

      for (const badToken of malformedTokens) {
        const form = new FormData();
        form.append('image', new Blob([validJpeg], { type: 'image/jpeg' }), 'malformed.jpg');

        const postRes = await fetch('http://localhost:3000/api/profile/avatar', {
          method: 'POST',
          headers: { Authorization: badToken.startsWith('Bearer ') || badToken.startsWith('Basic ') ? badToken : `Bearer ${badToken}` },
          body: form,
        });
        expect(postRes.status).toBe(401);

        const delRes = await fetch('http://localhost:3000/api/profile/avatar', {
          method: 'DELETE',
          headers: { Authorization: badToken.startsWith('Bearer ') || badToken.startsWith('Basic ') ? badToken : `Bearer ${badToken}` },
        });
        expect(delRes.status).toBe(401);
      }
    });

    it('Unauthenticated Denial 4.4: POST and DELETE with cryptographically forged signature return HTTP 401', async () => {
      const auth = await setupUsers();
      // Tamper signature of User A's token
      const validToken = auth.userA.token;
      const parts = validToken.split('.');
      expect(parts.length).toBe(3);
      const forgedToken = `${parts[0]}.${parts[1]}.ForgedSignatureXYZ999111222`;

      const form = new FormData();
      form.append('image', new Blob([validJpeg], { type: 'image/jpeg' }), 'forged.jpg');

      const postRes = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${forgedToken}` },
        body: form,
      });
      expect(postRes.status).toBe(401);

      const delRes = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${forgedToken}` },
      });
      expect(delRes.status).toBe(401);
    });

    it('Unauthenticated Denial 4.5: POST and DELETE with expired session token return HTTP 401', async () => {
      const auth = await setupUsers();
      const now = Math.floor(Date.now() / 1000);
      // Generate token expired 2 hours ago
      const expiredToken = createJwt({
        userId: auth.userA.id,
        email: auth.userA.email,
        name: 'Expired User',
        role: 'user',
        plan: 'starter',
        iat: now - 10000,
        exp: now - 7200,
      });

      const form = new FormData();
      form.append('image', new Blob([validJpeg], { type: 'image/jpeg' }), 'expired.jpg');

      const postRes = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${expiredToken}` },
        body: form,
      });
      expect(postRes.status).toBe(401);

      const delRes = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      expect(delRes.status).toBe(401);
    });

    it('Unauthenticated Denial 4.6: POST and DELETE with bogus session cookie return HTTP 401', async () => {
      const form = new FormData();
      form.append('image', new Blob([validJpeg], { type: 'image/jpeg' }), 'cookie-bogus.jpg');

      const postRes = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'POST',
        headers: { Cookie: 'tatadana_session=invalid.bogus.cookie' },
        body: form,
      });
      expect(postRes.status).toBe(401);

      const delRes = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'DELETE',
        headers: { Cookie: 'tatadana_session=invalid.bogus.cookie' },
      });
      expect(delRes.status).toBe(401);
    });

    // =========================================================================
    // ADVANCED ADVERSARIAL STRESS CHALLENGES
    // =========================================================================
    it('Multi-User Isolation 1.5: User A attempts query string injection (?userId=userBId) on upload and delete', async () => {
      const auth = await setupUsers();

      // Upload attempt
      const form = new FormData();
      form.append('image', new Blob([validJpeg], { type: 'image/jpeg' }), 'query-attack.jpg');

      const postRes = await fetch(`http://localhost:3000/api/profile/avatar?userId=${auth.userB.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.userA.token}` },
        body: form,
      });
      expect(postRes.status).toBe(200);
      const postData = await postRes.json();
      expect(postData.data.id).toBe(auth.userA.id);

      // Delete attempt
      const delRes = await fetch(`http://localhost:3000/api/profile/avatar?userId=${auth.userB.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${auth.userA.token}` },
      });
      expect(delRes.status).toBe(200);
      const delData = await delRes.json();
      expect(delData.data.id).toBe(auth.userA.id);

      // Verify User B is completely untouched
      const resB = await fetch('http://localhost:3000/api/profile', {
        headers: { Authorization: `Bearer ${auth.userB.token}` },
      });
      const dataB = await resB.json();
      expect(dataB.data.avatar_url).toBe(userBInitialAvatarUrl);
      expect(fs.existsSync(userBInitialDiskFile)).toBe(true);
    });

    it('Path Traversal 2.8: Windows absolute drive paths (C:%5CWindows%5Cwin.ini) return HTTP 404', async () => {
      const res = await fetch('http://localhost:3000/uploads/avatars/C:%5CWindows%5Cwin.ini');
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toBe('File avatar tidak ditemukan');
    });

    it('Path Traversal 2.9: Nested dot segments (....//....//package.json) return HTTP 404', async () => {
      const res = await fetch('http://localhost:3000/uploads/avatars/....//....//package.json');
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text.includes('"dependencies"')).toBe(false);
      expect(text.includes('devDependencies')).toBe(false);
    });

    it('Path Traversal 2.10: Mixed encoded slashes and backslashes (%2e%2e%2f%2e%2e%5cpackage.json) return HTTP 404', async () => {
      const res = await fetch('http://localhost:3000/uploads/avatars/%2e%2e%2f%2e%2e%5cpackage.json');
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toBe('File avatar tidak ditemukan');
    });

    it('Storage Self-Cleaning 3.3: High-frequency sequential upload burst (10 iterations) cleans all intermediate files', async () => {
      const auth = await setupUsers();
      const userCId = auth.userC.id;

      const formats = ['jpg', 'png', 'webp'];
      const buffers = [validJpeg, validPng, validWebp];

      let lastUploadedFilename = '';

      for (let i = 0; i < 10; i++) {
        const fmt = formats[i % 3];
        const buf = buffers[i % 3];
        const mime = fmt === 'jpg' ? 'image/jpeg' : fmt === 'png' ? 'image/png' : 'image/webp';

        const form = new FormData();
        form.append('image', new Blob([buf], { type: mime }), `burst-${i}.${fmt}`);

        const res = await fetch('http://localhost:3000/api/profile/avatar', {
          method: 'POST',
          headers: { Authorization: `Bearer ${auth.userC.token}` },
          body: form,
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        lastUploadedFilename = path.basename(data.data.avatar_url);
      }

      // Check avatar directory: exactly 1 file must remain for User C
      const diskFiles = fs.readdirSync(avatarDir).filter((f) => f.startsWith(`avatar-${userCId}-`));
      expect(diskFiles.length).toBe(1);
      expect(diskFiles[0]).toBe(lastUploadedFilename);

      // Clean up User C
      await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${auth.userC.token}` },
      });
      const remainingFiles = fs.readdirSync(avatarDir).filter((f) => f.startsWith(`avatar-${userCId}-`));
      expect(remainingFiles.length).toBe(0);

      // User B avatar still untouched
      expect(fs.existsSync(userBInitialDiskFile)).toBe(true);
    });

    it('Unauthenticated Denial 4.7: JWT "alg: none" attack returns HTTP 401', async () => {
      const auth = await setupUsers();
      const b64url = (s) => Buffer.from(s).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const header = b64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
      const payload = b64url(JSON.stringify({
        userId: auth.userA.id,
        email: auth.userA.email,
        name: 'Attacker None',
        role: 'user',
        plan: 'starter',
      }));
      const noneToken = `${header}.${payload}.`;

      const form = new FormData();
      form.append('image', new Blob([validJpeg], { type: 'image/jpeg' }), 'none-alg.jpg');

      const postRes = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${noneToken}` },
        body: form,
      });
      expect(postRes.status).toBe(401);

      const delRes = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${noneToken}` },
      });
      expect(delRes.status).toBe(401);
    });

    it('Unauthenticated Denial 4.8: JWT signed with empty secret returns HTTP 401', async () => {
      const auth = await setupUsers();
      const emptySecretToken = createJwt(
        {
          userId: auth.userA.id,
          email: auth.userA.email,
          name: 'Empty Secret',
          role: 'user',
          plan: 'starter',
        },
        '' // Empty secret
      );

      const form = new FormData();
      form.append('image', new Blob([validJpeg], { type: 'image/jpeg' }), 'empty-secret.jpg');

      const postRes = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${emptySecretToken}` },
        body: form,
      });
      expect(postRes.status).toBe(401);

      const delRes = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${emptySecretToken}` },
      });
      expect(delRes.status).toBe(401);
    });

    it('Unauthenticated Denial 4.9: POST and DELETE with "Bearer undefined" and "Bearer null" return HTTP 401', async () => {
      for (const literal of ['Bearer undefined', 'Bearer null', 'Bearer [object Object]']) {
        const form = new FormData();
        form.append('image', new Blob([validJpeg], { type: 'image/jpeg' }), 'literal.jpg');

        const postRes = await fetch('http://localhost:3000/api/profile/avatar', {
          method: 'POST',
          headers: { Authorization: literal },
          body: form,
        });
        expect(postRes.status).toBe(401);

        const delRes = await fetch('http://localhost:3000/api/profile/avatar', {
          method: 'DELETE',
          headers: { Authorization: literal },
        });
        expect(delRes.status).toBe(401);
      }
    });
  });
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('challenger-avatar-stress.test.mjs')) {
  (async () => {
    await runChallengerAvatarStressTests();
    const result = await registry.runAll();
    console.log(`\nResults: ${result.totalPassed}/${result.totalTests} passed (${result.totalFailed} failed) in ${result.totalDuration}ms`);
    process.exit(result.success ? 0 : 1);
  })();
}
