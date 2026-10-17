import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ExportManagerService } from '@/lib/services/export-manager'

export const dynamic = 'force-dynamic'

export async function GET() {
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

    const history = await ExportManagerService.getExportHistory(user.id)

    return NextResponse.json({ success: true, data: history })
  } catch (error: any) {
    console.error('API Export History Error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memuat riwayat export.' },
      { status: 500 }
    )
  }
}
