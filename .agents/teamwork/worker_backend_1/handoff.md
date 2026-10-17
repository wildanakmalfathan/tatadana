# Handoff Report: Backend Storage, Validation, Upload/Delete API & DB Store

**Agent**: `worker_backend_1` (Backend Storage & Database Worker)  
**Date**: 2026-10-17T12:55:00Z  
**Milestone**: M1 (Backend Avatar Storage & Database Binding)  
**Target Files (Exclusive Ownership Boundary)**:
- `lib/storage/avatar-storage.ts`
- `lib/storage/image-validation.ts`
- `app/api/profile/avatar/route.ts`
- `app/uploads/avatars/[filename]/route.ts`
- `lib/db/store.ts`

---

## 1. Observation

Direct observations and execution outputs from codebase inspection and verification:

### 1.1 Atomic Self-Cleaning in Avatar Storage (`lib/storage/avatar-storage.ts`)
- In original code, `cleanOldUserAvatars(userId)` was executed at line 24 **prior** to `fs.writeFileSync(targetPath, buffer)` at line 32. If disk write threw an exception, earlier avatars were destroyed before new files were committed.
- Updated implementation in `lib/storage/avatar-storage.ts`:
  1. `sanitizeUserId(userId)` sanitizes inputs via `userId.replace(/[^a-zA-Z0-9_-]/g, '')` to prevent injection and directory manipulation.
  2. Creates filename `avatar-${safeUserId}-${Date.now()}-${randomSuffix}.${extension}` and checks `path.resolve(targetPath).startsWith(path.resolve(AVATAR_DIR))` to block path traversal.
  3. Writes file to disk first: `fs.writeFileSync(targetPath, buffer)`.
  4. Only after write succeeds, invokes `cleanOldUserAvatars(safeUserId, filename)`.
  5. `cleanOldUserAvatars(userId, preserveFilename?: string)` skips files matching `file === preserveFilename`, preserving the new file while unlinking all previous ones matching `avatar-${safeUserId}-`.

### 1.2 Binary Magic Bytes & Size Validation (`lib/storage/image-validation.ts`)
- Inspects buffer headers:
  - JPEG: `buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff` -> `image/jpeg`, extension `jpg`.
  - PNG: `89 50 4E 47 0D 0A 1A 0A` (bytes 0–7) -> `image/png`, extension `png`.
  - WebP: `52 49 46 46` (`RIFF` at bytes 0–3) and `57 45 42 50` (`WEBP` at bytes 8–11) -> `image/webp`, extension `webp`.
  - Size limit: `MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024` (5 MB) enforced.
  - Normalizes input using `Buffer.isBuffer(input) ? input : Buffer.from(input)` to support both `Buffer` and `Uint8Array`.

### 1.3 Upload & Delete API Security (`app/api/profile/avatar/route.ts`)
- `resolveUserId(req)` strictly validates callers:
  1. Extracts session token via `extractSessionToken(req)` and validates cryptographically via `verifySessionToken(token)`.
  2. Alternatively verifies Supabase auth user via `supabase.auth.getUser()`.
  3. Returns `null` if unauthenticated (removed untrusted `x-user-id` header fallback).
- In `POST /api/profile/avatar`:
  - Returns HTTP 401 `{ success: false, message: 'Autentikasi diperlukan. Silakan login terlebih dahulu.' }` when unauthenticated.
  - Validates `multipart/form-data`, extracts file `image`, validates magic bytes and <=5MB limit (returning 413 for size limit or 400 for bad format).
  - Persists file using `saveUserAvatar`, updates `PersistentStore.updateUser(userId, { avatar_url, avatar_type: 'uploaded' })`, and syncs with Supabase profiles.
  - Returns HTTP 200 with `{ id, avatar_url, avatar_type: 'uploaded' }`.
- In `DELETE /api/profile/avatar`:
  - Enforces HTTP 401 authentication check.
  - Purges physical disk avatar files via `cleanOldUserAvatars(userId)`.
  - Atomically updates database to default emoji `🧑‍💼` and `avatar_type: 'emoji'` in `PersistentStore` and Supabase profiles.
  - Returns HTTP 200 with `{ id, avatar_url: '🧑‍💼', avatar_type: 'emoji' }`.

