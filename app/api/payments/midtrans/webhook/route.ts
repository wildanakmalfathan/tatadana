import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MidtransService } from '@/lib/payments/midtrans'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const payload = await req.json()
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = payload

    if (!order_id || !status_code || !gross_amount) {
      return NextResponse.json({ ok: false, message: 'Invalid payload' }, { status: 400 })
    }

    // Verifikasi signature jika MIDTRANS_SERVER_KEY diset nyata
    if (process.env.MIDTRANS_SERVER_KEY) {
      const isValid = MidtransService.verifySignature(
        order_id,
        status_code,
        gross_amount,
        signature_key
      )
      if (!isValid) {
        console.warn(`[Midtrans Webhook] Invalid signature key for order ${order_id}`)
        return NextResponse.json({ ok: false, message: 'Invalid signature' }, { status: 403 })
      }
    }

    const admin = createAdminClient()

    // Cari transaksi di database
    const { data: tx } = await admin
      .from('payment_transactions')
      .select('*')
      .eq('order_id', order_id)
      .maybeSingle()

    if (!tx) {
      console.warn(`[Midtrans Webhook] Order ${order_id} not found in database`)
      return NextResponse.json({ ok: true, message: 'Order not found, recorded' })
    }

    let finalStatus: 'settlement' | 'pending' | 'expire' | 'cancel' = 'pending'

    if (transaction_status === 'capture') {
      if (fraud_status === 'accept') {
        finalStatus = 'settlement'
      }
    } else if (transaction_status === 'settlement') {
      finalStatus = 'settlement'
    } else if (
      transaction_status === 'cancel' ||
      transaction_status === 'deny' ||
      transaction_status === 'expire'
    ) {
      finalStatus = transaction_status === 'expire' ? 'expire' : 'cancel'
    }

    // Update status transaksi pembayaran
    await admin
      .from('payment_transactions')
      .update({
        status: finalStatus,
        midtrans_response: payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tx.id)

    // Jika settlement / sukses bayar, otomatis aktifkan paket Pro pengguna!
    if (finalStatus === 'settlement') {
      await admin
        .from('profiles')
        .update({
          plan: 'pro',
          updated_at: new Date().toISOString(),
        })
        .eq('id', tx.user_id)

      console.log(`[Midtrans Webhook] Akun user ${tx.user_id} berhasil di-upgrade ke PRO!`)
    }

    return NextResponse.json({ ok: true, status: finalStatus })
  } catch (error: any) {
    console.error('Midtrans Webhook handler error:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
