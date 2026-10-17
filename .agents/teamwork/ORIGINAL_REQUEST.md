# Original User Request

## 2026-10-16T03:25:33Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Implement Kalender, Tata AI Bot, Multi-Wallet, Telegram Auto-Responder, Multi-Period Budget, & Admin Approval
> Requested team: Kerjakan dengan 5 orang team (Use a team of 5 agents)

Pengembangan lanjutan TataDana SaaS Finansial Indonesia: Menambahkan fitur Kalender Transaksi interaktif, Tata AI Bot asisten finansial web, pembuatan dompet baru terintegrasi, perbaikan auto-responder Telegram Bot agar merespons chat secara real-time, sistem budgeting multi-periode (Harian, Mingguan, Bulanan) yang terhubung ke bot Telegram, dan modul persetujuan (Approved Admin) fungsional, dengan tema Luxury Obsidian Black & Deep Emerald Green.

Working directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana
Integrity mode: development

## Requirements

### R1. Fitur Kalender Keuangan Interaktif (`/dashboard/kalender`)
- Halaman kalender visual native di dashboard TataDana dengan tema Luxury Obsidian Black & Emerald.
- Navigasi bulan/tahun, tampilan grid tanggal 1–31 dengan badge arus kas harian (total pemasukan hijau, total pengeluaran merah).
- Interaktivitas klik tanggal: memunculkan drawer / modal rincian daftar transaksi yang terjadi pada tanggal tersebut (nominal, kategori, dompet, catatan).
- Filter per dompet (Semua, BCA, Cash, e-Wallet) yang otomatis memperbarui angka di kalender.

### R2. Fitur Tata AI Bot Chat Assistant (`/dashboard/tata-ai` & Floating Widget)
- Modul chat asisten AI keuangan pribadi interaktif langsung di dalam aplikasi web TataDana.
- Kemampuan AI memahami konteks finansial pengguna (total saldo, rata-rata pengeluaran bulanan, kategori paling boros).
- Fitur konsultasi: rekomendasi alokasi gaji (metode 50/30/20), analisa penghematan, peringatan dini defisit, dan tanya-jawab finansial dengan bahasa Indonesia santun dan solutif.
- Opsi quick prompts: "Analisa pengeluaranku", "Beri tips hemat minggu ini", "Simulasi budget liburan".

### R3. Pembuatan & Manajemen Dompet Baru (Multi-Wallet)
- Form modal fungsional "Tambah Dompet Baru" di `/dashboard/wallet`: input nama dompet, jenis (Bank BCA/Mandiri/BRI/BNI, E-Wallet GoPay/OVO/Dana, Cash Tunai), saldo awal, dan nomor rekening/nomor HP.
- Data tersimpan persisten ke database & state aplikasi.
- Tombol aksi: "Jadikan Default Telegram", edit saldo/nama, dan riwayat transaksi per dompet.

### R4. Perbaikan Auto-Responder Bot Telegram (Real-Time Response Fix)
- Memperbaiki komunikasi bot Telegram agar pesan yang dikirim user dari aplikasi Telegram (HP/desktop) langsung mendapatkan balasan otomatis dari bot tanpa diam/macet.
- Menyediakan background long-polling service (`scripts/start-telegram-bot.bat` & internal daemon poller) yang berjalan berdampingan dengan Next.js dev server untuk menarik update Telegram secara otomatis setiap 1-2 detik di lingkungan lokal.
- Telegram message handler membalas:
  - Input teks transaksi ("beli sate 20rb" -> tercatat pengeluaran + sisa budget).
  - Foto struk OCR belanja.
  - Pesan suara (voice note).
  - Commands: `/start`, `/saldo`, `/budget`, `/hari_ini`, `/minggu_ini`, `/bulan_ini`, `/bantuan`.

### R5. Sistem Budgeting Multi-Periode (Harian, Mingguan, Bulanan) + Integrasi Alert Telegram
- Di `/dashboard/budget`, sediakan toggle 3 periode anggaran: **Harian**, **Mingguan**, dan **Bulanan**.
- Pengguna dapat menetapkan limit anggaran per kategori untuk masing-masing periode (misal: Makanan Rp75.000/hari atau Rp500.000/minggu atau Rp2.000.000/bulan).
- Progress bar terpakai dinamis dengan indikator warna (Aman hijau, 80% amber, Overbudget 100% merah).
- **Integrasi Bot Telegram:** Setiap ada transaksi baru yang dicatat (lewat web maupun Telegram), sistem otomatis mengevaluasi threshold budget harian/mingguan/bulanan. Jika menyentuh ≥80% atau 100%, bot Telegram otomatis mengirimkan pesan peringatan dini (*budget limit alert*).

### R6. Modul Approval Admin Fungsional (`Approved Admin`)
- Pada halaman `/admin/payments`, sediakan tombol fungsional **Approve** dan **Reject** untuk transaksi pembayaran paket Pro (Midtrans pending & transfer manual).
- Mengklik **Approve** langsung mengaktifkan status akun pengguna menjadi **Paket Pro (Lifetime / Bulanan)** dan mencatat audit log.
- Pada halaman `/admin/users`, admin dapat mengubah status akun (Aktif/Suspended/Pro) secara instan.

### R7. Konsistensi Tema & Estetika Visual
- Seluruh layar baru (Kalender, Tata AI Bot, Modal Dompet, Budgeting) menerapkan estetika **Luxury Obsidian Black & Deep Emerald Green** (`#06090e`, aksen `#10b981`, panel `#080d14`, border `#064e3b` halus).

## Acceptance Criteria

### Functional Verification
- [ ] Rute `/dashboard/kalender` aktif dan dapat dibuka, menampilkan kalender bulan berjalan dengan indikator pemasukan/pengeluaran harian dan modal transaksi per tanggal.
- [ ] Rute `/dashboard/tata-ai` aktif, pengguna dapat mengetik pertanyaan finansial dan menerima jawaban cerdas dari AI TataDana.
- [ ] Form tambah dompet baru di `/dashboard/wallet` berhasil menambah kartu dompet baru dan bisa diatur sebagai default Telegram.
- [ ] Bot Telegram terbukti membalas pesan secara otomatis ketika pengguna mengirim chat teks transaksi ke bot di Telegram.
- [ ] Halaman `/dashboard/budget` memiliki filter/tab Harian, Mingguan, dan Bulanan; transaksi baru mengecek batas budget dan memicu notifikasi bot Telegram.
- [ ] Halaman `/admin/payments` memiliki tombol Approve/Reject yang mengubah status transaksi pembayaran dan meng-upgrade user ke Pro secara real-time.
- [ ] Semua halaman dan endpoint merespons dengan HTTP 200 OK di `http://localhost:3000`.


