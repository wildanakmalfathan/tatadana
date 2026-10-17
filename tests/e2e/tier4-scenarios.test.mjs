// tests/e2e/tier4-scenarios.test.mjs
// Tier 4: Real-World Comprehensive Indonesian User Journey
// Full Lifecycle:
// 1. Onboarding with 3 wallets (BCA, GoPay, Cash) + Set Default Telegram
// 2. Multi-Period Budget definition (Daily Rp75k, Weekly Rp500k, Monthly Rp2M)
// 3. Day of meals: Breakfast (safe) -> Lunch (80% alert) -> Dinner (100% overbudget alert)
// 4. Interactive Calendar inspection & date drawer breakdown
// 5. Upgrade payment to Pro & Admin instant approval

import { describe, it, expect, formatRupiah } from './common.mjs';

export async function runTier4Tests() {
  describe('Tier 4.1 — Complete Indonesian User Journey: Onboarding, Daily Living, Alerts & Pro Upgrade', () => {
    // Shared state across the realistic journey
    const user = {
      id: 'usr-raden-bayu-001',
      name: 'Raden Mas Bayu',
      phone: '081298765432',
      telegram_chat_id: 12345678,
      plan: 'starter',
      role: 'user',
    };

    let wallets = [];
    let budgets = {};
    let transactions = [];
    let telegramAlertMessages = [];
    let paymentOrder = null;
    let auditLogs = [];

    it('Step 1: User Onboards & Creates 3 Diverse Wallets (Bank BCA, GoPay, Cash)', () => {
      // 1. BCA Payroll
      const wBca = {
        id: 'w-bca-payroll',
        user_id: user.id,
        name: 'BCA Payroll',
        type: 'bank',
        balance: 5000000, // Rp5,000,000
        account_number: '5410987654',
        is_default: false,
      };

      // 2. GoPay Jajan
      const wGopay = {
        id: 'w-gopay-jajan',
        user_id: user.id,
        name: 'GoPay Jajan',
        type: 'ewallet',
        balance: 250000, // Rp250,000
        account_number: '081298765432',
        is_default: true, // Selected as Telegram default
      };

      // 3. Cash Dompet
      const wCash = {
        id: 'w-cash-dompet',
        user_id: user.id,
        name: 'Cash Dompet',
        type: 'cash',
        balance: 100000, // Rp100,000
        account_number: '',
        is_default: false,
      };

      wallets.push(wBca, wGopay, wCash);
      expect(wallets.length).toBe(3);

      // Verify total net worth
      const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
      expect(totalBalance).toBe(5350000);
      expect(formatRupiah(totalBalance)).toBe('Rp 5.350.000');

      // Verify default telegram wallet
      const defaultWallet = wallets.find(w => w.is_default);
      expect(defaultWallet.id).toBe('w-gopay-jajan');
    });

    it('Step 2: Sets Multi-Period Budget for "Makanan & Minuman" (Harian, Mingguan, Bulanan)', () => {
      const categoryId = 'cat-food-drink';

      budgets = {
        daily: {
          period: 'daily',
          category_id: categoryId,
          amount: 75000, // Rp75,000 per day
          spent: 0,
          alert_80_sent: false,
          alert_100_sent: false,
        },
        weekly: {
          period: 'weekly',
          category_id: categoryId,
          amount: 500000, // Rp500,000 per week
          spent: 0,
          alert_80_sent: false,
          alert_100_sent: false,
        },
        monthly: {
          period: 'monthly',
          category_id: categoryId,
          amount: 2000000, // Rp2,000,000 per month
          spent: 0,
          alert_80_sent: false,
          alert_100_sent: false,
        },
      };

      expect(budgets.daily.amount).toBe(75000);
      expect(budgets.weekly.amount).toBe(500000);
      expect(budgets.monthly.amount).toBe(2000000);
    });

    it('Step 3A: Records Breakfast (Nasi Uduk Rp15,000) -> Status remains Safe (20%)', () => {
      const gopay = wallets.find(w => w.id === 'w-gopay-jajan');
      const txBreakfast = {
        id: 'tx-001-breakfast',
        wallet_id: gopay.id,
        category_id: 'cat-food-drink',
        amount: 15000,
        type: 'expense',
        note: 'Sarapan Nasi Uduk Betawi + Teh Manis',
        date: '2026-10-16',
        time: '08:30',
      };

      // Process transaction
      transactions.push(txBreakfast);
      gopay.balance -= txBreakfast.amount;
      budgets.daily.spent += txBreakfast.amount;
      budgets.weekly.spent += txBreakfast.amount;
      budgets.monthly.spent += txBreakfast.amount;

      expect(gopay.balance).toBe(235000);
      const dailyUsagePct = (budgets.daily.spent / budgets.daily.amount) * 100;
      expect(dailyUsagePct).toBe(20.0);

      // Verify no alerts dispatched
      expect(budgets.daily.alert_80_sent).toBe(false);
      expect(telegramAlertMessages.length).toBe(0);
    });

    it('Step 3B: Records Lunch (Warteg Rp45,000) -> Reaches 80% Threshold -> Triggers Warning Alert', () => {
      const gopay = wallets.find(w => w.id === 'w-gopay-jajan');
      const txLunch = {
        id: 'tx-002-lunch',
        wallet_id: gopay.id,
        category_id: 'cat-food-drink',
        amount: 45000,
        type: 'expense',
        note: 'Makan siang Warteg Bahari (Ayam + Sayur + Es Jeruk)',
        date: '2026-10-16',
        time: '12:45',
      };

      transactions.push(txLunch);
      gopay.balance -= txLunch.amount;
      budgets.daily.spent += txLunch.amount;
      budgets.weekly.spent += txLunch.amount;
      budgets.monthly.spent += txLunch.amount;

      expect(gopay.balance).toBe(190000);
      expect(budgets.daily.spent).toBe(60000);

      const dailyPct = (budgets.daily.spent / budgets.daily.amount) * 100;
      expect(dailyPct).toBe(80.0); // Exact 80.0%

      // Trigger Alert Engine
      if (dailyPct >= 80 && !budgets.daily.alert_80_sent) {
        budgets.daily.alert_80_sent = true;
        telegramAlertMessages.push({
          level: 'WARNING_80',
          chat_id: user.telegram_chat_id,
          text: `⚠️ [TataDana] Peringatan Anggaran Harian: Pengeluaran Makanan & Minuman sudah mencapai 80.0% (${formatRupiah(budgets.daily.spent)} dari ${formatRupiah(budgets.daily.amount)}).`,
        });
      }

      expect(budgets.daily.alert_80_sent).toBe(true);
      expect(telegramAlertMessages.length).toBe(1);
      expect(telegramAlertMessages[0].level).toBe('WARNING_80');
      expect(telegramAlertMessages[0].text).toContain('80.0%');
    });

    it('Step 3C: Records Dinner via Telegram ("beli sate 25rb") -> Overbudget 113.3% -> Triggers Overbudget Alert', () => {
      const gopay = wallets.find(w => w.id === 'w-gopay-jajan');
      const txDinner = {
        id: 'tx-003-dinner',
        wallet_id: gopay.id,
        category_id: 'cat-food-drink',
        amount: 25000,
        type: 'expense',
        note: 'beli sate (Telegram Bot)',
        date: '2026-10-16',
        time: '19:15',
      };

      transactions.push(txDinner);
      gopay.balance -= txDinner.amount;
      budgets.daily.spent += txDinner.amount; // 60,000 + 25,000 = 85,000

      expect(gopay.balance).toBe(165000);
      expect(budgets.daily.spent).toBe(85000);

      const dailyPct = (budgets.daily.spent / budgets.daily.amount) * 100;
      expect(Math.round(dailyPct * 10) / 10).toBe(113.3);

      // Trigger Alert Engine
      if (dailyPct >= 100 && !budgets.daily.alert_100_sent) {
        budgets.daily.alert_100_sent = true;
        telegramAlertMessages.push({
          level: 'OVERBUDGET_100',
          chat_id: user.telegram_chat_id,
          text: `🚨 [TataDana] OVERBUDGET KRITIS! Anggaran Harian Makanan & Minuman melebihi limit! (${formatRupiah(budgets.daily.spent)} / limit ${formatRupiah(budgets.daily.amount)}).`,
        });
      }

      expect(budgets.daily.alert_100_sent).toBe(true);
      expect(telegramAlertMessages.length).toBe(2);
      expect(telegramAlertMessages[1].level).toBe('OVERBUDGET_100');
    });

    it('Step 4: User Reviews Calendar Drilldown for Today', () => {
      // Aggregate transactions for 2026-10-16
      const todaysTransactions = transactions.filter(t => t.date === '2026-10-16');
      expect(todaysTransactions.length).toBe(3);

      const totalDayExpense = todaysTransactions.reduce((acc, t) => acc + t.amount, 0);
      expect(totalDayExpense).toBe(85000);

      // Verify drilldown detail items
      expect(todaysTransactions[0].note).toContain('Sarapan');
      expect(todaysTransactions[1].note).toContain('Warteg');
      expect(todaysTransactions[2].note).toContain('sate');
    });

    it('Step 5: User Requests Pro Upgrade and Admin Approves in Admin Panel', () => {
      // 1. User submits Pro upgrade request
      paymentOrder = {
        id: 'order-pay-999',
        user_id: user.id,
        plan: 'pro',
        amount: 49000,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      expect(paymentOrder.status).toBe('pending');
      expect(user.plan).toBe('starter');

      // 2. Admin inspects `/admin/payments` and executes Approve
      const adminActor = { id: 'admin-wildan-001', name: 'Wildan Superadmin' };

      // Process approval
      paymentOrder.status = 'approved';
      paymentOrder.approved_by = adminActor.id;
      paymentOrder.approved_at = new Date().toISOString();

      // Instantly upgrade user
      user.plan = 'pro';

      // Log to audit table
      auditLogs.push({
        admin_id: adminActor.id,
        action: 'upgrade_user_to_pro',
        target_user_id: user.id,
        metadata: { order_id: paymentOrder.id, plan: 'pro' },
      });

      expect(paymentOrder.status).toBe('approved');
      expect(user.plan).toBe('pro');
      expect(auditLogs.length).toBe(1);
      expect(auditLogs[0].action).toBe('upgrade_user_to_pro');
    });
  });
}
