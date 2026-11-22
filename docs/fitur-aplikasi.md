# Dokumentasi Fitur & Arsitektur Kode — Garage Rental Management System

Dokumen ini menjelaskan secara terstruktur seluruh **fitur aplikasi**, **arsitektur kode program**, **daftar endpoint REST API**, serta **aturan bisnis** yang diimplementasikan pada **Garage Rental Management System** dalam bahasa Indonesia sebagai bahan presentasi dan laporan Uji Kompetensi Pemrogram.

---

## 1. Arsitektur Kode Program

Aplikasi menerapkan kombinasi **Pemrograman Terstruktur** (modul utilitas murni untuk perhitungan tanggal, biaya, kompatibilitas, dan validasi) serta **Pemrograman Berorientasi Objek (OOP)** pada entitas domain, layanan bisnis, repository, dan controller dengan pemisahan tanggung jawab berlapis:

```text
Browser (HTML5 + CSS3 + Vanilla JS / Fetch API)
   │
   ▼
Express Router (src/routes/api.js)
   │  └─ Middleware Keamanan (src/middleware/auth.js & common.js: JWT HttpOnly, RBAC, sameOriginGuard, Multer + Magic Bytes)
   ▼
Controllers (src/controllers/controllers.js) → Mengelola HTTP request & response JSON
   │
   ▼
Services (src/services/)                     → Aturan bisnis, kalkulasi harga/tanggal, validasi domain
   │  ├─ Domain Entities OOP (src/models/entities.js: User, Tenant, Admin, GarageTypeConfig, GarageSequence, Garage, Vehicle, Rental, RentalExtension)
   │  └─ Pure Utilities (src/utils/: constants.js, rentalMath.js, validators.js)
   ▼
Repositories (src/repositories/)             → Query SQL terparameter & transaksi SQLite IMMEDIATE
   │
   ▼
SQLite Database (src/database/db.js)         → 8 tabel relasional sesuai ERD dengan PRAGMA foreign_keys = ON
```

---

## 2. Daftar Fitur Aplikasi

### A. Autentikasi & Registrasi Penyewa

1. **Registrasi Penyewa** (`/tenant/register.html` → `POST /api/auth/register`)
   - Input wajib: NIK (16 digit angka unik), Nama Lengkap, Nomor Telepon, Email unik (sebagai username), dan Password (minimal 6 karakter).
   - Password di-hash satu arah menggunakan `bcryptjs` (salt rounds = 10) sebelum disimpan.
   - Status awal pendaftar selalu `PENDING`.
   - Tidak ada fitur registrasi Admin; akun Admin dibuat melalui seeder (`npm run db:seed`).
2. **Login & Logout** (`/index.html` → `POST /api/auth/login`, `POST /api/auth/logout`)
   - Mendukung login Admin dan Penyewa menggunakan email dan password.
   - Token JWT disimpan pada cookie `HttpOnly` (`SameSite=Lax`) sehingga aman dari akses JavaScript lintas skrip.
   - Sistem mengarahkan pengguna otomatis ke Dashboard Admin (`/admin/dashboard.html`) atau Dashboard Penyewa (`/tenant/dashboard.html`).
3. **Otorisasi Berbasis Role & Status Verifikasi**
   - Setiap endpoint backend dilindungi middleware `authenticate`, `requireRole(...)`, dan `requireApprovedTenant`.
   - Penyewa berstatus `PENDING` atau `REJECTED` diblokir oleh backend (`403 Forbidden`) apabila mencoba membuat penyewaan garasi.

---

### B. Fitur Admin

1. **Dashboard Admin** (`/admin/dashboard.html`)
   - Menampilkan metrik aktual dari database: Total Garasi (`AVAILABLE` & `USED`), jumlah pendaftar `PENDING`/`APPROVED`/`REJECTED`, jumlah sewa aktif hari ini, dan total pendapatan (sewa + perpanjangan).
   - Menampilkan tabel daftar garasi yang sedang disewa pada hari ini beserta tombol **Detail** transaksi.
