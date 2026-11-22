# Dokumentasi Pengujian (Unit Testing & API Testing)

Pengujian perangkat lunak dilaksanakan secara otomatis menggunakan **Vitest** (White Box Testing) dan **Supertest** (Black Box API Testing) terhadap basis data SQLite in-memory serta clock terinjeksi (fixed clock) agar hasil uji deterministik dan dapat direproduksi kapan saja.

## Cara Menjalankan Pengujian

```bash
npm test
```

Untuk menjalankan pengujian beserta laporan **code coverage** (`@vitest/coverage-v8`):

```bash
npm run test:coverage
```

Untuk menjalankan dalam mode watch saat pengembangan:

```bash
npm run test:watch
```

## Ringkasan Hasil Pengujian & Code Coverage Terbaru

- **Test Files**: 3 passed (3 total)
- **Test Cases**: 39 passed (39 total), 0 failed
- **V8 Code Coverage (`src/**/*.js`)**:
  - **Statements**: `89.82%`
  - **Lines**: `89.82%`
  - **Functions**: `75.96%`
  - **Branches**: `71.10%`
  - Modul inti kritis mencapai cakupan sangat tinggi: `src/routes/api.js` (`100%`), `src/app.js` (`99.41%`), `src/utils/constants.js` (`98.87%`), `src/utils/rentalMath.js` (`98.65%`), `src/database/db.js` (`98.21%`), `src/repositories/GarageRepository.js` (`98.17%`), `src/models/entities.js` (`96.75%`), `src/middleware/auth.js` (`93.33%`).

| File Test | Pendekatan | Jumlah Test | Fokus Pengujian |
|---|---|---:|---|
| `tests/unit/businessLogic.test.js` | White Box (Unit + Service + Security) | 19 | Tahun kabisat, tanggal selesai inklusif, timezone `Asia/Jakarta`, tarif harian/bulanan (`25×`), biaya EV, kompatibilitas, ID garasi S/C/E & batas 999, biaya perpanjangan, model OOP, service SQLite in-memory, fail-fast `JWT_SECRET`, anti-traversal, MIME↔magic-bytes, SARGable bounds, anti-N+1 |
| `tests/integration/api.test.js` | Black Box Stateless (Supertest HTTP API) | 14 | Setiap test case terisolasi via `beforeEach`/`afterEach`: 8 tabel ERD + INTEGER nominal, CSP ketat, proteksi Same-Origin CSRF (`Origin`/`Referer` + `SameSite=Lax`), seluruh 19 skenario Black Box wajib, tanggal mulai pilihan penyewa (hari ini/mendatang), proteksi PENDING/REJECTED pada `/api/garages/*`, dan `EXPLAIN QUERY PLAN` index B-tree |
| `tests/frontend/ui.test.js` | Frontend UI Testing (JSDOM) | 6 | Sanitasi XSS (`escapeHtml`), penutupan modal patuh CSP (`data-close-modal`), toggle tarif listrik EV, banner status penyewa, pemilihan tanggal mulai dinamis, serta notifikasi toast + flash notice + redirect ke Riwayat Sewa |

## Cakupan Skenario White Box Testing

1. **Jumlah hari dalam bulan (`getDaysInMonth`)**: Januari (31), April (30), Februari 2026 non-kabisat (28), Februari 2028 kabisat (29), input bulan tidak valid ditolak.
2. **Identifikasi tahun kabisat (`isLeapYear`)**: 2024, 2028, 2000 (`true`); 2026, 2027, 1900, 2100 (`false`).
3. **Perhitungan tanggal selesai inklusif (`calculateEndDate`)**:
   - `2026-02-28` + 28 hari → `2026-03-27`.
   - `2028-02-29` + 29 hari → `2028-03-28`.
   - `2027-01-15` + 31 hari → `2027-02-14`.
   - `2026-05-10` + 1 hari → `2026-05-10`.
   - `2026-04-28` + 5 hari → `2026-05-02` (peralihan bulan).
   - `2026-12-30` + 5 hari → `2027-01-03` (peralihan tahun).
4. **Biaya sewa harian (`calculateDailyRentalFee`)**: `3 × Rp100.000 = Rp300.000`.
5. **Biaya sewa bulanan (`calculateMonthlyRentalFee`)**: `25 × Rp100.000 = Rp2.500.000` (tanpa tambahan 10%).
6. **Validasi maksimal durasi sewa harian (`validateRentalDuration`)**:
   - Januari: harian maks 30 (31 ditolak), bulanan 31.
   - Februari 2026: harian maks 27 (28 ditolak), bulanan 28.
   - Februari 2028: harian maks 28 (29 ditolak), bulanan 29.
   - April: harian maks 29 (30 ditolak), bulanan 30.
