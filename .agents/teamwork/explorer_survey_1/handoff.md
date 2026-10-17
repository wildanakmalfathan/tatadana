# Handoff Report: Backend & Storage Exploration for Profile Photo Upload

**Explorer**: `explorer_survey_1` (Backend & Storage Explorer)  
**Date**: 2026-10-17T12:38:00Z  
**Target Milestone**: Real & Persistent Profile Photo Upload (`/api/profile/avatar`, `lib/db/store.ts`, `lib/storage/*`)  
**Working Directory**: `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_survey_1\`

---

## 1. Observation

Direct code inspections and behavioral verifications conducted on the codebase:

### 1.1 Database Schema & Modeling (`lib/db/store.ts` & `data/tatadana-db.json`)
- **`StoredUser` Interface (`lib/db/store.ts`, lines 7–27)**:
  ```typescript
  export interface StoredUser {
    id: string
    name: string
    email: string
    phone: string
    password_hash: string
    role: 'user' | 'admin'
    plan: 'starter' | 'pro' | 'pro_lifetime'
    status: 'pending_approval' | 'active' | 'rejected' | 'suspended'
    telegram_chat_id?: number | null
    telegram_username?: string | null
    telegram_bot_token?: string | null
    telegram_connected?: boolean
    telegram_connected_at?: string | null
    avatar_url?: string | null
    avatar_type?: 'uploaded' | 'emoji' | null
    monthly_tx_count: number
    last_seen_at?: string | null
    created_at: string
    updated_at: string
  }
  ```
  Both `avatar_url` and `avatar_type` are already typed in `StoredUser`.
- **Default User Creation (`lib/db/store.ts`, lines 371–386)**:
  `createUser()` initializes new users with default values:
  ```typescript
  avatar_url: '🧑‍💼',
  avatar_type: 'emoji',
  ```
- **Seeded Admin User (`lib/db/store.ts`, lines 158–175)**:
  `createInitialSeed()` defines `adminUser` but omits `avatar_url` and `avatar_type`.
- **Database Content (`data/tatadana-db.json`, lines 3–22)**:
  Superadmin (`00000000-0000-0000-0000-000000000001`) currently has `"avatar_url": "💰"`, while `"avatar_type"` is absent in JSON (defaults to `'emoji'`).
- **Atomic Persistence (`lib/db/store.ts`, lines 301–321 & 435–460)**:
  `PersistentStore.updateUser(id, updates: Partial<StoredUser>)` merges updates into the target user and calls `PersistentStore.write(db)`, which writes to a temporary file (`tatadana-db.json.[randomHex].tmp`) and performs an atomic `fs.renameSync(tmpFile, DB_FILE)`.

---

### 1.2 Authentication & User Session Resolution (`lib/auth/tokens.ts` & `app/api/profile/route.ts`)
- **Token Mechanism (`lib/auth/tokens.ts`, lines 38–104)**:
  Uses HMAC-SHA256 tokens signed with `DEFAULT_SECRET = process.env.SESSION_SECRET || 'tatadana-super-secure-production-jwt-key-2026-indonesia'`.
- **Token Extraction (`lib/auth/tokens.ts`, lines 168–202)**:
  `extractSessionToken(req)` extracts tokens from:
  1. `Authorization: Bearer <token>`
  2. `x-session-token` or `x-admin-token`
  3. Cookies `tatadana_admin_session` or `tatadana_session`.
- **Profile API User Resolution (`app/api/profile/route.ts`, lines 9–36)**:
  `resolveUserId(req: Request)` validates the session token or Supabase session, or checks `x-user-id`. Lines 29–33 contain a dev fallback to `OFFICIAL_SUPERADMIN_ID` if unauthenticated.
- **Avatar API User Resolution (`app/api/profile/avatar/route.ts`, lines 11–32)**:
  Unlike `app/api/profile/route.ts`, `app/api/profile/avatar/route.ts` strictly does **not** have a fallback. If no valid token or verified header is provided, `resolveUserId` returns `null`.
- **Zero-Trust Denial Verification**:
  Direct HTTP probe to `POST /api/profile/avatar` and `DELETE /api/profile/avatar` without authentication returns HTTP 401:
  `{ success: false, message: 'Autentikasi diperlukan. Silakan login terlebih dahulu.' }`.

---

### 1.3 Avatar Storage & Validation Architecture (`lib/storage/image-validation.ts` & `lib/storage/avatar-storage.ts`)
- **Magic Bytes & MIME Validation (`lib/storage/image-validation.ts`)**:
  - Size limit: `MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024` (5 MB).
  - JPEG inspection: checks bytes 0–2 for `FF D8 FF` -> `image/jpeg`, extension `jpg`.
  - PNG inspection: checks bytes 0–7 for `89 50 4E 47 0D 0A 1A 0A` -> `image/png`, extension `png`.
  - WebP inspection: checks bytes 0–3 for `52 49 46 46` (`RIFF`) and bytes 8–11 for `57 45 42 50` (`WEBP`) -> `image/webp`, extension `webp`.
  - Non-matching buffers return `{ valid: false, error: 'Format file tidak didukung atau berkas rusak...' }`.
- **Physical Disk Storage (`lib/storage/avatar-storage.ts`)**:
  - Target directory: `public/uploads/avatars/` (`path.join(process.cwd(), 'public', 'uploads', 'avatars')`).
  - File naming format: `avatar-${userId}-${Date.now()}-${randomSuffix}.${extension}` where `randomSuffix` is 8 hex chars from `crypto.randomBytes(4)`.
  - Storage path return value: `/uploads/avatars/${filename}`.
- **Old Avatar Self-Cleaning Flaw (`lib/storage/avatar-storage.ts`, lines 23–32)**:
  `cleanOldUserAvatars(userId)` is currently executed at line 24 **before** `fs.writeFileSync(targetPath, buffer)` at line 32. If disk write throws, previous avatars are destroyed before the new file is committed.
- **Static vs Dynamic File Serving (`app/uploads/avatars/[filename]/route.ts`)**:
  A dynamic Route Handler is in place at `GET /uploads/avatars/[filename]`. It validates the filename against directory traversal (`..`, `/`, `\`), reads the file buffer from `public/uploads/avatars/`, determines MIME type, and returns HTTP 200 with headers `Content-Type`, `Content-Length`, and `Cache-Control: public, max-age=86400, stale-while-revalidate=43200`.

---

### 1.4 Frontend Integration & Layout Synchronization Gaps
- **Settings Page (`app/dashboard/settings/page.tsx`, lines 166–178 & 216–228)**:
  On upload or delete, it dispatches a window event:
  ```typescript
  window.dispatchEvent(
    new CustomEvent('tatadana_profile_updated', {
      detail: { avatar_url: json.data.avatar_url, avatar_type: 'uploaded', full_name: userName },
    })
  )
  ```
- **Dashboard Layout Propagation Gap (`app/dashboard/layout.tsx`, lines 323–340)**:
  In `app/dashboard/layout.tsx`, `userAvatar` and `userAvatarType` state variables exist (lines 24–25) and are retrieved in `fetchProfile()` (lines 228–233). However, **they are never passed as props to `<Sidebar />` or `<Header />`**:
  ```tsx
  // Currently in layout.tsx:
  <Sidebar
    userPlan={userPlan}
    userName={userName}
    userPhone={userPhone}
    isAdmin={isAdmin}
    onLogout={handleLogout}
    isMobileOpen={isMobileOpen}
    setIsMobileOpen={setIsMobileOpen}
    // MISSING: userAvatar={userAvatar} userAvatarType={userAvatarType}
  />
  <Header
    onMenuClick={() => setIsMobileOpen(true)}
    onNewTransactionClick={() => setIsModalOpen(true)}
    telegramConnected={telegramConnected}
    title="Dashboard TataDana"
    // MISSING: userAvatar={userAvatar} userAvatarType={userAvatarType} userName={userName}
  />
  ```
  Furthermore, `app/dashboard/layout.tsx` does **not** register an event listener for `tatadana_profile_updated`.

---

## 2. Logic Chain

1. **Database Schema & Updates**:
   - `StoredUser` in `lib/db/store.ts` contains `avatar_url?: string | null` and `avatar_type?: 'uploaded' | 'emoji' | null`.
   - `PersistentStore.updateUser(userId, { avatar_url, avatar_type })` atomically updates `data/tatadana-db.json` via temporary file rename.
   - Therefore, the database layer is already prepared to accept and persist avatar changes for any user.

2. **Session Security & Isolation**:
   - `resolveUserId` in `app/api/profile/avatar/route.ts` strictly evaluates cryptographic session tokens and refuses unauthenticated callers with HTTP 401.
   - It ignores `userId` in the request body, binding uploads strictly to the token owner's `userId`.
   - Therefore, user isolation (User A cannot alter User B's photo) is cryptographically guaranteed on this endpoint.

3. **Storage & Validation Robustness**:
   - `validateImageBuffer` checks the initial magic bytes of JPEG, PNG, and WebP, and caps file size at 5MB (5,242,880 bytes).
   - Any spoofed file (e.g. text file renamed `.jpg`) fails magic byte validation and triggers HTTP 400. Files > 5MB trigger HTTP 413.
   - However, calling `cleanOldUserAvatars` before `fs.writeFileSync` in `saveUserAvatar` violates the atomicity requirement that old files be retained if the upload fails. Moving cleanup to occur after `fs.writeFileSync` and filtering out the new filename prevents accidental data loss.

4. **Serving & Cache Management**:
   - The route handler `app/uploads/avatars/[filename]/route.ts` prevents path traversal and serves files dynamically from `public/uploads/avatars/`.
   - Because Next.js static asset serving in `public/` can suffer from dev-server file caching latency, having this route handler ensures immediate HTTP 200 availability of freshly uploaded avatars.

5. **Cross-Component Synchronization**:
   - While `Sidebar` and `Header` components support rendering avatars with image fallbacks (`onError`), `DashboardLayout` fails to pass `userAvatar` and `userAvatarType` to them.
   - Adding these props and a `tatadana_profile_updated` event listener in `DashboardLayout` will complete the real-time synchronization loop across the entire UI.

---

## 3. Caveats

- **Supabase Sync**: In offline/local development, `createServerSupabaseClient` and `createAdminClient` fail silently within `try/catch`. This is expected behavior since TataDana operates in local persistent mode using `data/tatadana-db.json`.
- **Avatar Cache Busting**: When a user replaces their avatar, the new filename will have a distinct timestamp and random hash. However, when selecting or changing photos, passing a query parameter `?t=${Date.now()}` ensures the browser ignores any intermediate client cache.
- **Seed Avatar for Admin**: `createInitialSeed()` does not define an explicit avatar for superadmin, but existing `data/tatadana-db.json` already has `"avatar_url": "💰"`. If the JSON file is ever wiped and regenerated, `createInitialSeed()` should include `avatar_url: '🧑‍💼', avatar_type: 'emoji'`.

---

## 4. Conclusion

The backend endpoints (`POST /api/profile/avatar`, `DELETE /api/profile/avatar`, `GET /uploads/avatars/[filename]`), validation engine (`lib/storage/image-validation.ts`), and storage engine (`lib/storage/avatar-storage.ts`) are structurally solid, authenticated, and secure.

To complete the implementation flawlessly, downstream agents should address three focused tasks:
1. **Storage Self-Cleaning Order (`lib/storage/avatar-storage.ts`)**: Update `saveUserAvatar` to save the new file first, and only delete previous files matching `avatar-${userId}-*` that do not match the newly saved filename.
2. **Dashboard Layout Props & Event Listener (`app/dashboard/layout.tsx`)**:
   - Pass `userAvatar={userAvatar}` and `userAvatarType={userAvatarType}` to `<Sidebar />`.
   - Pass `userAvatar={userAvatar}`, `userAvatarType={userAvatarType}`, and `userName={userName}` to `<Header />`.
   - Add `window.addEventListener('tatadana_profile_updated', ...)` to update local state immediately upon upload/deletion without page reload.
3. **E2E Test Suite (`tests/e2e/profile-avatar.test.mjs`)**: Create the 15-scenario test suite per requirement R6 and register it into `scripts/verify-all.mjs`.

---

## 5. Verification Method

To independently verify all findings and validate future changes:

### 5.1 Direct Endpoint Checks (Node / HTTP)
1. **Unauthenticated Denial (HTTP 401)**:
   ```bash
   node -e "fetch('http://localhost:3000/api/profile/avatar', { method: 'POST' }).then(r => console.log('POST unauth:', r.status))"
   node -e "fetch('http://localhost:3000/api/profile/avatar', { method: 'DELETE' }).then(r => console.log('DELETE unauth:', r.status))"
   ```
   *Expected*: Status `401` on both.

2. **Serving Route**:
   Inspect `app/uploads/avatars/[filename]/route.ts` and verify it serves files with `Content-Type: image/jpeg`, `image/png`, or `image/webp`.

### 5.2 Layout File Inspection
Inspect `app/dashboard/layout.tsx` around lines 320–345 to verify if `userAvatar` and `userAvatarType` props are supplied to `<Sidebar />` and `<Header />`.

### 5.3 Automated Verification Runner
Run the master verification runner:
```powershell
node scripts/verify-all.mjs
```
*Expected*: All test suites pass. Once `tests/e2e/profile-avatar.test.mjs` is registered, total tests should exceed 100 test cases with 100% pass rate.
