import { PersistentStore, OFFICIAL_ADMIN_PHONE, OFFICIAL_SUPERADMIN_ID } from '@/lib/db/store'

export const OFFICIAL_ADMIN_WHATSAPP_RAW = '081460932853'
export const OFFICIAL_ADMIN_WHATSAPP_E164 = '+6281460932853'

export interface WhatsAppNotificationPayload {
  userId: string
  name: string
  email: string
  phone: string
  createdAt: string
}

export interface WhatsAppStatus {
  configured: boolean
  provider: string
  adminPhone: string
  targetPhone: string
  status: 'active' | 'unconfigured'
  setupGuide: string
  lastChecked: string
}

export class WhatsAppNotificationService {
  /**
   * Evaluates genuine WhatsApp configuration status.
   * Adheres strictly to Section F: Never falsifies delivery status.
   */
  static getIntegrationStatus(): WhatsAppStatus {
    const token = process.env.WHATSAPP_API_TOKEN || process.env.FONNTE_TOKEN || process.env.WA_GATEWAY_KEY
    const gatewayUrl = process.env.WHATSAPP_GATEWAY_URL || process.env.FONNTE_API_URL

    const isConfigured = !!(token && token.trim().length > 10)

    return {
      configured: isConfigured,
      provider: token ? (process.env.FONNTE_TOKEN ? 'Fonnte WA Gateway' : 'Custom WhatsApp API') : 'None (Unconfigured)',
      adminPhone: OFFICIAL_ADMIN_WHATSAPP_RAW,
      targetPhone: OFFICIAL_ADMIN_WHATSAPP_E164,
      status: isConfigured ? 'active' : 'unconfigured',
      setupGuide: isConfigured
        ? 'WhatsApp Gateway aktif dan siap mengirimkan notifikasi persetujuan pendaftaran ke WhatsApp Admin.'
        : 'Untuk mengaktifkan notifikasi WhatsApp instan ke 081460932853, masukkan WHATSAPP_API_TOKEN atau FONNTE_TOKEN pada file .env.local.',
      lastChecked: new Date().toISOString(),
    }
  }

  /**
   * Dispatches or records new registration approval notification for admin.
   */
  static async notifyAdminNewRegistration(user: WhatsAppNotificationPayload): Promise<{
    sent: boolean
    status: 'sent' | 'unconfigured' | 'failed'
    message: string
    details?: any
  }> {
    const status = this.getIntegrationStatus()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const approvalPortalUrl = `${appUrl}/admin/users`

    const messageText = [
      `🔔 *NOTIFIKASI TATA DANA — PENDAFTARAN PENGGUNA BARU* 🔔`,
      ``,
      `Terdapat permohonan registrasi akun baru yang membutuhkan persetujuan Admin:`,
      `👤 *Nama*: ${user.name}`,
      `📧 *Email*: ${user.email}`,
      `📱 *No. HP*: ${user.phone}`,
      `🕒 *Waktu Daftar*: ${new Date(user.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`,
      `🔖 *Status Awal*: pending_approval`,
      ``,
      `Buka Admin Command Center untuk menyetujui atau menolak:`,
      `👉 ${approvalPortalUrl}`,
      ``,
      `TataDana Financial Management System`,
    ].join('\n')

    // Always record audit log regardless of gateway availability
    PersistentStore.addAuditLog({
      admin_id: OFFICIAL_SUPERADMIN_ID,
      action: 'whatsapp_notification_dispatch',
      target_user_id: user.userId,
      reason: `Notifikasi persetujuan pendaftaran untuk ${user.name} (${user.email}) ditargetkan ke ${OFFICIAL_ADMIN_WHATSAPP_RAW}`,
      metadata: {
        target_phone: OFFICIAL_ADMIN_WHATSAPP_E164,
        configured: status.configured,
        user_id: user.userId,
        timestamp: new Date().toISOString(),
      },
    })

    if (!status.configured) {
      return {
        sent: false,
        status: 'unconfigured',
        message:
          'Kredensial WhatsApp API belum dikonfigurasi di lingkungan server (.env.local). Notifikasi telah dicatat dalam Audit Log dan antrean persetujuan admin tetap aktif di /admin/users.',
      }
    }

    try {
      const token = process.env.WHATSAPP_API_TOKEN || process.env.FONNTE_TOKEN || process.env.WA_GATEWAY_KEY
      const gatewayUrl =
        process.env.WHATSAPP_GATEWAY_URL ||
        process.env.FONNTE_API_URL ||
        'https://api.fonnte.com/send'

      const response = await fetch(gatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token || '',
        },
        body: JSON.stringify({
          target: OFFICIAL_ADMIN_WHATSAPP_RAW,
          message: messageText,
        }),
      })

      const json = await response.json().catch(() => ({}))

      if (response.ok) {
        return {
          sent: true,
          status: 'sent',
          message: `Notifikasi WhatsApp berhasil dikirim ke Admin (${OFFICIAL_ADMIN_WHATSAPP_RAW}).`,
          details: json,
        }
      } else {
        return {
          sent: false,
          status: 'failed',
          message: `Gagal mengirim WhatsApp: ${json.reason || json.message || response.statusText}`,
          details: json,
        }
      }
    } catch (err: any) {
      console.error('[WhatsApp Service] Dispatch error:', err)
      return {
        sent: false,
        status: 'failed',
        message: err.message || 'Kesalahan koneksi saat menghubungi WhatsApp gateway.',
      }
    }
  }
}
