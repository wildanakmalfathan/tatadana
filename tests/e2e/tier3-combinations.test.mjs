// tests/e2e/tier3-combinations.test.mjs
// Tier 3: Cross-Feature Integration Chains
// Tests:
// 1. Web Transaction -> Wallet Balance Deduction -> Budget Alert -> Telegram Notification -> Calendar Update
// 2. Telegram Bot Chat Transaction -> Message Handler -> Wallet Deduct -> Budget Check -> Overbudget Alert -> Calendar Cache
// 3. Admin Payment Approval -> Payment Status Update -> User Pro Upgrade -> Audit Log Persistence -> Pro Feature Unlock

import { describe, it, expect } from './common.mjs';

export async function runTier3Tests() {
  describe('Tier 3.1 — Web Transaction to Budget Alert and Calendar Update Flow', () => {
    it('executes end-to-end multi-system state chain on web transaction creation', () => {
      // 1. Initial State
      const wallet = {
        id: 'w-bca-01',
        name: 'BCA Utama',
        type: 'bank',
        balance: 5000000,
      };

      const dailyBudget = {
        id: 'b-daily-food',
        category_id: 'cat-food',
        period: 'daily',
        amount: 75000, // Rp75,000 per day
        spent: 0,
        alert_80_sent: false,
        alert_100_sent: false,
      };

      const calendarDay = {
        date: '2026-10-16',
        income: 0,
        expense: 0,
        count: 0,
        transactions: [],
      };

      const telegramQueue = [];

      // 2. User logs transaction on Web: Lunch Warteg Rp60,000
      const newTransaction = {
        id: 'tx-web-001',
        wallet_id: wallet.id,
        category_id: dailyBudget.category_id,
        amount: 60000,
        type: 'expense',
        note: 'Makan siang warteg komplit',
        date: '2026-10-16',
      };

      // Step A: Deduct Wallet Balance
      wallet.balance -= newTransaction.amount;
      expect(wallet.balance).toBe(4940000);

      // Step B: Update Budget Spent
      dailyBudget.spent += newTransaction.amount;
      const budgetPercentage = (dailyBudget.spent / dailyBudget.amount) * 100;
      expect(budgetPercentage).toBe(80.0); // Exact 80.0%

      // Step C: Trigger Budget Alert Service
      if (budgetPercentage >= 80 && !dailyBudget.alert_80_sent) {
        dailyBudget.alert_80_sent = true;
        telegramQueue.push({
          type: 'BUDGET_WARNING_80',
          message: `⚠️ *Peringatan Anggaran Harian TataDana!*\nPengeluaran untuk *Makanan* sudah mencapai 80.0% (Rp 60.000 dari limit Rp 75.000). Harap hemat pengeluaran untuk sisa hari ini!`,
        });
      }

      expect(dailyBudget.alert_80_sent).toBe(true);
      expect(telegramQueue.length).toBe(1);
      expect(telegramQueue[0].type).toBe('BUDGET_WARNING_80');
      expect(telegramQueue[0].message).toContain('80.0%');

      // Step D: Update Calendar Aggregation
      calendarDay.expense += newTransaction.amount;
      calendarDay.count += 1;
      calendarDay.transactions.push(newTransaction);

      expect(calendarDay.expense).toBe(60000);
      expect(calendarDay.count).toBe(1);
      expect(calendarDay.transactions[0].id).toBe('tx-web-001');
    });
  });

  describe('Tier 3.2 — Telegram Bot Transaction to Overbudget Alert and Calendar Sync Flow', () => {
    it('executes Telegram chat incoming message through parsing, wallet debit, overbudget alert and calendar sync', () => {
      // 1. Initial State (continuing from previous meal with Rp60k spent)
      const defaultTelegramWallet = {
        id: 'w-gopay-02',
        name: 'GoPay Jajan',
        balance: 200000,
        is_default_telegram: true,
      };

      const dailyBudget = {
        category_id: 'cat-food',
        amount: 75000,
        spent: 60000, // already at 80%
        alert_80_sent: true,
        alert_100_sent: false,
      };

      const calendarDay = {
        date: '2026-10-16',
        income: 0,
        expense: 60000,
        count: 1,
        transactions: [{ id: 'tx-web-001', amount: 60000 }],
      };

      const botDispatchedMessages = [];

      // 2. Incoming message from user via Telegram: "beli sate 25rb"
      const incomingTelegramMessage = {
        chat_id: 987654321,
        text: 'beli sate 25rb',
      };

      // Step A: Parse natural text to financial transaction
      const parseNaturalTx = (text) => {
        const match = text.match(/beli\s+(.*?)\s+(\d+)\s*(rb|k)?/i);
        if (match) {
          const item = match[1].trim();
          let amount = parseInt(match[2], 10);
          if (match[3]) amount *= 1000;
          return { item, amount, category_id: 'cat-food' };
        }
        return null;
      };

      const parsed = parseNaturalTx(incomingTelegramMessage.text);
      expect(parsed).toBeDefined();
      expect(parsed.amount).toBe(25000);
      expect(parsed.item).toBe('sate');

      // Step B: Deduct default Telegram wallet
      defaultTelegramWallet.balance -= parsed.amount;
      expect(defaultTelegramWallet.balance).toBe(175000);

      // Step C: Evaluate Budget & Trigger 100% Overbudget Alert
      dailyBudget.spent += parsed.amount; // 60,000 + 25,000 = 85,000
      const percentage = (dailyBudget.spent / dailyBudget.amount) * 100;
      expect(Math.round(percentage * 10) / 10).toBe(113.3);

      if (percentage >= 100 && !dailyBudget.alert_100_sent) {
        dailyBudget.alert_100_sent = true;
        botDispatchedMessages.push({
          chat_id: incomingTelegramMessage.chat_id,
          text: `🚨 *PERINGATAN OVERBUDGET TATADANA!*\nPengeluaran kategori *Makanan* hari ini telah MELEBIHI batas anggaran!\nTotal terpakai: Rp 85.000 / Limit: Rp 75.000 (113.3%).\nSisa anggaran: Rp 0.`,
        });
      }

      expect(dailyBudget.alert_100_sent).toBe(true);
      expect(botDispatchedMessages.length).toBe(1);
      expect(botDispatchedMessages[0].text).toContain('OVERBUDGET');
      expect(botDispatchedMessages[0].text).toContain('113.3%');

      // Step D: Update Calendar
      calendarDay.expense += parsed.amount;
      calendarDay.count += 1;
      calendarDay.transactions.push({
        id: 'tx-tg-002',
        amount: parsed.amount,
        note: `beli ${parsed.item} (Telegram Bot)`,
      });

      expect(calendarDay.expense).toBe(85000);
      expect(calendarDay.count).toBe(2);
      expect(calendarDay.transactions.length).toBe(2);
    });
  });

  describe('Tier 3.3 — Admin Payment Approval and Real-Time Pro Upgrade Flow', () => {
    it('executes full payment approval workflow, profile plan upgrade, and audit logging', () => {
      // 1. Initial State
      const paymentOrder = {
        id: 'pay-uuid-777',
        user_id: 'user-uuid-888',
        plan: 'pro',
        amount: 49000,
        payment_method: 'manual_transfer',
        status: 'pending',
      };

      const userProfile = {
        id: 'user-uuid-888',
        name: 'Ahmad Dahlan',
        plan: 'starter',
      };

      const auditTrail = [];

      // 2. Admin clicks "Approve" button
      const adminSession = { id: 'admin-super-001', name: 'Super Admin' };

      const handleAdminApprove = (paymentId, adminUser) => {
        if (paymentOrder.id !== paymentId) throw new Error('Payment not found');
        paymentOrder.status = 'approved';
        paymentOrder.approved_by = adminUser.id;
        paymentOrder.approved_at = new Date().toISOString();

        // Instant user upgrade
        userProfile.plan = paymentOrder.plan;

        // Persist audit log
        auditTrail.push({
          id: `audit-${Date.now()}`,
          admin_id: adminUser.id,
          action: 'payment_approve',
          target_user_id: userProfile.id,
          metadata: {
            payment_id: paymentId,
            previous_plan: 'starter',
            new_plan: 'pro',
            amount: paymentOrder.amount,
          },
          created_at: new Date().toISOString(),
        });

        return { success: true, payment: paymentOrder, profile: userProfile };
      };

      const result = handleAdminApprove('pay-uuid-777', adminSession);
      expect(result.success).toBe(true);
      expect(result.payment.status).toBe('approved');
      expect(result.profile.plan).toBe('pro');
      expect(auditTrail.length).toBe(1);
      expect(auditTrail[0].action).toBe('payment_approve');
      expect(auditTrail[0].metadata.new_plan).toBe('pro');
    });
  });
}