2. **Manajemen Garasi Massal & Generator ID Otomatis** (`/admin/garages.html` → `POST /api/garages/batch`, `GET /api/garages`)
   - Admin dapat membuat garasi secara berkelompok dengan mengisi: Tipe Garasi (`BIKE`, `CAR`, `EV` pada tabel `garage_types`), Jumlah Garasi (maksimal 999 unit per tipe), Harga Sewa Harian (`garage_types.daily_rate`), dan Harga Pengisian Listrik per kWh (`garage_types.er_per_kwh`, khusus `EV`).
   - Format ID garasi otomatis per tipe:
     - **Garasi Sepeda (`BIKE`)**: `S001`, `S002`, …, `S999`
     - **Garasi Mobil (`CAR`)**: `C001`, `C002`, …, `C999`
     - **Garasi Mobil Listrik (`EV`)**: `E001`, `E002`, …, `E999`
   - Proses pembuatan massal berjalan dalam transaksi SQLite `BEGIN IMMEDIATE` yang memperbarui `garage_types`, menaikkan `garage_sequences.last_num`, dan menyisipkan unit baru ke `garages` sehingga ID dijamin berurutan, independen per tipe, dan bebas duplikasi.
   - Status setiap garasi (`AVAILABLE` / `USED`) disinkronkan secara otomatis terhadap tanggal hari ini (`Asia/Jakarta`) dan data penyewaan aktif.
3. **Verifikasi Pendaftaran Penyewa** (`/admin/tenants.html` → `GET /api/admin/tenants`, `PATCH /api/admin/tenants/:userId/verify`)
   - Menampilkan daftar pendaftar lengkap dengan NIK, nama lengkap, email, nomor telepon, tanggal daftar, dan badge status (`PENDING`, `APPROVED`, `REJECTED`).
   - Admin dapat memfilter berdasarkan status atau mencari berdasarkan nama/NIK/email, lalu klik **Terima** (`APPROVED`) atau **Tolak** (`REJECTED`) melalui dialog konfirmasi.
4. **Perpanjangan Sewa Garasi (Khusus Admin)** (`/admin/extensions.html` → `GET /api/rentals/active`, `POST /api/rentals/:id/extend/preview`, `POST /api/rentals/:id/extend`)
   - Menampilkan daftar garasi yang sedang aktif disewa pada hari ini (`Asia/Jakarta`).
   - Admin memilih garasi untuk melihat detail penyewa, kendaraan, tanggal mulai, tanggal selesai saat ini, dan histori perpanjangan sebelumnya.
   - Admin menentukan tanggal selesai baru (tanpa batas 1 bulan; harus lebih besar dari tanggal selesai sebelumnya).
   - Sistem menghitung tambahan hari dan biaya perpanjangan secara otomatis di backend melalui `calculateExtensionFee()`:
     - Dimulai 1 hari setelah `previous_end_date` sampai `new_end_date` secara inklusif.
     - Setiap blok 1 bulan menggunakan jumlah hari pada bulan kalender saat blok dimulai dan dikenakan tarif `25 × harga sewa harian`.
     - Sisa hari di luar blok bulanan dikenakan tarif `jumlah sisa hari × harga sewa harian`.
   - Admin wajib mengunggah gambar bukti pembayaran perpanjangan (JPEG/PNG/WEBP, maks 5 MB).
   - Sistem menyimpan riwayat perpanjangan pada tabel `rental_extensions` (menyimpan `previous_end_date`, `new_end_date`, `additional_duration_days`, `extension_fee`, `admin_id`, dan `payment_proof`) serta memperbarui `rentals.end_date` dalam satu transaksi atomik.
