# Dispatch: Worker 5 (QA, Bug Elimination & Master Verification Specialist — R6)

## Identity & Context
- Role: QA, Bug Elimination & Master Verification Specialist (R6)
- Working Directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_qa_verifier_6_5_gen2
- Project Root: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana
- Original Request File: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md (Refer to section ## 2026-10-17T16:59:31Z)
- Scope Document: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md
- Survey Findings: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_survey_6_3\handoff.md
- Predecessor Work: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_qa_verifier_6_5\progress.md

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Owned Files (Strict Boundaries)
- `app/api/profile/avatar/route.ts`
- `tests/*`
- `scripts/verify-all.mjs`
DO NOT modify files owned by other workers (`data/tatadana-db.json`, `app/dashboard/*`, `lib/telegram/*`, etc.).

## Objectives & Tasks
1. **Fix Avatar API TypeError Guard in `app/api/profile/avatar/route.ts`**:
   - Inspect line 60-70. When a non-file string is passed in FormData (`image="string"`), `file.arrayBuffer()` throws `TypeError: file.arrayBuffer is not a function`, producing HTTP 500.
   - Add a strict guard:
     `if (!file || typeof file === 'string' || typeof (file as any).arrayBuffer !== 'function')`
     Return HTTP 400 Bad Request with JSON: `{ success: false, error: "File gambar tidak valid" }`.
   - Run `node tests/stress/avatar-adversarial.mjs` and verify all 48 test scenarios pass.

2. **Sync Outdated Assertions in Test Suites**:
   - In `tests/e2e/challenger-adversarial.test.mjs` line 354:
     Scenario F expects HTTP 401, but the production `/api/auth/admin-login` endpoint returns HTTP 403 Forbidden for non-admin accounts. Update the assertion to accept HTTP 403 (or `[401, 403].includes(res.status)`).
   - In `tests/unit/backend-milestone1.test.mjs` line 196:
     Ensure the test passes cleanly.

3. **Master Verification Runner Execution**:
   - Run:
     ```powershell
     node scripts/verify-all.mjs
     ```
   - Verify 100% pass rate across all suites.

4. **Deliverables**:
   - Update `progress.md` continuously.
   - Write comprehensive `handoff.md` with: Observation, Logic Chain, Caveats, Conclusion, Verification Method.
   - Send completion message to orchestrator.


## 2026-10-17T17:44:46Z
[Message] timestamp=2026-10-17T17:44:46Z sender=bbd30c64-ee5e-47f5-a4b0-6f558ba15481 priority=MESSAGE_PRIORITY_HIGH content=You are Worker 5 (QA, Bug Elimination & Master Verification Specialist) for the TataDana Master Restoration project.
Working Directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_qa_verifier_6_5_gen2
Project Root: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana
Dispatch Instructions: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_qa_verifier_6_5_gen2\DISPATCH.md
Scope Document: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md
Original Request File: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md (Mandatory: Read section ## 2026-10-17T16:59:31Z)
Survey Report: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_survey_6_3\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Tasks:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. In app/api/profile/avatar/route.ts, add strict guard when a non-file string is passed in FormData: return HTTP 400 Bad Request instead of throwing a 500 TypeError. Verify with `node tests/stress/avatar-adversarial.mjs` (48/48 pass).
3. In tests/e2e/challenger-adversarial.test.mjs line 354, update assertion to accept HTTP 403 Forbidden.
4. Check tests/unit/backend-milestone1.test.mjs line 196 and ensure it passes.
5. Run the master verification test runner `node scripts/verify-all.mjs` and ensure 100% test pass rate.
6. Deliver handoff.md and send completion message to orchestrator.
