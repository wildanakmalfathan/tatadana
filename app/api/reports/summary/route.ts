import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ReportsService } from '@/lib/services/reports'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Autentikasi diperlukan.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const walletId = searchParams.get('walletId') || undefined
    const categoryId = searchParams.get('categoryId') || undefined
    const type = (searchParams.get('type') as any) || undefined
    const search = searchParams.get('search') || undefined

    const summary = await ReportsService.getSummary(user.id, {
      startDate,
      endDate,
      walletId,
      categoryId,
      type,
      search,
    })

    return NextResponse.json({ success: true, data: summary })
  } catch (error: any) {
    console.error('API Report Summary Error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Terjadi kesalahan sistem.' },
      { status: 500 }
    )
  }
}
