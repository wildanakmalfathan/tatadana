import ExcelJS from 'exceljs'
import { Transaction, Profile } from '@/types/database'
import { ReportSummary } from '@/lib/services/reports'
import { formatWIBFullDateTime, formatWIBDateString } from '@/lib/utils/date'
import { formatRupiah } from '@/lib/utils/currency'

export class ExcelReportGenerator {
  /**
   * Menghasilkan file Excel (.xlsx) resmi dan terformat rapi untuk TataDana
   */
  static async generateWorkbookBuffer(
    profile: Profile,
    summary: ReportSummary,
    transactions: Transaction[]
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'TataDana'
    workbook.lastModifiedBy = 'TataDana System'
    workbook.created = new Date()
    workbook.modified = new Date()

    const orangeColor = 'F97316'
    const darkGray = '1E293B'
    const lightGray = 'F8FAFC'
    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'E2E8F0' } },
      left: { style: 'thin', color: { argb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
      right: { style: 'thin', color: { argb: 'E2E8F0' } },
    }

    // ==========================================
    // SHEET 1: RINGKASAN LAPORAN
    // ==========================================
    const summarySheet = workbook.addWorksheet('Ringkasan Laporan', {
      views: [{ showGridLines: true }],
    })

    // Title
    summarySheet.mergeCells('B2:F2')
    const titleCell = summarySheet.getCell('B2')
    titleCell.value = 'TATADANA — LAPORAN KEUANGAN PRIBADI'
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: orangeColor } }
    titleCell.alignment = { vertical: 'middle' }

    // Subtitle
    summarySheet.mergeCells('B3:F3')
    const subCell = summarySheet.getCell('B3')
    subCell.value = `Periode: ${summary.period.startDate || 'Awal'} s/d ${summary.period.endDate || 'Sekarang'} | Dibuat: ${formatWIBFullDateTime(new Date())}`
    subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '64748B' } }

    // User Info
    summarySheet.getCell('B5').value = 'Nama Pengguna'
    summarySheet.getCell('C5').value = profile.full_name
    summarySheet.getCell('B6').value = 'Nomor Telepon'
    summarySheet.getCell('C6').value = profile.phone_number || '-'
    summarySheet.getCell('B7').value = 'Paket Akun'
    summarySheet.getCell('C7').value = profile.plan === 'pro' ? 'Pro Member' : 'Starter'

    ;['B5', 'B6', 'B7'].forEach((cell) => {
      summarySheet.getCell(cell).font = { bold: true, color: { argb: darkGray } }
    })

    // Financial KPI Cards
    summarySheet.mergeCells('B9:C9')
    summarySheet.getCell('B9').value = 'RINGKASAN ARUS KAS'
    summarySheet.getCell('B9').font = { bold: true, size: 12, color: { argb: orangeColor } }

    const kpiData = [
      ['Total Pemasukan', summary.totalIncome, '10B981'],
      ['Total Pengeluaran', summary.totalExpense, 'EF4444'],
      ['Arus Kas Bersih (Net)', summary.netCashflow, summary.netCashflow >= 0 ? '10B981' : 'EF4444'],
      ['Total Transaksi', `${summary.transactionCount} Transaksi`, '3B82F6'],
    ]

    let rowIdx = 10
    kpiData.forEach(([label, val, color]) => {
      summarySheet.getCell(`B${rowIdx}`).value = label
      summarySheet.getCell(`B${rowIdx}`).font = { bold: true }
      summarySheet.getCell(`B${rowIdx}`).border = borderStyle

      const valCell = summarySheet.getCell(`C${rowIdx}`)
      if (typeof val === 'number') {
        valCell.value = val
        valCell.numFmt = '"Rp"#,##0'
      } else {
        valCell.value = val
      }
      valCell.font = { bold: true, color: { argb: color as string } }
      valCell.border = borderStyle
      rowIdx++
    })

    // Top Expense Categories Table
    rowIdx += 2
    summarySheet.mergeCells(`B${rowIdx}:E${rowIdx}`)
    summarySheet.getCell(`B${rowIdx}`).value = 'TOP 5 KATEGORI PENGELUARAN'
    summarySheet.getCell(`B${rowIdx}`).font = { bold: true, size: 12, color: { argb: orangeColor } }
    rowIdx++

    const catHeaders = ['No', 'Kategori', 'Total Pengeluaran', 'Porsi (%)']
    ;['B', 'C', 'D', 'E'].forEach((col, i) => {
      const cell = summarySheet.getCell(`${col}${rowIdx}`)
      cell.value = catHeaders[i]
      cell.font = { bold: true, color: { argb: 'FFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: orangeColor } }
      cell.alignment = { horizontal: 'center' }
      cell.border = borderStyle
    })
    rowIdx++

    if (summary.topExpenseCategories.length === 0) {
      summarySheet.mergeCells(`B${rowIdx}:E${rowIdx}`)
      summarySheet.getCell(`B${rowIdx}`).value = 'Belum ada pengeluaran pada periode ini.'
      summarySheet.getCell(`B${rowIdx}`).font = { italic: true, color: { argb: '64748B' } }
      summarySheet.getCell(`B${rowIdx}`).alignment = { horizontal: 'center' }
      rowIdx++
    } else {
      summary.topExpenseCategories.forEach((cat, idx) => {
        summarySheet.getCell(`B${rowIdx}`).value = idx + 1
        summarySheet.getCell(`B${rowIdx}`).alignment = { horizontal: 'center' }
        summarySheet.getCell(`C${rowIdx}`).value = `${cat.emoji} ${cat.name}`
        
        const amountCell = summarySheet.getCell(`D${rowIdx}`)
        amountCell.value = cat.amount
        amountCell.numFmt = '"Rp"#,##0'

        const pctCell = summarySheet.getCell(`E${rowIdx}`)
        pctCell.value = `${cat.percentage}%`
        pctCell.alignment = { horizontal: 'center' }

        ;['B', 'C', 'D', 'E'].forEach((col) => {
          summarySheet.getCell(`${col}${rowIdx}`).border = borderStyle
        })
        rowIdx++
      })
    }

    summarySheet.columns = [
      { width: 4 },
      { width: 26 },
      { width: 28 },
      { width: 24 },
      { width: 16 },
      { width: 20 },
    ]

    // ==========================================
    // SHEET 2: DAFTAR TRANSAKSI
    // ==========================================
    const txSheet = workbook.addWorksheet('Daftar Transaksi', {
      views: [{ showGridLines: true }],
    })

    // Header Transaksi
    const txHeaderLabels = [
      'No',
      'Tanggal (WIB)',
      'Waktu',
      'Jenis',
      'Dompet',
      'Kategori',
      'Nominal (Rp)',
      'Catatan / Merchant',
      'Sumber',
    ]

    const headerRow = txSheet.getRow(2)
    headerRow.values = ['', ...txHeaderLabels]
    headerRow.height = 28

    headerRow.eachCell((cell, colNum) => {
      if (colNum > 1) {
        cell.font = { bold: true, color: { argb: 'FFFFFF' }, name: 'Arial', size: 10 }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: orangeColor } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        cell.border = borderStyle
      }
    })

    // Data Rows
    let txRowIdx = 3
    transactions.forEach((tx, idx) => {
      const typeLabel =
        tx.type === 'income' ? 'Pemasukan' : tx.type === 'expense' ? 'Pengeluaran' : 'Transfer'
      const sourceLabel =
        tx.source === 'telegram_photo'
          ? 'Struk Telegram'
          : tx.source === 'telegram_voice'
          ? 'Voice Note Telegram'
          : tx.source === 'telegram_text'
          ? 'Teks Telegram'
          : 'Web App'

      const row = txSheet.getRow(txRowIdx)
      row.values = [
        '',
        idx + 1,
        tx.date,
        tx.time ? tx.time.substring(0, 5) : '-',
        typeLabel,
        tx.wallet?.name || 'Dompet Utama',
        tx.category ? `${tx.category.emoji} ${tx.category.name}` : '-',
        Number(tx.amount),
        tx.notes || '-',
        sourceLabel,
      ]
      row.height = 22

      // Styling
      row.eachCell((cell, colNum) => {
        if (colNum > 1) {
          cell.border = borderStyle
          cell.font = { name: 'Arial', size: 9 }
          if (txRowIdx % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightGray } }
          }
        }
      })

      // Alignment and formats
      txSheet.getCell(`B${txRowIdx}`).alignment = { horizontal: 'center' }
      txSheet.getCell(`C${txRowIdx}`).alignment = { horizontal: 'center' }
      txSheet.getCell(`D${txRowIdx}`).alignment = { horizontal: 'center' }
      txSheet.getCell(`E${txRowIdx}`).alignment = { horizontal: 'center' }
      
      const nominalCell = txSheet.getCell(`H${txRowIdx}`)
      nominalCell.numFmt = '"Rp"#,##0'
      nominalCell.font = {
        name: 'Arial',
        size: 9,
        bold: true,
        color: { argb: tx.type === 'income' ? '10B981' : 'EF4444' },
      }

      txRowIdx++
    })

    txSheet.columns = [
      { width: 3 },
      { width: 6 },
      { width: 14 },
      { width: 10 },
      { width: 14 },
      { width: 22 },
      { width: 24 },
      { width: 18 },
      { width: 35 },
      { width: 20 },
    ]

    // ==========================================
    // SHEET 3: RINCIAN STRUK MULTI-ITEM
    // ==========================================
    const multiItemTx = transactions.filter((t) => t.is_multi_item && t.items && t.items.length > 0)
    if (multiItemTx.length > 0) {
      const receiptSheet = workbook.addWorksheet('Rincian Struk', {
        views: [{ showGridLines: true }],
      })

      const receiptHeader = receiptSheet.getRow(2)
      receiptHeader.values = [
        '',
        'No',
        'Tanggal',
        'Merchant / Struk',
        'Nama Item / Barang',
        'Jumlah (Qty)',
        'Harga Satuan',
        'Subtotal (Rp)',
      ]
      receiptHeader.height = 28
      receiptHeader.eachCell((cell, colNum) => {
        if (colNum > 1) {
          cell.font = { bold: true, color: { argb: 'FFFFFF' } }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C2410C' } }
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
          cell.border = borderStyle
        }
      })

      let itemRowIdx = 3
      let itemCounter = 1

      multiItemTx.forEach((tx) => {
        tx.items?.forEach((item) => {
          const row = receiptSheet.getRow(itemRowIdx)
          row.values = [
            '',
            itemCounter++,
            tx.date,
            tx.notes || 'Struk Belanja',
            item.item_name,
            Number(item.quantity) || 1,
            Number(item.price),
            (Number(item.quantity) || 1) * Number(item.price),
          ]
          row.height = 20

          row.eachCell((cell, colNum) => {
            if (colNum > 1) {
              cell.border = borderStyle
              cell.font = { name: 'Arial', size: 9 }
            }
          })

          receiptSheet.getCell(`B${itemRowIdx}`).alignment = { horizontal: 'center' }
          receiptSheet.getCell(`C${itemRowIdx}`).alignment = { horizontal: 'center' }
          receiptSheet.getCell(`F${itemRowIdx}`).alignment = { horizontal: 'center' }

          const unitPriceCell = receiptSheet.getCell(`G${itemRowIdx}`)
          unitPriceCell.numFmt = '"Rp"#,##0'
          
          const subtotalCell = receiptSheet.getCell(`H${itemRowIdx}`)
          subtotalCell.numFmt = '"Rp"#,##0'
          subtotalCell.font = { bold: true, color: { argb: darkGray } }

          itemRowIdx++
        })
      })

      receiptSheet.columns = [
        { width: 3 },
        { width: 6 },
        { width: 14 },
        { width: 24 },
        { width: 28 },
        { width: 14 },
        { width: 18 },
        { width: 18 },
      ]
    }

    const uint8Array = await workbook.xlsx.writeBuffer()
    return Buffer.from(uint8Array)
  }
}