## 2026-10-17T02:51:11Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Mengubah metode koneksi Bot Telegram dari Webhook menjadi Long Polling (Polling Mode) agar bot dapat menerima pesan saat dijalankan di localhost
> Requested team: Kerjakan dengan 5 orang team (Use a team of 5 agents)

Pengembangan TataDana Fintech SaaS: Mengubah metode integrasi Bot Telegram dari sistem Webhook menjadi mode Long Polling (Polling Mode) terintegrasi. Hal ini memungkinkan bot Telegram menerima, memproses, dan membalas pesan teks, foto struk, dan voice note secara real-time saat aplikasi dijalankan di lingkungan localhost (tanpa memerlukan domain HTTPS publik, ngrok, atau webhook). Perubahan mencakup backend setup API, UI Settings dengan auto-poller toggle & live status monitor, background long-polling daemon, serta sinkronisasi saldo dan alert budget.

Working directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana
Integrity mode: development

## Requirements

### R1. Polling-First Backend Architecture (`/api/telegram/setup-bot`, `/api/telegram/poll`)
- Ubah default mode integrasi Telegram dari Webhook menjadi **Long Polling (`mode = 'long_polling'`)**.
- Saat user menguji dan menyimpan token di `/api/telegram/setup-bot`, backend wajib mengeksekusi `deleteWebhook({ drop_pending_updates: false })` untuk membersihkan konfigurasi webhook di server Telegram sehingga bot beralih ke mode polling tanpa error HTTP 409 Conflict.
- Simpan preferensi mode `long_polling` ke database / user profile.
- Endpoint `/api/telegram/poll` menangani request polling update secara idempotent dengan offset tracking, memproses update melalui `TelegramMessageHandler`, dan mengembalikan daftar pesan yang berhasil diproses beserta rincian transaksi/balasan bot.

### R2. In-App Auto-Poller & UI Settings Refresh (`app/dashboard/settings/page.tsx`)
- Perbarui antarmuka Tab Telegram Bot di halaman Pengaturan (`/dashboard/settings`):
  - Tampilkan badge status jelas: **"Mode: Long Polling (Localhost Ready)"**.
  - Sediakan toggle **"Auto-Polling Real-Time"** di frontend yang secara otomatis memeriksa pesan masuk secara berkala (setiap 2-3 detik) saat user membuka aplikasi web di localhost.
  - Tampilkan indikator visual hidup: 🟢 **"Polling Aktif — Mendengarkan Pesan Telegram"** dengan animasi pulse saat aktif.
  - Tampilkan riwayat log chat Telegram real yang diproses (waktu, pengirim, teks, dan status aksi bot).
  - Tombol manual **"Tarik Pesan Sekarang (Polling)"** tetap tersedia untuk pengujian instan on-demand.
  - Hapus atau sesuaikan instruksi lama yang mewajibkan ngrok/tunnel HTTPS.

