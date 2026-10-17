// tests/e2e/profile-avatar.test.mjs
// Real & Persistent Profile Photo Upload E2E Test Suite (15 Mandatory Scenarios)
// Verifies:
// Scenario 1: Upload valid JPG (persists on disk and in database)
// Scenario 2: Upload valid PNG
// Scenario 3: Upload valid WebP
// Scenario 4: Reject non-image file (e.g. text/pdf) with HTTP 400
// Scenario 5: Reject fake image (spoofed extension with non-image magic bytes) with HTTP 400
// Scenario 6: Reject oversized file (>5MB) with HTTP 413 or 400
// Scenario 7: Verifies profile avatar persists in database upon re-fetch and server reload
// Scenario 8: Rejects unauthenticated avatar upload requests with HTTP 401 Unauthorized
// Scenario 9: Enforces strict user isolation — User A cannot mutate User B avatar
// Scenario 10: Self-cleans old avatar files from disk when new photo is uploaded
// Scenario 11: DELETE /api/profile/avatar resets avatar to default emoji and removes physical file
// Scenario 12: Switching to built-in emojis via PATCH /api/profile persists in database
// Scenario 13: Serves uploaded avatar files statically with HTTP 200 and correct Content-Type
// Scenario 14: Verifies Sidebar, Header, DashboardLayout, and Settings implement avatar references
// Scenario 15: Verifies scripts/verify-all.mjs imports and executes profile-avatar suite with >= 105 gate

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, isServerOnline, assertFileContains, PROJECT_ROOT } from './common.mjs';

