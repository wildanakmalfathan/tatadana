import { createAdminClient } from '@/lib/supabase/admin'
import { PersistentStore } from '@/lib/db/store'
import { TelegramBotApi, TelegramMessage, TelegramUpdatePayload } from './bot-api'
import { MultiAIProviderService, ParsedTransactionResult } from '@/lib/ai/multi-provider'
import { normalizeIndonesianPhone, formatIndonesianPhone } from '@/lib/utils/phone'
import { formatRupiah } from '@/lib/utils/currency'
import { formatWIBFullDateTime, getISODateWIB, formatWIBDateString, formatWIBTimeString, getWIBDate } from '@/lib/utils/date'
import { Profile, Wallet, Category } from '@/types/database'
import { evaluateAndTriggerBudgetAlert } from '@/lib/services/budget-alert'

export class TelegramMessageHandler {
  private botApi: TelegramBotApi
  private adminClient = createAdminClient()

  constructor(token?: string) {
    this.botApi = new TelegramBotApi(token)
  }

  /**
   * Main entry point dipanggil oleh Webhook
   */
  async handleUpdate(payload: TelegramUpdatePayload): Promise<{ handled: boolean; reason?: string }> {
    const updateId = payload.update_id
    if (!updateId) return { handled: false, reason: 'No update_id' }

    // 1. IDEMPOTENCY CHECK
    const { data: existingUpdate } = await this.adminClient
      .from('telegram_updates')
      .select('update_id')
      .eq('update_id', updateId)
      .maybeSingle()

    if (existingUpdate) {
      console.log(`[Idempotency] Update ${updateId} sudah pernah diproses. Melewati update dobel.`)
      return { handled: true, reason: 'Duplicate update ignored' }
    }

    const message = payload.message
    if (!message || !message.chat) {
      // Record non-message updates as skipped
      await this.recordUpdate(updateId, null, null, null, 'skipped', payload)
      return { handled: true, reason: 'No message to process' }
    }

    const chatId = message.chat.id
    const messageId = message.message_id

    try {
      // 2. USER RESOLUTION
      const user = await this.resolveUser(message)

      if (!user) {
        // User belum terhubung ke sistem
        await this.handleUnlinkedUser(message)
        await this.recordUpdate(updateId, chatId, messageId, null, 'success', payload)
        return { handled: true }
      }

      // Record update with linked user_id
      await this.recordUpdate(updateId, chatId, messageId, user.id, 'success', payload)

      // Send typing status
      await this.botApi.sendChatAction(chatId, 'typing')

      // 3. ROUTE BY MESSAGE TYPE
      // A. Contact card / Phone linking
      if (message.contact) {
        await this.handleContactCard(message, user)
        return { handled: true }
      }

      // B. Photo (Receipt OCR)
      if (message.photo && message.photo.length > 0) {
        await this.handlePhotoReceipt(message, user)
        return { handled: true }
      }

      // C. Voice note / Audio
      if (message.voice || message.audio) {
        await this.handleVoiceNote(message, user)
        return { handled: true }
      }

      // D. Text message
      if (message.text) {
        const text = message.text.trim()

        // Check Commands
        if (text.startsWith('/')) {
          await this.handleCommand(text, message, user)
          return { handled: true }
        }

        // Natural Language Text Transaction
        await this.handleTextTransaction(text, message, user)
        return { handled: true }
      }

      return { handled: true }
    } catch (err: any) {
      console.error(`Error handling update ${updateId}:`, err)
      await this.recordUpdate(updateId, chatId, messageId, null, 'error', payload, err.message)
      await this.botApi.sendMessage(
        chatId,
        '⚠️ Maaf, terjadi kendala saat memproses pesanmu. Silakan coba kembali dalam beberapa saat.'
      )
      return { handled: false, reason: err.message }
    }
  }

  // ==========================================
  // HANDLERS
  // ==========================================

  /**
   * Mencari profil user berdasarkan chat_id Telegram
   */
  private async resolveUser(message: TelegramMessage): Promise<Profile | null> {
    const chatId = message.chat.id
    try {
      const { data } = await this.adminClient
        .from('profiles')
        .select('*')
        .eq('telegram_chat_id', chatId)
        .maybeSingle()

      if (data) return data as Profile
    } catch {}

    // Fallback: PersistentStore lookup by telegram_chat_id or username
    const dbUsers = PersistentStore.getUsers()
    const dbUser = dbUsers.find(
      (u: any) =>
        u.telegram_chat_id === chatId ||
        (u.telegram_username &&
          (u.telegram_username === message.chat.username || u.telegram_username === message.from?.username))
    )
    if (dbUser) {
      return {
        id: dbUser.id,
        full_name: dbUser.name,
        phone_number: dbUser.phone,
        phone_verified: true,
        plan: (dbUser.plan === 'pro_lifetime' ? 'pro' : dbUser.plan) as any,
        telegram_chat_id: chatId,
        telegram_username: dbUser.telegram_username || message.from?.username || null,
        telegram_connected: true,
        created_at: dbUser.created_at,
        updated_at: dbUser.updated_at || dbUser.created_at,
      } as Profile
    }

    return null
  }

