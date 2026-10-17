import { NextResponse } from 'next/server'
import { PersistentStore, OFFICIAL_SUPERADMIN_ID, OFFICIAL_ADMIN_EMAIL } from '@/lib/db/store'
import { hashPassword } from '@/lib/auth/password'
import { normalizeEmail, normalizePhone, isValidEmail, isValidPhone } from '@/lib/auth/normalization'
import { WhatsAppNotificationService } from '@/lib/services/whatsapp'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const fullName = (body.full_name || body.name || '').trim()
    const rawEmail = (body.email || '').trim()
    const rawPhone = (body.phone || body.phone_number || '').trim()
    const password = body.password || ''
    const confirmPassword = body.confirmPassword || body.confirm_password || ''

    // 1. Validate required fields
    if (!fullName || !rawEmail || !rawPhone || !password || !confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message: 'Semua kolom wajib diisi: Nama lengkap, email, nomor telepon, kata sandi, dan konfirmasi kata sandi.',
        },
        { status: 400 }
      )
    }

    // 2. Validate email format
    if (!isValidEmail(rawEmail)) {
      return NextResponse.json(
        { success: false, message: 'Format alamat email tidak valid.' },
        { status: 400 }
      )
    }

    // 3. Validate phone format
    if (!isValidPhone(rawPhone)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Format nomor telepon tidak valid. Gunakan format nomor ponsel Indonesia yang valid (contoh: 08123456789).',
        },
        { status: 400 }
      )
    }

    // 4. Validate password length and confirmation
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Kata sandi minimal harus 6 karakter.' },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Konfirmasi kata sandi tidak cocok.' },
        { status: 400 }
      )
    }

    // 5. Normalization
    const normalizedEmail = normalizeEmail(rawEmail)
    const normalizedPhone = normalizePhone(rawPhone)

    // Explicit rejection for official administrator email
    if (normalizedEmail === OFFICIAL_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        {
          success: false,
          message: 'Alamat email ini adalah identitas khusus administrator.',
        },
        { status: 409 }
      )
    }

    // 6. Check identity uniqueness
    const existingEmail = PersistentStore.findUserByEmail(normalizedEmail)
    if (existingEmail) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.',
        },
        { status: 409 }
      )
    }

    const existingPhone = PersistentStore.findUserByPhone(normalizedPhone)
    if (existingPhone) {
      return NextResponse.json(
        {
          success: false,
          message: 'Nomor telepon sudah terdaftar. Silakan gunakan nomor lain atau masuk ke akun Anda.',
        },
        { status: 409 }
      )
    }

    // 7. Cryptographic password hashing (scrypt + random salt)
    const passwordHash = await hashPassword(password)

    // 8. Save new user with initial pending_approval status
    const newUser = PersistentStore.createUser({
      name: fullName,
      email: normalizedEmail,
      phone: normalizedPhone,
      password_hash: passwordHash,
      role: 'user',
      plan: 'starter',
      status: 'pending_approval',
    })

    // Record audit log for pending registration
    PersistentStore.addAuditLog({
      admin_id: OFFICIAL_SUPERADMIN_ID,
      action: 'user_register_pending',
      target_user_id: newUser.id,
      reason: `Pendaftaran pengguna baru: ${fullName} (${normalizedEmail}) menunggu persetujuan admin.`,
      metadata: {
        user_id: newUser.id,
        email: normalizedEmail,
        phone: normalizedPhone,
      },
    })

    // Dispatch WhatsApp notification to Admin (081460932853)
    const waNotification = await WhatsAppNotificationService.notifyAdminNewRegistration({
      userId: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      createdAt: newUser.created_at,
    })

    // Clean response without exposing password hash
    const userPayload = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role || 'user',
      plan: newUser.plan || 'starter',
      status: newUser.status || 'pending_approval',
      created_at: newUser.created_at,
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Pendaftaran berhasil! Akun Anda sedang menunggu persetujuan admin. Silakan tunggu konfirmasi aktivasi.',
        user: userPayload,
        data: userPayload,
        role: userPayload.role,
        id: userPayload.id,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[Register API] Error processing registration:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Terjadi kesalahan saat memproses pendaftaran.' },
      { status: 500 }
    )
  }
}
