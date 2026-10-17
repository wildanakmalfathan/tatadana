import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatRupiah } from '@/lib/utils/currency'
import { PersistentStore } from '@/lib/db/store'

export interface WalletSummary {
  id: string
  name: string
  type: string
  balance: number
  isDefault?: boolean
}

export interface CategorySpending {
  name: string
  emoji?: string
  color?: string
  amount: number
  percentage: number
  count?: number
}

export interface BudgetStatus {
  categoryName: string
  limit: number
  spent: number
  percentage: number
  status: 'safe' | 'warning' | 'overbudget'
}

export interface Rule503020Metrics {
  monthlyIncome: number
  needsTarget: number // 50% Kebutuhan Pokok
  wantsTarget: number // 30% Keinginan & Lifestyle
  savingsTarget: number // 20% Tabungan, Investasi & Dana Darurat
  actualNeeds: number
  actualWants: number
  actualSavings: number
  needsPercentage: number
  wantsPercentage: number
  savingsPercentage: number
  evaluation: string
}

export interface UserFinancialContext {
  userId: string
  userName: string
  userPlan: 'starter' | 'pro'
  totalBalance: number
  walletCount: number
  wallets: WalletSummary[]
  monthlyIncome: number
  monthlyExpense: number
  netSavings: number
  burnRatePercentage: number
  isDeficit: boolean
  deficitWarning?: string
  topCategories: CategorySpending[]
  mostExpensiveCategory?: CategorySpending
  budgets: BudgetStatus[]
  rule503020: Rule503020Metrics
}

/**
 * Fallback Context representing realistic active user state
 */
export function getFallbackFinancialContext(userId: string = '00000000-0000-0000-0000-000000000001'): UserFinancialContext {
  return {
    userId,
    userName: 'Pengguna TataDana',
    userPlan: 'starter',
    totalBalance: 0,
    walletCount: 0,
    wallets: [],
    monthlyIncome: 0,
    monthlyExpense: 0,
    netSavings: 0,
    burnRatePercentage: 0,
    isDeficit: false,
    deficitWarning: undefined,
    topCategories: [],
    mostExpensiveCategory: undefined,
    budgets: [],
    rule503020: {
      monthlyIncome: 0,
      needsTarget: 0,
      wantsTarget: 0,
      savingsTarget: 0,
      actualNeeds: 0,
      actualWants: 0,
      actualSavings: 0,
      needsPercentage: 0,
      wantsPercentage: 0,
      savingsPercentage: 0,
      evaluation: 'Belum ada data transaksi keuangan tercatat.',
    },
  }
}

/**
 * Load user financial context from Supabase or fallback
 */
