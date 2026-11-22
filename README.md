# Garage Rental Management System

Aplikasi web manajemen penyewaan garasi kendaraan berbasis relasional yang dirancang untuk memenuhi standar **Uji Kompetensi Pemrogram (KKNI / LSP)**. Aplikasi mendukung dua peran pengguna (**Admin** dan **Penyewa/Tenant**), manajemen garasi massal dengan ID otomatis, verifikasi pendaftar berbasis NIK/KTP, aturan kompatibilitas kendaraan-garasi, perhitungan biaya sewa harian/bulanan & pengisian listrik mobil listrik, upload bukti pembayaran, perpanjangan sewa khusus Admin, serta laporan pendapatan aktual langsung dari SQLite.

---

## 1. Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Fetch API (tanpa framework frontend, tanpa build tools; desain desktop bersih 1280×720+)
- **Backend**: Node.js, Express.js (JavaScript), REST API berlapis (Routes → Controllers → Services → Repositories → Domain Models)
- **Database**: SQLite menggunakan `better-sqlite3` dengan `PRAGMA foreign_keys = ON`, Primary Key, Foreign Key, UNIQUE, CHECK constraints, Indexes, dan SQLite Transactions (`BEGIN IMMEDIATE`)
- **Testing**: Vitest (White Box Unit Testing) dan Supertest (Black Box API Testing)
- **Documentation**: JSDoc pada seluruh function, Markdown, dan PlantUML (Use Case Diagram, Class Diagram, Entity Relationship Diagram)

---

## 2. Persyaratan Instalasi

- **Node.js** versi 18 atau lebih baru (teruji pada Node.js v24.13.1)
- **npm** versi 9 atau lebih baru

---

## 3. Cara Instalasi & Menjalankan Aplikasi

### A. Instalasi Dependencies

```bash
npm install
```

### B. Konfigurasi Environment (Opsional)

Salin `.env.example` menjadi `.env` dan sesuaikan secret bila diperlukan:

```bash
copy .env.example .env
```

> **Catatan keamanan:** Jangan pernah melakukan commit file `.env` atau file database produksi (`data/*.db`) ke repository.

### C. Inisialisasi Schema Database

```bash
npm run db:init
```

Perintah ini membuat file SQLite (default `./data/garage-rental.db`), mengaktifkan foreign key enforcement, membuat 8 tabel relasional sesuai ERD (`users`, `admin`, `tenants`, `garage_types`, `garage_sequences`, `garages`, `rentals`, `rental_extensions`) beserta seluruh constraint & index, serta menginisialisasi baris awal tabel `garage_types` dan `garage_sequences`.

### D. Menjalankan Database Seeder (Akun Admin)

```bash
npm run db:seed
```

Seeder bersifat idempoten dan hanya membuat akun **Admin** default (tanpa merusak urutan ID garasi sehingga garasi pertama yang dibuat saat demo selalu dimulai dari `S001`, `C001`, dan `E001`).

### E. Menjalankan Aplikasi

Mode pengembangan (dengan auto-reload):

```bash
npm run dev
```

Mode standar:

```bash
npm start
```

Buka aplikasi di browser desktop pada alamat:

```text
http://localhost:3000
```

---

## 4. Akun Demo Admin

Akun Admin dibuat otomatis oleh `npm run db:seed` (dapat diubah melalui `.env`):

| Role | Email (Username) | Password |
|---|---|---|
| **Admin** | `admin@garagerental.com` | `Admin123!` |

*(Tidak tersedia fitur registrasi Admin sesuai spesifikasi bisnis.)*

---

## 5. Alur Penggunaan Admin

1. **Login**: Masuk di `http://localhost:3000` menggunakan akun demo Admin.
2. **Dashboard**: Melihat ringkasan jumlah garasi (`AVAILABLE`/`USED`), pendaftar menunggu verifikasi (`PENDING`), sewa aktif hari ini, total pendapatan, serta daftar garasi yang sedang disewa.
3. **Manajemen Garasi** (`/admin/garages.html`):
   - Membuat garasi secara massal dengan memilih tipe garasi (**Garasi Sepeda**, **Garasi Mobil**, **Garasi Mobil Listrik**), jumlah unit (maksimal 999 per tipe), harga sewa harian, dan tarif listrik per kWh (khusus Garasi Mobil Listrik).
   - ID garasi dibuat otomatis secara transaksional (`S001`, `C001`, `E001`, dst.).
   - Melihat daftar seluruh garasi beserta status aktual (`AVAILABLE` / `USED`).
