import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Transaction, Profile } from '@/types/database'
import { ReportSummary } from '@/lib/services/reports'
import { formatWIBFullDateTime, formatWIBDateString } from '@/lib/utils/date'
import { formatRupiah } from '@/lib/utils/currency'

export class PDFReportGenerator {
  /**
   * Menghasilkan dokumen PDF laporan keuangan resmi TataDana
   */
  static async generatePDFBuffer(
    profile: Profile,
    summary: ReportSummary,
    transactions: Transaction[]
  ): Promise<Buffer> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const orangePrimary = [249, 115, 22] // #F97316
    const darkSlate = [30, 41, 59] // #1E293B
    const grayText = [100, 116, 139] // #64748B
    const greenIncome = [16, 185, 129] // #10B981
    const redExpense = [239, 68, 68] // #EF4444

    const pageWidth = doc.internal.pageSize.getWidth()
    let yPos = 14

    // Top Brand Accent Bar
    doc.setFillColor(orangePrimary[0], orangePrimary[1], orangePrimary[2])
    doc.rect(0, 0, pageWidth, 5, 'F')

    // Brand Logo & Title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(orangePrimary[0], orangePrimary[1], orangePrimary[2])
    doc.text('TataDana', 14, yPos + 6)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(grayText[0], grayText[1], grayText[2])
    doc.text('Catat keuangan semudah chat — Langsung dari Telegram kamu', 14, yPos + 12)

    // Document Meta (Right Aligned)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2])
    doc.text('LAPORAN KEUANGAN', pageWidth - 14, yPos + 6, { align: 'right' })

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(grayText[0], grayText[1], grayText[2])
    doc.text(
      `Periode: ${summary.period.startDate || 'Semua'} s/d ${summary.period.endDate || 'Sekarang'}`,
      pageWidth - 14,
      yPos + 11,
      { align: 'right' }
    )
    doc.text(`Dicetak: ${formatWIBFullDateTime(new Date())}`, pageWidth - 14, yPos + 15, {
      align: 'right',
    })

    // Divider
    yPos += 20
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.5)
    doc.line(14, yPos, pageWidth - 14, yPos)

    // User Info Banner
    yPos += 7
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2])
    doc.text(`Pengguna : ${profile.full_name} (${profile.phone_number || 'Belum terhubung'})`, 14, yPos)
    doc.text(`Paket : ${profile.plan.toUpperCase()}`, pageWidth - 14, yPos, { align: 'right' })

    // Summary KPI Cards Box
    yPos += 6
    const boxWidth = (pageWidth - 28 - 8) / 3
    const boxHeight = 18

    // Card 1: Pemasukan
    doc.setFillColor(240, 253, 244)
    doc.roundedRect(14, yPos, boxWidth, boxHeight, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setTextColor(5, 150, 105)
    doc.text('Total Pemasukan', 18, yPos + 6)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(formatRupiah(summary.totalIncome), 18, yPos + 13)

    // Card 2: Pengeluaran
    doc.setFillColor(254, 242, 242)
    doc.roundedRect(14 + boxWidth + 4, yPos, boxWidth, boxHeight, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(220, 38, 38)
    doc.text('Total Pengeluaran', 18 + boxWidth + 4, yPos + 6)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(formatRupiah(summary.totalExpense), 18 + boxWidth + 4, yPos + 13)

    // Card 3: Net Cashflow
    const isNetPositive = summary.netCashflow >= 0
    doc.setFillColor(isNetPositive ? 239 : 254, isNetPositive ? 246 : 242, isNetPositive ? 255 : 242)
    doc.roundedRect(14 + (boxWidth + 4) * 2, yPos, boxWidth, boxHeight, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(isNetPositive ? 37 : 220, isNetPositive ? 99 : 38, isNetPositive ? 235 : 38)
    doc.text('Arus Kas Bersih (Net)', 18 + (boxWidth + 4) * 2, yPos + 6)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(formatRupiah(summary.netCashflow), 18 + (boxWidth + 4) * 2, yPos + 13)

    yPos += boxHeight + 8

    // Top Expense Categories (Table or Mini List)
    if (summary.topExpenseCategories.length > 0) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2])
      doc.text('Kategori Pengeluaran Terbesar', 14, yPos)
      yPos += 3

      const topCatRows = summary.topExpenseCategories.map((c, i) => [
        `${i + 1}`,
        `${c.name}`,
        formatRupiah(c.amount),
        `${c.percentage}%`,
        `${c.count}x`,
      ])

      autoTable(doc, {
        startY: yPos,
        head: [['No', 'Kategori', 'Total Nominal', 'Porsi', 'Frekuensi']],
        body: topCatRows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: {
          fillColor: [249, 115, 22],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 70 },
          2: { cellWidth: 40, halign: 'right' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 25, halign: 'center' },
        },
        margin: { left: 14, right: 14 },
      })

      yPos = (doc as any).lastAutoTable.finalY + 8
    }

    // Transactions Table
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2])
    doc.text(`Rincian Transaksi (${transactions.length} Data)`, 14, yPos)
    yPos += 3

    const txTableRows = transactions.map((t, idx) => {
      const typeLabel = t.type === 'income' ? 'Pemasukan' : t.type === 'expense' ? 'Pengeluaran' : 'Transfer'
      const timeStr = t.time ? t.time.substring(0, 5) : ''
      const nominalStr = (t.type === 'income' ? '+ ' : '- ') + formatRupiah(Number(t.amount))

      let detailCatatan = t.notes || '-'
      if (t.is_multi_item && t.items && t.items.length > 0) {
        detailCatatan += `\n[${t.items.length} item struk: ${t.items.map((i) => i.item_name).join(', ')}]`
      }

      return [
        `${idx + 1}`,
        `${t.date}\n${timeStr}`,
        typeLabel,
        t.wallet?.name || 'Dompet Utama',
        t.category?.name || '-',
        nominalStr,
        detailCatatan,
      ]
    })

    autoTable(doc, {
      startY: yPos,
      head: [['No', 'Tanggal', 'Jenis', 'Dompet', 'Kategori', 'Nominal', 'Catatan / Struk']],
      body: txTableRows,
      theme: 'striped',
      styles: { fontSize: 7.5, cellPadding: 2.5, overflow: 'linebreak' },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 26 },
        4: { cellWidth: 28 },
        5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        // Footer on each page
        const pageCount = (doc as any).internal.getNumberOfPages()
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(grayText[0], grayText[1], grayText[2])
        doc.text(
          `TataDana Fintech Indonesia — Dokumen rahasia untuk penggunaan pribadi. Halaman ${data.pageNumber} dari ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 7,
          { align: 'center' }
        )
      },
    })

    const pdfArrayBuffer = doc.output('arraybuffer')
    return Buffer.from(pdfArrayBuffer)
  }
}