export async function getUserFinancialContext(userId?: string): Promise<UserFinancialContext> {
  const effectiveUserId = userId || '00000000-0000-0000-0000-000000000001'

  try {
    // 1. Check PersistentStore first for instant, reliable local persistent storage
    const persistentWallets = PersistentStore.getWallets(effectiveUserId)
  const persistentTxs = PersistentStore.getTransactions(effectiveUserId)
  const persistentUser = PersistentStore.findUserById(effectiveUserId)

  if (persistentWallets.length > 0 || persistentTxs.length > 0 || persistentUser) {
      const wallets: WalletSummary[] = persistentWallets.map((w) => ({
        id: w.id,
        name: w.name,
        type: w.type,
        balance: Number(w.balance) || 0,
        isDefault: !!w.is_default,
      }))
      const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0)

      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const startOfMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`
      const endOfMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())}`

      const currentMonthTxs = persistentTxs.filter((t) => t.date >= startOfMonth && t.date <= endOfMonth)
      const categories = PersistentStore.getCategories(effectiveUserId)
      const catLookup = new Map(categories.map((c) => [c.id, c]))

      let monthlyIncome = 0
      let monthlyExpense = 0
      const catMap: Record<string, { name: string; emoji: string; color: string; amount: number; count: number }> = {}

      for (const tx of currentMonthTxs) {
        const amt = Number(tx.amount) || 0
        if (tx.type === 'income') {
          monthlyIncome += amt
        } else if (tx.type === 'expense') {
          monthlyExpense += amt
          const cat = tx.category_id ? catLookup.get(tx.category_id) : null
          const catName = cat?.name || 'Lainnya'
          const catEmoji = cat?.emoji || '🏷️'
          const catColor = cat?.color || '#10b981'

          if (!catMap[catName]) {
            catMap[catName] = { name: catName, emoji: catEmoji, color: catColor, amount: 0, count: 0 }
          }
          catMap[catName].amount += amt
          catMap[catName].count += 1
        }
      }

      const netSavings = monthlyIncome - monthlyExpense
      const burnRate = monthlyIncome > 0 ? Math.round((monthlyExpense / monthlyIncome) * 1000) / 10 : 0
      const isDeficit = monthlyExpense > monthlyIncome || (monthlyIncome > 0 && burnRate >= 80)
      const deficitWarning = isDeficit
        ? monthlyExpense > monthlyIncome
          ? `⚠️ PERINGATAN DEFISIT: Pengeluaran bulan ini (${formatRupiah(monthlyExpense)}) melebihi pemasukan (${formatRupiah(monthlyIncome)}) sebesar ${formatRupiah(monthlyExpense - monthlyIncome)}!`
          : `⚠️ PERINGATAN BURN RATE TINGGI: Anda sudah menghabiskan ${burnRate}% dari pemasukan bulan ini.`
        : undefined

      const sortedCats = Object.values(catMap).sort((a, b) => b.amount - a.amount)
      const topCategories: CategorySpending[] = sortedCats.slice(0, 5).map((c) => ({
        name: c.name,
        emoji: c.emoji,
        color: c.color,
        amount: c.amount,
        percentage: monthlyExpense > 0 ? Math.round((c.amount / monthlyExpense) * 1000) / 10 : 0,
        count: c.count,
      }))

      const baselineIncome = monthlyIncome
      const needsTarget = Math.round(baselineIncome * 0.5)
      const wantsTarget = Math.round(baselineIncome * 0.3)
      const savingsTarget = Math.round(baselineIncome * 0.2)

      let actualNeeds = 0
      let actualWants = 0
      for (const [name, cat] of Object.entries(catMap)) {
        const lower = name.toLowerCase()
        if (
          lower.includes('makan') ||
          lower.includes('tagihan') ||
          lower.includes('listrik') ||
          lower.includes('air') ||
          lower.includes('sewa') ||
          lower.includes('bensin') ||
          lower.includes('transport') ||
          lower.includes('kesehatan')
        ) {
          actualNeeds += cat.amount
        } else {
          actualWants += cat.amount
        }
      }
      const actualSavings = Math.max(0, netSavings)

      let evaluation = 'Belum ada transaksi keuangan tercatat.'
      if (monthlyIncome > 0) {
        if (actualNeeds > needsTarget) {
          evaluation = `Pos Kebutuhan Pokok (${formatRupiah(actualNeeds)}) melebihi target 50% (${formatRupiah(needsTarget)}). Perlu efisiensi belanja rutin.`
        } else if (actualWants > wantsTarget) {
          evaluation = `Pos Keinginan & Lifestyle (${formatRupiah(actualWants)}) melampaui batas 30% (${formatRupiah(wantsTarget)}). Disarankan rem jajan/hiburan.`
        } else if (actualSavings >= savingsTarget) {
          evaluation = `Hebat! Target tabungan 20% terpenuhi dan sisa dana surplus ${formatRupiah(actualSavings)}.`
        } else {
          evaluation = 'Arus kas terpantau stabil.'
        }
      }

      return {
        userId: effectiveUserId,
        userName: persistentUser?.name || 'Pengguna TataDana',
        userPlan: (persistentUser?.plan as any) || 'pro',
        totalBalance,
        walletCount: wallets.length,
        wallets,
        monthlyIncome,
        monthlyExpense,
        netSavings,
        burnRatePercentage: burnRate,
        isDeficit,
        deficitWarning,
        topCategories,
        mostExpensiveCategory: topCategories[0],
        budgets: [],
        rule503020: {
          monthlyIncome: baselineIncome,
          needsTarget,
          wantsTarget,
          savingsTarget,
          actualNeeds,
          actualWants,
          actualSavings,
          needsPercentage: baselineIncome > 0 ? Math.round((actualNeeds / baselineIncome) * 100) : 0,
          wantsPercentage: baselineIncome > 0 ? Math.round((actualWants / baselineIncome) * 100) : 0,
          savingsPercentage: baselineIncome > 0 ? Math.round((actualSavings / baselineIncome) * 100) : 0,
          evaluation,
        },
      }
    }

    return getFallbackFinancialContext(effectiveUserId)
  } catch (error) {
    console.warn('Error fetching financial context, using fallback:', error)
    return getFallbackFinancialContext(effectiveUserId)
  }
}

/**
 * Formats user financial context into system prompt instructions for LLM
 */
