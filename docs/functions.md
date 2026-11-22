# Dokumentasi Function (JSDoc Reference)

Seluruh function pada backend dan frontend telah didokumentasikan langsung di dalam source code menggunakan standar **JSDoc** bahasa Indonesia (`@param`, `@returns`, `@throws`). Ringkasan indeks function utama per modul disajikan di bawah ini.

## 1. Utilitas Bisnis & Matematika Sewa (`src/utils/rentalMath.js`)

| Function | Parameter | Return | Deskripsi |
|---|---|---|---|
| `isLeapYear(year)` | `year: number` | `boolean` | Menentukan apakah tahun Gregorian adalah tahun kabisat. |
| `getDaysInMonth(year, month)` | `year: number, month: number` | `number` | Menghitung jumlah hari kalender dalam suatu bulan (28/29/30/31) berbasis UTC. |
| `parseDateParts(dateStr)` | `dateStr: string` | `{ year, month, day }` | Memvalidasi format `YYYY-MM-DD` dan kebenaran tanggal kalender secara ketat. |
| `isValidDateString(dateStr)` | `dateStr: string` | `boolean` | Pemeriksaan non-throwing validitas tanggal `YYYY-MM-DD`. |
| `formatDateParts(year, month, day)` | `year, month, day: number` | `string` | Memformat komponen tanggal menjadi string `YYYY-MM-DD` dengan zero-padding. |
| `addDays(dateStr, days)` | `dateStr: string, days: number` | `string` | Menambahkan sejumlah hari ke tanggal `YYYY-MM-DD` tanpa pergeseran timezone. |
| `diffDays(startDate, endDate)` | `startDate, endDate: string` | `number` | Menghitung selisih hari bertanda antara dua tanggal. |
| `diffDaysInclusive(startDate, endDate)` | `startDate, endDate: string` | `number` | Menghitung jumlah hari inklusif dari `startDate` hingga `endDate`. |
| `calculateEndDate(startDate, durationDays)` | `startDate: string, durationDays: number` | `string` | Menghitung tanggal selesai sewa inklusif (`startDate + durationDays - 1`). |
| `getMaxDailyDuration(startDate)` | `startDate: string` | `number` | Mengembalikan batas maksimal durasi sewa harian (`daysInMonth - 1`). |
| `datesOverlap(startA, endA, startB, endB)` | 4× `string` (`YYYY-MM-DD`) | `boolean` | Mengecek apakah dua rentang tanggal tertutup saling bertabrakan. |
| `getTodayInJakarta(now)` | `now?: Date` | `string` | Mengambil tanggal hari ini dalam timezone `Asia/Jakarta` (`YYYY-MM-DD`). |
| `getJakartaTimestamp(now)` | `now?: Date` | `string` | Menghasilkan ISO-8601 timestamp ber-offset `+07:00` (`Asia/Jakarta`). |
| `getAllowedGarageTypes(vehicleType)` | `vehicleType: string` | `string[]` | Mengembalikan tipe garasi yang diizinkan untuk suatu tipe kendaraan. |
| `isVehicleCompatibleWithGarage(vehicleType, garageType)` | `vehicleType, garageType` | `boolean` | Memeriksa kompatibilitas kendaraan dan garasi. |
| `validateVehicleCompatibility(vehicleType, garageType)` | `vehicleType, garageType` | `true` | Melempar `ValidationError` jika kendaraan tidak cocok dengan garasi. |
| `roundCurrency(amount)` | `amount: number` | `number` | Pembulatan nominal Rupiah bilangan bulat aman dari galat floating-point. |
| `validateRentalDuration(startDate, rentalType, requestedDurationDays)` | `startDate, rentalType, requestedDurationDays` | `{ durationDays, monthlyDays, maxDailyDays }` | Memvalidasi aturan durasi maksimal 1 periode bulanan dan batas harian. |
| `calculateDailyRentalFee(durationDays, dailyRate)` | `durationDays, dailyRate: number` | `number` | Menghitung biaya sewa harian (`durationDays × dailyRate`). |
| `calculateMonthlyRentalFee(dailyRate)` | `dailyRate: number` | `number` | Menghitung biaya sewa bulanan (`25 × dailyRate`). |
| `calculateRentalFee(rentalType, durationDays, dailyRate)` | `rentalType, durationDays, dailyRate` | `number` | Memilih perhitungan tarif harian atau bulanan. |
| `calculateElectricityFee(vehicleType, garageType, batteryCapacityKwh, electricityRatePerKwh)` | tipe kendaraan, tipe garasi, kapasitas kWh, tarif/kWh | `number` | Menghitung biaya listrik 1× (`kapasitas × tarif`) khusus EV di Garasi Mobil Listrik, selain itu `0`. |
| `calculateTotalRentalCost(params)` | objek parameter sewa | `{ rentalFee, electricityFee, totalAmount }` | Menghitung rincian total biaya sewa baru (`rentalFee + electricityFee`). |
| `validateExtensionDate(previousEndDate, newEndDate)` | `previousEndDate, newEndDate: string` | `{ extensionStartDate, addedDays }` | Memastikan tanggal selesai baru lebih besar dari tanggal selesai lama. |
| `calculateExtensionFee(previousEndDate, newEndDate, dailyRate)` | `previousEndDate, newEndDate, dailyRate` | `Object` | Menghitung biaya perpanjangan berbasis blok bulanan kalender (`25 × tarif`) + sisa hari (`sisa × tarif`). |

## 2. Validasi Input, Keamanan File & Konstanta (`src/utils/validators.js`, `src/utils/constants.js`)

