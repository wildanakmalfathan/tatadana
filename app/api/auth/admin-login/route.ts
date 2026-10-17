import { NextResponse } from 'next/server'
import { PersistentStore, OFFICIAL_ADMIN_EMAIL, OFFICIAL_SUPERADMIN_ID } from '@/lib/db/store'
import { verifyPassword } from '@/lib/auth/password'
import { normalizeEmail } from '@/lib/auth/normalization'
import { generateSessionToken } from '@/lib/auth/tokens'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const rawEmail = (body.email || '').trim()
    const password = body.password || ''

    // 1. Validate required fields
    if (!rawEmail || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email administrator dan kata sandi wajib diisi.',
        },
        { status: 400 }
      )
    }

    // 2. Strict email enforcement: only official admin permitted
    const normalizedEmail = normalizeEmail(rawEmail)
    if (normalizedEmail !== OFFICIAL_ADMIN_EMAIL) {
      return NextResponse.json(
        {
          success: false,
          message: `Akses ditolak: Portal ini khusus Administrator resmi TataDana (${OFFICIAL_ADMIN_EMAIL}).`,
        },
        { status: 403 }
      )
    }

    // 3. Lookup official admin user in persistent store
    const adminUser = PersistentStore.findUserByEmail(OFFICIAL_ADMIN_EMAIL)
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          message: 'Akses ditolak: Identitas administrator resmi tidak ditemukan atau belum terdaftar.',
        },
        { status: 403 }
      )
    }

    // 4. Verify cryptographic password hash
    const isPasswordValid = await verifyPassword(password, adminUser.password_hash)
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Kredensial administrator tidak valid.',
        },
        { status: 401 }
      )
    }

    // 5. Audit log admin login
    PersistentStore.addAuditLog({
      admin_id: adminUser.id,
      action: 'admin_login_success',
      target_user_id: adminUser.id,
      reason: 'Administrator resmi berhasil login ke portal admin',
      metadata: {
        admin_email: adminUser.email,
        ip: req.headers.get('x-forwarded-for') || 'localhost',
      },
    })

    // 6. Generate dedicated admin session token
    const token = generateSessionToken(
      {
        userId: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: 'admin',
        plan: 'pro_lifetime',
        status: 'active',
      },
      { expiresInSeconds: 86400 } // 24 hours
    )

    const response = NextResponse.json(
      {
        success: true,
        message: 'Login Administrator berhasil! Selamat datang di Portal Admin TataDana.',
        token,
        user: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          phone: adminUser.phone,
          role: 'admin',
          plan: 'pro_lifetime',
          status: 'active',
        },
      },
      { status: 200 }
    )

    // Set dedicated HTTP-only admin session cookie
    response.cookies.set('tatadana_admin_session', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60,
    })

    response.cookies.set('tatadana_session', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60,
    })

    return response
  } catch (error: any) {
    console.error('[Admin Login API] Error processing admin login:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Terjadi kesalahan saat memproses login admin.' },
      { status: 500 }
    )
  }
}
