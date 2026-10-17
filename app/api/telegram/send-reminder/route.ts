import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TelegramBotApi } from '@/lib/telegram/bot-api'
import { formatWIBTimeString } from '@/lib/utils/date'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const admin = createAdminClient()
    const bot = new TelegramBotApi()

    // Ambil jam sekarang di WIB (e.g. "20:00")
    const nowWIB = new Date()
    const currentHourStr = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(nowWIB)

    // Cari user yang mengaktifkan reminder dan memiliki telegram_chat_id
    const { data: users, error } = await admin
      .from('profiles')
      .select('id, full_name, telegram_chat_id, reminder_enabled, reminder_times')
      .eq('reminder_enabled', true)
      .not('telegram_chat_id', 'is', null)

    if (error) {
      console.error('Error fetching users for reminder:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const reminderMessage =
      `⏰ *Reminder Keuangan!*\n\n` +
      `Jangan lupa catat pengeluaran hari ini ya 📝\n` +
      `Pencatatan rutin = keuangan lebih terkontrol 💪\n\n` +
      `Ketik transaksimu sekarang! Contoh: _"makan siang 25rb"_`

    let sentCount = 0

    for (const u of users || []) {
      if (!u.telegram_chat_id) continue

      // Cek apakah jam saat ini cocok dengan salah satu jam reminder user
      const userTimes = u.reminder_times || ['20:00']
      const isTimeMatch = userTimes.some((t: string) => {
        // Toleransi dalam 1 jam yang sama
        return t.substring(0, 2) === currentHourStr.substring(0, 2)
      })

      if (isTimeMatch) {
        await bot.sendMessage(u.telegram_chat_id, reminderMessage, { parse_mode: 'Markdown' })
        sentCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Reminder terkirim ke ${sentCount} pengguna.`,
      currentHour: currentHourStr,
    })
  } catch (error: any) {
    console.error('Reminder route error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