5. **Laporan Penyewaan Admin** (`/admin/reports.html` → `GET /api/reports/*`)
   - Seluruh angka diambil langsung dari agregasi SQLite (bukan data dummy) dengan 4 mode tampilan:
     1. **Per Bulan pada Tahun Tertentu** (`GET /api/reports/monthly?year=YYYY`)
     2. **Per Hari pada Bulan Tertentu** (`GET /api/reports/daily?year=YYYY&month=M`)
     3. **Per Tipe Garasi** (`GET /api/reports/by-garage-type`)
     4. **Per Penyewa** (`GET /api/reports/by-tenant`)
   - Setiap laporan menampilkan: Jumlah Transaksi (sewa + perpanjangan), Jumlah Garasi Digunakan (unik), Pendapatan Penyewaan, Pendapatan Perpanjangan, dan Total Pendapatan.

---

### C. Fitur Penyewa (Tenant)

1. **Dashboard Penyewa** (`/tenant/dashboard.html`)
   - Menampilkan status verifikasi akun (`PENDING`, `APPROVED`, atau `REJECTED`), jumlah garasi aktif yang sedang disewa, total transaksi, total pengeluaran, dan daftar transaksi terbaru.
2. **Sewa Garasi Baru (Khusus Penyewa `APPROVED`)** (`/tenant/new-rental.html` → `GET /api/rentals/config`, `GET /api/garages/available`, `POST /api/rentals/preview`, `POST /api/rentals`)
   - **Detail Kendaraan**: memilih tipe kendaraan (`Sepeda`, `Sepeda Motor`, `Mobil`, `Mobil Listrik`), merek, model, nomor plat (tidak diperlukan khusus `Sepeda`), dan kapasitas baterai kWh (khusus `Mobil Listrik`).
   - **Kompatibilitas Otomatis & Validasi Backend**:
     - Sepeda & Sepeda Motor → hanya **Garasi Sepeda**
     - Mobil → hanya **Garasi Mobil**
     - Mobil Listrik → **Garasi Mobil** atau **Garasi Mobil Listrik**
   - **Tanggal & Durasi (Asia/Jakarta)**:
     - Penyewa dapat memilih **Tanggal Mulai Sewa** (minimal tanggal hari ini pada zona `Asia/Jakarta` atau tanggal mendatang; tanggal lampau ditolak oleh backend).
     - Durasi sewa **Bulanan** otomatis sejumlah hari kalender bulan tanggal mulai yang dipilih (28 hari Feb non-kabisat, 29 hari Feb kabisat, 30 hari bulan 30-hari, 31 hari bulan 31-hari) dengan tarif `25 × tarif harian`.
     - Durasi sewa **Harian** dibatasi antara `1` sampai `jumlah hari bulan tanggal mulai - 1` dengan tarif `jumlah hari × tarif harian`.
     - Tanggal selesai dihitung secara inklusif: `Tanggal Mulai + Durasi Hari - 1 Hari`.
   - **Biaya Listrik Mobil Listrik**:
     - Jika Mobil Listrik menempati **Garasi Mobil Listrik**, wajib mengisi listrik penuh 1× transaksi dengan biaya `Kapasitas Baterai (kWh) × Tarif Listrik per kWh`.
     - Jika Mobil Listrik menempati **Garasi Mobil** biasa, biaya listrik adalah `Rp0`.
   - **Pemilihan Garasi & Anti Double-Booking**: hanya menampilkan garasi kompatibel berstatus `AVAILABLE` yang bebas jadwal bentrok, lalu diverifikasi ulang dalam transaksi SQLite `BEGIN IMMEDIATE` saat disimpan. Setelah berhasil, status garasi otomatis berubah menjadi `USED`.
   - **Bukti Pelunasan**: wajib mengunggah gambar (JPEG/PNG/WEBP, maks 5 MB) yang divalidasi tipe MIME dan signature biner (magic bytes), disimpan dengan nama unik UUID, serta hanya dapat diakses oleh Admin atau penyewa pemilik transaksi.
   - **Multi-Garasi**: satu penyewa dapat menyewa lebih dari satu garasi secara bersamaan.