| Function / Class | Parameter | Return | Deskripsi |
|---|---|---|---|
| `validateEmail`, `validateNik`, `validateFullName`, `validatePhone`, `validatePassword` | string input | `string` | Memvalidasi dan menormalisasi data pendaftaran penyewa. |
| `validatePositiveNumber`, `validatePositiveInteger` | nilai, nama field | `number` | Memvalidasi nominal harga, kapasitas baterai, dan jumlah unit garasi. |
| `validateImageMagicBytes(filePath, declaredMimeType)` | `filePath, declaredMimeType` | `boolean` | Memverifikasi kecocokan ketat 1-ke-1 antara MIME type dan signature biner JPEG/PNG/WEBP. |
| `isSafeFilename(filename)` | `filename: string` | `boolean` | Menolak pola `..`, path separator, dan ekstensi non-gambar untuk mencegah path traversal. |
| `formatCurrencyIDR(amount)` | `amount: number` | `string` | Memformat angka ke tampilan mata uang Rupiah. |
| `AppError`, `ValidationError`, `AuthenticationError`, `ForbiddenError`, `NotFoundError`, `ConflictError` | `message, statusCode` | Error instance | Hierarki kelas error HTTP terstruktur di `src/utils/constants.js`. |

## 3. OOP Domain Entities (`src/models/entities.js`)

- `User` (abstract base class): `getPasswordHash()`, `toJSON()` (tidak mengekspos hash).
- `Tenant extends User`: `isApproved()`, `canRent()`, `toJSON()`.
- `Admin extends User`: `toJSON()`.
- `GarageTypeConfig`: `getMonthlyRate()`, `toJSON()` (representasi tabel `garage_types`).
- `GarageSequence`: `static formatId()`, `generateNextId()`.
- `Garage`: `getStatus()`, `isAvailable()`, `getMonthlyRate()`, `toJSON()`.
- `Vehicle`: `validate()`, `validateCompatibility()`, `isCompatibleWith()`, `toJSON()`.
- `Rental`: `calculateRentalFee()`, `calculateElectricityFee()`, `calculateEndDate()`, `getTotalDurationDays()`, `getTotalExtensionAmount()`, `toJSON()`.
- `RentalExtension`: `static calculateExtensionFee()`, `toJSON()`.

## 4. Database, Repositories, Services, Middleware, Controllers & Routes

- **Database (`src/database/db.js`, `init.js`, `seed.js`)**: `createDatabaseConnection()`, `resolveDatabasePath()`, `initializeSchema()`, `runDbInit()`, `seedAdmin()`, `runDbSeed()`.
- **Repositories (`src/repositories/`)**: `UserRepository`, `GarageRepository` (dengan `needsStatusSync()`), `RentalRepository` (termasuk `getExtensionsMapForRentals()` bebas N+1 dan `createExtensionTransactional()`), `ReportRepository` (dengan `getYearRangeBounds()`/`getMonthRangeBounds()` SARGable).
- **Services (`src/services/`)**: `AuthService` (dengan `resolveJwtSecret()` fail-fast), `GarageService`, `RentalService`, `ReportService`.
- **Middleware (`src/middleware/auth.js`, `src/middleware/common.js`)**: `extractAuthToken()`, `sameOriginGuard()`, `createAuthMiddleware()` (`authenticate`, `requireRole`, `requireApprovedTenant`, `requireAdminOrApprovedTenant`), `createUploadMiddleware()` (`uploadPaymentProof`), `safeUnlink()`, `errorHandler()`, `notFoundHandler()`.
- **Controllers & Routes (`src/controllers/controllers.js`, `src/routes/api.js`)**: `AuthController`, `GarageController`, `RentalController` (termasuk `servePaymentProof()`), `ReportController`, dan `createApiRouter()`.

## 5. Frontend Vanilla JS (`public/js/`)

- `utils.js`: `escapeHtml()`, `formatRupiah()`, `formatDateId()`, `renderStatusBadge()`, `apiRequest()`, `showToast()`, `setFlashNotice()`, `consumeFlashNotice()`, `showAlert()`, `hideAlert()`, `requirePageAuth()`, `bindLogoutButton()`, `openModal()`, `closeModal()`, `bindModalCloseHandlers()`, `buildRentalDetailHtml()`.
- `auth.js`: `redirectIfAuthenticated()`, `initLoginPage()`, `initRegisterPage()`.
- `garage.js`: `toggleElectricityRateField()`, `renderGarageSequenceSummary()`, `loadGaragesTable()`, `initAdminGaragesPage()`.
- `admin.js`: `initAdminDashboardPage()`, `openAdminRentalDetailModal()`, `loadTenantsVerificationTable()`, `openTenantVerifyConfirmModal()`, `executeTenantVerification()`, `initAdminTenantsPage()`, `renderReportSummaryCards()`, `loadMonthlyReport()`, `loadDailyReport()`, `loadGarageTypeReport()`, `loadTenantReport()`, `loadActiveReport()`, `switchReportTab()`, `initAdminReportsPage()`.
- `rental.js`: `handleVehicleTypeChange()`, `handleStartDateChange()`, `handleRentalTypeChange()`, `refreshAvailableGaragesAndPreview()`, `renderEmptyCostSummary()`, `updateRentalCostPreview()`, `handleCreateRentalSubmit()`, `initTenantNewRentalPage()`, `loadActiveRentalsForExtension()`, `selectRentalForExtension()`, `renderExtensionHistoryForSelected()`, `updateExtensionCostPreview()`, `handleExtensionSubmit()`, `initAdminExtensionsPage()`.
- `tenant.js`: `renderTenantStatusNotice()`, `openTenantRentalDetailModal()`, `initTenantDashboardPage()`, `initTenantRentalsHistoryPage()`, `initTenantProfilePage()`.