4. **Verifikasi Penyewa** (`/admin/tenants.html`):
   - Memeriksa data pendaftar (NIK 16 digit, nama lengkap, telepon, email).
   - Menyetujui (**Terima → APPROVED**) atau menolak (**Tolak → REJECTED**) pendaftar dengan dialog konfirmasi.
5. **Perpanjangan Sewa** (`/admin/extensions.html`):
   - Memilih salah satu garasi yang sedang disewa pada hari ini (`Asia/Jakarta`).
   - Menentukan tanggal selesai baru (Admin bebas memperpanjang berapa bulan pun tanpa batas 1 bulan).
   - Sistem menghitung tambahan hari dan biaya perpanjangan secara otomatis berbasis blok bulanan kalender (`25 × tarif harian`) ditambah sisa hari (`sisa × tarif harian`).
   - Mengunggah gambar bukti pembayaran perpanjangan dan menyimpan histori perpanjangan tanpa menghapus tanggal selesai sebelumnya.
6. **Laporan** (`/admin/reports.html`):
   - Melihat laporan aktual dari database berdasarkan:
     1. Per bulan dalam tahun tertentu.
     2. Per hari dalam bulan tertentu.
     3. Per tipe garasi.
     4. Per penyewa.
   - Menampilkan jumlah transaksi, jumlah garasi digunakan, pendapatan penyewaan, pendapatan perpanjangan, dan total pendapatan.

---

## 6. Alur Penggunaan Penyewa (Tenant)

1. **Registrasi Penyewa** (`/tenant/register.html`):
   - Mendaftar dengan NIK (16 digit unik), nama lengkap, nomor telepon, email unik (username), dan password.
   - Status awal akun adalah `PENDING`.
2. **Login & Cek Status**:
   - Penyewa dapat login menggunakan email dan password untuk memantau status verifikasi pada Dashboard / Profil.
   - Penyewa berstatus `PENDING` atau `REJECTED` diblokir oleh backend (`403 Forbidden`) dan frontend untuk membuat penyewaan hingga disetujui Admin (`APPROVED`).
3. **Sewa Garasi Baru** (`/tenant/new-rental.html`, khusus `APPROVED`):
   - Memilih tipe kendaraan (`Sepeda`, `Sepeda Motor`, `Mobil`, `Mobil Listrik`), merek, model, nomor plat (kecuali Sepeda), dan kapasitas baterai dalam kWh (khusus Mobil Listrik).
   - Memilih tipe sewa **Harian** (`1` s/d `jumlah hari bulan ini - 1`) atau **Bulanan** (otomatis sejumlah hari kalender pada bulan mulai, tarif `25 × tarif harian`).
   - Memilih tanggal mulai sewa (minimal hari ini pada zona `Asia/Jakarta` atau tanggal mendatang); tanggal selesai dihitung otomatis secara inklusif (`Tanggal Mulai + Durasi - 1`) dan batas durasi harian/bulanan otomatis mengikuti bulan kalender tanggal mulai yang dipilih.
   - Hanya garasi yang kompatibel dan tersedia (`AVAILABLE` tanpa jadwal bertabrakan) yang ditampilkan.
   - Mobil listrik di Garasi Mobil Listrik dikenakan biaya pengisian listrik penuh 1× (`Kapasitas Baterai × Tarif/kWh`); di Garasi Mobil biasa tidak dikenakan biaya listrik.
   - Mengunggah gambar bukti pelunasan (JPEG/PNG/WEBP, maks 5 MB). Setelah disimpan, status garasi otomatis berubah menjadi `USED`.
   - Penyewa dapat menyewa lebih dari satu garasi secara bersamaan.
4. **Riwayat Sewa & Detail Transaksi** (`/tenant/rentals.html`):
   - Melihat seluruh riwayat penyewaan, status (`ACTIVE`/`COMPLETED`), rincian biaya, bukti bayar, serta histori perpanjangan yang diproses Admin.
