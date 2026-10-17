## 2026-10-17T17:15:28Z

# Dispatch: Milestone 5 — Worker 5 (QA, Bug Elimination & Master Verification Specialist)

## Role & Mission
You are Worker 5 in the 5-agent team for TataDana Master Restoration.
Your mission is to eliminate edge-case bugs, harden APIs, build comprehensive verification tests, and run the master verification runner `scripts/verify-all.mjs` ensuring 100% pass rate according to requirement R6.

## Mandatory Reading
- `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md` (Section ## 2026-10-17T16:59:31Z)
- `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\PROJECT.md`
- Survey report: `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_survey_6_3\survey_report.md`
- Survey report: `C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_survey_6_2\survey_report.md`

## File Ownership
You exclusively own and modify:
- `app/api/profile/avatar/route.ts` (edge-case error handling)
- `tests/*` (test suites)
- `scripts/verify-all.mjs` (test runner)

DO NOT touch UI dashboard pages or `data/tatadana-db.json` directly.

## Specific Tasks
1. **Fix Avatar API TypeError (`app/api/profile/avatar/route.ts`)**:
   - When a request sends a non-file string or invalid object in the multipart `image` field, currently calling `file.arrayBuffer()` throws a TypeError causing HTTP 500.
   - Add proper type checking: ensure `typeof file === 'object' && typeof file.arrayBuffer === 'function'`, otherwise return HTTP 400 Bad Request with a clear error message.
2. **Update Outdated Test Assertions**:
   - `tests/e2e/challenger-adversarial.test.mjs:354`: Update status expectation to HTTP 403 (Zero-Trust Admin Guard returns 403 Forbidden).
   - Any other failing tests identified in survey reports.
3. **Build Master Restoration E2E Test Suite (`tests/e2e/master-restoration.test.mjs`)**:
   - Test 1: User wallet integrity (BCA Rp8.5M, Cash Rp450k, GoPay Rp1.5M = Rp10.45M, no negative balances).
   - Test 2: Category enrichment (transactions enrich to valid category object, not null).
   - Test 3: Calendar API (`/api/transactions/calendar`) returns daily aggregates & itemized drawer items with wallet filter.
   - Test 4: Budget API (`/api/budgets`) returns Daily, Weekly, Monthly periods with dynamic spent and status (<80% safe, 80-99% warning, >=100% danger).
   - Test 5: Tata AI chat endpoint responds with polite Indonesian, 50/30/20 advice, and context.
   - Test 6: Avatar API rejects non-file with HTTP 400 without 500 crash.
4. **Wire into `scripts/verify-all.mjs`**:
   - Add `tests/e2e/master-restoration.test.mjs` to `scripts/verify-all.mjs`.
   - Run `scripts/verify-all.mjs` and ensure all test suites pass 100%.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Working Directory
`C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_qa_verifier_6_5`

## Output
Write `handoff.md` in your working directory and notify orchestrator_6 via `send_message`.
