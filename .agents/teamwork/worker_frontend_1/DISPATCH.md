## 2026-10-17T12:41:11Z
You are worker_frontend_1 (Frontend UI & Layout Synchronization Worker).
Working directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_frontend_1\
Orchestrator Conversation ID: 2106af9f-38cf-4dfe-a1c2-e802ea589fd5
Authoritative Request: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md
Project Plan & Architecture: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md
Survey Handoff Reference: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_survey_2\handoff.md

Exclusive Write Ownership:
- `components/layout/sidebar.tsx`
- `components/layout/header.tsx`
- `app/dashboard/layout.tsx`
- `app/dashboard/settings/page.tsx`
DO NOT write to any other source files outside your ownership boundary.

Task Description:
Implement and verify all frontend settings UI, preview, and global layout synchronization features (R3, R4, R5):
1. In `components/layout/sidebar.tsx`:
   - Extend `SidebarProps` with `userAvatar?: string` and `avatarType?: 'uploaded' | 'emoji'`.
   - Update the bottom user card to display the circular avatar:
     - When `avatarType === 'uploaded'` or `userAvatar` is a URL path/http, render `<img src={userAvatar} ... />` with circular border and `onError` fallback to user initial.
     - When `avatarType === 'emoji'`, render the emoji character with crisp typography.
     - Fallback gracefully if image fails to load.
2. In `components/layout/header.tsx`:
   - Extend `HeaderProps` with `userAvatar?: string`, `avatarType?: 'uploaded' | 'emoji'`, and `userName?: string`.
   - In the right-hand action bar of the header, add a circular profile avatar shortcut linking to `/dashboard/settings?tab=profile` with circular styling, image/emoji rendering, and fallback.
3. In `app/dashboard/layout.tsx`:
   - Pass `userAvatar={userAvatar}` and `avatarType={userAvatarType}` to `<Sidebar />`.
   - Pass `userAvatar={userAvatar}`, `avatarType={userAvatarType}`, and `userName={userName}` to `<Header />`.
   - Register an event listener for `tatadana_profile_updated` on `window` to update `userAvatar`, `userAvatarType`, and `userName` state dynamically when profile changes.
   - Hydrate `userAvatar` and `userAvatarType` from `localStorage` and `GET /api/profile`.
4. In `app/dashboard/settings/page.tsx`:
   - Verify native file picker (`accept="image/jpeg,image/png,image/webp"`), 1:1 circular preview with emerald border, upload spinner, replace, delete, cancel, and visual toast feedback.
   - In `handleSelectEmoji(emo)`: update it to call `PATCH /api/profile` immediately with `{ avatarUrl: emo, avatarType: 'emoji' }`, saving to DB, updating `localStorage`, and broadcasting `tatadana_profile_updated` so emoji changes take effect instantly.
