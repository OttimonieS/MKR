/**
 * Pengujian Black Box API & Integrasi (Stateless & Independen per Test Case) menggunakan Vitest + Supertest.
 * Setiap test case berjalan pada instance SQLite in-memory dan direktori upload baru via beforeEach/afterEach
 * sehingga tidak bergantung pada urutan eksekusi.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const { createDatabaseConnection, initializeSchema } = require('../../src/database/db');
const { seedAdmin } = require('../../src/database/seed');
const { createApp } = require('../../src/app');

// Buffer PNG 1x1 valid (signature biner PNG asli)
const VALID_PNG_BUFFER = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
  'hex'
);

// Buffer JPEG minimal dengan header SOI+APP0 asli (FF D8 FF E0)
const VALID_JPEG_BUFFER = Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex');

describe('Black Box â€” Garage Rental Management System API (Stateless & Isolated)', () => {
  let db;
  let app;
  let repositories;
  let tempUploadDir;
  let currentClockDate;

  /**
   * Membuat sesi terautentikasi (agent Supertest + token CSRF) untuk email dan password tertentu.
   *
   * @param {string} email - Email akun.
   * @param {string} password - Password akun.
   * @returns {Promise<{ agent: import('supertest').Agent, csrf: string, user: Object, res: Object }>} Sesi terautentikasi.
   */
  async function loginAs(email, password) {
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/login').send({ email, password });
    return {
      agent,
      user: res.body.data ? res.body.data.user : null,
      res,
    };
  }

  /**
   * Mendaftarkan penyewa baru melalui endpoint publik POST /api/auth/register.
   *
   * @param {Object} [overrides={}] - Override field registrasi.
   * @returns {Promise<Object>} Respons HTTP Supertest.
   */
  async function registerTenant(overrides = {}) {
    return request(app)
      .post('/api/auth/register')
      .send({
        nik: '3578011234560001',
        fullName: 'Andi Wijaya',
        phone: '081234567890',
        email: 'andi@tenant.com',
        password: 'Password123!',
        ...overrides,
      });
  }

  /**
   * Menyiapkan Admin login, satu penyewa APPROVED yang sudah login, dan batch garasi awal (BIKE, CAR, EV).
   *
   * @returns {Promise<{ admin: Object, tenant: Object }>} Kumpulan sesi Admin dan Penyewa APPROVED.
   */
  async function setupApprovedTenantAndGarages() {
    const admin = await loginAs('admin@test.com', 'AdminPassword123');
    const reg = await registerTenant();
    const tenantId = reg.body.data.id;

    await admin.agent
      .patch(`/api/admin/tenants/${tenantId}/verify`)
      .send({ status: 'APPROVED' });

    await admin.agent
      .post('/api/garages/batch')
      .send({ garageType: 'BIKE', quantity: 2, dailyRate: 25000 });

    await admin.agent
      .post('/api/garages/batch')
      .send({ garageType: 'CAR', quantity: 2, dailyRate: 100000 });

    await admin.agent
      .post('/api/garages/batch')
      .send({
        garageType: 'EV',
        quantity: 2,
        dailyRate: 150000,
        electricityRatePerKwh: 2500,
      });

    const tenant = await loginAs('andi@tenant.com', 'Password123!');
    return { admin, tenant };
  }

  beforeEach(() => {
    // Clock deterministik: 2026-04-10 10:00:00 WIB (April = 30 hari, maks harian = 29 hari)
    currentClockDate = new Date('2026-04-10T03:00:00Z');
    tempUploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gr-test-uploads-'));

    db = createDatabaseConnection(':memory:');
    initializeSchema(db);
    seedAdmin(db, {
      email: 'admin@test.com',
      password: 'AdminPassword123',
      fullName: 'Admin Penguji',
    });

    const created = createApp({
      db,
      clock: () => currentClockDate,
      uploadDir: tempUploadDir,
      jwtSecret: 'test-jwt-secret-key-at-least-32-chars-long',
    });
    app = created.app;
    repositories = created.repositories;
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    if (tempUploadDir && fs.existsSync(tempUploadDir)) {
      fs.rmSync(tempUploadDir, { recursive: true, force: true });
    }
  });

  /* ==================== Schema & Security Headers ==================== */

  it('Membuat tepat 8 tabel relasional ERD dengan kolom nominal INTEGER dan FK aktif', () => {
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name ASC")
      .all()
      .map((r) => r.name);

    expect(tables).toEqual([
      'admin',
      'garage_sequences',
      'garage_types',
      'garages',
      'rental_extensions',
      'rentals',
      'tenants',
      'users',
    ]);

    const rentalCols = db.pragma('table_info(rentals)');
    const totalPriceCol = rentalCols.find((c) => c.name === 'total_price');
    expect(totalPriceCol.type).toBe('INTEGER');
  });

  /* ==================== 1-5: Registrasi & Autentikasi ==================== */

  it('1. Registrasi penyewa valid -> 201 PENDING dan tidak mengekspos password di respons', async () => {
    const res = await registerTenant();
    expect(res.status).toBe(201);
    expect(res.body.data.approvalStatus).toBe('PENDING');
    expect(res.body.data.passwordHash).toBeUndefined();
    expect(res.body.data.password).toBeUndefined();

    const dbRow = db
      .prepare('SELECT password FROM users WHERE user_id = ?')
      .get(res.body.data.id);
    expect(dbRow.password).toBe('Password123!');
  });

  it('2. Menolak registrasi dengan email duplikat (case-insensitive) -> 409 Conflict', async () => {
    await registerTenant();
    const dup = await registerTenant({
      nik: '3578011234560099',
      email: 'ANDI@tenant.com',
    });
    expect(dup.status).toBe(409);
  });

  it('3. Menolak registrasi dengan NIK duplikat -> 409 Conflict', async () => {
    await registerTenant();
    const dup = await registerTenant({
      email: 'lain@tenant.com',
      nik: '3578011234560001',
    });
    expect(dup.status).toBe(409);
  });

  it('4 & 5. Login valid berhasil dan menyetel cookie sesi; login tidak valid -> 401', async () => {
    const admin = await loginAs('admin@test.com', 'AdminPassword123');
    expect(admin.res.status).toBe(200);
    expect(admin.user.role).toBe('ADMIN');

    const invalid = await loginAs('admin@test.com', 'PasswordSalah');
    expect(invalid.res.status).toBe(401);
  });

  /* ==================== 6 & 8: Verifikasi Penyewa & Pembatasan PENDING/REJECTED ==================== */

  it('6 & 8. Admin dapat approve/reject pendaftar; penyewa PENDING & REJECTED diblokir dari sewa dan lookup garasi -> 403', async () => {
    const admin = await loginAs('admin@test.com', 'AdminPassword123');
    await admin.agent
      .post('/api/garages/batch')
      .send({ garageType: 'CAR', quantity: 1, dailyRate: 100000 });

    const regPending = await registerTenant();
    const pendingSession = await loginAs('andi@tenant.com', 'Password123!');

    // PENDING diblokir dari GET /api/garages/available dan GET /api/garages/:id
    const availPending = await pendingSession.agent.get(
      '/api/garages/available?vehicleType=CAR&rentalType=DAILY&durationDays=2'
    );
    expect(availPending.status).toBe(403);

    const detailPending = await pendingSession.agent.get('/api/garages/C001');
    expect(detailPending.status).toBe(403);

    // PENDING diblokir dari POST /api/rentals
    const rentPending = await pendingSession.agent
      .post('/api/rentals')
      .field('garageId', 'C001')
      .field('vehicleType', 'CAR')
      .field('plateNumber', 'L 1234 AA')
      .field('brand', 'Toyota')
      .field('model', 'Avanza')
      .field('rentalType', 'DAILY')
      .field('durationDays', '2')
      .attach('paymentProof', VALID_PNG_BUFFER, {
        filename: 'proof.png',
        contentType: 'image/png',
      });
    expect(rentPending.status).toBe(403);

    // Tenant tidak boleh mengakses endpoint verifikasi Admin
    const forbiddenVerify = await pendingSession.agent
      .patch(`/api/admin/tenants/${regPending.body.data.id}/verify`)
      .send({ status: 'APPROVED' });
    expect(forbiddenVerify.status).toBe(403);

    // Admin menolak penyewa -> tetap 403
    const rejRes = await admin.agent
      .patch(`/api/admin/tenants/${regPending.body.data.id}/verify`)
      .send({ status: 'REJECTED' });
    expect(rejRes.status).toBe(200);
    expect(rejRes.body.data.approvalStatus).toBe('REJECTED');

    const availRejected = await pendingSession.agent.get(
      '/api/garages/available?vehicleType=CAR&rentalType=DAILY&durationDays=2'
    );
    expect(availRejected.status).toBe(403);
  });

  /* ==================== 9 & 10: Pembuatan Garasi Massal & ID Otomatis ==================== */

  it('9 & 10. Admin membuat garasi massal dengan ID sekuensial unik per tipe dan memperbarui garage_types', async () => {
    const admin = await loginAs('admin@test.com', 'AdminPassword123');

    const b1 = await admin.agent
      .post('/api/garages/batch')
      .send({ garageType: 'BIKE', quantity: 3, dailyRate: 25000 });
    expect(b1.status).toBe(201);
    expect(b1.body.data.map((g) => g.id)).toEqual(['S001', 'S002', 'S003']);

    const b2 = await admin.agent
      .post('/api/garages/batch')
      .send({ garageType: 'BIKE', quantity: 2, dailyRate: 30000 });
    expect(b2.status).toBe(201);
    expect(b2.body.data.map((g) => g.id)).toEqual(['S004', 'S005']);

    const ev = await admin.agent
      .post('/api/garages/batch')
      .send({
        garageType: 'EV',
        quantity: 2,
        dailyRate: 150000,
        electricityRatePerKwh: 2500,
      });
    expect(ev.status).toBe(201);
    expect(ev.body.data.map((g) => g.id)).toEqual(['E001', 'E002']);

    // Menolak tarif listrik pada garasi non-EV
    const badCar = await admin.agent
      .post('/api/garages/batch')
      .send({
        garageType: 'CAR',
        quantity: 1,
        dailyRate: 100000,
        electricityRatePerKwh: 2000,
      });
    expect(badCar.status).toBe(400);
  });

  /* ==================== 7, 11, 13, 15: Sewa Berhasil, USED Locking & Multi-Garasi ==================== */

  it('7, 11, 13 & 15. Penyewa APPROVED berhasil menyewa, status berubah USED, double-booking ditolak (409), dan dapat menyewa beberapa garasi', async () => {
    const { tenant } = await setupApprovedTenantAndGarages();

    // Sewa CAR harian 3 hari (mencoba manipulasi totalAmount di client -> diabaikan backend)
    const r1 = await tenant.agent
      .post('/api/rentals')
      .field('garageId', 'C001')
      .field('vehicleType', 'CAR')
      .field('plateNumber', 'L 1234 AA')
      .field('brand', 'Toyota')
      .field('model', 'Avanza')
      .field('rentalType', 'DAILY')
      .field('durationDays', '3')
      .field('totalAmount', '1')
      .attach('paymentProof', VALID_PNG_BUFFER, {
        filename: 'bukti.png',
        contentType: 'image/png',
      });

    expect(r1.status).toBe(201);
    expect(r1.body.data.startDate).toBe('2026-04-10');
    expect(r1.body.data.endDate).toBe('2026-04-12');
    expect(r1.body.data.totalAmount).toBe(300000);
    expect(r1.body.data.garage.status).toBe('USED');

    // C001 hilang dari daftar tersedia dan ditolak 409 jika disewa ulang
    const avail = await tenant.agent.get(
      '/api/garages/available?vehicleType=CAR&rentalType=DAILY&durationDays=2'
    );
    expect(avail.body.data.garages.map((g) => g.id)).toEqual(['C002']);

    const conflict = await tenant.agent
      .post('/api/rentals')
      .field('garageId', 'C001')
      .field('vehicleType', 'CAR')
      .field('plateNumber', 'L 5555 BB')
      .field('brand', 'Honda')
      .field('model', 'Brio')
      .field('rentalType', 'DAILY')
      .field('durationDays', '2')
      .attach('paymentProof', VALID_JPEG_BUFFER, {
        filename: 'bukti.jpg',
        contentType: 'image/jpeg',
      });
    expect(conflict.status).toBe(409);

    // Sewa kedua secara bersamaan: EV di Garasi EV (bulanan 30 hari + listrik 60*2500)
    const r2 = await tenant.agent
      .post('/api/rentals')
      .field('garageId', 'E001')
      .field('vehicleType', 'ELECTRIC_CAR')
      .field('plateNumber', 'L 8888 EV')
      .field('brand', 'Hyundai')
      .field('model', 'Ioniq 5')
      .field('batteryCapacityKwh', '60')
      .field('rentalType', 'MONTHLY')
      .attach('paymentProof', VALID_PNG_BUFFER, {
        filename: 'ev.png',
        contentType: 'image/png',
      });
    expect(r2.status).toBe(201);
    expect(r2.body.data.rentalFee).toBe(3750000);
    expect(r2.body.data.electricityFee).toBe(150000);
    expect(r2.body.data.totalAmount).toBe(3900000);

    // Sewa EV dengan baterai sekarang 70% pada kapasitas 100 kWh -> bayar 30% sisanya (30 kWh × 2.500 = 75.000)
    const evPartialPreview = await tenant.agent
      .post('/api/rentals/preview')
      .send({
        garageId: 'E002',
        vehicleType: 'ELECTRIC_CAR',
        plateNumber: 'L 7070 EV',
        brand: 'Hyundai',
        model: 'Ioniq 6',
        batteryCapacityKwh: 100,
        currentBatteryPercent: 70,
        rentalType: 'DAILY',
        durationDays: 2,
      });
    expect(evPartialPreview.status).toBe(200);
    expect(evPartialPreview.body.data.chargePercent).toBe(30);
    expect(evPartialPreview.body.data.kwhToCharge).toBe(30);
    expect(evPartialPreview.body.data.electricityFee).toBe(75000);
    expect(evPartialPreview.body.data.totalAmount).toBe(375000);

    const evPartialRent = await tenant.agent
      .post('/api/rentals')
      .field('garageId', 'E002')
      .field('vehicleType', 'ELECTRIC_CAR')
      .field('plateNumber', 'L 7070 EV')
      .field('brand', 'Hyundai')
      .field('model', 'Ioniq 6')
      .field('batteryCapacityKwh', '100')
      .field('currentBatteryPercent', '70')
      .field('rentalType', 'DAILY')
      .field('durationDays', '2')
      .attach('paymentProof', VALID_PNG_BUFFER, {
        filename: 'ev-partial.png',
        contentType: 'image/png',
      });
    expect(evPartialRent.status).toBe(201);
    expect(evPartialRent.body.data.currentBatteryPercent).toBe(70);
    expect(evPartialRent.body.data.electricityFee).toBe(75000);
    expect(evPartialRent.body.data.totalAmount).toBe(375000);

    // Sewa ketiga: EV di Garasi Mobil biasa (biaya listrik = 0)
    const r3 = await tenant.agent
      .post('/api/rentals')
      .field('garageId', 'C002')
      .field('vehicleType', 'ELECTRIC_CAR')
      .field('plateNumber', 'L 7777 EV')
      .field('brand', 'Wuling')
      .field('model', 'Air EV')
      .field('batteryCapacityKwh', '26.7')
      .field('rentalType', 'DAILY')
      .field('durationDays', '2')
      .attach('paymentProof', VALID_PNG_BUFFER, {
        filename: 'ev-car.png',
        contentType: 'image/png',
      });
    expect(r3.status).toBe(201);
    expect(r3.body.data.electricityFee).toBe(0);
    expect(r3.body.data.totalAmount).toBe(200000);

    // Bukti bayar dapat diakses; file tidak ditemukan -> 404
    const proofOwner = await tenant.agent.get(r1.body.data.paymentProofUrl);
    expect(proofOwner.status).toBe(200);

    const missingProof = await tenant.agent.get('/api/uploads/payment-proofs/tidak-ada.png');
    expect(missingProof.status).toBe(404);
  });

  /* ==================== 12, 14, 16: Validasi Kompatibilitas, Durasi & Gambar ==================== */

  it('12, 14 & 16. Menolak garasi tidak kompatibel, durasi tidak valid, dan file non-gambar -> 400', async () => {
    const { tenant } = await setupApprovedTenantAndGarages();

    // 12: Mobil bensin ke Garasi EV
    const incompatible = await tenant.agent
      .post('/api/rentals')
      .field('garageId', 'E001')
      .field('vehicleType', 'CAR')
      .field('plateNumber', 'L 1111 CC')
      .field('brand', 'Honda')
      .field('model', 'Civic')
      .field('rentalType', 'DAILY')
      .field('durationDays', '2')
      .attach('paymentProof', VALID_PNG_BUFFER, {
        filename: 'ok.png',
        contentType: 'image/png',
      });
    expect(incompatible.status).toBe(400);

    // 14: Durasi harian 30 hari di bulan April (30 hari -> maks harian 29)
    const badDuration = await tenant.agent
      .post('/api/rentals')
      .field('garageId', 'C001')
      .field('vehicleType', 'CAR')
      .field('plateNumber', 'L 1111 CC')
      .field('brand', 'Honda')
      .field('model', 'Civic')
      .field('rentalType', 'DAILY')
      .field('durationDays', '30')
      .attach('paymentProof', VALID_PNG_BUFFER, {
        filename: 'ok.png',
        contentType: 'image/png',
      });
    expect(badDuration.status).toBe(400);

    // 16: File teks biasa ditolak oleh Multer -> 400
    const nonImage = await tenant.agent
      .post('/api/rentals')
      .field('garageId', 'C001')
      .field('vehicleType', 'CAR')
      .field('plateNumber', 'L 1111 CC')
      .field('brand', 'Honda')
      .field('model', 'Civic')
      .field('rentalType', 'DAILY')
      .field('durationDays', '2')
      .attach('paymentProof', Buffer.from('plain text'), {
        filename: 'nota.txt',
        contentType: 'text/plain',
      });
    expect(nonImage.status).toBe(400);
  });

  /* ==================== 17, 18, 19: Perpanjangan, Laporan Aktual & Sinkronisasi ==================== */

  it('17, 18 & 19. Perpanjangan khusus Admin (> 1 bulan, positif), blokir Tenant (403), laporan aktual & sinkronisasi kadaluwarsa', async () => {
    const { admin, tenant } = await setupApprovedTenantAndGarages();

    const rentRes = await tenant.agent
      .post('/api/rentals')
      .field('garageId', 'C001')
      .field('vehicleType', 'CAR')
      .field('plateNumber', 'L 1234 AA')
      .field('brand', 'Toyota')
      .field('model', 'Avanza')
      .field('rentalType', 'DAILY')
      .field('durationDays', '3')
      .attach('paymentProof', VALID_PNG_BUFFER, {
        filename: 'sewa.png',
        contentType: 'image/png',
      });
    const rentalId = rentRes.body.data.id;

    // 18: Tenant diblokir dari perpanjangan
    const tenantExt = await tenant.agent
      .post(`/api/rentals/${rentalId}/extend`)
      .field('newEndDate', '2026-06-15')
      .attach('paymentProof', VALID_PNG_BUFFER, {
        filename: 'ext.png',
        contentType: 'image/png',
      });
    expect(tenantExt.status).toBe(403);

    // 17: Admin memperpanjang 64 hari (2 blok bulanan + 3 hari = 5.300.000)
    const adminExt = await admin.agent
      .post(`/api/rentals/${rentalId}/extend`)
      .field('newEndDate', '2026-06-15')
      .attach('paymentProof', VALID_PNG_BUFFER, {
        filename: 'ext-ok.png',
        contentType: 'image/png',
      });
    expect(adminExt.status).toBe(201);
    expect(adminExt.body.data.extension.previousEndDate).toBe('2026-04-12');
    expect(adminExt.body.data.extension.newEndDate).toBe('2026-06-15');
    expect(adminExt.body.data.extension.addedDays).toBe(64);
    expect(adminExt.body.data.extension.extensionAmount).toBe(5300000);
    expect(adminExt.body.data.rental.endDate).toBe('2026-06-15');

    // 19: Laporan aktual dari SQLite (bulanan, harian, per tipe garasi, per penyewa)
    const monthly = await admin.agent.get('/api/reports/monthly?year=2026');
    expect(monthly.status).toBe(200);
    expect(monthly.body.data.summary).toEqual({
      rentalTransactions: 1,
      extensionTransactions: 1,
      totalTransactions: 2,
      garagesUsed: 1,
      rentalRevenue: 300000,
      extensionRevenue: 5300000,
      totalRevenue: 5600000,
    });

    const daily = await admin.agent.get('/api/reports/daily?year=2026&month=4');
    expect(daily.body.data.rows[0].date).toBe('2026-04-10');
    expect(daily.body.data.rows[0].totalRevenue).toBe(5600000);

    const byType = await admin.agent.get('/api/reports/by-garage-type?year=2026');
    const carRow = byType.body.data.rows.find((r) => r.garageType === 'CAR');
    expect(carRow.totalRevenue).toBe(5600000);

    const byTenant = await admin.agent.get('/api/reports/by-tenant');
    expect(byTenant.body.data.summary.totalRevenue).toBe(5600000);
    expect(byTenant.body.data.summary.garagesUsed).toBe(1);

    // Tenant tidak boleh mengakses laporan Admin
    const tenantReport = await tenant.agent.get('/api/reports/monthly?year=2026');
    expect(tenantReport.status).toBe(403);

    // Majukan clock melewati 2026-06-15 -> otomatis berubah COMPLETED & AVAILABLE
    currentClockDate = new Date('2026-06-16T03:00:00Z');
    const garagesAfter = await admin.agent.get('/api/garages');
    const c001 = garagesAfter.body.data.garages.find((g) => g.id === 'C001');
    expect(c001.status).toBe('AVAILABLE');
  });

  it('Penyewa dapat memilih tanggal mulai mendatang, menolak tanggal lampau (400), mencegah bentrok jadwal mendatang (409), dan mencegah perpanjangan yang menabrak jadwal mendatang', async () => {
    const { admin, tenant } = await setupApprovedTenantAndGarages();

    // 1. Menolak tanggal mulai di masa lalu (today = 2026-04-10)
    const pastDate = await tenant.agent
      .post('/api/rentals')
      .field('garageId', 'C001')
      .field('vehicleType', 'CAR')
      .field('plateNumber', 'L 1111 PP')
      .field('brand', 'Honda')
      .field('model', 'Civic')
      .field('startDate', '2026-04-09')
      .field('rentalType', 'DAILY')
      .field('durationDays', '2')
      .attach('paymentProof', VALID_PNG_BUFFER, {
        filename: 'past.png',
        contentType: 'image/png',
      });
    expect(pastDate.status).toBe(400);

    // 2. Sewa hari ini untuk C001 (2026-04-10 s/d 2026-04-12) -> C001 berstatus USED hari ini
    const todayRent = await tenant.agent
      .post('/api/rentals')
      .field('garageId', 'C001')
      .field('vehicleType', 'CAR')
      .field('plateNumber', 'L 1001 AA')
      .field('brand', 'Toyota')
      .field('model', 'Avanza')
      .field('startDate', '2026-04-10')
      .field('rentalType', 'DAILY')
      .field('durationDays', '3')
      .attach('paymentProof', VALID_PNG_BUFFER, {
        filename: 'today.png',
        contentType: 'image/png',
      });
    expect(todayRent.status).toBe(201);
    const todayRentalId = todayRent.body.data.id;

    // 3. Sewa mendatang pada C001 mulai 2026-05-01 (Mei = 31 hari -> bulanan 31 hari selesai 2026-05-31)
    const futureRent = await tenant.agent
      .post('/api/rentals')
      .field('garageId', 'C001')
      .field('vehicleType', 'CAR')
      .field('plateNumber', 'L 2002 BB')
      .field('brand', 'Honda')
      .field('model', 'Brio')
      .field('startDate', '2026-05-01')
      .field('rentalType', 'MONTHLY')
      .attach('paymentProof', VALID_PNG_BUFFER, {
        filename: 'future.png',
        contentType: 'image/png',
      });
    expect(futureRent.status).toBe(201);
    expect(futureRent.body.data.startDate).toBe('2026-05-01');
    expect(futureRent.body.data.durationDays).toBe(31);
    expect(futureRent.body.data.endDate).toBe('2026-05-31');
    expect(futureRent.body.data.totalAmount).toBe(2500000);

    // 4. Sewa mendatang yang bertabrakan dengan 2026-05-01..2026-05-31 ditolak 409
    const overlapFuture = await tenant.agent
      .post('/api/rentals')
      .field('garageId', 'C001')
      .field('vehicleType', 'CAR')
      .field('plateNumber', 'L 3003 CC')
      .field('brand', 'Suzuki')
      .field('model', 'Ertiga')
      .field('startDate', '2026-05-15')
      .field('rentalType', 'DAILY')
      .field('durationDays', '5')
      .attach('paymentProof', VALID_PNG_BUFFER, {
        filename: 'overlap.png',
        contentType: 'image/png',
      });
    expect(overlapFuture.status).toBe(409);

    // 5. Preview dan submit perpanjangan Admin yang menabrak jadwal mendatang (2026-05-05) sama-sama ditolak 409
    const conflictingPreview = await admin.agent
      .post(`/api/rentals/${todayRentalId}/extend/preview`)
      .send({ newEndDate: '2026-05-05' });
    expect(conflictingPreview.status).toBe(409);

    const conflictingExt = await admin.agent
      .post(`/api/rentals/${todayRentalId}/extend`)
      .field('newEndDate', '2026-05-05')
      .attach('paymentProof', VALID_PNG_BUFFER, {
        filename: 'ext-conflict.png',
        contentType: 'image/png',
      });
    expect(conflictingExt.status).toBe(409);

    // 6. Sewa mendatang pada C002 (2026-04-20, lebih dekat dari 2026-05-01) -> tetap AVAILABLE hari ini
    const futureC002 = await tenant.agent
      .post('/api/rentals')
      .field('garageId', 'C002')
      .field('vehicleType', 'CAR')
      .field('plateNumber', 'L 4004 DD')
      .field('brand', 'Mazda')
      .field('model', 'CX-5')
      .field('startDate', '2026-04-20')
      .field('rentalType', 'DAILY')
      .field('durationDays', '5')
      .attach('paymentProof', VALID_PNG_BUFFER, {
        filename: 'future-c002.png',
        contentType: 'image/png',
      });
    expect(futureC002.status).toBe(201);
    expect(futureC002.body.data.garage.status).toBe('AVAILABLE');

    // 7. GET /api/rentals/active menampilkan seluruh garasi disewa (hari ini di atas, terjauh di bawah)
    const activeList = await admin.agent.get('/api/rentals/active');
    expect(activeList.status).toBe(200);
    expect(activeList.body.data.rentals.map((r) => `${r.garageId}:${r.startDate}`)).toEqual([
      'C001:2026-04-10',
      'C002:2026-04-20',
      'C001:2026-05-01',
    ]);

    currentClockDate = new Date('2026-04-20T03:00:00Z');
    const garagesOnApr20 = await admin.agent.get('/api/garages');
    const c002Apr20 = garagesOnApr20.body.data.garages.find((g) => g.id === 'C002');
    expect(c002Apr20.status).toBe('USED');
  });
});
