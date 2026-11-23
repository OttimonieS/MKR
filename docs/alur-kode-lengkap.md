# Penjelasan Alur Eksekusi Kode Lengkap (End-to-End Code Walkthrough) — Garage Rental Management System

Dokumen ini menjelaskan **alur eksekusi kode program dari awal hingga akhir secara menyeluruh tanpa ada yang terlewat**, dimulai dari saat server dinyalakan, halaman pertama (`index.html` / Login), halaman Registrasi, seluruh halaman Panel Penyewa (*Tenant*), hingga seluruh halaman Panel Admin, lengkap dengan **nama file, fungsi, query SQL, dan nomor baris kode**.

---

## Ringkasan Peta Halaman & Script

| No | Halaman HTML | Peran | Script Frontend yang Dimuat | Endpoint REST API Utama yang Dipanggil |
|---:|---|---|---|---|
| 1 | [public/index.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/index.html) | Publik (Login) | [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js), [auth.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/auth.js) | `GET /api/auth/me`, `POST /api/auth/login` |
| 2 | [public/tenant/register.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/tenant/register.html) | Publik (Registrasi Penyewa) | [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js), [auth.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/auth.js) | `GET /api/auth/me`, `POST /api/auth/register` |
| 3 | [public/tenant/new-rental.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/tenant/new-rental.html) | Penyewa (`TENANT`) | [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js), [rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js) | `GET /api/auth/me`, `GET /api/rentals/config`, `GET /api/garages/available`, `POST /api/rentals/preview`, `POST /api/rentals` |
| 4 | [public/tenant/rentals.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/tenant/rentals.html) | Penyewa (`TENANT`) | [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js), [tenant.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/tenant.js) | `GET /api/auth/me`, `GET /api/rentals/my`, `GET /api/rentals/:id`, `GET /api/uploads/payment-proofs/:filename` |
| 5 | [public/tenant/profile.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/tenant/profile.html) | Penyewa (`TENANT`) | [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js), [tenant.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/tenant.js) | `GET /api/auth/me` |
| 6 | [public/admin/garages.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/admin/garages.html) | Admin (`ADMIN`) | [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js), [garage.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/garage.js) | `GET /api/auth/me`, `GET /api/garages`, `POST /api/garages/batch` |
| 7 | [public/admin/tenants.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/admin/tenants.html) | Admin (`ADMIN`) | [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js), [admin.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/admin.js) | `GET /api/auth/me`, `GET /api/admin/tenants`, `PATCH /api/admin/tenants/:userId/verify` |
| 8 | [public/admin/extensions.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/admin/extensions.html) | Admin (`ADMIN`) | [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js), [rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js) | `GET /api/auth/me`, `GET /api/rentals/active`, `POST /api/rentals/:id/extend/preview`, `POST /api/rentals/:id/extend` |
| 9 | [public/admin/reports.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/admin/reports.html) | Admin (`ADMIN`) | [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js), [admin.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/admin.js) | `GET /api/auth/me`, `GET /api/rentals/config`, `GET /api/reports/monthly`, `GET /api/reports/daily`, `GET /api/reports/by-garage-type`, `GET /api/reports/by-tenant` |

---

## BAGIAN 0 — Alur Bootstrapping Server & Inisialisasi Database

Sebelum browser membuka halaman pertama, server Node.js menyiapkan database SQLite dan merangkai seluruh komponen Express:

1. **Inisialisasi Skema Database (`npm run db:init`)**:
   - Menjalankan [src/database/init.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/init.js#L14-L27) → memanggil `runDbInit()`.
   - `runDbInit()` memanggil `resolveDatabasePath()` dan `createDatabaseConnection()` di [src/database/db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L21-L44) yang membuka file `./data/garage-rental.db`, menyalakan `db.pragma('foreign_keys = ON')` (baris `39`), dan `db.pragma('journal_mode = WAL')` (baris `41`).
   - Memanggil `initializeSchema(db)` di [src/database/db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L54-L188) yang menjalankan DDL `CREATE TABLE IF NOT EXISTS` untuk **8 tabel** (`users`, `admin`, `tenants`, `garage_types`, `garage_sequences`, `garages`, `rentals`, `rental_extensions`), membuat **10 index** (baris `155–164`), menjalankan migrasi kolom `current_battery_percent` (baris `168–171`), dan melakukan seed awal 3 baris `garage_types` (`BIKE`, `CAR`, `EV`) serta 3 baris `garage_sequences` (`last_num = 0`) di dalam satu transaksi (baris `173–187`).

2. **Seeding Akun Admin (`npm run db:seed`)**:
   - Menjalankan [src/database/seed.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/seed.js#L18-L80) → memanggil `runDbSeed()` dan `seedAdmin(db)`.
   - `seedAdmin()` memeriksa apakah email `admin@garagerental.com` sudah ada di tabel `users JOIN admin` (baris `25–31`). Jika belum ada, membuat UUID baru via `crypto.randomUUID()` (baris `43`), mengambil timestamp WIB via `getJakartaTimestamp()` (baris `44`), lalu menyisipkan baris ke tabel `users` (`role = 'ADMIN'`) dan tabel `admin` secara atomik di dalam `db.transaction()` (baris `46–51`).

3. **Menyalakan HTTP Server (`npm start` / `node server.js`)**:
   - [server.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/server.js#L14-L50) menjalankan `startServer()`, membuka koneksi database, memanggil `initializeSchema(db)`, lalu memanggil `createApp({ db })` di [src/app.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/app.js#L63-L162).
   - Di dalam `createApp()` ([src/app.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/app.js#L73-L145)):
     - **Baris 74–77**: Membuat instance 4 Repository (`UserRepository`, `GarageRepository`, `RentalRepository`, `ReportRepository`).
     - **Baris 80–100**: Membuat instance 4 Service (`AuthService`, `GarageService`, `RentalService`, `ReportService`) dengan menyuntikkan repository terkait.
     - **Baris 103–107**: Membuat middleware autentikasi (`createAuthMiddleware(authService)`) dan middleware upload gambar Multer (`createUploadMiddleware(...)`).
     - **Baris 110–118**: Membuat instance 4 Controller (`AuthController`, `GarageController`, `RentalController`, `ReportController`).
     - **Baris 121–134**: Mengaktifkan `express.json({ limit: '1mb' })`, `express.urlencoded(...)`, `cookieParser()`, dan memasang router REST API pada prefix `/api` melalui `createApiRouter(...)` ([src/routes/api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L18-L67)) serta `notFoundHandler` untuk endpoint `/api/*` yang tidak terdaftar.
     - **Baris 137–142**: Melayani seluruh file HTML, CSS, dan JS frontend dari folder `public/` melalui `express.static(publicDir)`, serta mengarahkan rute `/` ke `public/index.html`.
     - **Baris 145**: Memasang `errorHandler` global ([src/middleware/common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L164-L205)).

---

## BAGIAN 1 — Script Utilitas Global Frontend (`public/js/utils.js`)

Seluruh 9 halaman HTML selalu memuat `<script src="/js/utils.js"></script>` terlebih dahulu sebelum script spesifik halaman. File [public/js/utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L1-L470) mendaftarkan objek global `window.AppUtils` (baris `451–470`) yang berisi fungsi-fungsi berikut:

- **Baris 7–18 (`GARAGE_TYPE_LABELS` & `VEHICLE_TYPE_LABELS`)**: Peta konstanta label bahasa Indonesia untuk tipe garasi (`BIKE`, `CAR`, `EV`) dan tipe kendaraan (`BICYCLE`, `MOTORCYCLE`, `CAR`, `ELECTRIC_CAR`).
- **Baris 26–36 (`escapeHtml(value)`)**: Mengubah karakter `&`, `<`, `>`, `"`, `'` menjadi entitas HTML aman untuk mencegah serangan XSS saat merender string ke `innerHTML`.
- **Baris 44–52 (`formatRupiah(amount)`)**: Memformat angka integer menjadi string mata uang Rupiah (`Rp 100.000`) menggunakan `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })`.
- **Baris 61–77 (`formatDateId(dateStr)`)**: Mem-parsing string `YYYY-MM-DD` menggunakan regex `/^(\d{4})-(\d{2})-(\d{2})/` menjadi format `21 Nov 2026` tanpa menggunakan `new Date()` agar tidak bergeser oleh timezone browser.
- **Baris 85–98 (`renderStatusBadge(status)`)**: Menghasilkan HTML `<span class="badge ...">` berwarna sesuai status (`AVAILABLE`, `USED`, `PENDING`, `APPROVED`, `REJECTED`, `ACTIVE`, `COMPLETED`).
- **Baris 108–141 (`apiRequest(url, options)`)**: Pembungkus `fetch()` ke backend dengan `credentials: 'same-origin'` (agar cookie JWT selalu ikut terkirim). Jika `options.body instanceof FormData` (baris `117`), dikirim langsung sebagai `multipart/form-data`; jika objek biasa, diubah ke JSON (`JSON.stringify`) dengan header `'Content-Type': 'application/json'`. Jika `!response.ok || payload.success === false`, melempar `Error(payload.message)` beserta `err.status`.
- **Baris 152–176 (`showToast(message, type, durationMs)`)**: Menampilkan notifikasi *toast* mengambang di pojok kanan atas selama 4 detik.
- **Baris 185–209 (`setFlashNotice` & `consumeFlashNotice`)**: Menyimpan dan mengambil pesan notifikasi lintas halaman melalui `sessionStorage` (`gr_flash_notice`).
- **Baris 219–245 (`showAlert` & `hideAlert`)**: Menampilkan/menyembunyikan kotak pesan alert di halaman dan melakukan `scrollIntoView({ behavior: 'smooth' })`.
- **Baris 254–276 (`requirePageAuth(expectedRole)`)**: Penjaga sesi halaman. Memanggil `GET /api/auth/me`; jika belum login (error `401`), mengarahkan browser ke `/index.html`. Jika sudah login tetapi `user.role !== expectedRole` (misalnya `TENANT` mencoba membuka halaman `ADMIN`), mengarahkan paksa ke `/admin/garages.html` atau `/tenant/new-rental.html` (baris `259–263`). Jika sesuai, menampilkan nama & role di elemen `#currentUserDisplay` (baris `265–268`) dan mengaktifkan tombol Logout via `bindLogoutButton()`.
- **Baris 283–297 (`bindLogoutButton()`)**: Mengikat event klik pada tombol `#logoutBtn` untuk memanggil `POST /api/auth/logout` lalu mengarahkan browser kembali ke `/index.html`.
- **Baris 305–323 (`openModal` & `closeModal`)** dan **Baris 434–449 (`bindModalCloseHandlers`)**: Membuka dan menutup dialog modal dengan menghapus/menambah class `hidden`, serta memasang event delegation klik pada seluruh tombol beratribut `data-close-modal`.
- **Baris 331–426 (`buildRentalDetailHtml(rental)`)**: Menyusun HTML detail lengkap transaksi sewa (data kendaraan, plat, baterai EV, periode sewa, rincian biaya awal + biaya perpanjangan, gambar bukti pelunasan, dan tabel histori perpanjangan) untuk ditampilkan di modal detail.

---

## BAGIAN 2 — Halaman Pertama: Login (`public/index.html` + `public/js/auth.js`)

### 1. Struktur Halaman `public/index.html`
Ketika pengguna membuka `http://localhost:3000/`, Express menjalankan rute `app.get('/', ...)` di [src/app.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/app.js#L140-L142) yang mengirimkan file [public/index.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/index.html#L1-L60):
- **Baris 17**: Kontainer pesan error `<div id="authAlert" class="alert hidden">`.
- **Baris 19–49**: Form `<form id="loginForm">` yang berisi input `<input type="email" id="email">` (baris `22–30`), `<input type="password" id="password">` (baris `35–43`), dan tombol submit `<button type="submit" id="loginSubmitBtn">` (baris `46–48`).
- **Baris 51–54**: Tautan `<a href="/tenant/register.html">` bagi penyewa yang belum memiliki akun.
- **Baris 57–58**: Memuat script `/js/utils.js` lalu `/js/auth.js`.

### 2. Alur Eksekusi Frontend di `public/js/auth.js`
Saat halaman selesai dimuat (`DOMContentLoaded` di [public/js/auth.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/auth.js#L130-L133)):
1. Memanggil `initLoginPage()` (baris `30–68`).
2. `initLoginPage()` mengecek keberadaan `#loginForm` (baris `31`), lalu memanggil `redirectIfAuthenticated()` (baris `12–23`).
3. `redirectIfAuthenticated()` memanggil `GET /api/auth/me`:
   - Jika pengguna ternyata sudah punya cookie sesi aktif, langsung diarahkan otomatis ke `/admin/garages.html` (jika `ADMIN`) atau `/tenant/new-rental.html` (jika `TENANT`).
   - Jika belum login (`401`), blok `catch` mengabaikan error sehingga pengguna tetap di halaman login.
4. Ketika pengguna mengisi email & password lalu klik **"Masuk ke Sistem"**, event listener `form.addEventListener('submit', ...)` (baris `38–67`) berjalan:
   - Mematikan tombol submit (`submitBtn.disabled = true`, teks menjadi `'Memproses...'` pada baris `46–47`).
   - Memanggil `window.AppUtils.apiRequest('/api/auth/login', { method: 'POST', body: { email, password } })` (baris `50–53`).

### 3. Alur Eksekusi Backend saat `POST /api/auth/login`
1. **Router**: Rute `router.post('/auth/login', auth.login)` di [src/routes/api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L32) meneruskan request ke `AuthController.login()`.
2. **Controller**: `AuthController.login(req, res, next)` di [src/controllers/controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L70-L93) memanggil `this.authService.authenticate(req.body.email, req.body.password)` (baris `72–75`).
3. **Service**: `AuthService.authenticate(email, password)` di [src/services/AuthService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/AuthService.js#L102-L119):
   - **Baris 103–105**: Jika email atau password kosong, melempar `ValidationError` (HTTP `400`).
   - **Baris 106–107**: Menormalisasi email ke huruf kecil lalu memanggil `this.userRepository.findByEmail(normalizedEmail)`.
4. **Repository & SQL**: `UserRepository.findByEmail(email)` di [src/repositories/UserRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/UserRepository.js#L80-L93) menjalankan query:
   ```sql
   SELECT u.user_id, u.email, u.password, u.role, u.created_at,
          a.name AS admin_name,
          t.nik, t.full_name AS tenant_full_name, t.phone_number, t.is_verified
   FROM users u
   LEFT JOIN admin a ON a.admin_id = u.user_id
   LEFT JOIN tenants t ON t.tenant_id = u.user_id
   WHERE lower(u.email) = lower(?)
   ```
   Lalu `mapUserRow(row)` (baris `28–51`) mengubah hasil query menjadi instance class `new Admin(...)` atau `new Tenant(...)` (dari [src/models/entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L83-L166)).
5. **Verifikasi Kredensial & Pembuatan Token JWT**:
   - Di `AuthService.authenticate()` ([src/services/AuthService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/AuthService.js#L109-L118)): jika user tidak ditemukan atau `String(password) !== user.getPasswordHash()`, melempar `AuthenticationError('Email atau password tidak valid.')` (HTTP `401`).
   - Jika cocok, memanggil `this.signToken(user)` (baris `127–136`) yang menjalankan `jwt.sign({ sub: user.id, role: user.role }, this.jwtSecret, { expiresIn: '8h' })`.
6. **Set Cookie & Response**:
   - `AuthController.login()` ([src/controllers/controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L77-L89)) menyetel cookie `HttpOnly` bernama `gr_auth_token` selama 8 jam (`res.cookie(AUTH_COOKIE_NAME, token, { httpOnly: true, maxAge: 8 * 60 * 60 * 1000, path: '/' })`) dan mengirim JSON `{ success: true, message: 'Login berhasil.', data: { user: user.toJSON() } }`.
7. **Redirect di Browser**:
   - Di [public/js/auth.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/auth.js#L55-L60), jika `user.role === 'ADMIN'` browser pindah ke `/admin/garages.html`; jika `'TENANT'` pindah ke `/tenant/new-rental.html`. Jika gagal login, baris `62` menampilkan pesan error di `#authAlert`.

---

## BAGIAN 3 — Halaman Registrasi Penyewa (`public/tenant/register.html` + `public/js/auth.js`)

Jika pengguna belum memiliki akun penyewa dan mengklik **"Daftar sebagai Penyewa"** pada `index.html` (baris `53`), browser membuka [public/tenant/register.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/tenant/register.html#L1-L114).

### 1. Struktur Halaman `public/tenant/register.html`
- **Baris 17**: Kontainer alert `<div id="registerAlert">`.
- **Baris 19–104**: `<form id="registerForm">` dengan 6 input:
  - `#nik` (baris `23–32`, 16 digit angka)
  - `#phone` (baris `38–45`, nomor telepon)
  - `#fullName` (baris `51–58`, nama lengkap sesuai KTP)
  - `#email` (baris `63–70`, email sebagai username)
  - `#password` (baris `76–84`, minimal 6 karakter)
  - `#confirmPassword` (baris `89–97`, konfirmasi password)
  - Tombol submit `#registerSubmitBtn` (baris `101–103`).
- **Baris 111–112**: Memuat `/js/utils.js` dan `/js/auth.js`.

### 2. Alur Eksekusi Frontend di `public/js/auth.js`
1. Saat `DOMContentLoaded`, `initRegisterPage()` ([public/js/auth.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/auth.js#L75-L128)) dijalankan.
2. Saat form disubmit (baris `83–127`), script membaca nilai keenam input dan mengecek `if (payload.password !== confirmPassword)` pada baris `97`. Jika tidak sama, langsung menampilkan error `'Konfirmasi password tidak cocok.'` di `#registerAlert` tanpa memanggil server.
3. Jika cocok, memanggil `window.AppUtils.apiRequest('/api/auth/register', { method: 'POST', body: payload })` (baris `110–113`).

### 3. Alur Eksekusi Backend saat `POST /api/auth/register`
1. **Router & Controller**: `router.post('/auth/register', auth.register)` di [src/routes/api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L31) → `AuthController.register()` di [src/controllers/controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L41-L60) → `AuthService.registerTenant()` di [src/services/AuthService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/AuthService.js#L64-L91).
2. **Validasi Format Input**: Baris `65–69` di `AuthService.js` memanggil 5 fungsi validator dari [src/utils/validators.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/validators.js#L19-L86):
   - `validateNik(nik)` (baris `33–39`): menguji regex `/^\d{16}$/` (wajib tepat 16 digit angka).
   - `validateFullName(fullName)` (baris `48–54`): panjang nama wajib `2..100` karakter.
   - `validatePhone(phone)` (baris `63–69`): menguji regex `/^[0-9+\-\s()]{8,20}$/`.
   - `validateEmail(email)` (baris `19–25`): menguji regex email dan mengubah ke `.toLowerCase()`.
   - `validatePassword(password)` (baris `78–86`): panjang wajib `6..128` karakter.
3. **Cek Duplikasi Email & NIK**:
   - Baris `71–73` di [src/services/AuthService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/AuthService.js#L71-L73): `if (this.userRepository.findByEmail(validEmail))` → lempar `ConflictError` (HTTP `409`).
   - Baris `75–77`: `if (this.userRepository.findTenantByNik(validNik))` → memanggil query `SELECT ... FROM tenants WHERE t.nik = ?` di [src/repositories/UserRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/UserRepository.js#L101-L112); jika sudah ada, lempar `ConflictError` (HTTP `409`).
4. **Transaksi Simpan ke 2 Tabel (`users` dan `tenants`)**:
   - `UserRepository.createTenantUser()` di [src/repositories/UserRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/UserRepository.js#L148-L179) membuka transaksi `this.db.transaction(...)`:
     - Menyisipkan ke tabel `users` (`user_id`, `email`, `password`, `role = 'TENANT'`, `created_at`).
     - Menyisipkan ke tabel `tenants` (`tenant_id`, `nik`, `full_name`, `phone_number`, `is_verified = 'PENDING'`).
   - Mengembalikan HTTP `201 Created` ke frontend, lalu `auth.js` baris `115–120` menampilkan pesan sukses dan me-reset form.

---

## BAGIAN 4 — Alur Lengkap Panel Penyewa (Tenant Pages)

Setelah login sebagai Penyewa (`TENANT`), terdapat **3 halaman** di dalam folder `public/tenant/`:
1. `new-rental.html` (Sewa Garasi Baru)
2. `rentals.html` (Riwayat Sewa)
3. `profile.html` (Profil Penyewa)

---

### 4.1 Halaman Sewa Garasi Baru (`public/tenant/new-rental.html` + `public/js/rental.js`)

#### A. Struktur HTML & Script yang Dipakai
File [public/tenant/new-rental.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/tenant/new-rental.html#L1-L224) memuat `/js/utils.js` dan `/js/rental.js` pada baris `221–222`. Elemen pentingnya:
- **Baris 35**: Banner blokir `#tenantApprovalGate` (tampil jika akun masih `PENDING` atau `REJECTED`).
- **Baris 38–216 (`#newRentalContent`)**:
  - Form `#newRentalForm` dengan input `#vehicleType` (baris `50`), `#plateNumberGroup` & `#plateNumber` (baris `58–67`), `#brand` (baris `73`), `#model` (baris `85`), `#batteryCapacityGroup` yang berisi `#batteryCapacityKwh` & `#currentBatteryPercent` (baris `96–125`).
  - Input periode & garasi: `#rentalType` (`DAILY` / `MONTHLY`, baris `133`), `#durationDays` (baris `141`), `#startDate` (baris `157`), `#endDateDisplay` (readonly, baris `169`), `#compatibleGarageType` (baris `176`), `#garageId` (baris `181`).
  - Input file bukti bayar: `<input type="file" id="paymentProof" accept="image/jpeg,image/png,image/webp">` (baris `190–197`) dan tombol `#submitRentalBtn` (baris `201`).
  - Panel kanan `#rentalCostSummary` (baris `212`) untuk pratinjau rincian biaya real-time.

#### B. Alur Inisialisasi & Proteksi Status `PENDING` / `REJECTED`
Saat halaman dimuat, `DOMContentLoaded` di [public/js/rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js#L773-L776) memanggil `initTenantNewRentalPage()` (baris `421–466`):
1. **Baris 427**: Memanggil `window.AppUtils.requirePageAuth('TENANT')` (`GET /api/auth/me`).
2. **Baris 432–438 (Approval Gate Frontend)**: Memeriksa `if (user.approvalStatus !== 'APPROVED')`. Jika penyewa masih berstatus `'PENDING'` atau `'REJECTED'`, script menampilkan pesan peringatan di `#tenantApprovalGate`, menyembunyikan seluruh form `#newRentalContent` (`classList.add('hidden')`), dan menghentikan eksekusi (`return`).
3. **Baris 440–446 (Load Konfigurasi Server)**: Jika sudah `'APPROVED'`, memanggil `GET /api/rentals/config` → `RentalController.getConfig()` ([src/controllers/controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L347-L357)) → `RentalService.getRentalConfig()` ([src/services/RentalService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L152-L170)). Server mengembalikan `todayDate` (WIB), `monthlyDays` (jumlah hari bulan ini), `maxDailyDays` (`monthlyDays - 1`), serta matriks `compatibility`. Script menyetel `startDateInput.min = rentalConfig.todayDate` dan `startDateInput.value = rentalConfig.todayDate`.
4. **Baris 451–465**: Memasang event listener pada seluruh input form lalu memanggil `handleVehicleTypeChange()` dan `handleRentalTypeChange()`.

#### C. Alur Interaksi Dinamis & Pratinjau Biaya (`Preview`)
1. **Saat Tipe Kendaraan Berubah (`handleVehicleTypeChange()` di [public/js/rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js#L17-L57))**:
   - Jika `vehicleType === 'BICYCLE'`, `#plateNumberGroup` disembunyikan dan dikosongkan (`plateInput.required = false`).
   - Jika `vehicleType === 'ELECTRIC_CAR'`, `#batteryCapacityGroup` (`#batteryCapacityKwh` dan `#currentBatteryPercent`) ditampilkan dan diwajibkan.
   - Dropdown `#compatibleGarageType` diisi hanya dengan tipe garasi yang diizinkan oleh `rentalConfig.compatibility[vehicleType]` (`BICYCLE`/`MOTORCYCLE` → `BIKE`; `CAR` → `CAR`; `ELECTRIC_CAR` → `CAR`, `EV`).
   - Memanggil `refreshAvailableGaragesAndPreview()`.
2. **Saat Tipe Sewa atau Tanggal Mulai Berubah (`handleRentalTypeChange()` baris `64–91` & `handleStartDateChange()` baris `99–119`)**:
   - Jika tanggal mulai diubah, memanggil `GET /api/rentals/config?startDate=YYYY-MM-DD` agar `monthlyDays` dan `maxDailyDays` menyesuaikan bulan dari tanggal mulai yang dipilih (misalnya Februari = 28/29 hari, April = 30 hari, Mei = 31 hari).
   - Jika `rentalType === 'MONTHLY'`, `#durationDays` dikunci (`readOnly = true`) pada nilai `rentalConfig.monthlyDays`. Jika `'DAILY'`, `#durationDays` dibuka dengan rentang `1` s/d `rentalConfig.maxDailyDays`.
3. **Memuat Daftar Garasi Tersedia (`refreshAvailableGaragesAndPreview()` di [public/js/rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js#L127-L184))**:
   - Memanggil `GET /api/garages/available?vehicleType=...&garageType=...&rentalType=...&durationDays=...&startDate=...`.
   - Di backend: melewati middleware `authenticate` dan `requireAdminOrApprovedTenant` ([src/routes/api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L43)) → `GarageController.getAvailableGarages()` ([src/controllers/controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L264-L286)) → `GarageService.getAvailableGarages()` ([src/services/GarageService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/GarageService.js#L221-L275)).
   - `GarageService` memanggil `syncStatuses()`, memvalidasi kompatibilitas (`validateVehicleCompatibility`) dan durasi (`validateRentalDuration`), menghitung tanggal selesai inklusif (`calculateEndDate(resolvedStartDate, resolvedDuration)`), lalu memanggil `GarageRepository.findAvailableForPeriod()` ([src/repositories/GarageRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/GarageRepository.js#L443-L471)) yang menjalankan query `SELECT ... FROM garages g JOIN garage_types gt ... WHERE gt.name IN (...) AND NOT EXISTS (SELECT 1 FROM rentals r WHERE r.garage_id = g.garage_id AND r.status = 'ACTIVE' AND r.start_date <= ? AND r.end_date >= ?)`.
   - Hasilnya mengisi dropdown `#garageId` dan menampilkan tanggal selesai otomatis di `#endDateDisplay`, lalu memanggil `updateRentalCostPreview()`.
4. **Menghitung Rincian Biaya di Panel Kanan (`updateRentalCostPreview()` di [public/js/rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js#L205-L292))**:
   - Mengirim `POST /api/rentals/preview` → `RentalController.previewRental()` ([src/controllers/controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L368-L377)) → `RentalService.previewRentalCost()` ([src/services/RentalService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L181-L248)).
   - `RentalService.previewRentalCost()` memvalidasi `new Vehicle(...).validate()`, mengecek garasi, dan menghitung `calculateTotalRentalCost()` di [src/utils/rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L455-L478) (biaya sewa harian/bulanan + biaya pengisian sisa persen baterai EV menuju 100%). Hasilnya dirender ke `#rentalCostSummary`.

#### D. Alur Submit Transaksi Sewa Baru (`POST /api/rentals`)
Ketika penyewa memilih file gambar bukti pelunasan dan menekan **"Simpan Transaksi Sewa"**:
1. **Frontend (`handleCreateRentalSubmit()` di [public/js/rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js#L302-L414))**:
   - Memvalidasi kelengkapan input di sisi klien (baris `326–363`) dan membungkus seluruh field beserta `fileInput.files[0]` ke dalam objek `FormData` (baris `365–380`).
   - Mengirim `apiRequest('/api/rentals', { method: 'POST', body: formData })` (baris `386–389`).
2. **Middleware Rute (`POST /api/rentals` di [src/routes/api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L49))**:
   - Melewati `authenticate` ([src/middleware/auth.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/auth.js#L50-L63)).
   - Melewati `requireApprovedTenant` ([src/middleware/auth.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/auth.js#L96-L113)) — menolak penyewa `PENDING`/`REJECTED` dengan HTTP `403`.
   - Melewati `uploadPaymentProof` ([src/middleware/common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L123-L146)) — Multer memeriksa batas 5 MB, memfilter MIME (`image/jpeg`, `image/png`, `image/webp`), dan menyimpan file ke `./uploads/payment-proofs/<UUID>.<ext>`.
3. **Controller & Service (`RentalController.createRental()` → `RentalService.createRental()`)**:
   - Di [src/services/RentalService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L265-L349):
     - Memastikan ulang `tenant.canRent()` (baris `270`).
     - Menyinkronkan status garasi terhadap tanggal hari ini WIB (`this.garageRepository.syncStatuses(todayDate)`, baris `280–281`).
     - Memvalidasi `startDate >= todayDate` (`resolveStartDate`, baris `283`).
     - Memvalidasi objek `Vehicle` (baris `285–293`), durasi (`validateRentalDuration`, baris `295–299`), tanggal selesai (`calculateEndDate`, baris `300`), keberadaan garasi (`findById`, baris `306`), dan kompatibilitas kendaraan–garasi (`vehicle.validateCompatibility`, baris `311`).
     - Menghitung ulang seluruh biaya secara otoritatif di backend (`calculateTotalRentalCost`, baris `313–322`).
4. **Transaksi Database Atomik (`RentalRepository.createRentalTransactional()`)**:
   - Di [src/repositories/RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L221-L303), membuka transaksi `createTx.immediate()` (`BEGIN IMMEDIATE`):
     - Menandai rental lama yang sudah lewat `end_date < todayDate` menjadi `'COMPLETED'` (baris `224–230`).
     - Mengecek ulang `this.hasOverlappingActiveRental(data.garageId, data.startDate, data.endDate)` (baris `246–256`). Jika sudah ada transaksi aktif yang bertabrakan, melempar `ConflictError` (HTTP `409`), transaksi di-rollback, dan `errorHandler` menghapus file gambar yang baru diunggah via `safeUnlink()`.
     - Menyisipkan baris baru ke tabel `rentals` dengan status `'ACTIVE'` (baris `258–287`).
     - Jika periode sewa mencakup hari ini (`data.startDate <= todayDate && data.endDate >= todayDate`), langsung menjalankan `UPDATE garages SET status = 'USED' WHERE garage_id = ?` (baris `290–298`).
5. **Notifikasi & Redirect ke Riwayat Sewa**:
   - Setelah menerima respons HTTP `201`, `handleCreateRentalSubmit()` ([public/js/rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js#L391-L407)) menampilkan alert, toast, menyimpan flash notice (`setFlashNotice`), dan mengarahkan browser ke `/tenant/rentals.html`.

---

### 4.2 Halaman Riwayat Sewa Penyewa (`public/tenant/rentals.html` + `public/js/tenant.js`)

1. **Struktur HTML ([public/tenant/rentals.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/tenant/rentals.html#L1-L86))**:
   - Memuat `/js/utils.js` dan `/js/tenant.js` pada baris `83–84`.
   - Memiliki banner `#tenantHistoryStatusBanner` (baris `35`), alert `#tenantHistoryAlert` (baris `36`), tabel `#tenantHistoryTableBody` (baris `58`), dan modal `#tenantRentalDetailModal` (baris `70–81`).
2. **Alur Inisialisasi (`initTenantRentalsHistoryPage()` di [public/js/tenant.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/tenant.js#L61-L116))**:
   - Memanggil `requirePageAuth('TENANT')` (baris `67`).
   - Memanggil `renderTenantStatusNotice(user, 'tenantHistoryStatusBanner')` (baris `72`, didefinisikan di baris `13–32`) untuk menampilkan banner kuning/merah jika akun penyewa masih `PENDING` atau `REJECTED`.
   - Memanggil `consumeFlashNotice()` (baris `74–78`) untuk menampilkan notifikasi sukses jika baru saja dialihkan dari halaman Sewa Garasi Baru.
   - Memanggil `GET /api/rentals/my` (baris `81`).
3. **Alur Backend `GET /api/rentals/my`**:
   - Rute `router.get('/rentals/my', authenticate, tenantOnly, rental.getMyRentals)` di [src/routes/api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L50) → `RentalController.getMyRentals()` ([src/controllers/controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L413-L423)) → `RentalService.getTenantRentals(req.user.id)` ([src/services/RentalService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L357-L361)).
   - Menyinkronkan status garasi (`syncStatuses`), lalu memanggil `RentalRepository.listByTenant(tenantUserId)` ([src/repositories/RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L355-L365)) yang menjalankan query `getBaseSelectSql() WHERE r.tenant_id = ? ORDER BY r.created_at DESC` dan menggabungkan histori perpanjangannya lewat batch query `mapRentalRowsWithExtensions(rows)` (baris `164–173`).
4. **Alur Tombol "Detail" & Lihat Gambar Bukti Pembayaran**:
   - Saat penyewa menekan tombol **"Detail"** (`data-history-detail`), fungsi `openTenantRentalDetailModal(rentalId)` di [public/js/tenant.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/tenant.js#L40-L54) membuka `#tenantRentalDetailModal` dan memanggil `GET /api/rentals/:id`.
   - Di backend, `RentalService.getRentalDetail(rentalId, requestingUser)` ([src/services/RentalService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L373-L390)) memeriksa otorisasi kepemilikan pada baris `382–387`: jika pemanggil bukan `ADMIN` dan `rental.tenantUserId !== requestingUser.id`, dilempar `ForbiddenError` (HTTP `403`).
   - Di frontend, `buildRentalDetailHtml(res.data)` ([public/js/utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L331-L426)) merender rincian biaya, tabel histori perpanjangan, serta gambar `<img src="/api/uploads/payment-proofs/<filename>">`.
   - Permintaan gambar tersebut ditangani oleh `GET /api/uploads/payment-proofs/:filename` ([src/routes/api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L64)) → `RentalController.servePaymentProof()` ([src/controllers/controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L554-L567)) yang mengekstrak `path.basename(req.params.filename)` dan mengirimkan file dari disk via `res.sendFile(fullPath)`.

---

### 4.3 Halaman Profil Penyewa (`public/tenant/profile.html` + `public/js/tenant.js`)

1. **Struktur HTML ([public/tenant/profile.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/tenant/profile.html#L1-L52))**:
   - Memuat `/js/utils.js` dan `/js/tenant.js` pada baris `49–50`.
   - Memiliki elemen `#tenantProfileStatusBanner` (baris `35`) dan `#tenantProfileDetails` (baris `41`).
2. **Alur Eksekusi (`initTenantProfilePage()` di [public/js/tenant.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/tenant.js#L123-L164))**:
   - Memanggil `requirePageAuth('TENANT')` yang mengambil data profil terbaru penyewa dari `GET /api/auth/me` (`AuthController.me()` di [src/controllers/controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L121-L126)).
   - Menampilkan banner status verifikasi via `renderTenantStatusNotice(user, 'tenantProfileStatusBanner')`.
   - Merender kartu identitas penyewa (Nama Lengkap, Badge Status Verifikasi KTP/NIK, NIK 16 digit, Email, Nomor Telepon, dan Tanggal Pendaftaran) ke dalam `#tenantProfileDetails` (baris `135–163`).


---

## Bagian 5: Alur Lengkap Panel Admin (4 Halaman)

Saat Admin berhasil login di [public/index.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/index.html#L1-L60), fungsi `redirectByRole(user)` di [public/js/utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L254-L263) mengarahkan browser ke halaman pertama Admin yaitu **`/admin/garages.html`**.

Panel Admin memiliki **4 halaman utama** yang dapat diakses dari sidebar navigasi:
1. **Manajemen Garasi** ([public/admin/garages.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/admin/garages.html#L1-L162))
2. **Verifikasi Penyewa** ([public/admin/tenants.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/admin/tenants.html#L1-L102))
3. **Perpanjangan Sewa** ([public/admin/extensions.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/admin/extensions.html#L1-L128))
4. **Laporan Penyewaan** ([public/admin/reports.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/admin/reports.html#L1-L137))

---

### 5.1. Halaman Manajemen Garasi (`public/admin/garages.html`)

#### A. Struktur HTML & Script yang Dipakai ([public/admin/garages.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/admin/garages.html#L1-L162))
- **Elemen Utama di HTML**:
  - `#garagePageAlert` (baris 36): Kotak notifikasi sukses/gagal pembuatan batch garasi.
  - `#sequenceSummary` (baris 38): Grid 3 kartu status kapasitas garasi (`BIKE` `S001–S999`, `CAR` `C001–C999`, `EV` `E001–E999`).
  - Form `<form id="createGarageBatchForm">` (baris 48–105):
    - `<select id="garageType">` (baris 51–55): Pilihan tipe garasi (`BIKE`, `CAR`, `EV`).
    - `<input type="number" id="quantity">` (baris 60–69): Jumlah garasi yang akan dibuat sekaligus (`1` s.d. `999`).
    - `<input type="number" id="dailyRate">` (baris 75–84): Tarif sewa harian (`Rp`).
    - `<div id="electricityRateGroup">` & `<input type="number" id="electricityRatePerKwh">` (baris 88–100): Input tarif listrik per kWh (`Rp/kWh`), secara default disembunyikan (`hidden`) kecuali tipe garasi `EV` dipilih.
    - Tombol submit `#createGarageBtn` (baris 102–104).
  - Panel Daftar & Filter Garasi (baris 109–154):
    - `<select id="filterGarageType">` (baris 114–120): Filter tipe (`Semua`, `BIKE`, `CAR`, `EV`).
    - `<select id="filterGarageStatus">` (baris 122–126): Filter status (`Semua`, `AVAILABLE`, `USED`).
    - `<input type="text" id="filterGarageSearch">` (baris 129) & tombol `#filterGarageBtn` (baris 131).
    - `<tbody id="garagesTableBody">` (baris 147): Isi tabel daftar garasi.
- **Script `.js` yang Dimuat** (baris 159–160):
  1. [public/js/utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L1-L470)
  2. [public/js/garage.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/garage.js#L1-L179)

#### B. Alur Eksekusi Frontend di `public/js/garage.js`
1. **Inisialisasi Halaman** ([public/js/garage.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/garage.js#L117-L179)):
   - Event `DOMContentLoaded` (baris 177–179) memanggil `initAdminGaragesPage()` (baris 117–175).
   - Baris 118–120: Memastikan elemen `#createGarageBatchForm` ada di halaman.
   - Baris 123: Memanggil `await requirePageAuth('ADMIN')` untuk memverifikasi sesi Admin dan mengisi profil sidebar.
   - Baris 126–129: Memanggil `toggleElectricityRateField()` dan memasang event listener `change` pada `#garageType`.
   - Baris 174: Memanggil `await loadGaragesTable()` untuk memuat daftar garasi dan kartu kapasitas sequence.
2. **Toggle Field Tarif Listrik (`toggleElectricityRateField`)** ([public/js/garage.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/garage.js#L12-L26)):
   - Mengecek apakah `typeSelect.value === 'EV'`.
   - Jika `EV`, menghapus class `hidden` pada `#electricityRateGroup` dan menyetel `elecInput.required = true`.
   - Jika `BIKE` atau `CAR`, menambahkan class `hidden`, menyetel `elecInput.required = false`, dan mengosongkan `elecInput.value = ''`.
3. **Memuat Tabel Garasi & Ringkasan Sequence (`loadGaragesTable` & `renderGarageSequenceSummary`)** ([public/js/garage.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/garage.js#L35-L110)):
   - `loadGaragesTable()` (baris 63–110) membaca nilai `#filterGarageType`, `#filterGarageStatus`, dan `#filterGarageSearch`, menyusun query string `URLSearchParams`, lalu memanggil `await apiFetch('/api/garages?...')` (baris 79).
   - Memanggil `renderGarageSequenceSummary(res.data.sequences)` (baris 35–56) yang me-render 3 kartu ringkasan kapasitas: menampilkan prefix (`S`, `C`, `E`), `lastNumber / 999`, sisa slot (`remainingCapacity`), `dailyRate`, dan `erPerKwh`.
   - Me-render setiap baris garasi ke `#garagesTableBody` (baris 94–106): menampilkan Kode ID (`S001`, `C001`, `E001`), badge tipe garasi, tarif harian (`formatRupiah(g.dailyRate)`), tarif bulanan (`formatRupiah(g.monthlyRate)` = `25 × dailyRate`), tarif listrik/kWh, dan badge status (`AVAILABLE` / `USED`).
4. **Submit Form Buat Batch Garasi** ([public/js/garage.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/garage.js#L132-L168)):
   - Saat `#createGarageBatchForm` di-submit, membaca `garageType`, `quantity`, `dailyRate`, dan `electricityRatePerKwh` (hanya diisi jika `garageType === 'EV'`, selain itu `null`).
   - Mengirim `await apiFetch('/api/garages/batch', { method: 'POST', body: JSON.stringify({...}) })` (baris 144–152).
   - Jika sukses, menampilkan pesan `"Berhasil membuat X garasi (...: ID_AWAL s.d. ID_AKHIR)"`, me-reset input `#quantity` ke `1`, dan memanggil `await loadGaragesTable()` untuk memperbarui tabel dan kartu sequence.

#### C. Alur Eksekusi Backend (`GET /api/garages` & `POST /api/garages/batch`)
1. **Endpoint `GET /api/garages`**:
   - **Route**: [src/routes/api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L42) (`authenticate, adminOnly, garage.listGarages`).
   - **Controller**: `GarageController.listGarages()` ([src/controllers/controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L235-L254)) mengambil query `garageType`, `status`, `search` dan memanggil `garageService.listGarages()`.
   - **Service**: `GarageService.listGarages()` ([src/services/GarageService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/GarageService.js#L166-L182)):
     - Baris 167: Memanggil `this.syncStatuses()` (baris 72–76) → `GarageRepository.syncStatuses()` ([src/repositories/GarageRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/GarageRepository.js#L299-L369)).
     - Di dalam `GarageRepository.syncStatuses()`:
       - Melakukan *fast read-only pre-check* `needsStatusSync(today)` (baris 242–288) dengan query `SELECT 1 ... LIMIT 1` untuk mengecek apakah ada sewa lewat tanggal (`end_date < today`), garasi yang belum berstatus `USED` padahal ada sewa aktif hari ini, atau garasi yang masih `USED` padahal sudah tidak ada sewa aktif hari ini.
       - Hanya jika `needsStatusSync` bernilai `true`, barulah transaksi tulis `syncTx.immediate()` dijalankan untuk mengubah `rentals.status = 'COMPLETED'` dan menyinkronkan `garages.status` (`USED` / `AVAILABLE`).
     - Mengambil daftar garasi (`garageRepository.listGarages(filters)` di baris 399–431), daftar konfigurasi tipe garasi (`getAllGarageTypes()` di baris 55–74), dan daftar sequence (`getAllSequences()` di baris 115–135).
2. **Endpoint `POST /api/garages/batch`**:
   - **Route**: [src/routes/api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L41) (`authenticate, adminOnly, garage.createBatch`).
   - **Controller**: `GarageController.createBatch()` ([src/controllers/controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L203-L225)) mengembalikan HTTP `201 Created`.
   - **Service**: `GarageService.createGarageBatch()` ([src/services/GarageService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/GarageService.js#L90-L152)):
     - Memvalidasi tipe garasi harus salah satu dari `['BIKE', 'CAR', 'EV']` (baris 99–101).
     - Memvalidasi `quantity` harus bilangan bulat `1` s.d. `999` (baris 103–106).
     - Memvalidasi `dailyRate > 0` (baris 108–111).
     - Jika `normalizedType === 'EV'`, memvalidasi `electricityRatePerKwh > 0` (baris 114–119); jika `BIKE` atau `CAR`, memaksa `normalizedElectricityRate = null`.
   - **Repository & Model OOP**: `GarageRepository.createGarageBatch()` ([src/repositories/GarageRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/GarageRepository.js#L150-L233)):
     - Membuka transaksi `insertBatchTx.immediate()` (`BEGIN IMMEDIATE`) agar penomoran sequence aman dari *race condition*.
     - Mengambil baris `garage_types JOIN garage_sequences` (baris 160–170) dan membungkusnya ke objek model `GarageSequence` ([src/models/entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L211-L300)).
     - Mengecek sisa kapasitas `sequence.getRemainingCapacity()` (`999 - lastNumber`, baris 177–183). Jika `quantity > remaining`, melempar `AppError(400)` dan melakukan rollback otomatis.
     - Menjalankan `UPDATE garage_types SET daily_rate = ?, er_per_kwh = ? WHERE type_id = ?` (baris 185–191).
     - Melakukan perulangan `for (let i = 0; i < quantity; i += 1)` (baris 203–219):
       - Memanggil `sequence.generateNextId()` ([src/models/entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L262-L271)) yang menaikkan `this.lastNumber += 1` dan memformat ID dengan `String(nextNum).padStart(3, '0')` (`S001`, `C001`, `E001`).
       - Menjalankan `INSERT INTO garages (garage_id, type_id, status) VALUES (?, ?, 'AVAILABLE')`.
     - Menyimpan nomor urut terakhir dengan `UPDATE garage_sequences SET last_num = ? WHERE type_id = ?` (baris 221–227).

---

### 5.2. Halaman Verifikasi Penyewa (`public/admin/tenants.html`)

#### A. Struktur HTML & Script yang Dipakai ([public/admin/tenants.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/admin/tenants.html#L1-L102))
- **Elemen Utama di HTML**:
  - `#tenantVerifyAlert` (baris 36): Notifikasi hasil approve/reject penyewa.
  - Filter `#filterTenantStatus` (`Semua`, `PENDING`, `APPROVED`, `REJECTED` di baris 42–49), `#filterTenantSearch` (baris 51), dan tombol `#filterTenantBtn` (baris 53).
  - Tabel `<tbody id="tenantsTableBody">` (baris 71).
  - Modal Konfirmasi `#confirmVerifyModal` (baris 83–97): menampilkan teks konfirmasi `#confirmVerifyText` (baris 90), tombol Batal `data-close-modal="confirmVerifyModal"` (baris 93), dan tombol Konfirmasi `#confirmVerifyBtn` (baris 94).
- **Script `.js` yang Dimuat** (baris 99–100):
  1. [public/js/utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L1-L470)
  2. [public/js/admin.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/admin.js#L1-L551)

#### B. Alur Eksekusi Frontend di `public/js/admin.js`
1. **Inisialisasi Halaman** ([public/js/admin.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/admin.js#L147-L169)):
   - Event `DOMContentLoaded` (baris 548–551) memanggil `initAdminTenantsPage()` (baris 147–169).
   - Memastikan `#tenantsTableBody` ada di halaman, lalu memanggil `await requirePageAuth('ADMIN')` (baris 153).
   - Memasang event listener pada `#filterTenantBtn`, `#filterTenantStatus`, `#filterTenantSearch`, dan `#confirmVerifyBtn`.
   - Memanggil `await loadTenantsVerificationTable()` (baris 168).
2. **Memuat Daftar Penyewa (`loadTenantsVerificationTable`)** ([public/js/admin.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/admin.js#L15-L88)):
   - Membaca filter status dan kata kunci pencarian, lalu memanggil `await apiFetch('/api/admin/tenants?...')` (baris 28).
   - Me-render setiap penyewa ke `#tenantsTableBody` (baris 41–73): menampilkan NIK, Nama Lengkap, Email, No. HP, Tanggal Daftar, Badge Status (`PENDING` / `APPROVED` / `REJECTED`), serta dua tombol aksi:
     - Tombol **Terima** (`data-verify-decision="APPROVED"` — di-disable jika status sudah `APPROVED`).
     - Tombol **Tolak** (`data-verify-decision="REJECTED"` — di-disable jika status sudah `REJECTED`).
3. **Konfirmasi & Eksekusi Verifikasi (`openTenantVerifyConfirmModal` & `executeTenantVerification`)** ([public/js/admin.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/admin.js#L96-L140)):
   - Saat tombol Terima/Tolak diklik, `openTenantVerifyConfirmModal(action)` (baris 96–107) menyimpan `{ userId, decision, name }` ke variabel state `pendingVerificationAction`, mengisi teks konfirmasi di `#confirmVerifyText`, dan membuka modal `#confirmVerifyModal`.
   - Saat Admin menekan tombol konfirmasi `#confirmVerifyBtn`, `executeTenantVerification()` (baris 114–140) memanggil:
     `await apiFetch('/api/admin/tenants/' + userId + '/verify', { method: 'PATCH', body: JSON.stringify({ status: decision }) })`.
   - Menutup modal, menampilkan pesan sukses di `#tenantVerifyAlert`, dan memuat ulang tabel dengan `await loadTenantsVerificationTable()`.

#### C. Alur Eksekusi Backend (`GET /api/admin/tenants` & `PATCH /api/admin/tenants/:userId/verify`)
1. **Endpoint `GET /api/admin/tenants`**:
   - **Route**: [src/routes/api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L37) (`authenticate, adminOnly, auth.listTenants`).
   - **Controller**: `AuthController.listTenants()` ([src/controllers/controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L136-L150)) → `AuthService.listTenants()` ([src/services/AuthService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/AuthService.js#L172-L182)).
   - **Repository**: `UserRepository.listTenants()` ([src/repositories/UserRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/UserRepository.js#L189-L221)) menjalankan query `SELECT ... FROM tenants t JOIN users u ON u.user_id = t.tenant_id` dengan filter dinamis `t.is_verified = ?` dan pencarian `LIKE` pada `full_name`, `nik`, `email`, atau `phone_number`, lalu memetakan tiap baris ke instance class `Tenant`.
2. **Endpoint `PATCH /api/admin/tenants/:userId/verify`**:
   - **Route**: [src/routes/api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L38) (`authenticate, adminOnly, auth.verifyTenant`).
   - **Controller**: `AuthController.verifyTenant()` ([src/controllers/controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L160-L175)).
   - **Service**: `AuthService.verifyTenant(tenantUserId, decision)` ([src/services/AuthService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/AuthService.js#L193-L207)):
     - Memvalidasi `decision` harus `'APPROVED'` atau `'REJECTED'` (baris 195–197).
     - Mengecek apakah user ada dan ber-role `'TENANT'` (baris 199–202).
   - **Repository**: `UserRepository.updateTenantApprovalStatus(userId, approvalStatus)` ([src/repositories/UserRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/UserRepository.js#L230-L243)):
     - Menjalankan `UPDATE tenants SET is_verified = ? WHERE tenant_id = ?` dan mengembalikan profil `Tenant` terbaru.

---

### 5.3. Halaman Perpanjangan Sewa (`public/admin/extensions.html`)

#### A. Struktur HTML & Script yang Dipakai ([public/admin/extensions.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/admin/extensions.html#L1-L128))
- **Elemen Utama di HTML**:
  - `#extTodayLabel` (baris 31): Menampilkan tanggal referensi sistem (`WIB`).
  - `#extensionAlert` (baris 37): Kotak pesan sukses/error perpanjangan sewa.
  - Tabel Sewa Aktif `<tbody id="extActiveRentalsBody">` (baris 56): Daftar penyewaan aktif yang bisa diperpanjang.
  - Panel Form Perpanjangan (baris 67–119):
    - `#extFormPlaceholder` (baris 69–71): Pesan placeholder saat belum ada sewa yang dipilih.
    - `#extFormContainer` (baris 73–118, awalnya `hidden`):
      - `#extSelectedInfo` (baris 74): Ringkasan transaksi sewa yang dipilih.
      - `<form id="extendRentalForm">` (baris 77–106):
        - `<input type="date" id="extNewEndDate">` (baris 80): Input tanggal akhir baru (`> tanggal akhir saat ini`).
        - `<input type="file" id="extPaymentProof">` (baris 92): Input file bukti pembayaran perpanjangan.
        - Tombol submit `#extSubmitBtn` (baris 103).
      - `#extCostPreview` (baris 110): Kotak rincian biaya perpanjangan *real-time*.
      - `#extHistorySection` (baris 116): Tabel riwayat perpanjangan dari transaksi yang sedang dipilih.
- **Script `.js` yang Dimuat** (baris 125–126):
  1. [public/js/utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L1-L470)
  2. [public/js/rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js#L468-L776)

#### B. Alur Eksekusi Frontend di `public/js/rental.js` (Bagian Admin Extension)
1. **Inisialisasi Halaman (`initAdminExtensionsPage`)** ([public/js/rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js#L754-L776)):
   - Event `DOMContentLoaded` (baris 773–776) memanggil `initAdminExtensionsPage()` (baris 754–771).
   - Memastikan elemen `#extActiveRentalsBody` ada di halaman, lalu memanggil `await requirePageAuth('ADMIN')` (baris 760).
   - Memasang event listener `change` dan `input` pada `#extNewEndDate` ke fungsi `updateExtensionCostPreview`, serta event `submit` pada `#extendRentalForm` ke `handleExtensionSubmit`.
   - Memanggil `await loadActiveRentalsForExtension()` (baris 770).
2. **Memuat Daftar Sewa Aktif (`loadActiveRentalsForExtension`)** ([public/js/rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js#L478-L522)):
   - Memanggil `await apiFetch('/api/rentals/active')` (baris 484).
   - Menyimpan daftar sewa aktif ke array `extActiveRentals` dan menampilkan `todayDate` di `#extTodayLabel`.
   - Me-render tabel `#extActiveRentalsBody` beserta tombol **Pilih** (`data-select-ext-rental="${r.id}"`).
3. **Memilih Transaksi Sewa (`selectRentalForExtension`)** ([public/js/rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js#L530-L583)):
   - Menyimpan transaksi yang dipilih ke `selectedExtRental`.
   - Menyembunyikan `#extFormPlaceholder` dan menampilkan `#extFormContainer`.
   - Mengisi `#extSelectedInfo` dengan detail garasi, penyewa, kendaraan, periode sewa saat ini, dan tarif harian garasi.
   - Menghitung batas tanggal minimum (`minDateStr`) yaitu `endDate + 1 hari` menggunakan `Date.UTC` (baris 572–576) dan menyetel `dateInput.min = minDateStr` serta `dateInput.value = minDateStr`.
   - Memanggil `renderExtensionHistoryForSelected(rental)` (baris 591–633) untuk menampilkan riwayat perpanjangan sebelumnya, dan memanggil `await updateExtensionCostPreview()`.
4. **Kalkulasi Preview Biaya Perpanjangan (`updateExtensionCostPreview`)** ([public/js/rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js#L640-L687)):
   - Mengirim `POST /api/rentals/${selectedExtRental.id}/extend/preview` dengan body `{ newEndDate }`.
   - Menampilkan rincian: Tanggal Akhir Sebelumnya, Tanggal Akhir Baru, Tambahan Durasi (`+X hari`), Tarif Harian Garasi (`Rp/hari`), dan Total Biaya Perpanjangan (`additionalDays × dailyRate`), tanpa memungut ulang biaya listrik EV.
5. **Submit Form Perpanjangan (`handleExtensionSubmit`)** ([public/js/rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js#L695-L747)):
   - Memvalidasi bahwa tanggal akhir baru dan file bukti pembayaran sudah diisi.
   - Membungkus `newEndDate` dan `paymentProof` ke objek `FormData`.
   - Mengirim `await apiFetch('/api/rentals/' + selectedExtRental.id + '/extend', { method: 'POST', body: formData })`.
   - Jika berhasil, menampilkan pesan sukses di `#extensionAlert`, memuat ulang tabel sewa aktif (`await loadActiveRentalsForExtension()`), dan memilih kembali transaksi tersebut (`selectRentalForExtension(updatedId)`) agar tanggal akhir dan riwayat perpanjangannya langsung ter-update di layar.

#### C. Alur Eksekusi Backend (`GET /api/rentals/active`, `POST /api/rentals/:id/extend/preview`, `POST /api/rentals/:id/extend`)
1. **Endpoint `GET /api/rentals/active`**:
   - **Route**: [src/routes/api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L51) (`authenticate, adminOnly, rental.getActiveRentals`).
   - **Controller & Service**: `RentalController.getActiveRentals()` ([src/controllers/controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L433-L446)) → `RentalService.getActiveRentalsToday()` ([src/services/RentalService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L398-L403)).
   - **Repository**: `RentalRepository.listActiveOnDate(todayDate)` ([src/repositories/RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L374-L389)) mengambil sewa berstatus `'ACTIVE'` yang `end_date >= todayDate`, diurutkan agar sewa yang sudah dimulai hari ini (`start_date <= todayDate`) muncul paling atas.
2. **Endpoint `POST /api/rentals/:id/extend/preview`**:
   - **Route**: [src/routes/api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L53).
   - **Service**: `RentalService.previewExtensionCost(rentalId, newEndDate)` ([src/services/RentalService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L426-L467)):
     - Memastikan transaksi sewa ditemukan, berstatus `'ACTIVE'`, dan `rental.endDate >= todayDate` (baris 434–440).
     - Memanggil `calculateExtensionFee(rental.endDate, newEndDate, rental.garage.dailyRate)` di [src/utils/rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L511-L553) yang memvalidasi `newEndDate > previousEndDate` dan menghitung `additionalDurationDays = diffDaysExclusive(previousEndDate, newEndDate)` serta `extensionFee = additionalDurationDays × dailyRate`.
     - Mengecek apakah garasi tersebut sudah dibooking penyewa lain pada rentang tanggal perpanjangan menggunakan `rentalRepository.hasOverlappingActiveRental(rental.garageId, rental.startDate, calc.newEndDate, rental.id)` (baris 447–457).
3. **Endpoint `POST /api/rentals/:id/extend`**:
   - **Route**: [src/routes/api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L54) (`authenticate, adminOnly, uploadPaymentProof, rental.extendRental`).
   - **Controller**: `RentalController.extendRental()` ([src/controllers/controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L523-L544)) memvalidasi file upload (`req.file`) dan memanggil `rentalService.extendRental()`.
   - **Service & Transaksi Atomik Repository**:
     - `RentalService.extendRental()` ([src/services/RentalService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L485-L533)) memanggil `previewExtensionCost()`, lalu memanggil `rentalRepository.createExtensionTransactional()` (baris 504–514). Jika transaksi database gagal, file upload dihapus di blok `catch` (baris 517–527).
     - `RentalRepository.createExtensionTransactional()` ([src/repositories/RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L435-L539)) menjalankan `extendTx.immediate()` (`BEGIN IMMEDIATE`):
       1. Mengambil baris `rentals` terbaru dan memvalidasi *optimistic concurrency* (`rental.end_date !== data.previousEndDate` di baris 456–460) agar dua admin tidak memperpanjang sewa yang sama secara bersamaan.
       2. Mengecek ulang bentrok jadwal (`overlap` di baris 462–484).
       3. Menjalankan `INSERT INTO rental_extensions` (baris 486–503).
       4. Menjalankan `UPDATE rentals SET end_date = ? WHERE rental_id = ?` (baris 505–507) — sesuai spesifikasi, `duration_days`, `rental_fee`, `electricity_fee`, dan `total_price` awal pada tabel `rentals` **tidak diubah**.
       5. Memastikan `garages.status = 'USED'` jika periode sewa mencakup hari ini (baris 509–513).

---

### 5.4. Halaman Laporan Penyewaan (`public/admin/reports.html`)

#### A. Struktur HTML & Script yang Dipakai ([public/admin/reports.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/admin/reports.html#L1-L137))
- **Elemen Utama di HTML**:
  - `#reportAlert` (baris 36).
  - 4 Tombol Tab Laporan (`[data-report-tab="monthly" | "daily" | "garageType" | "tenant"]` di baris 38–43).
  - 4 Panel Filter:
    1. `#filterPanel-monthly` (baris 48–54): `#reportMonthlyYear` & `#applyMonthlyFilterBtn`.
    2. `#filterPanel-daily` (baris 57–84): `#reportDailyYear`, `#reportDailyMonth`, checkbox `#reportDailyIncludeEmpty`, & `#applyDailyFilterBtn`.
    3. `#filterPanel-garageType` (baris 87–102): `#reportGarageTypeSelect`, `#reportGarageTypeYear`, & `#applyGarageTypeFilterBtn`.
    4. `#filterPanel-tenant` (baris 105–111): `#reportTenantSearch` & `#applyTenantFilterBtn`.
  - `#reportSummaryCards` (baris 115): Grid 5 kartu KPI ringkasan laporan.
  - Tabel Laporan Dinamis: `<thead id="reportTableHead">`, `<tbody id="reportTableBody">`, dan `<tfoot id="reportTableFoot">` (baris 120–126).
- **Script `.js` yang Dimuat** (baris 134–135):
  1. [public/js/utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L1-L470)
  2. [public/js/admin.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/admin.js#L171-L551)

#### B. Alur Eksekusi Frontend di `public/js/admin.js` (Bagian Reports)
1. **Inisialisasi Halaman (`initAdminReportsPage`)** ([public/js/admin.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/admin.js#L512-L546)):
   - Memastikan `#reportTableBody` ada di halaman, lalu memanggil `await requirePageAuth('ADMIN')` (baris 516).
   - Memanggil `GET /api/rentals/config` (baris 520–530) untuk menyinkronkan input `#reportMonthlyYear`, `#reportDailyYear`, dan `#reportDailyMonth` dengan tahun & bulan waktu server (`WIB`).
   - Memasang event listener pada ke-4 tombol tab (`switchReportTab(tabName)` di baris 490–505) dan ke-4 tombol Terapkan Filter (`loadActiveReport()` di baris 467–482).
   - Memanggil `await loadActiveReport()` (baris 545) yang secara default memuat tab pertama (`monthly`).
2. **Render 5 Kartu KPI (`renderReportSummaryCards`)** ([public/js/admin.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/admin.js#L181-L210)):
   - Menampilkan 5 metrik utama di `#reportSummaryCards`:
     1. Total Transaksi (`summary.totalTransactions`)
     2. Garasi Terpakai (`summary.garagesUsed`)
     3. Pendapatan Sewa Awal (`formatRupiah(summary.rentalRevenue)`)
     4. Pendapatan Perpanjangan (`formatRupiah(summary.extensionRevenue)`)
     5. Total Pendapatan (`formatRupiah(summary.totalRevenue)`).
3. **4 Fungsi Pemuat Laporan Spesifik**:
   - `loadMonthlyReport()` (baris 217–267) → memanggil `GET /api/reports/monthly?year=...` dan me-render 12 baris bulan (Januari–Desember) beserta baris `TOTAL TAHUN`.
   - `loadDailyReport()` (baris 274–334) → memanggil `GET /api/reports/daily?year=...&month=...&includeEmptyDays=...` dan me-render rincian harian beserta jumlah transaksi sewa baru (`newRentalCount`) dan perpanjangan (`extensionCount`).
   - `loadGarageTypeReport()` (baris 341–395) → memanggil `GET /api/reports/garage-type?garageType=...&year=...` dan me-render perbandingan performa `BIKE`, `CAR`, dan `EV` (kapasitas total garasi, garasi pernah disewa, jumlah sewa, pendapatan sewa awal, perpanjangan, dan total).
   - `loadTenantReport()` (baris 402–460) → memanggil `GET /api/reports/tenant?search=...` dan me-render kontribusi setiap penyewa (NIK, nama, email, jumlah sewa, jumlah perpanjangan, garasi unik, dan total kontribusi).

#### C. Alur Eksekusi Backend (`GET /api/reports/monthly`, `daily`, `garage-type`, `tenant`)
- **Routes**: [src/routes/api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L58-L61) (`authenticate, adminOnly`).
- **Controller**: `ReportController` ([src/controllers/controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L573-L678)).
- **Service**: `ReportService` ([src/services/ReportService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/ReportService.js#L12-L138)):
  - Memvalidasi parameter `year` (`2000` s.d. `2100`) di `parseYear()` (baris 34–42) dan `month` (`1` s.d. `12`) di `parseMonth()` (baris 51–59).
  - Memanggil `this.garageRepository.syncStatuses()` sebelum menjalankan agregasi laporan.
- **Repository**: `ReportRepository` ([src/repositories/ReportRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/ReportRepository.js#L71-L641)):
  - Menggunakan helper batas tanggal *SARGable* `getYearRangeBounds(year)` (baris 38–45) dan `getMonthRangeBounds(year, month)` (baris 55–66) agar klausa `WHERE start_date >= ? AND start_date <= ?` dapat memanfaatkan B-Tree Index SQLite (`idx_rentals_start_date` dan `idx_extensions_prev_end_date`) tanpa fungsi `substr()` pada kolom terindeks.
  - **`getMonthlyReport(year)`** (baris 88–203): Mengagregasi `rentals` per bulan berdasarkan `start_date`, mengagregasi `rental_extensions` per bulan berdasarkan `previous_end_date`, dan menghitung jumlah `COUNT(DISTINCT garage_id)` baik per bulan maupun total tahunan.
  - **`getDailyReport(year, month, includeEmptyDays)`** (baris 214–339): Mengagregasi transaksi sewa dan perpanjangan per tanggal (`YYYY-MM-DD`) dalam 1 bulan.
  - **`getGarageTypeReport(filters)`** (baris 351–502): Mengagregasi performa ketiga tipe garasi (`BIKE`, `CAR`, `EV`) dengan `LEFT JOIN` dari `garage_types` ke `garages`, `rentals`, dan `rental_extensions`.
  - **`getTenantReport(filters)`** (baris 513–640): Mengagregasi kontribusi seluruh penyewa yang `APPROVED` dalam sekali query ditambah single-query `distinctGaragesRow` (baris 570–578) untuk menghitung total garasi unik tanpa *N+1 query problem*.

---

## Bagian 6: Alur Logout & Penanganan Error Global

### 6.1. Alur Logout (Semua Halaman Penyewa & Admin)
1. **Frontend** ([public/js/utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L291-L303)):
   - Saat halaman menginisialisasi `requirePageAuth()`, fungsi `initSidebarIdentity(user)` memasang event listener klik pada setiap tombol `#logoutBtn` dan `[data-action="logout"]`.
   - Ketika tombol **Keluar / Logout** diklik:
     - Frontend mengirim `await apiFetch('/api/auth/logout', { method: 'POST' })`.
     - Di blok `finally`, frontend memanggil `clearSession()` (baris 205–208) untuk menghapus `garage_auth_token` dan `garage_auth_user` dari `localStorage`, lalu mengarahkan browser ke `/index.html`.
2. **Backend**:
   - **Route**: `POST /api/auth/logout` ([src/routes/api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L32)) melewati middleware `authenticate` lalu `AuthController.logout()` ([src/controllers/controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L93-L108)).
   - `AuthService.logout(token)` ([src/services/AuthService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/AuthService.js#L139-L141)) memanggil `revokeSession(token)` di [src/middleware/auth.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/auth.js#L71-L75) yang menghapus token tersebut dari `sessionStore` (`Map` di memori server), serta `res.clearCookie('token')` untuk menghapus cookie sesi.

### 6.2. Alur Penanganan Error Global (`notFoundHandler` & `errorHandler`)
Setiap error yang dilempar dari lapisan mana pun (`validators.js`, `rentalMath.js`, `Service`, `Repository`, `Controller`, atau `Multer`) ditangkap oleh `asyncHandler(fn)` ([src/middleware/common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L92-L96)) dan diteruskan ke `errorHandler` ([src/middleware/common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L186-L216)):
1. Jika error berasal dari **Multer** (`err instanceof multer.MulterError`):
   - Jika kode `LIMIT_FILE_SIZE`, mengembalikan HTTP `400` dengan pesan `"Ukuran file bukti pembayaran melebihi batas maksimum (5MB)."`
2. Jika error merupakan instance **`AppError`** (baris 198–206):
   - Mengembalikan HTTP `err.statusCode` (`400`, `401`, `403`, `404`, atau `409`) dengan JSON `{ success: false, message: err.message, details: err.details }`.
3. Jika error tidak terduga (baris 209–215):
   - Mencetak log ke `console.error('[UNHANDLED ERROR]', err)` dan mengembalikan HTTP `500` dengan JSON `{ success: false, message: 'Terjadi kesalahan internal pada server.' }`.
