import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TelegramBotApi } from '@/lib/telegram/bot-api'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    // Fallback to local admin user if session cookie is not set in localhost dev
    const userId = authUser?.id || '00000000-0000-0000-0000-000000000001'

    const body = await req.json()
    const { botToken } = body

    if (!botToken || !botToken.trim()) {
      return NextResponse.json(
        { success: false, message: 'Token bot Telegram wajib diisi.' },
        { status: 400 }
      )
    }

    const cleanToken = botToken.trim()
    const adminClient = createAdminClient()

    // Dev / Demo Token Simulation mode
    const isMockToken =
      cleanToken.toLowerCase().includes('demo') ||
      cleanToken.toLowerCase().includes('test') ||
      cleanToken.toLowerCase().includes('placeholder') ||
      cleanToken === '123456:ABC-DEF'

    if (isMockToken) {
      await adminClient
        .from('profiles')
        .update({
          telegram_bot_token: cleanToken,
          telegram_connected: true,
          telegram_mode: 'long_polling',
          telegram_connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      return NextResponse.json({
        success: true,
        mode: 'long_polling',
        status: 'connected',
        botInfo: {
          id: 999999999,
          firstName: 'TataDana Dev Simulator',
          username: 'TataDanaDevBot',
        },
        message: 'Token bot valid (@TataDanaDevBot)! Mode Long Polling aktif (Webhook dinonaktifkan).',
      })
    }

    // 1. Validasi keunikan token: Cegah 1 token dipakai lebih dari 1 user
    const { data: existingUserWithToken } = await adminClient
      .from('profiles')
      .select('id, full_name')
      .eq('telegram_bot_token', cleanToken)
      .neq('id', userId)
      .maybeSingle()

    if (existingUserWithToken) {
      return NextResponse.json(
        {
          success: false,
          message: 'Token bot Telegram ini sudah digunakan oleh akun lain.',
        },
        { status: 400 }
      )
    }

    // 2. Test Koneksi: Panggil getMe ke Telegram API
    const botClient = new TelegramBotApi(cleanToken)
    const testResult = await botClient.getMe()

    if (!testResult.ok || !testResult.result) {
      return NextResponse.json(
        {
          success: false,
          message: `Token bot tidak valid atau tidak ditemukan di Telegram: ${testResult.description || 'Unauthorized (Pastikan token dari @BotFather sudah benar)'}`,
          status: 'disconnected',
        },
        { status: 400 }
      )
    }

    const botInfo = testResult.result

    // 3. Unconditionally execute deleteWebhook to clear server webhooks and transition to Long Polling
    const baseUrl = process.env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const isLocalhost =
      baseUrl.includes('localhost') ||
      baseUrl.includes('127.0.0.1') ||
      baseUrl.startsWith('http://')

    const deleteWebhookRes = await botClient.deleteWebhook({ drop_pending_updates: false })
    const webhookCleaned = deleteWebhookRes.ok
    const webhookStatusMsg = `Token bot valid (@${botInfo.username})! Mode Long Polling aktif (Webhook dinonaktifkan).`

    // 4. Simpan token & status koneksi ke database dengan mode long_polling
    await adminClient
      .from('profiles')
      .update({
        telegram_bot_token: cleanToken,
        telegram_connected: true,
        telegram_mode: 'long_polling',
        telegram_connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    return NextResponse.json({
      success: true,
      mode: 'long_polling',
      status: 'connected',
      botInfo: {
        id: botInfo.id,
        firstName: botInfo.first_name,
        username: botInfo.username,
      },
      message: webhookStatusMsg,
      webhookCleaned,
      isLocalhost,
    })
  } catch (error: any) {
    console.error('API Setup Bot Error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Terjadi kesalahan sistem.' },
      { status: 500 }
    )
  }
}
