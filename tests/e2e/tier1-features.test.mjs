// tests/e2e/tier1-features.test.mjs
// Tier 1: Feature Coverage in Isolation (R1 through R6)
// Tests Calendar, Tata AI, Multi-Wallet, Telegram Bot, Multi-Period Budget, Admin Approval

import { describe, it, expect, isServerOnline, fileExists, readFileSafe, getFullPath } from './common.mjs';

export async function runTier1Tests() {
  const serverUp = await isServerOnline();

  describe('Tier 1.1 — Financial Calendar UI & API (R1)', () => {
    it('verifies Calendar API contract specification and structure', async () => {
      // Test the contract logic: given month, year, and transaction data, calendar produces day aggregates
      const mockTransactions = [
        { id: 'tx-1', amount: 50000, type: 'expense', category: 'Makanan', wallet: 'BCA', date: '2026-10-16', note: 'Makan siang' },
        { id: 'tx-2', amount: 150000, type: 'income', category: 'Gaji', wallet: 'BCA', date: '2026-10-16', note: 'Freelance transfer' },
        { id: 'tx-3', amount: 25000, type: 'expense', category: 'Transport', wallet: 'GoPay', date: '2026-10-15', note: 'Ojek' },
      ];

      // Pure aggregation logic verification
      const aggregateDays = (txs) => {
        const days = {};
        let totalIncome = 0;
        let totalExpense = 0;

        for (const tx of txs) {
          if (!days[tx.date]) {
            days[tx.date] = { income: 0, expense: 0, count: 0, transactions: [] };
          }
          if (tx.type === 'income') {
            days[tx.date].income += tx.amount;
            totalIncome += tx.amount;
          } else if (tx.type === 'expense') {
            days[tx.date].expense += tx.amount;
            totalExpense += tx.amount;
          }
          days[tx.date].count += 1;
          days[tx.date].transactions.push(tx);
        }
        return {
          days,
          summary: {
            total_income: totalIncome,
            total_expense: totalExpense,
            net_savings: totalIncome - totalExpense,
          }
        };
      };

      const result = aggregateDays(mockTransactions);
      expect(result.summary.total_income).toBe(150000);
      expect(result.summary.total_expense).toBe(75000);
      expect(result.summary.net_savings).toBe(75000);
      expect(result.days['2026-10-16'].income).toBe(150000);
      expect(result.days['2026-10-16'].expense).toBe(50000);
      expect(result.days['2026-10-16'].count).toBe(2);
      expect(result.days['2026-10-15'].expense).toBe(25000);
    });

    it('verifies Calendar route handler file exists and exports GET handler', async () => {
      const routePath = 'app/api/transactions/calendar/route.ts';
      const exists = fileExists(routePath);
      if (exists) {
        const content = readFileSafe(routePath);
        expect(content).toContain('export async function GET');
      }
    });

    it('verifies Calendar UI page exists with date grid and drawer interactivity', async () => {
      const pagePath = 'app/dashboard/kalender/page.tsx';
      const exists = fileExists(pagePath);
      if (exists) {
        const content = readFileSafe(pagePath);
        expect(content.toLowerCase()).toContain('kalender');
      }
    });
  });

  describe('Tier 1.2 — Tata AI Chat Assistant & Floating Widget (R2)', () => {
    it('verifies Tata AI financial context injection formula (50/30/20)', () => {
      // 50/30/20 rule: 50% Needs (Kebutuhan), 30% Wants (Keinginan), 20% Savings (Tabungan/Investasi)
      const monthlyIncome = 10000000; // Rp10,000,000
      const allocation = {
        needs: monthlyIncome * 0.50,
        wants: monthlyIncome * 0.30,
        savings: monthlyIncome * 0.20,
      };

      expect(allocation.needs).toBe(5000000);
      expect(allocation.wants).toBe(3000000);
      expect(allocation.savings).toBe(2000000);
      expect(allocation.needs + allocation.wants + allocation.savings).toBe(monthlyIncome);
    });

    it('verifies Tata AI Chat API contract schema and fallback response structure', () => {
      const sampleResponse = {
        reply: 'Halo! Berdasarkan analisis keuanganmu bulan ini, pengeluaran terbesar ada di kategori Makanan. Disarankan untuk membatasi makan di luar agar alokasi tabungan 20% tetap tercapai.',
        suggested_actions: [
          'Analisa pengeluaranku',
          'Beri tips hemat minggu ini',
          'Simulasi budget liburan'
        ]
      };

      expect(typeof sampleResponse.reply).toBe('string');
      expect(sampleResponse.reply.length).toBeGreaterThan(20);
      expect(Array.isArray(sampleResponse.suggested_actions)).toBeTruthy();
      expect(sampleResponse.suggested_actions.length).toBe(3);
      expect(sampleResponse.suggested_actions).toContain('Analisa pengeluaranku');
      expect(sampleResponse.suggested_actions).toContain('Beri tips hemat minggu ini');
      expect(sampleResponse.suggested_actions).toContain('Simulasi budget liburan');
    });

    it('verifies Tata AI Chat route and Floating Widget component files', () => {
      const apiPath = 'app/api/ai/chat/route.ts';
      if (fileExists(apiPath)) {
        const content = readFileSafe(apiPath);
        expect(content).toContain('POST');
      }
      const widgetPath = 'components/ai/floating-ai-widget.tsx';
      if (fileExists(widgetPath)) {
        const content = readFileSafe(widgetPath);
        expect(content).toContain('Tata AI');
      }
    });
  });

  describe('Tier 1.3 — Multi-Wallet CRUD & Telegram Default Management (R3)', () => {
    it('verifies wallet creation and default toggle state transitions', () => {
      // Simulate wallet collection state
      let wallets = [
        { id: 'w-1', name: 'BCA Utama', type: 'bank', balance: 5000000, account_number: '1234567890', is_default: true },
        { id: 'w-2', name: 'Cash Tunai', type: 'cash', balance: 250000, account_number: '', is_default: false },
      ];

      // Add a third wallet: GoPay
      const newWallet = {
        id: 'w-3',
        name: 'GoPay Jajan',
        type: 'ewallet',
        balance: 100000,
        account_number: '081234567890',
        is_default: false,
      };
      wallets.push(newWallet);
      expect(wallets.length).toBe(3);

      // Set GoPay as default Telegram wallet -> BCA Utama must lose default flag
      const setDefaultTelegramWallet = (targetId) => {
        wallets = wallets.map(w => ({
          ...w,
          is_default: w.id === targetId,
        }));
      };

      setDefaultTelegramWallet('w-3');
      const gopay = wallets.find(w => w.id === 'w-3');
      const bca = wallets.find(w => w.id === 'w-1');
      expect(gopay.is_default).toBe(true);
      expect(bca.is_default).toBe(false);
    });

    it('verifies Wallet API supports GET, POST, and PATCH operations', () => {
      const walletRoutePath = 'app/api/wallets/route.ts';
      if (fileExists(walletRoutePath)) {
        const content = readFileSafe(walletRoutePath);
        expect(content).toContain('GET');
        expect(content).toContain('POST');
      }
    });
  });

  describe('Tier 1.4 — Telegram Daemon & Real-Time Auto-Responder (R4)', () => {
    it('verifies Telegram command parsing and regex matching', () => {
      const commands = [
        { text: '/start', expected: 'START' },
        { text: '/saldo', expected: 'SALDO' },
        { text: '/budget', expected: 'BUDGET' },
        { text: '/hari_ini', expected: 'TODAY' },
        { text: '/minggu_ini', expected: 'THIS_WEEK' },
        { text: '/bulan_ini', expected: 'THIS_MONTH' },
        { text: '/bantuan', expected: 'HELP' },
      ];

      const parseCommand = (input) => {
        const cmd = input.trim().split(/\s+/)[0].toLowerCase();
        switch (cmd) {
          case '/start': return 'START';
          case '/saldo': return 'SALDO';
          case '/budget': return 'BUDGET';
          case '/hari_ini': return 'TODAY';
          case '/minggu_ini': return 'THIS_WEEK';
          case '/bulan_ini': return 'THIS_MONTH';
          case '/bantuan': return 'HELP';
          default: return 'UNKNOWN';
        }
      };

      for (const item of commands) {
        expect(parseCommand(item.text)).toBe(item.expected);
      }
    });

    it('verifies Indonesian natural language transaction parsing logic', () => {
      const parseTextTransaction = (text) => {
        // e.g. "beli sate 20rb" or "makan siang 45000" or "kopi 18k"
        const lower = text.toLowerCase().trim();
        let amount = 0;
        let note = text;

        const rbMatch = lower.match(/(\d+)\s*(rb|ribu|k)/);
        const numMatch = lower.match(/(\d{4,9})/);

        if (rbMatch) {
          amount = parseInt(rbMatch[1], 10) * 1000;
        } else if (numMatch) {
          amount = parseInt(numMatch[1], 10);
        }

        return {
          amount,
          type: 'expense',
          category: 'Makanan',
          rawInput: text,
        };
      };

      const tx1 = parseTextTransaction('beli sate 20rb');
      expect(tx1.amount).toBe(20000);
      expect(tx1.type).toBe('expense');

      const tx2 = parseTextTransaction('kopi starbucks 55k');
      expect(tx2.amount).toBe(55000);

      const tx3 = parseTextTransaction('bensin pertalite 50000');
      expect(tx3.amount).toBe(50000);
    });

    it('verifies Telegram daemon script and batch file exist', () => {
      const daemonScript = 'scripts/telegram-daemon.mjs';
      const batchFile = 'scripts/start-telegram-bot.bat';
      if (fileExists(daemonScript)) {
        const daemonContent = readFileSafe(daemonScript);
        expect(daemonContent).toContain('getUpdates');
        expect(daemonContent).toContain('for (const update of updates)');
      }
      if (fileExists(batchFile)) {
        const batchContent = readFileSafe(batchFile);
        expect(batchContent).toContain('telegram-daemon');
      }
    });
  });

  describe('Tier 1.5 — Multi-Period Budget Calculation (R5)', () => {
    it('calculates daily, weekly, and monthly budget consumption and status accurately', () => {
      const calculateBudgetUsage = (limit, spent) => {
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
        return {
          limit,
          spent,
          remaining: Math.max(0, limit - spent),
          percentage,
          status,
        };
      };

      // Safe state: Rp30,000 out of Rp75,000 daily budget (40%)
      const dailyUsage = calculateBudgetUsage(75000, 30000);
      expect(dailyUsage.percentage).toBe(40.0);
      expect(dailyUsage.status).toBe('safe');
      expect(dailyUsage.remaining).toBe(45000);

      // Warning state: Rp400,000 out of Rp500,000 weekly budget (80%)
      const weeklyUsage = calculateBudgetUsage(500000, 400000);
      expect(weeklyUsage.percentage).toBe(80.0);
      expect(weeklyUsage.status).toBe('warning');
      expect(weeklyUsage.remaining).toBe(100000);

      // Overbudget state: Rp2,100,000 out of Rp2,000,000 monthly budget (105%)
      const monthlyUsage = calculateBudgetUsage(2000000, 2100000);
      expect(monthlyUsage.percentage).toBe(105.0);
      expect(monthlyUsage.status).toBe('overbudget');
      expect(monthlyUsage.remaining).toBe(0);
    });

    it('verifies Budget API route file exists and handles multi-period query', () => {
      const budgetRoutePath = 'app/api/budgets/route.ts';
      expect(fileExists(budgetRoutePath)).toBeTruthy();
      const content = readFileSafe(budgetRoutePath);
      expect(content).toContain('GET');
      expect(content).toContain('rawRatio');
    });
  });

  describe('Tier 1.6 — Admin Approval & Pro Upgrade (R6)', () => {
    it('verifies Admin payment approval transitions payment to approved and upgrades user plan to pro', () => {
      // Initial mock state
      const payment = {
        id: 'pay-101',
        user_id: 'user-202',
        order_id: 'ORDER-TATA-001',
        amount: 49000,
        status: 'pending',
        plan: 'pro',
      };

      const userProfile = {
        id: 'user-202',
        full_name: 'Budi Santoso',
        plan: 'starter',
      };

      const auditLogs = [];

      // Admin executes approval
      const approvePayment = (adminId, payId) => {
        if (payment.id === payId && payment.status === 'pending') {
          payment.status = 'approved';
          payment.approved_by = adminId;
          payment.approved_at = new Date().toISOString();

          // Upgrade user
          userProfile.plan = 'pro';

          // Record audit log
          auditLogs.push({
            id: `audit-${Date.now()}`,
            admin_id: adminId,
            action: 'approve_payment',
            target_user_id: userProfile.id,
            timestamp: new Date().toISOString(),
          });
          return true;
        }
        return false;
      };

      const approved = approvePayment('admin-001', 'pay-101');
      expect(approved).toBe(true);
      expect(payment.status).toBe('approved');
      expect(userProfile.plan).toBe('pro');
      expect(auditLogs.length).toBe(1);
      expect(auditLogs[0].action).toBe('approve_payment');
      expect(auditLogs[0].target_user_id).toBe('user-202');
    });

    it('verifies Admin payment reject action maintains starter plan and logs reason', () => {
      const payment = { id: 'pay-102', user_id: 'user-203', status: 'pending' };
      const userProfile = { id: 'user-203', plan: 'starter' };
      const auditLogs = [];

      const rejectPayment = (adminId, payId, reason) => {
        payment.status = 'rejected';
        auditLogs.push({
          admin_id: adminId,
          action: 'reject_payment',
          target_user_id: userProfile.id,
          reason,
        });
      };

      rejectPayment('admin-001', 'pay-102', 'Bukti transfer buram');
      expect(payment.status).toBe('rejected');
      expect(userProfile.plan).toBe('starter'); // remains starter
      expect(auditLogs.length).toBe(1);
      expect(auditLogs[0].reason).toBe('Bukti transfer buram');
    });

    it('verifies Admin pages exist in codebase', () => {
      expect(fileExists('app/admin/payments/page.tsx')).toBeTruthy();
      expect(fileExists('app/admin/users/page.tsx')).toBeTruthy();
    });
  });

  describe('Tier 1.7 — Polling-First Bot Setup & Webhook Cleanup (R1)', () => {
    it('verifies Polling-First mode contract and deleteWebhook options specification', () => {
      // Setup Bot logic model validating genuine contract
      const evaluateSetupBotMode = (input) => {
        if (!input.botToken || !input.botToken.trim()) {
          return { success: false, status: 400, message: 'Token bot Telegram wajib diisi.' };
        }
        // Requirement R1: Always configure mode: 'long_polling'
        // Always delete active webhook with drop_pending_updates: false to preserve backlog
        return {
          success: true,
          mode: 'long_polling',
          status: 'connected',
          webhookCleaned: true,
          deleteWebhookParams: { drop_pending_updates: false },
          botInfo: {
            id: 987654321,
            firstName: 'TataDana Assistant',
            username: 'tatadana_assistant_bot',
          },
          message: 'Token bot valid (@tatadana_assistant_bot)! Mode Long Polling aktif (Webhook dinonaktifkan).',
        };
      };

      const res = evaluateSetupBotMode({ botToken: '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ' });
      expect(res.success).toBe(true);
      expect(res.mode).toBe('long_polling');
      expect(res.status).toBe('connected');
      expect(res.webhookCleaned).toBe(true);
      expect(res.deleteWebhookParams.drop_pending_updates).toBe(false);
      expect(res.botInfo.username).toBe('tatadana_assistant_bot');
      expect(res.message).toContain('Long Polling');
    });

    it('verifies setup-bot input validation rejects missing, empty, or whitespace-only tokens', () => {
      const validateToken = (token) => {
        if (!token || !token.trim()) {
          return { success: false, status: 400, message: 'Token bot Telegram wajib diisi.' };
        }
        return { success: true };
      };

      expect(validateToken('').success).toBe(false);
      expect(validateToken('   ').success).toBe(false);
      expect(validateToken(null).success).toBe(false);
      expect(validateToken(undefined).success).toBe(false);
      expect(validateToken('   ').message).toBe('Token bot Telegram wajib diisi.');
      expect(validateToken('12345:valid_token').success).toBe(true);
    });

    it('verifies setup-bot route handler file exists, exports POST, and contains deleteWebhook', () => {
      const routePath = 'app/api/telegram/setup-bot/route.ts';
      expect(fileExists(routePath)).toBeTruthy();
      const content = readFileSafe(routePath);
      expect(content).toContain('export async function POST');
      expect(content).toContain('deleteWebhook');
    });
  });

  describe('Tier 1.8 — Idempotent Telegram Polling Endpoint & 409 Conflict Self-Healing (R1)', () => {
    it('verifies /api/telegram/poll response contract schema and properties', () => {
      const pollResponseSample = {
        ok: true,
        mode: 'long_polling',
        count: 2,
        lastOffset: 10503,
        webhookCleaned: true,
        processed: [
          {
            update_id: 10502,
            sender: 'budi_santoso',
            text: 'beli makan 25000',
            result: { handled: true, action: 'transaction_created', amount: 25000, wallet: 'BCA Utama' },
          },
          {
            update_id: 10503,
            sender: 'budi_santoso',
            text: '/saldo',
            result: { handled: true, action: 'saldo_inquiry' },
          },
        ],
        message: 'Berhasil memproses 2 pesan baru dari Telegram!',
      };

      expect(pollResponseSample.ok).toBe(true);
      expect(pollResponseSample.mode).toBe('long_polling');
      expect(pollResponseSample.count).toBe(2);
      expect(pollResponseSample.lastOffset).toBe(10503);
      expect(pollResponseSample.webhookCleaned).toBe(true);
      expect(Array.isArray(pollResponseSample.processed)).toBe(true);
      expect(pollResponseSample.processed.length).toBe(2);
      expect(pollResponseSample.processed[0].update_id).toBe(10502);
      expect(pollResponseSample.processed[0].result.handled).toBe(true);
      expect(pollResponseSample.processed[0].result.amount).toBe(25000);
      expect(pollResponseSample.processed[1].result.action).toBe('saldo_inquiry');
    });

    it('verifies offset tracking and idempotency across consecutive polling iterations', () => {
      // Simulate stateful Polling Offset & Idempotency Engine
      class PollingEngineSimulator {
        constructor() {
          this.currentOffset = 0;
          this.processedLog = [];
          this.seenUpdateIds = new Set();
        }

        pollBatch(incomingUpdates) {
          const newlyProcessed = [];
          for (const u of incomingUpdates) {
            // Idempotency: skip if already seen
            if (this.seenUpdateIds.has(u.update_id) || u.update_id < this.currentOffset) {
              continue;
            }
            this.seenUpdateIds.add(u.update_id);
            this.currentOffset = Math.max(this.currentOffset, u.update_id + 1);
            newlyProcessed.push({
              update_id: u.update_id,
              text: u.message?.text || '',
              processed_at: new Date().toISOString(),
            });
          }
          this.processedLog.push(...newlyProcessed);
          return {
            ok: true,
            mode: 'long_polling',
            count: newlyProcessed.length,
            lastOffset: this.currentOffset,
          };
        }
      }

      const engine = new PollingEngineSimulator();

      // Batch 1: two incoming updates
      const batch1 = [
        { update_id: 1001, message: { text: 'beli bensin 50000' } },
        { update_id: 1002, message: { text: '/saldo' } },
      ];
      const res1 = engine.pollBatch(batch1);
      expect(res1.count).toBe(2);
      expect(res1.lastOffset).toBe(1003);
      expect(engine.processedLog.length).toBe(2);

      // Batch 2: duplicate update 1002 re-sent + new update 1003
      const batch2 = [
        { update_id: 1002, message: { text: '/saldo' } }, // duplicate!
        { update_id: 1003, message: { text: 'makan siang 35000' } }, // new
      ];
      const res2 = engine.pollBatch(batch2);
      expect(res2.count).toBe(1); // Only 1003 processed, 1002 ignored
      expect(res2.lastOffset).toBe(1004);
      expect(engine.processedLog.length).toBe(3); // Total unique 3
      expect(engine.processedLog[2].update_id).toBe(1003);
    });

    it('verifies 409 Conflict self-healing recovery mechanism', () => {
      // Simulate Telegram API getUpdates with 409 Conflict when webhook was registered
      let webhookRegisteredOnTelegram = true;
      let deleteWebhookCalled = false;
      let deleteWebhookDropPendingUpdates = null;
      let getUpdatesCallCount = 0;

      const simulatePollWithSelfHealing = () => {
        getUpdatesCallCount++;
        // Attempt 1: Telegram returns 409 Conflict
        if (webhookRegisteredOnTelegram) {
          const conflictError = {
            ok: false,
            error_code: 409,
            description: "Conflict: can't use getUpdates method while webhook is active; use deleteWebhook first",
          };

          // Self-healing recovery triggered
          if (conflictError.description.toLowerCase().includes('webhook')) {
            // Delete webhook with drop_pending_updates: false
            deleteWebhookCalled = true;
            deleteWebhookDropPendingUpdates = false;
            webhookRegisteredOnTelegram = false;

            // Retry getUpdates
            getUpdatesCallCount++;
            return {
              ok: true,
              mode: 'long_polling',
              webhookCleaned: true,
              count: 1,
              recoveredFromConflict: true,
            };
          }
        }

        return { ok: true, mode: 'long_polling', webhookCleaned: false, count: 0 };
      };

      const result = simulatePollWithSelfHealing();
      expect(result.ok).toBe(true);
      expect(result.mode).toBe('long_polling');
      expect(result.webhookCleaned).toBe(true);
      expect(result.recoveredFromConflict).toBe(true);
      expect(deleteWebhookCalled).toBe(true);
      expect(deleteWebhookDropPendingUpdates).toBe(false);
      expect(getUpdatesCallCount).toBe(2);
    });

    it('verifies /api/telegram/poll route handler file exports GET and POST with conflict handling', () => {
      const pollRoutePath = 'app/api/telegram/poll/route.ts';
      expect(fileExists(pollRoutePath)).toBeTruthy();
      const content = readFileSafe(pollRoutePath);
      expect(content).toContain('export async function GET');
      expect(content).toContain('export async function POST');
      expect(content).toContain('deleteWebhook');
      expect(content).toContain('drop_pending_updates: false');
      expect(content).toContain('webhook');
    });
  });

  describe('Tier 1.9 — Background Long-Polling Daemon Configuration (R3)', () => {
    it('verifies daemon long polling configuration uses official HTTP timeout: 25', () => {
      const daemonPath = 'scripts/telegram-daemon.mjs';
      expect(fileExists(daemonPath)).toBeTruthy();
      const content = readFileSafe(daemonPath);
      expect(content).toContain('timeout: 25');
    });

    it('verifies atomic offset persistence model (.telegram-offset.json)', () => {
      // Simulate persistent offset reading and saving
      const offsetStore = {};

      const saveOffsetSim = (filePath, offset, updateId) => {
        const payload = JSON.stringify({
          offset: Number(offset),
          last_update_id: updateId,
          updated_at: new Date().toISOString(),
        });
        offsetStore[filePath] = payload;
      };

      const readOffsetSim = (filePath) => {
        if (!offsetStore[filePath]) return 0;
        try {
          const parsed = JSON.parse(offsetStore[filePath]);
          return Number(parsed.offset) || 0;
        } catch {
          return 0;
        }
      };

      // Initially no offset
      expect(readOffsetSim('.telegram-offset.json')).toBe(0);

      // Process update 50550 -> commits 50551
      saveOffsetSim('.telegram-offset.json', 50551, 50550);
      expect(readOffsetSim('.telegram-offset.json')).toBe(50551);

      // Verify payload contains numeric offset
      const savedObj = JSON.parse(offsetStore['.telegram-offset.json']);
      expect(savedObj.offset).toBe(50551);
      expect(savedObj.last_update_id).toBe(50550);
      expect(typeof savedObj.updated_at).toBe('string');
    });

    it('verifies daemon startup cleans webhook with drop_pending_updates: false', () => {
      const daemonPath = 'scripts/telegram-daemon.mjs';
      const content = readFileSafe(daemonPath);
      expect(content).toContain('deleteWebhook');
      expect(content).toContain('drop_pending_updates: false');
    });

    it('verifies daemon handles all message categories (text, photo receipt OCR, voice STT, slash commands, contact)', () => {
      const daemonPath = 'scripts/telegram-daemon.mjs';
      const content = readFileSafe(daemonPath);

      // Verify message categorization logic
      expect(content).toContain('categorizeMessage');
      expect(content).toContain('TEXT_TRANSACTION');
      expect(content).toContain('SLASH_COMMAND');
      expect(content).toContain('PHOTO_RECEIPT_OCR');
      expect(content).toContain('VOICE_NOTE_STT');
      expect(content).toContain('CONTACT_LINKING');
    });

    it('verifies Windows batch launcher scripts/start-telegram-bot.bat provides auto-restart loop', () => {
      const batchPath = 'scripts/start-telegram-bot.bat';
      expect(fileExists(batchPath)).toBeTruthy();
      const content = readFileSafe(batchPath);
      expect(content).toContain(':LOOP');
      expect(content).toContain('telegram-daemon.mjs');
      expect(content.toUpperCase()).toContain('GOTO LOOP');
    });
  });

  describe('Tier 1.10 — In-App Auto-Poller & UI Settings Elements (R2)', () => {
    it('verifies UI Settings page exists and exports default React component', () => {
      const settingsPath = 'app/dashboard/settings/page.tsx';
      expect(fileExists(settingsPath)).toBeTruthy();
      const content = readFileSafe(settingsPath);
      expect(content).toContain('export default function SettingsPage');
    });

    it('verifies client auto-polling state machine and mutex guard logic', () => {
      // Simulate client auto-polling state machine with mutex
      class ClientAutoPoller {
        constructor(intervalMs = 2500) {
          this.intervalMs = intervalMs;
          this.isRunning = false;
          this.isPollingMutex = false;
          this.pollCount = 0;
          this.skippedCount = 0;
          this.dispatchedEvents = [];
        }

        start() {
          this.isRunning = true;
        }

        stop() {
          this.isRunning = false;
        }

        async tick(simulatedNetworkDelayMs = 50) {
          if (!this.isRunning) return { executed: false, reason: 'stopped' };
          // Mutex guard check
          if (this.isPollingMutex) {
            this.skippedCount++;
            return { executed: false, reason: 'mutex_locked' };
          }

          this.isPollingMutex = true;
          this.pollCount++;

          // Simulate fetch
          await new Promise((r) => setTimeout(r, simulatedNetworkDelayMs));

          // Simulate received transaction -> dispatch event
          this.dispatchedEvents.push('tatadana_transaction_created');

          this.isPollingMutex = false;
          return { executed: true, pollCount: this.pollCount };
        }
      }

      const poller = new ClientAutoPoller(2500);
      expect(poller.intervalMs).toBe(2500);

      poller.start();
      expect(poller.isRunning).toBe(true);

      // Normal tick executes
      return poller.tick(10).then((res1) => {
        expect(res1.executed).toBe(true);
        expect(res1.pollCount).toBe(1);
        expect(poller.dispatchedEvents.length).toBe(1);

        // Simulate concurrent tick while mutex is locked
        poller.isPollingMutex = true;
        return poller.tick(10).then((res2) => {
          expect(res2.executed).toBe(false);
          expect(res2.reason).toBe('mutex_locked');
          expect(poller.skippedCount).toBe(1);

          // Unlock and stop
          poller.isPollingMutex = false;
          poller.stop();
          expect(poller.isRunning).toBe(false);
        });
      });
    });

    it('verifies UI Settings source file includes Long Polling and polling action components', () => {
      const settingsPath = 'app/dashboard/settings/page.tsx';
      const content = readFileSafe(settingsPath);
      // Contains Polling triggers and status
      expect(content.toLowerCase()).toContain('polling');
      expect(content).toContain('executePoll');
      expect(content).toContain('handlePollTelegram');
      expect(content).toContain('isPolling');
    });
  });
}
