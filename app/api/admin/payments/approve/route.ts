import { NextResponse } from 'next/server'
import { AdminStore } from '@/app/api/admin/admin-store'
import { verifyAdminAuthorization, forbiddenAdminResponse } from '@/lib/auth/admin-guard'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))

    // Genuine admin authorization verification (reject body-based authorization)
    const auth = await verifyAdminAuthorization(req)
    if (!auth.authorized) {
      return forbiddenAdminResponse(auth.error)
    }

    const { payment_id, paymentId } = body
    const id = payment_id || paymentId

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'payment_id diperlukan.' },
        { status: 400 }
      )
    }

    const effectiveAdminId = auth.adminId || '00000000-0000-0000-0000-000000000001'
    const result = await AdminStore.approvePayment(id, effectiveAdminId)
    if (!result) {
      return NextResponse.json(
        { success: false, message: 'Transaksi pembayaran tidak ditemukan.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Pembayaran berhasil disetujui! Akun pengguna telah ditingkatkan ke paket Pro.',
      data: result,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
