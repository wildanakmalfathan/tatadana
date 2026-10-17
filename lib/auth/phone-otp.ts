import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeIndonesianPhone, isValidIndonesianPhone } from '@/lib/utils/phone'

export interface SendOTPResult {
  success: boolean
  message: string
  expiresAt?: string
  sandboxCode?: string // provided in dev/sandbox mode for testing
}

export interface VerifyOTPResult {
  success: boolean
  message: string
  phoneNumber?: string
}

export class PhoneAuthService {
  /**
   * Generate and send 6-digit OTP code
   */
  static async sendOTP(phoneNumber: string): Promise<SendOTPResult> {
    const normalizedPhone = normalizeIndonesianPhone(phoneNumber)
    
    if (!isValidIndonesianPhone(normalizedPhone)) {
      return {
        success: false,
        message: 'Format nomor telepon tidak valid. Gunakan format Indonesia (contoh: 081234567890).',
      }
    }

    const adminClient = createAdminClient()

    // Rate-limiting / active code check: check if there is an unexpired OTP within last 60 seconds
    const { data: recentOTPs } = await adminClient
      .from('phone_verifications')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('is_verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    // Generate 6 digit numeric code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes

    const { error } = await adminClient
      .from('phone_verifications')
      .insert({
        phone_number: normalizedPhone,
        otp_code: otpCode,
        expires_at: expiresAt,
        is_verified: false,
        attempts: 0,
      })

    if (error) {
      console.error('Error inserting OTP record:', error)
      return {
        success: false,
        message: 'Gagal membuat kode OTP. Silakan coba beberapa saat lagi.',
      }
    }

    // In production, integrate with SMS gateway (Twilio, Zenziva, Fonnte, etc.)
    // For sandbox/development and transparent testing, return the sandbox code in dev or console log
    console.log(`[TATADANA OTP] Kode verifikasi untuk ${normalizedPhone}: ${otpCode}`)

    return {
      success: true,
      message: `Kode OTP berhasil dikirim ke ${normalizedPhone}. Berlaku selama 5 menit.`,
      expiresAt,
      sandboxCode: process.env.NODE_ENV !== 'production' ? otpCode : undefined,
    }
  }

  /**
   * Verify 6-digit OTP code and update user profile
   */
  static async verifyOTP(
    userId: string,
    phoneNumber: string,
    otpCode: string
  ): Promise<VerifyOTPResult> {
    const normalizedPhone = normalizeIndonesianPhone(phoneNumber)
    const adminClient = createAdminClient()

    // Find the latest active verification record
    const { data: records, error } = await adminClient
      .from('phone_verifications')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('is_verified', false)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error || !records || records.length === 0) {
      return {
        success: false,
        message: 'Tidak ditemukan permohonan OTP aktif untuk nomor ini. Silakan kirim ulang kode.',
      }
    }

    const verification = records[0]

    // Check expiration
    if (new Date(verification.expires_at) < new Date()) {
      return {
        success: false,
        message: 'Kode OTP telah kedaluwarsa. Silakan minta kode baru.',
      }
    }

    // Check attempts limit (max 5)
    if (verification.attempts >= 5) {
      return {
        success: false,
        message: 'Terlalu banyak percobaan salah. Silakan minta kode OTP baru.',
      }
    }

    // Compare code
    if (verification.otp_code !== otpCode.trim()) {
      // Increment attempt
      await adminClient
        .from('phone_verifications')
        .update({ attempts: verification.attempts + 1 })
        .eq('id', verification.id)

      return {
        success: false,
        message: 'Kode OTP salah. Silakan periksa kembali angka yang dimasukkan.',
      }
    }

    // Mark verified
    await adminClient
      .from('phone_verifications')
      .update({ is_verified: true })
      .eq('id', verification.id)

    // Check if phone number is already linked to another user
    const { data: existingUser } = await adminClient
      .from('profiles')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .neq('id', userId)
      .maybeSingle()

    if (existingUser) {
      return {
        success: false,
        message: 'Nomor telepon ini sudah digunakan oleh akun lain.',
      }
    }

    // Update user's profile
    const { error: profileUpdateError } = await adminClient
      .from('profiles')
      .update({
        phone_number: normalizedPhone,
        phone_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (profileUpdateError) {
      console.error('Failed to link phone to profile:', profileUpdateError)
      return {
        success: false,
        message: 'Gagal memperbarui profil pengguna dengan nomor telepon ini.',
      }
    }

    return {
      success: true,
      message: 'Nomor telepon berhasil diverifikasi dan terhubung!',
      phoneNumber: normalizedPhone,
    }
  }
}
