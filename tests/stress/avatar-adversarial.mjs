// tests/stress/avatar-adversarial.mjs
// Adversarial Stress Testing Harness for TataDana Profile Avatar Upload System
// Empirically challenges and stress tests:
// 1. Magic bytes spoofing (text, PDF, HTML, corrupt bytes, other image types)
// 2. File size boundary enforcement (> 5MB, 5MB + 1 byte, 5.1MB, 6MB)
// 3. Empty files, missing parts, and malformed multipart data
// 4. Filename injection & path traversal attempts
// 5. Server stability, concurrency resistance, and post-stress recovery

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const BASE_URL = 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  emerald: '\x1b[38;2;16;185;129m',
};

// Fixtures for testing
const validJpegSmall = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xff, 0xd9,
]);

const validPngSmall = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

const validWebpSmall = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  0x56, 0x50, 0x38, 0x20, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x00, 0x02, 0x00, 0x34, 0x25,
]);

// Test stats tracking
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;
const failureDetails = [];

function assert(condition, testName, details = '') {
  testsRun++;
  if (condition) {
    testsPassed++;
    console.log(`  ${colors.green}✓ PASS${colors.reset} ${testName}`);
  } else {
    testsFailed++;
    console.log(`  ${colors.red}✗ FAIL${colors.reset} ${testName} ${details ? `(${details})` : ''}`);
    failureDetails.push({ testName, details });
  }
}

async function sendRawRequest({ method = 'POST', path = '/api/profile/avatar', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const rawBuffer = Buffer.concat(chunks);
          let json = null;
          try {
            json = JSON.parse(rawBuffer.toString('utf8'));
          } catch {}
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: rawBuffer.toString('utf8'),
            json,
          });
        });
      }
    );

    req.on('error', (err) => reject(err));

    if (body) {
      if (Buffer.isBuffer(body) || typeof body === 'string') {
        req.write(body);
      }
    }
    req.end();
  });
}

async function setupTestUser() {
  const timestamp = Date.now();
  const testEmail = `adversarial.user.${timestamp}@tatadana.id`;
  const testPassword = 'AdversarialTest2026!';

  console.log(`\n${colors.cyan}--- Setting up Adversarial Test User (${testEmail}) ---${colors.reset}`);

  // 1. Register User
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Adversarial Verifier',
      email: testEmail,
      phone: `0817${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: testPassword,
      confirmPassword: testPassword,
    }),
  });
  const regData = await regRes.json();
  const userId = regData.user?.id || regData.data?.id;
  if (!userId) {
    throw new Error(`Failed to register test user: ${JSON.stringify(regData)}`);
  }

  // 2. Admin Login and Approve
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'wildanakmalfathan@gmail.com',
      password: 'AdminTataDana2026!',
    }),
  });
  const adminData = await adminLoginRes.json();
  const adminToken = adminData.token;

  await fetch(`${BASE_URL}/api/admin/users`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ userId, action: 'approve' }),
  });

  // 3. Login User
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  const loginData = await loginRes.json();
  const userToken = loginData.token;

  console.log(`  User created & approved. ID: ${userId}\n`);
  return { userId, userToken, testEmail };
}

// Helper to upload via FormData
async function uploadFileViaFormData(token, fileBuffer, filename, mimeType = 'image/jpeg') {
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: mimeType });
  formData.append('image', blob, filename);

  const res = await fetch(`${BASE_URL}/api/profile/avatar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  let json = null;
  try {
    json = await res.json();
  } catch {}

  return { status: res.status, json };
}