### R3. Background Long-Polling Daemon & Batch Launcher
- Pastikan script background [`scripts/telegram-daemon.mjs`](file:///C:/Users/Laptop%20Acer%20Nitro%205/.gemini/antigravity/scratch/tatadana/scripts/telegram-daemon.mjs) dan [`scripts/start-telegram-bot.bat`](file:///C:/Users/Laptop%20Acer%20Nitro%205/.gemini/antigravity/scratch/tatadana/scripts/start-telegram-bot.bat) beroperasi dalam mode Long Polling murni:
  - Menggunakan `getUpdates` dengan parameter `timeout: 25` (long-polling HTTP resmi Telegram).
  - Menyimpan offset terakhir ke `.telegram-offset.json` agar pesan tidak hilang dan tidak diproses dua kali.
  - Menerima dan memproses seluruh tipe pesan:
    - Teks transaksi natural Indonesia ("beli sate 25rb", "gajian 5jt").
    - Foto struk belanja (Vision OCR).
    - Pesan suara (Voice Note STT).
    - Slash commands: `/start`, `/saldo`, `/budget`, `/hari_ini`, `/minggu_ini`, `/bulan_ini`, `/bantuan`.

### R4. Integrasi State Transaksi, Dompet, dan Alert Budget
- Setiap transaksi baru yang dicatat melalui pesan Long Polling langsung didebit/dikreditkan ke dompet default pengguna (misal: BCA Utama).
- Sistem langsung mengevaluasi batas anggaran (budget) Harian, Mingguan, dan Bulanan, serta mengirimkan pesan peringatan otomatis ke Telegram jika menyentuh ambang ≥80% atau 100%.

### R5. Verifikasi Otomatis & Dual-Track E2E Test Suite
- Perbarui dan jalankan seluruh suite pengujian di [`scripts/verify-all.mjs`](file:///C:/Users/Laptop%20Acer%20Nitro%205/.gemini/antigravity/scratch/tatadana/scripts/verify-all.mjs).
- Pastikan verifikasi Long Polling mode, endpoint `/api/telegram/poll`, dan seluruh 53+ test case lulus 100%.

## Acceptance Criteria

### Technical & Functional Guardrails
- [ ] Endpoint `/api/telegram/setup-bot` secara eksplisit membersihkan webhook (`deleteWebhook`) dan mengonfigurasi bot ke mode Long Polling.
- [ ] Endpoint `/api/telegram/poll` merespons dengan HTTP 200 OK dan memproses incoming messages Telegram tanpa error.
- [ ] Halaman `/dashboard/settings` menampilkan status koneksi Long Polling dengan toggle Auto-Polling dan log pesan real-time.
- [ ] Script [`scripts/telegram-daemon.mjs`](file:///C:/Users/Laptop%20Acer%20Nitro%205/.gemini/antigravity/scratch/tatadana/scripts/telegram-daemon.mjs) dan batch file [`scripts/start-telegram-bot.bat`](file:///C:/Users/Laptop%20Acer%20Nitro%205/.gemini/antigravity/scratch/tatadana/scripts/start-telegram-bot.bat) siap digunakan untuk long-polling terus menerus di localhost.
- [ ] Seluruh suite pengujian otomatis lulus 100% (semua unit, boundary, dan e2e tests passed).


## 2026-10-17T05:18:04Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Master Implementation of Real Financial Management Web Application (TataDana) with Persistent Database, Secure Dual-Portal Auth, Admin Approval & WhatsApp Notification, Single Source of Truth Ledger, Tata AI, Multi-Wallet, Multi-Period Budget & Calendar, Real Report Export, Telegram Long Polling, and Pro Entitlements
> Requested team: Kerjakan dengan 5 orang team kerja (Use a team of 5 agents)

Pengembangan dan penyempurnaan menyeluruh TataDana menjadi platform SaaS Finansial Indonesia siap produksi: Mengubah seluruh modul aplikasi web agar menyimpan data secara persisten ke database tanpa ketergantungan pada dummy data atau localStorage, menerapkan autentikasi aman dengan pemisahan User Login (`/login`) dan Admin Portal Login (`/admin/login`), registrasi dengan normalisasi email dan nomor telepon E.164 berstatus `pending_approval`, sistem persetujuan admin dengan notifikasi WhatsApp ke `081460932853` dan akun admin khusus `wildanakmalfathan@gmail.com`, single source of truth transaction ledger dengan perhitungan uang integer/numeric IDR, integrasi Tata AI Bot, pengelolaan multi-wallet, budget harian/mingguan/bulanan (WIB) dengan kalender interaktif, download laporan nyata (CSV & XLSX/PDF) terproteksi formula injection, integrasi Telegram bot polling-first (@danaanananabot), serta sistem langganan Pro bertingkat, dengan estetika Luxury Obsidian Black & Deep Emerald Green.

Working directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana
Integrity mode: development

## Requirements

### R1. Sistem Database Persisten & Integritas Data (Section C & H)
- Seluruh data pengguna, wallet, transaksi, kategori, budget, audit log, dan pembayaran harus tersimpan persisten dalam database (PostgreSQL/Supabase dengan fallback engine persisten lokal).
- Dilarang keras menggunakan dummy mock data atau mengandalkan localStorage/sessionStorage sebagai pengganti penyimpanan data produksi.
- Ledger transaksi (`public.transactions`) menjadi satu-satunya sumber kebenaran (Single Source of Truth) untuk seluruh perhitungan saldo wallet, kalender, laporan, dan budget.
- Gunakan tipe data integer rupiah atau numeric(15,2) untuk mencegah kesalahan floating-point dalam perhitungan uang.
- Foreign key dan cascading rules diterapkan secara ketat untuk mencegah data yatim (*orphan data*).

### R2. Autentikasi, Registrasi & Normalisasi Identitas (Section D & E)
- Registrasi pengguna baru mewajibkan: Nama lengkap, email, nomor telepon, password, dan konfirmasi password.
- Normalisasi identitas: Email dinormalisasi ke huruf kecil (*lowercase trimmed*), nomor telepon dinormalisasi ke format E.164 internasional (contoh: `081460932853` -> `+6281460932853`).
- Terapkan unique constraint pada email dan nomor telepon ternormalisasi. Cegah race condition pendaftaran ganda.
- Password wajib di-hash menggunakan mekanisme hashing aman (scrypt/PBKDF2/Argon2id dengan salt unik), dilarang menyimpan password dalam bentuk teks biasa di database, log, maupun API response.
- Akun yang baru mendaftar otomatis memiliki status `pending_approval` dan dilarang mengakses dashboard privat sebelum disetujui.

### R3. Pemisahan Menu Login & Akses Admin Khusus (Section D, E & F)
- Pemisahan menu login yang jelas:
  - **User Login (`/login`)**: Khusus pengguna biasa. Pengguna dengan status `pending_approval` atau `rejected` tidak dapat login ke dashboard.
  - **Admin Portal Login (`/admin/login`)**: Halaman terpisah khusus administrator dengan proteksi keamanan ekstra.
- Akun Administrator Utama:
  - Email admin resmi: `wildanakmalfathan@gmail.com`.
  - Nomor WhatsApp admin: `081460932853`.
  - Hanya identitas ini yang berhak memperoleh role `admin`. Registrasi umum dilarang membuat akun ber-role admin.
  - Administrator otomatis mendapatkan hak Pro Lifetime.
- Akses ke seluruh route `/admin/*` dan endpoint API administratif wajib divalidasi di backend (HTTP 403 Forbidden untuk pengguna non-admin).

### R4. Alur Persetujuan Registrasi & Notifikasi WhatsApp (Section F)
- Saat pengguna mendaftar, akun dibuat dengan status `pending_approval`.
- Admin panel menampilkan antrean permintaan baru secara real-time.
- Notifikasi persetujuan dikirim ke WhatsApp admin (`081460932853`) dengan detail pendaftar dan link tindakan aman bertanda tangan/token sekali pakai.
- Jika integrasi WhatsApp API belum memiliki kredensial aktif, sistem harus secara jujur menampilkan status integrasi belum aktif beserta panduan setup, bukan memalsukan status pengiriman pesan.
- Administrator dapat menyetujui (`approve`) atau menolak (`reject`) registrasi melalui Admin Panel. Keputusan tersimpan permanen di database beserta audit log (waktu, aktor, alasan).

### R5. Admin Dashboard & Pemantauan Pengguna Real-Time (Section G)
- Statistik utama di `/admin`: Total pengguna terdaftar, pengguna aktif saat ini, pendaftar hari ini, permintaan pending approval, rasio approved/rejected, serta status integrasi (WhatsApp & Telegram).
- Mekanisme **Session Heartbeat Real-Time**: Pengguna aktif ditentukan berdasarkan aktivitas heartbeat dalam 60–90 detik terakhir, bukan hanya status login statis.
- Manajemen pengguna di `/admin/users`: Pencarian, filter status (pending/active/suspended), pagination, serta tombol aksi Approve/Reject/Suspend.

### R6. Transaksi Keuangan Atomik & Sinkronisasi Saldo (Section I)
- Setiap transaksi (pemasukan, pengeluaran, transfer) yang disimpan dari UI atau bot langsung mengeksekusi mutasi saldo wallet terkait secara atomik.
- Mendukung `idempotency_key` untuk mencegah pencatatan transaksi ganda.
- Mengubah atau menghapus transaksi langsung membatalkan efek saldo sebelumnya dan memperbarui saldo aktual, laporan, kalender, dan budget harian secara konsisten.

### R7. Tata AI Bot Asisten Finansial (Section J)
- Tata AI memahami bahasa alami Indonesia untuk pemasukan ("Gajian 5 juta"), pengeluaran ("Beli makan siang 25 ribu"), dan tanggal transaksi.
- Meminta klarifikasi secara proaktif jika nominal atau konteks transaksi ambigu (contoh: "Tadi bayar 50").
- Transaksi yang dicatat oleh Tata AI disimpan melalui service transaksi yang sama persis dengan form web UI, sehingga saldo dan budget langsung terupdate.

### R8. Manajemen Multi-Wallet (Section K)
- Pengguna dapat membuat, mengedit, dan mengarsipkan dompet (Bank BCA, Mandiri, BRI, BNI, GoPay, OVO, Dana, Cash Tunai).
- Setiap dompet terisolasi ketat berdasarkan `user_id`.
- Terdapat penanda dompet default untuk integrasi Telegram Bot.

### R9. Budget Harian & Kalender Keuangan Interaktif (Section L)
- Budgeting multi-periode (Harian, Mingguan, Bulanan) berbasis zona waktu resmi **Asia/Jakarta (WIB)**.
- Kalender di `/dashboard/kalender` menampilkan ringkasan arus kas per tanggal dan modal drawer rincian transaksi saat tanggal diklik.

### R10. Ekspor & Download Laporan Keuangan Nyata (Section M)
- Modul export di `/api/reports/export` menghasilkan berkas nyata yang dapat diunduh (format CSV dan XLSX/PDF).
- Proteksi terhadap **CSV Formula Injection** (sanitasi karakter awal `=`, `+`, `-`, `@`).
- Format nominal standar Rupiah (IDR) dan tanggal Indonesia. Dilarang menggunakan dataset statis/mock.

### R11. Panel Pengaturan & Profil Akun (Section N)
- Pengguna dapat memperbarui profil (nama, avatar animasi / upload foto profil dengan validasi ukuran dan MIME type).
- Pengelolaan kategori kustom (tambah, edit, arsip) yang konsisten di seluruh modul.

### R12. Integrasi Bot Telegram Long Polling & Reminder (Section O)
- Mempertahankan dan menyempurnakan mode Long Polling untuk token bot `@danaanananabot` (`8607603301:AAHTbWxJY8v4GoGDHXlS0Szge-NsBGpUQ7g`).
- Pengaitan akun aman via deep-link token sekali pakai.
- Fitur reminder harian terjadwal (WIB) dengan deduplikasi pesan dan exponential backoff.

### R13. Sistem Entitlement Pro & Pembayaran (Section P)
- Tingkatan pengguna: Starter (limit 50 transaksi/bulan) vs Pro (transaksi tanpa batas).
- Admin otomatis mendapatkan akses Pro Lifetime.
- Paket langganan: Pro 1 bulan (Rp19.000), Pro 1 tahun (Rp149.000), Pro Lifetime (Rp399.000).
- Alur invoice unik dengan status pembayaran (`pending_payment`, `paid`, `failed`, `expired`, `cancelled`) dan konfirmasi admin.

### R14. Konsistensi Tema Visual Luxury (Section Q & R)
- Seluruh antarmuka menerapkan tema **Luxury Obsidian Black & Deep Emerald Green** (`#06090e`, aksen `#10b981`, panel `#080d14`, border `#064e3b`).

## Acceptance Criteria

### Technical & Functional Guardrails
- [ ] Endpoint `/api/auth/register` memvalidasi input, menormalisasi email (lowercase) dan nomor telepon (E.164), memverifikasi keunikan identitas, melakukan hashing password yang aman, dan menyimpan akun berstatus `pending_approval`.
- [ ] Endpoint `/api/auth/login` memvalidasi kredensial pengguna biasa dan memblokir akun yang belum disetujui (`pending_approval` / `rejected`) dengan pesan yang aman.
- [ ] Halaman terpisah `/admin/login` dan endpoint `/api/auth/admin-login` secara ketat hanya mengizinkan admin dengan email `wildanakmalfathan@gmail.com` dan password terenkripsi.
- [ ] Seluruh endpoint `/api/admin/*` dan route `/admin/*` menolak akses pengguna biasa atau unauthenticated dengan HTTP 403 Forbidden.
- [ ] Admin panel memiliki fitur Approve dan Reject pendaftaran baru yang secara instan memperbarui status akun di database dan mencatat audit log.
- [ ] Sistem notifikasi WhatsApp admin terhubung ke `081460932853` dengan status konfigurasi yang jujur (aktif / panduan setup jika kredensial belum diisi).
- [ ] Heartbeat endpoint `/api/auth/heartbeat` mencatat `last_seen_at` dan dashboard admin menampilkan jumlah pengguna aktif (heartbeat dalam 60-90 detik terakhir).
- [ ] Semua transaksi keuangan tersimpan dalam ledger database persisten dengan tipe data numeric/integer rupiah dan mengupdate saldo wallet secara atomik tanpa error floating-point.
- [ ] Fitur Tata AI Bot memproses pemasukan dan pengeluaran natural Indonesia serta menggunakan ledger transaksi yang sama dengan UI.
- [ ] Fitur export menghasilkan file CSV dan Excel/PDF nyata yang dapat diunduh dengan sanitasi formula injection.
- [ ] Bot Telegram tetap berjalan lancar dalam mode Long Polling dan terhubung dengan dompet default serta evaluasi budget WIB.
- [ ] Seluruh suite pengujian otomatis di `scripts/verify-all.mjs` diperbarui dan lulus 100% (semua unit, boundary, security, dan e2e tests passed).

## 2026-10-17T05:43:02Z

Lanjutkan pengerjaan proyek TataDana Master Implementation (Fase 2 Milestone 1: Core Backend, Persistent DB & Auth Engine, dilanjutkan ke M2, M3, M4 hingga seluruh target R1-R15 tercapai 100%). Periksa status subagent Anda dan lanjutkan eksekusi secara penuh.

## 2026-10-17T10:30:08Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Phase 2 — Critical Admin Access Control Fix & Zero-Trust Server-Side Role Enforcement
> Requested team: Kerjakan dengan 5 orang team (Use a team of 5 agents)

Perbaikan menyeluruh dan pengamanan tingkat tinggi terhadap celah fatal otorisasi administrator pada aplikasi TataDana: Menegakkan model keamanan Zero-Trust (Default-Deny) di sisi server untuk seluruh route halaman `/admin/*` dan endpoint API `/api/admin/*`, menghapus celah header spoofing (`x-admin-role`), menerapkan Next.js Edge Middleware untuk proteksi route server-side, memvalidasi sesi kriptografis berbasis token dan database persisten, membatasi hak istimewa administrator secara eksklusif hanya untuk `wildanakmalfathan@gmail.com`, serta menyembunyikan seluruh tombol, tautan, dan elemen UI administratif dari pengguna biasa.

Working directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana
Integrity mode: development

## Requirements

### R1. Proteksi Server-Side Middleware & Default-Deny Route Guard (`middleware.ts`)
- Menerapkan `middleware.ts` pada root proyek Next.js untuk mencegat seluruh permintaan route `/admin/*` (kecuali `/admin/login`).
- Membaca session cookie (`tatadana_admin_session` / `tatadana_session`) dan memverifikasi tanda tangan kriptografis token secara langsung di server.
- Pengguna yang tidak terautentikasi atau pengguna biasa ber-role `user` yang mencoba mengakses URL admin apapun wajib langsung dialihkan (*redirect*) ke `/admin/login` atau `/login` dengan status HTTP 403/307.

### R2. Penghapusan Celah Header Spoofing & Validasi Otorisasi Kriptografis (`lib/auth/admin-guard.ts`)
- Menghapus celah keamanan di `lib/auth/admin-guard.ts` yang sebelumnya memercayai header client seperti `x-admin-role: admin` atau body parameter `admin_role: admin`.
- Setiap operasi administratif wajib memverifikasi token sesi kriptografis dari cookie atau header `Authorization: Bearer <token>`, mencocokkan payload token dengan data pengguna di `PersistentStore`, dan memastikan `user.role === 'admin'`, `user.email === 'wildanakmalfathan@gmail.com'`, serta `user.status === 'active'`.

### R3. Proteksi Seluruh Endpoint API Administratif (`app/api/admin/*`)
- Seluruh endpoint `/api/admin/users`, `/api/admin/payments`, `/api/admin/metrics`, `/api/admin/audit-logs`, `/api/admin/payments/approve`, dan `/api/admin/payments/reject` wajib menolak panggilan tanpa sesi admin yang valid dengan HTTP 403 Forbidden.
- Data pengguna lain dan data transaksi sensitif dilarang bocor ke respons API pengguna biasa.

### R4. Isolasi Registrasi & Penguncian Role Administrator Eksklusif
- Endpoint registrasi `/api/auth/register` secara ketat mengabaikan field role apapun dari request body dan selalu menetapkan role `user` berstatus `pending_approval`.
- Hanya akun `wildanakmalfathan@gmail.com` yang berhak menyandang role `admin` dengan status `pro_lifetime`. Kredensial akun yang sudah ada wajib dipertahankan tanpa mereset password secara diam-diam.

### R5. Pembersihan UI & Penyembunyian Seluruh Elemen Admin dari Pengguna Biasa
- Pada antarmuka pengguna (`Sidebar`, `Header`, `DashboardLayout`), tombol atau tautan menuju Admin Panel (`/admin`) hanya ditampilkan jika dan hanya jika pengguna terautentikasi memiliki role `admin` yang terverifikasi server.
- Jangan hanya menyembunyikan tombol secara visual di frontend; server wajib memblokir jika pengguna biasa mencoba mengetikkan URL admin secara manual.

### R6. Verifikasi Komprehensif Skenario A–G
- Menjalankan pengujian lengkap terhadap 7 skenario wajib (A–G):
  - A: Login user biasa
  - B: Akses URL admin langsung
  - C: Panggilan API admin langsung oleh user biasa
  - D: Manipulasi role pada request / local storage
  - E: Akses data pengguna lain
  - F: Login admin resmi
  - G: Verifikasi hak eksklusif admin
- Memastikan 100% test suite lulus tanpa merusak data persisten `data/tatadana-db.json`.

## Acceptance Criteria

### Security & Role Authorization Guardrails
- [ ] Middleware root (`middleware.ts`) aktif dan memblokir akses pengguna biasa ke seluruh route `/admin/*`.
- [ ] Header client `x-admin-role: admin` dan request body `admin_role: admin` ditolak dan tidak dapat memberikan hak akses admin.
- [ ] Seluruh endpoint `/api/admin/*` merespons HTTP 403 Forbidden untuk pengguna non-admin atau token tidak valid.
- [ ] Pengguna biasa tidak melihat tautan Admin Panel di sidebar maupun dashboard.
- [ ] Akun `wildanakmalfathan@gmail.com` tetap aktif dengan role admin dan password hash yang valid.
- [ ] Pengujian skenario A–G berhasil 100% dan seluruh 85+ test cases di `scripts/verify-all.mjs` lulus tanpa error.

## 2026-10-17T12:28:18Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Implement Real and Persistent Profile Photo Upload with Multi-Format Support, Storage Persistence, Global Layout Synchronization, and Preserved Built-in Avatars
> Requested team: Buatkan dengan 5 team kerja (Use a team of 5 agents)

Pengembangan TataDana SaaS Finansial Indonesia: Implementasi menyeluruh dan nyata fitur upload foto profil pengguna dari perangkat (komputer, laptop, galeri HP) dengan penyimpanan persisten di server/storage lokal terproteksi, validasi MIME type dan magic bytes (JPG, PNG, WebP maks 5MB), preview interaktif rasio 1:1, binding aman terisolasi per sesi user_id di database, sinkronisasi instan ke seluruh antarmuka (Sidebar, Header, Dashboard, Profil), serta mempertahankan opsi avatar emoji bawaan dengan tema Luxury Obsidian Black & Deep Emerald Green.

Working directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana
Integrity mode: development

## Requirements

### R1. Persistent Image Storage Engine & Secure Upload API (`/api/profile/avatar`)
- Implementasikan endpoint backend khusus upload foto profil (`POST /api/profile/avatar`) yang menerima multipart form data (`image` file).
- Validasi keamanan mendalam sisi server:
  - Validasi ukuran file: maksimum 5 MB.
  - Validasi tipe MIME dan file magic bytes header: hanya mengizinkan format `image/jpeg` (JPG/JPEG), `image/png` (PNG), dan `image/webp` (WebP). Tolak file non-gambar atau file rusak dengan HTTP 400 Bad Request.
- Simpan file fisik secara persisten di folder storage lokal (`public/uploads/avatars/`) dengan penamaan berkas kriptografis yang aman dan unik (`avatar-[userId]-[timestamp]-[hash].[ext]`).
- Sediakan route handler static serving / dynamic handler (`/api/uploads/avatars/[filename]` atau native `/uploads/avatars/[filename]`) dengan header `Content-Type` yang sesuai dan `Cache-Control`.
- Mekanisme self-cleaning: Jika pengguna mengunggah foto baru, berkas foto lama pengguna yang tersimpan sebelumnya dihapus secara aman dari storage setelah foto baru berhasil disimpan.
- Dukungan aksi hapus foto (`DELETE /api/profile/avatar`): menghapus foto pengguna dari storage dan mengembalikan avatar ke emoji bawaan default (`🧑‍💼`).

### R2. Database Schema & User Profile Binding (`lib/db/store.ts`, `/api/profile`)
- Perbarui `StoredUser` di `lib/db/store.ts` dan schema database agar mendukung field:
  - `avatar_url?: string | null` (menyimpan path URL foto yang diunggah atau karakter emoji).
  - `avatar_type?: 'uploaded' | 'emoji' | null` (menandai apakah pengguna menggunakan foto berkas atau emoji bawaan).
- Endpoint upload `/api/profile/avatar` wajib memverifikasi sesi dan token otorisasi pengguna secara aman (`resolveUserId` / session bearer token & cookie).
- Pengguna hanya berhak mengunggah, memperbarui, atau menghapus foto profil miliknya sendiri. Dilarang memercayai `userId` dari request body client tanpa verifikasi sesi.
- Jika proses upload atau penyimpanan gagal, database wajib mempertahankan foto profil lama tanpa terjadi data loss.

### R3. Interactive UI File Selection & Preview in Settings (`app/dashboard/settings/page.tsx`)
- Pada Tab "Profil Akun" (`/dashboard/settings?tab=profile`), sediakan antarmuka profesional:
  - Tombol **"Pilih Foto"**: membuka dialog file browser native perangkat via `<input type="file" accept="image/jpeg,image/png,image/webp" />`.
  - Area **Preview Foto**: menampilkan pratinjau gambar rasio 1:1 berbentuk lingkaran dengan border emerald halus sebelum diunggah.
  - Tombol aksi:
    - **"Unggah & Simpan Foto"**: melakukan upload ke backend dengan status visual *loading state* (spinner) dan menonaktifkan tombol selama proses berjalan.
    - **"Ganti Foto"**: memungkinkan memilih berkas baru saat sudah memiliki foto.
    - **"Hapus Foto"**: menghapus foto kustom dan kembali ke avatar emoji.
    - **"Batal"**: membatalkan pemilihan berkas dan mengembalikan tampilan ke foto/avatar aktif tanpa merusak profil yang tersimpan.
  - Notifikasi feedback visual (toast/banner hijau sukses, merah error) tanpa mengandalkan `window.alert`.

### R4. Global Avatar Synchronization Across Layouts (`Sidebar`, `Header`, `DashboardLayout`)
- Perbarui `DashboardLayout` (`app/dashboard/layout.tsx`) untuk memuat data profil (`avatar_url`, `avatar_type`) saat inisialisasi dan meneruskannya ke komponen layout.
- Perbarui `Sidebar` (`components/layout/sidebar.tsx`):
  - Kartu pengguna di bagian bawah sidebar menampilkan foto profil yang diunggah (`<img src="..." />` berbentuk lingkaran) jika `avatar_type === 'uploaded'` atau emoji jika `avatar_type === 'emoji'`.
  - Sediakan fallback graceful jika gambar gagal dimuat (`onError` fallback ke inisial nama atau default avatar).
- Perbarui `Header` (`components/layout/header.tsx`):
  - Tampilkan avatar pengguna (foto/emoji) di bar kanan header sebagai shortcut visual profil akun.
- Terapkan mekanisme cache busting (misal: query parameter `?t=[timestamp]`) dan event listener (`tatadana_profile_updated`) sehingga setelah upload berhasil di pengaturan, foto di Sidebar, Header, dan Dashboard langsung terbarui secara instan tanpa perlu refresh browser atau re-login.

### R5. Dual-Mode Avatar System (Upload Photo vs Built-in Emojis)
- Pertahankan 8 avatar emoji bawaan yang sudah ada (`['🧑‍💼', '👑', '💎', '🎩', '🦊', '🦁', '🚀', '💰']`).
- Pengguna dapat beralih secara bebas kapan saja antara menggunakan foto kustom perangkat atau memilih salah satu emoji bawaan.
- Memilih avatar emoji akan memperbarui `avatar_type: 'emoji'` dan `avatar_url: emo`, tersimpan secara persisten ke database via `PATCH /api/profile`.

### R6. Comprehensive E2E Verification Suite (`tests/e2e/profile-avatar.test.mjs`)
- Buat test suite E2E komprehensif menguji 15 skenario:
  1. Upload foto JPG valid (persisten di disk & DB).
  2. Upload foto PNG valid.
  3. Upload foto WebP valid.
  4. Penolakan file non-gambar (e.g. text/pdf/executable).
  5. Penolakan file gambar palsu (ekstensi .jpg tetapi header bukan image magic bytes).
  6. Penolakan file melebihi batas 5 MB (HTTP 413 / 400).
  7. Verifikasi persistensi foto setelah reload dan re-fetch profile.
  8. Verifikasi proteksi otorisasi: unauthenticated upload ditolak (HTTP 401).
  9. Verifikasi isolasi antar pengguna: user A tidak dapat mengubah foto user B.
  10. Verifikasi penghapusan foto lama saat foto baru diunggah (no file clutter).
  11. Verifikasi aksi DELETE foto mengembalikan profil ke avatar default.
  12. Verifikasi pemeliharaan sistem emoji bawaan (toggle emoji tetap tersimpan persisten).
  13. Verifikasi file static serving (HTTP 200 dengan Content-Type image).
  14. Verifikasi UI components (Sidebar, Settings, Header) memuat referensi foto.
  15. Integrasi ke runner utama `scripts/verify-all.mjs` dengan hasil 100% lulus.

## Acceptance Criteria

### Technical & Functional Guardrails
- [ ] Endpoint `POST /api/profile/avatar` berhasil menerima upload file gambar (JPG, PNG, WebP) dan menyimpannya ke storage persisten.
- [ ] Endpoint upload menolak file non-gambar, magic byte palsu, atau file >5MB dengan pesan error yang jelas dan status HTTP 400/413.
- [ ] Database `data/tatadana-db.json` menyimpan `avatar_url` dan `avatar_type` secara persisten pada user record terkait.
- [ ] Halaman `/dashboard/settings?tab=profile` memiliki fitur "Pilih Foto", preview lingkaran 1:1, "Unggah & Simpan Foto", "Ganti Foto", "Hapus Foto", serta animasi loading dan notifikasi.
- [ ] Seluruh layout aplikasi (`Sidebar`, `Header`) menampilkan foto profil yang diunggah secara instan setelah disimpan dan bertahan setelah page reload atau relogin.
- [ ] Pilihan 8 avatar emoji bawaan tetap utuh dan dapat digunakan bergantian dengan foto upload.
- [ ] Pengguna tidak dapat memodifikasi foto pengguna lain; upload tanpa session token ditolak HTTP 401.
- [ ] Suite pengujian `tests/e2e/profile-avatar.test.mjs` terintegrasi di `scripts/verify-all.mjs` dan seluruh 105+ test cases lulus 100% tanpa error.


## 2026-10-17T16:59:31Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Master Restoration & System Perfection — Pemulihan Total UI/UX Mewah Obsidian Black & Deep Emerald, Sinkronisasi Seluruh Modul, Eliminasi Bug, dan Integrasi Penuh TataDana
> Requested team: Buatkan dengan 5 orang team kerja (Use a team of 5 agents)

Pengembangan dan penyempurnaan menyeluruh TataDana SaaS Finansial Indonesia: Memulihkan keindahan tampilan UI/UX Luxury Obsidian Black & Deep Emerald Green pada seluruh modul aplikasi web (Dashboard Beranda, Riwayat Transaksi, Multi-Wallet, Kalender, Budgeting Multi-Periode, Laporan, Tata AI Bot, dan Pengaturan), menghubungkan seluruh sistem keuangan agar tersinkronisasi secara real-time dan bebas dari bug/debug, memperbaiki integritas saldo dan ledger transaksi persisten pada akun pengguna, memastikan grafik Donut, Bar Chart 6 Bulan, dan Kalender menyajikan visualisasi data yang kaya dan hidup, serta menjaga bot Telegram Long-Polling aktif merespons transaksi.

Working directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana
Integrity mode: development

## Requirements

### R1. Pemulihan Total Estetika Visual & Interaktivitas UI/UX (Luxury Obsidian & Emerald)
- Kembalikan seluruh elemen UI/UX yang sebelumnya hilang atau kosong agar tampil memukau, mewah, dan hidup:
  - 4 Kartu Metrik Utama (Saldo Total, Pemasukan Bulan Ini, Pengeluaran Bulan Ini, Budget Tersisa dengan progress bar dinamis).
  - Donut Chart Pengeluaran per Kategori yang berwarna-warni dan proporsional.
  - Bar Chart 6 Bulan Perbandingan Arus Kas (Pemasukan hijau emerald & Pengeluaran merah cerah).
  - Garis Tren Pengeluaran Harian yang mulus dan interaktif.
  - Daftar Transaksi Terkini lengkap dengan ikon kategori, badge tipe, tanggal, waktu WIB, dan indikator struk belanja.
- Pastikan seluruh halaman (`/dashboard`, `/dashboard/transaksi`, `/dashboard/wallet`, `/dashboard/kalender`, `/dashboard/budget`, `/dashboard/laporan`, `/dashboard/tata-ai`, `/dashboard/settings`) tampil utuh tanpa ada layout yang rusak atau elemen debug yang tertinggal.

### R2. Integritas Saldo Dompet & Sinkronisasi Ledger Transaksi Nyata
- Pulihkan dan perbaiki data keuangan pada akun pengguna aktif (`wildan fathan` / `wildanoces123@gmail.com` dan Superadmin `wildanakmalfathan@gmail.com`) di `data/tatadana-db.json`:
  - Perbaiki saldo dompet negatif (hilangkan anomali -Rp80.000 menjadi saldo positif yang sehat, e.g. BCA Utama Rp8.500.000, Cash Dompet Rp450.000, GoPay Rp1.500.000 = Total Saldo Rp10.450.000).
  - Sediakan riwayat transaksi nyata yang selaras dengan saldo dompet (Single Source of Truth): Gaji Pokok, Belanja Bulanan Supermarket, Makan Siang, Tagihan Listrik PLN & Wi-Fi, Servis Motor, dan Pulsa Data.
  - Pastikan setiap mutasi baru (via Web UI, Tata AI, atau Telegram Bot) mendebit/mengkredit saldo dompet secara atomik tanpa selisih atau floating-point error.

### R3. Visualisasi Kalender Keuangan & Drawer Detail Transaksi Interaktif
- Halaman Kalender (`/dashboard/kalender`) menampilkan kalender bulan berjalan dengan badge arus kas harian nyata (pemasukan hijau, pengeluaran merah).
- Mengklik tanggal pada kalender membuka drawer/modal rincian transaksi harian yang terjadi pada tanggal tersebut (nominal, jam, kategori, dompet, catatan).
- Filter per dompet (Semua, BCA Utama, Cash Dompet, GoPay) secara instan memperbarui angka-angka di grid kalender.

### R4. Sistem Budgeting Multi-Periode (Harian, Mingguan, Bulanan) & Alert Threshold
- Pada `/dashboard/budget`, sediakan batas anggaran nyata untuk kategori utama (Makanan & Minuman, Transportasi, Tagihan, Belanja Bulanan, Hiburan).
- Status budget terhitung otomatis: Aman (<80% hijau), Peringatan (80-99% amber), dan Overbudget (≥100% merah).
- Integrasi ke notifikasi Telegram jika pengeluaran menyentuh ambang batas.

### R5. Integrasi Tata AI Bot & Telegram Bot Polling-First Real-Time
- Modul Tata AI Bot (`/dashboard/tata-ai` dan Floating Widget) memahami konteks finansial pengguna terkini (saldo total, pemasukan, pengeluaran terbesar) dan memberikan saran alokasi 50/30/20 yang solutif.
- Bot Telegram Long-Polling (`@danaanananabot`) terus mendengarkan dan merespons chat transaksi teks, struk OCR, voice note, dan perintah `/saldo`, `/budget`, `/hari_ini`.

### R6. Eliminasi Bug, Kestabilan Sistem & Verifikasi Komprehensif
- Pastikan tidak ada bug, error JavaScript console, broken links, atau kegagalan request API di seluruh aplikasi.
- Seluruh endpoint API (`/api/wallets`, `/api/transactions`, `/api/transactions/calendar`, `/api/budgets`, `/api/ai/chat`, `/api/profile`, `/api/telegram/poll`) merespons dengan HTTP 200 OK.
- Jalankan master verification runner dan pastikan 100% test cases lulus.

## Acceptance Criteria

### Visual & Functional Acceptance
- [ ] Halaman `/dashboard` menampilkan ringkasan keuangan lengkap dengan Saldo Total, Pemasukan, Pengeluaran, Donut Chart Kategori, Bar Chart 6 Bulan, Tren Harian, dan Transaksi Terkini.
- [ ] Halaman `/dashboard/transaksi` menampilkan tabel/daftar transaksi yang kaya dengan filter dompet, filter tipe, pencarian, dan modal tambah transaksi.
- [ ] Halaman `/dashboard/wallet` menampilkan kartu dompet aktif (BCA Utama, Cash Dompet, GoPay) dengan saldo positif dan toggle default.
- [ ] Halaman `/dashboard/kalender` menampilkan grid kalender dengan badge pemasukan/pengeluaran dan drawer rincian saat tanggal diklik.
- [ ] Halaman `/dashboard/budget` menampilkan progress bar pengeluaran untuk periode Harian, Mingguan, dan Bulanan.
- [ ] Tata AI Bot dan Telegram Bot terhubung dengan saldo pengguna dan merespons interaksi tanpa hambatan.
- [ ] Tidak ada error console, tidak ada data rusak/debug, dan seluruh suite pengujian otomatis lulus 100%.


## 2026-10-17T19:27:14Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Vercel Hosting & Supabase Database Migration with Zero Feature Breakage
> Requested team: Gunakan 5 Agent sekaligus dan periksa kembali sebelum dikirim ke saya!

Migrasi sistem penyimpanan TataDana dari file lokal (`data/tatadana-db.json`) ke database cloud Supabase PostgreSQL, konfigurasi penyimpanan aset foto profil ke Supabase Storage, penyesuaian endpoint agar kompatibel penuh dengan lingkungan serverless Vercel, serta verifikasi kelulusan build produksi (`next build`) tanpa mengubah atau mengurangi fitur aplikasi yang sudah ada.

Working directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana
Integrity mode: development

## Requirements

### R1. Supabase Cloud Database Integration & Full Persistence
- Ubah seluruh alur penulisan (write) dan pembacaan (read) data keuangan pada `lib/db/store.ts` dan service terkait agar tersimpan secara persisten ke tabel Supabase PostgreSQL (`users`, `wallets`, `categories`, `transactions`, `budgets`, `audit_logs`, `payment_transactions`).
- Gunakan Supabase Client dengan Service Role Key (`lib/supabase/admin.ts`) untuk operasi backend/API agar bypass RLS policies secara aman di sisi server.
- Pastikan semua query, mutasi atomik debit/kredit saldo, rekonsiliasi Single Source of Truth (SSoT), dan relasi foreign key berjalan sempurna di Supabase.
- Sediakan fallback graceful atau migrasi otomatis data yang sudah ada di lokal ke tabel Supabase jika database baru diinisialisasi.

### R2. Penanganan Media & Avatar Upload di Serverless (Supabase Storage)
- Sesuaikan endpoint upload foto profil (`/api/profile/avatar`) agar menyimpan file ke Supabase Storage Bucket (atau fallback data URI terproteksi) menggantikan penulisan ke disk lokal `public/uploads/` yang bersifat read-only di Vercel.
- Pertahankan seluruh validasi keamanan: batas ukuran 5MB, pengecekan MIME type dan magic bytes (JPG, PNG, WebP), self-cleaning file lama, serta sinkronisasi instan ke UI.

### R3. Kompatibilitas Lingkungan Serverless Vercel & Penyesuaian Endpoint
- Sesuaikan konfigurasi Next.js (`next.config.mjs` / `next.config.js`) dan header caching agar berjalan mulus di Vercel Edge / Serverless functions.
- Pastikan route handler Telegram (`/api/telegram/webhook` dan `/api/telegram/poll`) mendukung deployment serverless tanpa dependensi pada background process lokal yang tak terbatas.
- Pastikan berkas `.env.example` memuat seluruh variabel environment yang wajib diatur di Vercel Dashboard (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `DATA_ENCRYPTION_KEY`, dll.).

### R4. Preservasi 100% Fitur Website & Desain UI/UX
- Dilarang keras mengubah, menghapus, atau mengurangi fitur website yang sudah bekerja:
  - Tampilan visual Luxury Obsidian Black & Deep Emerald Green (`#06090e`, `#0a0f16`, `#10b981`).
  - 4 Kartu Metrik Finansial, Donut Chart Kategori, Bar Chart 6 Bulan, Tren Harian, dan Riwayat Transaksi.
  - Kalender Finansial dengan drawer rincian tanggal dan filter multi-wallet.
  - Sistem Budgeting Multi-Periode (Harian, Mingguan, Bulanan) dengan ambang batas alert.
  - Tata AI Bot Financial Advisor dengan context ledger real-time.
  - Dual Portal Auth (`/login` & `/admin/login`) dengan penguncian Zero-Trust ke `wildanakmalfathan@gmail.com`.
  - Sistem Clean Initial State untuk pengguna baru (Rp0, 0 wallet, 0 tx).

### R5. Verifikasi Build Produksi & Uji Kestabilan Menyeluruh
- Verifikasi bahwa perintah `next build` berhasil 100% tanpa error TypeScript (`tsc --noEmit`), tanpa error bundling, dan tanpa lint failure.
- Verifikasi bahwa seluruh test cases (`scripts/verify-all.mjs`) tetap lulus 100% dengan koneksi database aktif.

## Acceptance Criteria

### Technical & Functional Guardrails
- [ ] Operasi create, update, dan delete transaksi, wallet, budget, dan profil menulis langsung ke database Supabase PostgreSQL.
- [ ] Foto profil yang diunggah tersimpan persisten di cloud storage dan tampil di Header, Sidebar, dan Settings tanpa error filesystem lokal.
- [ ] Perintah `npm run build` / `next build` selesai dengan exit code 0 dan output build siap dideploy ke Vercel.
- [ ] Seluruh halaman web (`/`, `/login`, `/admin/login`, `/dashboard`, `/dashboard/kalender`, `/dashboard/budget`, `/dashboard/tata-ai`, `/dashboard/wallet`, `/dashboard/transaksi`, `/dashboard/laporan`, `/dashboard/settings`) merespons HTTP 200 OK.
- [ ] Tidak ada fitur atau styling UI/UX yang hilang atau rusak.
- [ ] Dokumentasi panduan deployment Vercel dan file `.env.example` lengkap tersedia.
