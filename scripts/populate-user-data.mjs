// scripts/populate-user-data.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DB_FILE = path.join(process.cwd(), 'data', 'tatadana-db.json');
const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

const targetUserId = '67fb270e-6748-40df-91f8-d055f8f16c15'; // wildan fathan
const adminId = '00000000-0000-0000-0000-000000000001';

const user = db.users.find((u) => u.id === targetUserId);

if (!user) {
  console.error('Target user wildan fathan not found');
  process.exit(1);
}

console.log('Populating rock-solid data for user:', user.name, user.email);

// 0. Ensure user attributes are properly defined
user.role = 'user';
user.plan = 'pro';
user.status = 'active';

// 1. Fix Cross-User Anomaly and Orphan Transactions
for (const tx of db.transactions) {
  // Fix cross-user leakage: transaction a33e73a0 was admin tx pointing to wildan's bca wallet
  if (tx.id === 'a33e73a0-ed38-4ced-9b1d-c4250b42ed14') {
    tx.wallet_id = 'w-admin-bca';
    tx.category_id = 'cat-makan';
  }
  // Fix orphan wallet 'w-1'
  if (tx.wallet_id === 'w-1') {
    tx.wallet_id = 'w-admin-bca';
    if (tx.category_id === 'c-1') tx.category_id = 'cat-makan';
  }
}

// 2. Categories for Wildan Fathan (Unified Standard String IDs)
const now = new Date().toISOString();
db.categories = db.categories.filter((c) => c.user_id !== targetUserId);

const standardUserCategories = [
  { id: 'cat-makan', user_id: targetUserId, name: 'Makanan & Minuman', type: 'expense', emoji: '🍔', color: '#F97316', budget_amount: 2000000, is_system: true, created_at: now, updated_at: now },
  { id: 'cat-trans', user_id: targetUserId, name: 'Transportasi', type: 'expense', emoji: '🚗', color: '#3B82F6', budget_amount: 750000, is_system: true, created_at: now, updated_at: now },
  { id: 'cat-tagih', user_id: targetUserId, name: 'Tagihan & Utilitas', type: 'expense', emoji: '⚡', color: '#EF4444', budget_amount: 1500000, is_system: true, created_at: now, updated_at: now },
  { id: 'cat-belanja', user_id: targetUserId, name: 'Belanja', type: 'expense', emoji: '🛍️', color: '#8B5CF6', budget_amount: 1000000, is_system: true, created_at: now, updated_at: now },
  { id: 'cat-hiburan', user_id: targetUserId, name: 'Hiburan', type: 'expense', emoji: '🎬', color: '#EC4899', budget_amount: 500000, is_system: true, created_at: now, updated_at: now },
  { id: 'cat-gaji', user_id: targetUserId, name: 'Gaji Pokok', type: 'income', emoji: '💰', color: '#10B981', budget_amount: 0, is_system: true, created_at: now, updated_at: now },
  { id: 'cat-freelance', user_id: targetUserId, name: 'Freelance & Bisnis', type: 'income', emoji: '💻', color: '#06B6D4', budget_amount: 0, is_system: true, created_at: now, updated_at: now },
];
db.categories.push(...standardUserCategories);

// 3. Wallets for Wildan Fathan (R2: BCA Rp8.500.000, Cash Rp450.000, GoPay Rp1.500.000 = Total Rp10.450.000)
const bcaId = '35ed38ca-e9fb-440f-8e4f-f97a7d0beb7f';
const cashId = 'ebd718e6-6374-480e-a832-cca9ee9bf0ab';
const gopayId = 'gopay-wildan-fathan-01';

db.wallets = db.wallets.filter((w) => w.user_id !== targetUserId);

db.wallets.push(
  {
    id: bcaId,
    user_id: targetUserId,
    name: 'BCA Utama',
    type: 'bank',
    balance: 8500000,
    account_number: '1400085412',
    is_default: true,
    is_default_telegram: true,
    icon: '🏦',
    color: '#0066AE',
    created_at: now,
    updated_at: now,
  },
  {
    id: cashId,
    user_id: targetUserId,
    name: 'Cash Dompet',
    type: 'cash',
    balance: 450000,
    account_number: 'Uang Fisik',
    is_default: false,
    is_default_telegram: false,
    icon: '💵',
    color: '#10B981',
    created_at: now,
    updated_at: now,
  },
  {
    id: gopayId,
    user_id: targetUserId,
    name: 'GoPay / OVO',
    type: 'ewallet',
    balance: 1500000,
    account_number: '085643410551',
    is_default: false,
    is_default_telegram: false,
    icon: '📱',
    color: '#00AED6',
    created_at: now,
    updated_at: now,
  }
);

