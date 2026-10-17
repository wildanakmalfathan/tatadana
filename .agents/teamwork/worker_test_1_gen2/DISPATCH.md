## 2026-10-17T12:55:57Z
You are worker_test_1_gen2 (E2E Test Writer & Verification Worker).
Working directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_test_1_gen2\
Orchestrator Conversation ID: 2106af9f-38cf-4dfe-a1c2-e802ea589fd5
Authoritative Request: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md
Project Plan & Architecture: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md
Survey Handoff Reference: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_survey_3\handoff.md

Exclusive Write Ownership:
- `tests/e2e/profile-avatar.test.mjs`
- `scripts/verify-all.mjs`
DO NOT write to any other source files outside your ownership boundary.

Task Description:
Implement Milestone 4 (R6): Comprehensive E2E Verification Suite & Test Runner Integration:
1. In `tests/e2e/profile-avatar.test.mjs`:
   Implement all 15 required test scenarios based on the detailed architecture from `explorer_survey_3\handoff.md`:
   - Scenario 1: Upload valid JPG (persists on disk and in database)
   - Scenario 2: Upload valid PNG
   - Scenario 3: Upload valid WebP
   - Scenario 4: Reject non-image file (e.g. text/pdf) with HTTP 400
   - Scenario 5: Reject fake image (spoofed extension with non-image magic bytes) with HTTP 400
   - Scenario 6: Reject oversized file (>5MB) with HTTP 413 or 400
   - Scenario 7: Verifies profile avatar persists in database upon re-fetch and server reload
   - Scenario 8: Rejects unauthenticated avatar upload requests with HTTP 401 Unauthorized
   - Scenario 9: Enforces strict user isolation — User A cannot mutate User B avatar
   - Scenario 10: Self-cleans old avatar files from disk when new photo is uploaded
   - Scenario 11: DELETE /api/profile/avatar resets avatar to default emoji and removes physical file
   - Scenario 12: Switching to built-in emojis via PATCH /api/profile persists in database
   - Scenario 13: Serves uploaded avatar files statically with HTTP 200 and correct Content-Type
   - Scenario 14: Verifies Sidebar, Header, DashboardLayout, and Settings implement avatar references
   - Scenario 15: Verifies scripts/verify-all.mjs imports and executes profile-avatar suite with >= 105 gate
2. In `scripts/verify-all.mjs`:
   - Import `runProfileAvatarTests` from `../tests/e2e/profile-avatar.test.mjs`.
   - Register and execute `await runProfileAvatarTests()` in `main()`.
   - Update acceptance gate threshold from `>= 85` to `>= 105`.
   - Add Profile Photo Upload & Persistent Avatar System to the requirement verification matrix in `TEST_READY.md`.
3. Execution & Verification:
   - Run `node scripts/verify-all.mjs`.
   - Verify that all test suites pass 100% with at least 105+ passing test cases (0 failures).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Verification & Handoff:
- Document execution output, test counts, passing tests, and commands in `handoff.md`.
- Update your progress in `progress.md` with timestamp.
- Send a completion message to the orchestrator (`2106af9f-38cf-4dfe-a1c2-e802ea589fd5`).
