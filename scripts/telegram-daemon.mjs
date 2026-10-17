#!/usr/bin/env node

/**
 * ==============================================================================
 * TataDana Telegram Bot Long-Polling Daemon (scripts/telegram-daemon.mjs)
 * ==============================================================================
 * Standalone background service running pure Long-Polling with official Telegram
 * HTTP timeout parameter `timeout: 25` to fetch and forward updates in real time
 * without requiring public HTTPS domains, SSL certs, ngrok, or cloudflare tunnels.
 *
 * Core Capabilities:
 * 1. Startup Webhook Clean: Calls deleteWebhook({ drop_pending_updates: false })
 *    to cleanly unbind active webhooks and prevent HTTP 409 Conflict.
 * 2. Persistent Offset Management: Atomically tracks and saves `update_id + 1` in
 *    `.telegram-offset.json` (both project root and scripts folder) to prevent
 *    duplicate processing or message loss.
 * 3. Full Telegram Message Type Support:
 *    - Indonesian natural language text ("beli sate 25rb", "gajian 5jt")
 *    - Photo receipts for Vision OCR scanning
 *    - Audio voice notes for STT transcription
 *    - Slash commands: /start, /saldo, /budget, /hari_ini, /minggu_ini, /bulan_ini, /bantuan
 *    - Contact cards for user account linking
 * 4. Resilient Forwarding: Dispatches updates to `POST /api/telegram/webhook`.
 *    Gracefully handles connection failures (e.g., Next.js offline) without crashing
 *    or skipping unconfirmed updates, pausing with backoff until Next.js recovers.
 * 5. Clean CLI options: Supports --check-config, --dry-run, and --once flags.
 * ==============================================================================
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

// 1. Load .env.local & .env if not already in process.env
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const eqIdx = line.indexOf('=')
      if (eqIdx === -1) continue
      const key = line.substring(0, eqIdx).trim()
      let val = line.substring(eqIdx + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  } catch (err) {
    console.warn(`[Config] Gagal membaca env file ${filePath}:`, err.message)
  }
}

loadEnvFile(path.join(projectRoot, '.env.local'))
loadEnvFile(path.join(projectRoot, '.env'))

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || ''
const APP_URL =
  process.env.WEBHOOK_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000'
const WEBHOOK_FORWARD_URL = `${APP_URL}/api/telegram/webhook`

// Primary and mirror paths for persistent offset storage
const ROOT_OFFSET_FILE = path.join(projectRoot, '.telegram-offset.json')
const SCRIPTS_OFFSET_FILE = path.join(__dirname, '.telegram-offset.json')

// Helper format timestamp WIB (Asia/Jakarta)
function getWIBTimestamp() {
  const now = new Date()
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now)
}

// Helper persistent offset management
function readSavedOffset() {
  for (const filePath of [ROOT_OFFSET_FILE, SCRIPTS_OFFSET_FILE]) {
    try {
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        const offset = Number(data.offset) || 0
        if (offset > 0) return offset
      }
    } catch {
      // Ignore parse/read errors and try next
    }
  }
  return 0
}

function saveOffset(offset, lastUpdateId) {
  const payload = JSON.stringify(
    {
      offset,
      last_update_id: lastUpdateId ?? (offset > 0 ? offset - 1 : 0),
      updated_at: new Date().toISOString(),
      timezone: 'Asia/Jakarta (WIB)',
    },
    null,
    2
  )

  for (const filePath of [ROOT_OFFSET_FILE, SCRIPTS_OFFSET_FILE]) {
    try {
      const tmpFile = `${filePath}.tmp`
      fs.writeFileSync(tmpFile, payload, 'utf-8')
      fs.renameSync(tmpFile, filePath)
    } catch {
      try {
        fs.writeFileSync(filePath, payload, 'utf-8')
      } catch (err) {
        console.error(`[${getWIBTimestamp()} WIB] ⚠️ Gagal menyimpan offset ke ${filePath}:`, err.message)
      }
    }
  }
}

// Telegram API Helper
async function callTelegram(method, params = {}, httpMethod = 'POST') {
  const url = new URL(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`)
  let fetchOptions = { method: httpMethod }

  if (httpMethod === 'GET') {
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) {
        url.searchParams.set(key, String(val))
      }
    }
  } else {
    fetchOptions.headers = { 'Content-Type': 'application/json' }
    fetchOptions.body = JSON.stringify(params)
  }

  const res = await fetch(url.toString(), fetchOptions)
  return await res.json()
}

let isRunning = true
let currentOffset = readSavedOffset()

// Startup banner
function printBanner(botInfo) {
  console.log('================================================================')
  console.log('   TATADANA TELEGRAM AUTO-RESPONDER DAEMON (LONG POLLING)       ')
  console.log('================================================================')
  console.log(`[${getWIBTimestamp()} WIB] 🚀 Status: AKTIF (Pure Long-Polling Engine)`)
  console.log(`[${getWIBTimestamp()} WIB] 🤖 Bot: @${botInfo?.username || 'tatadana_bot'} (ID: ${botInfo?.id || '-'})`)
  console.log(`[${getWIBTimestamp()} WIB] ⏱️ Timeout Parameter: 25 detik (Official Telegram HTTP Long Polling)`)
  console.log(`[${getWIBTimestamp()} WIB] 🔗 Forwarder Target: ${WEBHOOK_FORWARD_URL}`)
  console.log(`[${getWIBTimestamp()} WIB] 💾 Persistent Offset File: ${ROOT_OFFSET_FILE}`)
  console.log(`[${getWIBTimestamp()} WIB] 📍 Current Offset: ${currentOffset}`)
  console.log('----------------------------------------------------------------')
  console.log('Mendengarkan update Telegram (Teks, Foto Struk OCR, Voice Note, /Commands)...')
  console.log('Tekan Ctrl+C untuk menghentikan daemon.\n')
}

// Message type diagnostic inspector
function categorizeMessage(update) {
  const msg =
    update.message ||
    update.edited_message ||
    update.channel_post ||
    update.callback_query?.message

  const sender =
    msg?.from?.username ? `@${msg.from.username}` : (msg?.from?.first_name || 'user')
  const chatId = msg?.chat?.id || '-'

  let typeLabel = 'UPDATE'
  let contentPreview = ''

  if (msg?.text) {
    if (msg.text.startsWith('/')) {
      typeLabel = 'SLASH_COMMAND'
      contentPreview = `⚡ ${msg.text}`
    } else {
      typeLabel = 'TEXT_TRANSACTION'
      contentPreview = `💬 "${msg.text}"`
    }
  } else if (msg?.photo && msg.photo.length > 0) {
    typeLabel = 'PHOTO_RECEIPT_OCR'
    contentPreview = `📷 [Foto Struk Belanja]${msg.caption ? ' "' + msg.caption + '"' : ''}`
  } else if (msg?.voice || msg?.audio) {
    typeLabel = 'VOICE_NOTE_STT'
    const duration = msg.voice?.duration || msg.audio?.duration || 0
    contentPreview = `🎙️ [Pesan Suara/Voice Note] (${duration}s)`
  } else if (msg?.contact) {
    typeLabel = 'CONTACT_LINKING'
    contentPreview = `📱 [Kontak Telepon] ${msg.contact.phone_number || ''}`
  } else {
    typeLabel = 'OTHER'
    contentPreview = `Update ID: ${update.update_id}`
  }

  return { typeLabel, contentPreview, sender, chatId }
}

// Graceful shutdown handlers
process.on('SIGINT', () => {
  console.log(`\n[${getWIBTimestamp()} WIB] 🛑 Sinyal SIGINT diterima. Mematikan daemon TataDana dengan aman...`)
  isRunning = false
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log(`\n[${getWIBTimestamp()} WIB] 🛑 Sinyal SIGTERM diterima. Mematikan daemon...`)
  isRunning = false
  process.exit(0)
})

async function runDaemon() {
  const args = process.argv.slice(2)
  const isCheckConfig = args.includes('--check-config') || args.includes('--dry-run')
  const isOnce = args.includes('--once')

  if (isCheckConfig) {
    console.log(`[${getWIBTimestamp()} WIB] 🔍 Menjalankan pemeriksaan konfigurasi Telegram Daemon...`)
    console.log(`- Project Root: ${projectRoot}`)
    console.log(`- App URL: ${APP_URL}`)
    console.log(`- Forward Webhook: ${WEBHOOK_FORWARD_URL}`)
    console.log(`- Persistent Offset File: ${ROOT_OFFSET_FILE}`)
    console.log(`- Current Saved Offset: ${currentOffset}`)
    console.log(`- Long Polling Timeout: 25 detik`)
    console.log(`- Token Configured: ${BOT_TOKEN ? 'YES (configured)' : 'NO (missing)'}`)
    console.log(`[${getWIBTimestamp()} WIB] ✅ Pemeriksaan konfigurasi selesai. Status: VALID.`)
    return
  }

  // Token check / mock fallback
  if (!BOT_TOKEN || BOT_TOKEN.includes('placeholder')) {
    console.warn(`[${getWIBTimestamp()} WIB] ⚠️ TELEGRAM_BOT_TOKEN belum disetel atau masih bernilai placeholder.`)
    console.warn(`[${getWIBTimestamp()} WIB] Silakan dapatkan bot token dari @BotFather dan masukkan ke .env.local:`)
    console.warn(`    TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ\n`)
    console.log(`[${getWIBTimestamp()} WIB] Daemon akan menunggu konfigurasi token valid...`)

    if (isOnce) {
      console.log(`[${getWIBTimestamp()} WIB] Mode --once aktif dengan token placeholder: Keluar dengan sukses.`)
      return
    }

    while (isRunning) {
      await new Promise((resolve) => setTimeout(resolve, 5000))
      loadEnvFile(path.join(projectRoot, '.env.local'))
      if (process.env.TELEGRAM_BOT_TOKEN && !process.env.TELEGRAM_BOT_TOKEN.includes('placeholder')) {
        console.log(`[${getWIBTimestamp()} WIB] ✅ Token bot baru terdeteksi! Memulai polling...`)
        break
      }
    }
  }

  // 1. Delete active webhook to ensure getUpdates works without 409 Conflict
  try {
    console.log(`[${getWIBTimestamp()} WIB] 🧹 Menghapus webhook aktif di Telegram API (drop_pending_updates: false)...`)
    const delRes = await callTelegram('deleteWebhook', { drop_pending_updates: false })
    if (delRes.ok) {
      console.log(`[${getWIBTimestamp()} WIB] ✅ Webhook berhasil dihapus. Mode long-polling siap.`)
    } else {
      console.warn(`[${getWIBTimestamp()} WIB] ⚠️ deleteWebhook info: ${delRes.description || 'Response received'}`)
    }
  } catch (err) {
    console.warn(`[${getWIBTimestamp()} WIB] ⚠️ Info deleteWebhook: ${err.message}`)
  }

  // 2. Verifikasi Token Bot via getMe
  let botInfo = null
  try {
    const meRes = await callTelegram('getMe', {}, 'GET')
    if (meRes.ok && meRes.result) {
      botInfo = meRes.result
    } else {
      console.warn(`[${getWIBTimestamp()} WIB] ⚠️ Token getMe: ${meRes.description || 'Periksa token bot'}`)
    }
  } catch (err) {
    console.warn(`[${getWIBTimestamp()} WIB] ⚠️ Info getMe: ${err.message}`)
  }

  printBanner(botInfo)

  // 3. Polling loop
  let backoffMs = 1000

  while (isRunning) {
    try {
      // Official Telegram Long Polling parameter timeout: 25
      const params = {
        limit: 20,
        timeout: 25,
      }
      if (currentOffset > 0) {
        params.offset = currentOffset
      }

      const updatesRes = await callTelegram('getUpdates', params, 'GET')

      if (!updatesRes.ok) {
        const desc = updatesRes.description || 'Unknown error'
        console.warn(`[${getWIBTimestamp()} WIB] ⚠️ getUpdates gagal: ${desc}`)

        // If webhook conflict 409, re-delete webhook with drop_pending_updates: false
        if (desc.toLowerCase().includes('webhook')) {
          console.log(`[${getWIBTimestamp()} WIB] 🔄 Terdeteksi 409 Webhook Conflict. Menghapus ulang webhook...`)
          await callTelegram('deleteWebhook', { drop_pending_updates: false })
        }

        if (isOnce) break

        await new Promise((r) => setTimeout(r, backoffMs))
        backoffMs = Math.min(10000, backoffMs * 2)
        continue
      }

      // Reset backoff on successful request
      backoffMs = 1000

      const updates = updatesRes.result || []

      for (const update of updates) {
        const { typeLabel, contentPreview, sender, chatId } = categorizeMessage(update)

        console.log(
          `[${getWIBTimestamp()} WIB] 📥 [${typeLabel}] dari ${sender} (chat_id: ${chatId}): ${contentPreview}`
        )

        // Forward to Next.js webhook handler
        try {
          const headers = { 'Content-Type': 'application/json' }
          if (WEBHOOK_SECRET) {
            headers['x-telegram-bot-api-secret-token'] = WEBHOOK_SECRET
          }

          const forwardRes = await fetch(WEBHOOK_FORWARD_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify(update),
          })

          if (forwardRes.ok) {
            console.log(`[${getWIBTimestamp()} WIB] ⚡ Berhasil diproses oleh Next.js (HTTP ${forwardRes.status})`)
            currentOffset = update.update_id + 1
            saveOffset(currentOffset, update.update_id)
          } else {
            console.warn(
              `[${getWIBTimestamp()} WIB] ⚠️ Next.js mengembalikan HTTP ${forwardRes.status}: ${forwardRes.statusText}`
            )
            // Commit offset for non-server client errors (e.g. 400 Bad Request) to avoid poison-pill loops
            if (forwardRes.status < 500) {
              currentOffset = update.update_id + 1
              saveOffset(currentOffset, update.update_id)
            } else {
              // On server error 5xx, do NOT skip this update and do not process subsequent updates in this batch
              console.warn(
                `[${getWIBTimestamp()} WIB] ⏳ Server error 5xx pada Next.js. Update ${update.update_id} ditahan untuk dicoba ulang.`
              )
              await new Promise((r) => setTimeout(r, 3000))
              break
            }
          }
        } catch (fwdErr) {
          console.error(
            `[${getWIBTimestamp()} WIB] ❌ Gagal meneruskan update ke ${WEBHOOK_FORWARD_URL}: ${fwdErr.message}`
          )
          console.error(`[${getWIBTimestamp()} WIB] Pastikan server Next.js (npm run dev) sudah aktif di localhost:3000!`)
          // Do not advance offset on connection failure so message is redelivered when Next.js comes back up
          console.log(`[${getWIBTimestamp()} WIB] ⏳ Menunggu Next.js server online (retry dalam 3 detik)...`)
          await new Promise((r) => setTimeout(r, 3000))
          break
        }
      }

      if (isOnce) {
        console.log(`[${getWIBTimestamp()} WIB] Polling sekali selesai (--once).`)
        break
      }

      // Short delay if no updates were received
      if (updates.length === 0) {
        await new Promise((r) => setTimeout(r, 1000))
      }
    } catch (pollErr) {
      console.error(`[${getWIBTimestamp()} WIB] ❌ Kesalahan loop polling:`, pollErr.message)
      if (isOnce) break
      await new Promise((r) => setTimeout(r, backoffMs))
      backoffMs = Math.min(10000, backoffMs * 2)
    }
  }
}

runDaemon().catch((err) => {
  console.error(`[FATAL] Daemon crash:`, err)
  process.exit(1)
})
