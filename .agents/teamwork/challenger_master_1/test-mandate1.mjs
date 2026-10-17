import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());
const dbPath = path.join(projectRoot, 'data', 'tatadana-db.json');

console.log('Loading DB from:', dbPath);
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('❌ FAIL:', msg);
    failures++;
  } else {
    console.log('✅ PASS:', msg);
  }
}

console.log('\n--- 1. WILDAN FATHAN USER & WALLET INTEGRITY ---');
const wildanUser = db.users.find(u => 
  u.name.toLowerCase().includes('wildan fathan') || 
  u.email.toLowerCase() === 'wildanoces123@gmail.com'
);

assert(!!wildanUser, `Wildan Fathan user found: ${wildanUser?.name} (${wildanUser?.email}) [ID: ${wildanUser?.id}]`);

const userWallets = db.wallets.filter(w => w.user_id === wildanUser?.id && !w.is_archived);
console.log('User wallets found:', userWallets.map(w => ({ id: w.id, name: w.name, type: w.type, balance: w.balance })));

const bcaWallet = userWallets.find(w => w.name.toLowerCase().includes('bca'));
const cashWallet = userWallets.find(w => w.name.toLowerCase().includes('cash') || w.name.toLowerCase().includes('dompet'));
const gopayWallet = userWallets.find(w => w.name.toLowerCase().includes('gopay'));

assert(!!bcaWallet, 'BCA wallet exists');
assert(bcaWallet?.balance === 8500000, `BCA balance == 8,500,000 (actual: ${bcaWallet?.balance})`);

assert(!!cashWallet, 'Cash wallet exists');
assert(cashWallet?.balance === 450000, `Cash balance == 450,000 (actual: ${cashWallet?.balance})`);

assert(!!gopayWallet, 'GoPay wallet exists');
assert(gopayWallet?.balance === 1500000, `GoPay balance == 1,500,000 (actual: ${gopayWallet?.balance})`);

const totalBalance = (bcaWallet?.balance || 0) + (cashWallet?.balance || 0) + (gopayWallet?.balance || 0);
assert(totalBalance === 10450000, `Total wallet balance == 10,450,000 (actual: ${totalBalance})`);

console.log('\n--- 2. LEDGER DIFF & ATOMIC RECONCILIATION ---');
// Verify computeWalletBalanceFromLedger logic
function computeWalletBalanceFromLedger(walletId, initialBalance = 0) {
  let balance = Math.round(initialBalance);
  for (const tx of db.transactions) {
    if (tx.wallet_id === walletId) {
      if (tx.type === 'income') balance += tx.amount;
      else if (tx.type === 'expense' || tx.type === 'transfer') balance -= tx.amount;
    } else if (tx.destination_wallet_id === walletId && tx.type === 'transfer') {
      balance += tx.amount;
    }
  }
  return Math.round(balance);
}

for (const w of userWallets) {
  // Let's compute from transactions
  const computed = computeWalletBalanceFromLedger(w.id, 0);
  const diff = w.balance - computed;
  console.log(`Wallet ${w.name} (${w.id}): stored = ${w.balance}, computedFromTx = ${computed}, diff = ${diff}`);
  assert(diff === 0, `Wallet ${w.name} diff is exactly 0 (actual diff: ${diff})`);
}

console.log('\n--- 3. NEGATIVE NUMBERS & FLOATING-POINT FRACTIONS ---');
let negativeWallets = 0;
let floatWallets = 0;
for (const w of db.wallets) {
  if (w.balance < 0) negativeWallets++;
  if (!Number.isInteger(w.balance)) floatWallets++;
}
assert(negativeWallets === 0, `Wallets with negative balance == 0 (actual: ${negativeWallets})`);
assert(floatWallets === 0, `Wallets with floating-point balance == 0 (actual: ${floatWallets})`);

let negativeTxs = 0;
let floatTxs = 0;
for (const tx of db.transactions) {
  if (tx.amount <= 0) negativeTxs++;
  if (!Number.isInteger(tx.amount)) floatTxs++;
}
assert(negativeTxs === 0, `Transactions with non-positive amount == 0 (actual: ${negativeTxs})`);
assert(floatTxs === 0, `Transactions with floating-point amount == 0 (actual: ${floatTxs})`);

console.log('\n--- 4. DATA INTEGRITY: ORPHANS, CROSS-USER & UNMATCHED CATEGORIES ---');
const walletMap = new Map(db.wallets.map(w => [w.id, w]));
const userMap = new Map(db.users.map(u => [u.id, u]));

let orphanWalletTxs = 0;
let crossUserTxs = 0;
let unmatchedCategoryTxs = 0;

for (const tx of db.transactions) {
  // Check source wallet
  if (tx.wallet_id) {
    const w = walletMap.get(tx.wallet_id);
    if (!w) {
      orphanWalletTxs++;
      console.error(`Orphan source wallet tx ${tx.id}: wallet_id ${tx.wallet_id} not found`);
    } else if (w.user_id !== tx.user_id) {
      crossUserTxs++;
      console.error(`Cross-user tx ${tx.id}: tx.user_id ${tx.user_id} != wallet.user_id ${w.user_id}`);
    }
  }

  // Check destination wallet if transfer
  if (tx.destination_wallet_id) {
    const dst = walletMap.get(tx.destination_wallet_id);
    if (!dst) {
      orphanWalletTxs++;
      console.error(`Orphan dest wallet tx ${tx.id}: dest ${tx.destination_wallet_id} not found`);
    } else if (dst.user_id !== tx.user_id) {
      crossUserTxs++;
      console.error(`Cross-user transfer ${tx.id}: tx.user_id ${tx.user_id} != dest.user_id ${dst.user_id}`);
    }
  }

  // Check category
  if (tx.category_id) {
    const userCats = db.categories.filter(c => c.user_id === tx.user_id);
    const catMatch = userCats.find(c => c.id === tx.category_id || c.name.toLowerCase() === tx.category_id.toLowerCase());
    
    // Also check standard / system categories fallback as LedgerService does
    const systemCats = db.categories.filter(c => c.user_id === '00000000-0000-0000-0000-000000000001');
    const systemMatch = systemCats.find(c => c.id === tx.category_id || c.name.toLowerCase() === tx.category_id.toLowerCase());

    const standardCodes = ['cat-makan', 'cat-trans', 'cat-tagih', 'cat-belanja', 'cat-hiburan', 'cat-gaji', 'cat-freelance', 'c-1', 'c-2', 'c-3', 'c-4', 'c-5'];
    const isStandardCode = standardCodes.includes(tx.category_id);

    if (!catMatch && !systemMatch && !isStandardCode) {
      unmatchedCategoryTxs++;
      console.error(`Unmatched category tx ${tx.id}: category_id ${tx.category_id} not in user, system, or standard`);
    }
  }
}

assert(orphanWalletTxs === 0, `Orphan wallet transactions == 0 (actual: ${orphanWalletTxs})`);
assert(crossUserTxs === 0, `Cross-user transactions == 0 (actual: ${crossUserTxs})`);
assert(unmatchedCategoryTxs === 0, `Unmatched category transactions == 0 (actual: ${unmatchedCategoryTxs})`);

console.log('\n--- MANDATE 1 SUMMARY ---');
if (failures === 0) {
  console.log('🎉 ALL MANDATE 1 CHECKS PASSED PERFECTLY!');
  process.exit(0);
} else {
  console.error(`💥 MANDATE 1 FAILED WITH ${failures} ERRORS!`);
  process.exit(1);
}
