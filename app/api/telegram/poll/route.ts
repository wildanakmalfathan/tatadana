import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { TelegramBotApi } from '@/lib/telegram/bot-api'
import { TelegramMessageHandler } from '@/lib/telegram/message-handler'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Store last processed update_id in memory for local polling session
let lastUpdateOffset = 0
let webhookCleaned = false

function readDiskOffset(): number {
  try {
    const rootOffset = path.join(process.cwd(), '.telegram-offset.json')
    const scriptsOffset = path.join(process.cwd(), 'scripts', '.telegram-offset.json')
    for (const filePath of [rootOffset, scriptsOffset]) {
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        const offset = typeof data.offset === 'number' && data.offset > 0 ? data.offset : 0
        const last_update_id =
          typeof data.last_update_id === 'number' && data.last_update_id > 0
            ? data.last_update_id
            : offset > 0
              ? offset - 1
              : 0
        if (last_update_id > 0) {
          return last_update_id
        }
      }
    }
  } catch {
    // ignore
  }
  return 0
}

const getPersistedOffset = readDiskOffset

function persistOffset(newOffset: number) {
  try {
    const existingDiskOffset = readDiskOffset()
    if (existingDiskOffset >= newOffset) {
      return
    }

    const payload = JSON.stringify(
      {
        offset: newOffset + 1,
        last_update_id: newOffset,
        updated_at: new Date().toISOString(),
        timezone: 'Asia/Jakarta (WIB)',
      },
      null,
      2
    )
    const rootOffset = path.join(process.cwd(), '.telegram-offset.json')
    fs.writeFileSync(rootOffset, payload)
    const scriptsOffset = path.join(process.cwd(), 'scripts', '.telegram-offset.json')
    if (fs.existsSync(path.dirname(scriptsOffset))) {
      fs.writeFileSync(scriptsOffset, payload)
    }
  } catch {
    // ignore
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token') || process.env.TELEGRAM_BOT_TOKEN
    const forceCleanup = searchParams.get('cleanup') === 'true'
    const queryOffset = searchParams.get('offset')
    const timeout = Math.min(25, Math.max(0, Number(searchParams.get('timeout')) || 0))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20))

    if (!token || token.includes('placeholder')) {
      return NextResponse.json({
        ok: false,
        mode: 'long_polling',
        isPlaceholder: true,
        message: 'Token bot belum diatur atau masih placeholder. Masukkan token bot Telegram yang valid dari @BotFather.',
      })
    }

    const botApi = new TelegramBotApi(token)

    // 1. Webhook Cleanup (on startup or explicit cleanup parameter)
    let cleanedThisCall = false
    if (!webhookCleaned || forceCleanup) {
      const delRes = await botApi.deleteWebhook({ drop_pending_updates: false })
      if (delRes.ok) {
        webhookCleaned = true
        cleanedThisCall = true
      }
    }

    // 2. Synchronize offset: always reconcile with disk offset on every request
    const diskOffset = readDiskOffset()
    if (diskOffset && diskOffset > lastUpdateOffset) {
      lastUpdateOffset = diskOffset
    }

    let unreadOffset: number | undefined = undefined

    if (lastUpdateOffset > 0) {
      unreadOffset = lastUpdateOffset + 1
    } else {
      // Fallback to database if both disk and in-memory offset are empty
      try {
        const admin = createAdminClient()
        const { data } = await admin
          .from('telegram_updates')
          .select('update_id')
          .order('update_id', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (data && typeof data.update_id === 'number' && data.update_id > 0) {
          lastUpdateOffset = data.update_id
          unreadOffset = data.update_id + 1
        }
      } catch {
        // ignore
      }
    }

    // 3. Calculate query offset
    const queryOffsetNum =
      queryOffset !== null && queryOffset !== undefined && !isNaN(Number(queryOffset))
        ? Number(queryOffset)
        : null

    const currentOffset =
      queryOffsetNum !== null
        ? queryOffsetNum
        : unreadOffset !== undefined && unreadOffset > 0
          ? unreadOffset
          : undefined

    let updatesRes = await botApi.getUpdates(currentOffset, limit, timeout)

    // 4. Self-healing 409 Conflict: only delete webhook if conflict explicitly mentions webhook active
    // and do NOT delete if desc includes 'terminated by other getupdates'
    if (!updatesRes.ok) {
      const desc = updatesRes.description?.toLowerCase() || ''
      if (desc.includes('webhook') && !desc.includes('terminated by other getupdates')) {
        console.warn('[Telegram Poll] 409 Conflict detected: Webhook still active. Deleting webhook and retrying...')
        const delRes = await botApi.deleteWebhook({ drop_pending_updates: false })
        if (delRes.ok) {
          webhookCleaned = true
          cleanedThisCall = true
          updatesRes = await botApi.getUpdates(currentOffset, limit, timeout)
        }
      } else if (desc.includes('conflict') || desc.includes('terminated by other getupdates')) {
        console.warn('[Telegram Poll] 409 Conflict: Another polling instance is active (daemon or browser tab).')
      }
    }

    if (!updatesRes.ok || !updatesRes.result) {
      return NextResponse.json({
        ok: false,
        mode: 'long_polling',
        webhookCleaned,
        message: `Gagal memanggil getUpdates: ${updatesRes.description || 'Unknown error'}`,
      })
    }

    const updates = updatesRes.result
    const handler = new TelegramMessageHandler(token)
    const processed = []

    for (const update of updates) {
      lastUpdateOffset = Math.max(lastUpdateOffset, update.update_id)
      const res = await handler.handleUpdate(update)
      processed.push({
        update_id: update.update_id,
        sender: update.message?.from?.username || update.message?.from?.first_name || 'unknown',
        text: update.message?.text || (update.message?.photo ? '[Photo Receipt]' : update.message?.voice ? '[Voice Note]' : '[Other]'),
        result: res,
      })
    }

    if (updates && updates.length > 0 && lastUpdateOffset > 0) {
      persistOffset(lastUpdateOffset)
    }

    return NextResponse.json({
      ok: true,
      mode: 'long_polling',
      count: updates.length,
      lastOffset: lastUpdateOffset,
      webhookCleaned,
      cleanedThisCall,
      processed,
      message: updates.length > 0
        ? `Berhasil memproses ${updates.length} pesan baru dari Telegram!`
        : 'Tidak ada pesan baru. Ketik pesan ke bot Anda di Telegram lalu periksa lagi.',
    })
  } catch (error: any) {
    console.error('[Telegram Poll Route Error]:', error)
    return NextResponse.json({ ok: false, mode: 'long_polling', error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  // Always reconcile with disk offset on every request
  const diskOffset = readDiskOffset()
  if (diskOffset && diskOffset > lastUpdateOffset) {
    lastUpdateOffset = diskOffset
  }
  // Support POST triggering manual poll or explicit webhook deletion
  return GET(req)
}