async function runAdversarialSuite() {
  console.log(`\n${colors.bright}${colors.emerald}================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.emerald}     TataDana Avatar Upload — EMPIRICAL ADVERSARIAL STRESS SUITE ${colors.reset}`);
  console.log(`${colors.bright}${colors.emerald}================================================================${colors.reset}`);

  const user = await setupTestUser();
  const token = user.userToken;

  // ===========================================================================
  // SECTION 1: MAGIC BYTES SPOOFING
  // ===========================================================================
  console.log(`\n${colors.bright}${colors.cyan}--- Section 1: Magic Bytes Spoofing & Extension Mismatches ---${colors.reset}`);

  // 1.1 Plain text disguised as .jpg
  {
    const payload = Buffer.from('Hello world! This is plain text disguised as an image file.');
    const res = await uploadFileViaFormData(token, payload, 'plain.jpg', 'image/jpeg');
    assert(res.status === 400 && res.json?.success === false, 'Rejects plain text payload disguised as .jpg (HTTP 400)');
  }

  // 1.2 Plain text disguised as .png
  {
    const payload = Buffer.from('<script>alert("XSS in text disguised as png")</script>');
    const res = await uploadFileViaFormData(token, payload, 'script.png', 'image/png');
    assert(res.status === 400 && res.json?.success === false, 'Rejects script text payload disguised as .png (HTTP 400)');
  }

  // 1.3 Plain text disguised as .webp
  {
    const payload = Buffer.from('Just some ascii text with a webp extension.');
    const res = await uploadFileViaFormData(token, payload, 'notes.webp', 'image/webp');
    assert(res.status === 400 && res.json?.success === false, 'Rejects plain text payload disguised as .webp (HTTP 400)');
  }

  // 1.4 PDF disguised as .jpg
  {
    const payload = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n%%EOF');
    const res = await uploadFileViaFormData(token, payload, 'invoice.jpg', 'image/jpeg');
    assert(res.status === 400 && res.json?.success === false, 'Rejects PDF document disguised as .jpg (HTTP 400)');
  }

  // 1.5 PDF disguised as .png
  {
    const payload = Buffer.from('%PDF-1.4\n%Binary test payload\n');
    const res = await uploadFileViaFormData(token, payload, 'bank-statement.png', 'image/png');
    assert(res.status === 400 && res.json?.success === false, 'Rejects PDF document disguised as .png (HTTP 400)');
  }

  // 1.6 PDF disguised as .webp
  {
    const payload = Buffer.from('%PDF-2.0\nDocument root payload\n');
    const res = await uploadFileViaFormData(token, payload, 'contract.webp', 'image/webp');
    assert(res.status === 400 && res.json?.success === false, 'Rejects PDF document disguised as .webp (HTTP 400)');
  }

  // 1.7 HTML/SVG script payload disguised as .jpg
  {
    const payload = Buffer.from('<!DOCTYPE html><html><head><title>Pwned</title></head><body><h1>Exploit</h1></body></html>');
    const res = await uploadFileViaFormData(token, payload, 'exploit.jpg', 'image/jpeg');
    assert(res.status === 400 && res.json?.success === false, 'Rejects HTML document disguised as .jpg (HTTP 400)');
  }

  // 1.8 HTML payload disguised as .png
  {
    const payload = Buffer.from('<html xmlns="http://www.w3.org/1999/xhtml"><body><script>fetch("/api/admin")</script></body></html>');
    const res = await uploadFileViaFormData(token, payload, 'injection.png', 'image/png');
    assert(res.status === 400 && res.json?.success === false, 'Rejects HTML/DOM payload disguised as .png (HTTP 400)');
  }

  // 1.9 HTML payload disguised as .webp
  {
    const payload = Buffer.from('<html><iframe src="https://evil.com"></iframe></html>');
    const res = await uploadFileViaFormData(token, payload, 'iframe.webp', 'image/webp');
    assert(res.status === 400 && res.json?.success === false, 'Rejects HTML iframe payload disguised as .webp (HTTP 400)');
  }

  // 1.10 Truncated JPEG magic bytes (only 1 byte: 0xFF)
  {
    const payload = Buffer.from([0xff]);
    const res = await uploadFileViaFormData(token, payload, 'truncated1.jpg', 'image/jpeg');
    assert(res.status === 400 && res.json?.success === false, 'Rejects 1-byte truncated JPEG header (HTTP 400)');
  }

  // 1.11 Truncated JPEG magic bytes (only 2 bytes: 0xFF, 0xD8 — missing 3rd 0xFF)
  {
    const payload = Buffer.from([0xff, 0xd8, 0x00, 0x00]);
    const res = await uploadFileViaFormData(token, payload, 'truncated2.jpg', 'image/jpeg');
    assert(res.status === 400 && res.json?.success === false, 'Rejects incomplete 2-byte JPEG header FF D8 00 (HTTP 400)');
  }

  // 1.12 Inverted JPEG bytes (D8 FF FF)
  {
    const payload = Buffer.from([0xd8, 0xff, 0xff, 0xe0, 0x00]);
    const res = await uploadFileViaFormData(token, payload, 'inverted.jpg', 'image/jpeg');
    assert(res.status === 400 && res.json?.success === false, 'Rejects inverted JPEG magic bytes (HTTP 400)');
  }

  // 1.13 Truncated PNG header (only 4 bytes: 89 50 4E 47, missing 0D 0A 1A 0A)
  {
    const payload = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const res = await uploadFileViaFormData(token, payload, 'short.png', 'image/png');
    assert(res.status === 400 && res.json?.success === false, 'Rejects truncated 4-byte PNG header (HTTP 400)');
  }

  // 1.14 Corrupted PNG header (bytes 0-3 valid, but bytes 4-7 corrupted)
  {
    const payload = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00, 0x00, 0x12, 0x34]);
    const res = await uploadFileViaFormData(token, payload, 'corrupt-png.png', 'image/png');
    assert(res.status === 400 && res.json?.success === false, 'Rejects PNG with corrupted secondary header bytes (HTTP 400)');
  }

  // 1.15 Truncated WebP header (only RIFF, missing WEBP chunk identifier at offset 8)
  {
    const payload = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00]);
    const res = await uploadFileViaFormData(token, payload, 'short.webp', 'image/webp');
    assert(res.status === 400 && res.json?.success === false, 'Rejects RIFF container lacking WEBP chunk tag (HTTP 400)');
  }

  // 1.16 WebP container with wrong fourCC (e.g. RIFF....AVI or RIFF....WXYZ)
  {
    const payload = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00,
      0x57, 0x58, 0x59, 0x5a, // WXYZ instead of WEBP
    ]);
    const res = await uploadFileViaFormData(token, payload, 'fake.webp', 'image/webp');
    assert(res.status === 400 && res.json?.success === false, 'Rejects RIFF container with invalid fourCC tag (HTTP 400)');
  }

  // 1.17 GIF89a valid image submitted with .jpg extension (unsupported format rejection)
  {
    const gifBuffer = Buffer.from('GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;');
    const res = await uploadFileViaFormData(token, gifBuffer, 'image.jpg', 'image/jpeg');
    assert(res.status === 400 && res.json?.success === false, 'Rejects GIF format submitted with .jpg extension (HTTP 400)');
  }

  // 1.18 SVG valid vector submitted with .png extension (unsupported format rejection)
  {
    const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40"/></svg>');
    const res = await uploadFileViaFormData(token, svgBuffer, 'vector.png', 'image/png');
    assert(res.status === 400 && res.json?.success === false, 'Rejects SVG vector submitted with .png extension (HTTP 400)');
  }

  // 1.19 Windows Executable PE / MZ header with .jpg extension
  {
    const peBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00This program cannot be run in DOS mode.');
    const res = await uploadFileViaFormData(token, peBuffer, 'malware.jpg', 'image/jpeg');
    assert(res.status === 400 && res.json?.success === false, 'Rejects Windows PE binary with .jpg extension (HTTP 400)');
  }

  // 1.20 Linux ELF binary header with .webp extension
  {
    const elfBuffer = Buffer.from('\x7fELF\x02\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00');
    const res = await uploadFileViaFormData(token, elfBuffer, 'daemon.webp', 'image/webp');
    assert(res.status === 400 && res.json?.success === false, 'Rejects Linux ELF binary with .webp extension (HTTP 400)');
  }

  // 1.21 Random noise / garbage bytes (256 random bytes)
  {
    const noise = Buffer.alloc(256);
    for (let i = 0; i < 256; i++) noise[i] = Math.floor(Math.random() * 256);
    const res = await uploadFileViaFormData(token, noise, 'noise.jpg', 'image/jpeg');
    assert(res.status === 400 && res.json?.success === false, 'Rejects random high-entropy noise buffer (HTTP 400)');
  }


  // ===========================================================================
  // SECTION 2: FILE SIZE LIMIT BOUNDARIES
  // ===========================================================================
  console.log(`\n${colors.bright}${colors.cyan}--- Section 2: File Size Limit Boundary Stress Testing ---${colors.reset}`);

  // 2.1 Exactly 5 MB (5,242,880 bytes) valid JPEG buffer — At the boundary limit
  {
    console.log(`  Generating 5.0 MB boundary JPEG payload (5,242,880 bytes)...`);
    const boundaryBuffer = Buffer.alloc(5 * 1024 * 1024);
    validJpegSmall.copy(boundaryBuffer, 0);
    const res = await uploadFileViaFormData(token, boundaryBuffer, 'exact-5mb.jpg', 'image/jpeg');
    // 5MB is exactly MAX_AVATAR_SIZE_BYTES, so it should be valid and accepted with 200
    assert(res.status === 200 && res.json?.success === true, 'Accepts exact boundary 5.0 MB file (5,242,880 bytes) with HTTP 200');
  }

  // 2.2 Boundary + 1 byte (5,242,881 bytes) valid JPEG buffer — Exceeds limit by 1 byte
  {
    console.log(`  Generating 5 MB + 1 byte payload (5,242,881 bytes)...`);
    const overByOne = Buffer.alloc(5 * 1024 * 1024 + 1);
    validJpegSmall.copy(overByOne, 0);
    const res = await uploadFileViaFormData(token, overByOne, 'over-by-one.jpg', 'image/jpeg');
    assert(
      (res.status === 413 || res.status === 400) && res.json?.success === false,
      'Rejects payload exceeding limit by 1 byte (5,242,881 bytes) with HTTP 413 or 400',
      `status: ${res.status}`
    );
  }

  // 2.3 5.1 MB (5 * 1024 * 1024 + 104,857 bytes) JPEG payload
  {
    console.log(`  Generating 5.1 MB JPEG payload...`);
    const fivePointOneMB = Buffer.alloc(5 * 1024 * 1024 + 100 * 1024);
    validJpegSmall.copy(fivePointOneMB, 0);
    const res = await uploadFileViaFormData(token, fivePointOneMB, 'five-point-one.jpg', 'image/jpeg');
    assert(
      (res.status === 413 || res.status === 400) && res.json?.success === false,
      'Rejects 5.1 MB JPEG payload with HTTP 413 or 400',
      `status: ${res.status}`
    );
  }

  // 2.4 5.5 MB PNG payload
  {
    console.log(`  Generating 5.5 MB PNG payload...`);
    const fivePointFiveMB = Buffer.alloc(5 * 1024 * 1024 + 500 * 1024);
    validPngSmall.copy(fivePointFiveMB, 0);
    const res = await uploadFileViaFormData(token, fivePointFiveMB, 'five-point-five.png', 'image/png');
    assert(
      (res.status === 413 || res.status === 400) && res.json?.success === false,
      'Rejects 5.5 MB PNG payload with HTTP 413 or 400',
      `status: ${res.status}`
    );
  }

  // 2.5 6.0 MB WebP payload
  {
    console.log(`  Generating 6.0 MB WebP payload...`);
    const sixMB = Buffer.alloc(6 * 1024 * 1024);
    validWebpSmall.copy(sixMB, 0);
    const res = await uploadFileViaFormData(token, sixMB, 'six-mb.webp', 'image/webp');
    assert(
      (res.status === 413 || res.status === 400) && res.json?.success === false,
      'Rejects 6.0 MB WebP payload with HTTP 413 or 400',
      `status: ${res.status}`
    );
  }

  // 2.6 Oversized non-image payload (5.1 MB zero bytes)
  {
    console.log(`  Generating 5.1 MB zero-fill payload...`);
    const zeroPayload = Buffer.alloc(5 * 1024 * 1024 + 100 * 1024);
    const res = await uploadFileViaFormData(token, zeroPayload, 'large-zeros.bin', 'application/octet-stream');
    assert(
      (res.status === 413 || res.status === 400) && res.json?.success === false,
      'Rejects oversized non-image payload with HTTP 413 or 400',
      `status: ${res.status}`
    );
  }


  // ===========================================================================
  // SECTION 3: EMPTY FILES & MALFORMED MULTIPART DATA
  // ===========================================================================
  console.log(`\n${colors.bright}${colors.cyan}--- Section 3: Empty Files, Missing Parts & Malformed Multipart Data ---${colors.reset}`);

  // 3.1 Completely empty 0-byte file with .jpg
  {
    const emptyBuf = Buffer.alloc(0);
    const res = await uploadFileViaFormData(token, emptyBuf, 'empty.jpg', 'image/jpeg');
    assert(res.status === 400 && res.json?.success === false, 'Rejects 0-byte empty file with .jpg extension (HTTP 400)');
  }

  // 3.2 Completely empty 0-byte file with .png
  {
    const emptyBuf = Buffer.alloc(0);
    const res = await uploadFileViaFormData(token, emptyBuf, 'empty.png', 'image/png');
    assert(res.status === 400 && res.json?.success === false, 'Rejects 0-byte empty file with .png extension (HTTP 400)');
  }

  // 3.3 Completely empty 0-byte file with .webp
  {
    const emptyBuf = Buffer.alloc(0);
    const res = await uploadFileViaFormData(token, emptyBuf, 'empty.webp', 'image/webp');
    assert(res.status === 400 && res.json?.success === false, 'Rejects 0-byte empty file with .webp extension (HTTP 400)');
  }

  // 3.4 Missing file part entirely in FormData (no 'image', 'file', or 'avatar' keys)
  {
    const formData = new FormData();
    formData.append('username', 'victim');
    formData.append('action', 'update');

    const res = await fetch(`${BASE_URL}/api/profile/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const json = await res.json();
    assert(res.status === 400 && json?.success === false, 'Rejects multipart form missing all file parts (HTTP 400)');
  }

  // 3.5 FormData contains text string instead of a File object under 'image'
  {
    const formData = new FormData();
    formData.append('image', 'This is a string not a file blob');

    const res = await fetch(`${BASE_URL}/api/profile/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const json = await res.json();
    assert(res.status === 400 && json?.success === false, 'Rejects string value passed as image field in FormData (HTTP 400)');
  }

  // 3.6 Non-multipart request with Content-Type application/json
  {
    const res = await sendRawRequest({
      method: 'POST',
      path: '/api/profile/avatar',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ image: 'base64encodedfake...' }),
    });
    assert(res.statusCode === 400 && res.json?.success === false, 'Rejects application/json Content-Type on avatar upload endpoint (HTTP 400)');
  }

  // 3.7 Non-multipart request with Content-Type application/x-www-form-urlencoded
  {
    const res = await sendRawRequest({
      method: 'POST',
      path: '/api/profile/avatar',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${token}`,
      },
      body: 'image=fake_urlencoded_data&submit=1',
    });
    assert(res.statusCode === 400 && res.json?.success === false, 'Rejects application/x-www-form-urlencoded Content-Type (HTTP 400)');
  }

  // 3.8 Non-multipart request with Content-Type text/plain
  {
    const res = await sendRawRequest({
      method: 'POST',
      path: '/api/profile/avatar',
      headers: {
        'Content-Type': 'text/plain',
        Authorization: `Bearer ${token}`,
      },
      body: 'Raw text data payload',
    });
    assert(res.statusCode === 400 && res.json?.success === false, 'Rejects text/plain Content-Type (HTTP 400)');
  }

  // 3.9 Missing Content-Type header entirely
  {
    const res = await sendRawRequest({
      method: 'POST',
      path: '/api/profile/avatar',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: 'Data with no header',
    });
    assert(res.statusCode === 400 && res.json?.success === false, 'Rejects request with missing Content-Type header (HTTP 400)');
  }

  // 3.10 Corrupted form boundary in header vs body
  {
    const boundaryHeader = '----MyDeclaredBoundary123';
    const bodyWithDifferentBoundary =
      `------WrongBoundary456\r\n` +
      `Content-Disposition: form-data; name="image"; filename="test.jpg"\r\n` +
      `Content-Type: image/jpeg\r\n\r\n` +
      validJpegSmall.toString('binary') +
      `\r\n------WrongBoundary456--\r\n`;

    const res = await sendRawRequest({
      method: 'POST',
      path: '/api/profile/avatar',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundaryHeader}`,
        Authorization: `Bearer ${token}`,
      },
      body: Buffer.from(bodyWithDifferentBoundary, 'binary'),
    });
    // Server must handle gracefully (not crash with unhandled exception)
    assert(
      res.statusCode === 400 || res.statusCode === 500,
      'Server handles corrupted/mismatched multipart boundary without crash',
      `status: ${res.statusCode}`
    );
  }

  // 3.11 Truncated raw multipart stream (premature connection finish)
  {
    const boundary = '----PrematureCutBoundary789';
    const truncatedBody =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="image"; filename="cut.jpg"\r\n` +
      `Content-Type: image/jpeg\r\n\r\n` +
      `FFD8`; // Cut off mid-transmission, no closing boundary

    const res = await sendRawRequest({
      method: 'POST',
      path: '/api/profile/avatar',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Authorization: `Bearer ${token}`,
      },
      body: Buffer.from(truncatedBody, 'utf8'),
    });
    assert(
      res.statusCode === 400 || res.statusCode === 500,
      'Server handles truncated multipart stream without crashing',
      `status: ${res.statusCode}`
    );
  }


  // ===========================================================================
  // SECTION 4: PATH TRAVERSAL & FILENAME INJECTION ATTACKS
  // ===========================================================================
  console.log(`\n${colors.bright}${colors.cyan}--- Section 4: Filename Injection & Path Traversal Resistance ---${colors.reset}`);

  // 4.1 Path traversal attack in filename (../../../../etc/passwd.jpg)
  {
    const res = await uploadFileViaFormData(token, validJpegSmall, '../../../../etc/passwd.jpg', 'image/jpeg');
    // If accepted, verify target filename on disk is generated safely and does NOT traverse
    if (res.status === 200) {
      const savedUrl = res.json.data.avatar_url;
      const basename = path.basename(savedUrl);
      const fullDiskPath = path.join(PROJECT_ROOT, 'public', 'uploads', 'avatars', basename);
      assert(
        fs.existsSync(fullDiskPath) && !savedUrl.includes('..') && !basename.includes('passwd'),
        'Path traversal filename is safely quarantined into generated cryptoname without directory escape'
      );
    } else {
      assert(res.status === 400, 'Rejects path traversal filename with HTTP 400');
    }
  }

  // 4.2 Windows path traversal in filename (..\..\windows\system32\cmd.png)
  {
    const res = await uploadFileViaFormData(token, validPngSmall, '..\\..\\windows\\system32\\cmd.png', 'image/png');
    if (res.status === 200) {
      const savedUrl = res.json.data.avatar_url;
      const basename = path.basename(savedUrl);
      assert(
        !savedUrl.includes('\\') && !basename.includes('cmd'),
        'Windows backslash path traversal filename is safely sanitized'
      );
    } else {
      assert(res.status === 400, 'Rejects Windows path traversal filename with HTTP 400');
    }
  }

  // 4.3 Null byte injection in filename (avatar\0.jpg)
  {
    const res = await uploadFileViaFormData(token, validJpegSmall, 'avatar\x00.jpg', 'image/jpeg');
    assert(
      res.status === 200 || res.status === 400,
      'Null-byte filename injection handled safely without server crash',
      `status: ${res.status}`
    );
  }

  // 4.4 XSS vector in filename (<script>alert(1)</script>.png)
  {
    const res = await uploadFileViaFormData(token, validPngSmall, '<script>alert(1)</script>.png', 'image/png');
    if (res.status === 200) {
      const savedUrl = res.json.data.avatar_url;
      assert(
        !savedUrl.includes('<script>') && !savedUrl.includes('alert'),
        'XSS injection in filename is not reflected in saved avatar URL'
      );
    } else {
      assert(res.status === 400, 'Rejects XSS vector filename with HTTP 400');
    }
  }

  // 4.5 Extremely long filename (1000 characters + .jpg)
  {
    const longName = 'A'.repeat(1000) + '.jpg';
    const res = await uploadFileViaFormData(token, validJpegSmall, longName, 'image/jpeg');
    assert(
      res.status === 200 || res.status === 400,
      'Extremely long filename (1000 chars) handled safely without buffer overflow',
      `status: ${res.status}`
    );
  }


  // ===========================================================================
  // SECTION 5: RAPID BURST & SERVER STABILITY
  // ===========================================================================
  console.log(`\n${colors.bright}${colors.cyan}--- Section 5: High-Frequency Burst & Post-Stress Recovery ---${colors.reset}`);

  // 5.1 High-frequency adversarial burst (20 concurrent requests with bad payloads)
  console.log('  Firing 20 concurrent adversarial requests in parallel...');
  const burstPromises = [];
  for (let i = 0; i < 20; i++) {
    const bogusPayload = Buffer.from(`Adversarial-Burst-${i}-${Date.now()}`);
    burstPromises.push(
      uploadFileViaFormData(token, bogusPayload, `burst-${i}.jpg`, 'image/jpeg')
    );
  }
  const burstResults = await Promise.all(burstPromises);
  const allRejected = burstResults.every((r) => r.status === 400 && r.json?.success === false);
  assert(allRejected, 'All 20 concurrent adversarial burst requests were rejected with HTTP 400 Bad Request');

  // 5.2 Server Health Probe immediately post-burst
  console.log('  Checking server health and endpoint responsiveness post-stress...');
  const healthRes = await fetch(`${BASE_URL}/api/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(healthRes.status === 200, 'Server is alive and responds HTTP 200 to GET /api/profile after stress test');

  // 5.3 Valid upload succeeds immediately post-burst (no locked resources)
  console.log('  Verifying valid upload operation succeeds cleanly after attack sequence...');
  const validUploadRes = await uploadFileViaFormData(token, validWebpSmall, 'recovery-test.webp', 'image/webp');
  assert(
    validUploadRes.status === 200 && validUploadRes.json?.success === true,
    'Valid WebP photo uploads cleanly with HTTP 200 post-stress',
    `status: ${validUploadRes.status}`
  );

  // 5.4 Valid delete succeeds post-stress
  console.log('  Verifying DELETE /api/profile/avatar operation cleanly cleans up...');
  const deleteRes = await fetch(`${BASE_URL}/api/profile/avatar`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const deleteJson = await deleteRes.json();
  assert(
    deleteRes.status === 200 && deleteJson.success === true && deleteJson.data.avatar_type === 'emoji',
    'DELETE /api/profile/avatar resets avatar to emoji and purges files',
    `status: ${deleteRes.status}`
  );

  // 5.5 Verify disk integrity: ensure no orphaned files for test user remain in avatars dir
  const avatarDir = path.join(PROJECT_ROOT, 'public', 'uploads', 'avatars');
  if (fs.existsSync(avatarDir)) {
    const remainingFiles = fs.readdirSync(avatarDir).filter((f) => f.startsWith(`avatar-${user.userId}-`));
    assert(
      remainingFiles.length === 0,
      'No orphaned or corrupted files for test user remain in storage folder',
      `remaining count: ${remainingFiles.length}`
    );
  }

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log(`\n${colors.bright}${colors.emerald}================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.emerald}               ADVERSARIAL STRESS SUITE RESULTS                 ${colors.reset}`);
  console.log(`${colors.bright}${colors.emerald}================================================================${colors.reset}`);
  console.log(`  Total Adversarial Tests: ${testsRun}`);
  console.log(`  ${colors.green}Passed: ${testsPassed}${colors.reset}`);
  console.log(`  ${testsFailed > 0 ? colors.red : colors.green}Failed: ${testsFailed}${colors.reset}`);

  if (failureDetails.length > 0) {
    console.log(`\n${colors.red}Failures encountered:${colors.reset}`);
    for (const f of failureDetails) {
      console.log(`  - ${f.testName}: ${f.details}`);
    }
  }

  return { testsRun, testsPassed, testsFailed, failureDetails };
}

runAdversarialSuite()
  .then((results) => {
    process.exit(results.testsFailed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error(`\n${colors.red}Fatal harness error:${colors.reset}`, err);
    process.exit(1);
  });