  /**
   * Respon jika user Telegram belum di-link ke akun web
   */
  private async handleUnlinkedUser(message: TelegramMessage) {
    const chatId = message.chat.id
    const text = message.text?.trim() || ''

    // Cek jika user mengetik nomor HP secara langsung
    const normalized = normalizeIndonesianPhone(text)
    if (normalized.startsWith('+628') && normalized.length >= 11) {
      let profile: any = null
      try {
        const { data } = await this.adminClient
          .from('profiles')
          .select('*')
          .eq('phone_number', normalized)
          .eq('phone_verified', true)
          .maybeSingle()
        profile = data
      } catch {}

      // Fallback: cek PersistentStore
      if (!profile) {
        const localUser = PersistentStore.findUserByPhone(normalized)
        if (localUser && localUser.status === 'active') {
          profile = {
            id: localUser.id,
            full_name: localUser.name,
            phone_number: localUser.phone,
            phone_verified: true,
            plan: localUser.plan,
          }
        }
      }

      if (profile) {
        // Link chat_id ke profil Supabase & PersistentStore
        try {
          await this.adminClient
            .from('profiles')
            .update({
              telegram_chat_id: chatId,
              telegram_username: message.from?.username || message.chat.username,
              telegram_connected: true,
              telegram_connected_at: new Date().toISOString(),
            })
            .eq('id', profile.id)
        } catch {}

        PersistentStore.updateUser(profile.id, {
          telegram_chat_id: chatId,
          telegram_username: message.from?.username || message.chat.username || '',
          telegram_connected: true,
        } as any)

        await this.botApi.sendMessage(
          chatId,
          `🎉 *Selamat datang di TataDana, ${profile.full_name}!*\n\n` +
            `Akun Telegram kamu berhasil terhubung dengan nomor *${formatIndonesianPhone(normalized)}*.\n\n` +
            `Mulai sekarang, kamu bisa mencatat keuangan semudah kirim chat!\n\n` +
            `💡 *Contoh pemakaian:*\n` +
            `• Ketik _"beli nasi padang 25rb"_\n` +
            `• Ketik _"gajian 6jt"_\n` +
            `• Kirim Voice Note atau foto struk belanja 📸\n\n` +
            `Ketik /bantuan untuk melihat semua perintah.`,
          { parse_mode: 'Markdown' }
        )
        return
      }
    }

    // Jika belum mengirim nomor telepon valid
    await this.botApi.sendMessage(
      chatId,
      `👋 *Halo! Selamat datang di TataDana Bot.*\n\n` +
        `Bot ini digunakan untuk mencatat pengeluaran & pemasukan harianmu langsung ke dashboard TataDana.\n\n` +
        `🔐 *Cara Menghubungkan Akun:*\n` +
        `1. Pastikan kamu sudah mendaftar di web TataDana dan memverifikasi nomor HP kamu.\n` +
        `2. Balas pesan ini dengan mengetik *Nomor HP* yang kamu daftarkan (contoh: *081234567890*).\n` +
        `3. Atau klik tombol di bawah untuk membagikan kontak secara otomatis.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [[{ text: '📱 Bagikan Nomor HP Saya', request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    )
  }

  /**
   * Handler untuk kartu kontak
   */
  private async handleContactCard(message: TelegramMessage, existingUser: Profile | null) {
    if (!message.contact) return
    const phone = normalizeIndonesianPhone(message.contact.phone_number)
    const chatId = message.chat.id

    let profile: any = null
    try {
      const { data } = await this.adminClient
        .from('profiles')
        .select('*')
        .eq('phone_number', phone)
        .eq('phone_verified', true)
        .maybeSingle()
      profile = data
    } catch {}

    if (!profile) {
      const localUser = PersistentStore.findUserByPhone(phone)
      if (localUser && localUser.status === 'active') {
        profile = {
          id: localUser.id,
          full_name: localUser.name,
          phone_number: localUser.phone,
          phone_verified: true,
          plan: localUser.plan,
        }
      }
    }

    if (profile) {
      try {
        await this.adminClient
          .from('profiles')
          .update({
            telegram_chat_id: chatId,
            telegram_username: message.from?.username,
            telegram_connected: true,
            telegram_connected_at: new Date().toISOString(),
          })
          .eq('id', profile.id)
      } catch {}

      PersistentStore.updateUser(profile.id, {
        telegram_chat_id: chatId,
        telegram_username: message.from?.username || '',
        telegram_connected: true,
      } as any)

      await this.botApi.sendMessage(
        chatId,
        `✅ *Akun Berhasil Terhubung!*\n\nHalo *${profile.full_name}*, akun Telegram kamu sudah terhubung dengan nomor *${formatIndonesianPhone(phone)}*.\n\nKetik transaksimu sekarang, misal: _"beli kopi 18k"_`,
        {
          parse_mode: 'Markdown',
          reply_markup: { remove_keyboard: true },
        }
      )
    } else {
      await this.botApi.sendMessage(
        chatId,
        `❌ Nomor *${formatIndonesianPhone(phone)}* belum terdaftar atau belum diverifikasi di TataDana.\n\nSilakan daftar terlebih dahulu di dashboard web TataDana.`,
        { parse_mode: 'Markdown' }
      )
    }
  }

  /**
   * 4.1 HANDLER TRANSAKSI TEKS BAHASA NATURAL
   */
  private async handleTextTransaction(text: string, message: TelegramMessage, user: Profile) {
    const chatId = message.chat.id

    // Check Plan Limit (50 tx/month for starter)
    if (await this.isPlanLimitExceeded(user)) {
      await this.sendPlanLimitExceededMessage(chatId)
      return
    }

    // AI Natural Language Parsing
    const parsed = await MultiAIProviderService.parseNaturalLanguageTransaction(text, user.id)

    if (!parsed.success || !parsed.nominal || !parsed.jenis) {
      await this.botApi.sendMessage(
        chatId,
        `🤔 *${parsed.errorMessage || 'Format belum dikenali'}*\n\n${parsed.suggestion || 'Contoh: "beli bakso 15rb" atau "gajian 5jt"'}`,
        { parse_mode: 'Markdown' }
      )
      return
    }

    // Process & Save
    await this.saveAndReplyTransaction({
      user,
      chatId,
      parsed,
      source: 'telegram_text',
      telegramMessageId: message.message_id,
      rawInput: text,
    })
  }

  /**
   * 4.3 HANDLER VOICE NOTE / VN (Durasi <= 60 detik)
   */
  private async handleVoiceNote(message: TelegramMessage, user: Profile) {
    const chatId = message.chat.id
    const voice = message.voice || message.audio
    if (!voice) return

    // Limit durasi maksimal 60 detik
    if (voice.duration > 60) {
      await this.botApi.sendMessage(
        chatId,
        '⏱️ *Durasi Terlalu Panjang*\n\nVoice note maksimal 60 detik ya untuk menghemat pemrosesan AI. Silakan kirim rekaman yang lebih singkat!',
        { parse_mode: 'Markdown' }
      )
      return
    }

    // Check Plan Limit
    if (await this.isPlanLimitExceeded(user)) {
      await this.sendPlanLimitExceededMessage(chatId)
      return
    }

    await this.botApi.sendChatAction(chatId, 'record_voice')

    // Download audio file
    const audioBuffer = await this.botApi.downloadFile(voice.file_id)
    if (!audioBuffer) {
      await this.botApi.sendMessage(chatId, '⚠️ Gagal mengunduh file suara dari Telegram. Silakan coba lagi.')
      return
    }

    // Transcribe STT
    const stt = await MultiAIProviderService.transcribeAudio(
      audioBuffer,
      voice.mime_type || 'audio/ogg',
      user.id
    )

    if (!stt.success || !stt.transcript) {
      await this.botApi.sendMessage(
        chatId,
        `🎙️ ${stt.errorMessage || 'Suara tidak terdengar jelas. Silakan ulangi rekaman atau ketik lewat teks.'}`
      )
      return
    }

    // Parse transcript
    const parsed = await MultiAIProviderService.parseNaturalLanguageTransaction(stt.transcript, user.id)

    if (!parsed.success || !parsed.nominal || !parsed.jenis) {
      await this.botApi.sendMessage(
        chatId,
        `🎙️ Transkrip: _"${stt.transcript}"_\n\n` +
          `🤔 *${parsed.errorMessage || 'Nominal transaksi belum terdengar jelas'}*\n\n` +
          `${parsed.suggestion || 'Coba ulangi dengan format jelas seperti: "beli bensin 50 ribu"'}\n\natau ketik manual via chat.`,
        { parse_mode: 'Markdown' }
      )
      return
    }

    // Save with transcript annotation
    await this.saveAndReplyTransaction({
      user,
      chatId,
      parsed,
      source: 'telegram_voice',
      telegramMessageId: message.message_id,
      rawInput: stt.transcript,
      transcriptLine: `🎙️ Transkrip: "${stt.transcript}"\n`,
    })
  }

  /**
   * 4.2 HANDLER FOTO STRUK BELANJA (Pro Only)
   */
  private async handlePhotoReceipt(message: TelegramMessage, user: Profile) {
    const chatId = message.chat.id

    // Check Plan: Pro only
    if (user.plan !== 'pro') {
      await this.botApi.sendMessage(
        chatId,
        `🔒 *Fitur Khusus TataDana Pro!*\n\n` +
          `Input transaksi via foto struk belanja dengan AI Vision hanya tersedia untuk member *TataDana Pro*.\n\n` +
          `🚀 *Upgrade ke Pro (Rp99.000 Sekali Bayar):*\n` +
          `• Scan foto struk instan & rincian per barang\n` +
          `• Transaksi, wallet & kategori tanpa batas\n` +
          `• AI Financial Advisor personal\n` +
          `• Export laporan unlimited ke PDF & Excel\n\n` +
          `Buka dashboard TataDana untuk upgrade akunmu sekarang!`,
        { parse_mode: 'Markdown' }
      )
      return
    }

    // Pro User - Download highest resolution photo
    await this.botApi.sendChatAction(chatId, 'upload_photo')
    const photos = message.photo!
    const bestPhoto = photos[photos.length - 1]

    const imageBuffer = await this.botApi.downloadFile(bestPhoto.file_id)
    if (!imageBuffer) {
      await this.botApi.sendMessage(chatId, '⚠️ Gagal mengunduh foto struk. Silakan coba kirim ulang.')
      return
    }

    // Run Vision OCR
    const base64 = imageBuffer.toString('base64')
    const ocr = await MultiAIProviderService.parseReceiptImage(base64, 'image/jpeg', user.id)

    if (!ocr.success || !ocr.totalAmount) {
      await this.botApi.sendMessage(
        chatId,
        `⚠️ *Gagal Membaca Struk*\n\n${ocr.errorMessage || 'Pastikan foto struk terlihat jelas, terang, dan tidak terpotong.'}`,
        { parse_mode: 'Markdown' }
      )
      return
    }

    // Get default wallet & category
    const defaultWallet = await this.getDefaultWallet(user.id)
    const category = await this.resolveCategory(user.id, 'expense', 'Belanja Kebutuhan')

    // Insert main transaction
    const { data: newTx, error } = await this.adminClient
      .from('transactions')
      .insert({
        user_id: user.id,
        wallet_id: defaultWallet.id,
        category_id: category.id,
        type: 'expense',
        amount: ocr.totalAmount,
        notes: ocr.merchant ? `Struk: ${ocr.merchant}` : 'Struk Belanja',
        source: 'telegram_photo',
        telegram_message_id: message.message_id,
        raw_input: message.caption || 'Foto struk belanja',
        is_multi_item: !!(ocr.items && ocr.items.length > 0),
      })
      .select()
      .single()

    if (error || !newTx) {
      await this.botApi.sendMessage(chatId, '⚠️ Gagal menyimpan transaksi struk.')
      return
    }

    // Insert transaction_items if multi-item
    if (ocr.items && ocr.items.length > 0) {
      const itemsToInsert = ocr.items.map((item) => ({
        transaction_id: newTx.id,
        item_name: item.item_name,
        quantity: item.quantity || 1,
        price: item.price,
      }))
      await this.adminClient.from('transaction_items').insert(itemsToInsert)
    }

    // Dual-write receipt transaction to PersistentStore (Single Source of Truth)
    try {
      PersistentStore.insertTransaction({
        user_id: user.id,
        wallet_id: defaultWallet.id,
        category_id: category.id,
        type: 'expense',
        amount: ocr.totalAmount,
        notes: ocr.merchant ? `Struk: ${ocr.merchant}` : 'Struk Belanja',
        source: 'telegram_photo',
        date: getISODateWIB(),
        time: formatWIBTimeString(new Date()),
        is_multi_item: !!(ocr.items && ocr.items.length > 0),
      })
    } catch (storeErr) {
      console.warn('[TelegramHandler] Dual-write receipt to PersistentStore error:', storeErr)
    }

    // Perbarui saldo dompet untuk pengeluaran struk belanja
    const prevBalance = Number(defaultWallet.balance) || 0
    const calculatedBalance = prevBalance - ocr.totalAmount
    try {
      await this.adminClient
        .from('wallets')
        .update({
          balance: calculatedBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', defaultWallet.id)
    } catch {}

    // Refresh wallet balance
    const updatedWallet = await this.getWalletById(defaultWallet.id)
    const currentBalance = updatedWallet ? Number(updatedWallet.balance) : calculatedBalance
    const nowWIB = formatWIBFullDateTime(new Date())

    let reply =
      `📅 ${nowWIB}\n` +
      `🧾 *Struk Tercatat!*\n` +
      `├ Merchant : 🏪 ${ocr.merchant || 'Toko'}\n` +
      `├ Total : ${formatRupiah(ocr.totalAmount)}\n` +
      `├ Dompet : 👛 ${defaultWallet.name}\n` +
      `├ Item : 📦 ${ocr.items?.length || 1} barang\n` +
      `└ Saldo : ${formatRupiah(currentBalance)}\n\n` +
      `✨ Rincian item sudah tersimpan di dashboard TataDana.`

    await this.botApi.sendMessage(chatId, reply, { parse_mode: 'Markdown' })

    // Evaluasi Multi-Period Budget Alert untuk struk
    try {
      if (chatId) {
        try {
          await this.adminClient
            .from('profiles')
            .update({ telegram_chat_id: chatId, telegram_connected: true })
            .eq('id', user.id)
        } catch {}
      }
      await evaluateAndTriggerBudgetAlert(user.id, {
        category_id: category.id,
        amount: ocr.totalAmount,
        date: newTx?.date || getISODateWIB(),
      })
    } catch (alertErr) {
      console.error('[BudgetAlert] Error in photo receipt alert:', alertErr)
    }
  }

  /**
   * SIMPAN TRANSAKSI & KIRIM BALASAN FORMAT EKSAK (4.4 & 4.5)
   */
  private async saveAndReplyTransaction(params: {
    user: Profile
    chatId: number
    parsed: ParsedTransactionResult
    source: 'telegram_text' | 'telegram_voice'
    telegramMessageId: number
    rawInput: string
    transcriptLine?: string
  }) {
    const { user, chatId, parsed, source, telegramMessageId, rawInput, transcriptLine } = params
    const nominal = parsed.nominal!
    const jenis = parsed.jenis!

    // 1. Dapatkan dompet default
    const defaultWallet = await this.getDefaultWallet(user.id)

    // 2. Tentukan atau buat kategori
    const category = await this.resolveCategory(user.id, jenis, parsed.kategori || 'Lainnya')

    // 3. Simpan transaksi (dual-write: PersistentStore + Supabase)
    let persistentTxRecord: any = null
    try {
      persistentTxRecord = PersistentStore.insertTransaction({
        user_id: user.id,
        wallet_id: defaultWallet.id,
        category_id: category.id,
        type: jenis,
        amount: nominal,
        notes: parsed.catatan || rawInput,
        source,
        date: getISODateWIB(),
        time: formatWIBTimeString(new Date()),
      })
    } catch (localStoreErr) {
      console.warn('[TelegramHandler] PersistentStore write fallback:', localStoreErr)
    }

    let newTx: any = null
    try {
      const { data } = await this.adminClient
        .from('transactions')
        .insert({
          user_id: user.id,
          wallet_id: defaultWallet.id,
          category_id: category.id,
          type: jenis,
          amount: nominal,
          notes: parsed.catatan || rawInput,
          source,
          telegram_message_id: telegramMessageId,
          raw_input: rawInput,
        })
        .select()
        .single()
      newTx = data
    } catch (dbErr) {
      console.warn('[TelegramHandler] Supabase insert note:', dbErr)
    }

    // 4. Perbarui saldo dompet di Supabase
    const prevBalance = Number(defaultWallet.balance) || 0
    const balanceDelta = jenis === 'income' ? nominal : -nominal
    const calculatedBalance = prevBalance + balanceDelta
    try {
      await this.adminClient
        .from('wallets')
        .update({
          balance: calculatedBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', defaultWallet.id)
    } catch {}

    // Ambil saldo terbaru dompet setelah update
    const updatedWallet = await this.getWalletById(defaultWallet.id)
    const currentBalance = updatedWallet ? Number(updatedWallet.balance) : calculatedBalance

    // 5. Kalkulasi Budget jika pengeluaran
    let budgetBlock = ''
    let shouldTriggerAdvisor = false
    let advisorReason: 'category_spike' | 'high_burn_rate' | 'large_single_expense' = 'large_single_expense'

    if (jenis === 'expense') {
      let budgetAmount = Number(category.budget_amount) || 0
      if (budgetAmount <= 0) {
        if (category.name?.toLowerCase().includes('makan')) budgetAmount = 2500000
        else if (category.name?.toLowerCase().includes('belanja')) budgetAmount = 2000000
        else if (category.name?.toLowerCase().includes('trans')) budgetAmount = 1000000
        else if (category.name?.toLowerCase().includes('tagih')) budgetAmount = 1500000
        else budgetAmount = 1000000
      }

      const currentMonthSpent = await this.getCategoryMonthlyExpense(user.id, category.id)

      if (budgetAmount > 0) {
        const pct = Math.round((currentMonthSpent / budgetAmount) * 100)
        const sisa = Math.max(0, budgetAmount - currentMonthSpent)

        // Progress bar visual dengan █ dan ░ (10 karakter)
        const filledCount = Math.min(10, Math.max(0, Math.round(pct / 10)))
        const emptyCount = 10 - filledCount
        const progressBar = '█'.repeat(filledCount) + '░'.repeat(emptyCount)

        let motivation = ''
        if (pct >= 100) {
          motivation = '\n🚨 Kamu sudah melewati budget bulan ini (≥100%)! Saatnya rem pengeluaran.'
        } else if (pct >= 80) {
          motivation = '\n⚠️ Hati-hati, pengeluaran kategori ini sudah mencapai ≥80% dari batas anggaran!'
        } else {
          motivation = '\n👍 Pengeluaran terkendali, pertahankan ya!'
        }

        budgetBlock =
          `\n\n📊 Budget ${category.name} bulan ini:\n` +
          `[${progressBar}] ${pct}% — sisa ${formatRupiah(sisa)}` +
          motivation

        // Cek trigger AI Advisor jika Pro
        if (user.plan === 'pro') {
          if (nominal > budgetAmount * 0.2) {
            shouldTriggerAdvisor = true
            advisorReason = 'large_single_expense'
          } else if (pct >= 80) {
            shouldTriggerAdvisor = true
            advisorReason = 'high_burn_rate'
          }
        }
      }
    }

    const nowWIB = formatWIBFullDateTime(new Date())

    // 6. SUSUN FORMAT BALASAN BOT EKSAK
    let replyText = ''

    if (jenis === 'expense') {
      // FORMAT REPLY PENGELUARAN (4.4)
      replyText =
        `📅 ${nowWIB}\n` +
        (transcriptLine || '') +
        `💸 Pengeluaran tercatat!\n` +
        `├ Nominal : ${formatRupiah(nominal)}\n` +
        `├ Kategori : ${category.emoji} ${category.name}\n` +
        `├ Dompet : 👛 ${defaultWallet.name}\n` +
        `├ Catatan : ${parsed.catatan || rawInput}\n` +
        `└ Saldo : ${formatRupiah(currentBalance)}` +
        budgetBlock
    } else {
      // FORMAT REPLY PEMASUKAN (4.5)
      replyText =
        `📅 ${nowWIB}\n` +
        (transcriptLine || '') +
        `💰 Pemasukan tercatat!\n` +
        `├ Nominal : ${formatRupiah(nominal)}\n` +
        `├ Kategori : 💼 ${category.name}\n` +
        `├ Dompet : 👛 ${defaultWallet.name}\n` +
        `└ Saldo baru : ${formatRupiah(currentBalance)}\n\n` +
        `💪 Semangat terus! Jangan lupa sisihkan untuk tabungan ya.`
    }

    // Kirim pesan konfirmasi
    await this.botApi.sendMessage(chatId, replyText)

    // Trigger Multi-Period Budget Alert (Harian, Mingguan, Bulanan)
    if (jenis === 'expense') {
      try {
        if (chatId) {
          try {
            await this.adminClient
              .from('profiles')
              .update({ telegram_chat_id: chatId, telegram_connected: true })
              .eq('id', user.id)
          } catch {}
        }
        await evaluateAndTriggerBudgetAlert(user.id, {
          category_id: category.id,
          amount: nominal,
          date: persistentTxRecord?.date || newTx?.date || getISODateWIB(),
        })
      } catch (alertErr) {
        console.error('[BudgetAlert] Error evaluating budget alert in saveAndReplyTransaction:', alertErr)
      }
    }

    // 7. AI FINANCIAL ADVISOR (Fitur Pro - Otomatis terpicu)
    if (shouldTriggerAdvisor && user.plan === 'pro') {
      const advice = await MultiAIProviderService.generateAdvisorAdvice(
        {
          userName: user.full_name.split(' ')[0] || 'Kawan',
          totalIncome: 0,
          totalExpense: currentBalance,
          categoryName: category.name,
          categoryExpense: nominal,
          budgetAmount: Number(category.budget_amount) || 0,
          triggerReason: advisorReason,
        },
        user.id
      )

      await this.botApi.sendMessage(chatId, advice)
    }
  }

  /**
   * 4.6 COMMANDS BOT
   */
  private async handleCommand(commandText: string, message: TelegramMessage, user: Profile) {
    const chatId = message.chat.id
    const cmd = commandText.toLowerCase().replace(/@.+/, '').trim()

    if (cmd === '/start') {
      await this.botApi.sendMessage(
        chatId,
        `👋 *Halo ${user.full_name}!*\n\n` +
          `TataDana Bot siap mencatat keuanganmu kapan saja.\n\n` +
          `💬 *Cara Pakai:*\n` +
          `• Cukup ketik seperti chat biasa: _"makan siang 25rb"_\n` +
          `• Atau kirim *Voice Note* (maks 60 detik)\n` +
          `• Atau kirim *Foto Struk Belanja* 📸 (fitur Pro)\n\n` +
          `📋 Ketik /bantuan untuk daftar perintah.`,
        { parse_mode: 'Markdown' }
      )
      return
    }

    if (cmd === '/saldo') {
      let walletsList: any[] = []
      try {
        const { data: wallets } = await this.adminClient
          .from('wallets')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
        if (wallets && wallets.length > 0) walletsList = wallets
      } catch {}

      if (walletsList.length === 0) {
        try {
          walletsList = PersistentStore.getWallets(user.id)
        } catch {}
      }

      if (!walletsList || walletsList.length === 0) {
        await this.botApi.sendMessage(chatId, '👛 Belum ada dompet terdaftar.')
        return
      }

      let totalSaldo = 0
      let text = `👛 *Daftar Saldo Dompet TataDana*\n\n`

      for (const w of walletsList) {
        const bal = Number(w.balance) || 0
        totalSaldo += bal
        const defaultMark = (w.is_default || w.is_default_telegram) ? ' *(Utama)*' : ''
        text += `• ${w.icon || '💳'} *${w.name}*${defaultMark} : ${formatRupiah(bal)}\n`
      }

      text += `\n━━━━━━━━━━━━━━━\n`
      text += `💰 *Total Semua Dompet: ${formatRupiah(totalSaldo)}*`

      await this.botApi.sendMessage(chatId, text, { parse_mode: 'Markdown' })
      return
    }

    if (cmd === '/hari ini' || cmd === '/hari_ini') {
      const today = getISODateWIB()
      await this.sendPeriodRecap(chatId, user.id, today, today, 'Hari Ini')
      return
    }

    if (cmd === '/minggu ini' || cmd === '/minggu_ini') {
      const now = new Date()
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const start = getISODateWIB(past7)
      const end = getISODateWIB(now)
      await this.sendPeriodRecap(chatId, user.id, start, end, '7 Hari Terakhir')
      return
    }

    if (cmd === '/bulan ini' || cmd === '/bulan_ini') {
      const today = getISODateWIB()
      const startOfMonth = today.substring(0, 8) + '01'
      await this.sendPeriodRecap(chatId, user.id, startOfMonth, today, 'Bulan Ini')
      return
    }

    if (cmd.startsWith('/budget')) {
      const parts = cmd.split(' ')
      const periodArg = parts[1]?.toLowerCase()

      let categoriesList: any[] = []
      try {
        const { data: categories } = await this.adminClient
          .from('categories')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'expense')
        if (categories && categories.length > 0) categoriesList = categories
      } catch {}

      if (categoriesList.length === 0) {
        try {
          categoriesList = PersistentStore.getCategories(user.id).filter((c) => c.type === 'expense')
        } catch {}
      }

      let activeCategories = categoriesList.filter(
        (c: any) =>
          (Number(c.budget_amount) || 0) > 0 ||
          (Number(c.budget_daily) || 0) > 0 ||
          (Number(c.budget_weekly) || 0) > 0
      )

      if (activeCategories.length === 0 && categoriesList.length > 0) {
        activeCategories = categoriesList.slice(0, 5)
      }

      if (!activeCategories || activeCategories.length === 0) {
        await this.botApi.sendMessage(
          chatId,
          '🎯 Kamu belum mengatur budget. Buka menu *Budget* di dashboard TataDana untuk mengatur anggaran Harian, Mingguan, atau Bulanan!'
        )
        return
      }

      let periodTitle = 'Bulan Ini'
      if (periodArg === 'harian' || periodArg === 'hari_ini') {
        periodTitle = 'Harian'
      } else if (periodArg === 'mingguan' || periodArg === 'minggu_ini') {
        periodTitle = 'Mingguan'
      }

      let text = `🎯 *Status Anggaran (${periodTitle})*\n\n`

      for (const cat of activeCategories) {
        let budget = Number(cat.budget_amount) || 0
        let spent = 0

        if (periodTitle === 'Harian') {
          budget = Number((cat as any).budget_daily) || (budget > 0 ? Math.round(budget / 30) : 0)
          if (budget <= 0) {
            if (cat.name?.toLowerCase().includes('makan')) budget = 75000
            else if (cat.name?.toLowerCase().includes('belanja')) budget = 60000
            else if (cat.name?.toLowerCase().includes('trans')) budget = 35000
            else if (cat.name?.toLowerCase().includes('tagih')) budget = 50000
            else budget = 30000
          }
          const today = getISODateWIB()
          const localTxs = PersistentStore.getTransactions(user.id, {
            category_id: cat.id,
            type: 'expense',
            start_date: today,
            end_date: today,
          })
          if (localTxs.length > 0) {
            spent = localTxs.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
          } else {
            try {
              const { data: txs } = await this.adminClient
                .from('transactions')
                .select('amount')
                .eq('user_id', user.id)
                .eq('category_id', cat.id)
                .eq('type', 'expense')
                .gte('date', today)
                .lte('date', today)
              spent = (txs || []).reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0)
            } catch {}
          }
        } else if (periodTitle === 'Mingguan') {
          budget = Number((cat as any).budget_weekly) || (budget > 0 ? Math.round(budget / 4) : 0)
          if (budget <= 0) {
            if (cat.name?.toLowerCase().includes('makan')) budget = 500000
            else if (cat.name?.toLowerCase().includes('belanja')) budget = 400000
            else if (cat.name?.toLowerCase().includes('trans')) budget = 200000
            else if (cat.name?.toLowerCase().includes('tagih')) budget = 350000
            else budget = 200000
          }
          const nowWib = getWIBDate()
          const day = nowWib.getDay()
          const diffToMonday = day === 0 ? -6 : 1 - day
          const monday = new Date(nowWib)
          monday.setDate(nowWib.getDate() + diffToMonday)
          const sunday = new Date(monday)
          sunday.setDate(monday.getDate() + 6)
          const startOfWeek = getISODateWIB(monday)
          const endOfWeek = getISODateWIB(sunday)

          const localTxs = PersistentStore.getTransactions(user.id, {
            category_id: cat.id,
            type: 'expense',
            start_date: startOfWeek,
            end_date: endOfWeek,
          })
          if (localTxs.length > 0) {
            spent = localTxs.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
          } else {
            try {
              const { data: txs } = await this.adminClient
                .from('transactions')
                .select('amount')
                .eq('user_id', user.id)
                .eq('category_id', cat.id)
                .eq('type', 'expense')
                .gte('date', startOfWeek)
                .lte('date', endOfWeek)
              spent = (txs || []).reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0)
            } catch {}
          }
        } else {
          if (budget <= 0) {
            if (cat.name?.toLowerCase().includes('makan')) budget = 2500000
            else if (cat.name?.toLowerCase().includes('belanja')) budget = 2000000
            else if (cat.name?.toLowerCase().includes('trans')) budget = 1000000
            else if (cat.name?.toLowerCase().includes('tagih')) budget = 1500000
            else budget = 1000000
          }
          spent = await this.getCategoryMonthlyExpense(user.id, cat.id)
        }

        if (budget <= 0) continue

        const pct = Math.round((spent / budget) * 100)
        const sisa = Math.max(0, budget - spent)

        const filled = Math.min(10, Math.max(0, Math.round(pct / 10)))
        const bar = '█'.repeat(filled) + '░'.repeat(10 - filled)

        const statusTag = pct >= 100 ? ' 🚨 Overbudget!' : pct >= 80 ? ' ⚠️ Waspada' : ' ✅ Aman'

        text += `${cat.emoji || '🏷️'} *${cat.name}*${statusTag}\n`
        text += `[${bar}] ${pct}%\n`
        text += `Terpakai: ${formatRupiah(spent)} / ${formatRupiah(budget)} (Sisa: ${formatRupiah(sisa)})\n\n`
      }

      text += `💡 *Tips:* Ketik _/budget harian_, _/budget mingguan_, atau _/budget bulanan_ untuk melihat status periode spesifik.`

      await this.botApi.sendMessage(chatId, text, { parse_mode: 'Markdown' })
      return
    }

    if (cmd === '/sheet') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tatadana.id'
      await this.botApi.sendMessage(
        chatId,
        `📊 *Dashboard Laporan Finansial TataDana*\n\n` +
          `Semua data transaksi dan laporan lengkapmu tersimpan aman di database TataDana.\n\n` +
          `Buka dashboard web untuk melihat grafik interaktif dan export laporan:\n` +
          `👉 ${appUrl}/dashboard/laporan`,
        { parse_mode: 'Markdown' }
      )
      return
    }

    if (cmd === '/bantuan' || cmd === '/help') {
      await this.botApi.sendMessage(
        chatId,
        `📖 *Daftar Perintah TataDana Bot*\n\n` +
          `*Pencatatan Cepat:*\n` +
          `• Cukup ketik teks biasa: _"beli kopi 25rb"_\n` +
          `• Catat pemasukan: _"gajian 8jt"_\n` +
          `• Kirim rekaman suara (Voice Note, maks 60 detik)\n` +
          `• Kirim foto struk belanja 📸 (Paket Pro)\n\n` +
          `*Perintah Rekap & Laporan:*\n` +
          `• /start — Pesan selamat datang & onboarding\n` +
          `• /saldo — Cek saldo semua dompet (BCA, Cash, e-Wallet)\n` +
          `• /hari_ini (atau /hari ini) — Rekap transaksi hari ini\n` +
          `• /minggu_ini (atau /minggu ini) — Rekap 7 hari terakhir\n` +
          `• /bulan_ini (atau /bulan ini) — Rekap bulan berjalan & kategori\n` +
          `• /budget — Status anggaran multi-periode (Harian, Mingguan, Bulanan)\n` +
          `• /sheet — Link ke dashboard web TataDana\n` +
          `• /bantuan — Tampilkan panduan ini`,
        { parse_mode: 'Markdown' }
      )
      return
    }

    // Unrecognized command
    await this.botApi.sendMessage(
      chatId,
      `Perintah tidak dikenali. Ketik /bantuan untuk melihat daftar perintah.`
    )
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private async isPlanLimitExceeded(user: Profile): Promise<boolean> {
    if (user.plan === 'pro') return false
    return (user.monthly_tx_count || 0) >= 50
  }

  private async sendPlanLimitExceededMessage(chatId: number) {
    await this.botApi.sendMessage(
      chatId,
      `⚠️ *Batas Transaksi Tercapai!*\n\n` +
        `Kamu sudah mencapai batas *50 transaksi gratis* bulan ini di paket Starter.\n\n` +
        `🚀 *Upgrade ke Pro (Rp99.000 Sekali Bayar):*\n` +
        `• Transaksi, wallet & kategori tanpa batas\n` +
        `• Scan struk belanja via foto dengan AI OCR\n` +
        `• AI Financial Advisor personal\n` +
        `• Export laporan unlimited ke PDF & Excel\n\n` +
        `Buka aplikasi web TataDana untuk upgrade akun sekarang!`,
      { parse_mode: 'Markdown' }
    )
  }

  private async sendPeriodRecap(
    chatId: number,
    userId: string,
    startDate: string,
    endDate: string,
    label: string
  ) {
    let txsList: any[] = []
    try {
      const { data: txs } = await this.adminClient
        .from('transactions')
        .select('type, amount, notes, category:categories(name, emoji)')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)

      if (txs && txs.length > 0) txsList = txs
    } catch {}

    if (txsList.length === 0) {
      try {
        const localTxs = PersistentStore.getTransactions(userId, {
          start_date: startDate,
          end_date: endDate,
        })
        const cats = PersistentStore.getCategories(userId)
        txsList = localTxs.map((t) => {
          const cat = t.category_id ? cats.find((c) => c.id === t.category_id) : null
          return {
            type: t.type,
            amount: t.amount,
            notes: t.notes,
            category: cat ? { name: cat.name, emoji: cat.emoji } : null,
          }
        })
      } catch {}
    }

    if (!txsList || txsList.length === 0) {
      await this.botApi.sendMessage(chatId, `Belum ada transaksi yang tercatat untuk periode ${label}.`)
      return
    }

    let income = 0
    let expense = 0
    const catMap = new Map<string, number>()

    for (const t of txsList) {
      const amt = Number(t.amount) || 0
      if (t.type === 'income') {
        income += amt
      } else if (t.type === 'expense') {
        expense += amt
        const cName = (t as any).category ? `${(t as any).category.emoji} ${(t as any).category.name}` : 'Lainnya'
        catMap.set(cName, (catMap.get(cName) || 0) + amt)
      }
    }

    let text = `📊 *Rekap Transaksi ${label}*\n\n`
    text += `💰 Pemasukan : ${formatRupiah(income)}\n`
    text += `💸 Pengeluaran : ${formatRupiah(expense)}\n`
    text += `📈 Arus Kas Bersih : ${formatRupiah(income - expense)}\n\n`

    if (catMap.size > 0) {
      text += `*Rincian Kategori Pengeluaran:*\n`
      Array.from(catMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([cat, val]) => {
          text += `• ${cat} : ${formatRupiah(val)}\n`
        })
    }

    await this.botApi.sendMessage(chatId, text, { parse_mode: 'Markdown' })
  }

  private async getDefaultWallet(userId: string): Promise<Wallet> {
    // 1. Prioritas Utama: Check PersistentStore first (Single Source of Truth)
    try {
      const persistentWallets = PersistentStore.getWallets(userId)
      if (persistentWallets && persistentWallets.length > 0) {
        const tgWallet = persistentWallets.find((w) => w.is_default_telegram)
        if (tgWallet) return tgWallet as unknown as Wallet
        const defWallet = persistentWallets.find((w) => w.is_default)
        if (defWallet) return defWallet as unknown as Wallet
        const bcaWallet = persistentWallets.find((w) => w.name.toLowerCase().includes('bca'))
        if (bcaWallet) return bcaWallet as unknown as Wallet
        return persistentWallets[0] as unknown as Wallet
      }
    } catch {}

    // 2. Supabase lookup
    try {
      const { data: tgWallet } = await this.adminClient
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default_telegram', true)
        .maybeSingle()

      if (tgWallet) return tgWallet as Wallet

      const { data: defWallet } = await this.adminClient
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .maybeSingle()

      if (defWallet) return defWallet as Wallet

      const { data: bcaWallet } = await this.adminClient
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .ilike('name', '%BCA%')
        .limit(1)
        .maybeSingle()

      if (bcaWallet) return bcaWallet as Wallet

      const { data: anyWallet } = await this.adminClient
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()

      if (anyWallet) return anyWallet as Wallet
    } catch {}

    // 3. Fallback: Buat wallet fallback BCA Utama
    const createdLocal = PersistentStore.createWallet({
      user_id: userId,
      name: 'BCA Utama',
      type: 'bank',
      balance: 0,
      is_default: true,
      is_default_telegram: true,
      icon: '🏦',
      color: '#10b981',
    })
    return createdLocal as unknown as Wallet
  }

  private async getWalletById(walletId: string): Promise<Wallet | null> {
    try {
      const local = PersistentStore.getWalletById(walletId)
      if (local) return local as unknown as Wallet
    } catch {}

    try {
      const { data } = await this.adminClient.from('wallets').select('*').eq('id', walletId).maybeSingle()
      return data as Wallet | null
    } catch {
      return null
    }
  }

  private async resolveCategory(
    userId: string,
    type: 'expense' | 'income',
    categoryName: string
  ): Promise<Category> {
    const cleanName = categoryName.trim()

    // 1. Check PersistentStore categories
    try {
      const localCats = PersistentStore.getCategories(userId)
      const localMatch =
        localCats.find(
          (c) =>
            c.type === type &&
            (c.name.toLowerCase() === cleanName.toLowerCase() ||
              c.name.toLowerCase().includes(cleanName.toLowerCase()) ||
              cleanName.toLowerCase().includes(c.name.toLowerCase()))
        ) || localCats.find((c) => c.type === type)

      if (localMatch) {
        return {
          id: localMatch.id,
          user_id: localMatch.user_id,
          name: localMatch.name,
          type: localMatch.type,
          emoji: localMatch.emoji || (type === 'income' ? '💼' : '🏷️'),
          color: localMatch.color || '#10b981',
          budget_amount: (localMatch as any).budget_amount || 0,
          budget_daily: (localMatch as any).budget_daily || 0,
          budget_weekly: (localMatch as any).budget_weekly || 0,
          created_at: (localMatch as any).created_at || new Date().toISOString(),
        } as unknown as Category
      }
    } catch {}

    // 2. Check Supabase categories
    try {
      const { data: existing } = await this.adminClient
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .eq('type', type)
        .ilike('name', `%${cleanName}%`)
        .limit(1)
        .maybeSingle()

      if (existing) return existing as Category
    } catch {}

    // 3. Create new category in Supabase
    try {
      const { data: created } = await this.adminClient
        .from('categories')
        .insert({
          user_id: userId,
          name: cleanName,
          type,
          emoji: type === 'income' ? '💼' : '🏷️',
          color: '#10b981',
          budget_amount: 0,
        })
        .select()
        .single()

      if (created) return created as Category
    } catch {}

    return {
      id: `cat-${Date.now()}`,
      user_id: userId,
      name: cleanName,
      type,
      emoji: type === 'income' ? '💼' : '🏷️',
      color: '#10b981',
      budget_amount: 0,
      created_at: new Date().toISOString(),
    } as unknown as Category
  }

  private async getCategoryMonthlyExpense(userId: string, categoryId: string): Promise<number> {
    const today = getISODateWIB()
    const startOfMonth = today.substring(0, 8) + '01'

    // Check PersistentStore transactions
    try {
      const persistentTxs = PersistentStore.getTransactions(userId, {
        category_id: categoryId,
        type: 'expense',
        start_date: startOfMonth,
        end_date: today,
      })
      if (persistentTxs && persistentTxs.length > 0) {
        return persistentTxs.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
      }
    } catch {}

    try {
      const { data: txs } = await this.adminClient
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .eq('type', 'expense')
        .gte('date', startOfMonth)
        .lte('date', today)

      if (txs) {
        return txs.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
      }
    } catch {}

    return 0
  }

  private async recordUpdate(
    updateId: number,
    chatId: number | null,
    messageId: number | null,
    userId: string | null,
    status: 'success' | 'duplicate' | 'error' | 'skipped',
    payload: any,
    errorMessage?: string
  ) {
    try {
      await this.adminClient.from('telegram_updates').upsert({
        update_id: updateId,
        chat_id: chatId,
        message_id: messageId,
        user_id: userId,
        payload,
        status,
        error_message: errorMessage,
      })
    } catch (e) {
      console.error('Failed to log telegram update:', e)
    }
  }
}