// 4. Multi-Period Budgets for Wildan Fathan & Superadmin
db.budgets = (db.budgets || []).filter((b) => b.user_id !== targetUserId);

const targetBudgetConfigs = [
  // Makanan & Minuman
  { cat: 'cat-makan', period: 'daily', limit: 75000 },
  { cat: 'cat-makan', period: 'weekly', limit: 500000 },
  { cat: 'cat-makan', period: 'monthly', limit: 2000000 },
  // Transportasi
  { cat: 'cat-trans', period: 'daily', limit: 35000 },
  { cat: 'cat-trans', period: 'weekly', limit: 200000 },
  { cat: 'cat-trans', period: 'monthly', limit: 750000 },
  // Tagihan & Utilitas
  { cat: 'cat-tagih', period: 'daily', limit: 50000 },
  { cat: 'cat-tagih', period: 'weekly', limit: 350000 },
  { cat: 'cat-tagih', period: 'monthly', limit: 1500000 },
  // Belanja Bulanan
  { cat: 'cat-belanja', period: 'daily', limit: 50000 },
  { cat: 'cat-belanja', period: 'weekly', limit: 300000 },
  { cat: 'cat-belanja', period: 'monthly', limit: 1000000 },
  // Hiburan
  { cat: 'cat-hiburan', period: 'daily', limit: 25000 },
  { cat: 'cat-hiburan', period: 'weekly', limit: 150000 },
  { cat: 'cat-hiburan', period: 'monthly', limit: 500000 },
];

for (const b of targetBudgetConfigs) {
  db.budgets.push({
    id: `budget-wf-${b.period}-${b.cat}`,
    user_id: targetUserId,
    category_id: b.cat,
    period: b.period,
    limit_amount: b.limit,
    amount: b.limit,
    month: 10,
    year: 2026,
    alert_80_sent: false,
    alert_100_sent: false,
    created_at: now,
    updated_at: now,
  });
}

// Also ensure Superadmin has corresponding budgets in db.budgets
const adminBudgetsCount = db.budgets.filter((b) => b.user_id === adminId).length;
if (adminBudgetsCount === 0) {
  for (const b of targetBudgetConfigs) {
    db.budgets.push({
      id: `budget-admin-${b.period}-${b.cat}`,
      user_id: adminId,
      category_id: b.cat,
      period: b.period,
      limit_amount: b.limit,
      amount: b.limit,
      month: 10,
      year: 2026,
      alert_80_sent: false,
      alert_100_sent: false,
      created_at: now,
      updated_at: now,
    });
  }
}

// 5. Transactions for Wildan Fathan (Single Source of Truth Ledger Reconciliation)
db.transactions = db.transactions.filter((t) => t.user_id !== targetUserId);

