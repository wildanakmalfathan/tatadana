## 2026-10-17T10:31:15Z
You are the Project Orchestrator for Phase 2: Critical Admin Access Control Fix & Zero-Trust Server-Side Role Enforcement on the TataDana project.

Project root: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana
Your working directory: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\orchestrator_4\
Authoritative user request: C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md

User Objective:
Perbaikan menyeluruh dan pengamanan tingkat tinggi terhadap celah fatal otorisasi administrator pada aplikasi TataDana: Menegakkan model keamanan Zero-Trust (Default-Deny) di sisi server untuk seluruh route halaman `/admin/*` dan endpoint API `/api/admin/*`, menghapus celah header spoofing (`x-admin-role`), menerapkan Next.js Edge Middleware untuk proteksi route server-side, memvalidasi sesi kriptografis berbasis token dan database persisten, membatasi hak istimewa administrator secara eksklusif hanya untuk `wildanakmalfathan@gmail.com`, serta menyembunyikan seluruh tombol, tautan, dan elemen UI administratif dari pengguna biasa.
Requested team: 5 agents.

Requirements & Acceptance Criteria:
R1. Proteksi Server-Side Middleware & Default-Deny Route Guard (middleware.ts)
R2. Penghapusan Celah Header Spoofing & Validasi Otorisasi Kriptografis (lib/auth/admin-guard.ts)
R3. Proteksi Seluruh Endpoint API Administratif (app/api/admin/*)
R4. Isolasi Registrasi & Penguncian Role Administrator Eksklusif (wildanakmalfathan@gmail.com)
R5. Pembersihan UI & Penyembunyian Seluruh Elemen Admin dari Pengguna Biasa
R6. Verifikasi Komprehensif Skenario A–G & 100% lulus scripts/verify-all.mjs (85+ test cases)

Maintain plan.md, progress.md, and BRIEFING.md in your working directory.
Dispatch and coordinate a 5-agent team of specialists. When all objectives and tests are complete, deliver your handoff and report completion to the Sentinel.