export function formatFinancialContextPrompt(ctx: UserFinancialContext): string {
  const walletList = ctx.wallets.map((w) => `- ${w.name} (${w.type}): ${formatRupiah(w.balance)}`).join('\n')
  const topCatList = ctx.topCategories
    .map((c) => `- ${c.emoji || '🏷️'} ${c.name}: ${formatRupiah(c.amount)} (${c.percentage}% dari total pengeluaran)`)
    .join('\n')

  const budgetList =
    ctx.budgets.length > 0
      ? ctx.budgets
          .map((b) => `- ${b.categoryName}: ${formatRupiah(b.spent)} / ${formatRupiah(b.limit)} (${b.percentage}% - ${b.status.toUpperCase()})`)
          .join('\n')
      : 'Belum ada limit budget yang diatur.'

  return `
[DATA FINANSIAL PENGGUNA TERKINI]
Nama Pengguna: ${ctx.userName}
Paket Layanan: ${ctx.userPlan.toUpperCase()}
Total Saldo Dompet: ${formatRupiah(ctx.totalBalance)}
Rincian Dompet:
${walletList}

Pemasukan Bulan Berjalan: ${formatRupiah(ctx.monthlyIncome)}
Pengeluaran Bulan Berjalan: ${formatRupiah(ctx.monthlyExpense)}
Surplus / Tabungan Bersih: ${formatRupiah(ctx.netSavings)}
Rasio Pengeluaran (Burn Rate): ${ctx.burnRatePercentage}%
Status Defisit: ${ctx.isDeficit ? 'YA (Waspada defisit/burn rate tinggi)' : 'TIDAK (Arus kas positif & aman)'}
${ctx.deficitWarning ? `Peringatan Defisit: ${ctx.deficitWarning}` : ''}

Kategori Pengeluaran Terbesar:
${topCatList}
Kategori Paling Boros: ${ctx.mostExpensiveCategory ? `${ctx.mostExpensiveCategory.name} (${formatRupiah(ctx.mostExpensiveCategory.amount)})` : '-'}

Status Anggaran (Budget):
${budgetList}

Analisis Metode 50/30/20:
- Target 50% Kebutuhan Pokok (Needs): ${formatRupiah(ctx.rule503020.needsTarget)} | Realisasi: ${formatRupiah(ctx.rule503020.actualNeeds)} (${ctx.rule503020.needsPercentage}%)
- Target 30% Keinginan (Wants): ${formatRupiah(ctx.rule503020.wantsTarget)} | Realisasi: ${formatRupiah(ctx.rule503020.actualWants)} (${ctx.rule503020.wantsPercentage}%)
- Target 20% Tabungan/Investasi (Savings): ${formatRupiah(ctx.rule503020.savingsTarget)} | Realisasi: ${formatRupiah(ctx.rule503020.actualSavings)} (${ctx.rule503020.savingsPercentage}%)
- Evaluasi Alokasi: ${ctx.rule503020.evaluation}
`
}

/**
 * Intelligent Indonesian conversational advice generator when AI API keys are offline or unconfigured
 */