const userTransactions = [
  // --- INCOMES TO BCA UTAMA ---
  {
    day: '01',
    time: '08:30',
    type: 'income',
    amount: 15000000,
    wallet_id: bcaId,
    category_id: 'cat-gaji',
    notes: 'Gaji Pokok PT Digital Finansial Nusantara',
    source: 'web',
  },
  {
    day: '15',
    time: '16:00',
    type: 'income',
    amount: 2500000,
    wallet_id: bcaId,
    category_id: 'cat-freelance',
    notes: 'Termin 1 Proyek Desain UI/UX Web Fintech',
    source: 'web',
  },

  // --- TRANSFERS FROM BCA TO LIQUID WALLETS ---
  {
    day: '01',
    time: '10:00',
    type: 'transfer',
    amount: 1000000,
    wallet_id: bcaId,
    destination_wallet_id: cashId,
    notes: 'Tarik tunai ATM BCA untuk uang pegangan dompet fisik',
    source: 'web',
  },
  {
    day: '01',
    time: '10:30',
    type: 'transfer',
    amount: 2500000,
    wallet_id: bcaId,
    destination_wallet_id: gopayId,
    notes: 'Top up saldo GoPay via BCA Virtual Account',
    source: 'web',
  },

  // --- EXPENSES FROM BCA UTAMA (Total: Rp5.500.000) ---
  {
    day: '02',
    time: '19:15',
    type: 'expense',
    amount: 1850000,
    wallet_id: bcaId,
    category_id: 'cat-belanja',
    notes: 'Belanja bulanan kebutuhan rumah & dapur Supermarket',
    source: 'web',
  },
  {
    day: '08',
    time: '20:00',
    type: 'expense',
    amount: 1250000,
    wallet_id: bcaId,
    category_id: 'cat-tagih',
    notes: 'Bayar tagihan listrik PLN Token & Wi-Fi IndiHome',
    source: 'web',
  },
  {
    day: '10',
    time: '19:30',
    type: 'expense',
    amount: 480000,
    wallet_id: bcaId,
    category_id: 'cat-makan',
    notes: 'Makan malam keluarga di resto seafood Sunda',
    source: 'web',
  },
  {
    day: '13',
    time: '09:00',
    type: 'expense',
    amount: 750000,
    wallet_id: bcaId,
    category_id: 'cat-tagih',
    notes: 'Premi asuransi kesehatan Prudential & BPJS Ketenagakerjaan',
    source: 'web',
  },
  {
    day: '20',
    time: '10:00',
    type: 'expense',
    amount: 850000,
    wallet_id: bcaId,
    category_id: 'cat-belanja',
    notes: 'Beli mechanical keyboard wireless & mouse ergonomis',
    source: 'web',
  },
  {
    day: '23',
    time: '18:00',
    type: 'expense',
    amount: 320000,
    wallet_id: bcaId,
    category_id: 'cat-hiburan',
    notes: 'Tiket konser mini musik akustik & merchandise',
    source: 'web',
  },

  // --- EXPENSES FROM CASH DOMPET (Total: Rp550.000, Inflow: Rp1.000.000 -> Sisa Rp450.000) ---
  {
    day: '03',
    time: '12:45',
    type: 'expense',
    amount: 35000,
    wallet_id: cashId,
    category_id: 'cat-makan',
    notes: 'Makan siang ayam geprek sambal bawang',
    source: 'web',
  },
  {
    day: '07',
    time: '12:30',
    type: 'expense',
    amount: 42000,
    wallet_id: cashId,
    category_id: 'cat-makan',
    notes: 'Makan siang nasi rames komplit warteg',
    source: 'web',
  },
  {
    day: '11',
    time: '14:15',
    type: 'expense',
    amount: 250000,
    wallet_id: cashId,
    category_id: 'cat-trans',
    notes: 'Servis motor ganti oli & kampas rem di bengkel resmi',
    source: 'web',
  },
  {
    day: '16',
    time: '13:00',
    type: 'expense',
    amount: 38000,
    wallet_id: cashId,
    category_id: 'cat-makan',
    notes: 'Makan siang nasi Padang rendang',
    source: 'web',
  },
  {
    day: '19',
    time: '08:30',
    type: 'expense',
    amount: 75000,
    wallet_id: cashId,
    category_id: 'cat-belanja',
    notes: 'Belanja sayur & buah pasar tradisional',
    source: 'web',
  },
  {
    day: '22',
    time: '19:45',
    type: 'expense',
    amount: 45000,
    wallet_id: cashId,
    category_id: 'cat-makan',
    notes: 'Makan malam sate ayam Madura & lontong',
    source: 'web',
  },
  {
    day: '24',
    time: '16:00',
    type: 'expense',
    amount: 65000,
    wallet_id: cashId,
    category_id: 'cat-trans',
    notes: 'Parkir & biaya cuci motor',
    source: 'web',
  },

  // --- EXPENSES FROM GOPAY (Total: Rp1.000.000, Inflow: Rp2.500.000 -> Sisa Rp1.500.000) ---
  {
    day: '04',
    time: '08:00',
    type: 'expense',
    amount: 35000,
    wallet_id: gopayId,
    category_id: 'cat-trans',
    notes: 'Ongkos GoRide ke kantor',
    source: 'web',
  },
  {
    day: '05',
    time: '07:15',
    type: 'expense',
    amount: 150000,
    wallet_id: gopayId,
    category_id: 'cat-trans',
    notes: 'Isi saldo e-Toll Mandiri & bensin Pertamax via GoPay',
    source: 'web',
  },
  {
    day: '10',
    time: '10:15',
    type: 'expense',
    amount: 68500,
    wallet_id: gopayId,
    category_id: 'cat-belanja',
    notes: 'Belanja minimarket Indomaret (Foto Struk AI)',
    source: 'telegram_photo',
    isReceipt: true,
  },
  {
    day: '12',
    time: '11:00',
    type: 'expense',
    amount: 100000,
    wallet_id: gopayId,
    category_id: 'cat-tagih',
    notes: 'Beli pulsa dan kuota data Telkomsel 50GB',
    source: 'web',
  },
  {
    day: '14',
    time: '12:15',
    type: 'expense',
    amount: 58000,
    wallet_id: gopayId,
    category_id: 'cat-makan',
    notes: 'Pesan GoFood mie ayam bakso spesial',
    source: 'web',
  },
  {
    day: '17',
    time: '16:30',
    type: 'expense',
    amount: 213500,
    wallet_id: gopayId,
    category_id: 'cat-belanja',
    notes: 'Belanja kebutuhan harian Tokopedia via GoPay',
    source: 'web',
  },
  {
    day: '18',
    time: '15:30',
    type: 'expense',
    amount: 150000,
    wallet_id: gopayId,
    category_id: 'cat-trans',
    notes: 'Beli helm dan sarung tangan motor di e-commerce',
    source: 'web',
  },
  {
    day: '25',
    time: '19:00',
    type: 'expense',
    amount: 125000,
    wallet_id: gopayId,
    category_id: 'cat-hiburan',
    notes: 'Tiket bioskop XXI premiere & popcorn via GoTix',
    source: 'web',
  },
  {
    day: '26',
    time: '20:00',
    type: 'expense',
    amount: 100000,
    wallet_id: gopayId,
    category_id: 'cat-hiburan',
    notes: 'Langganan Spotify Premium & voucher game',
    source: 'web',
  },
];

