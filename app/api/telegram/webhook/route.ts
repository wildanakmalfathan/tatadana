import { NextResponse } from 'next/server'
import { TelegramMessageHandler } from '@/lib/telegram/message-handler'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    // 1. Validate X-Telegram-Bot-Api-Secret-Token header if secret is configured
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (webhookSecret) {
      const incomingSecret = req.headers.get('x-telegram-bot-api-secret-token')
      if (incomingSecret !== webhookSecret) {
        console.warn('[Telegram Webhook] Unauthorized request rejected: Invalid Secret Token')
        return NextResponse.json({ ok: false, error: 'Unauthorized webhook access' }, { status: 401 })
      }
    }

    const payload = await req.json()

    if (!payload || !payload.update_id) {
      return NextResponse.json({ ok: false, error: 'Invalid update payload' }, { status: 400 })
    }

    // 2. Delegate to Idempotent Telegram Message Handler
    const handler = new TelegramMessageHandler()
    const result = await handler.handleUpdate(payload)

    return NextResponse.json({ ok: true, result })
  } catch (error: any) {
    console.error('Telegram Webhook error:', error)
    // Always return 200 OK to Telegram to prevent persistent retry storm
    return NextResponse.json({ ok: true, error: error.message })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'TataDana Telegram Webhook Handler',
    timezone: 'Asia/Jakarta (WIB)',
    timestamp: new Date().toISOString(),
  })
}
