import { NextResponse } from 'next/server'
import { AdminStore } from '@/app/api/admin/admin-store'
import { verifyAdminAuthorization, forbiddenAdminResponse } from '@/lib/auth/admin-guard'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = await verifyAdminAuthorization(req)
    if (!auth.authorized) {
      return forbiddenAdminResponse(auth.error)
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    let payments = await AdminStore.getPayments()
    if (status && status !== 'all') {
      payments = payments.filter((p) => p.status === status)
    }

    return NextResponse.json({
      success: true,
      data: payments,
      count: payments.length,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