7. **Biaya listrik mobil listrik (`calculateElectricityFee`)**: `64 kWh × Rp2.500 = Rp160.000` di Garasi Mobil Listrik; `Rp0` di Garasi Mobil biasa.
8. **Kompatibilitas kendaraan dan garasi (`isVehicleCompatibleWithGarage`, `validateVehicleCompatibility`)**: menguji seluruh kombinasi valid dan tidak valid dari 4 tipe kendaraan × 3 tipe garasi.
9. **Generator ID garasi otomatis (`GarageSequence`)**: format prefix `S`, `C`, `E` 3 digit zero-padded, sekuens lanjutan (`S015` → `S016`), batas maksimum `999` per tipe.
10. **Perhitungan biaya perpanjangan (`calculateExtensionFee`)**:
    - 1 blok April (30 hari) + 3 hari sisa @ Rp100.000 → `Rp2.500.000 + Rp300.000 = Rp2.800.000` (bernilai positif).
    - Multi-bulan lintas Februari non-kabisat + Maret (59 hari) → `2 blok = Rp5.000.000`.
    - Multi-bulan lintas Februari kabisat 2028 + Maret + 4 hari (64 hari) → `Rp5.400.000`.
    - Lintas tahun Desember 2026 → Januari 2027.
11. **Validasi tanggal perpanjangan (`validateExtensionDate`)**: menolak tanggal sama atau lebih awal dari `previousEndDate`.

## Cakupan Skenario Black Box Testing (Supertest API)

| No | Skenario Black Box | Endpoint | Hasil Diharapkan | Status |
|---:|---|---|---|---|
| 1 | Registrasi penyewa dengan data valid | `POST /api/auth/register` | `201`, status `PENDING`, password ter-hash | PASS |
| 2 | Registrasi dengan email duplikat | `POST /api/auth/register` | `409 Conflict` | PASS |
| 3 | Registrasi dengan NIK duplikat | `POST /api/auth/register` | `409 Conflict` | PASS |
| 4 | Login dengan kredensial valid | `POST /api/auth/login` | `200`, cookie `HttpOnly` diset | PASS |
| 5 | Login dengan kredensial tidak valid | `POST /api/auth/login` | `401 Unauthorized` | PASS |
| 6 | Tenant `PENDING` (dan `REJECTED`) mencoba menyewa | `POST /api/rentals` | `403 Forbidden` | PASS |
| 7 | Tenant `APPROVED` menyewa garasi | `POST /api/rentals` | `201`, biaya akurat, status garasi `USED` | PASS |
| 8 | Admin menyetujui & menolak pendaftar (Tenant diblokir) | `PATCH /api/admin/tenants/:id/verify` | `200` (Admin), `403` (Tenant) | PASS |
| 9 | Admin membuat garasi massal per tipe | `POST /api/garages/batch` | `201`, `S001..S005`, `C001..C002`, `E001..E002` | PASS |
| 10 | ID garasi unik & sekuensial lintas batch | `POST /api/garages/batch` | Tidak ada duplikasi ID, batas 999 terjaga | PASS |
| 11 | Penyewa mencoba menyewa garasi berstatus `USED` | `POST /api/rentals` & `GET /api/garages/available` | `409 Conflict`, tidak tampil di daftar tersedia | PASS |
| 12 | Penyewa memilih tipe garasi tidak kompatibel | `POST /api/rentals` | `400 Bad Request` | PASS |
| 13 | Penyewaan berhasil mengubah status garasi menjadi `USED` | `POST /api/rentals` | `201`, `garage.status === 'USED'` | PASS |
| 14 | Penolakan durasi tidak valid & manipulasi tanggal/harga | `POST /api/rentals` | `400` untuk durasi/tanggal invalid; harga dihitung ulang backend | PASS |
| 15 | Penyewaan berhasil dengan gambar bukti bayar valid | `POST /api/rentals` | `201`, file tersimpan dengan UUID & akses terbatas pemilik/Admin | PASS |
| 16 | Penolakan file bukan gambar & file spoofed MIME | `POST /api/rentals` | `400 Bad Request` | PASS |
| 17 | Admin memperpanjang sewa > 1 bulan & menyimpan histori | `POST /api/rentals/:id/extend` | `201`, biaya positif akurat, `end_date` diperbarui, histori tersimpan | PASS |
| 18 | Tenant mencoba mengakses fitur perpanjangan | `POST /api/rentals/:id/extend` | `403 Forbidden` | PASS |
| 19 | Laporan Admin menampilkan agregasi data aktual SQL | `GET /api/reports/*` | `200` dengan total transaksi, garasi, dan pendapatan aktual; `403` untuk Tenant | PASS |
| 20 | Sinkronisasi otomatis status saat periode berakhir | `GET /api/garages`, `GET /api/rentals/active` | Rental kadaluwarsa menjadi `COMPLETED`, garasi kembali `AVAILABLE` | PASS |