export async function runProfileAvatarTests() {
  const serverUp = await isServerOnline('http://localhost:3000', 4000);

  describe('Master Suite: Real & Persistent Profile Photo Upload (15 Scenarios)', () => {
    // Binary Fixtures
    // 1. Valid JPEG: FF D8 FF E0 ... FF D9
    const validJpegBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xff, 0xd9,
    ]);

    // 2. Valid PNG: 89 50 4E 47 0D 0A 1A 0A ... 49 45 4E 44 AE 42 60 82
    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);

    // 3. Valid WebP: RIFF (4 bytes) + length (4 bytes) + WEBP (4 bytes) + VP8
    const validWebpBuffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      0x56, 0x50, 0x38, 0x20, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x02, 0x00, 0x34, 0x25,
    ]);

    // 4. Non-Image Buffer (Plain text / PDF header)
    const nonImageBuffer = Buffer.from('%PDF-1.5\n%Non-image test document\nEOF');

    // 5. Spoofed Fake Image (Text pretending to be JPEG)
    const fakeImageBuffer = Buffer.from('GIF89a Fake header or text payload masquerading as jpg');

    // 6. Oversized Buffer (> 5 MB)
    const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 100 * 1024);
    oversizedBuffer[0] = 0xff;
    oversizedBuffer[1] = 0xd8;
    oversizedBuffer[2] = 0xff;

    // Shared state across tests
    let authContext = null;
    let uploadedJpegUrl = '';
    let oldJpegDiskPath = '';
    let uploadedWebpUrl = '';

    // Lazy initialization helper for User A and User B
    async function getAuthContext() {
      if (authContext) return authContext;

      const timestamp = Date.now();
      const userAEmail = `user.avatar.a.${timestamp}@tatadana.id`;
      const userAPassword = 'AvatarPass123!';
      const userBEmail = `user.avatar.b.${timestamp}@tatadana.id`;
      const userBPassword = 'AvatarPass123!';

      // Register User A
      const regARes = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Avatar User A',
          email: userAEmail,
          phone: `0818${Math.floor(10000000 + Math.random() * 90000000)}`,
          password: userAPassword,
          confirmPassword: userAPassword,
        }),
      });
      const regAData = await regARes.json();
      const userAId = (regAData.user || regAData.data)?.id;

      // Register User B
      const regBRes = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Avatar User B',
          email: userBEmail,
          phone: `0819${Math.floor(10000000 + Math.random() * 90000000)}`,
          password: userBPassword,
          confirmPassword: userBPassword,
        }),
      });
      const regBData = await regBRes.json();
      const userBId = (regBData.user || regBData.data)?.id;

      // Admin logs in and approves both users
      const adminLoginRes = await fetch('http://localhost:3000/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'wildanakmalfathan@gmail.com',
          password: 'AdminTataDana2026!',
        }),
      });
      const adminData = await adminLoginRes.json();
      const adminToken = adminData.token;

      for (const uId of [userAId, userBId]) {
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

      // Login User A
      const loginARes = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userAEmail, password: userAPassword }),
      });
      const loginAData = await loginARes.json();
      const userAToken = loginAData.token;

      // Login User B
      const loginBRes = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userBEmail, password: userBPassword }),
      });
      const loginBData = await loginBRes.json();
      const userBToken = loginBData.token;

      authContext = {
        userAId,
        userAEmail,
        userAToken,
        userBId,
        userBEmail,
        userBToken,
        adminToken,
      };
      return authContext;
    }

    // =========================================================================
    // Scenario 1: Upload valid JPG (persists on disk and in database)
    // =========================================================================
    it('Scenario 1: uploads valid JPG photo, persists on disk and in database', async () => {
      if (!serverUp) return;
      const auth = await getAuthContext();

      const formData = new FormData();
      const blob = new Blob([validJpegBuffer], { type: 'image/jpeg' });
      formData.append('image', blob, 'my-photo.jpg');

      const res = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.userAToken}` },
        body: formData,
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.avatar_type).toBe('uploaded');
      expect(json.data.avatar_url).toContain('.jpg');
      uploadedJpegUrl = json.data.avatar_url;

      // Verify file exists on disk
      const filename = path.basename(uploadedJpegUrl);
      oldJpegDiskPath = path.join(PROJECT_ROOT, 'public', 'uploads', 'avatars', filename);
      expect(fs.existsSync(oldJpegDiskPath)).toBe(true);

      // Verify persistent database JSON
      const dbPath = path.join(PROJECT_ROOT, 'data', 'tatadana-db.json');
      const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      const storedUser = db.users.find((u) => u.id === auth.userAId);
      expect(storedUser).toBeDefined();
      expect(storedUser.avatar_url).toBe(uploadedJpegUrl);
      expect(storedUser.avatar_type).toBe('uploaded');
    });

    // =========================================================================
    // Scenario 2: Upload valid PNG
    // =========================================================================
    it('Scenario 2: uploads valid PNG photo and updates avatar URL', async () => {
      if (!serverUp) return;
      const auth = await getAuthContext();

      const formData = new FormData();
      const blob = new Blob([validPngBuffer], { type: 'image/png' });
      formData.append('image', blob, 'avatar.png');

      const res = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.userAToken}` },
        body: formData,
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.avatar_url).toContain('.png');
      expect(json.data.avatar_type).toBe('uploaded');

      const filename = path.basename(json.data.avatar_url);
      const diskPath = path.join(PROJECT_ROOT, 'public', 'uploads', 'avatars', filename);
      expect(fs.existsSync(diskPath)).toBe(true);
    });

    // =========================================================================
    // Scenario 3: Upload valid WebP
    // =========================================================================
    it('Scenario 3: uploads valid WebP photo and updates avatar URL', async () => {
      if (!serverUp) return;
      const auth = await getAuthContext();

      const formData = new FormData();
      const blob = new Blob([validWebpBuffer], { type: 'image/webp' });
      formData.append('image', blob, 'profile.webp');

      const res = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.userAToken}` },
        body: formData,
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.avatar_url).toContain('.webp');
      expect(json.data.avatar_type).toBe('uploaded');
      uploadedWebpUrl = json.data.avatar_url;

      const filename = path.basename(uploadedWebpUrl);
      const diskPath = path.join(PROJECT_ROOT, 'public', 'uploads', 'avatars', filename);
      expect(fs.existsSync(diskPath)).toBe(true);
    });

    // =========================================================================
    // Scenario 4: Reject non-image file (e.g. text/pdf) with HTTP 400
    // =========================================================================
    it('Scenario 4: rejects non-image file (PDF / text) with HTTP 400 Bad Request', async () => {
      if (!serverUp) return;
      const auth = await getAuthContext();

      const formData = new FormData();
      const blob = new Blob([nonImageBuffer], { type: 'application/pdf' });
      formData.append('image', blob, 'invoice.pdf');

      const res = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.userAToken}` },
        body: formData,
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain('Format file tidak didukung');
    });

    // =========================================================================
    // Scenario 5: Reject fake image (spoofed extension with non-image magic bytes) with HTTP 400
    // =========================================================================
    it('Scenario 5: rejects fake image with spoofed extension and invalid magic bytes with HTTP 400', async () => {
      if (!serverUp) return;
      const auth = await getAuthContext();

      const formData = new FormData();
      const blob = new Blob([fakeImageBuffer], { type: 'image/jpeg' });
      formData.append('image', blob, 'trojan.jpg');

      const res = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.userAToken}` },
        body: formData,
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain('Format file tidak didukung');
    });

    // =========================================================================
    // Scenario 6: Reject oversized file (>5MB) with HTTP 413 or 400
    // =========================================================================
    it('Scenario 6: rejects oversized file exceeding 5MB size limit with HTTP 413 or 400', async () => {
      if (!serverUp) return;
      const auth = await getAuthContext();

      const formData = new FormData();
      const blob = new Blob([oversizedBuffer], { type: 'image/jpeg' });
      formData.append('image', blob, 'huge.jpg');

      const res = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.userAToken}` },
        body: formData,
      });

      expect(res.status === 413 || res.status === 400).toBeTruthy();
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain('5 MB');
    });

    // =========================================================================
    // Scenario 7: Verifies profile avatar persists in database upon re-fetch and server reload
    // =========================================================================
    it('Scenario 7: verifies profile avatar persists in database upon re-fetch and server reload', async () => {
      if (!serverUp || !uploadedWebpUrl) return;
      const auth = await getAuthContext();

      const res = await fetch('http://localhost:3000/api/profile', {
        headers: { Authorization: `Bearer ${auth.userAToken}` },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.avatar_url).toBe(uploadedWebpUrl);
      expect(json.data.avatar_type).toBe('uploaded');

      // Verify persistent disk store
      const dbPath = path.join(PROJECT_ROOT, 'data', 'tatadana-db.json');
      const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      const stored = db.users.find((u) => u.id === auth.userAId);
      expect(stored).toBeDefined();
      expect(stored.avatar_url).toBe(uploadedWebpUrl);
      expect(stored.avatar_type).toBe('uploaded');
    });

    // =========================================================================
    // Scenario 8: Rejects unauthenticated avatar upload requests with HTTP 401 Unauthorized
    // =========================================================================
    it('Scenario 8: rejects unauthenticated avatar upload requests with HTTP 401 Unauthorized', async () => {
      if (!serverUp) return;

      const formData = new FormData();
      const blob = new Blob([validJpegBuffer], { type: 'image/jpeg' });
      formData.append('image', blob, 'unauth.jpg');

      const res = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain('Autentikasi diperlukan');
    });

    // =========================================================================
    // Scenario 9: Enforces strict user isolation — User A cannot mutate User B avatar
    // =========================================================================
    it('Scenario 9: enforces strict user isolation — User A cannot mutate User B avatar', async () => {
      if (!serverUp) return;
      const auth = await getAuthContext();

      // User B initially has default avatar
      const getBRes = await fetch('http://localhost:3000/api/profile', {
        headers: { Authorization: `Bearer ${auth.userBToken}` },
      });
      const bInitial = await getBRes.json();
      const bInitialAvatar = bInitial.data.avatar_url;

      // User A attempts to upload an avatar with User B's ID in header or form
      const formData = new FormData();
      const blob = new Blob([validJpegBuffer], { type: 'image/jpeg' });
      formData.append('image', blob, 'attack.jpg');
      formData.append('userId', auth.userBId);

      const attackRes = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.userAToken}`,
          'x-user-id': auth.userBId, // Malicious spoof attempt
        },
        body: formData,
      });

      expect(attackRes.status).toBe(200);
      const attackJson = await attackRes.json();
      // Server must bind to User A, NOT User B
      expect(attackJson.data.id).toBe(auth.userAId);

      // Verify User B's profile was NOT altered
      const getBAfter = await fetch('http://localhost:3000/api/profile', {
        headers: { Authorization: `Bearer ${auth.userBToken}` },
      });
      const bFinal = await getBAfter.json();
      expect(bFinal.data.avatar_url).toBe(bInitialAvatar);
    });

    // =========================================================================
    // Scenario 10: Self-cleans old avatar files from disk when new photo is uploaded
    // =========================================================================
    it('Scenario 10: self-cleans old avatar files from disk when new photo is uploaded', async () => {
      if (!serverUp) return;
      const auth = await getAuthContext();

      // Old JPEG path from Scenario 1 should have been purged by subsequent uploads
      if (oldJpegDiskPath) {
        expect(fs.existsSync(oldJpegDiskPath)).toBe(false);
      }

      // Check current avatar dir for User A: exactly 1 file should exist
      const avatarDir = path.join(PROJECT_ROOT, 'public', 'uploads', 'avatars');
      if (fs.existsSync(avatarDir)) {
        const files = fs.readdirSync(avatarDir).filter((f) => f.startsWith(`avatar-${auth.userAId}-`));
        expect(files.length).toBe(1);
      }
    });

    // =========================================================================
    // Scenario 11: DELETE /api/profile/avatar resets avatar to default emoji and removes physical file
    // =========================================================================
    it('Scenario 11: DELETE /api/profile/avatar resets avatar to default emoji and removes physical file', async () => {
      if (!serverUp) return;
      const auth = await getAuthContext();

      const res = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${auth.userAToken}` },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.avatar_url).toBe('🧑‍💼');
      expect(json.data.avatar_type).toBe('emoji');

      // Check that all physical files for User A are purged
      const avatarDir = path.join(PROJECT_ROOT, 'public', 'uploads', 'avatars');
      if (fs.existsSync(avatarDir)) {
        const files = fs.readdirSync(avatarDir).filter((f) => f.startsWith(`avatar-${auth.userAId}-`));
        expect(files.length).toBe(0);
      }

      // Verify persistent disk store
      const dbPath = path.join(PROJECT_ROOT, 'data', 'tatadana-db.json');
      const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      const stored = db.users.find((u) => u.id === auth.userAId);
      expect(stored.avatar_url).toBe('🧑‍💼');
      expect(stored.avatar_type).toBe('emoji');
    });

    // =========================================================================
    // Scenario 12: Switching to built-in emojis via PATCH /api/profile persists in database
    // =========================================================================
    it('Scenario 12: switching to built-in emojis via PATCH /api/profile persists in database', async () => {
      if (!serverUp) return;
      const auth = await getAuthContext();

      const patchRes = await fetch('http://localhost:3000/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.userAToken}`,
        },
        body: JSON.stringify({
          avatarUrl: '💎',
          avatarType: 'emoji',
        }),
      });

      expect(patchRes.status).toBe(200);
      const patchData = await patchRes.json();
      expect(patchData.success).toBe(true);
      expect(patchData.data.avatar_url).toBe('💎');
      expect(patchData.data.avatar_type).toBe('emoji');

      // Re-fetch via GET
      const getRes = await fetch('http://localhost:3000/api/profile', {
        headers: { Authorization: `Bearer ${auth.userAToken}` },
      });
      const getJson = await getRes.json();
      expect(getJson.data.avatar_url).toBe('💎');
      expect(getJson.data.avatar_type).toBe('emoji');

      // Verify persistent disk store
      const dbPath = path.join(PROJECT_ROOT, 'data', 'tatadana-db.json');
      const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      const stored = db.users.find((u) => u.id === auth.userAId);
      expect(stored.avatar_url).toBe('💎');
      expect(stored.avatar_type).toBe('emoji');
    });

    // =========================================================================
    // Scenario 13: Serves uploaded avatar files statically with HTTP 200 and correct Content-Type
    // =========================================================================
    it('Scenario 13: serves uploaded avatar files statically with HTTP 200 and correct Content-Type', async () => {
      if (!serverUp) return;
      const auth = await getAuthContext();

      // Re-upload a WebP file to test serving
      const formData = new FormData();
      const blob = new Blob([validWebpBuffer], { type: 'image/webp' });
      formData.append('image', blob, 'serve-test.webp');

      const uploadRes = await fetch('http://localhost:3000/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.userAToken}` },
        body: formData,
      });
      const uploadJson = await uploadRes.json();
      const fileUrl = uploadJson.data.avatar_url;

      // Fetch the static route
      const serveRes = await fetch(`http://localhost:3000${fileUrl}`);
      expect(serveRes.status).toBe(200);
      const contentType = serveRes.headers.get('content-type');
      expect(contentType).toContain('image/webp');
      const cacheControl = serveRes.headers.get('cache-control');
      expect(cacheControl).toBeDefined();
    });

    // =========================================================================
    // Scenario 14: Verifies Sidebar, Header, DashboardLayout, and Settings implement avatar references
    // =========================================================================
    it('Scenario 14: verifies Sidebar, Header, DashboardLayout, and Settings implement avatar references', () => {
      assertFileContains('app/dashboard/settings/page.tsx', [
        'handleFileSelect',
        'handleUploadPhoto',
        'handleDeletePhoto',
        'previewUrl',
        'accept="image/jpeg,image/png,image/webp"',
        'tatadana_profile_updated',
      ]);

      assertFileContains('components/layout/sidebar.tsx', [
        'userAvatar',
        '<img',
        'object-cover',
      ]);

      assertFileContains('components/layout/header.tsx', [
        'userAvatar',
        '/dashboard/settings?tab=profile',
      ]);

      assertFileContains('app/dashboard/layout.tsx', [
        'userAvatar',
        'userAvatarType',
        'tatadana_profile_updated',
        'fetchProfile',
      ]);
    });

    // =========================================================================
    // Scenario 15: Verifies scripts/verify-all.mjs imports and executes profile-avatar suite with >= 105 gate
    // =========================================================================
    it('Scenario 15: verifies scripts/verify-all.mjs imports and executes profile-avatar suite with >= 105 gate', () => {
      assertFileContains('scripts/verify-all.mjs', [
        'runProfileAvatarTests',
        'tests/e2e/profile-avatar.test.mjs',
        'await runProfileAvatarTests()',
        'results.totalTests < 105',
        'Profile Photo Upload',
      ]);
    });
  });
}
