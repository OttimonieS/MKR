/**
 * Pengujian White Box Unit (Vitest) untuk seluruh logika bisnis & error handling inti:
 * 1. Tanggal Asia/Jakarta, tahun kabisat, tanggal selesai inklusif, peralihan bulan/tahun
 * 2. Tarif sewa harian/bulanan (25x), batas durasi, biaya listrik EV, kompatibilitas kendaraan-garasi,
 *    ID garasi otomatis (S/C/E, batas 999), biaya perpanjangan positif, serta model OOP
 * 3. Lapisan Service (SQLite in-memory + clock deterministik)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const {
  isLeapYear,
  getDaysInMonth,
  parseDateParts,
  isValidDateString,
  addDays,
  diffDays,
  diffDaysInclusive,
  calculateEndDate,
  getMaxDailyDuration,
  datesOverlap,
  getTodayInJakarta,
  getJakartaTimestamp,
  validateRentalDuration,
  calculateDailyRentalFee,
  calculateMonthlyRentalFee,
  calculateRentalFee,
  calculateElectricityFee,
  calculateTotalRentalCost,
  validateExtensionDate,
  calculateExtensionFee,
  isVehicleCompatibleWithGarage,
  validateVehicleCompatibility,
  getAllowedGarageTypes,
} = require('../../src/utils/rentalMath');
const { GARAGE_TYPES, VEHICLE_TYPES, RENTAL_TYPES } = require('../../src/utils/constants');
const { User, Tenant, GarageSequence, Vehicle } = require('../../src/models/entities');
const { createDatabaseConnection, initializeSchema } = require('../../src/database/db');
const { seedAdmin } = require('../../src/database/seed');
const UserRepository = require('../../src/repositories/UserRepository');
const GarageRepository = require('../../src/repositories/GarageRepository');
const RentalRepository = require('../../src/repositories/RentalRepository');
const AuthService = require('../../src/services/AuthService');
const GarageService = require('../../src/services/GarageService');
const RentalService = require('../../src/services/RentalService');

/* ==================== 1. Tanggal, Kabisat & Timezone Asia/Jakarta ==================== */

