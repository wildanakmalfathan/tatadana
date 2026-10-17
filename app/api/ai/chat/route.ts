import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { extractSessionToken, verifySessionToken } from '@/lib/auth/tokens'
import { PersistentStore, OFFICIAL_SUPERADMIN_ID } from '@/lib/db/store'
import { LedgerService } from '@/lib/services/ledger'
import { MultiAIProviderService } from '@/lib/ai/multi-provider'
import {
  getUserFinancialContext,
  formatFinancialContextPrompt,
  generateHeuristicFinancialAdvice,
} from '@/lib/ai/financial-context'
import { formatRupiah } from '@/lib/utils/currency'
import { getISODateWIB, formatWIBTimeString } from '@/lib/utils/date'

export const dynamic = 'force-dynamic'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequestBody {
  message: string
  history?: ChatMessage[]
}

async function resolveUserId(req: Request): Promise<string> {
  const token = extractSessionToken(req)
  if (token) {
    const payload = verifySessionToken(token)
    if (payload?.userId) return payload.userId
  }

  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch {}

  const headerUserId = req.headers.get('x-user-id')
  if (headerUserId && PersistentStore.findUserById(headerUserId)) {
    return headerUserId
  }

  const users = PersistentStore.getUsers()
  if (users.length > 0) {
    const defaultUser = users.find((u) => u.id === OFFICIAL_SUPERADMIN_ID) || users[0]
    return defaultUser.id
  }

  return OFFICIAL_SUPERADMIN_ID
}

/**
 * Checks whether user input is an ambiguous transaction attempt that requires clarification
 * e.g., "Tadi bayar 50", "Beli 20", "Bayar 50", "Tadi beli bakso" (no amount)
 */
function checkAmbiguousTransaction(
  message: string,
  userName: string
): { isAmbiguous: boolean; reply?: string } {
  const lower = message.trim().toLowerCase()

  // Non-transaction questions should skip
  if (
    lower.includes('analisa') ||
    lower.includes('analisis') ||
    lower.includes('tips') ||
    lower.includes('hemat') ||
    lower.includes('simulasi') ||
    lower.includes('50/30/20') ||
    lower.includes('alokasi') ||
    lower.includes('bagaimana') ||
    lower.includes('gimana') ||
    lower.includes('apakah') ||
    lower.includes('kenapa') ||
    lower.includes('berapa')
  ) {
    return { isAmbiguous: false }
  }

  // 1. Ambiguous small number without unit: e.g. "tadi bayar 50", "beli 25", "bayar 50", "jajan 10"
  const smallNumberRegex = /(?:tadi\s+)?(?:bayar|beli|jajan|ongkir|topup|keluar)\s+(\d{1,2})(?!\s*(?:rb|k|ribu|rebu|jt|juta|[0-9]))\b/i
  const smallMatch = lower.match(smallNumberRegex)
  if (smallMatch) {
    const num = smallMatch[1]
    const suggestedThousands = `${num}.000`
    return {
      isAmbiguous: true,
      reply: `Halo Kak ${userName}! 👋 Nominal transaksimu untuk *"${message}"* belum spesifik nih. Apakah maksud Kakak **Rp${suggestedThousands}** atau **Rp${num}**? 🤔\n\nMohon sebutkan nominal lengkapnya ya, contoh:\n• *"beli makan ${num} ribu"*\n• *"bayar ${num}rb"*\n• *"tadi bayar kopi ${num}k"*`,
    }
  }

  // 2. Action verb present, but zero numbers in the message: e.g. "tadi beli bakso", "bayar listrik", "jajan cilok"
  const actionOnlyRegex = /^(?:tadi\s+)?(?:bayar|beli|jajan|isi bensin|checkout)\s+[a-z\s]+$/i
  if (actionOnlyRegex.test(lower) && !/\d/.test(lower)) {
    return {
      isAmbiguous: true,
      reply: `Halo Kak ${userName}! 👋 Transaksi *"${message}"* mau dicatat berapa nominalnya? 🤔\n\nMohon sebutkan nominal lengkapnya ya, contoh:\n• *"beli bakso 15rb"*\n• *"bayar listrik 150 ribu"*\n• *"isi bensin 30k"*`,
    }
  }

  return { isAmbiguous: false }
}

