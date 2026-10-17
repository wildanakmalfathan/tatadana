// tests/e2e/common.mjs
// Unified test harness, assertion library, and server probe for TataDana E2E test suites

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = path.resolve(__dirname, '../../');

// Terminal color helpers
export const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  emerald: '\x1b[38;2;16;185;129m',
  gold: '\x1b[38;2;234;179;8m',
};

// Global test registry
export class TestRegistry {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
  }

  describe(name, fn) {
    const suite = {
      name,
      tests: [],
      passed: 0,
      failed: 0,
      duration: 0,
    };
    this.suites.push(suite);
    const prevSuite = this.currentSuite;
    this.currentSuite = suite;
    try {
      fn();
    } finally {
      this.currentSuite = prevSuite;
    }
  }

  test(name, fn) {
    if (!this.currentSuite) {
      this.describe('Default Suite', () => {
        this.currentSuite.tests.push({ name, fn, passed: false, error: null, duration: 0 });
      });
    } else {
      this.currentSuite.tests.push({ name, fn, passed: false, error: null, duration: 0 });
    }
  }

  async runAll() {
    const startTime = Date.now();
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;

    console.log(`\n${colors.bright}${colors.emerald}================================================================${colors.reset}`);
    console.log(`${colors.bright}${colors.emerald}          TataDana E2E Verification Engine — Suite Execution      ${colors.reset}`);
    console.log(`${colors.bright}${colors.emerald}================================================================${colors.reset}\n`);

    for (const suite of this.suites) {
      console.log(`${colors.bright}${colors.cyan}Suite: ${suite.name}${colors.reset}`);
      const suiteStart = Date.now();

      for (const t of suite.tests) {
        totalTests++;
        const testStart = Date.now();
        try {
          await t.fn();
          t.passed = true;
          t.duration = Date.now() - testStart;
          suite.passed++;
          totalPassed++;
          console.log(`  ${colors.green}✓${colors.reset} ${t.name} ${colors.dim}(${t.duration}ms)${colors.reset}`);
        } catch (err) {
          t.passed = false;
          t.error = err;
          t.duration = Date.now() - testStart;
          suite.failed++;
          totalFailed++;
          console.log(`  ${colors.red}✗${colors.reset} ${t.name} ${colors.dim}(${t.duration}ms)${colors.reset}`);
          console.log(`    ${colors.red}Error: ${err.message}${colors.reset}`);
          if (err.stack) {
            const stackLine = err.stack.split('\n')[1] || '';
            console.log(`    ${colors.dim}${stackLine.trim()}${colors.reset}`);
          }
        }
      }
      suite.duration = Date.now() - suiteStart;
      console.log('');
    }

    const totalDuration = Date.now() - startTime;
    console.log(`${colors.bright}${colors.emerald}----------------------------------------------------------------${colors.reset}`);
    console.log(`${colors.bright}Summary: ${colors.green}${totalPassed} passed${colors.reset}, ${totalFailed > 0 ? colors.red : colors.dim}${totalFailed} failed${colors.reset}, ${totalTests} total (${totalDuration}ms)`);
    console.log(`${colors.bright}${colors.emerald}----------------------------------------------------------------${colors.reset}\n`);

    return {
      totalTests,
      totalPassed,
      totalFailed,
      totalDuration,
      suites: this.suites,
      success: totalFailed === 0,
    };
  }
}

export const registry = new TestRegistry();
export const describe = (name, fn) => registry.describe(name, fn);
export const it = (name, fn) => registry.test(name, fn);
export const test = it;

// Assertion framework
export function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)} (${typeof expected}), but received ${JSON.stringify(actual)} (${typeof actual})`);
      }
    },
    toEqual(expected) {
      const actualStr = JSON.stringify(actual);
      const expectedStr = JSON.stringify(expected);
      if (actualStr !== expectedStr) {
        throw new Error(`Expected deep equality:\n  Expected: ${expectedStr}\n  Received: ${actualStr}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value, but received ${JSON.stringify(actual)}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy value, but received ${JSON.stringify(actual)}`);
      }
    },
    toBeDefined() {
      if (actual === undefined || actual === null) {
        throw new Error(`Expected defined value, but received ${actual}`);
      }
    },
    toBeUndefined() {
      if (actual !== undefined) {
        throw new Error(`Expected undefined, but received ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThan(expected) {
      if (!(actual > expected)) {
        throw new Error(`Expected ${actual} > ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      if (!(actual >= expected)) {
        throw new Error(`Expected ${actual} >= ${expected}`);
      }
    },
    toBeLessThan(expected) {
      if (!(actual < expected)) {
        throw new Error(`Expected ${actual} < ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected) {
      if (!(actual <= expected)) {
        throw new Error(`Expected ${actual} <= ${expected}`);
      }
    },
    toBeCloseTo(expected, delta = 0.001) {
      if (Math.abs(actual - expected) > delta) {
        throw new Error(`Expected ${actual} to be close to ${expected} within delta ${delta}`);
      }
    },
    toContain(sub) {
      if (typeof actual === 'string') {
        if (!actual.includes(sub)) {
          throw new Error(`Expected string to contain "${sub}"`);
        }
      } else if (Array.isArray(actual)) {
        if (!actual.includes(sub)) {
          throw new Error(`Expected array to contain item ${JSON.stringify(sub)}`);
        }
      } else {
        throw new Error(`toContain requires string or array, got ${typeof actual}`);
      }
    },
    toHaveProperty(prop) {
      if (!actual || typeof actual !== 'object' || !(prop in actual)) {
        throw new Error(`Expected object to have property "${prop}"`);
      }
    },
    toThrow(regex) {
      if (typeof actual !== 'function') {
        throw new Error(`toThrow requires a function, got ${typeof actual}`);
      }
      let threw = false;
      let caughtError = null;
      try {
        actual();
      } catch (err) {
        threw = true;
        caughtError = err;
      }
      if (!threw) {
        throw new Error(`Expected function to throw an error, but it returned normally.`);
      }
      if (regex && !regex.test(caughtError.message)) {
        throw new Error(`Expected error message matching ${regex}, but got "${caughtError.message}"`);
      }
    }
  };
}

// Live Server Probing Helper
export async function isServerOnline(baseUrl = 'http://localhost:3000', timeoutMs = 1200) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(baseUrl, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timer);
    return res.status < 500;
  } catch {
    return false;
  }
}

// File and Code Inspection Utilities
export function getFullPath(relPath) {
  return path.resolve(PROJECT_ROOT, relPath);
}

export function fileExists(relPath) {
  return fs.existsSync(getFullPath(relPath));
}

export function readFileSafe(relPath) {
  const full = getFullPath(relPath);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8');
}

export function assertFileExists(relPath) {
  if (!fileExists(relPath)) {
    throw new Error(`Required file does not exist: ${relPath}`);
  }
}

export function assertFileContains(relPath, substrings) {
  assertFileExists(relPath);
  const content = readFileSafe(relPath);
  for (const sub of substrings) {
    if (!content.includes(sub)) {
      throw new Error(`File "${relPath}" is missing expected content: "${sub}"`);
    }
  }
}

// Indonesian Currency Formatting
export function formatRupiah(amount) {
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}
