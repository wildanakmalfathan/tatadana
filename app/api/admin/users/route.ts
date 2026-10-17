import { NextResponse } from 'next/server'
import { AdminStore } from '@/app/api/admin/admin-store'
import { verifyAdminAuthorization, forbiddenAdminResponse } from '@/lib/auth/admin-guard'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    // Genuine admin authorization verification
    const auth = await verifyAdminAuthorization(req)
    if (!auth.authorized) {
      return forbiddenAdminResponse(auth.error)
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')?.toLowerCase()
    const plan = searchParams.get('plan')
    const status = searchParams.get('status')

    let users = await AdminStore.getUsers()

    if (search) {
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.phone.includes(search) ||
          (u.telegram_username && u.telegram_username.toLowerCase().includes(search))
      )
    }

    if (plan && plan !== 'all') {
      users = users.filter((u) => u.plan === plan)
    }

    if (status && status !== 'all') {
      users = users.filter((u) => u.status === status)
    }

    return NextResponse.json({
      success: true,
      data: users,
      count: users.length,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))

    // Genuine admin authorization verification (reject body-based authorization)
    const auth = await verifyAdminAuthorization(req)
    if (!auth.authorized) {
      return forbiddenAdminResponse(auth.error)
    }

    const { user_id, userId, status, plan, role, reason } = body
    const id = user_id || userId

    if (!id) {
      return NextResponse.json({ success: false, message: 'user_id diperlukan.' }, { status: 400 })
    }

    const targetStatus = status || (body.action === 'approve' ? 'active' : body.action === 'reject' ? 'rejected' : undefined)
    const effectiveAdminId = auth.adminId || '00000000-0000-0000-0000-000000000001'

    // Prevent privilege escalation: only the official admin can possess the 'admin' role
    const safeRole = role === 'admin' ? undefined : role

    const updatePayload: any = {}
    if (targetStatus !== undefined) updatePayload.status = targetStatus
    if (plan !== undefined) updatePayload.plan = plan
    if (safeRole !== undefined) updatePayload.role = safeRole

    const updated = await AdminStore.updateUser(id, updatePayload, effectiveAdminId)
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Pengguna tidak ditemukan.' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Status dan atribut pengguna berhasil diperbarui!',
      data: updated,
      user: updated,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
