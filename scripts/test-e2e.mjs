#!/usr/bin/env node

/**
 * ==============================================================================
 * TataDana Automated End-to-End Test Suite Runner (scripts/test-e2e.mjs)
 * ==============================================================================
 * Executes comprehensive multi-tier test suites across Tiers 1–4:
 * - Tier 1: Feature Isolation Coverage (R1–R6)
 * - Tier 2: Boundary & Corner Cases (79% vs 80% vs 99% vs 100%, 0 balance, unauth)
 * - Tier 3: Cross-Feature Integration Chains (Transaction -> Alert -> Calendar -> Wallet)
 * - Tier 4: Real-World Comprehensive Indonesian User Journey
 * ==============================================================================
 */

import { registry, colors } from '../tests/e2e/common.mjs';
import { runTier1Tests } from '../tests/e2e/tier1-features.test.mjs';
import { runTier2Tests } from '../tests/e2e/tier2-boundary.test.mjs';
import { runTier3Tests } from '../tests/e2e/tier3-combinations.test.mjs';
import { runTier4Tests } from '../tests/e2e/tier4-scenarios.test.mjs';

async function main() {
  console.log(`${colors.bright}${colors.emerald}`);
  console.log('   ______        __        ____                   ');
  console.log('  /_  __/__ ____/ /____ _ / __ \\ ___ _ ___  ___ _ ');
  console.log('   / / / _ `/ _  // _ `/ / /_/ // _ `// _ \\/ _ `/ ');
  console.log('  /_/  \\_,_/\\_,_/ \\_,_/ /_____/ \\_,_//_//_/\\_,_/  ');
  console.log('          E2E Automated Verification Runner       ');
  console.log(`${colors.reset}`);

  // Register Tier 1 Tests
  await runTier1Tests();

  // Register Tier 2 Tests
  await runTier2Tests();

  // Register Tier 3 Tests
  await runTier3Tests();

  // Register Tier 4 Tests
  await runTier4Tests();

  // Execute all suites
  const results = await registry.runAll();

  if (!results.success) {
    console.error(`${colors.bright}${colors.red}❌ E2E Test Suite FAILED: ${results.totalFailed} test(s) failed.${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`${colors.bright}${colors.green}✅ All E2E Test Suites PASSED successfully (${results.totalPassed} tests).${colors.reset}`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error(`${colors.bright}${colors.red}Fatal Runner Error:${colors.reset}`, err);
  process.exit(1);
});
