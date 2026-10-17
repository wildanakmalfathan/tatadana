import { createAdminClient } from '@/lib/supabase/admin'
import { ReportsService, ReportFilter } from '@/lib/services/reports'
import { PDFReportGenerator } from '@/lib/export/pdf'
import { ExcelReportGenerator } from '@/lib/export/excel'
import { ReportExportHistory, Profile } from '@/types/database'
import { getISODateWIB } from '@/lib/utils/date'

export interface ExportReportOptions {
  userId: string
  fileType: 'pdf' | 'excel'
  filter: ReportFilter
}

export class ExportManagerService {
  /**
   * Menghasilkan file laporan (PDF / Excel), mengunggah ke Supabase Storage,
   * dan mencatat ke tabel riwayat export.
   */
  static async generateAndSaveReport(options: ExportReportOptions): Promise<{
    history: ReportExportHistory
    downloadUrl: string
  }> {
    const { userId, fileType, filter } = options
    const adminClient = createAdminClient()

    // 1. Cek hak akses paket user (Plan enforcement)
    const { data: profileData, error: profileErr } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileErr || !profileData) {
      throw new Error('Data profil pengguna tidak ditemukan.')
    }

    const profile = profileData as Profile

    if (profile.plan !== 'pro') {
      throw new Error(
        'Fitur export laporan PDF dan Excel hanya tersedia untuk paket Pro. Silakan upgrade akun Anda.'
      )
    }

    // 2. Ambil data kalkulasi dan transaksi
    const summary = await ReportsService.getSummary(userId, filter)
    const transactions = await ReportsService.getAllTransactionsForExport(userId, filter)

    // 3. Generate file buffer
    let buffer: Buffer
    let contentType: string
    let extension: string

    const todayStr = getISODateWIB().replace(/-/g, '')
    const startStr = (filter.startDate || 'all').replace(/-/g, '')
    const endStr = (filter.endDate || 'all').replace(/-/g, '')
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)

    if (fileType === 'pdf') {
      buffer = await PDFReportGenerator.generatePDFBuffer(profile, summary, transactions)
      contentType = 'application/pdf'
      extension = 'pdf'
    } else {
      buffer = await ExcelReportGenerator.generateWorkbookBuffer(profile, summary, transactions)
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      extension = 'xlsx'
    }

    const fileName = `TataDana_Laporan_${startStr}_${endStr}_${todayStr}_${randomSuffix}.${extension}`
    const storagePath = `${userId}/${fileName}`
    const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'tatadana-exports'

    // 4. Upload ke Supabase Storage (Bucket privat per user)
    const { error: uploadError } = await adminClient.storage
      .from(bucketName)
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
      })

    let signedUrl = ''
    if (uploadError) {
      console.warn('Storage upload error, fallbacking to direct URL:', uploadError)
    } else {
      // 5. Generate signed URL (Berlaku 7 hari = 604800 detik)
      const { data: signedData, error: signedError } = await adminClient.storage
        .from(bucketName)
        .createSignedUrl(storagePath, 604800)

      if (!signedError && signedData) {
        signedUrl = signedData.signedUrl
      }
    }

    // 6. Catat riwayat export ke database
    const periodStart = filter.startDate || getISODateWIB()
    const periodEnd = filter.endDate || getISODateWIB()

    const { data: historyData, error: historyErr } = await adminClient
      .from('reports_export_history')
      .insert({
        user_id: userId,
        file_name: fileName,
        file_type: fileType,
        period_start: periodStart,
        period_end: periodEnd,
        file_path: storagePath,
        file_size_bytes: buffer.length,
        signed_url: signedUrl,
      })
      .select()
      .single()

    if (historyErr) {
      console.error('Error inserting export history:', historyErr)
    }

    return {
      history: historyData as ReportExportHistory,
      downloadUrl: signedUrl,
    }
  }

  /**
   * Mengambil riwayat export user
   */
  static async getExportHistory(userId: string): Promise<ReportExportHistory[]> {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('reports_export_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching export history:', error)
      return []
    }

    return (data as ReportExportHistory[]) || []
  }
}