3. **Riwayat Sewa & Detail Transaksi** (`/tenant/rentals.html` → `GET /api/rentals/my`, `GET /api/rentals/:id`)
   - Menampilkan seluruh riwayat penyewaan milik penyewa beserta tombol **Detail** yang memperlihatkan rincian kendaraan, biaya awal, pratinjau bukti bayar, serta seluruh histori perpanjangan oleh Admin.
4. **Profil Penyewa** (`/tenant/profile.html`)
   - Menampilkan identitas NIK, nama lengkap, email, nomor telepon, tanggal pendaftaran, dan status verifikasi KTP/NIK.

---

## 3. Ringkasan Endpoint REST API

| Method & Endpoint | Akses | Fungsi |
|---|---|---|
| `GET /api/health` | Publik | Pengecekan status kesehatan server |
| `POST /api/auth/register` | Publik | Pendaftaran penyewa baru (`PENDING`) |
| `POST /api/auth/login` | Publik | Login Admin / Penyewa (mengatur cookie HttpOnly) |
| `POST /api/auth/logout` | Publik | Logout dan menghapus cookie sesi |
| `GET /api/auth/me` | Terautentikasi | Mengambil profil pengguna aktif |
| `GET /api/admin/tenants` | Admin | Daftar pendaftar penyewa dengan filter status & pencarian |
| `PATCH /api/admin/tenants/:userId/verify` | Admin | Menyetujui (`APPROVED`) atau menolak (`REJECTED`) penyewa |
| `POST /api/garages/batch` | Admin | Pembuatan garasi massal dengan generator ID otomatis |
| `GET /api/garages` | Admin | Daftar seluruh garasi & kapasitas sequence per tipe |
| `GET /api/garages/available` | Terautentikasi | Daftar garasi kompatibel dan tersedia untuk periode pilihan |
| `GET /api/garages/:id` | Terautentikasi | Detail satu unit garasi |
| `GET /api/rentals/config` | Terautentikasi | Tanggal hari ini (`Asia/Jakarta`), batas durasi, matriks kompatibilitas |
| `POST /api/rentals/preview` | Penyewa `APPROVED` | Pratinjau tanggal selesai dan rincian biaya dari backend |
| `POST /api/rentals` | Penyewa `APPROVED` | Membuat transaksi penyewaan baru + upload bukti bayar gambar |
| `GET /api/rentals/my` | Penyewa | Riwayat penyewaan milik penyewa yang sedang login |
| `GET /api/rentals/active` | Admin | Daftar garasi yang sedang disewa pada hari ini |
| `GET /api/rentals` | Admin | Daftar seluruh transaksi penyewaan |
| `GET /api/rentals/:id` | Admin / Pemilik | Detail transaksi penyewaan beserta histori perpanjangan |
| `POST /api/rentals/:id/extend/preview` | Admin | Pratinjau tambahan hari dan biaya perpanjangan |
| `POST /api/rentals/:id/extend` | Admin | Menyimpan perpanjangan sewa + upload bukti bayar |
| `GET /api/reports/dashboard` | Admin / Penyewa | Metrik KPI dashboard sesuai role |
| `GET /api/reports/monthly` | Admin | Laporan penyewaan & pendapatan per bulan dalam tahun tertentu |
| `GET /api/reports/daily` | Admin | Laporan penyewaan & pendapatan per hari dalam bulan tertentu |
| `GET /api/reports/by-garage-type` | Admin | Laporan penyewaan & pendapatan per tipe garasi |
| `GET /api/reports/by-tenant` | Admin | Laporan penyewaan & pendapatan per penyewa |
| `GET /api/uploads/payment-proofs/:filename` | Admin / Pemilik | Akses terproteksi file gambar bukti pembayaran |