export function generateHeuristicFinancialAdvice(
  message: string,
  ctx: UserFinancialContext,
  _history?: Array<{ role: string; content: string }>
): { reply: string; suggested_actions: string[] } {
  const query = message.toLowerCase()

  // 1. QUICK PROMPT: "Analisa pengeluaranku" / Financial Analysis
  if (
    query.includes('analisa') ||
    query.includes('analisis') ||
    query.includes('pengeluaran') ||
    query.includes('kondisi keuangan') ||
    query.includes('evaluasi') ||
    query.includes('arus kas')
  ) {
    if (ctx.monthlyIncome === 0 && ctx.monthlyExpense === 0 && ctx.totalBalance === 0) {
      const reply = `Halo Kak ${ctx.userName}! 👋 Saat ini Anda belum memiliki catatan transaksi ataupun saldo di akun TataDana.\n\nUntuk memulai analisa keuangan nyata:\n1. Buat dompet pertama Anda di menu Dompet (misal: BCA, Cash, atau E-Wallet).\n2. Catat pemasukan atau pengeluaran pertama Anda melalui tombol '+ Transaksi' atau chat ke Tata AI!\n\nSetelah transaksi tercatat, saya akan langsung menganalisa arus kas dan kategori pengeluaran Anda secara otomatis. 🚀`
      return {
        reply,
        suggested_actions: [
          'Beri tips hemat minggu ini',
          'Rekomendasi alokasi 50/30/20',
          'Simulasi budget liburan',
        ],
      }
    }

    const topCat = ctx.mostExpensiveCategory || ctx.topCategories[0]
    const reply = `Halo Kak ${ctx.userName}! 👋 Berikut ringkasan analisa keuanganmu bulan ini:

📊 **Ringkasan Arus Kas Bulan Ini:**
• Total Pemasukan: **${formatRupiah(ctx.monthlyIncome)}**
• Total Pengeluaran: **${formatRupiah(ctx.monthlyExpense)}**
• Surplus Bersih (Net Savings): **${formatRupiah(ctx.netSavings)}** (Rasio simpanan: **${Math.round((ctx.netSavings / ctx.monthlyIncome) * 100)}%**)
• Total Saldo di Seluruh Dompet: **${formatRupiah(ctx.totalBalance)}**

🔍 **Pos Pengeluaran Terbesar:**
Kategori paling dominan adalah **${topCat?.name || 'Makanan & Minuman'}** sebesar **${formatRupiah(topCat?.amount || 0)}** (${topCat?.percentage || 0}% dari seluruh belanjaanmu).

💡 **Insight Tata AI:**
${
  ctx.burnRatePercentage < 50
    ? `Kondisi keuanganmu **sangat prima**! Kamu baru menggunakan ${ctx.burnRatePercentage}% dari total pemasukan. Pertahankan surplus ini untuk dialokasikan ke pos investasi dan dana darurat.`
    : ctx.burnRatePercentage < 80
      ? `Arus kasmu **cukup seimbang** (${ctx.burnRatePercentage}% terpakai). Tetap awasi pengeluaran harian di kategori ${topCat?.name} agar tidak menyentuh batas kritis di akhir bulan.`
      : `⚠️ **Perhatian:** Rasio pengeluaranmu sudah mencapai ${ctx.burnRatePercentage}%. Sebaiknya mulai rem belanja non-esensial agar tidak terjadi defisit.`
}

Ada yang ingin disimulasikan lebih lanjut, Kak?`

    return {
      reply,
      suggested_actions: [
        'Beri tips hemat minggu ini',
        'Rekomendasi alokasi 50/30/20',
        'Simulasi budget liburan',
      ],
    }
  }

  // 2. QUICK PROMPT: "Beri tips hemat minggu ini" / Weekly Saving Tips
  if (
    query.includes('tips hemat') ||
    query.includes('hemat') ||
    query.includes('minggu ini') ||
    query.includes('penghematan') ||
    query.includes('cara hemat')
  ) {
    const topCat = ctx.mostExpensiveCategory?.name || 'Makanan & Minuman'
    const reply = `Tentu Kak ${ctx.userName}! Berdasarkan pola transaksimu yang paling banyak di kategori **${topCat}**, ini 4 tips hemat praktis untuk minggu ini:

1. 🍱 **Terapkan 'Batch Cooking' atau Bawa Bekal 3 Hari**
   Dengan menyiapkan makanan sendiri 3 hari kerja, kamu bisa menghemat sekitar **Rp120.000 – Rp180.000/minggu** dibanding jajan di luar.

2. ☕ **Aturan 2 Cangkir Kopi / Boba Seminggu**
   Batasi jajan kopi kekinian maksimal 2 kali seminggu. Sisanya seduh kopi favorit di rumah/kantor untuk saving hingga **Rp75.000/minggu**.

3. 🛒 **Buat 'Daftar Belanja Ketat' Sebelum ke Supermarket**
   Hindari lapar mata saat belanja mingguan. Hanya beli item yang ada di daftar dan manfaatkan promo cashback e-wallet (${ctx.wallets.find((w) => w.type === 'ewallet')?.name || 'GoPay/OVO'}).

4. ⏳ **Gunakan Aturan Tunggu 48 Jam (48-Hour Rule)**
   Untuk barang belanjaan non-esensial di atas Rp100.000, tunggu 2 hari sebelum checkout. Seringkali keinginan belanja impulsif mereda dengan sendirinya!

Potensi penghematan mingguan: **~Rp300.000 – Rp450.000** yang bisa langsung kamu putar ke tabungan! 🎯`

    return {
      reply,
      suggested_actions: [
        'Analisa pengeluaranku',
        'Simulasi budget liburan',
        'Rekomendasi alokasi 50/30/20',
      ],
    }
  }

  // 3. QUICK PROMPT: "Simulasi budget liburan" / Vacation Simulation
  if (
    query.includes('liburan') ||
    query.includes('simulasi budget') ||
    query.includes('libur') ||
    query.includes('travel') ||
    query.includes('trip') ||
    query.includes('healing')
  ) {
    const targetLiburan = 3500000
    const periodeBulan = 4
    const nabungPerBulan = Math.round(targetLiburan / periodeBulan)

    const reply = `Siap Kak ${ctx.userName}! Liburan tenang tanpa beban utang itu kuncinya di sistem **Sinking Fund** (Dana Terencana) 🏖️✨

🎯 **Simulasi Target Liburan Domestik (Contoh: Bali / Yogyakarta 3D2N):**
• Estimasi Target Biaya: **${formatRupiah(targetLiburan)}**
• Target Waktu: **${periodeBulan} Bulan ke depan**
• Alokasi Tabungan Bulanan: **${formatRupiah(nabungPerBulan)} / bulan**

📋 **Rencana Alokasi Biaya Liburan:**
• ✈️ Tiket Transportasi PP: **${formatRupiah(1400000)}** (40%)
• 🏨 Penginapan 2 Malam: **${formatRupiah(900000)}** (25%)
• 🍜 Kuliner & Jajan Lokal: **${formatRupiah(700000)}** (20%)
• 🎟️ Tiket Wisata & Oleh-oleh: **${formatRupiah(500000)}** (15%)

💡 **Strategi Tata AI:**
Dari pos Keinginan (30%) gajimu sebesar **${formatRupiah(ctx.rule503020.wantsTarget)}**, kamu hanya perlu menyisihkan **${Math.round((nabungPerBulan / ctx.rule503020.wantsTarget) * 100)}%** saja untuk pos liburan ini. Kebutuhan pokok dan tabungan masa depanmu tetap 100% aman!

Mau buat dompet terpisah di TataDana khusus untuk "Tabungan Liburan"?`

    return {
      reply,
      suggested_actions: [
        'Rekomendasi alokasi 50/30/20',
        'Beri tips hemat minggu ini',
        'Analisa pengeluaranku',
      ],
    }
  }

  // 4. CONSULTATION: 50/30/20 Salary Allocation Rule
  if (
    query.includes('50/30/20') ||
    query.includes('50 30 20') ||
    query.includes('alokasi gaji') ||
    query.includes('bagi gaji') ||
    query.includes('aturan 50') ||
    query.includes('cara bagi uang') ||
    query.includes('kelola gaji')
  ) {
    const income = ctx.monthlyIncome
    if (income === 0) {
      const reply = `Metode **50/30/20** adalah rumus alokasi keuangan terpopuler di dunia yang sangat cocok diterapkan di Indonesia, Kak ${ctx.userName}!

Pembagian idealnya membagi pemasukan bulanan menjadi:
• 🏠 **50% Kebutuhan Pokok (Needs):** Sewa tempat tinggal, sembako, listrik, air, internet, bensin, dan premi asuransi kesehatan.
• ☕ **30% Keinginan (Wants):** Hiburan, nongkrong kafe, belanja hobi, dan liburan.
• 📈 **20% Tabungan & Investasi (Savings):** Dana darurat cair, reksadana, emas, dan investasi masa depan.

Saat ini Anda belum mencatat pemasukan bulanan di TataDana. Catat gaji atau pemasukan pertama Anda (misal: "Gajian 5 juta") agar Tata AI dapat menghitungkan pembagian 50/30/20 secara presisi untuk keuangan Anda! 🎯`
      return {
        reply,
        suggested_actions: [
          'Beri tips hemat minggu ini',
          'Simulasi budget liburan',
          'Analisa pengeluaranku',
        ],
      }
    }

    const { needsTarget, wantsTarget, savingsTarget, actualNeeds, actualWants, actualSavings } = ctx.rule503020

    const reply = `Metode **50/30/20** adalah rumus alokasi keuangan terpopuler di dunia yang sangat cocok diterapkan di Indonesia, Kak ${ctx.userName}!

Berdasarkan pemasukan bulananmu sebesar **${formatRupiah(income)}**, ini pembagian idealnya:

🏠 **1. 50% Kebutuhan Pokok (Needs) — Target: ${formatRupiah(needsTarget)}**
• Alokasi untuk: Sewa rumah/KPR, belanja sembako, listrik, air, internet, bensin, dan premi asuransi kesehatan.
• *Realisasimu saat ini:* **${formatRupiah(actualNeeds)}** (${ctx.rule503020.needsPercentage}% — ${actualNeeds <= needsTarget ? '✅ Sangat Aman' : '⚠️ Melebihi Kuota'})

☕ **2. 30% Keinginan & Lifestyle (Wants) — Target: ${formatRupiah(wantsTarget)}**
• Alokasi untuk: Makan di luar/kafe, langganan Netflix/Spotify, hobi, belanja baju baru, dan liburan.
• *Realisasimu saat ini:* **${formatRupiah(actualWants)}** (${ctx.rule503020.wantsPercentage}% — ${actualWants <= wantsTarget ? '✅ Terkendali' : '⚠️ Terlalu Boros'})

📈 **3. 20% Tabungan & Investasi (Savings) — Target: ${formatRupiah(savingsTarget)}**
• Alokasi untuk: Dana darurat cair, reksadana, emas, saham, dan pelunasan utang berbunga tinggi.
• *Realisasimu saat ini:* **${formatRupiah(actualSavings)}** (${ctx.rule503020.savingsPercentage}% — ${actualSavings >= savingsTarget ? '🌟 Luar Biasa' : '⚠️ Perlu Ditambah'})

💡 **Catatan Tata AI:**
${ctx.rule503020.evaluation}`

    return {
      reply,
      suggested_actions: [
        'Simulasi budget liburan',
        'Beri tips hemat minggu ini',
        'Analisa pengeluaranku',
      ],
    }
  }

  // 5. CONSULTATION: Defisit, Utang, Dana Darurat
  if (
    query.includes('defisit') ||
    query.includes('tekor') ||
    query.includes('dana darurat') ||
    query.includes('utang') ||
    query.includes('paylater') ||
    query.includes('habis terus')
  ) {
    const danaDaruratTarget = ctx.monthlyExpense * 6
    const reply = `Halo Kak ${ctx.userName}, mari kita bahas langkah pengamanan finansial dari risiko defisit:

🛡️ **1. Hitung Dana Darurat Idealmu**
Dengan pengeluaran bulananmu sebesar **${formatRupiah(ctx.monthlyExpense)}**, target dana darurat yang aman adalah:
• **Minimal 3x Pengeluaran:** **${formatRupiah(ctx.monthlyExpense * 3)}** (untuk single)
• **Ideal 6x Pengeluaran:** **${formatRupiah(danaDaruratTarget)}** (untuk ketahanan penuh)
Saat ini total saldo dompetmu adalah **${formatRupiah(ctx.totalBalance)}**.

🛑 **2. Protokol Rem Darurat Saat Pengeluaran Tinggi:**
1. **Freeze Paylater / Kartu Kredit:** Jangan tambah cicilan konsumtif baru sebelum cicilan berjalan lunas.
2. **Audit Langganan Digital:** Cek subscription yang jarang terpakai (gym, video streaming, membership).
3. **Pindahkan Tabungan di Awal Bulan (Pay Yourself First):** Begitu gajian masuk, langsung kunci 20% ke rekening tabungan tanpa kartu ATM.

${ctx.isDeficit ? `⚠️ ${ctx.deficitWarning}` : `✅ Kabar baik: Arus kasmu bulan ini masih surplus **${formatRupiah(ctx.netSavings)}**, jadi belum ada tanda-tanda defisit!`}`

    return {
      reply,
      suggested_actions: [
        'Analisa pengeluaranku',
        'Beri tips hemat minggu ini',
        'Rekomendasi alokasi 50/30/20',
      ],
    }
  }

  // 6. GENERAL GREETINGS & DEFAULT FINANCIAL ASSISTANCE
  const reply = `Halo Kak ${ctx.userName}! 😊 Saya **Tata AI**, asisten keuangan pribadi cerdas dari TataDana.

Saya siap membantumu mengelola keuangan dengan bijak:
• 📊 **Menganalisa arus kas dan kategori pengeluaran terbesarmu**
• 💡 **Memberikan rekomendasi alokasi gaji (metode 50/30/20)**
• 🎯 **Membuat simulasi tabungan liburan atau dana impian**
• 🛡️ **Memberikan peringatan dini defisit dan evaluasi batas budget**

Status keuanganmu saat ini: Total saldo **${formatRupiah(ctx.totalBalance)}** dengan surplus bulan ini **${formatRupiah(ctx.netSavings)}**.

Silakan pilih topik cepat di bawah atau tanyakan apapun seputar keuanganmu!`

  return {
    reply,
    suggested_actions: [
      'Analisa pengeluaranku',
      'Beri tips hemat minggu ini',
      'Simulasi budget liburan',
    ],
  }
}