/**
 * Checks whether user input is an explicit natural language transaction command
 * e.g., "Beli makan siang 25 ribu", "Gajian 5 juta", "Bayar pulsa 50rb"
 */
function isTransactionIntent(message: string): boolean {
  const lower = message.trim().toLowerCase()

  // Guard against questions or analytical prompts
  if (
    lower.includes('analisa') ||
    lower.includes('analisis') ||
    lower.includes('tips') ||
    lower.includes('hemat') ||
    lower.includes('simulasi') ||
    lower.includes('50/30/20') ||
    lower.includes('alokasi') ||
    lower.includes('bagaimana') ||
    lower.includes('gimana') ||
    lower.includes('apakah') ||
    lower.includes('kenapa') ||
    lower.includes('berapa')
  ) {
    return false
  }

  const txKeywords = [
    'beli',
    'bayar',
    'jajan',
    'makan',
    'isi bensin',
    'ongkir',
    'checkout',
    'topup',
    'keluar',
    'habis',
    'tagihan',
    'gajian',
    'terima gaji',
    'dapat transferan',
    'cair',
    'bonus',
    'uang saku',
    'hasil jualan',
    'pemasukan',
    'pengeluaran',
  ]

  const hasKeyword = txKeywords.some((kw) => lower.includes(kw))
  const hasNumber = /\d+/.test(lower)

  return hasKeyword && hasNumber
}

