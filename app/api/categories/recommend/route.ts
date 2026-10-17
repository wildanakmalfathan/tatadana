import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MultiAIProviderService } from '@/lib/ai/multi-provider'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { occupation, lifestyleNotes, monthlyIncomeEstimate } = body

    const prompt = `
Pengguna baru aplikasi TataDana:
Profesi/Aktivitas: ${occupation || 'Karyawan Swasta'}
Pola Hidup/Pengeluaran: ${lifestyleNotes || 'Nongkrong, belanja bulanan, transportasi harian'}
Estimasi Penghasilan: Rp${monthlyIncomeEstimate || '5.000.000'}

Buat 6-8 rekomendasi kategori keuangan yang sangat relevan dan terpersonalisasi untuk user ini.
Tiap kategori harus punya:
- name: nama kategori
- type: "expense" atau "income"
- emoji: 1 emoji yang pas
- color: kode heksadesimal warna (variasi oranye/hangat: #F97316, #FB923C, #EA580C, #10B981 untuk income)
- suggestedBudget: rekomendasi budget bulanan dalam Rupiah (integer)

Keluarkan HANYA JSON array:
[
  { "name": "🍜 Makanan & Ngopi", "type": "expense", "emoji": "🍜", "color": "#F97316", "suggestedBudget": 1500000 },
  { "name": "💰 Gaji Pokok", "type": "income", "emoji": "💰", "color": "#10B981", "suggestedBudget": 0 }
]
`

    const { providers } = await MultiAIProviderService.getAIConfig()
    const geminiKey = providers.gemini?.apiKey || process.env.GEMINI_API_KEY

    let categoriesResult: any[] = []

    if (geminiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { response_mime_type: 'application/json' },
          }),
        })
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          categoriesResult = JSON.parse(text)
        }
      } catch (e) {
        console.warn('AI recommendation error, using fallback template:', e)
      }
    }

    if (!categoriesResult || categoriesResult.length === 0) {
      // Fallback personalized defaults
      categoriesResult = [
        { name: 'Makanan & Kuliner', type: 'expense', emoji: '🍜', color: '#F97316', suggestedBudget: 1500000 },
        { name: 'Transportasi Harian', type: 'expense', emoji: '🚗', color: '#FB923C', suggestedBudget: 500000 },
        { name: 'Tagihan & Utilitas', type: 'expense', emoji: '🏠', color: '#EA580C', suggestedBudget: 750000 },
        { name: 'Belanja & Lifestyle', type: 'expense', emoji: '👕', color: '#FDBA74', suggestedBudget: 600000 },
        { name: 'Hiburan & Streaming', type: 'expense', emoji: '🎮', color: '#C2410C', suggestedBudget: 350000 },
        { name: 'Kesehatan & Obat', type: 'expense', emoji: '💊', color: '#EF4444', suggestedBudget: 250000 },
        { name: 'Gaji Pokok', type: 'income', emoji: '💰', color: '#10B981', suggestedBudget: 0 },
      ]
    }

    return NextResponse.json({
      success: true,
      categories: categoriesResult,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
