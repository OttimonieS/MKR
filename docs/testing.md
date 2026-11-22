# Dokumentasi Pengujian (Unit Testing & API Testing)

Pengujian dijalankan secara otomatis menggunakan **Vitest** (White Box) dan **Supertest** (Black Box API) dengan database SQLite *in-memory* yang terisolasi pada setiap *test case*.

## Cara Menjalankan

```bash
npm test
```

## Ringkasan Pengujian

- **Test Files**: 2 passed (`tests/unit/businessLogic.test.js`, `tests/integration/api.test.js`)
- **Test Cases**: 26 passed, 0 failed

| File Test | Pendekatan | Jumlah Test | Fokus Pengujian |
|---|---|---:|---|
| `tests/unit/businessLogic.test.js` | White Box | 15 | Tahun kabisat, jumlah hari bulan (28/29/30/31), tanggal selesai inklusif, timezone `Asia/Jakarta`, tarif harian & bulanan (`25×`), biaya listrik EV (penuh & sisa baterai %), matriks kompatibilitas, generator ID garasi (`S/C/E`, batas 999), biaya perpanjangan, model OOP, dan lapisan Service SQLite *in-memory* |
| `tests/integration/api.test.js` | Black Box (Supertest HTTP API) | 11 | 8 tabel ERD + FK aktif, registrasi & duplikat email/NIK, login valid/invalid, verifikasi Admin & pembatasan penyewa `PENDING`/`REJECTED`, buat garasi massal berurutan, sewa baru (termasuk EV parsial & multi-garasi), anti *double-booking*, validasi kompatibilitas/durasi/gambar, perpanjangan khusus Admin, laporan aktual 4 jenis, tanggal mulai mendatang, dan urutan daftar sewa Admin |
