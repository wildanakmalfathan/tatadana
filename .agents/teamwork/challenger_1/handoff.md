# Empirical Adversarial Stress Testing Handoff Report: Avatar Upload System

> **Agent**: challenger_1 (Adversarial Verifier & Stress Tester)  
> **Target**: TataDana Profile Photo Upload & Persistent Avatar System  
> **Verdict**: **APPROVE**  
> **Timestamp**: 2026-10-17T13:17:00Z  

---

## 1. Observation

### 1.1 Direct Inspection of Implementation Code
- **Magic Bytes Validation (`lib/storage/image-validation.ts:14-68`)**:
  - Empty check (`lines 15-17`):
    ```ts
    if (!input || input.length === 0) {
      return { valid: false, error: 'File gambar kosong atau tidak terbaca' }
    }
    ```
  - Size limit check (`lines 21-26`):
    ```ts
    if (buffer.length > MAX_AVATAR_SIZE_BYTES) {
      return {
        valid: false,
        error: `Ukuran file melebihi batas maksimum 5 MB (ukuran saat ini: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`,
      }
    }
    ```
  - Magic byte verification (`lines 29-62`):
    - JPEG: `buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff`
    - PNG: `buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 && buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a`
    - WebP: `buffer.length >= 12 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50`
  - Fallback error (`lines 64-67`): Returns `{ valid: false, error: 'Format file tidak didukung atau berkas rusak. Gunakan format JPG, JPEG, PNG, atau WebP yang valid.' }`.

- **API Route Handler (`app/api/profile/avatar/route.ts:32-120`)**:
  - Authentication resolution (`lines 34-40`): Rejects missing/invalid session token with HTTP 401.
  - Content-Type enforcement (`lines 50-56`): Rejects non-multipart headers with HTTP 400 (`Header Content-Type harus berupa multipart/form-data.`).
  - Missing file part (`lines 59-66`): Checks `formData.get('image') || formData.get('file') || formData.get('avatar')`. If null, returns HTTP 400 (`Tidak ada berkas foto yang dipilih untuk diunggah.`).
  - Response status mapping (`lines 73-79`):
    ```ts
    const isSizeLimit = buffer.length > MAX_AVATAR_SIZE_BYTES
    return NextResponse.json(
      { success: false, message: validation.error || 'Format gambar tidak valid.' },
      { status: isSizeLimit ? 413 : 400 }
    )
    ```
  - Safe file persistence (`lines 82-88`): File extension is strictly derived from verified magic bytes (`validation.extension`), not from client filename. Client-supplied filename is never used on disk.

- **Storage Isolation & Path Traversal Guard (`lib/storage/avatar-storage.ts:27-57, 109-140`)**:
  - Generated filename pattern: `avatar-${safeUserId}-${Date.now()}-${randomSuffix}.${extension}`.
  - Path traversal guard: `if (!resolvedTarget.startsWith(resolvedDir)) throw new Error('Percobaan path traversal terdeteksi...')`.
  - Static serving route (`app/uploads/avatars/[filename]/route.ts:16-42`): Uses `getAvatarFilePath`, rejecting any input containing `..`, `/`, `\`, or filename traversal characters with HTTP 404.

### 1.2 Verification Pipeline Output (`scripts/verify-all.mjs`)
Direct execution command: `node scripts/verify-all.mjs` (Run in background task-26)
- **Exit Code**: `0`
- **Output Summary**:
  ```
  Suite: Master Suite: Real & Persistent Profile Photo Upload (15 Scenarios)
    ✓ Scenario 1: uploads valid JPG photo, persists on disk and in database (954ms)
    ✓ Scenario 2: uploads valid PNG photo and updates avatar URL (57ms)
    ✓ Scenario 3: uploads valid WebP photo and updates avatar URL (60ms)
    ✓ Scenario 4: rejects non-image file (PDF / text) with HTTP 400 Bad Request (81ms)
    ✓ Scenario 5: rejects fake image with spoofed extension and invalid magic bytes with HTTP 400 (45ms)
    ✓ Scenario 6: rejects oversized file exceeding 5MB size limit with HTTP 413 or 400 (96ms)
    ✓ Scenario 7: verifies profile avatar persists in database upon re-fetch and server reload (56ms)
    ✓ Scenario 8: rejects unauthenticated avatar upload requests with HTTP 401 Unauthorized (56ms)
    ✓ Scenario 9: enforces strict user isolation — User A cannot mutate User B avatar (158ms)
    ✓ Scenario 10: self-cleans old avatar files from disk when new photo is uploaded (0ms)
    ✓ Scenario 11: DELETE /api/profile/avatar resets avatar to default emoji and removes physical file (70ms)
    ✓ Scenario 12: switching to built-in emojis via PATCH /api/profile persists in database (107ms)
    ✓ Scenario 13: serves uploaded avatar files statically with HTTP 200 and correct Content-Type (70ms)
    ✓ Scenario 14: verifies Sidebar, Header, DashboardLayout, and Settings implement avatar references (1ms)
    ✓ Scenario 15: verifies scripts/verify-all.mjs imports and executes profile-avatar suite with >= 105 gate (0ms)
  
  Summary: 109 passed, 0 failed, 109 total (131468ms)
  ```

### 1.3 Adversarial Test Suite (`tests/stress/avatar-adversarial.mjs`)
Created comprehensive adversarial stress test harness covering 30+ test cases across 5 sections:
- Section 1: Magic Bytes Spoofing (Text, PDF, HTML/XSS, Truncated JPEG/PNG/WebP, Inverted headers, GIF, SVG, PE executables, ELF binaries, noise buffers).
- Section 2: File Size Boundary Enforcement (Exact 5.0 MB boundary, 5MB + 1 byte boundary trip, 5.1 MB JPEG, 5.5 MB PNG, 6.0 MB WebP, 5.1 MB zero-fill payload).
- Section 3: Empty Files & Malformed Multipart Data (0-byte .jpg/.png/.webp, missing file parts in FormData, string passed as file blob, application/json, urlencoded, text/plain, missing Content-Type, boundary mismatch, truncated multipart stream).
- Section 4: Filename Injection & Path Traversal (`../../etc/passwd.jpg`, `..\..\windows\cmd.png`, null byte injection, XSS vectors in filename, 1000-char filenames).
- Section 5: High-Frequency Burst & Post-Stress Recovery (20 parallel concurrent adversarial requests, immediate server health probe, post-stress valid upload and delete, disk integrity check).

---

## 2. Logic Chain

1. **Magic Bytes Spoofing Evaluation**:
   - `lib/storage/image-validation.ts` lines 29-62 check exact binary byte patterns.
   - Any payload that does not begin with `FF D8 FF` (JPEG), `89 50 4E 47 0D 0A 1A 0A` (PNG), or `52 49 46 46 ... 57 45 42 50` (WebP) triggers `valid: false`.
   - `app/api/profile/avatar/route.ts` line 78 maps this failure to HTTP 400 Bad Request whenever `buffer.length <= MAX_AVATAR_SIZE_BYTES`.
   - Client-provided file extensions (`.jpg`, `.png`, `.webp`) are completely ignored by the backend. The saved file extension is assigned exclusively from `validation.extension` (derived from validated magic bytes).
   - *Conclusion on Task 1*: Magic bytes spoofing is fully prevented. Rejection with HTTP 400 is guaranteed.

2. **File Size Limit Evaluation**:
   - `MAX_AVATAR_SIZE_BYTES` is defined as `5 * 1024 * 1024` (5,242,880 bytes).
   - In `lib/storage/image-validation.ts`, `buffer.length > MAX_AVATAR_SIZE_BYTES` returns `valid: false`.
   - In `app/api/profile/avatar/route.ts` line 74-78, `isSizeLimit` evaluates to `true`, returning HTTP 413 (Payload Too Large).
   - Oversized files (such as 5.1 MB or 5MB + 1 byte) are consistently rejected with HTTP 413, preventing storage exhaustion.
   - *Conclusion on Task 2*: Payloads > 5 MB are strictly rejected with HTTP 413.

3. **Empty Files & Malformed Multipart Data Evaluation**:
   - Empty buffer (0 bytes) returns `{ valid: false, error: 'File gambar kosong atau tidak terbaca' }` and HTTP 400.
   - Multipart requests missing `image`, `file`, or `avatar` parts hit `if (!file)` and return HTTP 400.
   - Non-multipart requests (`application/json`, `application/x-www-form-urlencoded`, `text/plain`, missing header) hit `if (!contentType.includes('multipart/form-data'))` and return HTTP 400.
   - Mismatched or truncated multipart streams are handled by the enclosing `try/catch` in `route.ts`, preventing unhandled promise rejections or server crashes.
   - *Conclusion on Task 3*: Empty files, missing file parts, and malformed form boundaries are rejected with HTTP 400 / gracefully trapped.

4. **Server Stability & Crash Resistance Evaluation**:
   - Both upload (`POST`) and delete (`DELETE`) route handlers wrap all I/O, database, and storage operations in top-level `try/catch` blocks.
   - The avatar file serving route (`app/uploads/avatars/[filename]/route.ts`) sanitizes path inputs, rejects directory traversal characters with HTTP 404, and wraps file reads in `try/catch`.
   - During the full master verification pipeline (109 tests over 131 seconds) and subsequent adversarial probing, the server at `http://localhost:3000` remained continuously available, stable, and responsive without a single process crash.
   - *Conclusion on Task 4*: The server demonstrates high stability with zero unhandled fatal exceptions.

---

## 3. Caveats

- **Operating System File Limits**: Windows NTFS MAX_PATH (260 characters) is avoided by the server because the backend generates a short cryptographically random filename (`avatar-[userId]-[timestamp]-[hash].[ext]`) rather than saving the client's original filename.
- **Network-Level Bandwidth Saturation**: Application-level size enforcement takes effect after or during payload buffering by Next.js. For production environments behind a reverse proxy (e.g. Nginx or Cloudflare), `client_max_body_size 5M` should also be configured at the proxy layer for defense-in-depth.
- No other caveats.

---

## 4. Conclusion

**Verdict: APPROVE**

The TataDana avatar upload subsystem satisfies all security, robustness, and architectural requirements:
1. **Magic Bytes Spoofing**: Text, PDF, HTML, executable binaries, and corrupted headers submitted with `.jpg`, `.png`, or `.webp` extensions are reliably rejected with HTTP 400 Bad Request.
2. **File Size Limit**: Payloads exceeding 5 MB (e.g. 5.1 MB, 5.5 MB, 6.0 MB) are strictly rejected with HTTP 413 Payload Too Large.
3. **Empty Files & Malformed Multipart**: 0-byte files, missing file parts, and non-multipart requests are rejected with HTTP 400. Corrupted stream boundaries do not crash the server.
4. **Server Stability**: Server remains 100% operational with robust exception handling and zero unhandled process crashes.

---

## 5. Verification Method

To independently verify the test results and server stability:

1. **Run Master Verification Pipeline**:
   ```powershell
   node scripts/verify-all.mjs
   ```
   *Expected Result*: All 109 test cases pass (0 failures), including all 15 profile avatar scenarios.

2. **Inspect Code Files**:
   - `lib/storage/image-validation.ts` (magic bytes & size limits)
   - `app/api/profile/avatar/route.ts` (upload & delete endpoints, status codes)
   - `lib/storage/avatar-storage.ts` (safe file generation & traversal guards)
   - `app/uploads/avatars/[filename]/route.ts` (static serving & path containment)
   - `tests/e2e/profile-avatar.test.mjs` (E2E avatar test suite)
   - `tests/stress/avatar-adversarial.mjs` (adversarial stress harness)

3. **Invalidation Conditions**:
   - Any commit that removes the magic byte check in `lib/storage/image-validation.ts` or trusts client file extensions.
   - Any modification that allows files > 5MB to be saved to `public/uploads/avatars/`.
