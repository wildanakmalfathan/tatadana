import { createAdminClient } from '@/lib/supabase/admin'
import { AICallLog } from '@/types/database'

export interface ParsedTransactionResult {
  success: boolean
  jenis?: 'income' | 'expense'
  nominal?: number
  kategori?: string
  catatan?: string
  rawText: string
  errorMessage?: string
  suggestion?: string
}

export interface ReceiptOCRItem {
  item_name: string
  quantity: number
  price: number
  category?: string
}

export interface ReceiptOCRResult {
  success: boolean
  merchant?: string
  totalAmount?: number
  date?: string
  items?: ReceiptOCRItem[]
  notes?: string
  errorMessage?: string
}

export interface AdvisorContext {
  userName: string
  totalIncome: number
  totalExpense: number
  categoryName: string
  categoryExpense: number
  previousCategoryExpense?: number
  budgetAmount: number
  triggerReason: 'category_spike' | 'high_burn_rate' | 'large_single_expense'
}

export class MultiAIProviderService {
  /**
   * Helper fallback parser untuk nominal format bahasa Indonesia
   * Menangani: 15rb, 15ribu, 15rebu, 1.5jt, 1,5jt, 500k, 25000, 25.000, Rp 50.000, dll.
   * Mengisolasi nominal finansial secara akurat tanpa menggabungkan angka tanggal/jam/ID.
   */
  static parseIndonesianNumber(input: string): number | null {
    if (!input) return null
    const raw = String(input).trim()
    if (!raw) return null

    // 1. Currency prefix pattern: e.g. Rp 25.000, Rp. 50rb, sebesar 100.000, senilai 2.5jt
    const prefixMatch = raw.match(
      /(?:rp\.?|sebesar|sejumlah|seharga|senilai|nominal)\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]+)?|[0-9]+)\s*(miliar|m|juta|jt|ribu|rebu|rb|k)?\b/i
    )
    if (prefixMatch) {
      const numStr = prefixMatch[1].replace(/,/g, '.')
      const parts = numStr.split('.')
      let num = 0
      if (parts.length > 2) {
        num = parseInt(parts.join(''), 10)
      } else if (parts.length === 2 && parts[1].length === 3 && !prefixMatch[2]) {
        num = parseInt(parts.join(''), 10)
      } else {
        num = parseFloat(numStr)
      }
      const unit = (prefixMatch[2] || '').toLowerCase()
      if (unit === 'jt' || unit === 'juta') num *= 1000000
      else if (unit === 'rb' || unit === 'ribu' || unit === 'rebu' || unit === 'k') num *= 1000
      else if (unit === 'm' || unit === 'miliar') num *= 1000000000
      if (!isNaN(num) && num > 0) return Math.round(num)
    }

    // 2. Unit suffix pattern: e.g. 15rb, 15ribu, 15rebu, 1.5jt, 500k, 10 juta, 2.5 miliar
    const unitMatch = raw.match(/\b([0-9]+(?:[.,][0-9]+)?)\s*(miliar|juta|jt|ribu|rebu|rb|k)\b/i)
    if (unitMatch) {
      const numStr = unitMatch[1].replace(',', '.')
      let num = parseFloat(numStr)
      const unit = unitMatch[2].toLowerCase()
      if (unit === 'jt' || unit === 'juta') num *= 1000000
      else if (unit === 'rb' || unit === 'ribu' || unit === 'rebu' || unit === 'k') num *= 1000
      else if (unit === 'miliar') num *= 1000000000
      if (!isNaN(num) && num > 0) return Math.round(num)
    }

    // 3. Formatted thousands separator: e.g. 25.000, 1.500.000, 25,000
    const formattedMatch = raw.match(/\b([0-9]{1,3}(?:[.,][0-9]{3})+)\b/)
    if (formattedMatch) {
      const digitsOnly = formattedMatch[1].replace(/[.,]/g, '')
      const num = parseInt(digitsOnly, 10)
      if (!isNaN(num) && num > 0) return num
    }

    // 4. Standalone plain integer with word boundaries (isolated nominal):
    // Length 3 to 10 digits to exclude large millisecond timestamps / accounts
    const plainMatches = raw.match(/\b([0-9]{3,10})\b/g)
    if (plainMatches && plainMatches.length > 0) {
      for (const m of plainMatches) {
        const num = parseInt(m, 10)
        if (!isNaN(num) && num >= 100 && num <= 50000000000) return num
      }
    }

    // Fallback: 1-2 digit plain number (e.g. 50)
    const shortMatch = raw.match(/\b([0-9]{1,2})\b/)
    if (shortMatch) {
      const num = parseInt(shortMatch[1], 10)
      if (!isNaN(num) && num > 0) return num
    }

    return null
  }

  /**
   * Mengambil setting konfigurasi provider aktif dari database
   */
  static async getAIConfig(): Promise<{
    mode: 'single' | 'parallel_failover'
    primaryProvider: 'gemini' | 'openai' | 'deepseek'
    providers: Record<string, { apiKey: string; model: string; isActive: boolean }>
  }> {
    const admin = createAdminClient()
    const { data: settings } = await admin
      .from('system_settings')
      .select('value')
      .eq('key', 'ai_routing')
      .maybeSingle()

    const { data: providers } = await admin
      .from('ai_providers_config')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true })

    const mode = (settings?.value as any)?.mode || 'single'
    const primaryProvider = (settings?.value as any)?.primary_provider || 'gemini'

    const providersMap: Record<string, any> = {
      gemini: {
        apiKey: process.env.GEMINI_API_KEY || '',
        model: 'gemini-1.5-flash',
        isActive: true,
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: 'gpt-4o-mini',
        isActive: !!process.env.OPENAI_API_KEY,
      },
      deepseek: {
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        model: 'deepseek-chat',
        isActive: !!process.env.DEEPSEEK_API_KEY,
      },
    }

    if (providers && providers.length > 0) {
      for (const p of providers) {
        providersMap[p.provider_name] = {
          apiKey: p.api_key_encrypted || providersMap[p.provider_name]?.apiKey,
          model: p.model_name || providersMap[p.provider_name]?.model,
          isActive: p.is_active,
        }
      }
    }

    return { mode, primaryProvider, providers: providersMap }
  }

  /**
   * Catat pemanggilan AI ke tabel ai_call_logs
   */
  static async logAICall(log: {
    userId?: string | null
    provider: string
    promptType: AICallLog['prompt_type']
    inputTokens: number
    outputTokens: number
    latencyMs: number
    status: 'success' | 'error' | 'fallback'
    errorMessage?: string | null
  }) {
    try {
      const admin = createAdminClient()
      await admin.from('ai_call_logs').insert({
        user_id: log.userId,
        provider: log.provider,
        prompt_type: log.promptType,
        input_tokens: log.inputTokens,
        output_tokens: log.outputTokens,
        latency_ms: log.latencyMs,
        status: log.status,
        error_message: log.errorMessage,
      })
    } catch (e) {
      console.error('Failed to log AI call:', e)
    }
  }

  /**
   * 1. PARSING INPUT TEKS BAHASA NATURAL INDONESIA
   * Format output: { jenis, nominal, kategori, catatan }
   */
  static async parseNaturalLanguageTransaction(
    text: string,
    userId?: string
  ): Promise<ParsedTransactionResult> {
    const startTime = Date.now()
    const { primaryProvider, providers, mode } = await this.getAIConfig()

    const systemPrompt = `
Anda adalah sistem AI parser transaksi keuangan pribadi berbahasa Indonesia untuk aplikasi TataDana.
Tugas Anda: Ubah kalimat natural dari user Telegram menjadi data JSON terstruktur yang valid.

Aturan Penting:
1. Jenis hanya boleh "income" (pemasukan) atau "expense" (pengeluaran).
   - "beli", "bayar", "jajan", "makan", "isi bensin", "ongkir", "checkout", "topup game" = expense
   - "gajian", "terima gaji", "dapat transferan", "bonus", "uang saku", "cair", "hasil jualan" = income
2. Parsing nominal harus paham bahasa sehari-hari Indonesia:
   - "15rb", "15ribu", "15rebu", "15k" = 15000
   - "1.5jt", "1,5jt", "1.5 juta" = 1500000
   - "500k" = 500000
   - "200 rebu" = 200000
   - "25000" = 25000
3. Tentukan kategori umum yang cocok dalam bahasa Indonesia (contoh: Makanan & Minuman, Transportasi, Tagihan & Utilitas, Belanja, Hiburan, Kesehatan, Gaji Pokok, Freelance).
4. Catatan adalah ringkasan yang jelas dari apa yang dibeli atau sumber uangnya.
5. Jika kalimat TIDAK mengandung transaksi finansial atau nominal tidak ditemukan/ambigu, set "success": false dengan "errorMessage" dan "suggestion" yang membantu user.

Keluarkan HANYA format JSON murni tanpa markdown, contoh:
{
  "success": true,
  "jenis": "expense",
  "nominal": 15000,
  "kategori": "Makanan & Minuman",
  "catatan": "Beli bakso"
}
`

    const providersToTry =
      mode === 'parallel_failover'
        ? [primaryProvider, ...Object.keys(providers).filter((p) => p !== primaryProvider)]
        : [primaryProvider]

    let lastError: any = null

    for (const provider of providersToTry) {
      const config = providers[provider]
      if (!config || !config.isActive || !config.apiKey) continue

      try {
        let jsonResult: any = null

        if (provider === 'gemini') {
          jsonResult = await this.callGeminiJSON(config.apiKey, config.model, systemPrompt, text)
        } else if (provider === 'openai' || provider === 'deepseek') {
          const endpoint =
            provider === 'deepseek'
              ? 'https://api.deepseek.com/v1/chat/completions'
              : 'https://api.openai.com/v1/chat/completions'
          jsonResult = await this.callOpenAICompatible(
            endpoint,
            config.apiKey,
            config.model,
            systemPrompt,
            text
          )
        }

        const latencyMs = Date.now() - startTime

        if (jsonResult && jsonResult.success && jsonResult.nominal) {
          await this.logAICall({
            userId,
            provider,
            promptType: 'text_parse',
            inputTokens: 120,
            outputTokens: 60,
            latencyMs,
            status: 'success',
          })

          return {
            success: true,
            jenis: jsonResult.jenis === 'income' ? 'income' : 'expense',
            nominal: Number(jsonResult.nominal),
            kategori: jsonResult.kategori || (jsonResult.jenis === 'income' ? 'Pemasukan' : 'Lainnya'),
            catatan: jsonResult.catatan || text,
            rawText: text,
          }
        } else if (jsonResult && jsonResult.success === false) {
          // AI specifically identified that input is invalid / ambiguous
          return {
            success: false,
            rawText: text,
            errorMessage: jsonResult.errorMessage || 'Format pesan belum dapat dikenali.',
            suggestion:
              jsonResult.suggestion ||
              'Contoh yang benar:\n• "beli bakso 15rb"\n• "gajian 5jt"\n• "bensin shell 50k"',
          }
        }
      } catch (err: any) {
        lastError = err
        console.warn(`Provider ${provider} failed on text parsing:`, err.message)
      }
    }

    // High-precision heuristic fallback if AI API keys are unset or network issues occur
    const heuristic = this.heuristicTextParse(text)
    if (heuristic.success) {
      return heuristic
    }

    return {
      success: false,
      rawText: text,
      errorMessage: 'TataDana belum bisa mengenali nominal atau jenis transaksi dari pesan kamu.',
      suggestion:
        'Coba ketik dengan format singkat seperti:\n• "beli nasi goreng 25rb"\n• "gajian bca 6.5jt"\n• "kopi susu 18k"',
    }
  }

  /**
   * Heuristic Parser (Fallback jika AI offline / failover)
   */
  private static heuristicTextParse(text: string): ParsedTransactionResult {
    const nominal = this.parseIndonesianNumber(text)
    if (!nominal) {
      return {
        success: false,
        rawText: text,
        errorMessage: 'Nominal transaksi tidak ditemukan.',
        suggestion: 'Pastikan ada angka dan satuan, contoh: "beli kopi 20rb" atau "gajian 4jt".',
      }
    }

    const lower = text.toLowerCase()
    const isIncome =
      lower.includes('gaji') ||
      lower.includes('terima') ||
      lower.includes('transferan') ||
      lower.includes('dapat uang') ||
      lower.includes('bonus') ||
      lower.includes('cair')

    let kategori = 'Makanan & Minuman'
    if (isIncome) {
      kategori = lower.includes('freelance') ? 'Freelance & Side Job' : 'Gaji Pokok'
    } else {
      if (lower.includes('bensin') || lower.includes('grab') || lower.includes('gojek') || lower.includes('tol') || lower.includes('parkir')) {
        kategori = 'Transportasi'
      } else if (lower.includes('listrik') || lower.includes('pulsa') || lower.includes('wifi') || lower.includes('tagihan') || lower.includes('air')) {
        kategori = 'Tagihan & Utilitas'
      } else if (lower.includes('obat') || lower.includes('dokter') || lower.includes('apotek') || lower.includes('klinik')) {
        kategori = 'Kesehatan'
      } else if (lower.includes('baju') || lower.includes('sepatu') || lower.includes('shopee') || lower.includes('tokopedia') || lower.includes('belanja')) {
        kategori = 'Belanja Kebutuhan'
      } else if (lower.includes('nonton') || lower.includes('game') || lower.includes('bioskop') || lower.includes('steam')) {
        kategori = 'Hiburan'
      }
    }

    return {
      success: true,
      jenis: isIncome ? 'income' : 'expense',
      nominal,
      kategori,
      catatan: text,
      rawText: text,
    }
  }

  /**
   * 2. AI VISION OCR UNTUK FOTO STRUK BELANJA (Pro Only)
   */
  static async parseReceiptImage(
    imageBase64: string,
    mimeType: string = 'image/jpeg',
    userId?: string
  ): Promise<ReceiptOCRResult> {
    const startTime = Date.now()
    const { primaryProvider, providers } = await this.getAIConfig()
    const config = providers[primaryProvider] || providers['gemini']

    const systemPrompt = `
Anda adalah AI Vision akuntansi untuk aplikasi TataDana.
Analisis foto struk belanja ini dan ekstrak data JSON:
- merchant: Nama toko/restoran/minimarket (contoh: Indomaret, Kopi Kenangan, SPBU Shell)
- totalAmount: Total akhir yang dibayarkan (angka integer)
- date: Tanggal pada struk dalam format YYYY-MM-DD jika terbaca, jika tidak null
- items: Daftar barang/item belanja:
  [
    {
      "item_name": "Nama item",
      "quantity": 1,
      "price": 15000,
      "category": "Makanan & Minuman"
    }
  ]
- notes: Ringkasan singkat

Keluarkan HANYA JSON murni tanpa markdown.
`

    try {
      if (config.apiKey) {
        // Call Gemini 1.5 Flash Vision
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.apiKey}`
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: systemPrompt },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: imageBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              response_mime_type: 'application/json',
            },
          }),
        })

        const data = await res.json()
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (textResponse) {
          const parsed = JSON.parse(textResponse)
          await this.logAICall({
            userId,
            provider: 'gemini',
            promptType: 'receipt_ocr',
            inputTokens: 500,
            outputTokens: 200,
            latencyMs: Date.now() - startTime,
            status: 'success',
          })

          return {
            success: true,
            merchant: parsed.merchant || 'Struk Belanja',
            totalAmount: Number(parsed.totalAmount) || 0,
            date: parsed.date,
            items: parsed.items || [],
            notes: parsed.notes || `Struk dari ${parsed.merchant || 'Merchant'}`,
          }
        }
      }
    } catch (error: any) {
      console.error('Receipt OCR failed:', error)
      await this.logAICall({
        userId,
        provider: 'gemini',
        promptType: 'receipt_ocr',
        inputTokens: 500,
        outputTokens: 0,
        latencyMs: Date.now() - startTime,
        status: 'error',
        errorMessage: error.message,
      })
    }

    return {
      success: false,
      errorMessage: 'Gagal membaca struk. Pastikan foto struk terlihat jelas, terang, dan tidak buram.',
    }
  }

  /**
   * 3. SPEECH-TO-TEXT VOICE NOTE (Durasi <= 60 Detik)
   * Dukungan Groq Whisper (ultra-fast), OpenAI Whisper, dan Gemini Audio
   */
  static async transcribeAudio(
    audioBuffer: Buffer,
    mimeType: string = 'audio/ogg',
    userId?: string
  ): Promise<{ success: boolean; transcript?: string; errorMessage?: string }> {
    const startTime = Date.now()
    const { providers } = await this.getAIConfig()
    const groqKey = process.env.GROQ_API_KEY || providers.groq?.apiKey
    const openAIKey = providers.openai?.apiKey || process.env.OPENAI_API_KEY
    const geminiKey = providers.gemini?.apiKey || process.env.GEMINI_API_KEY

    // 1. Try Groq Whisper first (Ultra-fast latency < 1s)
    if (groqKey) {
      try {
        const formData = new FormData()
        const uint8 = new Uint8Array(audioBuffer)
        const blob = new Blob([uint8], { type: mimeType })
        formData.append('file', blob, 'voicenote.ogg')
        formData.append('model', 'whisper-large-v3-turbo')
        formData.append('language', 'id')
        formData.append('response_format', 'json')

        const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${groqKey}` },
          body: formData,
        })
        const data = await res.json()
        if (data.text) {
          await this.logAICall({
            userId,
            provider: 'groq',
            promptType: 'voice_stt',
            inputTokens: 100,
            outputTokens: 50,
            latencyMs: Date.now() - startTime,
            status: 'success',
          })
          return { success: true, transcript: data.text.trim() }
        }
      } catch (e: any) {
        console.warn('Groq Whisper STT failed, trying fallback:', e.message)
      }
    }

    // 2. Try OpenAI Whisper fallback
    if (openAIKey) {
      try {
        const formData = new FormData()
        const uint8 = new Uint8Array(audioBuffer)
        const blob = new Blob([uint8], { type: mimeType })
        formData.append('file', blob, 'voicenote.ogg')
        formData.append('model', 'whisper-1')
        formData.append('language', 'id')

        const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${openAIKey}` },
          body: formData,
        })
        const data = await res.json()
        if (data.text) {
          await this.logAICall({
            userId,
            provider: 'openai',
            promptType: 'voice_stt',
            inputTokens: 100,
            outputTokens: 50,
            latencyMs: Date.now() - startTime,
            status: 'success',
          })
          return { success: true, transcript: data.text.trim() }
        }
      } catch (e: any) {
        console.warn('OpenAI Whisper STT failed, trying fallback:', e.message)
      }
    }

    // 3. Try Gemini 1.5 Flash Audio Multimodal
    if (geminiKey) {
      try {
        const base64Audio = audioBuffer.toString('base64')
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: 'Transkrip rekaman suara bahasa Indonesia ini menjadi teks kata-demi-kata yang akurat. Keluarkan HANYA teks transkripsi.',
                  },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Audio,
                    },
                  },
                ],
              },
            ],
          }),
        })

        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          await this.logAICall({
            userId,
            provider: 'gemini',
            promptType: 'voice_stt',
            inputTokens: 150,
            outputTokens: 50,
            latencyMs: Date.now() - startTime,
            status: 'success',
          })
          return { success: true, transcript: text.trim() }
        }
      } catch (e: any) {
        console.error('Gemini Audio STT failed:', e)
      }
    }

    return {
      success: false,
      errorMessage: 'Gagal mendengarkan voice note. Silakan ulangi dengan suara yang lebih jelas atau ketik lewat teks.',
    }
  }

  /**
   * 4. AI FINANCIAL ADVISOR (Fitur Pro - Otomatis Terpicu)
   */
  static async generateAdvisorAdvice(context: AdvisorContext, userId?: string): Promise<string> {
    const startTime = Date.now()
    const { providers } = await this.getAIConfig()
    const apiKey = providers.gemini?.apiKey || process.env.GEMINI_API_KEY

    let situation = ''
    if (context.triggerReason === 'category_spike') {
      situation = `Pengeluaran kategori ${context.categoryName} naik lebih dari 50% dibanding periode sebelumnya (sekarang: Rp${context.categoryExpense.toLocaleString('id-ID')}).`
    } else if (context.triggerReason === 'high_burn_rate') {
      situation = `Total pengeluaran bulan ini (Rp${context.categoryExpense.toLocaleString('id-ID')}) sudah mencapai lebih dari 80% total pemasukan.`
    } else {
      situation = `Pengeluaran ini (Rp${context.categoryExpense.toLocaleString('id-ID')}) menyerap lebih dari 20% budget kategori ${context.categoryName} sekaligus.`
    }

    const prompt = `
Anda adalah AI Financial Advisor pribadi untuk aplikasi TataDana.
Nama Pengguna: ${context.userName}
Situasi: ${situation}

Buat pesan singkat, santai, dan bersahabat dengan format PERSIS seperti ini:
🤖 Financial Advisor
Hei ${context.userName}! [analisa personal singkat 1-2 kalimat berdasarkan situasi di atas]
💡 Saran: [1 saran spesifik yang actionable dan realistis]
`

    if (apiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        })
        const data = await res.json()
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (reply) {
          await this.logAICall({
            userId,
            provider: 'gemini',
            promptType: 'advisor',
            inputTokens: 100,
            outputTokens: 70,
            latencyMs: Date.now() - startTime,
            status: 'success',
          })
          return reply.trim()
        }
      } catch (e) {
        console.warn('AI Advisor call failed:', e)
      }
    }

    // Fallback template
    return `🤖 Financial Advisor
Hei ${context.userName}! Pengeluaranmu di kategori ${context.categoryName} sedang melonjak cukup tinggi nih.
💡 Saran: Coba rem belanja kategori ini selama 3-5 hari ke depan agar arus kasmu tetap aman sampai akhir bulan.`
  }

  // --- INTERNAL CALLERS ---
  private static async callGeminiJSON(
    apiKey: string,
    model: string,
    systemPrompt: string,
    userText: string
  ): Promise<any> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    const res = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(4000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt },
              { text: `Pesan User: "${userText}"` },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
        },
      }),
    })

    const data = await res.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text
    return content ? JSON.parse(content) : null
  }

  private static async callOpenAICompatible(
    endpoint: string,
    apiKey: string,
    model: string,
    systemPrompt: string,
    userText: string
  ): Promise<any> {
    const res = await fetch(endpoint, {
      method: 'POST',
      signal: AbortSignal.timeout(4000),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userText },
        ],
        response_format: { type: 'json_object' },
      }),
    })

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    return content ? JSON.parse(content) : null
  }
}
