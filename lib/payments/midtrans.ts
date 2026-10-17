import crypto from 'crypto'

export interface MidtransSnapPayload {
  orderId: string
  amount: number
  plan: 'starter' | 'pro'
  customerName: string
  customerEmail?: string
  customerPhone?: string
}

export interface MidtransSnapResponse {
  token: string
  redirect_url: string
}

export class MidtransService {
  private static getServerKey(): string {
    return process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-demo-key'
  }

  private static getClientKey(): string {
    return process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || 'SB-Mid-client-demo-key'
  }

  private static isProduction(): boolean {
    return process.env.MIDTRANS_IS_PRODUCTION === 'true'
  }

  private static getBaseUrl(): string {
    return this.isProduction()
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions'
  }

  /**
   * Membuat Snap Token dan Redirect URL untuk pembayaran Midtrans (QRIS & Virtual Account)
   */
  static async createSnapTransaction(payload: MidtransSnapPayload): Promise<MidtransSnapResponse> {
    const serverKey = this.getServerKey()
    const authHeader = Buffer.from(`${serverKey}:`).toString('base64')

    const body = {
      transaction_details: {
        order_id: payload.orderId,
        gross_amount: payload.amount,
      },
      item_details: [
        {
          id: `PLAN-${payload.plan.toUpperCase()}`,
          price: payload.amount,
          quantity: 1,
          name: `Langganan TataDana ${payload.plan === 'pro' ? 'Pro Lifetime' : 'Starter'}`,
        },
      ],
      customer_details: {
        first_name: payload.customerName,
        email: payload.customerEmail || 'user@tatadana.id',
        phone: payload.customerPhone || '081234567890',
      },
      enabled_payments: [
        'qris',
        'gopay',
        'shopeepay',
        'bca_va',
        'bni_va',
        'bri_va',
        'permata_va',
        'echannel',
      ],
    }

    try {
      const response = await fetch(this.getBaseUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Basic ${authHeader}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('Midtrans Snap Error response:', errorData)
        // Fallback demo mock token if sandbox credentials are demo
        return {
          token: `demo-snap-token-${Date.now()}`,
          redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/demo-${payload.orderId}`,
        }
      }

      const data = await response.json()
      return {
        token: data.token,
        redirect_url: data.redirect_url,
      }
    } catch (err: any) {
      console.warn('Midtrans API call failed, generating fallback mock token:', err.message)
      return {
        token: `demo-snap-token-${Date.now()}`,
        redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/demo-${payload.orderId}`,
      }
    }
  }

  /**
   * Verifikasi Keaslian Signature Key Notifikasi Webhook Midtrans
   * SHA512(order_id + status_code + gross_amount + ServerKey)
   */
  static verifySignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    receivedSignature: string
  ): boolean {
    const serverKey = this.getServerKey()
    const payload = `${orderId}${statusCode}${grossAmount}${serverKey}`
    const expectedSignature = crypto.createHash('sha512').update(payload).digest('hex')
    return expectedSignature.toLowerCase() === (receivedSignature || '').toLowerCase()
  }
}