describe('White Box — Tanggal, Tahun Kabisat & Peralihan Bulan/Tahun', () => {
  it('mengenali tahun kabisat standar, abad /400, dan non-kabisat secara akurat', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2028)).toBe(true);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(2400)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(2027)).toBe(false);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2100)).toBe(false);
    expect(() => isLeapYear(0)).toThrow();
    expect(() => isLeapYear(2026.5)).toThrow();
  });

  it('menghitung jumlah hari per bulan (28, 29, 30, 31) dan menolak bulan tidak valid', () => {
    expect(getDaysInMonth(2026, 2)).toBe(28);
    expect(getDaysInMonth(2028, 2)).toBe(29);
    expect(getDaysInMonth(2026, 4)).toBe(30);
    expect(getDaysInMonth(2026, 6)).toBe(30);
    expect(getDaysInMonth(2026, 9)).toBe(30);
    expect(getDaysInMonth(2026, 11)).toBe(30);
    expect(getDaysInMonth(2026, 1)).toBe(31);
    expect(getDaysInMonth(2026, 3)).toBe(31);
    expect(getDaysInMonth(2026, 12)).toBe(31);
    expect(() => getDaysInMonth(2026, 0)).toThrow();
    expect(() => getDaysInMonth(2026, 13)).toThrow();
  });

  it('memvalidasi tanggal kabisat 2028-02-29 dan menolak tanggal kalender invalid 2026-02-29', () => {
    expect(isValidDateString('2028-02-29')).toBe(true);
    expect(parseDateParts('2028-02-29')).toEqual({ year: 2028, month: 2, day: 29 });
    expect(isValidDateString('2026-02-29')).toBe(false);
    expect(() => parseDateParts('2026-02-29')).toThrow();
    expect(isValidDateString('2026-04-31')).toBe(false);
    expect(isValidDateString('21-11-2026')).toBe(false);
  });

  it('menghitung tanggal selesai inklusif lintas bulan, tahun, dan tahun kabisat', () => {
    expect(calculateEndDate('2026-02-28', 28)).toBe('2026-03-27');
    expect(calculateEndDate('2028-02-29', 29)).toBe('2028-03-28');
    expect(calculateEndDate('2027-01-15', 31)).toBe('2027-02-14');
    expect(calculateEndDate('2026-05-10', 1)).toBe('2026-05-10');
    expect(calculateEndDate('2026-04-28', 5)).toBe('2026-05-02');
    expect(calculateEndDate('2026-12-30', 5)).toBe('2027-01-03');
    expect(calculateEndDate('2026-12-15', 31)).toBe('2027-01-14');
    expect(() => calculateEndDate('2026-05-10', 0)).toThrow();
    expect(() => calculateEndDate('2026-05-10', -3)).toThrow();
    expect(() => calculateEndDate('2026-05-10', 2.5)).toThrow();
  });

  it('menentukan batas maksimum harian (jumlahHariBulan - 1), selisih hari, dan deteksi tumpang tindih', () => {
    expect(getMaxDailyDuration('2026-02-10')).toBe(27);
    expect(getMaxDailyDuration('2028-02-10')).toBe(28);
    expect(getMaxDailyDuration('2026-04-15')).toBe(29);
    expect(getMaxDailyDuration('2026-01-15')).toBe(30);

    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
    expect(diffDays('2028-02-28', '2028-03-01')).toBe(2);
    expect(diffDaysInclusive('2026-04-01', '2026-04-30')).toBe(30);

    expect(datesOverlap('2026-05-01', '2026-05-10', '2026-05-10', '2026-05-15')).toBe(true);
    expect(datesOverlap('2026-05-01', '2026-05-10', '2026-05-11', '2026-05-15')).toBe(false);
    expect(datesOverlap('2026-05-05', '2026-05-08', '2026-05-01', '2026-05-20')).toBe(true);
  });

  it('mengonversi waktu UTC ke tanggal dan timestamp Asia/Jakarta (+07:00) secara presisi', () => {
    const utcLateEvening = new Date('2026-11-21T18:30:00Z');
    expect(getTodayInJakarta(utcLateEvening)).toBe('2026-11-22');
    expect(getJakartaTimestamp(utcLateEvening)).toBe('2026-11-22T01:30:00+07:00');

    const utcBeforeCutoff = new Date('2026-02-28T16:59:59Z');
    expect(getTodayInJakarta(utcBeforeCutoff)).toBe('2026-02-28');
    expect(getJakartaTimestamp(utcBeforeCutoff)).toBe('2026-02-28T23:59:59+07:00');
  });
});

/* ==================== 2. Tarif, Durasi, Kompatibilitas, ID Garasi, Perpanjangan & OOP ==================== */

