# Dispatch Log

## 2026-10-17T12:29:44Z
From: 00b021b9-f30f-485e-a798-909e4bc7c836 (parent)
Goal: Implement Real and Persistent Profile Photo Upload with Multi-Format Support, Storage Persistence, Global Layout Synchronization, and Preserved Built-in Avatars.

Requirements:
- R1: Persistent Image Storage Engine & Secure Upload API (/api/profile/avatar) supporting JPG, PNG, WebP up to 5MB with MIME & magic bytes validation, persistent storage in public/uploads/avatars/, self-cleaning old avatars, static serving, and DELETE endpoint reverting to default emoji.
- R2: Database Schema & User Profile Binding (lib/db/store.ts, /api/profile) supporting avatar_url and avatar_type ('uploaded' | 'emoji'), strictly verifying session token / resolveUserId.
- R3: Interactive UI File Selection & Preview in Settings (app/dashboard/settings/page.tsx) with native file picker, 1:1 circular preview with emerald border, loading state, replace, delete, cancel, and visual toast feedback.
- R4: Global Avatar Synchronization Across Layouts (Sidebar, Header, DashboardLayout) with dynamic fetching, cache-busting, tatadana_profile_updated event listener, and graceful error fallback.
- R5: Dual-Mode Avatar System (Upload Photo vs 8 Built-in Emojis) with seamless switching and persistent saving.
- R6: Comprehensive E2E Verification Suite (tests/e2e/profile-avatar.test.mjs) covering 15 scenarios, integrated into scripts/verify-all.mjs with 100% pass rate.
