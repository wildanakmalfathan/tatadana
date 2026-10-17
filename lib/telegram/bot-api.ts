/**
 * Telegram Bot API client wrapper
 */

export interface TelegramUser {
  id: number
  is_bot: boolean
  first_name: string
  username?: string
}

export interface TelegramChat {
  id: number
  type: string
  first_name?: string
  username?: string
}

export interface TelegramMessage {
  message_id: number
  from?: TelegramUser
  chat: TelegramChat
  date: number
  text?: string
  caption?: string
  photo?: { file_id: string; file_unique_id: string; file_size?: number; width: number; height: number }[]
  voice?: { file_id: string; file_unique_id: string; duration: number; mime_type?: string; file_size?: number }
  audio?: { file_id: string; file_unique_id: string; duration: number; mime_type?: string; file_size?: number }
  contact?: { phone_number: string; first_name: string; user_id?: number }
}

export interface TelegramUpdatePayload {
  update_id: number
  message?: TelegramMessage
  callback_query?: {
    id: string
    from: TelegramUser
    message?: TelegramMessage
    data?: string
  }
}

export class TelegramBotApi {
  private token: string

  constructor(token?: string) {
    this.token = token || process.env.TELEGRAM_BOT_TOKEN || ''
  }

  private get baseUrl(): string {
    return `https://api.telegram.org/bot${this.token}`
  }

  /**
   * Cek apakah token masih kosong atau placeholder
   */
  isConfigured(): boolean {
    return Boolean(this.token && !this.token.includes('placeholder'))
  }

  /**
   * Test token validitas via getMe
   */
  async getMe(): Promise<{ ok: boolean; result?: TelegramUser; description?: string }> {
    if (!this.isConfigured()) {
      return { ok: false, description: 'Token bot belum diatur atau masih placeholder' }
    }
    try {
      const res = await fetch(`${this.baseUrl}/getMe`, { method: 'GET' })
      const data = await res.json()
      return data
    } catch (error: any) {
      return { ok: false, description: error.message || 'Gagal menghubungi Telegram API' }
    }
  }

  /**
   * Set public webhook endpoint ke Telegram
   */
  async setWebhook(webhookUrl: string): Promise<{ ok: boolean; description?: string }> {
    if (!this.isConfigured()) {
      return { ok: false, description: 'Token bot belum diatur atau masih placeholder' }
    }
    try {
      const res = await fetch(`${this.baseUrl}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query'],
          drop_pending_updates: false,
        }),
      })
      const data = await res.json()
      return data
    } catch (error: any) {
      return { ok: false, description: error.message || 'Gagal mengatur webhook Telegram' }
    }
  }

  /**
   * Hapus webhook Telegram (memungkinkan mode getUpdates / polling lokal)
   */
  async deleteWebhook(options?: { drop_pending_updates?: boolean }): Promise<{ ok: boolean; description?: string }> {
    if (!this.isConfigured()) {
      return { ok: false, description: 'Token bot belum diatur atau masih placeholder' }
    }
    try {
      const url = new URL(`${this.baseUrl}/deleteWebhook`)
      if (options?.drop_pending_updates !== undefined) {
        url.searchParams.set('drop_pending_updates', String(options.drop_pending_updates))
      }
      const res = await fetch(url.toString(), { method: 'POST' })
      const data = await res.json()
      return data
    } catch (error: any) {
      return { ok: false, description: error.message || 'Gagal menghapus webhook Telegram' }
    }
  }

  /**
   * Ambil update pesan masuk dari Telegram (polling mode untuk local dev)
   */
  async getUpdates(
    offset?: number,
    limit = 50,
    timeout = 0
  ): Promise<{ ok: boolean; result?: TelegramUpdatePayload[]; description?: string }> {
    if (!this.isConfigured()) {
      return { ok: false, description: 'Token bot belum diatur atau masih placeholder' }
    }
    try {
      const url = new URL(`${this.baseUrl}/getUpdates`)
      if (offset !== undefined && offset !== null) url.searchParams.set('offset', String(offset))
      if (limit !== undefined && limit !== null) url.searchParams.set('limit', String(limit))
      if (timeout !== undefined && timeout !== null) url.searchParams.set('timeout', String(timeout))
      const res = await fetch(url.toString(), { method: 'GET' })
      const data = await res.json()
      return data
    } catch (error: any) {
      return { ok: false, description: error.message || 'Gagal memanggil getUpdates' }
    }
  }

  /**
   * Kirim pesan teks ke chat Telegram
   */
  async sendMessage(
    chatId: number | string,
    text: string,
    options: {
      parse_mode?: 'Markdown' | 'HTML'
      reply_markup?: any
      reply_to_message_id?: number
    } = {}
  ): Promise<{ ok: boolean; result?: any; description?: string }> {
    if (!this.isConfigured()) {
      return { ok: false, description: 'Token bot belum diatur atau masih placeholder' }
    }
    try {
      const payload: any = {
        chat_id: chatId,
        text,
        reply_markup: options.reply_markup,
        reply_to_message_id: options.reply_to_message_id,
      }
      if (options.parse_mode) {
        payload.parse_mode = options.parse_mode
      }

      const res = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      // Fallback: jika parse_mode Markdown error (400 Bad Request karena unescaped characters), coba kirim ulang plain text
      if (!data.ok && options.parse_mode && data.description?.toLowerCase().includes('parse')) {
        const plainPayload = { ...payload }
        delete plainPayload.parse_mode
        const retryRes = await fetch(`${this.baseUrl}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(plainPayload),
        })
        return await retryRes.json()
      }

      return data
    } catch (error: any) {
      console.error('Telegram sendMessage error:', error)
      return { ok: false, description: error.message }
    }
  }

  /**
   * Kirim status sedang mengetik / upload
   */
  async sendChatAction(
    chatId: number | string,
    action: 'typing' | 'upload_photo' | 'record_voice' | 'upload_document' = 'typing'
  ): Promise<boolean> {
    try {
      await fetch(`${this.baseUrl}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, action }),
      })
      return true
    } catch {
      return false
    }
  }

  /**
   * Dapatkan URL file dari file_id Telegram
   */
  async getFile(fileId: string): Promise<{ ok: boolean; file_path?: string; file_url?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/getFile?file_id=${fileId}`)
      const data = await res.json()
      if (data.ok && data.result?.file_path) {
        return {
          ok: true,
          file_path: data.result.file_path,
          file_url: `https://api.telegram.org/file/bot${this.token}/${data.result.file_path}`,
        }
      }
      return { ok: false }
    } catch (error) {
      console.error('Telegram getFile error:', error)
      return { ok: false }
    }
  }

  /**
   * Unduh buffer file dari Telegram
   */
  async downloadFile(fileId: string): Promise<Buffer | null> {
    const fileInfo = await this.getFile(fileId)
    if (!fileInfo.ok || !fileInfo.file_url) return null

    try {
      const response = await fetch(fileInfo.file_url)
      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (error) {
      console.error('Telegram downloadFile error:', error)
      return null
    }
  }
}