for (const tx of userTransactions) {
  db.transactions.push({
    id: crypto.randomUUID(),
    user_id: targetUserId,
    wallet_id: tx.wallet_id,
    destination_wallet_id: tx.destination_wallet_id || null,
    category_id: tx.category_id || null,
    amount: tx.amount,
    type: tx.type,
    date: `2026-10-${tx.day}`,
    time: tx.time,
    notes: tx.notes,
    source: tx.source || 'web',
    receipt_image_url: tx.isReceipt ? '/images/receipts/sample-receipt.jpg' : null,
    is_multi_item: false,
    created_at: `2026-10-${tx.day}T${tx.time}:00.000Z`,
    updated_at: `2026-10-${tx.day}T${tx.time}:00.000Z`,
  });
}

// 6. Historical 5 Months (May to September 2026) for Bar Chart 6 Bulan
const historical = [
  { month: '05', income: 12500000, expense: 12500000 },
  { month: '06', income: 13000000, expense: 13000000 },
  { month: '07', income: 15000000, expense: 15000000 },
  { month: '08', income: 12500000, expense: 12500000 },
  { month: '09', income: 14000000, expense: 14000000 },
];

for (const h of historical) {
  // Income
  db.transactions.push({
    id: crypto.randomUUID(),
    user_id: targetUserId,
    wallet_id: bcaId,
    category_id: 'cat-gaji',
    amount: h.income,
    type: 'income',
    date: `2026-${h.month}-01`,
    time: '09:00',
    notes: `Gaji Bulanan Periode ${h.month}/2026`,
    source: 'web',
    is_multi_item: false,
    created_at: `2026-${h.month}-01T09:00:00.000Z`,
    updated_at: `2026-${h.month}-01T09:00:00.000Z`,
  });
  // Expense
  db.transactions.push({
    id: crypto.randomUUID(),
    user_id: targetUserId,
    wallet_id: bcaId,
    category_id: 'cat-belanja',
    amount: h.expense,
    type: 'expense',
    date: `2026-${h.month}-15`,
    time: '18:00',
    notes: `Total Belanja & Operasional ${h.month}/2026`,
    source: 'web',
    is_multi_item: false,
    created_at: `2026-${h.month}-15T18:00:00.000Z`,
    updated_at: `2026-${h.month}-15T18:00:00.000Z`,
  });
}

user.monthly_tx_count = userTransactions.length;

// Save atomic persistent database
fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');

// Verification of ledger sums
function computeWalletBalance(walletId) {
  let bal = 0;
  for (const t of db.transactions) {
    if (t.wallet_id === walletId) {
      if (t.type === 'income') bal += t.amount;
      else if (t.type === 'expense' || t.type === 'transfer') bal -= t.amount;
    } else if (t.destination_wallet_id === walletId && t.type === 'transfer') {
      bal += t.amount;
    }
  }
  return bal;
}

const bcaBal = computeWalletBalance(bcaId);
const cashBal = computeWalletBalance(cashId);
const gopayBal = computeWalletBalance(gopayId);

console.log('--- RECONCILIATION AUDIT ---');
console.log('BCA Utama Ledger Sum:', bcaBal, 'Expected: 8500000', bcaBal === 8500000 ? '✅ MATCH' : '❌ MISMATCH');
console.log('Cash Dompet Ledger Sum:', cashBal, 'Expected: 450000', cashBal === 450000 ? '✅ MATCH' : '❌ MISMATCH');
console.log('GoPay Ledger Sum:', gopayBal, 'Expected: 1500000', gopayBal === 1500000 ? '✅ MATCH' : '❌ MISMATCH');
console.log('Total Saldo:', bcaBal + cashBal + gopayBal, 'Expected: 10450000', (bcaBal + cashBal + gopayBal) === 10450000 ? '✅ MATCH' : '❌ MISMATCH');
console.log('✅ Successfully completed database & ledger integrity reconciliation!');