describe('White Box — Tarif, Durasi, Kompatibilitas, ID Garasi, Perpanjangan & OOP', () => {
  it('menghitung biaya sewa harian & bulanan (25 × tarif harian) tanpa markup tersembunyi', () => {
    expect(calculateDailyRentalFee(3, 100000)).toBe(300000);
    expect(calculateDailyRentalFee(1, 50000)).toBe(50000);
    expect(calculateRentalFee(RENTAL_TYPES.DAILY, 10, 100000)).toBe(1000000);
    expect(calculateMonthlyRentalFee(100000)).toBe(2500000);
    expect(calculateRentalFee(RENTAL_TYPES.MONTHLY, 31, 100000)).toBe(2500000);
    expect(calculateRentalFee(RENTAL_TYPES.MONTHLY, 28, 100000)).toBe(2500000);
    expect(() => calculateDailyRentalFee(3, 0)).toThrow();
    expect(() => calculateDailyRentalFee(3, -10000)).toThrow();
    expect(() => calculateMonthlyRentalFee(-50000)).toThrow();
  });

  it('menerapkan batas durasi bulanan & harian (28/29/30/31 hari)', () => {
    expect(validateRentalDuration('2026-01-15', RENTAL_TYPES.MONTHLY).durationDays).toBe(31);
    expect(validateRentalDuration('2026-01-15', RENTAL_TYPES.DAILY, 30).durationDays).toBe(30);
    expect(() => validateRentalDuration('2026-01-15', RENTAL_TYPES.DAILY, 31)).toThrow();

    expect(validateRentalDuration('2026-02-28', RENTAL_TYPES.MONTHLY).durationDays).toBe(28);
    expect(validateRentalDuration('2026-02-01', RENTAL_TYPES.DAILY, 27).durationDays).toBe(27);
    expect(() => validateRentalDuration('2026-02-01', RENTAL_TYPES.DAILY, 28)).toThrow();

    expect(validateRentalDuration('2028-02-29', RENTAL_TYPES.MONTHLY).durationDays).toBe(29);
    expect(validateRentalDuration('2028-02-01', RENTAL_TYPES.DAILY, 28).durationDays).toBe(28);
    expect(() => validateRentalDuration('2028-02-01', RENTAL_TYPES.DAILY, 29)).toThrow();

    expect(validateRentalDuration('2026-04-10', RENTAL_TYPES.MONTHLY).durationDays).toBe(30);
    expect(validateRentalDuration('2026-04-10', RENTAL_TYPES.DAILY, 29).durationDays).toBe(29);
    expect(() => validateRentalDuration('2026-04-10', RENTAL_TYPES.DAILY, 30)).toThrow();

    expect(() => validateRentalDuration('2026-04-10', RENTAL_TYPES.DAILY, 0)).toThrow();
    expect(() => validateRentalDuration('2026-04-10', RENTAL_TYPES.DAILY, -2)).toThrow();
    expect(() => validateRentalDuration('2026-04-10', RENTAL_TYPES.DAILY, 3.5)).toThrow();
  });

  it('menghitung biaya pengisian listrik EV (penuh & dikurangi persen baterai sekarang) serta total sewa eksak', () => {
    expect(calculateElectricityFee(VEHICLE_TYPES.ELECTRIC_CAR, GARAGE_TYPES.EV, 64, 2500)).toBe(160000);
    // Contoh: kapasitas 100 kWh, baterai sekarang 70% -> bayar 30% sisanya (30 kWh × Rp2.500 = Rp75.000)
    expect(calculateElectricityFee(VEHICLE_TYPES.ELECTRIC_CAR, GARAGE_TYPES.EV, 100, 2500, 70)).toBe(75000);
    // Baterai sudah 100% -> biaya listrik Rp0
    expect(calculateElectricityFee(VEHICLE_TYPES.ELECTRIC_CAR, GARAGE_TYPES.EV, 100, 2500, 100)).toBe(0);
    // Persen tidak valid (< 0 atau > 100) ditolak
    expect(() => calculateElectricityFee(VEHICLE_TYPES.ELECTRIC_CAR, GARAGE_TYPES.EV, 100, 2500, -5)).toThrow();
    expect(() => calculateElectricityFee(VEHICLE_TYPES.ELECTRIC_CAR, GARAGE_TYPES.EV, 100, 2500, 101)).toThrow();

    expect(calculateElectricityFee(VEHICLE_TYPES.ELECTRIC_CAR, GARAGE_TYPES.CAR, 64, null)).toBe(0);
    expect(calculateElectricityFee(VEHICLE_TYPES.CAR, GARAGE_TYPES.CAR, null, null)).toBe(0);
    expect(calculateElectricityFee(VEHICLE_TYPES.BICYCLE, GARAGE_TYPES.BIKE, null, null)).toBe(0);

    expect(
      calculateTotalRentalCost({
        vehicleType: VEHICLE_TYPES.ELECTRIC_CAR,
        garageType: GARAGE_TYPES.EV,
        rentalType: RENTAL_TYPES.MONTHLY,
        durationDays: 30,
        dailyRate: 100000,
        batteryCapacityKwh: 100,
        currentBatteryPercent: 70,
        electricityRatePerKwh: 2000,
      })
    ).toEqual({
      rentalFee: 2500000,
      electricityFee: 60000,
      totalAmount: 2560000,
    });
  });

  it('menegakkan matriks kompatibilitas kendaraan dan garasi', () => {
    expect(getAllowedGarageTypes(VEHICLE_TYPES.BICYCLE)).toEqual([GARAGE_TYPES.BIKE]);
    expect(getAllowedGarageTypes(VEHICLE_TYPES.MOTORCYCLE)).toEqual([GARAGE_TYPES.BIKE]);
    expect(getAllowedGarageTypes(VEHICLE_TYPES.CAR)).toEqual([GARAGE_TYPES.CAR]);
    expect(getAllowedGarageTypes(VEHICLE_TYPES.ELECTRIC_CAR)).toEqual([
      GARAGE_TYPES.CAR,
      GARAGE_TYPES.EV,
    ]);

    expect(isVehicleCompatibleWithGarage(VEHICLE_TYPES.BICYCLE, GARAGE_TYPES.BIKE)).toBe(true);
    expect(isVehicleCompatibleWithGarage(VEHICLE_TYPES.MOTORCYCLE, GARAGE_TYPES.BIKE)).toBe(true);
    expect(isVehicleCompatibleWithGarage(VEHICLE_TYPES.CAR, GARAGE_TYPES.CAR)).toBe(true);
    expect(isVehicleCompatibleWithGarage(VEHICLE_TYPES.ELECTRIC_CAR, GARAGE_TYPES.CAR)).toBe(true);
    expect(isVehicleCompatibleWithGarage(VEHICLE_TYPES.ELECTRIC_CAR, GARAGE_TYPES.EV)).toBe(true);

    expect(isVehicleCompatibleWithGarage(VEHICLE_TYPES.BICYCLE, GARAGE_TYPES.CAR)).toBe(false);
    expect(isVehicleCompatibleWithGarage(VEHICLE_TYPES.MOTORCYCLE, GARAGE_TYPES.CAR)).toBe(false);
    expect(isVehicleCompatibleWithGarage(VEHICLE_TYPES.CAR, GARAGE_TYPES.EV)).toBe(false);
    expect(isVehicleCompatibleWithGarage(VEHICLE_TYPES.ELECTRIC_CAR, GARAGE_TYPES.BIKE)).toBe(false);
    expect(() => validateVehicleCompatibility(VEHICLE_TYPES.CAR, GARAGE_TYPES.EV)).toThrow();
  });

  it('menghasilkan ID garasi otomatis (S/C/E) berurutan hingga batas 999', () => {
    expect(GarageSequence.formatId(GARAGE_TYPES.BIKE, 1)).toBe('S001');
    expect(GarageSequence.formatId(GARAGE_TYPES.CAR, 10)).toBe('C010');
    expect(GarageSequence.formatId(GARAGE_TYPES.EV, 999)).toBe('E999');

    const seq = new GarageSequence({ garageType: GARAGE_TYPES.BIKE, lastNumber: 15 });
    expect(seq.generateNextId()).toBe('S016');
    expect(seq.generateNextId()).toBe('S017');

    const fullSeq = new GarageSequence({ garageType: GARAGE_TYPES.CAR, lastNumber: 999 });
    expect(() => fullSeq.generateNextId()).toThrow();
  });

  it('memvalidasi tanggal dan menghitung biaya perpanjangan blok bulanan + sisa harian (selalu positif)', () => {
    expect(() => validateExtensionDate('2026-04-30', '2026-04-30')).toThrow();
    expect(() => validateExtensionDate('2026-04-30', '2026-04-29')).toThrow();
    expect(validateExtensionDate('2026-04-30', '2026-05-01')).toEqual({
      extensionStartDate: '2026-05-01',
      addedDays: 1,
    });

    const ext1 = calculateExtensionFee('2026-03-31', '2026-05-03', 100000);
    expect(ext1.addedDays).toBe(33);
    expect(ext1.monthlyBlocks).toBe(1);
    expect(ext1.remainingDays).toBe(3);
    expect(ext1.extensionAmount).toBe(2800000);

    const ext2 = calculateExtensionFee('2026-01-31', '2026-03-31', 100000);
    expect(ext2.addedDays).toBe(59);
    expect(ext2.monthlyBlocks).toBe(2);
    expect(ext2.remainingDays).toBe(0);
    expect(ext2.extensionAmount).toBe(5000000);

    const extLeap = calculateExtensionFee('2028-01-31', '2028-04-04', 100000);
    expect(extLeap.addedDays).toBe(64);
    expect(extLeap.monthlyBlocks).toBe(2);
    expect(extLeap.remainingDays).toBe(4);
    expect(extLeap.extensionAmount).toBe(5400000);

    const extNye = calculateExtensionFee('2026-12-30', '2027-01-03', 80000);
    expect(extNye.addedDays).toBe(4);
    expect(extNye.extensionAmount).toBe(320000);
  });

  it('menegakkan aturan OOP (User abstrak, sembunyikan passwordHash, validasi Vehicle)', () => {
    expect(() => new User({ id: '1', email: 'a@b.com', role: 'TENANT', createdAt: '2026-01-01' })).toThrow();

    const tenant = new Tenant({
      id: 't1',
      email: 'budi@mail.com',
      createdAt: '2026-11-21T10:00:00+07:00',
      nik: '3578012345670001',
      fullName: 'Budi Santoso',
      phone: '081234567890',
      approvalStatus: 'PENDING',
      passwordHash: '$2a$10$secret',
    });
    expect(tenant.canRent()).toBe(false);
    expect(tenant.toJSON().passwordHash).toBeUndefined();

    const bike = new Vehicle({
      vehicleType: VEHICLE_TYPES.BICYCLE,
      plateNumber: '',
      brand: 'Polygon',
      model: 'Strattos',
    });
    expect(bike.validate()).toBe(true);
    expect(bike.plateNumber).toBeNull();

    expect(() =>
      new Vehicle({
        vehicleType: VEHICLE_TYPES.CAR,
        plateNumber: '',
        brand: 'Toyota',
        model: 'Avanza',
      }).validate()
    ).toThrow();

    expect(() =>
      new Vehicle({
        vehicleType: VEHICLE_TYPES.ELECTRIC_CAR,
        plateNumber: 'L 1234 EV',
        brand: 'Hyundai',
        model: 'Ioniq 5',
        batteryCapacityKwh: null,
      }).validate()
    ).toThrow();
  });
});