5. **Profil** (`/tenant/profile.html`):
   - Melihat informasi identitas akun dan status verifikasi KTP/NIK.

---

## 7. Menjalankan Unit Testing, API Testing, UI Testing & Code Coverage

```bash
npm test
```

Untuk menjalankan pengujian beserta pengukuran **code coverage** (`@vitest/coverage-v8`):

```bash
npm run test:coverage
```

Detail lengkap skenario White Box, Black Box stateless, UI JSDOM, dan laporan coverage tersedia di [docs/testing.md](docs/testing.md). Log proses debugging (Unit Kompetensi `J.620100.025.02`) tersedia di [docs/debugging.md](docs/debugging.md).

---

## 8. Struktur Project

```text
.
├── public/                     # Frontend Desktop (HTML5, CSS3, Vanilla JS)
│   ├── index.html              # Halaman Login
│   ├── admin/
│   │   ├── dashboard.html
│   │   ├── garages.html
│   │   ├── tenants.html
│   │   ├── extensions.html
│   │   └── reports.html
│   ├── tenant/
│   │   ├── register.html
│   │   ├── dashboard.html
│   │   ├── new-rental.html
│   │   ├── rentals.html
│   │   └── profile.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── utils.js
│       ├── auth.js
│       ├── admin.js
│       ├── garage.js
│       ├── rental.js
│       └── tenant.js
├── src/                        # Backend Node.js & Express.js (20 file ringkas & terstruktur)
│   ├── app.js                  # Express composition root + Helmet CSP + sameOriginGuard
│   ├── controllers/
│   │   └── controllers.js      # AuthController, GarageController, RentalController, ReportController
│   ├── routes/
│   │   └── api.js              # Definisi tunggal seluruh endpoint REST API (/api/*)
│   ├── services/               # AuthService, GarageService, RentalService, ReportService
│   ├── repositories/           # UserRepository, GarageRepository, RentalRepository, ReportRepository
│   ├── models/
│   │   └── entities.js         # 9 Entitas OOP (User, Tenant, Admin, GarageTypeConfig, GarageSequence, Garage, Vehicle, Rental, RentalExtension)
│   ├── middleware/
│   │   ├── auth.js             # JWT HttpOnly cookie, RBAC, sameOriginGuard (CSRF)
│   │   └── common.js           # Multer image upload + magic bytes, errorHandler, notFoundHandler
│   ├── database/
│   │   ├── db.js               # Koneksi SQLite + Schema DDL 8 tabel ERD
│   │   ├── init.js             # CLI npm run db:init
│   │   └── seed.js             # CLI npm run db:seed (Admin default)
│   └── utils/
│       ├── constants.js        # Konstanta domain & hierarki AppError
│       ├── rentalMath.js       # Tanggal Asia/Jakarta, tarif, kompatibilitas, perpanjangan
│       └── validators.js       # Validasi input, magic bytes ketat, anti-traversal, formatter
├── uploads/
│   └── payment-proofs/         # Penyimpanan lokal file bukti pembayaran (nama unik UUID)
├── tests/
│   ├── unit/
│   │   └── businessLogic.test.js # White Box unit & service testing (Vitest)
│   ├── integration/
│   │   └── api.test.js           # Black Box API testing stateless (Vitest + Supertest)
│   └── frontend/
│       └── ui.test.js            # Pengujian UI/DOM Vanilla JS (Vitest + JSDOM)
├── docs/
│   ├── diagrams/
│   │   ├── use-case.puml
│   │   ├── class-diagram.puml
│   │   └── erd.puml
│   ├── fitur-aplikasi.md
│   ├── debugging.md
│   ├── testing.md
│   ├── functions.md
│   └── requirements-matrix.md
├── .env.example
├── .gitignore
├── package.json
├── vitest.config.js
├── server.js
└── README.md
```

---

## 9. Penjelasan UML Diagram

Seluruh diagram UML disimpan dalam format **PlantUML** di direktori `docs/diagrams/` dan 100% sinkron dengan implementasi kode serta skema database:

