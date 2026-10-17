import { NextResponse } from 'next/server'
import { PersistentStore } from '@/lib/db/store'
import { verifyPassword } from '@/lib/auth/password'
import { normalizeEmail, normalizePhone } from '@/lib/auth/normalization'
import { generateSessionToken } from '@/lib/auth/tokens'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const rawIdentifier = (body.email || body.emailOrPhone || body.phone || '').trim()
    const password = body.password || ''

    // 1. Validate required fields
    if (!rawIdentifier || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email atau nomor telepon dan kata sandi wajib diisi.',
        },
        { status: 400 }
      )
    }

    // 2. Lookup user by normalized email or normalized phone
    const normalizedEmail = normalizeEmail(rawIdentifier)
    let user = PersistentStore.findUserByEmail(normalizedEmail)

    if (!user) {
      const normalizedPhone = normalizePhone(rawIdentifier)
      user = PersistentStore.findUserByPhone(normalizedPhone)
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email atau kata sandi tidak valid.',
        },
        { status: 401 }
      )
    }

    // 3. Cryptographic password verification
    const isPasswordValid = await verifyPassword(password, user.password_hash)
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email atau kata sandi tidak valid.',
        },
        { status: 401 }
      )
    }

    // 4. Status validation & approval gate
    if (user.status === 'pending_approval') {
      return NextResponse.json(
        {
          success: false,
          status: 'pending_approval',
          message: 'Akun Anda sedang menunggu persetujuan admin. Silakan hubungi admin jika membutuhkan akses segera.',
        },
        { status: 403 }
      )
    }

    if (user.status === 'rejected') {
      return NextResponse.json(
        {
          success: false,
          status: 'rejected',
          message: 'Pendaftaran akun Anda telah ditolak oleh admin. Silakan hubungi admin jika memiliki pertanyaan.',
        },
        { status: 403 }
      )
    }

    if (user.status === 'suspended') {
      return NextResponse.json(
        {
          success: false,
          status: 'suspended',
          message: 'Akun Anda telah dinonaktifkan. Silakan hubungi admin untuk informasi lebih lanjut.',
        },
        { status: 403 }
      )
    }

    // 5. Update last_seen_at heartbeat
    const now = new Date().toISOString()
    PersistentStore.updateUser(user.id, { last_seen_at: now })

    // 6. Generate authenticated session token
    const token = generateSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      status: user.status,
    })

    const response = NextResponse.json(
      {
        success: true,
        message: 'Login berhasil! Selamat datang kembali di TataDana.',
        token,
        session: {
          access_token: token,
          token_type: 'bearer',
          expires_in: 7 * 24 * 60 * 60,
          user: {
            id: user.id,
            email: user.email,
          },
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          plan: user.plan,
          status: user.status,
          telegram_connected: !!user.telegram_connected,
          monthly_tx_count: user.monthly_tx_count || 0,
        },
      },
      { status: 200 }
    )

    // Set HTTP-only secure cookie
    response.cookies.set('tatadana_session', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return response
  } catch (error: any) {
    console.error('[Login API] Error processing login:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Terjadi kesalahan saat memproses login.' },
      { status: 500 }
    )
  }
}
