# Bank Pertanyaan & Jawaban Lengkap Sidang Uji Kompetensi Pemrogram (UK 1 – UK 9)

> [!IMPORTANT]
> Dokumen ini memuat **125 pertanyaan dan jawaban teknis mendalam** yang disusun persis mengikuti **9 Unit Kompetensi (UK 1 s/d UK 9)** beserta seluruh **Elemen** dan **Kriteria Unjuk Kerja (KUK)** pada skema sertifikasi **Pemrogram**. Setiap jawaban dilengkapi dengan **tautan file dan nomor baris kode aktual** dari repositori Anda saat ini.

---

## UNIT KOMPETENSI 1 — Menggunakan Spesifikasi Program (`J.620100.009.02`)

### Elemen 1: Menggunakan Metode Pengembangan Program (KUK 1.1 – 1.2)

#### Q1. (KUK 1.1) Apa metode pengembangan perangkat lunak (SDLC) yang Anda definisikan dalam membangun aplikasi Garage Rental Management System ini?
- **Jawaban:** Saya menggunakan metode **Iterative & Incremental Waterfall (atau Prototyping Terstruktur)** yang dibagi ke dalam 5 tahapan berurutan:
  1. **Requirement Analysis**: Menganalisis spesifikasi kebutuhan pada dokumen soal uji praktik (`FR.IA.04A. DIT`).
  2. **System & Database Design**: Merancang Use Case Diagram ([use-case.puml](file:///c:/Users/zeusd/Documents/GitHub/MKR/docs/diagrams/use-case.puml)), Class Diagram ([class-diagram.puml](file:///c:/Users/zeusd/Documents/GitHub/MKR/docs/diagrams/class-diagram.puml)), dan ERD 8 tabel ([erd.puml](file:///c:/Users/zeusd/Documents/GitHub/MKR/docs/diagrams/erd.puml)).
  3. **Implementation**: Membangun skema SQLite ([db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L54-L188)), model OOP ([entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js)), utilitas kalkulasi ([rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js)), repository, service, controller, dan frontend.
  4. **Unit & Integration Testing**: Menguji logika bisnis secara White Box ([businessLogic.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/unit/businessLogic.test.js)) dan API secara Black Box ([api.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/integration/api.test.js)).
  5. **Refinement & Documentation**: Menyempurnakan validasi, optimasi query, dan dokumentasi JSDoc/Markdown.

#### Q2. (KUK 1.2) Mengapa metode pengembangan tersebut dipilih dibandingkan metode lain untuk proyek ini?
- **Jawaban:** Karena spesifikasi kebutuhan bisnis sudah ditetapkan secara lengkap dan tertulis sejak awal di dalam dokumen `FR.IA.04A. DIT` serta memiliki batas waktu pengerjaan tetap (**40 jam**). Dengan spesifikasi yang sudah jelas (3 tipe garasi, rumus bulanan `25×`, aturan kompatibilitas, dan 4 jenis laporan), perancangan skema database 8 tabel dan diagram UML harus dikunci di awal sebelum menulis kode, lalu diverifikasi secara iteratif menggunakan automated test (`npm test`).

#### Q3. (KUK 1.1–1.2) Bagaimana Anda menerjemahkan spesifikasi aturan bisnis dari dokumen soal menjadi konstanta terpusat di dalam kode?
- **Lokasi Kode:** [constants.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/constants.js#L6-L86)
- **Jawaban:** Seluruh aturan domain dikonversi menjadi konstanta *immutable* menggunakan `Object.freeze()` di [constants.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/constants.js#L6-L86):
  - Dua role pengguna: `USER_ROLES` (`ADMIN`, `TENANT`) pada baris `6–9`.
  - Status verifikasi penyewa: `APPROVAL_STATUS` (`PENDING`, `APPROVED`, `REJECTED`) pada baris `11–15`.
  - Tiga tipe garasi, ID tipe, dan prefix kode: `GARAGE_TYPES` (`BIKE`, `CAR`, `EV`), `GARAGE_TYPE_IDS` (`1, 2, 3`), dan `GARAGE_TYPE_PREFIX` (`S`, `C`, `E`) pada baris `17–33`.
  - Matriks kompatibilitas kendaraan–garasi: `VEHICLE_GARAGE_COMPATIBILITY` pada baris `60–65`.
  - Pengali harga sewa bulanan `MONTHLY_RATE_MULTIPLIER = 25` pada baris `77` dan batas unit `MAX_GARAGES_PER_TYPE = 999` pada baris `78`.

---

### Elemen 2: Menggunakan Diagram Program dan Deskripsi Program (KUK 2.1 – 2.2)

#### Q4. (KUK 2.1) Diagram apa saja yang Anda definisikan untuk memodelkan sistem dan di mana file sumbernya disimpan?
- **Lokasi Kode:**
  1. **Use Case Diagram**: [use-case.puml](file:///c:/Users/zeusd/Documents/GitHub/MKR/docs/diagrams/use-case.puml#L1-L64) dan [sertifikasi-USE CASE.png](file:///c:/Users/zeusd/Documents/GitHub/MKR/UML/sertifikasi-USE%20CASE.png)
  2. **Class Diagram**: [class-diagram.puml](file:///c:/Users/zeusd/Documents/GitHub/MKR/docs/diagrams/class-diagram.puml#L1-L178)
  3. **Entity-Relationship Diagram (ERD)**: [erd.puml](file:///c:/Users/zeusd/Documents/GitHub/MKR/docs/diagrams/erd.puml#L1-L100) dan [sertifikasi-ERD.png](file:///c:/Users/zeusd/Documents/GitHub/MKR/UML/sertifikasi-ERD.png)
- **Jawaban:** Use Case Diagram memodelkan kebutuhan fungsional dari sudut pandang aktor `Admin` dan `Penyewa`; Class Diagram memodelkan struktur kelas OOP (9 entitas domain dan 4 kelas service beserta relasi pewarisan, komposisi, dan asosiasi); ERD memodelkan struktur 8 tabel basis data relasional beserta `PK`, `FK`, `UNIQUE`, dan kardinalitasnya.

#### Q5. (KUK 2.2) Bagaimana Use Case `Create Garage Batch <<include>> Generate Garage ID` direalisasikan ke dalam komponen kode program?
- **Lokasi Kode:**
  - Route: [api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L41) (`POST /api/garages/batch`)
  - Controller: `GarageController.createBatch()` di [controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L203-L225)
  - Service: `GarageService.createGarageBatch()` di [GarageService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/GarageService.js#L90-L152)
  - Repository & Generator ID (`<<include>>`): `GarageRepository.createGarageBatch()` di [GarageRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/GarageRepository.js#L150-L233) yang memanggil `sequence.generateNextId()` pada baris `200` (didefinisikan di `GarageSequence.generateNextId()` pada [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L262-L271)).

#### Q6. (KUK 2.2) Bagaimana Use Case `Create New Rental` beserta 5 relasi `<<include>>`-nya (`Select Vehicle`, `Validate Vehicle Compatibility`, `View Available Garage`, `Calculate Rent Cost`, `Upload Payment Proof`) diterapkan di source code?
- **Lokasi Kode:**
  1. **Select Vehicle**: Input form di [new-rental.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/tenant/new-rental.html#L48-L110), handler `handleVehicleTypeChange()` di [rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js#L17-L57), dan instansiasi/validasi `new Vehicle(...).validate()` di [RentalService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L285-L293) serta [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L398-L445).
  2. **Validate Vehicle Compatibility**: Fungsi `validateVehicleCompatibility()` di [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L284-L296), dipanggil via `vehicle.validateCompatibility(garage.garageType)` di [RentalService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L311).
  3. **View Available Garage**: Endpoint `GET /api/garages/available` → `GarageService.getAvailableGarages()` di [GarageService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/GarageService.js#L221-L275) → `GarageRepository.findAvailableForPeriod()` di [GarageRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/GarageRepository.js#L443-L471).
  4. **Calculate Rent Cost**: Fungsi `calculateTotalRentalCost()` di [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L455-L478), dipanggil di `RentalService.previewRentalCost()` ([RentalService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L215-L224)) dan `RentalService.createRental()` ([RentalService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L313-L322)).
  5. **Upload Payment Proof**: Middleware `uploadPaymentProof` di [common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L50-L152), dipasang pada rute `POST /api/rentals` di [api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L49).

#### Q7. (KUK 2.2) Bagaimana Use Case `Verify Tenant Registration` (`Approve Tenant` / `Reject Tenant`) diterapkan di kode?
- **Lokasi Kode:**
  - Frontend: `loadTenantsVerificationTable()`, `openTenantVerifyConfirmModal()`, dan `executeTenantVerification()` di [admin.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/admin.js#L15-L140).
  - Route & Middleware: `GET /api/admin/tenants` dan `PATCH /api/admin/tenants/:userId/verify` dengan guard `authenticate, adminOnly` di [api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L37-L38).
  - Controller: `AuthController.listTenants()` dan `AuthController.verifyTenant()` di [controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L136-L175).
  - Service & Repository: `AuthService.verifyTenant()` di [AuthService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/AuthService.js#L193-L207) → `UserRepository.updateTenantApprovalStatus()` di [UserRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/UserRepository.js#L230-L243).

#### Q8. (KUK 2.2) Bagaimana Use Case `Extend Rental` beserta `<<include>> Calculate Extension Cost` dan `Upload Extension Payment` diterapkan di kode?
- **Lokasi Kode:**
  - Frontend: `loadActiveRentalsForExtension()`, `updateExtensionCostPreview()`, dan `handleExtensionSubmit()` di [rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js#L478-L747).
  - Route: `POST /api/rentals/:id/extend/preview` dan `POST /api/rentals/:id/extend` di [api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L53-L54).
  - Service: `RentalService.previewExtensionCost()` dan `RentalService.extendRental()` di [RentalService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L426-L533).
  - Kalkulasi: `calculateExtensionFee()` di [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L511-L553).
  - Transaksi DB: `RentalRepository.createExtensionTransactional()` di [RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L435-L539).

#### Q9. (KUK 2.2) Bagaimana hubungan antar-kelas pada Class Diagram (`class-diagram.puml`) dipetakan ke kode di `src/models/entities.js` dan `src/services/`?
- **Lokasi Kode:** [class-diagram.puml](file:///c:/Users/zeusd/Documents/GitHub/MKR/docs/diagrams/class-diagram.puml#L153-L177) dan [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L37-L716)
- **Jawaban:**
  - **Generalization / Inheritance (`User <|-- Tenant`, `User <|-- Admin`)**: Diimplementasikan pada `class Tenant extends User` ([entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L83)) dan `class Admin extends User` ([entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L144)).
  - **Composition (`Rental "1" *-- "1" Vehicle`)**: Diimplementasikan pada constructor `Rental` baris `586`: `this.vehicle = vehicle instanceof Vehicle ? vehicle : new Vehicle(vehicle);` di [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L586).
  - **Aggregation / Association (`Rental "1" -- "0..*" RentalExtension`)**: Diimplementasikan melalui properti `this.extensions = extensions` (array objek `RentalExtension`) pada constructor `Rental` baris `599` di [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L599).
  - **Dependency (`Service ..> Entity`)**: Keempat kelas service (`AuthService`, `GarageService`, `RentalService`, `ReportService`) menerima repository melalui constructor (*Dependency Injection*) di [app.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/app.js#L80-L100).

---

### Elemen 3: Menerapkan Hasil Pemodelan ke dalam Pengembangan Program (KUK 3.1 – 3.2)

#### Q10. (KUK 3.1) Bagaimana hasil pemodelan ERD 8 tabel diterapkan langsung menjadi DDL SQLite?
- **Lokasi Kode:** `initializeSchema(db)` di [db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L54-L188)
- **Jawaban:** Setiap entitas pada [erd.puml](file:///c:/Users/zeusd/Documents/GitHub/MKR/docs/diagrams/erd.puml#L6-L86) diterjemahkan menjadi statement `CREATE TABLE IF NOT EXISTS` pada `db.exec(...)` di [db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L57-L165), lengkap dengan constraint `PRIMARY KEY`, `FOREIGN KEY ... ON DELETE CASCADE/RESTRICT`, `UNIQUE`, dan `CHECK` untuk menggantikan tipe `ENUM` di SQLite.

#### Q11. (KUK 3.1) Mengapa fungsi `createApp()` di `src/app.js` dirancang sebagai *Composition Root* yang menerima parameter `{ db, clock, uploadDir, jwtSecret }`?
- **Lokasi Kode:** [app.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/app.js#L63-L162)
- **Jawaban:** Agar hasil pemodelan berlapis (*Repository → Service → Controller → Route*) tidak saling bergantung pada state global (*tight coupling*). Saat aplikasi produksi berjalan dari [server.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/server.js#L16-L19), `createApp({ db })` menggunakan database file `./data/garage-rental.db` dan jam sistem nyata; sedangkan saat pengujian di [api.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/integration/api.test.js#L116-L121), `createApp` dapat diinjeksi database `:memory:`, direktori upload sementara `os.tmpdir()`, dan `clock` deterministik.

#### Q12. (KUK 3.2) IDE, runtime, dan perkakas bantu apa yang digunakan untuk mendukung metodologi bahasa pemrograman JavaScript pada proyek ini?
- **Lokasi Kode:** [package.json](file:///c:/Users/zeusd/Documents/GitHub/MKR/package.json#L6-L32)
- **Jawaban:**
  - **IDE**: Visual Studio Code dengan dukungan IntelliSense berbasis JSDoc (`@param`, `@returns`, `@type`).
  - **Runtime**: Node.js (mendukung fitur built-in `node --watch server.js` pada script `npm run dev` di [package.json](file:///c:/Users/zeusd/Documents/GitHub/MKR/package.json#L8), serta modul native `crypto.randomUUID()`, `Intl.DateTimeFormat`, `fs`, dan `path`).
  - **Test Runner**: Vitest (`npm test`) untuk verifikasi otomatis.

---

## UNIT KOMPETENSI 2 — Menulis Kode dengan Prinsip Sesuai Guidelines dan Best Practices (`J.620100.016.01`)

### Elemen 1: Menerapkan Coding-Guidelines dan Best Practices (KUK 1.1 – 1.3)

#### Q13. (KUK 1.1) Konvensi penamaan (*naming convention*) apa yang Anda terapkan secara konsisten di seluruh kode sumber?
- **Jawaban:**
  - **`PascalCase`** untuk nama Class dan Constructor: `AuthService`, `GarageRepository`, `RentalExtension`, `ValidationError` ([entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js), [constants.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/constants.js#L90-L172)).
  - **`camelCase`** untuk variabel, properti objek JavaScript, dan fungsi/method: `calculateExtensionFee`, `validateRentalDuration`, `getTodayInJakarta` ([rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js)).
  - **`UPPER_SNAKE_CASE`** untuk konstanta global yang di-freeze: `USER_ROLES`, `MONTHLY_RATE_MULTIPLIER`, `MAX_GARAGES_PER_TYPE` ([constants.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/constants.js#L6-L85)).
  - **`snake_case`** untuk nama tabel dan kolom SQLite sesuai konvensi SQL: `user_id`, `garage_types`, `daily_rate`, `previous_end_date` ([db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L58-L153)).

#### Q14. (KUK 1.1) Mengapa seluruh objek konstanta di `src/utils/constants.js` dibungkus dengan `Object.freeze()`?
- **Lokasi Kode:** [constants.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/constants.js#L6-L85)
- **Jawaban:** Di JavaScript, deklarasi `const` pada sebuah objek hanya mencegah *reassignment* referensi variabelnya, tetapi properti di dalamnya masih bisa diubah (*mutable*). Dengan `Object.freeze()`, properti objek (termasuk nested array pada `VEHICLE_GARAGE_COMPATIBILITY` di baris `60–65`) dikunci agar tidak dapat dimodifikasi secara tidak sengaja saat runtime.

#### Q15. (KUK 1.2) Bagaimana Anda memisahkan paradigma Pemrograman Terstruktur dan Pemrograman Berorientasi Objek agar struktur program rapi (*Separation of Concerns*)?
- **Jawaban:**
  - **Pemrograman Terstruktur (*Pure Functions*)** ditempatkan di `src/utils/` ([rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js) dan [validators.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/validators.js)). Fungsi-fungsi ini tidak memiliki state internal maupun ketergantungan database (input masuk → output keluar secara deterministik), sehingga sangat mudah diuji secara unit test.
  - **Pemrograman Berorientasi Objek (OOP)** ditempatkan pada `src/models/entities.js` (9 entitas domain), `src/repositories/` (4 class repository akses DB), `src/services/` (4 class service orkestrasi bisnis), dan `src/controllers/controllers.js` (4 class HTTP controller).

#### Q16. (KUK 1.2) Mengapa di constructor setiap class Controller (`AuthController`, `GarageController`, `RentalController`, `ReportController`) terdapat pemanggilan `.bind(this)` seperti `this.login = this.login.bind(this)`?
- **Lokasi Kode:** [controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L23-L31), [L187-L193](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L187-L193), [L322-L336](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L322-L336), [L579-L585](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L579-L585)
- **Jawaban:** Ketika method class diteruskan sebagai callback ke Express Router (misalnya `router.post('/auth/login', auth.login)` di [api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L32)), JavaScript akan kehilangan konteks `this` (`this` menjadi `undefined`) saat Express memanggil handler tersebut. Dengan `.bind(this)` di constructor, konteks `this` selalu terkunci ke instance controller sehingga `this.authService` atau `this.rentalService` tetap dapat diakses.

#### Q17. (KUK 1.3) Bagaimana arsitektur penanganan galat (*error handling*) dirancang di aplikasi Anda?
- **Lokasi Kode:**
  - Hierarki kelas error: [constants.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/constants.js#L90-L172)
  - Middleware global: `errorHandler` dan `notFoundHandler` di [common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L164-L219)
- **Jawaban:** Saya membuat kelas dasar `AppError extends Error` yang menyimpan `this.statusCode`, lalu menurunkannya menjadi 5 kelas error spesifik sesuai semantik HTTP:
  1. `ValidationError` → HTTP `400 Bad Request` (baris `107–116`)
  2. `AuthenticationError` → HTTP `401 Unauthorized` (baris `121–130`)
  3. `ForbiddenError` → HTTP `403 Forbidden` (baris `135–144`)
  4. `NotFoundError` → HTTP `404 Not Found` (baris `149–158`)
  5. `ConflictError` → HTTP `409 Conflict` (baris `163–172`)
  Setiap error yang dilempar di lapisan `utils`, `models`, `repositories`, atau `services` ditangkap oleh blok `try { ... } catch (err) { next(err); }` di Controller dan diproses terpusat oleh `errorHandler` di [common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L164-L205).

#### Q18. (KUK 1.3) Jelaskan baris demi baris apa yang dilakukan fungsi `errorHandler(err, req, res, _next)` di `src/middleware/common.js` baris 164–205!
- **Lokasi Kode:** [common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L164-L205)
- **Jawaban:**
  1. **Baris 165–167**: `if (req.file && req.file.path) { safeUnlink(req.file.path); }` — Jika request gagal *setelah* Multer sempat menyimpan file bukti bayar ke disk (misalnya gagal karena validasi bisnis atau garasi bentrok di service/repository), file yatim (*orphan file*) langsung dihapus dari disk agar tidak memenuhi storage.
  2. **Baris 169–179**: `if (err instanceof AppError)` — Mengembalikan respons JSON `{ success: false, message: err.message }` dengan kode status HTTP `err.statusCode` (400/401/403/404/409).
  3. **Baris 181–187**: `if (err.code.startsWith('SQLITE_CONSTRAINT'))` — Menangkap pelanggaran constraint level database SQLite yang lolos dan mengubahnya menjadi HTTP `409 Conflict` tanpa membocorkan struktur tabel internal.
  4. **Baris 189–195**: `if (err.type === 'entity.parse.failed')` — Menangkap JSON body yang rusak (*malformed JSON*) dari `express.json()` dan mengembalikan HTTP `400`.
  5. **Baris 197–204**: Mencatat error tak terduga ke `console.error('[ServerError]', err)` (kecuali saat `NODE_ENV === 'test'`) dan mengembalikan pesan generik HTTP `500` agar stack trace internal tidak bocor ke klien.

#### Q19. (KUK 1.3) Mengapa parameter keempat `_next` tetap harus ditulis pada `function errorHandler(err, req, res, _next)` meskipun tidak dipanggil di dalam fungsi?
- **Lokasi Kode:** [common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L164)
- **Jawaban:** Express.js mengenali sebuah middleware sebagai **Error-Handling Middleware** semata-mata dari jumlah parameternya (`function.length === 4`, yaitu `(err, req, res, next)`). Jika parameter `_next` dihapus sehingga hanya tersisa 3 parameter, Express akan menganggapnya sebagai middleware biasa dan tidak akan meneruskan `next(err)` ke fungsi tersebut.

---

### Elemen 2: Menggunakan Ukuran Performansi dan Kemudahan Interaksi (KUK 2.1 – 2.2)

#### Q20. (KUK 2.1) Bagaimana Anda mengoptimalkan efisiensi penggunaan resource database pada fungsi `syncStatuses(todayDate)` di `src/repositories/GarageRepository.js`?
- **Lokasi Kode:** `needsStatusSync(todayDate)` dan `syncStatuses(todayDate)` di [GarageRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/GarageRepository.js#L242-L369)
- **Jawaban:** Karena `syncStatuses()` dipanggil pada setiap request pembacaan (`GET /api/garages`, `GET /api/rentals/active`, `GET /api/reports/*`), jika langsung membuka transaksi tulis `BEGIN IMMEDIATE` setiap saat, SQLite akan mengalami *write-lock contention*. Oleh karena itu, pada baris `300`, `syncStatuses()` memanggil `this.needsStatusSync(todayDate)` terlebih dahulu (baris `242–288`) yang melakukan pengecekan `SELECT EXISTS (...)` bersifat **read-only** (tanpa write lock). Transaksi tulis `syncTx.immediate(todayDate)` pada baris `309–368` hanya dijalankan apabila benar-benar ada rental yang baru kedaluwarsa atau status garasi yang belum sinkron.

#### Q21. (KUK 2.1) Bagaimana Anda mencegah masalah performa **N+1 Query** saat mengambil daftar transaksi penyewaan beserta riwayat perpanjangannya?
- **Lokasi Kode:** `getExtensionsMapForRentals(rentalIds)` dan `mapRentalRowsWithExtensions(rows)` di [RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L117-L173)
- **Jawaban:** Alih-alih menjalankan query `SELECT * FROM rental_extensions WHERE rental_id = ?` satu per satu di dalam loop untuk setiap baris rental (yang menghasilkan $N+1$ query jika ada $N$ transaksi rental), `mapRentalRowsWithExtensions()` mengumpulkan seluruh `rentalIds` ke dalam satu array (baris `168`), lalu `getExtensionsMapForRentals()` mengeksekusi **1 query batch tunggal** menggunakan klausa `WHERE re.rental_id IN (?, ?, ...)` (baris `123–134`) dan mengelompokkannya di memori menggunakan `Map` (`O(1)` lookup). Dengan cara ini, berapa pun jumlah transaksi rental, jumlah query ke database tetap konstan (**2 query**, bukan $N+1$).

#### Q22. (KUK 2.1) Bagaimana Anda memastikan query laporan bulanan dan harian di `ReportRepository.js` efisien menggunakan index (*SARGable query*)?
- **Lokasi Kode:** `getYearRangeBounds(year)` dan `getMonthRangeBounds(year, month)` di [ReportRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/ReportRepository.js#L38-L66), digunakan pada baris `98, 109, 227, 238, 362–365`.
- **Jawaban:** Jika klausa `WHERE` menggunakan fungsi string seperti `WHERE substr(start_date, 1, 4) = '2026'`, engine SQLite tidak dapat menggunakan index B-tree `idx_rentals_dates` secara optimal (*non-SARGable* / full scan). Oleh karena itu, saya membuat fungsi pembantu `getYearRangeBounds()` dan `getMonthRangeBounds()` yang menghasilkan rentang setengah terbuka `[start, endExclusive)` (contoh tahun 2026: `start_date >= '2026-01-01' AND start_date < '2027-01-01'`), sehingga query menjadi **SARGable** (*Search Argument Able*) dan langsung memanfaatkan B-tree index range scan pada `idx_rentals_dates` serta `idx_extensions_created_at`.

#### Q23. (KUK 2.1) Bagaimana Anda membatasi ukuran payload request agar memori server dan disk tidak habis (*resource exhaustion*)?
- **Lokasi Kode:** [app.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/app.js#L122-L123) dan [common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L55) & [L90-L94](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L90-L94)
- **Jawaban:**
  1. Payload JSON dan URL-encoded dibatasi maksimal `1mb` melalui `express.json({ limit: '1mb' })` dan `express.urlencoded({ extended: true, limit: '1mb' })` di [app.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/app.js#L122-L123).
  2. File unggahan gambar bukti pembayaran dibatasi maksimal **1 file** dengan ukuran maksimal **5 MB** (`5 * 1024 * 1024` byte) pada konfigurasi `multer({ limits: { fileSize: maxFileSizeBytes, files: 1 } })` di [common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L55-L94).

#### Q24. (KUK 2.2) Standar kemudahan interaksi (UI/UX) dan aksesibilitas apa saja yang Anda terapkan pada kode frontend?
- **Lokasi Kode:** [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L152-L230) dan [rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js#L17-L91)
- **Jawaban:**
  1. **Live Cost & Date Preview**: Setiap perubahan tipe kendaraan, tipe garasi, tanggal mulai, durasi, atau persentase baterai EV langsung memperbarui tanggal selesai dan rincian biaya secara otomatis lewat `updateRentalCostPreview()` ([rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js#L205-L292)) dan `updateExtensionCostPreview()` ([rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js#L640-L687)).
  2. **Dynamic Form Fields**: Input plat nomor otomatis disembunyikan untuk `Sepeda`, dan input kapasitas/persen baterai otomatis muncul hanya untuk `Mobil Listrik` (`handleVehicleTypeChange()` di [rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js#L17-L57)).
  3. **Feedback Visual Berlapis & Aksesibilitas**: Menyediakan notifikasi *toast* mengambang dengan atribut ARIA `aria-live="polite"` dan `role="status"` (`showToast()` di [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L152-L176)), auto-scroll alert (`showAlert()` baris `219–230`), *flash notice* lintas halaman menggunakan `sessionStorage` (`setFlashNotice()` & `consumeFlashNotice()` baris `185–209`), serta penonaktifan tombol submit (`submitBtn.disabled = true`) saat request berlangsung untuk mencegah *double-submit*.

#### Q25. (KUK 1.1 & 2.2) Mengapa setiap data dinamis yang dirender ke `innerHTML` di frontend selalu melewati fungsi `escapeHtml(value)` di `public/js/utils.js`?
- **Lokasi Kode:** `escapeHtml(value)` di [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L26-L36)
- **Jawaban:** Untuk mencegah serangan **DOM-based / Stored Cross-Site Scripting (XSS)**. Apabila seorang penyewa memasukkan karakter HTML/script berbahaya pada nama lengkap, merek, atau model kendaraan (misalnya `<img src=x onerror=alert(1)>`), `escapeHtml()` mengubah `&`, `<`, `>`, `"`, dan `'` menjadi entitas HTML (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`) sehingga browser menampilkannya sebagai teks biasa, bukan mengeksekusinya sebagai kode JavaScript.

---

## UNIT KOMPETENSI 3 — Mengimplementasikan Pemrograman Terstruktur (`J.620100.017.02`)

### Elemen 1: Menggunakan Tipe Data dan Control Program (KUK 1.1 – 1.3)

#### Q26. (KUK 1.1) Mengapa seluruh kolom nominal uang (`daily_rate`, `er_per_kwh`, `rental_fee`, `electricity_fee`, `total_price`, `extension_fee`) menggunakan tipe data `INTEGER` di SQLite dan dibulatkan dengan `roundCurrency()` di JavaScript?
- **Lokasi Kode:** [db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L86-L87), [L131-L133](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L131-L133), [L148](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L148), dan `roundCurrency(amount)` di [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L307-L312)
- **Jawaban:** Tipe angka pecahan standar JavaScript (`Number` IEEE-754 floating-point) maupun `REAL` di SQLite rentan mengalami galat presisi desimal (contoh klasik: `0.1 + 0.2 === 0.30000000000000004`), terutama saat menghitung persentase pengisian baterai mobil listrik seperti `batteryCapacityKwh * ((100 - percent) / 100) * electricityRatePerKwh`. Karena mata uang Rupiah dalam transaksi ini bernilai bulat, `roundCurrency()` memvalidasi `Number.isFinite(amount)` lalu membulatkannya dengan `Math.round(amount)` menjadi integer sebelum disimpan ke kolom `INTEGER` di SQLite.

#### Q27. (KUK 1.1) Mengapa kolom `nik` dan `phone_number` disimpan dengan tipe data `TEXT` (String), bukan `INTEGER`, meskipun NIK berisi 16 digit angka?
- **Lokasi Kode:** [db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L74-L76) dan `validateNik(nik)` / `validatePhone(phone)` di [validators.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/validators.js#L33-L69)
- **Jawaban:** Karena NIK dan nomor telepon adalah **kode pengenal (identifier)**, bukan besaran numerik yang dijumlahkan/dikalikan. Jika disimpan sebagai angka:
  1. Angka `0` di depan (*leading zero*, seperti `0812...` pada nomor telepon atau kode wilayah NIK yang diawali `0`) akan hilang.
  2. Angka 16 digit mendekati batas `Number.MAX_SAFE_INTEGER` di JavaScript ($9.007 \times 10^{15}$), sehingga jika melampaui batas tersebut digit terakhir akan mengalami pembulatan otomatis yang merusak data NIK.

#### Q28. (KUK 1.1 & 1.2) Mengapa tanggal disimpan sebagai string berformat ISO `YYYY-MM-DD` (`TEXT`) dan bagaimana cara sistem mengambil tanggal hari ini pada zona waktu `Asia/Jakarta` (WIB)?
- **Lokasi Kode:** `getTodayInJakarta(now)` dan `getJakartaTimestamp(now)` di [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L202-L242)
- **Jawaban:**
  1. Format `YYYY-MM-DD` memiliki urutan leksikografis yang identik dengan urutan kronologis, sehingga operator perbandingan SQL (`start_date <= ?`, `end_date >= ?`, `ORDER BY start_date ASC`) dan index B-tree bekerja secara akurat dan cepat.
  2. Jika menggunakan `new Date().toISOString().slice(0, 10)`, waktu yang diambil adalah UTC, sehingga antara pukul `00:00` s/d `06:59` pagi WIB tanggalnya masih tertinggal 1 hari (kemarin). Oleh karena itu, `getTodayInJakarta()` menggunakan `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)` untuk mengekstrak tahun, bulan, dan tanggal tepat menurut jam WIB (`UTC+7`).

#### Q29. (KUK 1.2) Mengapa pada `getJakartaTimestamp(now)` di `src/utils/rentalMath.js` baris 240 terdapat pengecekan `const hour = get('hour') === '24' ? '00' : get('hour')`?
- **Lokasi Kode:** [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L224-L242)
- **Jawaban:** Pada beberapa implementasi mesin V8 / ICU untuk locale `en-GB` dengan `hour12: false`, waktu tengah malam (`00:xx:xx`) terkadang diformat oleh `Intl.DateTimeFormat` sebagai pukul `'24'`. Pengecekan ternary tersebut menormalisasi `'24'` menjadi `'00'` agar string ISO-8601 yang dihasilkan (`YYYY-MM-DDTHH:mm:ss+07:00`) selalu valid sesuai standar.

---

### Elemen 2: Membuat Program Sederhana, Percabangan, dan Pengulangan (KUK 2.1 – 2.2)

#### Q30. (KUK 2.1) Bagaimana mekanisme masukan (*input*) dari pengguna dan keluaran (*output*) ke layar monitor bekerja secara end-to-end pada fitur Sewa Garasi Baru?
- **Lokasi Kode:**
  - Input DOM: `handleCreateRentalSubmit(event)` di [rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js#L302-L414)
  - Pengiriman HTTP: `apiRequest('/api/rentals', { method: 'POST', body: formData })` di [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L108-L141)
  - Pembacaan di Backend: `RentalController.createRental(req, res, next)` di [controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L387-L403)
  - Output ke Layar: `showAlert()`, `showToast()`, dan `buildRentalDetailHtml(rental)` di [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L152-L426).

#### Q31. (KUK 2.2) Jelaskan algoritma fungsi `isLeapYear(year)` dan `getDaysInMonth(year, month)` di `src/utils/rentalMath.js` baris 33–56!
- **Lokasi Kode:** [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L33-L56)
- **Jawaban:**
  - Pada `isLeapYear(year)` (baris `33–38`): memeriksa apakah `year` adalah bilangan bulat antara `1..9999`, lalu menerapkan aturan kalender Gregorian `(year % 4 === 0 && year % 100 !== 0) || year % 400 === 0` (habis dibagi 4 dan tidak habis dibagi 100, kecuali habis dibagi 400 seperti tahun 2000 atau 2400).
  - Pada `getDaysInMonth(year, month)` (baris `48–56`): memanfaatkan `new Date(Date.UTC(year, month, 0)).getUTCDate()`. Karena bulan pada `Date.UTC` berbasis indeks 0 (`0 = Januari`, `1 = Februari`, dst.), pemberian nilai `month` (1–12) dengan hari ke-`0` secara otomatis menunjuk ke **hari terakhir dari bulan `month` tersebut** dalam UTC (mengembalikan 28 untuk Feb non-kabisat, 29 untuk Feb kabisat, 30, atau 31).

#### Q32. (KUK 2.2) Mengapa `parseDateParts(dateStr)` di `src/utils/rentalMath.js` baris 65–80 tidak cukup hanya menggunakan `new Date(dateStr)` bawaan JavaScript?
- **Lokasi Kode:** [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L65-L80)
- **Jawaban:** Karena `new Date('2026-02-29')` atau `new Date('2026-04-31')` di JavaScript tidak melempar error, melainkan diam-diam melakukan *rollover* ke tanggal `2026-03-01` atau `2026-05-01`! Dengan `parseDateParts()`, string diuji dulu menggunakan regex `/^(\d{4})-(\d{2})-(\d{2})$/`, lalu nilai `day` divalidasi secara ketat terhadap `getDaysInMonth(year, month)` (baris `76`). Jika tanggal kalender tidak sah (seperti 29 Februari pada tahun non-kabisat 2026), fungsi langsung melempar `ValidationError`.

#### Q33. (KUK 2.2) Jelaskan rumus dan alur fungsi `calculateEndDate(startDate, durationDays)` serta `addDays(dateStr, days)` di `src/utils/rentalMath.js`!
- **Lokasi Kode:** [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L105-L115) dan [L157-L163](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L157-L163)
- **Jawaban:**
  - Karena hari pertama sewa (`startDate`) dihitung secara **inklusif** sebagai hari ke-1, maka tanggal selesai dihitung dengan rumus:
    $$\text{endDate} = \text{startDate} + (\text{durationDays} - 1)\text{ hari}$$
  - Contoh: sewa 1 hari mulai `2026-05-10` menghasilkan `addDays('2026-05-10', 0)` = `'2026-05-10'`; sewa bulanan 28 hari mulai `2026-02-28` menghasilkan `addDays('2026-02-28', 27)` = `'2026-03-27'`.
  - Di dalam `addDays()`, penjumlahan dilakukan via `new Date(Date.UTC(year, month - 1, day + days))` sehingga peralihan bulan, tahun baru, dan tahun kabisat ditangani secara otomatis tanpa terpengaruh *Daylight Saving Time* atau timezone lokal mesin.

#### Q34. (KUK 2.2) Jelaskan struktur percabangan pada fungsi `validateRentalDuration(startDate, rentalType, requestedDurationDays)` di `src/utils/rentalMath.js` baris 323–354!
- **Lokasi Kode:** [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L323-L354)
- **Jawaban:**
  1. Menghitung jumlah hari pada bulan `startDate`: `monthlyDays = getDaysInMonth(year, month)` dan batas harian `maxDailyDays = monthlyDays - 1`.
  2. **Cabang 1 (`!Object.values(RENTAL_TYPES).includes(rentalType)`)**: Melempar `ValidationError` jika tipe sewa bukan `'DAILY'` atau `'MONTHLY'`.
  3. **Cabang 2 (`rentalType === RENTAL_TYPES.MONTHLY`)**: Jika pemanggil mengirim `requestedDurationDays` yang tidak sama dengan `monthlyDays`, lempar `ValidationError`; jika valid/kosong, kembalikan `durationDays = monthlyDays` (28, 29, 30, atau 31 hari).
  4. **Cabang 3 (`DAILY`)**: Memvalidasi `parsedDays` harus bilangan bulat $\ge 1$ dan $\le \text{maxDailyDays}$. Jika penyewa meminta 30 hari di bulan April (yang berjumlah 30 hari), fungsi menolak dengan `ValidationError` dan menyarankan menggunakan tipe sewa `BULANAN`.

#### Q35. (KUK 2.2) Jelaskan rumus dan percabangan pada fungsi `calculateElectricityFee()` di `src/utils/rentalMath.js` baris 420–446!
- **Lokasi Kode:** [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L420-L446)
- **Jawaban:**
  1. **Baris 427–429**: `if (vehicleType !== VEHICLE_TYPES.ELECTRIC_CAR || garageType !== GARAGE_TYPES.EV) return 0;` — Jika kendaraan bukan mobil listrik, **atau** jika mobil listrik disewa di Garasi Mobil biasa (`CAR`), biaya listrik adalah `0`.
  2. **Baris 430–442**: Memvalidasi `batteryCapacityKwh > 0`, `0 <= percent <= 100` (default `0` jika kosong), dan `electricityRatePerKwh > 0`.
  3. **Baris 443–445**: Karena aturan bisnis menyatakan mobil listrik di garasi mobil listrik harus mengisi daya hingga penuh (100%), maka hanya sisa kapasitas yang belum terisi yang ditagihkan:
     $$\text{Biaya Listrik} = \text{round}\left(\text{batteryCapacityKwh} \times \frac{100 - \text{currentBatteryPercent}}{100} \times \text{electricityRatePerKwh}\right)$$
     Contoh: kapasitas `100 kWh`, baterai saat ini `70%`, tarif `Rp2.500/kWh` → sisa `30%` = `30 kWh × Rp2.500` = `Rp75.000`.

#### Q36. (KUK 2.2 — Jawaban Pertanyaan 4 Simulasi) Lakukan trace eksekusi pengulangan `while (remainingDays > 0)` pada `calculateExtensionFee('2026-03-31', '2026-05-03', 100000)` di `src/utils/rentalMath.js` baris 511–553, dan jelaskan apa yang terjadi jika `else { break; }` dihapus!
- **Lokasi Kode:** [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L511-L553)
- **Jawaban Trace:**
  1. `validateExtensionDate('2026-03-31', '2026-05-03')` menghasilkan `extensionStartDate = '2026-04-01'` dan `addedDays = 33` hari (30 hari di April + 3 hari di Mei).
  2. Sebelum loop: `cursorDate = '2026-04-01'`, `remainingDays = 33`, `monthlyBlocks = 0`, `blockDetails = []`.
  3. **Iterasi ke-1 (`remainingDays = 33 > 0`)**:
     - `cursorDate` berada di bulan April 2026 → `daysInBlockMonth = 30`.
     - Kondisi `if (33 >= 30)` bernilai **`true`**.
     - `monthlyBlocks` bertambah menjadi `1`; objek blok `{ startDate: '2026-04-01', endDate: '2026-04-30', days: 30, fee: 2500000 }` dimasukkan ke `blockDetails`.
     - `remainingDays` dikurangi 30 menjadi `3`; `cursorDate` maju ke `'2026-05-01'`.
  4. **Iterasi ke-2 (`remainingDays = 3 > 0`)**:
     - `cursorDate` berada di bulan Mei 2026 → `daysInBlockMonth = 31`.
     - Kondisi `if (3 >= 31)` bernilai **`false`** → masuk ke cabang `else { break; }` dan keluar dari loop `while`.
  5. **Hasil akhir setelah loop**:
     - `monthlyBlocks = 1`, `remainingDays = 3`
     - `monthlyFee = 1 * 25 * 100000 = 2500000`
     - `remainingDailyFee = 3 * 100000 = 300000`
     - `extensionAmount = 2500000 + 300000 = 2800000` (`Rp2.800.000`).
  6. **Jika `else { break; }` dihapus**: Pada iterasi ke-2, saat `remainingDays = 3` (`< 31`), nilai `remainingDays` tidak pernah dikurangi lagi sementara kondisi `while (remainingDays > 0)` tetap `true`. Akibatnya terjadi **Infinite Loop** yang membekukan (*hang*) thread single-event-loop Node.js!

#### Q37. (KUK 2.2) Bagaimana logika fungsi `datesOverlap(startA, endA, startB, endB)` di `src/utils/rentalMath.js` baris 187–193 mendeteksi tabrakan jadwal, dan di mana logika serupa dipakai di query SQL?
- **Lokasi Kode:** [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L187-L193), [GarageRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/GarageRepository.js#L458-L459), dan [RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L192-L193)
- **Jawaban:** Dua interval tertutup $[A_{\text{start}}, A_{\text{end}}]$ dan $[B_{\text{start}}, B_{\text{end}}]$ saling beririsan jika dan hanya jika:
  $$A_{\text{start}} \le B_{\text{end}} \quad \text{DAN} \quad A_{\text{end}} \ge B_{\text{start}}$$
  Rumus ini diterapkan identik di JavaScript (`return startA <= endB && endA >= startB;`) maupun pada klausa SQL `WHERE r.start_date <= ? AND r.end_date >= ?` (dengan parameter `[endDate, startDate]`).

---

### Elemen 3: Membuat Program Menggunakan Prosedur dan Fungsi (KUK 3.1 – 3.4)

#### Q38. (KUK 3.1 – 3.3) Apa perbedaan antara **Prosedur** dan **Fungsi** dalam pemrograman terstruktur, dan tunjukkan contoh masing-masing serta penggunaannya secara bersamaan di source code Anda!
- **Jawaban:**
  - **Prosedur** adalah subprogram yang menjalankan aksi/efek samping (*side-effect* seperti memodifikasi DOM, menulis DB, atau menghapus file) tanpa mengembalikan nilai perhitungan (`@returns {void}`). Contoh nyata:
    1. `initializeSchema(db)` di [db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L54-L188)
    2. `safeUnlink(filePath)` di [common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L28-L39)
    3. `showAlert(elementId, message, type)` dan `hideAlert(elementId)` di [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L219-L245)
  - **Fungsi** adalah subprogram yang mengolah parameter input dan mengembalikan nilai keluaran (`return value`). Contoh nyata:
    1. `calculateTotalRentalCost(params)` di [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L455-L478)
    2. `escapeHtml(value)` dan `formatRupiah(amount)` di [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L26-L52)
  - **Penggunaan Prosedur dan Fungsi Secara Bersamaan (KUK 3.3)**: Pada prosedur `renderReportSummaryCards(summary)` di [admin.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/admin.js#L181-L210) (prosedur `@returns {void}` yang mengubah DOM `#reportSummaryCards`), di dalamnya memanggil fungsi `window.AppUtils.formatRupiah(...)` (fungsi yang mengembalikan string Rupiah). Demikian pula pada prosedur `errorHandler` di [common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L164-L205) yang memanggil prosedur `safeUnlink()` sekaligus method respons Express.

#### Q39. (KUK 3.4) Bagaimana keterangan/dokumentasi untuk setiap prosedur dan fungsi diberikan di dalam kode?
- **Jawaban:** Setiap prosedur dan fungsi di seluruh file `src/` dan `public/js/` dilengkapi blok komentar **JSDoc** standar di atas deklarasinya yang menjelaskan tujuan subprogram, daftar parameter beserta tipe datanya (`@param`), nilai kembalian (`@returns {void}` untuk prosedur, atau tipe nilai untuk fungsi), serta eksepsi yang mungkin dilempar (`@throws`).

---

### Elemen 4: Membuat Program Menggunakan Array (KUK 4.1 – 4.4)

#### Q40. (KUK 4.1 – 4.3) Tunjukkan di mana saja struktur data **Array** (1 dimensi maupun array of objects), penentuan tipe elemen, dan pengecekan panjang array (`.length`) digunakan di kode Anda!
- **Lokasi Kode:**
  1. **Array Konstan 1 Dimensi (String)**: `ALLOWED_IMAGE_MIME_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp'])` di [constants.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/constants.js#L81-L85) dan `MONTH_NAMES_ID` (array 12 string nama bulan) di [ReportRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/ReportRepository.js#L16-L29).
  2. **Array of Objects Dinamis**: `const blockDetails = []` yang diisi menggunakan `blockDetails.push({ startDate, endDate, days, fee })` di [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L520-L532), serta `const rows = []` pada keempat fungsi laporan di [ReportRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/ReportRepository.js#L152-L188).
  3. **Validasi Tipe & Panjang Array (`Array.isArray` dan `.length`)**:
     - `if (!Array.isArray(allowedGarageTypes) || allowedGarageTypes.length === 0) return [];` di [GarageRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/GarageRepository.js#L444-L446).
     - `if (!Array.isArray(rentalIds) || rentalIds.length === 0) return map;` di [RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L119-L121).
  4. **Operasi Fungsional Array (`.map`, `.reduce`, `.find`, `.some`, `.includes`)**:
     - `.reduce()` untuk menjumlahkan biaya perpanjangan: `this.extensions.reduce((sum, ext) => sum + Number(ext.extensionAmount || 0), 0)` di [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L653).
     - `.map()` dan `.join('')` untuk membangun placeholder SQL `rentalIds.map(() => '?').join(', ')` di [RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L123).

#### Q41. (KUK 4.4) Bagaimana proses **pengurutan data (sorting)** diterapkan pada aplikasi Anda, dan mengapa dilakukan di level query SQL dibandingkan `.sort()` di memori JavaScript?
- **Lokasi Kode:**
  - [GarageRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/GarageRepository.js#L426): `ORDER BY g.type_id ASC, g.garage_id ASC`
  - [RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L380-L384):
    ```sql
    ORDER BY
      CASE WHEN r.start_date <= ? THEN 0 ELSE 1 END ASC,
      r.start_date ASC,
      r.end_date ASC,
      r.garage_id ASC
    ```
  - [UserRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/UserRepository.js#L216): `ORDER BY u.created_at DESC`
  - [ReportRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/ReportRepository.js#L536): `ORDER BY t.full_name ASC`
- **Jawaban:** Hasil query dari `better-sqlite3` (`stmt.all()`) dikembalikan sebagai **Array of Objects** yang sudah terurut dari engine SQLite melalui klausa `ORDER BY` (memanfaatkan B-tree index). Pada `listActiveOnDate()` ([RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L380-L384)), pengurutan multi-kriteria bahkan menempatkan sewa yang sedang berjalan hari ini (`start_date <= todayDate` → prioritas `0`) di urutan paling atas, diikuti jadwal sewa mendatang (`1`) terurut dari tanggal terdekat ke terjauh. Selain itu, penyusunan array 12 bulan (`for (let m = 1; m <= 12; m += 1)`) dan hari (`for (let d = 1; d <= daysInMonth; d += 1)`) di [ReportRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/ReportRepository.js#L158-L188) menghasilkan array laporan yang terurut kronologis secara konstruktif.

---

### Elemen 5 & 6: Membuat Program untuk Akses File & Mengkompilasi/Mengeksekusi Program (KUK 5.1 – 6.2)

#### Q42. (KUK 5.1 – 5.2) Tunjukkan di file dan baris mana program Anda melakukan operasi **menulis data ke media penyimpanan (disk)** dan **membaca data dari media penyimpanan**!
- **Lokasi Kode:**
  1. **Menulis File ke Disk (KUK 5.1)**:
     - Membuat direktori database & menulis file SQLite `./data/garage-rental.db`: `fs.mkdirSync(path.dirname(resolvedPath), { recursive: true })` dan `new Database(resolvedPath)` di [db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L35-L38).
     - Membuat direktori upload & menulis file gambar bukti pembayaran ke `./uploads/payment-proofs/<UUID>.<ext>`: `fs.mkdirSync(uploadDir, { recursive: true })` dan `multer.diskStorage({ destination, filename })` di [common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L57-L87).
     - Menghapus file bukti bayar yang gagal/yatim dari disk: `fs.unlinkSync(filePath)` pada `safeUnlink()` di [common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L32-L34).
  2. **Membaca File dari Disk (KUK 5.2)**:
     - Mengecek keberadaan dan mengirim file gambar bukti pembayaran ke klien: `fs.existsSync(fullPath)` dan `res.sendFile(fullPath)` pada `RentalController.servePaymentProof()` di [controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L554-L567).
     - Membaca dan menyajikan halaman HTML/CSS/JS statis dari disk: `express.static(publicDir)` dan `res.sendFile(path.join(publicDir, 'index.html'))` di [app.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/app.js#L137-L142).

#### Q43. (KUK 6.1 – 6.2) Karena JavaScript adalah bahasa yang dieksekusi oleh runtime Node.js (JIT-compiled oleh engine V8), bagaimana Anda memastikan seluruh modul bebas dari kesalahan sintaks (*syntax error*) dan kesalahan referensi?
- **Jawaban:** Ketika `npm test` (Vitest) dijalankan, seluruh modul di `src/` di-load dan di-parse oleh V8 engine melalui `require()`. Jika terdapat *SyntaxError*, *ReferenceError*, atau kesalahan impor modul, proses parsing akan langsung gagal sebelum test case dieksekusi. Seluruh 26 test cases pada `tests/unit/businessLogic.test.js` dan `tests/integration/api.test.js` berjalan hijau tanpa error sintaks maupun runtime.

---

## UNIT KOMPETENSI 4 — Mengimplementasikan Pemrograman Berorientasi Objek (`J.620100.018.02`)

### Elemen 1: Membuat Program Berorientasi Objek dengan Memanfaatkan Class (KUK 1.1 – 1.4)

#### Q44. (KUK 1.1) Sebutkan seluruh **Class** yang Anda buat di dalam kode sumber beserta lokasi filenya!
- **Jawaban:** Total terdapat **23 Class** yang tersebar di 5 lapisan:
  1. **9 Domain Entity Classes** di [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js):
     - `User` (baris `37–77`), `Tenant` (baris `83–138`), `Admin` (baris `144–166`), `GarageTypeConfig` (baris `171–212`), `GarageSequence` (baris `217–272`), `Garage` (baris `277–354`), `Vehicle` (baris `359–484`), `RentalExtension` (baris `489–553`), `Rental` (baris `558–704`).
  2. **6 Error Classes** di [constants.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/constants.js#L90-L172):
     - `AppError`, `ValidationError`, `AuthenticationError`, `ForbiddenError`, `NotFoundError`, `ConflictError`.
  3. **4 Repository Classes** di `src/repositories/`:
     - `UserRepository` ([UserRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/UserRepository.js#L12)), `GarageRepository` ([GarageRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/GarageRepository.js#L18)), `RentalRepository` ([RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L19)), `ReportRepository` ([ReportRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/ReportRepository.js#L71)).
  4. **4 Service Classes** di `src/services/`:
     - `AuthService` ([AuthService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/AuthService.js#L28)), `GarageService` ([GarageService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/GarageService.js#L30)), `RentalService` ([RentalService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L38)), `ReportService` ([ReportService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/ReportService.js#L12)).
  5. **4 Controller Classes** di [controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js):
     - `AuthController` (baris `17`), `GarageController` (baris `181`), `RentalController` (baris `314`), `ReportController` (baris `573`).

#### Q45. (KUK 1.2 & 1.3) Bagaimana setiap class entitas di `src/models/entities.js` menjaga agar data di dalam objeknya bersifat mandiri (*self-contained encapsulation*) beserta method operasinya?
- **Lokasi Kode:** [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L171-L704)
- **Jawaban:** Setiap instance class menyimpan state-nya sendiri di dalam `this` pada saat konstruksi dan menyediakan method yang bekerja di atas state tersebut:
  - `Tenant` memiliki data `this.approvalStatus` dan menyediakan method `isApproved()` serta `canRent()` (baris `111–122`).
  - `Garage` menyimpan `this.dailyRate` & `this.status`, serta memiliki method `getStatus()`, `isAvailable()`, dan `getMonthlyRate()` (baris `312–332`).
  - `Vehicle` menormalisasi sendiri `this.plateNumber` menjadi `.trim().toUpperCase()` (baris `375–378`) dan memvalidasi dirinya sendiri lewat `validate()` (baris `398–445`).
  - `Rental` merangkum objek `this.vehicle` dan array `this.extensions`, serta menghitung `getTotalDurationDays()` dan `getTotalExtensionAmount()` (baris `643–654`).

#### Q46. (KUK 1.4) Bagaimana pengelolaan hak akses (`private`, `protected`, `public`) diterapkan pada class `User` di `src/models/entities.js` baris 37–77?
- **Lokasi Kode:** [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L37-L77)
- **Jawaban:**
  - Properti publik (`this.id`, `this.email`, `this.role`, `this.createdAt`) diekspos melalui method publik `toJSON()` (baris `69–76`).
  - Properti sensitif `this._passwordHash` (baris `52`) diberi awalan garis bawah (`_`) sebagai penanda konvensi internal/private (*pseudo-private*), diakses secara terkontrol melalui accessor `getPasswordHash()` (baris `60–62`), dan **tidak pernah disertakan** di dalam kembalian `toJSON()`.
  - Jika ditanya penguji bagaimana cara membuat field tersebut benar-benar *hard-private* di tingkat sintaks JavaScript modern (ES2022+), jawabannya adalah mendeklarasikan `#passwordHash` di dalam body class sehingga akses `user.#passwordHash` dari luar class akan langsung ditolak oleh engine V8 dengan `SyntaxError`.

---

### Elemen 2: Menggunakan Tipe Data dan Control Program pada Metode Kelas (KUK 2.1 – 2.3)

#### Q47. (KUK 2.1 – 2.3) Jelaskan tipe data dan alur kontrol percabangan di dalam method `Vehicle.validate()` pada `src/models/entities.js` baris 398–445!
- **Lokasi Kode:** [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L398-L445)
- **Jawaban:**
  1. **Baris 399–401**: Memeriksa apakah `this.vehicleType` termasuk dalam enum `VEHICLE_TYPES` (`BICYCLE`, `MOTORCYCLE`, `CAR`, `ELECTRIC_CAR`).
  2. **Baris 402–407**: Memeriksa string `this.brand` dan `this.model` wajib terisi dan panjangnya $\le 60$ karakter.
  3. **Baris 409–415 (Percabangan Plat Nomor)**:
     - Jika `this.vehicleType === VEHICLE_TYPES.BICYCLE`, maka `this.plateNumber` dipaksa menjadi `null` (sesuai aturan PDF: nomor plat kecuali sepeda).
     - `else if (!this.plateNumber || this.plateNumber.length > 25)`, melempar `ValidationError` bahwa nomor plat wajib diisi untuk sepeda motor, mobil, dan mobil listrik.
  4. **Baris 417–443 (Percabangan Baterai Mobil Listrik)**:
     - Jika `this.vehicleType === VEHICLE_TYPES.ELECTRIC_CAR`, memvalidasi `this.batteryCapacityKwh` harus `number` berhingga dan $> 0$. Lalu jika `this.currentBatteryPercent === null`, di-default ke `0`, dan divalidasi harus berada pada rentang `0 <= currentBatteryPercent <= 100`.
     - `else` (kendaraan non-listrik): `this.batteryCapacityKwh` dan `this.currentBatteryPercent` di-reset menjadi `null` agar data kendaraan bensin/sepeda tidak pernah menyimpan kapasitas baterai.

#### Q48. (KUK 2.1 – 2.3) Jelaskan cara kerja static method `GarageSequence.formatId(garageType, sequenceNumber)` dan instance method `generateNextId()` pada `src/models/entities.js` baris 245–271!
- **Lokasi Kode:** [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L245-L271)
- **Jawaban:**
  - `static formatId(garageType, sequenceNumber)` (baris `245–254`): Mengambil huruf prefix dari `GARAGE_TYPE_PREFIX[garageType]` (`S` untuk `BIKE`, `C` untuk `CAR`, `E` untuk `EV`), memvalidasi `sequenceNumber` adalah integer antara `1` s/d `999`, lalu memformat angka menjadi 3 digit dengan zero-padding `String(sequenceNumber).padStart(3, '0')` (misalnya `1` → `'S001'`, `10` → `'C010'`).
  - `generateNextId()` (baris `262–271`): Memeriksa batas kapasitas `if (this.lastNumber >= MAX_GARAGES_PER_TYPE)` (999). Jika sudah 999, melempar `ValidationError`. Jika belum, menaikkan state internal `this.lastNumber += 1` lalu memanggil `GarageSequence.formatId(this.garageType, this.lastNumber)`.

---

### Elemen 3: Membuat Program dengan Konsep Berbasis Objek — Inheritance, Polymorphism, Overloading (KUK 3.1 – 3.3)

#### Q49. (KUK 3.1) Di mana saja konsep **Inheritance (Pewarisan)** diterapkan di dalam kode sumber Anda?
- **Lokasi Kode:**
  1. **Hierarki Pengguna** di [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L37-L166):
     - Superclass abstrak `User` (baris `37`) diturunkan ke `class Tenant extends User` (baris `83`) dan `class Admin extends User` (baris `144`). Keduanya memanggil `super({ id, email, role, createdAt, passwordHash })` di dalam constructor masing-masing.
  2. **Hierarki Error HTTP** di [constants.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/constants.js#L90-L172):
     - `class AppError extends Error` (baris `90`) mewarisi class `Error` bawaan JavaScript, lalu diturunkan ke 5 subclass: `ValidationError extends AppError` (baris `107`), `AuthenticationError extends AppError` (baris `121`), `ForbiddenError extends AppError` (baris `135`), `NotFoundError extends AppError` (baris `149`), dan `ConflictError extends AppError` (baris `163`).

#### Q50. (KUK 3.2) Tunjukkan baris kode tempat **Polymorphism** didefinisikan dan baris kode tempat perilaku polimorfik tersebut dipanggil!
- **Lokasi Kode:**
  - **Definisi (Method Overriding)**:
    - `User.prototype.toJSON()` di [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L69-L76) mengembalikan `{ id, email, role, createdAt }`.
    - `Tenant.prototype.toJSON()` di [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L129-L137) menimpa (`override`) method tersebut dengan `{ ...super.toJSON(), nik, fullName, phone, approvalStatus }`.
    - `Admin.prototype.toJSON()` di [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L160-L165) menimpa method tersebut dengan `{ ...super.toJSON(), fullName }`.
  - **Pemanggilan Polimorfik**:
    - Di `AuthController.login()` pada [controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L86) (`user: user.toJSON()`) dan `AuthController.me()` pada baris `124` (`data: req.user.toJSON()`). Objek `req.user` hasil `UserRepository.mapUserRow()` ([UserRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/UserRepository.js#L28-L51)) bisa berupa instance `Admin` maupun `Tenant`; pemanggilan `req.user.toJSON()` secara otomatis mengeksekusi implementasi milik class yang sesuai saat runtime.
    - Contoh kedua terdapat pada `errorHandler` di [common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L169-L176): `if (err instanceof AppError) res.status(err.statusCode).json(body)` yang menangani seluruh subclass `AppError` secara polimorfik melalui properti `err.statusCode`.

#### Q51. (KUK 3.3) Tunjukkan di file dan baris mana konsep **Overloading** diterapkan dalam kode JavaScript Anda!
- **Lokasi Kode:**
  1. `RentalRepository.hasOverlappingActiveRental(garageId, startDate, endDate, excludeRentalId = null)` di [RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L184-L209):
     - Jika dipanggil dengan **3 argumen** (saat membuat sewa baru pada baris `246–250`), `excludeRentalId` bernilai `null` sehingga menjalankan query tanpa filter `rental_id != ?`.
     - Jika dipanggil dengan **4 argumen** (saat mengecek konflik perpanjangan sewa di [RentalService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L447-L452)), `excludeRentalId` berisi ID rental yang sedang diperpanjang sehingga mengecualikan dirinya sendiri dari cek tabrakan.
  2. `Rental constructor` di [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L586):
     - `this.vehicle = vehicle instanceof Vehicle ? vehicle : new Vehicle(vehicle);` — properti `vehicle` menerima *overload* tipe parameter: boleh berupa instance class `Vehicle` yang sudah jadi, atau berupa objek literal biasa (`Object`) yang otomatis dikonversi menjadi `new Vehicle(vehicle)`.
  3. `calculateElectricityFee(vehicleType, garageType, batteryCapacityKwh, electricityRatePerKwh, currentBatteryPercent = 0)` di [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L420-L426): dapat dipanggil dengan 4 argumen (pengisian penuh 0%→100%) atau 5 argumen (pengisian parsial dari persentase baterai saat ini).

#### Q52. (KUK 3.1 – 3.3) Selain Inheritance, bagaimana konsep **Composition** dan **Static Method** diterapkan pada model OOP Anda?
- **Lokasi Kode:**
  - **Composition**: Class `Rental` memiliki objek `Vehicle` (`this.vehicle`) di [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L586) dan mendelegasikan perhitungan listrik ke `this.vehicle.vehicleType`, `this.vehicle.batteryCapacityKwh`, dan `this.vehicle.currentBatteryPercent` pada `Rental.prototype.calculateElectricityFee()` (baris `619–627`).
  - **Static Method**: `GarageSequence.formatId(garageType, sequenceNumber)` di [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L245) dan `RentalExtension.calculateExtensionFee(previousEndDate, newEndDate, dailyRate)` di [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L527). Keduanya dideklarasikan dengan keyword `static` karena dapat dipanggil langsung pada level class tanpa harus membuat instance terlebih dahulu.

---

### Elemen 4 & 5: Interface, Paket, dan Kompilasi Program (KUK 4.1 – 5.2)

#### Q53. (KUK 4.1) Tunjukkan di file dan baris mana konsep **Interface / Kontrak Kelas** diterapkan di dalam kode JavaScript Anda!
- **Lokasi Kode:**
  1. **Abstract Base Class Guard (`User`)**: Baris `45–47` di [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L45-L47):
     ```javascript
     if (new.target === User) {
       throw new Error('Kelas abstrak User tidak dapat diinstansiasi secara langsung.');
     }
     ```
     Baris ini memaksa `User` hanya berperan sebagai kontrak dasar yang harus diturunkan oleh `Tenant` dan `Admin`.
  2. **Kontrak Serialisasi `toJSON()` (*Duck-Typed Interface*)**: Seluruh 9 class entitas di [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js) (`User` baris `69`, `Tenant` baris `129`, `Admin` baris `160`, `GarageTypeConfig` baris `199`, `Garage` baris `339`, `Vehicle` baris `474`, `RentalExtension` baris `536`, `Rental` baris `661`) mengimplementasikan method dengan signature yang sama, yaitu `toJSON()`. Hal ini terlihat jelas pada baris `699–701` di [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L699-L701):
     ```javascript
     extensions: this.extensions.map((ext) =>
       typeof ext.toJSON === 'function' ? ext.toJSON() : ext
     ),
     ```
     Baris tersebut memeriksa kontrak interface `typeof ext.toJSON === 'function'` (*duck typing*) sebelum memanggilnya.

#### Q54. (KUK 4.2) Bagaimana konsep **Paket (Package / Module System)** diorganisasikan pada proyek ini?
- **Lokasi Kode:** [package.json](file:///c:/Users/zeusd/Documents/GitHub/MKR/package.json#L1-L33) dan seluruh modul di `src/`
- **Jawaban:**
  - Di level proyek, aplikasi didefinisikan sebagai sebuah paket Node.js di [package.json](file:///c:/Users/zeusd/Documents/GitHub/MKR/package.json#L1-L5) (`"name": "garage-rental-management-system"`).
  - Di level kode sumber, sistem menggunakan modul **CommonJS** (`module.exports = { ... }` dan `const ... = require(...)`) yang dikelompokkan ke dalam 8 sub-paket direktori berdasarkan lapisan arsitektur:
    - `src/database/` ([db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js), [init.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/init.js), [seed.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/seed.js))
    - `src/models/` ([entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js))
    - `src/repositories/` (4 file repository)
    - `src/services/` (4 file service)
    - `src/controllers/` ([controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js))
    - `src/middleware/` ([auth.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/auth.js), [common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js))
    - `src/routes/` ([api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js))
    - `src/utils/` ([constants.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/constants.js), [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js), [validators.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/validators.js))
  - Di sisi frontend (`public/js/`), utilitas dikemas dalam namespace objek global `window.AppUtils` pada [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L451-L470) agar tidak mencemari global scope secara sembarangan.

#### Q55. (KUK 1.2 & 3.1) Mengapa di `src/models/entities.js` terdapat class `GarageTypeConfig` dan `Garage` secara terpisah? Apa perbedaan tanggung jawab keduanya?
- **Lokasi Kode:** `GarageTypeConfig` (baris `171–212`) dan `Garage` (baris `277–354`) di [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L171-L354)
- **Jawaban:** `GarageTypeConfig` merepresentasikan baris data master pada tabel `garage_types` (`typeId`, `name` `'BIKE'|'CAR'|'EV'`, `codePrefix` `'S'|'C'|'E'`, `dailyRate`, `erPerKwh`), sedangkan `Garage` merepresentasikan satu unit fisik garasi pada tabel `garages` (`id` seperti `'C001'`, `status` `'AVAILABLE'|'USED'`, `createdAt`) yang telah di-join dengan informasi tarif dari `garage_types`.

#### Q56. (KUK 5.1 – 5.2) Bagaimana pengujian unit memastikan seluruh class OOP bebas dari kesalahan sintaks dan berjalan sesuai kontraknya?
- **Lokasi Kode:** [businessLogic.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/unit/businessLogic.test.js#L261-L304)
- **Jawaban:** Test suite kedua di `businessLogic.test.js` secara eksplisit menginstansiasi dan menguji perilaku `User` (memastikan `new User(...)` melempar error), `Tenant` (memastikan `canRent()` dan `toJSON()` menyembunyikan `passwordHash`), `GarageSequence` (memastikan `formatId()` dan batas 999 pada `generateNextId()`), serta `Vehicle` (memastikan validasi plat nomor sepeda vs mobil dan kapasitas baterai EV).

---

## UNIT KOMPETENSI 5 — Menggunakan Library atau Komponen Pre-existing (`J.620100.019.02`)

### Elemen 1: Melakukan Pemilihan Unit-Unit Reuse yang Potensial (KUK 1.1 – 1.3)

#### Q57. (KUK 1.1) Sebutkan seluruh library eksternal (*pre-existing components*) yang terdaftar di `package.json` beserta fungsinya dan lokasi pemakaiannya di source code!
- **Lokasi Kode:** [package.json](file:///c:/Users/zeusd/Documents/GitHub/MKR/package.json#L22-L32)
- **Jawaban:** Terdapat **5 production dependencies** dan **2 devDependencies**:
  1. **`express` (`^4.21.2`)**: Framework HTTP server, routing REST API, dan static file server. Digunakan di [app.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/app.js#L8) dan [api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L6).
  2. **`better-sqlite3` (`^12.0.0`)**: Driver SQLite C++ binding sinkron berkinerja tinggi dengan dukungan prepared statements dan transaksi atomik. Digunakan di [db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L8).
  3. **`jsonwebtoken` (`^9.0.2`)**: Membuat (`jwt.sign`) dan memverifikasi (`jwt.verify`) token sesi autentikasi JWT. Digunakan di [AuthService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/AuthService.js#L7) (baris `128` dan `151`).
  4. **`cookie-parser` (`^1.4.7`)**: Middleware Express untuk mem-parsing header `Cookie` menjadi objek `req.cookies`. Digunakan di [app.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/app.js#L9) (baris `124`) dan dibaca di [auth.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/auth.js#L20).
  5. **`multer` (`^2.5.0`)**: Middleware untuk memproses request `multipart/form-data` dan menyimpan file gambar bukti pembayaran ke disk. Digunakan di [common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L9) (baris `61–112`).
  6. **`vitest` (`^3.0.5`, devDependency)**: Test runner untuk mengeksekusi White Box dan Black Box test di [businessLogic.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/unit/businessLogic.test.js#L9) dan [api.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/integration/api.test.js#L7).
  7. **`supertest` (`^7.0.0`, devDependency)**: Library pengujian HTTP integrasi terhadap instance Express tanpa harus membuka port jaringan permanen, digunakan di [api.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/integration/api.test.js#L11).

#### Q58. (KUK 1.1) Selain library npm eksternal, komponen/modul bawaan (*built-in standard library*) Node.js dan Web API apa saja yang Anda manfaatkan?
- **Jawaban:**
  - **`crypto` (`crypto.randomUUID()`)**: Menghasilkan UUID v4 standar RFC 4122 tanpa perlu menginstal package `uuid` eksternal. Dipakai di [seed.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/seed.js#L43), [AuthService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/AuthService.js#L82), [RentalService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L328) & [L514](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L514), serta [common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L85).
  - **`fs` & `path`**: Operasi sistem file dan resolusi path lintas OS di [db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L6-L7), [common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L6-L7), dan [controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L6-L7).
  - **`Intl.DateTimeFormat` & `Intl.NumberFormat`**: Format tanggal zona waktu `Asia/Jakarta` di [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L206-L237) dan format mata uang Rupiah `id-ID` di [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L46-L51) tanpa perlu library berat seperti `moment.js`.

#### Q59. (KUK 1.2) Bagaimana Anda menghitung keuntungan efisiensi dari pemanfaatan komponen pre-existing tersebut dibandingkan menulisnya dari nol (*from scratch*)?
- **Jawaban:**
  1. **Efisiensi Waktu Pengerjaan (dari batas 40 jam)**: Menulis parser `multipart/form-data` (boundary streaming file biner), implementasi kriptografi HMAC-SHA256 JWT, dan driver C++ SQLite dari nol akan memakan waktu ratusan jam dan rawan bug. Dengan `multer`, `jsonwebtoken`, dan `better-sqlite3`, waktu pengembangan infrastruktur dipangkas >80% sehingga fokus dapat diarahkan pada akurasi logika bisnis.
  2. **Efisiensi Eksekusi & Dependensi**: Memakai API native `crypto.randomUUID()` dan `Intl.DateTimeFormat` menghemat ketergantungan (*zero extra dependency* untuk UUID dan timezone) serta berjalan di level C++ engine V8.

#### Q60. (KUK 1.3) Apa lisensi dari library yang Anda gunakan, dan bagaimana Anda memastikan tidak ada pelanggaran lisensi, hak cipta, atau hak paten?
- **Lokasi Kode:** [package.json](file:///c:/Users/zeusd/Documents/GitHub/MKR/package.json#L21-L32)
- **Jawaban:** Proyek ini berlisensi **`ISC`** (baris `21` di `package.json`), dan seluruh library yang digunakan (`express`, `better-sqlite3`, `cookie-parser`, `jsonwebtoken`, `multer`, `vitest`, `supertest`) menggunakan lisensi *open-source permisif* (**MIT License**). Lisensi MIT dan ISC mengizinkan penggunaan, modifikasi, dan distribusi secara bebas (baik untuk akademik maupun komersial) tanpa kewajiban membuka kode turunan (*non-copyleft*), selama pemberitahuan hak cipta di dalam `node_modules` tidak dihapus.

---

### Elemen 2 & 3: Integrasi dan Pembaharuan Library Pre-existing (KUK 2.1 – 3.2)

#### Q61. (KUK 2.1) Bagaimana ketergantungan (*dependencies*) antar-unit library diidentifikasi dan dikunci versinya di proyek Anda?
- **Lokasi Kode:** [package.json](file:///c:/Users/zeusd/Documents/GitHub/MKR/package.json#L22-L32) dan `package-lock.json`
- **Jawaban:** Ketergantungan langsung dideklarasikan pada bagian `"dependencies"` (kebutuhan runtime produksi) dan `"devDependencies"` (kebutuhan pengujian pengembangan) di `package.json`. Sedangkan pohon ketergantungan transitif (*sub-dependencies*) beserta hash integritas SHA-512 dan versi eksaknya dikunci di dalam `package-lock.json` agar hasil instalasi selalu identik di setiap mesin.

#### Q62. (KUK 2.2) Bagaimana Anda memastikan tidak menggunakan komponen atau library yang sudah usang (*obsolete/deprecated*)?
- **Lokasi Kode:** [package.json](file:///c:/Users/zeusd/Documents/GitHub/MKR/package.json#L22-L32)
- **Jawaban:**
  - Menggunakan **`multer` `^2.5.0`** (cabang v2 modern, bukan Multer v1 lama yang memiliki kerentanan `busboy` lawas).
  - Menggunakan **`better-sqlite3` `^12.0.0`** (mendukung Node.js LTS/modern v18–v24), bukan library `sqlite3` callback-based lama.
  - Menggunakan **`vitest` `^3.0.5`** dan **`supertest` `^7.0.0`**.
  - Menghindari library yang sudah berstatus *deprecated/legacy* seperti `moment.js` (diganti `Intl.DateTimeFormat` native) atau `body-parser` terpisah (diganti `express.json()` bawaan Express 4.16+).

#### Q63. (KUK 2.3) Tunjukkan secara spesifik bagaimana library `multer` diintegrasikan dengan kode sumber Anda di `src/middleware/common.js` dan `src/routes/api.js`!
- **Lokasi Kode:** [common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L50-L152) dan [api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L49-L54)
- **Jawaban:**
  1. Di `createUploadMiddleware()` ([common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L61-L87)), `multer.diskStorage` dikonfigurasi dengan callback `destination` (memastikan folder `./uploads/payment-proofs` tersedia) dan callback `filename` yang mengubah nama file asli menjadi `${crypto.randomUUID()}${ext}` berdasarkan peta `MIME_TO_EXT`.
  2. Pada baris `89–112`, `multer({ storage, limits: { fileSize: maxFileSizeBytes, files: 1 }, fileFilter }).single('paymentProof')` memfilter hanya `ALLOWED_IMAGE_MIME_TYPES` (`image/jpeg`, `image/png`, `image/webp`).
  3. Pada baris `123–146`, wrapper `uploadPaymentProof(req, res, next)` menangkap `multer.MulterError` (seperti `LIMIT_FILE_SIZE`) dan menerjemahkannya ke `ValidationError` aplikasi (HTTP 400), serta memastikan `req.file` wajib ada.
  4. Middleware tersebut dipasang pada rute `POST /api/rentals` (baris `49`) dan `POST /api/rentals/:id/extend` (baris `54`) di [api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L49-L54).

#### Q64. (KUK 2.3) Tunjukkan bagaimana library `jsonwebtoken` dan `cookie-parser` diintegrasikan untuk alur autentikasi!
- **Lokasi Kode:**
  - Pembuatan token: `AuthService.signToken(user)` memanggil `jwt.sign({ sub: user.id, role: user.role }, this.jwtSecret, { expiresIn: this.jwtExpiresIn })` di [AuthService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/AuthService.js#L127-L136).
  - Pengiriman cookie: `AuthController.login()` memanggil `res.cookie(AUTH_COOKIE_NAME, token, { httpOnly: true, maxAge: 8 * 60 * 60 * 1000, path: '/' })` di [controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L77-L81).
  - Pembacaan cookie: `app.use(cookieParser())` di [app.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/app.js#L124) mem-parsing cookie sehingga `extractAuthToken(req)` di [auth.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/auth.js#L19-L28) dapat membaca `req.cookies[AUTH_COOKIE_NAME]`.
  - Verifikasi token: `AuthService.verifyToken(token)` memanggil `jwt.verify(token, this.jwtSecret)` lalu mengambil data user terbaru dari SQLite lewat `this.userRepository.findById(decoded.sub)` di [AuthService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/AuthService.js#L145-L161).

#### Q65. (KUK 3.1 – 3.2) Bagaimana cara mengidentifikasi dan melakukan pembaharuan (*update*) library pada proyek Node.js ini tanpa merusak aplikasi?
- **Jawaban:**
  1. **Identifikasi versi usang & kerentanan**: Menjalankan perintah `npm outdated` untuk melihat perbandingan versi terpasang (*Current*), versi yang diizinkan aturan semver (`^` di `package.json`, *Wanted*), dan versi rilis terbaru (*Latest*), serta `npm audit` untuk memeriksa kerentanan keamanan.
  2. **Makna notasi Caret (`^`) di `package.json`**: Contoh `"express": "^4.21.2"` mengizinkan pembaruan otomatis untuk versi *patch* dan *minor* (`4.x.x`) yang kompatibel ke belakang (*backward-compatible* menurut Semantic Versioning), tetapi menahan perubahan *major* (`5.0.0`) yang berpotensi memiliki *breaking changes*.
  3. **Eksekusi pembaruan & verifikasi**: Menjalankan `npm update <nama-paket>` (atau `npm install <paket>@latest`), lalu wajib menjalankan `npm test` (26 test cases Vitest + Supertest) untuk memverifikasi tidak ada regresi pasca-pembaruan.

---

## UNIT KOMPETENSI 6 — Menerapkan Akses Basis Data (`J.620100.021.02`)

### Elemen 1: Membuat Berbagai Operasi terhadap Basis Data (KUK 1.1 – 1.3)

#### Q66. (KUK 1.1) Tunjukkan di mana operasi `INSERT` dan `UPDATE` dilakukan terhadap ke-8 tabel di dalam repository Anda!
- **Lokasi Kode:**
  1. **`users` & `admin`**: `INSERT INTO users` dan `INSERT INTO admin` pada `seedAdmin()` di [seed.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/seed.js#L46-L51).
  2. **`users` & `tenants`**: `INSERT INTO users` dan `INSERT INTO tenants` pada `UserRepository.createTenantUser()` di [UserRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/UserRepository.js#L149-L175), serta `UPDATE tenants SET is_verified = ? WHERE tenant_id = ?` pada `updateTenantApprovalStatus()` (baris `231–238`).
  3. **`garage_types` & `garage_sequences`**: Inisialisasi `INSERT OR IGNORE` di [db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L173-L187), serta `UPDATE garage_types SET daily_rate = ?, er_per_kwh = ? WHERE type_id = ?` dan `UPDATE garage_sequences SET last_num = ? WHERE type_id = ?` pada `GarageRepository.createGarageBatch()` di [GarageRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/GarageRepository.js#L185-L228).
  4. **`garages`**: `INSERT INTO garages` pada `createGarageBatch()` ([GarageRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/GarageRepository.js#L193-L207)) dan `UPDATE garages SET status = ?` pada `syncStatuses()` (baris `318–358`), `createRentalTransactional()` ([RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L290-L298)), serta `createExtensionTransactional()` (baris `509–513`).
  5. **`rentals`**: `INSERT INTO rentals` pada `RentalRepository.createRentalTransactional()` di [RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L258-L287) dan `UPDATE rentals SET end_date = ?` saat perpanjangan (baris `505–507`).
  6. **`rental_extensions`**: `INSERT INTO rental_extensions` pada `RentalRepository.createExtensionTransactional()` di [RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L486-L503).

#### Q67. (KUK 1.2) Jelaskan cara kerja query `getBaseSelectSql()` di `src/repositories/RentalRepository.js` baris 310–330 yang menggabungkan 5 tabel sekaligus!
- **Lokasi Kode:** [RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L310-L330)
- **Jawaban:** Query tersebut melakukan `INNER JOIN` berantai atas **5 tabel relasional**:
  - `FROM rentals r`
  - `JOIN garages g ON g.garage_id = r.garage_id` (mengambil `type_id` dan `status` garasi)
  - `JOIN garage_types gt ON gt.type_id = g.type_id` (mengambil `name`, `code_prefix`, `daily_rate`, dan `er_per_kwh`)
  - `JOIN tenants t ON t.tenant_id = r.tenant_id` (mengambil `nik`, `full_name`, `phone_number`, `is_verified`)
  - `JOIN users u ON u.user_id = t.tenant_id` (mengambil `email` penyewa)
  Hasil barisnya kemudian dipetakan oleh `mapRentalRow(row, extensions)` (baris `36–97`) menjadi instance `Rental` lengkap dengan objek `Vehicle`, `garage`, `tenant`, dan array `extensions`.

#### Q68. (KUK 1.2) Jelaskan bagaimana query agregasi SQL (`COUNT`, `SUM`, `COALESCE`, `CASE WHEN`, `UNION`, `COUNT(DISTINCT)`) bekerja pada `ReportRepository.js`!
- **Lokasi Kode:** [ReportRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/ReportRepository.js#L88-L640)
- **Jawaban:**
  - `COALESCE(SUM(total_price), 0)` dan `COALESCE(SUM(extension_fee), 0)` (baris `96, 107`): menjumlahkan pendapatan dan mengubah `NULL` (saat tidak ada baris) menjadi `0`.
  - `SUM(CASE WHEN g.status = ? THEN 1 ELSE 0 END)` (baris `377–378`): menghitung jumlah garasi `AVAILABLE` dan `USED` per tipe garasi dalam satu kali scan tabel (*conditional aggregation*).
  - `SELECT COUNT(DISTINCT garage_id) FROM (SELECT ... FROM rentals UNION SELECT ... FROM rental_extensions JOIN rentals ...)` (baris `116–128`): menggabungkan himpunan `garage_id` dari transaksi sewa baru dan transaksi perpanjangan menggunakan operator himpunan `UNION` (yang otomatis menghapus duplikat), lalu menghitung jumlah unit garasi unik (`COUNT(DISTINCT garage_id)`) yang digunakan pada periode tersebut.

#### Q69. (KUK 1.3) Sebutkan ke-10 Index yang Anda buat di `src/database/db.js` baris 155–164 dan jelaskan query mana yang dipercepat oleh masing-masing index tersebut!
- **Lokasi Kode:** [db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L155-L164)
- **Jawaban:**
  1. `idx_users_role ON users(role)` (baris `155`): mempercepat filter berdasarkan peran pengguna.
  2. `idx_tenants_is_verified ON tenants(is_verified)` (baris `156`): mempercepat filter status verifikasi (`PENDING`/`APPROVED`/`REJECTED`) di `UserRepository.listTenants()` ([UserRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/UserRepository.js#L194)).
  3. `idx_garages_type_status ON garages(type_id, status)` (baris `157`): *composite index* yang mempercepat filter tipe & status garasi di `GarageRepository.listGarages()` serta agregasi inventaris di `ReportRepository.getGarageTypeReport()`.
  4. `idx_rentals_tenant ON rentals(tenant_id)` (baris `158`): mempercepat `RentalRepository.listByTenant()` dan `GROUP BY r.tenant_id` pada laporan per penyewa.
  5. `idx_rentals_garage_status ON rentals(garage_id, status)` (baris `159`): mempercepat pengecekan overlap jadwal per garasi di `hasOverlappingActiveRental()` ([RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L188-L206)) dan `findAvailableForPeriod()`.
  6. `idx_rentals_dates ON rentals(start_date, end_date)` (baris `160`): mempercepat range scan tanggal SARGable (`WHERE start_date >= ? AND start_date < ?`) pada laporan bulanan, harian, dan tipe garasi di [ReportRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/ReportRepository.js#L98).
  7. `idx_rentals_status ON rentals(status)` (baris `161`): mempercepat pencarian rental aktif di `listActiveOnDate()`, `listAll()`, dan `syncStatuses()`.
  8. `idx_extensions_rental ON rental_extensions(rental_id)` (baris `162`): mempercepat batch lookup `WHERE re.rental_id IN (...)` di `getExtensionsMapForRentals()` ([RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L131)).
  9. `idx_extensions_admin ON rental_extensions(admin_id)` (baris `163`): mempercepat join/penelusuran perpanjangan berdasarkan Admin pemroses.
  10. `idx_extensions_created_at ON rental_extensions(created_at)` (baris `164`): mempercepat range scan `WHERE created_at >= ? AND created_at < ?` pada laporan pendapatan perpanjangan di [ReportRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/ReportRepository.js#L109).

---

### Elemen 2: Membuat Prosedur Akses terhadap Basis Data (KUK 2.1 – 2.2)

#### Q70. (KUK 2.1 – 2.2) Mengapa Anda memilih library `better-sqlite3` dibandingkan driver `sqlite3` asinkron biasa, dan apa perbedaan method `.get()`, `.all()`, `.run()`, serta `.exec()`?
- **Lokasi Kode:** [db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L8-L57) dan seluruh file di `src/repositories/`
- **Jawaban:**
  - `better-sqlite3` menggunakan API sinkron langsung di atas C++ binding SQLite. Karena SQLite adalah database embedded pada disk/memori lokal (bukan koneksi soket jaringan TCP), eksekusi sinkron menghindari *callback/Promise overhead* dan membuat blok transaksi (`db.transaction(...)`) tidak mungkin terselip oleh event asinkron lain di tengah transaksi.
  - Perbedaan 4 method utamanya:
    1. `db.exec(sqlString)` ([db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L57)): mengeksekusi banyak statement DDL/SQL sekaligus tanpa parameter.
    2. `stmt.get(...params)` ([UserRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/UserRepository.js#L70)): menjalankan `SELECT` dan mengembalikan **satu baris pertama** sebagai objek (atau `undefined` jika tidak ada).
    3. `stmt.all(...params)` ([UserRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/UserRepository.js#L218)): menjalankan `SELECT` dan mengembalikan **seluruh baris** dalam bentuk Array of Objects.
    4. `stmt.run(...params)` ([UserRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/UserRepository.js#L237)): menjalankan statement mutasi (`INSERT`, `UPDATE`, `DELETE`) dan mengembalikan objek info `{ changes, lastInsertRowid }`.

#### Q71. (KUK 2.2) Apa fungsi `db.transaction(fn)` dan mengapa pada `createGarageBatch`, `syncStatuses`, `createRentalTransactional`, serta `createExtensionTransactional` Anda memanggilnya dengan `.immediate()`?
- **Lokasi Kode:**
  - [GarageRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/GarageRepository.js#L157) & [L232](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/GarageRepository.js#L232)
  - [GarageRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/GarageRepository.js#L309) & [L368](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/GarageRepository.js#L368)
  - [RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L222) & [L301](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L301)
  - [RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L436) & [L516](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L516)
- **Jawaban:**
  - `db.transaction(fn)` menjamin sifat **Atomicity (ACID)**: seluruh perintah SQL di dalam fungsi `fn` berhasil bersama-sama (`COMMIT`), atau jika terjadi error/exception di tengah jalan (misalnya kapasitas garasi melebihi 999 atau garasi sudah disewa orang lain), seluruh perubahan sebelumnya otomatis dibatalkan (`ROLLBACK`).
  - Pemanggilan `.immediate()` mengeksekusi `BEGIN IMMEDIATE` di SQLite, yaitu langsung mengambil *RESERVED write lock* sejak awal transaksi (sebelum menjalankan `SELECT` pengecekan `last_num` atau `hasOverlappingActiveRental`). Hal ini mencegah *race condition / TOCTOU (Time-of-Check to Time-of-Use)*: tidak ada koneksi/transaksi tulis lain yang bisa menyisipkan nomor urut garasi yang sama atau melakukan *double-booking* pada garasi yang sama di sela antara `SELECT` dan `INSERT`.

---

### Elemen 3: Membuat Koneksi Basis Data, Keamanan, dan Hak Pengguna (KUK 3.1 – 3.3)

#### Q72. (KUK 3.1) Jelaskan bagaimana koneksi basis data dibuat di `createDatabaseConnection(dbPath)` pada `src/database/db.js` baris 33–44 dan bagaimana koneksi ditutup saat server dimatikan!
- **Lokasi Kode:** [db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L21-L44) dan [server.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/server.js#L34-L42)
- **Jawaban:**
  - `resolveDatabasePath(customPath)` (baris `21–24`) menentukan lokasi database: jika diberi `':memory:'` (saat testing), menggunakan RAM; jika tidak, membaca `process.env.DB_PATH` atau default `./data/garage-rental.db`.
  - `createDatabaseConnection(dbPath)` (baris `33–44`) membuat folder induk dengan `fs.mkdirSync(..., { recursive: true })`, membuka instance `new Database(resolvedPath)`, lalu mengatur dua pragma penting:
    1. `db.pragma('foreign_keys = ON')` — karena secara default SQLite menonaktifkan penegakan Foreign Key pada setiap koneksi baru!
    2. `db.pragma('journal_mode = WAL')` (*Write-Ahead Logging*) untuk database berbasis file — meningkatkan konkurensi agar operasi baca (`SELECT`) tidak terblokir oleh operasi tulis (`INSERT/UPDATE`).
  - Saat proses Node.js menerima sinyal `SIGINT` atau `SIGTERM`, fungsi `shutdown(signal)` di [server.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/server.js#L34-L42) menutup HTTP server lalu memanggil `db.close()` agar file WAL di-checkpoint dengan bersih.

#### Q73. (KUK 3.2) Bagaimana aplikasi mencegah serangan **SQL Injection** pada seluruh query basis data, terutama pada fitur pencarian (`LIKE`) dan filter dinamis (`IN`)?
- **Lokasi Kode:**
  - Filter `LIKE` di [UserRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/UserRepository.js#L198-L219), [GarageRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/GarageRepository.js#L411-L428), [ReportRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/ReportRepository.js#L521-L538)
  - Filter `IN` di [GarageRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/GarageRepository.js#L446-L468) dan [RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L123-L134)
- **Jawaban:** Seluruh nilai input pengguna **tidak pernah digabungkan ke dalam string SQL**, melainkan selalu menggunakan **Prepared Statements dengan placeholder `?`** (`this.db.prepare(sql).all(...params)`).
  - Pada pencarian `LIKE`, wildcard `%` digabungkan ke dalam nilai parameter di JavaScript (`const pattern = `%${filters.search.trim()}%`; params.push(pattern)`), sementara di string SQL tetap tertulis `t.full_name LIKE ?`.
  - Pada klausa `IN`, yang disusun secara dinamis ke string SQL hanyalah deretan tanda tanya `const placeholders = rentalIds.map(() => '?').join(', ')`, sedangkan datanya tetap di-bind secara aman lewat `.all(...rentalIds)`. Dengan demikian, karakter berbahaya seperti `' OR 1=1 --` diperlakukan murni sebagai nilai literal teks, bukan perintah SQL.

#### Q74. (KUK 3.2) Apa perbedaan kebijakan `ON DELETE CASCADE` dan `ON DELETE RESTRICT` yang Anda pasang pada Foreign Key di `src/database/db.js`?
- **Lokasi Kode:** [db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L69), [L79](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L79), [L96](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L96), [L104](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L104), [L137-L138](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L137-L138), [L151-L152](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L151-L152)
- **Jawaban:**
  - **`ON DELETE CASCADE`** dipasang pada tabel sub-entitas `admin(admin_id)`, `tenants(tenant_id)`, dan `garage_sequences(type_id)`: jika baris induk di `users` atau `garage_types` dihapus, baris profil/counter pasangannya otomatis ikut terhapus agar tidak ada baris yatim (*orphan record*).
  - **`ON DELETE RESTRICT`** dipasang pada tabel transaksi dan aset fisik: `garages(type_id)`, `rentals(tenant_id, garage_id)`, dan `rental_extensions(rental_id, admin_id)`: SQLite akan **menolak penghapusan** tipe garasi, unit garasi, penyewa, atau admin apabila sudah pernah memiliki riwayat transaksi penyewaan/perpanjangan, sehingga integritas histori keuangan dan audit laporan tetap terjaga.

#### Q75. (KUK 3.3) Bagaimana hak akses setiap pengguna (**RBAC — Role-Based Access Control**) ditentukan dan ditegakkan pada setiap endpoint API di `src/middleware/auth.js` dan `src/routes/api.js`?
- **Lokasi Kode:** [auth.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/auth.js#L41-L146) dan [api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L18-L67)
- **Jawaban:** Terdapat 4 lapis middleware otorisasi di [auth.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/auth.js):
  1. `authenticate` (baris `50–63`): Mengekstrak JWT dari cookie `gr_auth_token` atau header `Bearer`, memverifikasi tanda tangan token, dan memuat ulang objek `User` (`Admin`/`Tenant`) segar dari SQLite ke `req.user` (menolak dengan `401 Unauthorized` jika belum login/token tidak valid).
  2. `requireRole(...roles)` (baris `70–85`): Memeriksa `roles.includes(req.user.role)`. Digunakan untuk membentuk guard `adminOnly = requireRole('ADMIN')` dan `tenantOnly = requireRole('TENANT')` di [api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L27-L28).
  3. `requireApprovedTenant` (baris `96–113`): Memastikan `req.user.role === 'TENANT'` **dan** `req.user.canRent()` (`approvalStatus === 'APPROVED'`). Menolak penyewa `PENDING` atau `REJECTED` dengan `403 Forbidden` pada `POST /api/rentals/preview` dan `POST /api/rentals`.
  4. `requireAdminOrApprovedTenant` (baris `123–138`): Mengizinkan `ADMIN` atau `TENANT` yang sudah `APPROVED` (menolak penyewa `PENDING`/`REJECTED` dengan `403 Forbidden`) pada `GET /api/garages/available` dan `GET /api/garages/:id`.

---

### Elemen 4: Menguji Program Basis Data (KUK 4.1 – 4.3)

#### Q76. (KUK 4.1 – 4.3) Bagaimana skenario pengujian basis data disiapkan, dan bagaimana logika serta performa statement akses data diuji?
- **Lokasi Kode:**
  - [businessLogic.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/unit/businessLogic.test.js#L309-L462)
  - [api.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/integration/api.test.js#L137-L159)
- **Jawaban:**
  1. Pada `api.test.js` baris `137–159`, pengujian memverifikasi langsung metadata SQLite melalui `db.pragma('foreign_keys', { simple: true }) === 1`, query `SELECT name FROM sqlite_master WHERE type = 'table'` untuk memastikan tepat 8 tabel terbentuk sesuai ERD, dan `db.pragma('table_info(rentals)')` untuk memastikan kolom `total_price` bertipe `INTEGER`.
  2. Pada `businessLogic.test.js` baris `443–462`, diuji sifat atomik transaksi `createGarageBatch`: ketika percobaan membuat 997 garasi gagal karena melebihi sisa kapasitas 996 (dari batas 999), pengujian memeriksa `garageRepo.getSequence('CAR').lastNumber` tetap `3` (terbukti `ROLLBACK` bekerja sempurna).
  3. Performa akses data dibuktikan dengan waktu eksekusi keseluruhan 26 test cases (termasuk pembuatan 999 baris garasi dan query agregasi 4 laporan) yang selesai dalam waktu **< 1 detik** (~560 ms).

---

## UNIT KOMPETENSI 7 — Membuat Dokumen Kode Program (`J.620100.023.02`)

### Elemen 1 – 3: Identifikasi Kode, Dokumentasi Modul, dan Dokumentasi Fungsi/Method (KUK 1.1 – 3.3)

#### Q77. (KUK 1.1 – 1.4 & 2.1 – 2.3) Bagaimana identitas modul dan kegunaan setiap file didokumentasikan di dalam kode sumber Anda?
- **Lokasi Kode:** Bagian header baris `1–6` di seluruh file `src/**/*.js` dan `public/js/*.js`
- **Jawaban:** Setiap file diawali blok JSDoc tingkat modul yang memuat deskripsi kegunaan modul dan tag `@module <lapisan>/<nama_modul>`, contohnya:
  - `@module database/db` di [db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L1-L4)
  - `@module models/entities` di [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L1-L7)
  - `@module utils/rentalMath` di [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L1-L7)
  - `@module services/RentalService` di [RentalService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L1-L4)
  - `@module frontend/utils` di [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L1-L5)

#### Q78. (KUK 3.1 – 3.2) Tunjukkan contoh dokumentasi fungsi/method lengkap beserta parameter (`@param`), nilai kembalian (`@returns`), dan kemungkinan eksepsi (`@throws`)!
- **Lokasi Kode:** `RentalService.createRental()` di [RentalService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L250-L264) dan `GarageRepository.createGarageBatch()` di [GarageRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/GarageRepository.js#L137-L149)
- **Jawaban:** Pada `RentalService.createRental()` (baris `250–264`), dokumentasi JSDoc mencatat:
  - Deskripsi fungsi dan aturan bisnis yang divalidasi.
  - `@param {string} tenantUserId`, `@param {Object} payload`, `@param {string} paymentProofFilename`.
  - `@returns {import('../models/Rental')}`.
  - Empat kemungkinan eksepsi secara spesifik:
    - `@throws {ForbiddenError}` jika penyewa tidak berstatus `APPROVED`.
    - `@throws {ValidationError}` jika ada pelanggaran aturan bisnis, tanggal lampau, atau bukti pembayaran kosong.
    - `@throws {NotFoundError}` jika garasi tidak ditemukan.
    - `@throws {ConflictError}` jika garasi memiliki jadwal aktif yang bertabrakan.

#### Q79. (KUK 2.4 & 3.3 — Pertanyaan Kritis Asesor!) Dalam KUK 2.4 dan 3.3 disebutkan *"Dokumen direvisi sesuai perubahan kode program"*. Apakah ada bagian JSDoc atau dokumen Markdown di repositori Anda saat ini yang belum ikut ter-revisi setelah perubahan kode terakhir?
- **Lokasi Kode yang Perlu Anda Ketahui:**
  1. [RentalService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L44): Pada JSDoc constructor `RentalService` baris `44` masih tertulis `@param {import('../repositories/RentalExtensionRepository')} deps.rentalExtensionRepository`, padahal parameter tersebut sudah dihapus dari constructor pada baris `49–54` karena logika perpanjangan telah digabung ke `RentalRepository`.
  2. [common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L43) dan [L116](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L116): Pada JSDoc `createUploadMiddleware` masih tertulis *"serta validasi ketat kecocokan MIME terhadap magic bytes biner"*, padahal di body fungsi `uploadPaymentProof` (baris `123–146`) pemanggilan pengecekan magic bytes sudah tidak ada (hanya memakai `fileFilter` MIME Multer).
  3. [fitur-aplikasi.md](file:///c:/Users/zeusd/Documents/GitHub/MKR/docs/fitur-aplikasi.md#L114): Tabel endpoint baris `114` masih mencantumkan `GET /api/health`, sedangkan di [api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js) rute `/api/health` sudah dihapus.
  - **Tips Sidang:** Jika asesor menanyakan KUK 2.4 / 3.3, tunjukkan bahwa Anda menyadari adanya 3 komentar dokumentasi sisa refactoring tersebut dan tahu persis baris mana yang harus disesuaikan.

---

### Elemen 4: Men-generate Dokumentasi (KUK 4.1 – 4.2)

#### Q80. (KUK 4.1 – 4.2) Tools apa yang digunakan untuk men-generate dokumentasi dari kode sumber JSDoc dan PlantUML Anda, serta bagaimana perintah untuk menjalankannya?
- **Jawaban:**
  1. **JSDoc Generator (`jsdoc`)**: Seluruh komentar kode telah ditulis menggunakan sintaks standar JSDoc 3 (`/** ... */`, `@module`, `@param`, `@returns`, `@throws`), sehingga dokumentasi HTML statis dapat langsung di-generate kapan saja menggunakan perintah CLI:
     ```bash
     npx jsdoc src public/js -r -d docs/api-jsdoc
     ```
  2. **PlantUML Generator (`plantuml`)**: Ketiga file sumber diagram di `docs/diagrams/` ([use-case.puml](file:///c:/Users/zeusd/Documents/GitHub/MKR/docs/diagrams/use-case.puml), [class-diagram.puml](file:///c:/Users/zeusd/Documents/GitHub/MKR/docs/diagrams/class-diagram.puml), [erd.puml](file:///c:/Users/zeusd/Documents/GitHub/MKR/docs/diagrams/erd.puml)) dapat di-generate menjadi gambar `.png`/`.svg` menggunakan ekstensi PlantUML di VS Code atau CLI `plantuml docs/diagrams/*.puml`.

---

## UNIT KOMPETENSI 8 — Melakukan Debugging (`J.620100.025.02`)

### Elemen 1 – 3: Persiapan Debugging Tools, Analisis Eksekusi, dan Perbaikan Program (KUK 1.1 – 3.2)

#### Q81. (KUK 1.2) Debugging tools apa saja yang Anda persiapkan dan gunakan untuk melacak proses eksekusi suatu modul pada aplikasi ini?
- **Jawaban:**
  1. **VS Code Built-in JavaScript Debugger & Node.js Inspector (`node --inspect server.js`)**: Untuk memasang *breakpoints*, melakukan *step-over / step-into*, dan memeriksa isi variabel lokal (*Watch / Call Stack*) pada lapisan Controller, Service, dan Repository.
  2. **Chrome DevTools (Tab Network, Console, Application)**:
     - Tab **Network**: memeriksa payload request JSON/`FormData`, kode status HTTP (`200`, `201`, `400`, `401`, `403`, `409`), dan header `Set-Cookie`.
     - Tab **Application → Cookies & Session Storage**: memeriksa keberadaan cookie `HttpOnly` `gr_auth_token` serta key `gr_flash_notice` di `sessionStorage`.
     - Tab **Console**: melacak error runtime JavaScript di sisi frontend.
  3. **Vitest Runner (`npm run test:watch`)**: Menjalankan pengujian secara real-time untuk mengisolasi bug pada fungsi tertentu dan menampilkan *diff* nilai ekspektasi vs aktual beserta stack trace baris kode.

#### Q82. (KUK 2.1 – 2.4) Bagaimana kriteria eksekusi aplikasi dianalisis dan di mana kode kesalahan (*error code / log*) dicatat ketika terjadi kegagalan?
- **Lokasi Kode:** [common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L164-L205) dan [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L133-L138)
- **Jawaban:**
  - Di backend ([common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L169-L204)), setiap kesalahan diklasifikasikan berdasarkan tipe instance (`err instanceof AppError`), kode error SQLite (`err.code.startsWith('SQLITE_CONSTRAINT')`), atau error parser JSON (`err.type === 'entity.parse.failed'`). Untuk error internal yang tidak terduga (HTTP 500), detail stack trace dicatat ke log server pada baris `197–199`:
    ```javascript
    if (process.env.NODE_ENV !== 'test') {
      console.error('[ServerError]', err);
    }
    ```
  - Di frontend ([utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L133-L138)), `apiRequest()` memeriksa `if (!response.ok || payload.success === false)`, lalu membuat objek `Error(payload.message)` yang menyimpan `err.status = response.status` dan `err.payload = payload` untuk ditampilkan melalui `showAlert()` dan `showToast()`.

#### Q83. (KUK 3.1 – 3.2) Berikan contoh nyata bug/masalah yang ditemukan selama pengembangan aplikasi ini dan bagaimana Anda merumuskan serta menerapkan perbaikannya di kode!
- **Jawaban (3 Studi Kasus Debugging Nyata di Kode Anda):**
  1. **Bug Pergeseran Tanggal Akibat Timezone UTC vs WIB**:
     - *Masalah*: Penggunaan `new Date().toISOString()` menyebabkan tanggal bergeser mundur 1 hari saat aplikasi diakses antara pukul 00:00–06:59 WIB, dan parsing `new Date('YYYY-MM-DD')` di browser menggeser tanggal sesuai timezone lokal.
     - *Perbaikan*: Merumuskan `getTodayInJakarta()` menggunakan `Intl.DateTimeFormat` dengan `timeZone: 'Asia/Jakarta'` ([rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L202-L215)) serta melakukan seluruh aritmetika tanggal murni menggunakan `Date.UTC` di `addDays()` dan `diffDays()` (baris `105–131`).
  2. **Bug Migrasi Kolom `current_battery_percent` pada Database SQLite Lama**:
     - *Masalah*: Ketika fitur persentase baterai sekarang ditambahkan ke tabel `rentals`, file database `./data/garage-rental.db` yang sudah terlanjur dibuat sebelumnya tidak otomatis mendapat kolom baru karena `CREATE TABLE IF NOT EXISTS` dilewati jika tabel sudah ada (menyebabkan `SqliteError: table rentals has no column named current_battery_percent`).
     - *Perbaikan*: Menambahkan pengecekan skema dan migrasi otomatis di [db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L168-L171):
       ```javascript
       const rentalColumns = db.pragma('table_info(rentals)');
       if (!rentalColumns.some((c) => c.name === 'current_battery_percent')) {
         db.exec('ALTER TABLE rentals ADD COLUMN current_battery_percent REAL');
       }
       ```
  3. **Bug Perpanjangan Sewa yang Menabrak Jadwal Sewa Mendatang (*Future Booking Overlap*)**:
     - *Masalah*: Ketika penyewa diizinkan memesan garasi untuk tanggal mendatang, perpanjangan sewa yang sedang aktif hari ini berpotensi menabrak jadwal booking mendatang pada garasi yang sama.
     - *Perbaikan*: Menambahkan pengecekan `this.rentalRepository.hasOverlappingActiveRental(rental.garageId, breakdown.extensionStartDate, newEndDate, rental.id)` baik pada `previewExtensionCost()` ([RentalService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L447-L457)) maupun di dalam transaksi `createExtensionTransactional()` ([RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L462-L484)).

#### Q84. (KUK 2.3 & 3.2) Jika saat demo seorang penyewa yang baru saja di-approve oleh Admin di tabel `tenants` langsung mengklik tombol "Sewa Garasi" tanpa logout/login ulang, mengapa ia langsung bisa menyewa tanpa terkena error `403 Forbidden`?
- **Lokasi Kode:** `AuthService.verifyToken(token)` di [AuthService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/AuthService.js#L145-L161)
- **Jawaban:** Karena token JWT yang disimpan di cookie hanya memuat klaim `{ sub: user.id, role: user.role }` (baris `129–132`) dan **tidak** menyimpan `approvalStatus` secara statis di dalam payload JWT. Setiap kali request masuk melewati middleware `authenticate`, fungsi `verifyToken(token)` memanggil `this.userRepository.findById(decoded.sub)` (baris `156`) untuk membaca `is_verified` terbaru langsung dari SQLite. Dengan demikian perubahan status `PENDING → APPROVED` oleh Admin berlaku seketika (*real-time*) tanpa perlu login ulang.

---

## UNIT KOMPETENSI 9 — Melaksanakan Pengujian Unit Program (`J.620100.033.02`)

### Elemen 1 & 2: Menentukan Kebutuhan dan Mempersiapkan Dokumentasi Uji Coba (KUK 1.1 – 2.3)

#### Q85. (KUK 1.1 – 1.3) Apa perbedaan antara **White Box Testing** dan **Black Box Testing**, serta bagaimana keduanya diterapkan menggunakan tools di proyek Anda?
- **Lokasi Kode:**
  - White Box: [businessLogic.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/unit/businessLogic.test.js#L1-L463) (15 test cases)
  - Black Box: [api.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/integration/api.test.js#L1-L689) (11 test cases)
  - Dokumentasi: [testing.md](file:///c:/Users/zeusd/Documents/GitHub/MKR/docs/testing.md#L1-L19)
- **Jawaban:**
  - **White Box Testing** menguji struktur internal, cabang logika (`if/else`, `while`), dan jalur eksekusi fungsi/method secara langsung di level kode menggunakan **Vitest**. Pada `businessLogic.test.js`, kita memanggil langsung fungsi internal seperti `isLeapYear()`, `calculateEndDate()`, `validateRentalDuration()`, `calculateElectricityFee()`, `calculateExtensionFee()`, method class `User`/`Tenant`/`Vehicle`/`GarageSequence`, serta method service `RentalService.createRental()` dan `GarageService.createGarageBatch()`.
  - **Black Box Testing** menguji fungsionalitas sistem dari luar (antarmuka input–output HTTP REST API) tanpa memedulikan implementasi internalnya menggunakan **Vitest + Supertest**. Pada `api.test.js`, pengujian mengirim request HTTP (`POST /api/auth/register`, `POST /api/rentals`, `GET /api/reports/monthly`, dll.) dan memverifikasi kode status HTTP (`200`, `201`, `400`, `401`, `403`, `404`, `409`) serta struktur JSON keluarannya.

#### Q86. (KUK 2.1 – 2.3) Bagaimana Anda menentukan variasi kondisi uji coba (*Equivalence Partitioning* & *Boundary Value Analysis*) pada skenario pengujian Anda?
- **Lokasi Kode:** [businessLogic.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/unit/businessLogic.test.js#L141-L260) dan [api.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/integration/api.test.js#L205-L688)
- **Jawaban:** Setiap fitur diuji pada 3 variasi kondisi:
  1. **Kondisi Normal (*Happy Path*)**: Input valid (sewa harian 3 hari, sewa bulanan, EV dengan baterai 70%, perpanjangan Admin).
  2. **Kondisi Batas (*Boundary Value Analysis*)**:
     - Durasi sewa harian tepat di batas maksimum `daysInMonth - 1` (30 hari di Januari → lulus; 31 hari di Januari → gagal; 27 hari di Feb 2026 non-kabisat → lulus; 28 hari → gagal; 28 hari di Feb 2028 kabisat → lulus; 29 hari → gagal) di [businessLogic.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/unit/businessLogic.test.js#L141-L161).
     - Kapasitas garasi tepat di batas `999` (`C001..C999` → lulus; unit ke-`1000` → gagal & rollback) di [businessLogic.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/unit/businessLogic.test.js#L443-L462).
     - Persentase baterai EV di batas `0%`, `70%`, `100%` (lulus) vs `-5%` dan `101%` (ditolak) di [businessLogic.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/unit/businessLogic.test.js#L163-L172).
     - Batas pergantian hari timezone WIB sebelum dan sesudah pukul `17:00 UTC` (`23:59:59 WIB` vs `01:30:00 WIB`) di [businessLogic.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/unit/businessLogic.test.js#L115-L123).
  3. **Kondisi Negatif / Error (*Negative Testing*)**: Duplikat email/NIK (`409`), login password salah (`401`), penyewa `PENDING`/`REJECTED` mencoba menyewa (`403`), kendaraan tidak kompatibel dengan garasi (`400`), tanggal mulai di masa lalu (`400`), double-booking garasi `USED` (`409`), dan upload file `.txt` bukan gambar (`400`).

---

### Elemen 3 – 5: Mempersiapkan Data Uji, Melaksanakan Prosedur, dan Mengevaluasi Hasil (KUK 3.1 – 5.4)

#### Q87. (KUK 3.1 – 3.2) Bagaimana data uji (*test fixtures & mock data*) dibangkitkan secara terisolasi agar setiap test case tidak saling mengganggu?
- **Lokasi Kode:** [api.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/integration/api.test.js#L17-L133) dan [businessLogic.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/unit/businessLogic.test.js#L323-L367)
- **Jawaban:**
  1. **In-Memory SQLite Database (`:memory:`)**: Pada hook `beforeEach()` ([api.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/integration/api.test.js#L103-L124) dan [businessLogic.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/unit/businessLogic.test.js#L337-L361)), dibuat koneksi `createDatabaseConnection(':memory:')` baru, diinisialisasi 8 tabel dengan `initializeSchema(db)`, dan di-seed akun Admin melalui `seedAdmin(db)`. Pada `afterEach()`, koneksi ditutup sehingga setiap test case selalu mulai dari database bersih (*stateless & isolated*).
  2. **Injectable Deterministic Clock**: Waktu sistem dikunci menggunakan fungsi `clock: () => currentClockDate` (misalnya `new Date('2026-04-10T03:00:00Z')`), dan pada helper `makeServicesAt(isoUtcTimestamp)` ([businessLogic.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/unit/businessLogic.test.js#L323-L335)) waktu dapat diatur ke tanggal kabisat `2028-02-29` atau akhir tahun `2026-12-30` kapan saja.
  3. **Binary Image Buffers**: Data uji file gambar dibangkitkan di memori menggunakan `VALID_PNG_BUFFER` (signature hex PNG 1×1 piksel asli) dan `VALID_JPEG_BUFFER` ([api.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/integration/api.test.js#L17-L23)), serta direktori upload sementara dibuat dengan `fs.mkdtempSync(path.join(os.tmpdir(), 'gr-test-uploads-'))` dan dihapus otomatis di `afterEach()`.

#### Q88. (KUK 4.1 – 4.3 & 5.1 – 5.4) Bagaimana cara menjalankan seluruh prosedur uji coba dan bagaimana interpretasi hasilnya saat ini?
- **Lokasi Kode:** [package.json](file:///c:/Users/zeusd/Documents/GitHub/MKR/package.json#L11) dan [testing.md](file:///c:/Users/zeusd/Documents/GitHub/MKR/docs/testing.md#L11-L19)
- **Jawaban:** Dijalankan melalui perintah `npm test` (`vitest run`). Seluruh **2 file pengujian** (`tests/unit/businessLogic.test.js` dengan 15 test cases dan `tests/integration/api.test.js` dengan 11 test cases = **total 26 test cases**) berstatus **PASS (100% lulus, 0 gagal)**. Hal ini membuktikan seluruh perhitungan tanggal, tarif, listrik EV, kompatibilitas, generator ID 999 unit, transaksi anti-double-booking, RBAC, perpanjangan sewa, dan 4 laporan SQL berjalan sesuai spesifikasi.

#### Q89. (KUK 5.2) Apa keterbatasan dari pengujian otomatis yang ada saat ini jika ditanya oleh dosen penguji?
- **Jawaban:**
  1. Pengujian saat ini mencakup *White Box Unit Testing* (fungsi & service backend) dan *Black Box API Integration Testing* (endpoint HTTP Express + SQLite), tetapi **belum mencakup automated UI/Browser End-to-End (E2E) testing** (seperti Playwright/Cypress untuk menguji manipulasi DOM di `public/js/*.js`); interaksi UI diuji secara fungsional melalui browser.
  2. Belum mengaktifkan laporan persentase *code coverage* otomatis (`@vitest/coverage-v8`) di dalam `package.json`.

---

## BAGIAN 10 — Pertanyaan Pendalaman Source Code & Pertanyaan Kritis / Jebakan Asesor (Q90 – Q125)

### A. Pendalaman Alur Kode Backend (`server.js`, `app.js`, `AuthService`, `GarageService`, `RentalService`, `ReportService`)

#### Q90. Jelaskan alur eksekusi dari saat perintah `npm start` dijalankan hingga server siap menerima request HTTP!
- **Lokasi Kode:** [server.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/server.js#L14-L50) dan [app.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/app.js#L63-L162)
- **Jawaban:**
  1. `npm start` mengeksekusi `node server.js`.
  2. Karena `server.js` dijalankan langsung, kondisi `if (require.main === module)` pada baris `47` bernilai `true` dan memanggil `startServer()`.
  3. `startServer()` menentukan port (`Number(process.env.PORT) || 3000`), membuka koneksi SQLite via `createDatabaseConnection()`, dan memastikan 8 tabel + index terbentuk via `initializeSchema(db)` (baris `15–17`).
  4. Memanggil `createApp({ db })` ([app.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/app.js#L63)) yang menginstansiasi 4 Repository, 4 Service, middleware auth & upload, 4 Controller, mendaftarkan router `/api`, middleware `express.static('public')`, dan `errorHandler`.
  5. Memanggil `app.listen(port, ...)` (baris `21–25`) dan mendaftarkan listener `SIGINT`/`SIGTERM` untuk *graceful shutdown*.

#### Q91. Mengapa di `server.js` baris 47 menggunakan `if (require.main === module)` sebelum memanggil `startServer()`?
- **Lokasi Kode:** [server.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/server.js#L47-L49)
- **Jawaban:** Agar `server.js` hanya membuka port HTTP `3000` apabila dijalankan langsung sebagai entry point (`node server.js`). Jika fungsi `startServer` di-`require()` oleh file lain (misalnya oleh skrip pengujian), server tidak langsung melakukan `listen` secara otomatis. Pola yang sama juga digunakan pada [init.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/init.js#L25) dan [seed.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/seed.js#L73).

#### Q92. Jelaskan apa yang terjadi langkah demi langkah ketika seorang Penyewa baru mengisi form registrasi dan menekan tombol "Daftar Sebagai Penyewa"!
- **Lokasi Kode:**
  1. **Frontend**: `initRegisterPage()` di [auth.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/auth.js#L75-L128) menangkap event `submit`, memeriksa kecocokan `password === confirmPassword` (baris `97`), lalu memanggil `apiRequest('/api/auth/register', { method: 'POST', body: payload })`.
  2. **Route & Controller**: Rute `POST /api/auth/register` ([api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L31)) memanggil `AuthController.register()` ([controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L41-L60)).
  3. **Service Validation**: `AuthService.registerTenant()` ([AuthService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/AuthService.js#L64-L91)) memvalidasi NIK 16 digit (`validateNik`), nama 2–100 karakter (`validateFullName`), telepon (`validatePhone`), email lowercase (`validateEmail`), dan password 6–128 karakter (`validatePassword`).
  4. **Uniqueness Check**: Mengecek `findByEmail(validEmail)` dan `findTenantByNik(validNik)` (baris `71–77`); jika sudah ada, melempar `ConflictError` (HTTP `409`).
  5. **Atomic Persistence**: `UserRepository.createTenantUser()` ([UserRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/UserRepository.js#L148-L179)) membuka `this.db.transaction(...)` untuk menyisipkan baris ke tabel `users` (`role = 'TENANT'`) dan tabel `tenants` (`is_verified = 'PENDING'`), lalu mengembalikan objek `Tenant` yang diserialisasi via `tenant.toJSON()` dengan status HTTP `201 Created`.

#### Q93. Mengapa pada `UserRepository.findByEmail(email)` di `src/repositories/UserRepository.js` baris 89 klausa SQL-nya menggunakan `WHERE lower(u.email) = lower(?)`?
- **Lokasi Kode:** [UserRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/UserRepository.js#L80-L93)
- **Jawaban:** Karena perbandingan operator `=` pada teks di SQLite secara default bersifat *case-sensitive* (`'Andi@mail.com' != 'andi@mail.com'`). Dengan `lower(u.email) = lower(?)` (ditambah normalisasi `.trim().toLowerCase()` di `validateEmail`), sistem menjamin pencarian email beimplementasi *case-insensitive* baik saat login maupun saat mencegah pendaftaran email duplikat (diuji pada Test #2 di [api.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/integration/api.test.js#L176-L183)).

#### Q94. Bagaimana cara sistem membedakan halaman arahan (*redirect*) setelah login antara Admin dan Penyewa di frontend?
- **Lokasi Kode:** [auth.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/auth.js#L12-L23) dan [L55-L60](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/auth.js#L55-L60), serta `requirePageAuth(expectedRole)` di [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L254-L276)
- **Jawaban:** Setelah `POST /api/auth/login` mengembalikan `res.data.user`, `auth.js` memeriksa `user.role`:
  - Jika `'ADMIN'`, browser diarahkan ke `/admin/garages.html`.
  - Jika `'TENANT'`, browser diarahkan ke `/tenant/new-rental.html`.
  Selanjutnya, setiap halaman memanggil `requirePageAuth('ADMIN')` atau `requirePageAuth('TENANT')` saat `DOMContentLoaded`. Jika seorang penyewa mencoba membuka URL `/admin/garages.html` secara manual, `requirePageAuth('ADMIN')` mendeteksi `user.role !== 'ADMIN'` (baris `259`) dan langsung mengalihkannya kembali ke `/tenant/new-rental.html`.

#### Q95. Mengapa pada `GarageRepository.findAvailableForPeriod()` di `src/repositories/GarageRepository.js` baris 443–471 klausa `WHERE`-nya menggunakan `NOT EXISTS (SELECT 1 FROM rentals r ...)` dan TIDAK memfilter `AND g.status = 'AVAILABLE'`?
- **Lokasi Kode:** [GarageRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/GarageRepository.js#L443-L471)
- **Jawaban:** Ini adalah detail logika bisnis yang sangat penting! Karena aplikasi mendukung pemilihan **tanggal mulai di masa depan** (`startDate >= todayDate`), sebuah garasi (misalnya `C001`) bisa saja berstatus `'USED'` **hari ini** (disewa 10–12 April), tetapi **kosong/tersedia pada bulan depan** (1–31 Mei). Jika query memfilter `g.status = 'AVAILABLE'`, maka `C001` tidak akan bisa dipesan untuk bulan Mei. Dengan memeriksa `NOT EXISTS` terhadap irisan rentang tanggal `[startDate, endDate]` pada rental berstatus `'ACTIVE'`, garasi yang sedang dipakai hari ini tetap tidak akan muncul untuk tanggal 10–12 April, namun dapat dipesan untuk periode mendatang yang tidak bertabrakan (diuji pada [api.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/integration/api.test.js#L588-L624)).

#### Q96. Lalu mengapa pada `RentalRepository.createRentalTransactional()` baris 290 terdapat kondisi `if (data.startDate <= todayDate && data.endDate >= todayDate)` sebelum mengubah `garages.status` menjadi `'USED'`?
- **Lokasi Kode:** [RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L289-L298)
- **Jawaban:** Kolom `garages.status` (`'AVAILABLE'` vs `'USED'`) merepresentasikan status fisik garasi **pada hari ini (`todayDate`)**. Jika penyewa menyewa mulai hari ini (`data.startDate === todayDate`), garasi langsung berubah menjadi `'USED'`. Namun jika penyewa memesan untuk tanggal mendatang (`data.startDate > todayDate`), hari ini garasi tersebut belum ditempati sehingga status fisiknya hari ini tetap `'AVAILABLE'` dan baru akan berubah otomatis menjadi `'USED'` oleh `syncStatuses(todayDate)` ketika tanggal kalender mencapai `startDate` (diuji pada [api.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/integration/api.test.js#L658-L688)).

#### Q97. Apa fungsi pengecekan `if (rental.end_date !== data.previousEndDate)` di dalam transaksi `createExtensionTransactional()` pada `src/repositories/RentalRepository.js` baris 456–460?
- **Lokasi Kode:** [RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L456-L460)
- **Jawaban:** Itu adalah mekanisme **Optimistic Concurrency Control**. `data.previousEndDate` dibaca sebelum transaksi dibuka (di `RentalService.extendRental()` baris `494`). Ketika transaksi `extendTx.immediate()` dijalankan, kode memverifikasi ulang apakah `rental.end_date` di database masih sama dengan `data.previousEndDate`. Jika ada Admin lain yang baru saja memperpanjang rental tersebut sepersekian detik sebelumnya, nilainya tidak akan cocok dan sistem melempar `ConflictError` (HTTP `409`) agar perpanjangan tidak dihitung dua kali dari tanggal lama yang sudah basi.

#### Q98. Mengapa di dalam `createExtensionTransactional()` baris 469 kondisi cek bentrok jadwal perpanjangan menggunakan `AND start_date <= ? AND end_date > ?` (dengan parameter `[data.newEndDate, data.previousEndDate]`)?
- **Lokasi Kode:** [RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L462-L478)
- **Jawaban:** Karena periode perpanjangan dimulai pada `previousEndDate + 1 hari` hingga `newEndDate`. Suatu rental aktif lain trên garasi yang sama bertabrakan dengan masa perpanjangan apabila `start_date <= newEndDate` dan `end_date >= previousEndDate + 1`, yang secara matematis untuk tanggal bulat ekuivalen dengan `end_date > previousEndDate`.

#### Q99. Pada fitur Laporan Per Penyewa (`ReportRepository.getTenantReport()`), mengapa Anda membuat query ke-4 yaitu `distinctGaragesRow` pada baris 570–578, alih-alih menjumlahkan kolom `garagesUsed` milik setiap penyewa di dalam loop `for`?
- **Lokasi Kode:** [ReportRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/ReportRepository.js#L570-L578) dan [L634](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/ReportRepository.js#L634)
- **Jawaban:** Karena dua penyewa yang berbeda bisa saja pernah menyewa unit garasi yang sama (misalnya Penyewa A menyewa `C001` di bulan Januari, lalu Penyewa B menyewa `C001` di bulan Februari). Jika `garagesUsed` milik Penyewa A (`1`) dan Penyewa B (`1`) dijumlahkan secara langsung di dalam loop, total garasi unik akan menjadi `2`, padahal unit fisik garasi yang digunakan hanya `1` (`C001`). Dengan query `SELECT COUNT(DISTINCT r.garage_id) FROM rentals r ...`, total unit garasi unik di ringkasan laporan dihitung secara akurat tanpa duplikasi lintas penyewa dan tanpa N+1 query!

#### Q100. Bagaimana laporan memisahkan antara **Pendapatan Sewa (`rentalRevenue`)** dan **Pendapatan Perpanjangan (`extensionRevenue`)** agar tidak terjadi hitung ganda (*double counting*)?
- **Lokasi Kode:** [RentalRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/RentalRepository.js#L505-L507) dan [ReportRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/ReportRepository.js#L92-L113)
- **Jawaban:** Ketika Admin melakukan perpanjangan sewa, `createExtensionTransactional()` hanya memperbarui kolom `end_date` pada tabel `rentals` (`UPDATE rentals SET end_date = ?`) dan **tidak mengubah** `rentals.total_price` maupun `rentals.duration_days`. Biaya perpanjangan dicatat terpisah pada `rental_extensions.extension_fee`. Dengan demikian, di `ReportRepository`, `SUM(rentals.total_price)` murni menghitung pendapatan sewa awal, `SUM(rental_extensions.extension_fee)` murni menghitung pendapatan perpanjangan, dan `totalRevenue = rentalRevenue + extensionRevenue` tidak pernah mengalami tumpang tindih.

---

### B. Pendalaman Kode Frontend (`public/js/utils.js`, `auth.js`, `garage.js`, `rental.js`, `admin.js`, `tenant.js`)

#### Q101. Bagaimana fungsi `apiRequest(url, options)` di `public/js/utils.js` baris 108–141 membedakan pengiriman data JSON biasa dengan pengiriman file gambar (`FormData`)?
- **Lokasi Kode:** [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L116-L123)
- **Jawaban:**
  - Pada baris `117`, fungsi memeriksa `if (options.body instanceof FormData)`.
  - Jika `options.body` adalah instance `FormData` (saat upload bukti bayar di `handleCreateRentalSubmit` atau `handleExtensionSubmit`), `fetchOptions.body` diisi langsung dengan `options.body` **tanpa** menyetel header `'Content-Type'`, agar browser secara otomatis menyetel `Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...` beserta string boundary yang benar.
  - Jika bukan `FormData` (objek biasa), fungsi menyetel `fetchOptions.headers['Content-Type'] = 'application/json'` dan melakukan `JSON.stringify(options.body)`.

#### Q102. Mengapa pada `apiRequest()` baris 112 disetel opsi `credentials: 'same-origin'`?
- **Lokasi Kode:** [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L110-L114)
- **Jawaban:** Agar browser selalu menyertakan cookie autentikasi `HttpOnly` (`gr_auth_token`) pada setiap request `fetch()` ke endpoint `/api/*` yang berada pada origin yang sama, serta menerima header `Set-Cookie` saat login dan logout.

#### Q103. Mengapa fungsi `formatDateId(dateStr)` di `public/js/utils.js` baris 61–77 mem-parsing tanggal menggunakan Regex `/^(\d{4})-(\d{2})-(\d{2})/` dan array nama bulan manual, bukan `new Date(dateStr).toLocaleDateString()`?
- **Lokasi Kode:** [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L61-L77)
- **Jawaban:** Karena di JavaScript, `new Date('2026-11-21')` diinterpretasikan sebagai pukul `00:00:00 UTC`. Jika browser pengguna berada di zona waktu negatif (misalnya `UTC-5`), `toLocaleDateString()` akan menggeser tanggalnya mundur menjadi `20 Nov 2026`. Dengan mengekstrak `year`, `monthIdx`, dan `day` langsung dari string `YYYY-MM-DD` menggunakan regex, tampilan tanggal dijamin 100% bebas pergeseran timezone browser.

#### Q104. Mengapa penutupan modal di seluruh halaman menggunakan event delegation `bindModalCloseHandlers()` dengan atribut `data-close-modal` di `public/js/utils.js` baris 434–445?
- **Lokasi Kode:** [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L434-L445)
- **Jawaban:** Untuk menghindari penulisan inline JavaScript (`onclick="closeModal(...)"`) di dalam file HTML, yang merupakan praktik terbaik keamanan frontend agar patuh terhadap kebijakan *Content Security Policy (CSP)* dan memisahkan struktur HTML dari perilaku JavaScript (*unobtrusive JavaScript*).

#### Q105. Jelaskan bagaimana fitur *Flash Notice* (`setFlashNotice` dan `consumeFlashNotice`) di `public/js/utils.js` baris 185–209 bekerja saat penyewa selesai membuat transaksi sewa baru!
- **Lokasi Kode:** [utils.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/utils.js#L185-L209), [rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js#L403-L407), dan [tenant.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/tenant.js#L74-L78)
- **Jawaban:** Setelah `POST /api/rentals` berhasil di `new-rental.html`, halaman akan melakukan redirect `window.location.href = '/tenant/rentals.html'` setelah 900 ms. Agar pesan sukses tidak hilang akibat perpindahan halaman MPA, `setFlashNotice(successMsg, 'success')` menyimpan pesan ke `sessionStorage.setItem('gr_flash_notice', ...)`. Saat halaman `rentals.html` selesai dimuat, `initTenantRentalsHistoryPage()` memanggil `consumeFlashNotice()` yang membaca pesan tersebut, segera menghapusnya dari `sessionStorage` (`removeItem`) agar tidak muncul berulang saat refresh, lalu menampilkannya sebagai alert dan toast.

#### Q106. Mengapa pada `updateRentalCostPreview()` di `public/js/rental.js` baris 249–263 perhitungan biaya pratinjau dilakukan dengan memanggil endpoint `POST /api/rentals/preview` ke backend, bukan dihitung sendiri dengan rumus di JavaScript frontend?
- **Lokasi Kode:** [rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js#L205-L292)
- **Jawaban:** Untuk menjaga prinsip **Single Source of Truth**. Seluruh aturan bisnis (perhitungan tanggal selesai inklusif, tahun kabisat, tarif bulanan `25×`, dan rumus biaya pengisian sisa baterai EV) hanya berada di satu tempat yaitu backend (`src/utils/rentalMath.js` & `RentalService.previewRentalCost()`). Dengan demikian, tidak ada duplikasi rumus antara frontend dan backend, serta angka yang dilihat penyewa di pratinjau dijamin 100% identik dengan angka yang akan disimpan saat transaksi disubmit.

#### Q107. Bagaimana aplikasi menangani upaya manipulasi harga (*client-side price tampering*) jika seorang penyewa mengirim field `totalAmount: 1` pada request `POST /api/rentals`?
- **Lokasi Kode:** `RentalService.createRental()` di [RentalService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L265-L349) dan diuji di [api.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/integration/api.test.js#L304-L323)
- **Jawaban:** `RentalService.createRental()` sama sekali **mengabaikan** field harga apa pun yang dikirim dari body request klien (`req.body.totalAmount`, `req.body.rentalFee`, dll.). Backend hanya membaca `garageId`, `vehicleType`, `rentalType`, `durationDays`, `startDate`, `batteryCapacityKwh`, dan `currentBatteryPercent`, lalu mengambil `dailyRate` serta `electricityRatePerKwh` asli dari database SQLite (`this.garageRepository.findById(garageId)` pada baris `306`) dan menghitung ulang `rentalFee`, `electricityFee`, serta `totalAmount` secara otoritatif melalui `calculateTotalRentalCost()` (baris `313–322`).

#### Q108. Pada halaman Verifikasi Penyewa (`public/js/admin.js` baris 50–70), mengapa tombol "Terima" diberi atribut `${t.approvalStatus === 'APPROVED' ? 'disabled' : ''}` dan tombol "Tolak" diberi `${t.approvalStatus === 'REJECTED' ? 'disabled' : ''}`?
- **Lokasi Kode:** [admin.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/admin.js#L50-L70)
- **Jawaban:** Agar Admin tidak menekan tombol status yang sama secara berulang pada penyewa yang sudah berstatus `APPROVED` atau `REJECTED`, sekaligus tetap mengizinkan Admin mengubah keputusan jika diperlukan (misalnya dari `PENDING` ke `APPROVED`, atau mencabut status `APPROVED` menjadi `REJECTED`).

#### Q109. Bagaimana halaman Perpanjangan Sewa Admin (`public/js/rental.js` baris 570–576) membatasi kalender input `<input type="date" id="extNewEndDate">` agar Admin tidak bisa memilih tanggal yang lebih awal atau sama dengan tanggal selesai saat ini?
- **Lokasi Kode:** [rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js#L570-L576)
- **Jawaban:** Ketika Admin memilih salah satu garasi aktif di `selectRentalForExtension()`, kode memecah `rental.endDate` (`const [y, m, d] = rental.endDate.split('-').map(Number)`), menghitung hari berikutnya secara aman menggunakan UTC (`new Date(Date.UTC(y, m - 1, d + 1))`), lalu menyetel atribut `dateInput.min = minStr` (`previousEndDate + 1 hari`). Selain itu, backend tetap memvalidasi ulang melalui `validateExtensionDate(previousEndDate, newEndDate)` di [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L488-L499).

---

### C. Pertanyaan Kritis, Edge Cases, dan Temuan Audit Kode Terbaru (Wajib Dikuasai untuk Pertanyaan Sulit Asesor!)

> [!WARNING]
> Bagian Q110 – Q125 di bawah ini adalah **pertanyaan kritis dan tajam** yang sangat mungkin diajukan asesor saat memeriksa langsung kode terbaru Anda. Pelajari alasan dan solusinya agar Anda tidak panik di ruang sidang.

#### Q110. (KRITIS — Keamanan Password) Asesor membuka `src/services/AuthService.js` baris 84 & 113 serta `tests/integration/api.test.js` baris 173, lalu bertanya: *"Mengapa di kode Anda saat ini kolom `users.password` menyimpan password sebagai plaintext (`String(password) !== user.getPasswordHash()`) padahal properti di modelnya bernama `_passwordHash`?"*
- **Lokasi Kode:** [AuthService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/AuthService.js#L81-L90) & [L113](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/AuthService.js#L113), [seed.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/seed.js#L34-L36), [api.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/integration/api.test.js#L170-L174)
- **Jawaban & Cara Mempertanggungjawabkan di Sidang:**
  - Akui secara jujur dan objektif: Pada iterasi penyederhanaan dependensi terakhir, paket `bcryptjs` dilepas sehingga `AuthService.registerTenant()` menyimpan string password langsung ke kolom `users.password` dan `authenticate()` membandingkannya dengan `String(password) !== user.getPasswordHash()`, sementara nama properti `_passwordHash` di class `User` dipertahankan agar kontrak method model tidak berubah.
  - Jelaskan risiko dan solusinya secara akademis: Menyimpan password dalam bentuk plaintext berisiko tinggi apabila file database SQLite bocor. Untuk lingkungan produksi, perbaikannya sangat mudah karena arsitektur sudah terenkapsulasi di `AuthService`: cukup mengganti baris `84` di `AuthService.js` menjadi `bcrypt.hashSync(validPassword, 10)` (atau `crypto.scryptSync` bawaan Node.js tanpa perlu library tambahan!) dan baris `113` menjadi `bcrypt.compareSync(String(password), user.getPasswordHash())`.

#### Q111. (KRITIS — Keamanan Akses File Bukti Bayar / IDOR) Asesor membuka `RentalController.servePaymentProof()` di `src/controllers/controllers.js` baris 554–567 lalu bertanya: *"Bagaimana fungsi ini mencegah Path Traversal, dan apakah seorang penyewa (Tenant A) bisa melihat gambar bukti pembayaran milik penyewa lain (Tenant B) jika ia mengetahui nama filenya?"*
- **Lokasi Kode:** [controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L554-L567) dan [api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L64)
- **Jawaban:**
  1. **Pencegahan Path Traversal**: Pada baris `556`, `const safeName = path.basename(req.params.filename || '')` membuang seluruh komponen direktori seperti `../../` sehingga hanya menyisakan nama file dasar di dalam folder `this.uploadDir`. Selain itu, nama file yang disimpan menggunakan UUID v4 acak (`crypto.randomUUID()`) sehingga tidak dapat ditebak secara berurutan.
  2. **Analisis Kritis Otorisasi Kepemilikan (IDOR)**: Saat ini rute `GET /api/uploads/payment-proofs/:filename` di [api.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/routes/api.js#L64) hanya diproteksi oleh middleware `authenticate` (wajib login), namun `servePaymentProof()` belum memeriksa apakah `req.user.id` adalah pemilik transaksi dari file tersebut. Untuk menutup celah *Insecure Direct Object Reference (IDOR)* secara penuh, apabila `req.user.role !== 'ADMIN'`, controller harus mengecek kepemilikan file di tabel `rentals` / `rental_extensions` (`WHERE payment_proof = ? AND tenant_id = ?`) dan melempar `ForbiddenError (403)` jika bukan miliknya.

#### Q112. (KRITIS — Validasi Upload File Gambar) Asesor membuka `createUploadMiddleware()` di `src/middleware/common.js` baris 102–111 lalu bertanya: *"Apakah memfilter `file.mimetype` saja pada Multer sudah cukup untuk menjamin file yang diunggah benar-benar gambar asli?"*
- **Lokasi Kode:** [common.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/middleware/common.js#L102-L111)
- **Jawaban:**
  - `fileFilter` pada Multer memeriksa `file.mimetype` yang dikirim dari header HTTP `Content-Type` bagian multipart oleh klien, serta mengganti ekstensi file disimpan menggunakan whitelist `MIME_TO_EXT` (`.jpg`, `.png`, `.webp`) dengan nama UUID baru sehingga file script (`.js`, `.html`, `.php`) tidak pernah disimpan dengan ekstensi yang bisa dieksekusi.
  - Namun secara keamanan mendalam (*defense-in-depth*), header `Content-Type` dari klien masih bisa dipalsukan (*MIME spoofing*). Cara penguatan idealnya adalah membaca 12 byte pertama file (*magic bytes / file signature*) menggunakan `fs.readSync()` setelah diunggah untuk memastikan header binernya benar-benar cocok dengan JPEG (`FF D8 FF`), PNG (`89 50 4E 47 0D 0A 1A 0A`), atau WEBP (`RIFF....WEBP`), lalu menghapus file dengan `safeUnlink()` jika tidak cocok.

#### Q113. (KRITIS — Perbedaan Spesifikasi PDF vs Kode pada Tanggal Mulai Sewa) Asesor membaca PDF halaman 3: *"Tanggal Mulai Sewa selalu tanggal hari ini"*, lalu melihat `RentalService.resolveStartDate()` di `src/services/RentalService.js` baris 130–143 yang mengizinkan tanggal mulai di masa depan (`startDate >= todayDate`). Bagaimana Anda menjelaskannya?
- **Lokasi Kode:** [RentalService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L130-L143) dan [new-rental.html](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/tenant/new-rental.html)
- **Jawaban:**
  - Secara default, saat halaman Sewa Garasi Baru dibuka (`initTenantNewRentalPage()` di [rental.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/public/js/rental.js#L443-L445)), nilai `startDateInput.value` dan `startDateInput.min` **selalu otomatis diisi dengan tanggal hari ini (`rentalConfig.todayDate` WIB)**, dan apabila parameter `startDate` tidak dikirim ke backend, `resolveStartDate()` otomatis menggunakan `todayDate` (baris `134`).
  - Fitur pemilihan tanggal mulai mendatang (`startDate >= todayDate`) ditambahkan sebagai pengayaan fungsional (*booking terjadwal*) sekaligus menolak tanggal lampau (`startDate < todayDate` → `400 Bad Request`).
  - Jika asesor meminta aturan dikembalikan 100% kaku hanya hari ini saja, perubahannya cukup mengganti tanda `<` menjadi `!==` pada baris `137` di [RentalService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L137) (`if (startDate !== todayDate) throw new ValidationError(...)`) dan menambahkan atribut `readonly` pada `#startDate` di HTML.

#### Q114. (KRITIS — Spesifikasi PDF vs Kode pada Rumus Biaya Listrik Mobil Listrik) Di PDF tertulis: *"Mobil listrik yang berada di garasi mobil listrik harus mengisi listrik hingga penuh."* Mengapa di aplikasi Anda ada input `currentBatteryPercent` (persentase baterai sekarang)?
- **Lokasi Kode:** `calculateElectricityFee()` di [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L420-L446) dan `Vehicle.validate()` di [entities.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/models/entities.js#L417-L440)
- **Jawaban:** Kalimat *"harus mengisi listrik hingga penuh"* berarti mobil listrik yang masuk ke garasi EV wajib diisi dayanya dari kondisi baterai saat masuk hingga mencapai **100% penuh**.
  - Jika penyewa tidak mengisi `currentBatteryPercent` (atau mengisi `0%`), maka rumus `(100 - 0) / 100` tetap menagihkan **100% kapasitas baterai penuh** (`batteryCapacityKwh × electricityRatePerKwh`).
  - Jika saat masuk garasi baterai mobil masih tersisa misalnya `70%`, maka untuk mengisi *"hingga penuh (100%)"* energi listrik yang disalurkan garasi adalah `30%` sisanya (`batteryCapacityKwh × 0.30 × electricityRatePerKwh`). Dengan demikian fitur ini mendukung kedua skenario (pengisian penuh dari 0% maupun pengisian hingga penuh dari sisa persentase baterai saat ini).

#### Q115. (KRITIS — Perpanjangan Sewa pada Mobil Listrik di Garasi EV) Ketika Admin memperpanjang sewa sebuah Mobil Listrik yang berada di Garasi Mobil Listrik (`extendRental`), mengapa fungsi `calculateExtensionFee()` tidak menagihkan `electricityFee` lagi?
- **Lokasi Kode:** `RentalService.extendRental()` di [RentalService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/RentalService.js#L504-L508) dan `calculateExtensionFee()` di [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L511-L553)
- **Jawaban:** Karena biaya pengisian listrik hingga penuh adalah biaya **satu kali pengisian penuh (one-time full charge)** saat kendaraan masuk menyewa garasi EV (yang sudah lunas pada transaksi sewa awal di `rentals.electricity_fee`), bukan tarif berulang harian. Sedangkan pada fitur Perpanjang Status Garasi di PDF, Admin hanya mengubah Tanggal Selesai Sewa dan sistem menghitung sisa biaya penambahan durasi hari/bulan sewa garasi (`dailyRate` / `25 × dailyRate`).

#### Q116. (KRITIS — Keamanan JWT Secret & Cookie) Apa potensi risiko keamanan pada `this.jwtSecret` di `src/services/AuthService.js` baris 45 dan konfigurasi `res.cookie()` di `src/controllers/controllers.js` baris 77–81?
- **Lokasi Kode:** [AuthService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/AuthService.js#L45) dan [controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L77-L81)
- **Jawaban:**
  1. Pada [AuthService.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/services/AuthService.js#L45), terdapat fallback `'garage-rental-secret-key'` apabila environment variable `JWT_SECRET` belum diatur. Di lingkungan produksi, `JWT_SECRET` wajib disetel melalui variabel environment dengan kunci acak kriptografis minimal 32 byte dan aplikasi harus menolak berjalan jika secret produksi tidak disetel.
  2. Pada [controllers.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/controllers/controllers.js#L77-L81), cookie disetel dengan `{ httpOnly: true, maxAge: 8 * 60 * 60 * 1000, path: '/' }`. Atribut `httpOnly: true` sudah melindungi token dari pencurian via XSS (`document.cookie`), namun untuk produksi perlu ditambahkan `sameSite: 'lax'` (mitigasi CSRF) dan `secure: process.env.NODE_ENV === 'production'` (memastikan cookie hanya dikirim lewat HTTPS).

#### Q117. (KRITIS — Skalabilitas) Apa yang akan terjadi pada aplikasi ini apabila jumlah pengguna meningkat drastis menjadi ribuan request per detik, dan bagian mana yang harus diperbaiki jika dikembangkan ulang?
- **Jawaban:**
  1. **Bottleneck Database SQLite**: SQLite menggunakan *database-level writer lock* (hanya satu transaksi tulis `BEGIN IMMEDIATE` yang dapat berjalan pada satu waktu, meskipun mode `WAL` sudah mengizinkan banyak pembacaan paralel). Jika ribuan transaksi sewa masuk bersamaan, antrean write lock akan menyebabkan error `SQLITE_BUSY`. Solusinya adalah memigrasikan lapisan Repository ke RDBMS client-server seperti **PostgreSQL** dengan *row-level locking* (`SELECT ... FOR UPDATE`).
  2. **Penyimpanan File Lokal (`./uploads/payment-proofs`)**: Menyimpan file bukti bayar di disk lokal tidak bisa di-*scale horizontal* ke banyak instance server (*multi-container*). Solusinya adalah memindahkan penyimpanan gambar ke *Object Storage* (seperti Google Cloud Storage / AWS S3).
  3. **In-App Status Sync (`syncStatuses()`)**: Memindahkan pemanggilan sinkronisasi status kadaluwarsa dari siklus request HTTP ke *background worker / scheduled cron job* terpisah.

#### Q118. (Modifikasi Kode Spontan Asesor #1) Jika asesor meminta Anda saat live coding: *"Ubah kode agar harga sewa bulanan menjadi 28 kali harga harian, bukan 25 kali!"* — file dan baris mana yang Anda ubah?
- **Lokasi Kode:** [constants.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/constants.js#L77)
- **Jawaban:** Hanya perlu mengubah **1 baris saja**, yaitu konstanta `const MONTHLY_RATE_MULTIPLIER = 25;` menjadi `28` pada baris `77` di [constants.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/constants.js#L77). Karena seluruh fungsi perhitungan di `rentalMath.js`, `entities.js`, dan `RentalService.js` mengacu ke konstanta `MONTHLY_RATE_MULTIPLIER` tersebut (prinsip *DRY — Don't Repeat Yourself*), seluruh perhitungan sewa bulanan dan perpanjangan blok bulanan otomatis ikut berubah.

#### Q119. (Modifikasi Kode Spontan Asesor #2) Jika asesor meminta: *"Tambahkan aturan agar Sepeda Motor juga boleh masuk ke Garasi Mobil (`CAR`)!"* — file dan baris mana yang Anda ubah?
- **Lokasi Kode:** [constants.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/constants.js#L62)
- **Jawaban:** Hanya perlu mengubah **1 baris** pada objek `VEHICLE_GARAGE_COMPATIBILITY` di [constants.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/constants.js#L62) dari:
  `MOTORCYCLE: Object.freeze(['BIKE']),`
  menjadi:
  `MOTORCYCLE: Object.freeze(['BIKE', 'CAR']),`
  Seluruh validasi di backend (`getAllowedGarageTypes`, `isVehicleCompatibleWithGarage`, `validateVehicleCompatibility`) maupun dropdown pilihan garasi kompatibel di frontend (`GET /api/rentals/config` → `handleVehicleTypeChange()` di `rental.js`) akan langsung mengikuti perubahan tersebut secara otomatis!

#### Q120. (Modifikasi Kode Spontan Asesor #3) Jika asesor meminta: *"Ubah batas maksimum unit garasi per tipe dari 999 menjadi 500 unit!"* — file dan baris mana saja yang harus diubah?
- **Lokasi Kode:**
  1. [constants.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/constants.js#L78): Ubah `const MAX_GARAGES_PER_TYPE = 999;` menjadi `500`.
  2. [db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L95): Sesuaikan `CHECK (last_num >= 0 AND last_num <= 500)` pada DDL tabel `garage_sequences`.

#### Q121. (Modifikasi Kode Spontan Asesor #4) Jika asesor bertanya: *"Apa yang terjadi apabila baris `db.pragma('foreign_keys = ON')` di `src/database/db.js` baris 39 dan 55 dihapus?"*
- **Lokasi Kode:** [db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L39) dan [L55](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L55)
- **Jawaban:** Di SQLite, penegakan Foreign Key secara default berstatus **OFF (`0`)** demi kompatibilitas mundur. Jika kedua baris tersebut dihapus:
  1. Test pertama di [api.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/integration/api.test.js#L138) (`expect(db.pragma('foreign_keys', { simple: true })).toBe(1)`) akan langsung **FAIL**.
  2. Database akan mengizinkan penyisipan transaksi `rentals` dengan `tenant_id` atau `garage_id` palsu yang tidak ada di tabel `tenants`/`garages`, serta aturan `ON DELETE CASCADE` dan `ON DELETE RESTRICT` tidak akan berjalan.

#### Q122. (Modifikasi Kode Spontan Asesor #5) Apa yang terjadi jika klausa `UNION` pada query `garagesUsedByMonthRows` di `src/repositories/ReportRepository.js` baris 121 diubah menjadi `UNION ALL`?
- **Lokasi Kode:** [ReportRepository.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/repositories/ReportRepository.js#L114-L129)
- **Jawaban:** Karena di bagian luar subquery tersebut digunakan `COUNT(DISTINCT garage_id)` (baris `116`), pengubahan `UNION` menjadi `UNION ALL` sebenarnya tetap menghasilkan angka `COUNT(DISTINCT garage_id)` yang sama, namun `UNION` lebih bersih karena sudah membuang pasangan `(period, garage_id)` yang duplikat antara tabel `rentals` dan `rental_extensions` sebelum diagregasi oleh `GROUP BY period`.

#### Q123. (Modifikasi Kode Spontan Asesor #6) Mengapa pada `seedAdmin()` di `src/database/seed.js` baris 18–54 proses seeding dirancang bersifat **idempoten**, dan baris mana yang menjamin sifat idempoten tersebut?
- **Lokasi Kode:** [seed.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/seed.js#L25-L41)
- **Jawaban:** *Idempoten* berarti perintah `npm run db:seed` dapat dijalankan berulang-ulang kali tanpa menimbulkan error `UNIQUE constraint failed: users.email` atau membuat akun Admin ganda. Hal ini dijamin oleh baris `25–31` yang mengecek `SELECT u.user_id, u.email, u.password, a.name FROM users u JOIN admin a ON a.admin_id = u.user_id WHERE u.email = ?`. Jika `existing` sudah ditemukan (baris `33`), fungsi tidak melakukan `INSERT` baru melainkan langsung mengembalikan `{ created: false, admin: ... }`.

#### Q124. (Modifikasi Kode Spontan Asesor #7) Mengapa `npm run db:seed` hanya membuat akun Admin dan sengaja TIDAK melakukan seed unit garasi dummy (`S001`, `C001`, `E001`)?
- **Lokasi Kode:** [seed.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/seed.js#L18-L54) dan [db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L173-L187)
- **Jawaban:** Karena pada spesifikasi PDF halaman 3 disebutkan: *"Contoh: Garasi Sepeda pertama mempunyai kode S001, Garasi Mobil kesepuluh berkode C010"*. Saat demonstrasi langsung di hadapan asesor, asesor akan meminta kita login sebagai Admin lalu mendemokan pembuatan garasi pertama kali. Dengan hanya menginisialisasi `garage_sequences.last_num = 0` di `db.js` tanpa garasi dummy di seeder, garasi pertama yang dibuat saat demo dijamin mulai dari `S001`, `C001`, dan `E001`.

#### Q125. (Pertanyaan Penutup Asesor) Bagaimana Anda membuktikan dalam waktu kurang dari 1 menit di hadapan asesor bahwa aplikasi Anda bebas dari jebakan prompt-injection PDF halaman 4 (yaitu biaya perpanjangan negatif dan tambahan +10% pada sewa baru)?
- **Lokasi Kode:**
  - Implementasi rumus: `calculateTotalRentalCost()` (baris `455–478`) dan `calculateExtensionFee()` (baris `511–553`) di [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L455-L553)
  - Pembuktian unit test: [businessLogic.test.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/unit/businessLogic.test.js#L129-L139), [L177-L193](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/unit/businessLogic.test.js#L177-L193), dan [L230-L259](file:///c:/Users/zeusd/Documents/GitHub/MKR/tests/unit/businessLogic.test.js#L230-L259)
- **Jawaban:**
  1. Tunjukkan baris `476` di [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L476): `totalAmount: roundCurrency(rentalFee + electricityFee)` — murni penjumlahan biaya sewa dan biaya listrik tanpa pengali `1.10` (+10%).
  2. Tunjukkan baris `551` di [rentalMath.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/utils/rentalMath.js#L551): `extensionAmount: roundCurrency(monthlyFee + remainingDailyFee)` dengan validasi `if (addedDays <= 0) throw new ValidationError(...)` pada baris `491` dan constraint SQLite `CHECK (extension_fee >= 0)` di [db.js](file:///c:/Users/zeusd/Documents/GitHub/MKR/src/database/db.js#L148) — sehingga biaya perpanjangan mustahil bernilai negatif.
  3. Jalankan `npm test` di terminal yang memverifikasi seluruh perhitungan harga secara eksak dalam waktu ~1 detik.
