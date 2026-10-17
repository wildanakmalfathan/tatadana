import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TataDana — Catat Keuangan Semudah Chat Langsung dari Telegram',
  description:
    'Aplikasi SaaS manajemen keuangan pribadi modern terintegrasi dengan Telegram Bot. Catat pengeluaran dan pemasukan dengan bahasa natural, foto struk, atau voice note.',
  keywords: ['keuangan', 'fintech', 'telegram bot', 'catat pengeluaran', 'budgeting', 'tatadana', 'indonesia'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className="dark scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#06090e] text-slate-100 min-h-screen selection:bg-emerald-500/30 selection:text-emerald-300 antialiased font-sans">
        {children}
      </body>
    </html>
  )
}
