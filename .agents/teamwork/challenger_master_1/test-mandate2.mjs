import assert from 'node:assert/strict';

console.log('--- TESTING BUDGET THRESHOLD BOUNDARY CONDITIONS ---');

function evaluateBudgetThreshold(limit, spent) {
  const rawRatio = limit > 0 ? (spent / limit) : 0;
  const percentage = limit > 0 ? Number(((spent / limit) * 100).toFixed(1)) : 0;

  let status = 'safe';
  if (rawRatio >= 1.0 || spent >= limit) {
    status = 'overbudget';
  } else if (rawRatio >= 0.8 && rawRatio < 1.0) {
    status = 'warning';
  } else {
    status = 'safe';
  }

  return { percentage, status, rawRatio };
}

// 1. 79.9% -> Aman (safe)
const t799 = evaluateBudgetThreshold(1000000, 799000);
console.log('Case 79.9%:', t799);
assert.equal(t799.percentage, 79.9);
assert.equal(t799.status, 'safe');
console.log('✅ PASS: 79.9% evaluates to safe (Aman)');

// 2. 80.0% -> Peringatan (warning)
const t800 = evaluateBudgetThreshold(1000000, 800000);
console.log('Case 80.0%:', t800);
assert.equal(t800.percentage, 80.0);
assert.equal(t800.status, 'warning');
console.log('✅ PASS: 80.0% evaluates to warning (Peringatan)');

// 3. 99.9% -> Peringatan (warning)
const t999 = evaluateBudgetThreshold(1000000, 999000);
console.log('Case 99.9%:', t999);
assert.equal(t999.percentage, 99.9);
assert.equal(t999.status, 'warning');
console.log('✅ PASS: 99.9% evaluates to warning (Peringatan)');

// 4. 100.0% -> Overbudget (overbudget)
const t1000 = evaluateBudgetThreshold(1000000, 1000000);
console.log('Case 100.0%:', t1000);
assert.equal(t1000.percentage, 100.0);
assert.equal(t1000.status, 'overbudget');
console.log('✅ PASS: 100.0% evaluates to overbudget (Overbudget)');

console.log('\n🎉 ALL BUDGET THRESHOLD BOUNDARY TESTS PASSED!');
