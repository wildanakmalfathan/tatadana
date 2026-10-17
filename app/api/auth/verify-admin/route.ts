import { NextResponse } from 'next/server'
import { verifyAdminAuthorization, forbiddenAdminResponse } from '@/lib/auth/admin-guard'
import { PersistentStore, OFFICIAL_ADMIN_EMAIL } from '@/lib/db/store'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = await verifyAdminAuthorization(req)
    if (!auth.authorized || !auth.adminId) {
      return forbiddenAdminResponse(auth.error || 'Akses ditolak: Sesi administrator tidak valid.')
    }

    const adminUser = PersistentStore.findUserById(auth.adminId)
    if (!adminUser || adminUser.email !== OFFICIAL_ADMIN_EMAIL || adminUser.role !== 'admin') {
      return forbiddenAdminResponse('Akses ditolak: Hanya administrator resmi yang diizinkan.')
    }

    return NextResponse.json(
      {
        success: true,
        authorized: true,
        admin: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          phone: adminUser.phone,
          role: 'admin',
          plan: 'pro_lifetime',
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { success: false, authorized: false, message: error.message || 'Kesalahan otorisasi admin.' },
      { status: 500 }
    )
  }
}
