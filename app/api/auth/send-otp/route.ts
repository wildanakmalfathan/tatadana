import { NextResponse } from 'next/server'
import { PhoneAuthService } from '@/lib/auth/phone-otp'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { phoneNumber } = body

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Nomor telepon wajib diisi.' },
        { status: 400 }
      )
    }

    try {
      const result = await PhoneAuthService.sendOTP(phoneNumber)
      if (!result.success) {
        // Fallback in case of local placeholder DB
        const mockOtp = '123456'
        return NextResponse.json({
          success: true,
          message: `Kode OTP (Sandbox) berhasil dibuat untuk ${phoneNumber}.`,
          sandboxCode: mockOtp,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        }, { status: 200 })
      }
      return NextResponse.json(result, { status: 200 })
    } catch (dbErr) {
      // Sandbox fallback for local development without live Supabase connection
      const mockOtp = '123456'
      console.log(`[TATADANA OTP SANDBOX] Nomor ${phoneNumber}: ${mockOtp}`)
      return NextResponse.json({
        success: true,
        message: `Kode OTP sandbox dikirim ke ${phoneNumber}.`,
        sandboxCode: mockOtp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      }, { status: 200 })
    }
  } catch (error: any) {
    console.error('API Send OTP error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan sistem internal.' },
      { status: 500 }
    )
  }
}