/* ==================== 3. Service Layer Edge Cases & Transaksi Database ==================== */

describe('White Box — Lapisan Service & Transaksi SQLite In-Memory', () => {
  let db;
  let userRepo;
  let garageRepo;
  let rentalRepo;
  let admin;
  let approvedTenant;

  /**
   * Membangun instance service baru yang dikunci pada timestamp UTC tertentu untuk pengujian deterministik.
   *
   * @param {string} isoUtcTimestamp - Timestamp UTC tetap dalam format ISO-8601.
   * @returns {{ authService: AuthService, garageService: GarageService, rentalService: RentalService }} Kumpulan service uji.
   */
  function makeServicesAt(isoUtcTimestamp) {
    const clock = () => new Date(isoUtcTimestamp);
    return {
      authService: new AuthService({ userRepository: userRepo, clock }),
      garageService: new GarageService({ garageRepository: garageRepo, clock }),
      rentalService: new RentalService({
        rentalRepository: rentalRepo,
        garageRepository: garageRepo,
        userRepository: userRepo,
        clock,
      }),
    };
  }

  beforeEach(() => {
    db = createDatabaseConnection(':memory:');
    initializeSchema(db);
    admin = seedAdmin(db).admin;

    userRepo = new UserRepository(db);
    garageRepo = new GarageRepository(db);
    rentalRepo = new RentalRepository(db);

    const { authService, garageService } = makeServicesAt('2026-02-28T03:00:00Z');
    const pending = authService.registerTenant({
      nik: '3578010101010001',
      fullName: 'Siti Aminah',
      phone: '081234567891',
      email: 'siti@example.com',
      password: 'SecretPassword1',
    });
    approvedTenant = authService.verifyTenant(pending.id, 'APPROVED');

    garageService.createGarageBatch({
      garageType: 'CAR',
      quantity: 3,
      dailyRate: 100000,
    });
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  it('menangani sewa bulanan 28 Feb non-kabisat, 29 Feb kabisat, 15 Jan, dan peralihan tahun', () => {
    const feb2026 = makeServicesAt('2026-02-28T05:00:00Z').rentalService.createRental(
      approvedTenant.id,
      {
        garageId: 'C001',
        vehicleType: 'CAR',
        plateNumber: 'B 1234 XY',
        brand: 'Honda',
        model: 'HR-V',
        rentalType: 'MONTHLY',
      },
      'proof-feb2026.png'
    );
    expect(feb2026.startDate).toBe('2026-02-28');
    expect(feb2026.durationDays).toBe(28);
    expect(feb2026.endDate).toBe('2026-03-27');

    const feb2028Svc = makeServicesAt('2028-02-29T05:00:00Z').rentalService;
    expect(feb2028Svc.getRentalConfig()).toMatchObject({
      todayDate: '2028-02-29',
      monthlyDays: 29,
      maxDailyDays: 28,
    });
    const feb2028 = feb2028Svc.createRental(
      approvedTenant.id,
      {
        garageId: 'C002',
        vehicleType: 'CAR',
        plateNumber: 'B 2028 LP',
        brand: 'Mazda',
        model: 'CX-5',
        rentalType: 'MONTHLY',
      },
      'proof-feb2028.png'
    );
    expect(feb2028.endDate).toBe('2028-03-28');

    const jan2027 = makeServicesAt('2027-01-15T04:00:00Z').rentalService.createRental(
      approvedTenant.id,
      {
        garageId: 'C003',
        vehicleType: 'CAR',
        plateNumber: 'L 1501 AA',
        brand: 'Suzuki',
        model: 'Ertiga',
        rentalType: 'MONTHLY',
      },
      'proof-jan2027.png'
    );
    expect(jan2027.durationDays).toBe(31);
    expect(jan2027.endDate).toBe('2027-02-14');

    // Peralihan tahun + perpanjangan lintas tahun
    const nyeSvc = makeServicesAt('2026-12-30T04:00:00Z').rentalService;
    const nye = nyeSvc.createRental(
      approvedTenant.id,
      {
        garageId: 'C001',
        vehicleType: 'CAR',
        plateNumber: 'L 3012 NY',
        brand: 'Mitsubishi',
        model: 'Xpander',
        rentalType: 'DAILY',
        durationDays: 5,
      },
      'proof-nye.png'
    );
    expect(nye.endDate).toBe('2027-01-03');

    const ext = nyeSvc.extendRental(nye.id, admin.id, '2027-02-05', 'ext-nye.png');
    expect(ext.extension.addedDays).toBe(33);
    expect(ext.extension.extensionAmount).toBe(2700000);
  });

  it('menegakkan batas maksimal 999 unit garasi per tipe secara transaksional', () => {
    const { garageService } = makeServicesAt('2026-04-10T04:00:00Z');
    expect(() =>
      garageService.createGarageBatch({ garageType: 'CAR', quantity: 997, dailyRate: 100000 })
    ).toThrow();
    expect(garageRepo.getSequence('CAR').lastNumber).toBe(3);

    const created = garageService.createGarageBatch({
      garageType: 'CAR',
      quantity: 996,
      dailyRate: 100000,
    });
    expect(created.length).toBe(996);
    expect(created[0].id).toBe('C004');
    expect(created[created.length - 1].id).toBe('C999');

    expect(() =>
      garageService.createGarageBatch({ garageType: 'CAR', quantity: 1, dailyRate: 100000 })
    ).toThrow();
  });
});