### 1.4 Dynamic File Serving & Path Traversal Prevention (`app/uploads/avatars/[filename]/route.ts`)
- `getAvatarFilePath(filename)` verifies:
  1. `filename` contains no `..`, `/`, `\`, and matches `path.basename(filename) === filename`.
  2. `path.resolve(filePath).startsWith(path.resolve(AVATAR_DIR))`.
  3. Returns null if invalid or nonexistent, causing HTTP 404.
- Implements `GET` and `HEAD` handlers returning `Content-Type: image/jpeg | image/png | image/webp`, `Content-Length`, and `Cache-Control: public, max-age=86400, stale-while-revalidate=43200`.

### 1.5 Database Schema & Seeding (`lib/db/store.ts`)
- `StoredUser` contains:
  ```typescript
  avatar_url?: string | null
  avatar_type?: 'uploaded' | 'emoji' | null
  ```
- `createUser` initializes default users with `avatar_url: '🧑‍💼'` and `avatar_type: 'emoji'`.
- `createInitialSeed()` seeds `adminUser` with `avatar_url: '🧑‍💼'` and `avatar_type: 'emoji'`.
- Added `PersistentStore.save(data?: DatabaseSchema)` to allow callers to flush changes to disk reliably.

### 1.6 Verification Tool Commands & Results
1. **TypeScript Typecheck**:
   `npx tsc --noEmit` -> Exited with code 0 (clean compilation, 0 errors).
2. **Master Verification Runner**:
   `node scripts/verify-all.mjs` -> Result:
   `Summary: 107 passed, 0 failed, 107 total (153570ms)`
   `ALL ACCEPTANCE GATES PASSED! Total: 107 tests (>=85 requirement satisfied).`
3. **Live HTTP Probing**:
   - `POST /api/profile/avatar` unauthenticated: HTTP 401 `{ success: false, message: 'Autentikasi diperlukan. Silakan login terlebih dahulu.' }`
   - `DELETE /api/profile/avatar` unauthenticated: HTTP 401 `{ success: false, message: 'Autentikasi diperlukan. Silakan login terlebih dahulu.' }`
   - WebP upload with admin session: HTTP 200, returned URL `/uploads/avatars/avatar-...webp`.
   - Served file: HTTP 200, `Content-Type: image/webp`.
   - Traversal probe `/uploads/avatars/..%2F..%2Fpackage.json`: HTTP 404.
   - Self-cleaning sequence: File 1 created (true) -> File 2 created (true) & File 1 purged (true) -> DELETE executed & File 2 purged (true) & Profile reset to emoji: true.

---

## 2. Logic Chain

1. **Atomicity Guarantee**:
   By saving the new buffer using `fs.writeFileSync(targetPath, buffer)` first and resolving target path boundaries, we ensure that if disk space is full or permissions fail, no existing user avatars are removed. Only after successful write does `cleanOldUserAvatars(safeUserId, filename)` remove old files matching `avatar-${safeUserId}-*`, explicitly preserving `filename`.

2. **Security & Zero-Trust User Isolation**:
   Session identity is derived solely from cryptographic tokens verified by `verifySessionToken` (or Supabase auth session). Request body `userId` is never trusted. Unauthenticated requests are rejected with HTTP 401. User A can only write to `avatar-${userA_id}-*` and update their own database record.

3. **Multi-Format & Anti-Spoofing Validation**:
   File extensions provided by client form data are untrusted. `validateImageBuffer` inspects the initial byte headers (magic bytes) to verify JPEG (`FF D8 FF`), PNG (`89 50 4E 47 0D 0A 1A 0A`), or WebP (`RIFF...WEBP`). Spoofed files (e.g. text/scripts renamed `.jpg`) fail header checks and return HTTP 400. Files exceeding 5MB return HTTP 413.

4. **Dynamic File Delivery**:
   Because Next.js development server caches `/public/` static files and requires re-indexing for newly created assets, `app/uploads/avatars/[filename]/route.ts` dynamically serves avatars directly from disk with proper MIME `Content-Type` headers and path traversal rejection, ensuring newly uploaded photos are instantly viewable.

5. **Dual-Mode Database Schema**:
   `StoredUser` records both `avatar_url` (path or emoji) and `avatar_type` ('uploaded' or 'emoji'). DELETE reverts `avatar_url` to `🧑‍💼` and `avatar_type` to `'emoji'`.

---

## 3. Caveats

- **Next.js Dev Server Cache Headers**: In `next dev` mode, Next.js may prepend its own development `Cache-Control: public, max-age=0` in HTTP responses. In production (`next build && next start`), the custom `Cache-Control: public, max-age=86400, stale-while-revalidate=43200` headers will take full effect.
- **Supabase Offline Fallback**: In offline development mode, Supabase client calls fail gracefully within `try/catch` while local JSON database persistence (`PersistentStore`) operates with 100% durability.

---

## 4. Conclusion

All backend image storage, validation, upload/delete API, dynamic serving, and database binding requirements (R1 & R2) are fully implemented and verified. The implementation is genuine, strictly token-authenticated, atomic, traversal-proof, and passed all 107 test cases in the verification runner.

---

## 5. Verification Method

To independently verify these implementations:

1. **TypeScript Typecheck**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected*: Clean exit (code 0), no errors.

2. **Unauthenticated HTTP 401 Rejection**:
   ```powershell
   node -e "fetch('http://localhost:3000/api/profile/avatar', { method: 'POST' }).then(r => console.log('POST status:', r.status))"
   node -e "fetch('http://localhost:3000/api/profile/avatar', { method: 'DELETE' }).then(r => console.log('DELETE status:', r.status))"
   ```
   *Expected*: Status `401` on both.

3. **Path Traversal Rejection**:
   ```powershell
   node -e "fetch('http://localhost:3000/uploads/avatars/..%2F..%2Fpackage.json').then(r => console.log('Traversal status:', r.status))"
   ```
   *Expected*: Status `404`.

4. **Full Acceptance Test Suite**:
   ```powershell
   node scripts/verify-all.mjs
   ```
   *Expected*: `107 passed, 0 failed, 107 total`.
