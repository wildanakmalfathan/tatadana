# Plan: Real & Persistent Profile Photo Upload and Avatar Synchronization

## Objective
Implement end-to-end profile photo upload with persistent local storage, magic bytes validation, database binding, interactive UI in Settings with 1:1 preview, instant global layout synchronization (Sidebar, Header, DashboardLayout), dual-mode avatar system (uploaded photo vs 8 built-in emojis), and comprehensive 15-scenario E2E test suite integrated into `scripts/verify-all.mjs`.

## Team Structure (5 Specialized Subagents in Phased Execution)
1. **Explorers (Survey & Gap Analysis)**: Deep dive into existing auth, DB store, profile API, UI settings, layouts, and test suite.
2. **Worker 1 (Backend Core & DB)**: Implement persistent image storage engine, magic bytes validator, `/api/profile/avatar` (POST & DELETE), DB schema update (`avatar_url`, `avatar_type`), and profile API updates.
3. **Worker 2 (Frontend UI & Layout Sync)**: Implement settings page file picker, 1:1 preview with emerald border, action buttons, toast notifications, dual-mode avatar selector, and global layout sync in Sidebar, Header, DashboardLayout with cache-busting and event bus.
4. **Reviewer & Challenger**: Dual independent code review and adversarial test case execution verifying edge cases (magic bytes spoofing, 5MB limit, path traversal, multi-user isolation).
5. **Forensic Auditor**: Absolute zero-tolerance integrity audit (verifying genuine storage, real image buffers, real DB mutations, no dummy mocks or hardcoded checks).

## Phased Execution Plan
- **Phase 0: Survey & Project Mapping**
  - Spawn 3 parallel Explorers to map authoritative codebase facts.
  - Synthesize findings into `PROJECT.md` (Feature Inventory, Architecture, Interface Contracts, Code Layout).
- **Phase 1: Backend Storage & DB Schema (R1, R2, R5)**
  - Implement `/api/profile/avatar` (POST / DELETE).
  - Update `lib/db/store.ts` and `app/api/profile/route.ts`.
  - Self-cleaning old avatars and static route serving.
- **Phase 2: Frontend Settings UI & Global Layout Sync (R3, R4, R5)**
  - Native file picker with 1:1 circular preview and emerald ring.
  - Replace, Delete, Cancel, Upload & Save buttons with loading states and toast notifications.
  - Header & Sidebar profile photo rendering with `onError` fallback and instant cross-layout event synchronization.
- **Phase 3: E2E Verification Suite & Integration (R6)**
  - Implement `tests/e2e/profile-avatar.test.mjs` with all 15 scenarios.
  - Integrate into `scripts/verify-all.mjs` ensuring 100% pass rate across all suites.
- **Phase 4: Gate Verification & Forensic Audit**
  - Run independent Reviewers and Challengers.
  - Run Forensic Integrity Auditor.
  - Verify clean audit and approve gate.
- **Phase 5: Final Synthesis & Report to Parent**