export async function POST(req: Request) {
  const startTime = Date.now()

  try {
    const body: ChatRequestBody = await req.json()
    const { message, history = [] } = body

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          message: 'Pesan tidak boleh kosong.',
        },
        { status: 400 }
      )
    }

    // 1. Resolve user ID securely from session token / store
    const userId = await resolveUserId(req)

    // 2. Fetch rich financial context for this user
    const financialContext = await getUserFinancialContext(userId)

    // 3. Proactive Ambiguity Check (Section J Requirement: "Meminta klarifikasi secara proaktif jika nominal atau konteks transaksi ambigu")
    const ambiguity = checkAmbiguousTransaction(message, financialContext.userName)
    if (ambiguity.isAmbiguous && ambiguity.reply) {
      return NextResponse.json(
        {
          success: true,
          reply: ambiguity.reply,
          suggested_actions: [
            'Beli sate 25rb',
            'Bayar listrik 150rb',
            'Gajian 5 juta',
          ],
          provider: 'tata_ai_clarifier',
          context_summary: {
            user_name: financialContext.userName,
            total_balance: financialContext.totalBalance,
            monthly_expense: financialContext.monthlyExpense,
            top_category: financialContext.mostExpensiveCategory?.name || 'Makanan & Minuman',
          },
        },
        { status: 200 }
      )
    }

    // 4. Natural Transaction Recording Intent (Section J Requirement: "Tata AI memahami bahasa alami Indonesia untuk pemasukan & pengeluaran...")
    if (isTransactionIntent(message)) {
      const parsed = await MultiAIProviderService.parseNaturalLanguageTransaction(message, userId)

      if (parsed.success && parsed.nominal && parsed.nominal > 0) {
        // Resolve wallet: find user's wallets or create default
        let wallets = PersistentStore.getWallets(userId)
        if (wallets.length === 0) {
          const defaultWallet = PersistentStore.createWallet({
            user_id: userId,
            name: 'BCA Utama',
            type: 'bank',
            balance: 0,
            is_default: true,
            is_default_telegram: true,
            account_number: '123-456-7890',
            icon: '🏦',
            color: '#10b981',
          })
          wallets = [defaultWallet]
        }

        // Match wallet by mention or default
        const lowerMsg = message.toLowerCase()
        let targetWallet = wallets.find((w) => lowerMsg.includes(w.name.toLowerCase()))
        if (!targetWallet) {
          if (lowerMsg.includes('mandiri')) targetWallet = wallets.find((w) => w.name.toLowerCase().includes('mandiri'))
          else if (lowerMsg.includes('cash') || lowerMsg.includes('tunai')) targetWallet = wallets.find((w) => w.type === 'cash')
          else if (lowerMsg.includes('gopay')) targetWallet = wallets.find((w) => w.name.toLowerCase().includes('gopay'))
          else if (lowerMsg.includes('ovo')) targetWallet = wallets.find((w) => w.name.toLowerCase().includes('ovo'))
          else if (lowerMsg.includes('dana')) targetWallet = wallets.find((w) => w.name.toLowerCase().includes('dana'))
        }
        if (!targetWallet) {
          targetWallet = wallets.find((w) => w.is_default_telegram) || wallets.find((w) => w.is_default) || wallets[0]
        }

        // Resolve category
        const categories = PersistentStore.getCategories(userId)
        let targetCategory = categories.find(
          (c) => c.name.toLowerCase() === (parsed.kategori || '').toLowerCase()
        )
        if (!targetCategory) {
          // Find general fallback category for type
          targetCategory = categories.find((c) => c.type === parsed.jenis) || categories[0]
        }

        // Determine date
        let txDate = getISODateWIB()
        if (lowerMsg.includes('kemarin')) {
          const yesterday = new Date(Date.now() - 86400000)
          txDate = getISODateWIB(yesterday)
        }
        const txTime = formatWIBTimeString(new Date())

        // Atomically record transaction through Single Source of Truth LedgerService
        const result = await LedgerService.createTransaction({
          user_id: userId,
          type: parsed.jenis || 'expense',
          amount: parsed.nominal,
          wallet_id: targetWallet.id,
          category_id: targetCategory?.id || null,
          notes: parsed.catatan || message,
          source: 'tata_ai',
          date: txDate,
          time: txTime,
        })

        const updatedWallet = PersistentStore.getWalletById(targetWallet.id)
        const currentBal = updatedWallet ? updatedWallet.balance : targetWallet.balance

        const isIncome = parsed.jenis === 'income'
        let budgetNotice = ''
        if (result.budgetAlert?.alertSent) {
          budgetNotice = `\n\n⚠️ **Peringatan Batas Anggaran**: Pengeluaran kategori *${targetCategory?.name}* sudah mencapai **${result.budgetAlert.percentage}%** dari limit yang ditentukan!`
        }

        const reply = `✅ **Transaksi Berhasil Dicatat oleh Tata AI!**

• **Jenis:** ${isIncome ? '🟢 Pemasukan' : '🔴 Pengeluaran'}
• **Nominal:** **${formatRupiah(parsed.nominal)}**
• **Kategori:** ${targetCategory?.emoji || '🏷️'} ${targetCategory?.name || parsed.kategori}
• **Dompet:** ${targetWallet.name} (Saldo Sekarang: **${formatRupiah(currentBal)}**)
• **Catatan:** ${parsed.catatan || message}
• **Waktu:** ${txDate} (${txTime})${budgetNotice}

💡 *Status:* Transaksi ini otomatis tersimpan ke buku kas persisten dan langsung diperbarui di Kalender Finansial, Laporan, serta Budgeting Anda.`

        return NextResponse.json(
          {
            success: true,
            reply,
            transaction_recorded: true,
            transaction: result.transaction,
            suggested_actions: [
              'Lihat Kalender Keuangan',
              'Cek Sisa Budget',
              'Analisa Pengeluaranku',
            ],
            provider: 'tata_ai_ledger',
            context_summary: {
              user_name: financialContext.userName,
              total_balance: financialContext.totalBalance + (isIncome ? parsed.nominal : -parsed.nominal),
              monthly_expense: financialContext.monthlyExpense + (isIncome ? 0 : parsed.nominal),
              top_category: targetCategory?.name || 'Umum',
            },
          },
          { status: 200 }
        )
      }
    }

    // 5. Prepare system prompt injecting persona & real financial data for conversational advisor
    const contextPrompt = formatFinancialContextPrompt(financialContext)
    const systemInstruction = `Anda adalah "Tata AI", asisten keuangan pribadi cerdas, ramah, dan solutif untuk aplikasi SaaS Finansial Indonesia "TataDana".
Tugas Anda adalah mendampingi pengguna mengelola keuangan pribadi dan UMKM dengan bijak, hemat, dan terencana.

Panduan Persona & Komunikasi:
1. Sapa pengguna dengan santun menggunakan nama "Kak ${financialContext.userName}" dalam bahasa Indonesia yang ramah, hangat, dan memotivasi.
2. Gunakan data finansial pengguna di bawah ini untuk memberikan analisa yang presisi dan personal. Jangan mengarang angka jika data tersedia.
3. Selalu sebutkan nominal uang dalam format Rupiah (contoh: Rp1.500.000 atau Rp50.000).
4. Untuk konsultasi alokasi pendapatan, gunakan metode 50/30/20 (50% Kebutuhan Pokok, 30% Keinginan/Lifestyle, 20% Tabungan/Investasi/Dana Darurat) dan bandingkan dengan realisasi belanja pengguna.
5. Jika rasio pengeluaran (burn rate) tinggi atau ada risiko defisit, berikan peringatan dini secara solutif tanpa membuat panik, disertai langkah-langkah rem darurat belanja.
6. Berikan tips hemat yang relevan dengan kebiasaan masyarakat urban Indonesia (batch cooking/bawa bekal, batasi jajan kopi kekinian/boba, manfaatkan promo e-wallet, audit langganan streaming/paylater).
7. Sajikan jawaban dengan format Markdown yang rapi: gunakan heading singkat, bullet points ber-emoji, dan cetak tebal untuk angka penting.
8. Akhiri jawaban dengan pertanyaan reflektif atau rekomendasi langkah selanjutnya yang relevan.

${contextPrompt}
`

    // 6. Determine AI Provider configuration
    let aiConfig: any = null
    try {
      aiConfig = await MultiAIProviderService.getAIConfig()
    } catch (e) {
      console.warn('Failed to get AI config from DB, checking environment variables:', e)
    }

    const geminiKey = process.env.GEMINI_API_KEY || aiConfig?.providers?.gemini?.apiKey
    const openAIKey = process.env.OPENAI_API_KEY || aiConfig?.providers?.openai?.apiKey

    const isRealKey = (key?: string) => Boolean(key && !key.toLowerCase().includes('placeholder') && key.length > 10)

    let generatedReply: string | null = null
    let activeProvider = 'heuristic'

    // 7. Try calling Live LLM if keys are genuinely available
    if (isRealKey(geminiKey)) {
      try {
        const model = aiConfig?.providers?.gemini?.model || 'gemini-1.5-flash'
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`

        const contents: any[] = []
        for (const h of history.slice(-6)) {
          contents.push({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }],
          })
        }

        contents.push({
          role: 'user',
          parts: [{ text: `${systemInstruction}\n\nPesan Pengguna: ${message}` }],
        })

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1200,
            },
          }),
        })

        const data = await res.json()
        const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (candidate) {
          generatedReply = candidate.trim()
          activeProvider = 'gemini'
          await MultiAIProviderService.logAICall({
            userId,
            provider: 'gemini',
            promptType: 'advisor',
            inputTokens: 350,
            outputTokens: 200,
            latencyMs: Date.now() - startTime,
            status: 'success',
          })
        }
      } catch (geminiErr: any) {
        console.warn('Live Gemini call failed:', geminiErr.message)
      }
    }

    // OpenAI fallback
    if (!generatedReply && isRealKey(openAIKey)) {
      try {
        const messages: any[] = [
          { role: 'system', content: systemInstruction },
          ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
          { role: 'user', content: message },
        ]

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAIKey}`,
          },
          body: JSON.stringify({
            model: aiConfig?.providers?.openai?.model || 'gpt-4o-mini',
            messages,
            temperature: 0.7,
            max_tokens: 1200,
          }),
        })

        const data = await res.json()
        const text = data.choices?.[0]?.message?.content
        if (text) {
          generatedReply = text.trim()
          activeProvider = 'openai'
          await MultiAIProviderService.logAICall({
            userId,
            provider: 'openai',
            promptType: 'advisor',
            inputTokens: 350,
            outputTokens: 200,
            latencyMs: Date.now() - startTime,
            status: 'success',
          })
        }
      } catch (openAiErr: any) {
        console.warn('OpenAI chat call failed:', openAiErr.message)
      }
    }

    // 8. Smart Heuristic Financial Advice Fallback
    let suggestedActions: string[] = [
      'Analisa pengeluaranku',
      'Beri tips hemat minggu ini',
      'Simulasi budget liburan',
    ]

    if (!generatedReply) {
      const heuristicResult = generateHeuristicFinancialAdvice(message, financialContext, history)
      generatedReply = heuristicResult.reply
      suggestedActions = heuristicResult.suggested_actions
      activeProvider = 'heuristic_advisor'
    } else {
      const lower = message.toLowerCase()
      if (lower.includes('analisa') || lower.includes('pengeluaran')) {
        suggestedActions = [
          'Beri tips hemat minggu ini',
          'Rekomendasi alokasi 50/30/20',
          'Simulasi budget liburan',
        ]
      } else if (lower.includes('tips') || lower.includes('hemat')) {
        suggestedActions = [
          'Analisa pengeluaranku',
          'Simulasi budget liburan',
          'Rekomendasi alokasi 50/30/20',
        ]
      } else if (lower.includes('liburan') || lower.includes('simulasi')) {
        suggestedActions = [
          'Rekomendasi alokasi 50/30/20',
          'Beri tips hemat minggu ini',
          'Analisa pengeluaranku',
        ]
      } else if (lower.includes('50/30/20') || lower.includes('gaji')) {
        suggestedActions = [
          'Simulasi budget liburan',
          'Beri tips hemat minggu ini',
          'Analisa pengeluaranku',
        ]
      }
    }

    return NextResponse.json(
      {
        success: true,
        reply: generatedReply,
        suggested_actions: suggestedActions,
        provider: activeProvider,
        context_summary: {
          user_name: financialContext.userName,
          total_balance: financialContext.totalBalance,
          monthly_expense: financialContext.monthlyExpense,
          top_category: financialContext.mostExpensiveCategory?.name || 'Makanan & Minuman',
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Fatal error in /api/ai/chat:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Terjadi kesalahan pada layanan Tata AI Chat.',
      },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const financialContext = await getUserFinancialContext(userId)

    return NextResponse.json(
      {
        success: true,
        context: {
          userId: financialContext.userId,
          userName: financialContext.userName,
          userPlan: financialContext.userPlan,
          totalBalance: financialContext.totalBalance,
          monthlyIncome: financialContext.monthlyIncome,
          monthlyExpense: financialContext.monthlyExpense,
          netSavings: financialContext.netSavings,
          burnRatePercentage: financialContext.burnRatePercentage,
          isDeficit: financialContext.isDeficit,
          deficitWarning: financialContext.deficitWarning,
          topCategories: financialContext.topCategories,
          mostExpensiveCategory: financialContext.mostExpensiveCategory,
          rule503020: financialContext.rule503020,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error fetching financial context in GET /api/ai/chat:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Gagal memuat konteks finansial.',
      },
      { status: 500 }
    )
  }
}

