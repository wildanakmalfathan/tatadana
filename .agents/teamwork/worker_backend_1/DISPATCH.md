## 2026-10-17T12:41:11Z
You are worker_backend_1 (Backend Storage & Database Worker).
Working directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_backend_1\
Orchestrator Conversation ID: 2106af9f-38cf-4dfe-a1c2-e802ea589fd5
Authoritative Request: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md
Project Plan & Architecture: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md
Survey Handoff Reference: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_survey_1\handoff.md

Exclusive Write Ownership:
- `lib/storage/avatar-storage.ts`
- `lib/storage/image-validation.ts`
- `app/api/profile/avatar/route.ts`
- `app/uploads/avatars/[filename]/route.ts`
- `lib/db/store.ts`
DO NOT write to any other source files outside your ownership boundary.

Task Description:
Implement and verify all backend image storage, validation, upload/delete API, and database binding features (R1 & R2):
1. In `lib/storage/avatar-storage.ts`:
   - Fix the self-cleaning sequence in `saveUserAvatar`: save the new file to `public/uploads/avatars/` FIRST. Only after `fs.writeFileSync` succeeds, invoke `cleanOldUserAvatars(userId, newFilename)` which deletes old files matching prefix `avatar-${userId}-*` but preserves `newFilename`. This guarantees atomicity.
   - Ensure safe filename parsing, path traversal prevention, and proper directory creation (`fs.mkdirSync` recursive).
2. In `lib/storage/image-validation.ts`:
   - Confirm binary magic byte verification for JPEG (`FF D8 FF`), PNG (`89 50 4E 47 0D 0A 1A 0A`), and WebP (`RIFF` ... `WEBP`), and size check <= 5MB (`5 * 1024 * 1024`).
3. In `app/api/profile/avatar/route.ts`:
   - Ensure `POST` handles multipart `formData`, session validation via `extractSessionToken`, token-bound `resolveUserId` (rejecting unauthenticated requests with HTTP 401), image buffer validation, storage saving, and atomic update of `StoredUser` in `PersistentStore` and Supabase.
   - Ensure `DELETE` strictly verifies session, cleans user's avatar files on disk, and resets `avatar_url: '🧑‍💼'` and `avatar_type: 'emoji'` in `PersistentStore`.
4. In `app/uploads/avatars/[filename]/route.ts`:
   - Confirm dynamic file serving route checks traversal, serves file with matching `Content-Type: image/jpeg | image/png | image/webp`, `Content-Length`, and `Cache-Control`.
5. In `lib/db/store.ts`:
   - Verify `StoredUser` interface contains `avatar_url?: string | null` and `avatar_type?: 'uploaded' | 'emoji' | null`, and default user creation seeds them properly.