1. **Use Case Diagram** (`docs/diagrams/use-case.puml`): Memodelkan interaksi aktor `Admin` dan `Penyewa` beserta relasi `<<include>>` untuk pembuatan sewa baru, pembuatan garasi massal, verifikasi pendaftar, dan perpanjangan sewa.
2. **Class Diagram** (`docs/diagrams/class-diagram.puml`): Memodelkan pewarisan OOP (`User <|-- Tenant`, `User <|-- Admin`), komposisi (`Rental *-- Vehicle`), asosiasi (`GarageSequence`, `Garage`, `RentalExtension`), serta lapisan Service (`AuthService`, `GarageService`, `RentalService`, `ReportService`).
3. **Entity Relationship Diagram** (`docs/diagrams/erd.puml`): Memodelkan 8 tabel relasional SQLite (`users`, `admin`, `tenants`, `garage_types`, `garage_sequences`, `garages`, `rentals`, `rental_extensions`) beserta PK, FK, UNIQUE, CHECK, dan kardinalitas relasi.

---

## 10. Penjelasan Library / Komponen Pre-existing

| Library | Versi | Fungsi dalam Aplikasi |
|---|---|---|
| `express` | ^4.21.2 | Framework HTTP server dan routing REST API serta penyajian file statis frontend. |
| `better-sqlite3` | ^12.0.0 | Driver SQLite sinkron berkinerja tinggi dengan dukungan prepared statements, foreign key pragma, dan transaksi atomik. |
| `bcryptjs` | ^2.4.3 | Hashing password satu arah dengan salt acak agar password tidak pernah disimpan dalam plaintext. |
| `jsonwebtoken` | ^9.0.2 | Pembuatan dan verifikasi token autentikasi bertanda tangan digital yang disimpan pada cookie `HttpOnly`. |
| `cookie-parser` | ^1.4.7 | Parsing cookie HTTP untuk autentikasi sesi berbasis cookie yang aman. |
| `multer` | ^2.5.0 | Middleware upload `multipart/form-data` untuk file gambar bukti pembayaran dengan batasan ukuran dan filter MIME. |
| `helmet` | ^8.0.0 | Menambahkan HTTP security headers standar termasuk Content Security Policy (`script-src 'self'`) pada seluruh respons Express. |
| `dotenv` | ^16.4.7 | Memuat variabel konfigurasi lingkungan (`.env`) seperti port, path database, dan secret key. |
| `vitest` | ^3.0.5 | Test runner modern untuk White Box, Black Box, dan Frontend UI testing. |
| `supertest` | ^7.0.0 | Pustaka pengujian integrasi HTTP API langsung terhadap Express app tanpa perlu menjalankan server eksternal. |
| `@vitest/coverage-v8` | ^3.0.5 | Penyedia pengukuran code coverage berbasis V8 untuk laporan cakupan pengujian. |
| `jsdom` | ^26.0.0 | Simulasi lingkungan DOM browser untuk pengujian otomatis skrip frontend Vanilla JS. |

---

## 11. Asumsi Bisnis & Catatan Implementasi

1. **Login Penyewa `PENDING`/`REJECTED`**: Penyewa yang baru mendaftar dapat melakukan login untuk memantau status verifikasi (`PENDING` / `REJECTED`) pada Dashboard dan Profil, namun seluruh fitur penyewaan (`POST /api/rentals`, `POST /api/rentals/preview`) diblokir secara ketat oleh backend (`403 Forbidden`) hingga Admin mengubah status menjadi `APPROVED`.
2. **Pendapatan Sewa vs Perpanjangan**: Kolom `rentals.total_price` dan `rentals.duration_days` mempertahankan nilai transaksi sewa awal agar laporan pendapatan sewa (`rentals.total_price`) dan pendapatan perpanjangan (`rental_extensions.extension_fee`) tidak saling tumpang tindih, sementara `rentals.end_date` diperbarui ke tanggal selesai terbaru setiap kali Admin memproses perpanjangan.
3. **Tanggal & Timezone**: Seluruh tanggal transaksi dan batas durasi menggunakan timezone `Asia/Jakarta` (WIB, UTC+7) dengan aritmetika date-only berbasis UTC untuk mencegah pergeseran tanggal akibat perbedaan timezone sistem.
