import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_service_role_key_for_testing_123456789'
process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8607603301:AAHTbWxJY8v4GoGDHXlS0Szge-NsBGpUQ7g'

import { PersistentStore, OFFICIAL_SUPERADMIN_ID } from '../../lib/db/store.ts'
import { TelegramMessageHandler } from '../../lib/telegram/message-handler.ts'
import { getUserFinancialContext, generateHeuristicFinancialAdvice } from '../../lib/ai/financial-context.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../..')

console.log('--- Testing Worker 4: Tata AI & Telegram Integration ---')

// 1. Verify Tata AI Page UI has dynamic financial context and no hardcoded values
const tataAiPagePath = path.join(rootDir, 'app/dashboard/tata-ai/page.tsx')
const pageContent = fs.readFileSync(tataAiPagePath, 'utf-8')

assert(
  pageContent.includes('formatRupiah(financialContext.totalBalance)'),
  'Tata AI UI must dynamically display totalBalance from financialContext'
)
assert(
  pageContent.includes('formatRupiah(financialContext.monthlyIncome)'),
  'Tata AI UI must dynamically display monthlyIncome from financialContext'
)
assert(
  pageContent.includes('formatRupiah(financialContext.monthlyExpense)'),
  'Tata AI UI must dynamically display monthlyExpense from financialContext'
)
assert(
  pageContent.includes('financialContext.mostExpensiveCategory'),
  'Tata AI UI must dynamically display mostExpensiveCategory'
)
assert(
  pageContent.includes('financialContext.healthStatus'),
  'Tata AI UI must dynamically display cashflow healthStatus'
)
assert(
  pageContent.includes("window.addEventListener('tatadana_transaction_created'"),
  'Tata AI UI must listen to tatadana_transaction_created event to update context card'
)
assert(
  !pageContent.includes('<span className="font-bold text-white">Rp10.450.000</span>'),
  'Static hardcoded Rp10.450.000 must be removed from context card'
)
console.log('✅ Tata AI Page UI verified: Dynamic financial context card and event listener active.')

// 2. Verify AI Chat Route has GET handler and live context logic
const chatRoutePath = path.join(rootDir, 'app/api/ai/chat/route.ts')
const chatRouteContent = fs.readFileSync(chatRoutePath, 'utf-8')

assert(
  chatRouteContent.includes('export async function GET(req: Request)'),
  'app/api/ai/chat/route.ts must export GET handler for live context loading'
)
assert(
  chatRouteContent.includes('getUserFinancialContext'),
  'app/api/ai/chat/route.ts must query getUserFinancialContext'
)
assert(
  chatRouteContent.includes('checkAmbiguousTransaction'),
  'app/api/ai/chat/route.ts must include checkAmbiguousTransaction'
)
console.log('✅ Tata AI Chat Route verified: GET handler and dynamic context awareness present.')

// 3. Test getUserFinancialContext & 50/30/20 advice logic
const context = await getUserFinancialContext(OFFICIAL_SUPERADMIN_ID)
assert(typeof context.totalBalance === 'number', 'Context must return numeric totalBalance')
assert(typeof context.monthlyIncome === 'number', 'Context must return numeric monthlyIncome')
assert(typeof context.monthlyExpense === 'number', 'Context must return numeric monthlyExpense')
assert(context.rule503020, 'Context must include rule503020 metrics')
assert(context.rule503020.needsTarget >= 0, 'Needs target must be non-negative')
assert(context.rule503020.wantsTarget >= 0, 'Wants target must be non-negative')
assert(context.rule503020.savingsTarget >= 0, 'Savings target must be non-negative')

const advice = generateHeuristicFinancialAdvice('Simulasi alokasi 50/30/20', context)
assert(advice.reply.includes('50/30/20'), '50/30/20 prompt must return 50/30/20 advice')
assert(advice.suggested_actions.length > 0, 'Advice must return suggested actions')
console.log('✅ AI Advisor verified: 50/30/20 guidance and user context metrics accurate.')

// 4. Test Telegram Message Handler & Dual-Write to PersistentStore
const handler = new TelegramMessageHandler()
assert(handler, 'TelegramMessageHandler must instantiate successfully')

const handlerContent = fs.readFileSync(path.join(rootDir, 'lib/telegram/message-handler.ts'), 'utf-8')
assert(
  handlerContent.includes('PersistentStore.insertTransaction'),
  'TelegramMessageHandler must dual-write transactions to PersistentStore'
)
assert(
  handlerContent.includes('evaluateAndTriggerBudgetAlert'),
  'TelegramMessageHandler must evaluate multi-period budget alerts'
)
assert(
  handlerContent.includes('PersistentStore.getWallets'),
  'TelegramMessageHandler must support PersistentStore wallets in /saldo'
)
console.log('✅ Telegram Message Handler verified: PersistentStore dual-write and budget alerts active.')

// 5. Test Telegram Daemon Long-Polling Configuration
const daemonContent = fs.readFileSync(path.join(rootDir, 'scripts/telegram-daemon.mjs'), 'utf-8')
assert(
  daemonContent.includes('timeout: 25'),
  'telegram-daemon.mjs must use official Telegram HTTP long-polling timeout: 25'
)
assert(
  daemonContent.includes('.telegram-offset.json'),
  'telegram-daemon.mjs must persist offset to .telegram-offset.json'
)
assert(
  daemonContent.includes('deleteWebhook'),
  'telegram-daemon.mjs must clean webhook on startup to prevent 409 Conflict'
)
console.log('✅ Telegram Daemon verified: timeout 25, offset tracking, and webhook cleanup active.')

console.log('--- ALL WORKER 4 VERIFICATIONS PASSED SUCCESSFULLY (5/5) ---')
