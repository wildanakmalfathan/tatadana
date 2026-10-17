import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MidtransService } from '@/lib/payments/midtrans'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Autentikasi diperlukan untuk pembayaran.' },
        { status: 401 }
      )
    }

    const { plan = 'pro', amount = 99000 } = await req.json()
    const orderId = `TD-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    const admin = createAdminClient()

    // 1. Dapatkan profil pengguna
    const { data: profile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // 2. Buat Snap transaction
    const snap = await MidtransService.createSnapTransaction({
      orderId,
      amount: Number(amount),
      plan,
      customerName: profile?.full_name || 'Pengguna TataDana',
      customerPhone: profile?.phone_number || undefined,
    })

    // 3. Rekam transaksi ke database
    await admin.from('payment_transactions').insert({
      user_id: user.id,
      order_id: orderId,
      plan,
      amount: Number(amount),
      status: 'pending',
      payment_method: 'midtrans',
      midtrans_response: snap as any,
    })

    return NextResponse.json({
      success: true,
      orderId,
      token: snap.token,
      redirectUrl: snap.redirect_url,
    })
  } catch (error: any) {
    console.error('Midtrans Charge API error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memproses pembuatan transaksi pembayaran.' },
      { status: 500 }
    )
  }
}
