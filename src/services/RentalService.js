/**
 * Layanan utama transaksi penyewaan baru, pratinjau biaya, riwayat sewa, dan perpanjangan sewa khusus Admin.
 * @module services/RentalService
 */

const crypto = require('crypto');
const { Vehicle } = require('../models/entities');
const {
  USER_ROLES,
  RENTAL_TYPES,
  RENTAL_STATUS,
  VEHICLE_GARAGE_COMPATIBILITY,
  VEHICLE_TYPE_LABELS,
  GARAGE_TYPE_LABELS,
  MONTHLY_RATE_MULTIPLIER,
  ValidationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} = require('../utils/constants');
const {
  getTodayInJakarta,
  getJakartaTimestamp,
  parseDateParts,
  getDaysInMonth,
  getMaxDailyDuration,
  calculateEndDate,
  validateRentalDuration,
  calculateRentalFee,
  calculateElectricityFee,
  calculateTotalRentalCost,
  calculateExtensionFee,
} = require('../utils/rentalMath');

/**
 * Service yang mengelola seluruh aturan bisnis penyewaan garasi baru dan perpanjangan sewa.
 */
class RentalService {
  /**
   * Membuat instance RentalService dengan dependensi repository dan clock.
   *
   * @param {Object} deps - Dependensi yang diinjeksikan.
   * @param {import('../repositories/RentalRepository')} deps.rentalRepository - Repository transaksi sewa.
   * @param {import('../repositories/RentalExtensionRepository')} deps.rentalExtensionRepository - Repository perpanjangan sewa.
   * @param {import('../repositories/GarageRepository')} deps.garageRepository - Repository garasi.
   * @param {import('../repositories/UserRepository')} deps.userRepository - Repository pengguna.
   * @param {Function} [deps.clock] - Fungsi clock yang mengembalikan Date saat ini (dapat di-mock saat testing).
   */
  constructor({
    rentalRepository,
    garageRepository,
    userRepository,
    clock = () => new Date(),
  }) {
    this.rentalRepository = rentalRepository;
    this.garageRepository = garageRepository;
    this.userRepository = userRepository;
    this.clock = clock;
  }

  /**
   * Mendelegasikan perhitungan tanggal selesai sewa inklusif.
   *
   * @param {string} startDate - Tanggal mulai sewa (YYYY-MM-DD).
   * @param {number} durationDays - Durasi penyewaan dalam hari.
   * @returns {string} Tanggal selesai sewa (YYYY-MM-DD).
   */
  calculateEndDate(startDate, durationDays) {
    return calculateEndDate(startDate, durationDays);
  }

  /**
   * Mendelegasikan perhitungan biaya sewa dasar harian atau bulanan.
   *
   * @param {string} rentalType - Tipe sewa ('DAILY' atau 'MONTHLY').
   * @param {number} durationDays - Durasi hari sewa.
   * @param {number} dailyRate - Tarif sewa harian garasi.
   * @returns {number} Biaya sewa dasar.
   */
  calculateRentalFee(rentalType, durationDays, dailyRate) {
    return calculateRentalFee(rentalType, durationDays, dailyRate);
  }

  /**
   * Mendelegasikan perhitungan biaya pengisian listrik mobil listrik berdasarkan kapasitas & persentase baterai sekarang.
   *
   * @param {string} vehicleType - Tipe kendaraan.
   * @param {string} garageType - Tipe garasi.
   * @param {number|null} batteryCapacityKwh - Kapasitas baterai dalam kWh.
   * @param {number|null} electricityRatePerKwh - Tarif pengisian listrik per kWh.
   * @param {number|null} [currentBatteryPercent=0] - Persentase baterai saat ini (0–100%).
   * @returns {number} Biaya pengisian listrik.
   */
  calculateElectricityFee(
    vehicleType,
    garageType,
    batteryCapacityKwh,
    electricityRatePerKwh,
    currentBatteryPercent = 0
  ) {
    return calculateElectricityFee(
      vehicleType,
      garageType,
      batteryCapacityKwh,
      electricityRatePerKwh,
      currentBatteryPercent
    );
  }

  /**
   * Mendelegasikan perhitungan biaya perpanjangan sewa garasi.
   *
   * @param {string} previousEndDate - Tanggal selesai saat ini (YYYY-MM-DD).
   * @param {string} newEndDate - Tanggal selesai baru (YYYY-MM-DD).
   * @param {number} dailyRate - Harga sewa harian garasi.
   * @returns {Object} Rincian lengkap biaya perpanjangan bernilai positif.
   */
  calculateExtensionFee(previousEndDate, newEndDate, dailyRate) {
    return calculateExtensionFee(previousEndDate, newEndDate, dailyRate);
  }

  /**
   * Memvalidasi dan menyelesaikan tanggal mulai pilihan penyewa (default hari ini WIB, tidak boleh lampau).
   *
   * @param {string|null|undefined} requestedStartDate - Tanggal mulai pilihan penyewa (YYYY-MM-DD) atau kosong.
   * @param {string} todayDate - Tanggal hari ini pada zona Asia/Jakarta (YYYY-MM-DD).
   * @returns {string} Tanggal mulai valid yang telah terverifikasi (>= todayDate).
   * @throws {ValidationError} Jika format tanggal tidak valid atau lebih awal dari todayDate.
   */
  resolveStartDate(requestedStartDate, todayDate) {
    const startDate =
      requestedStartDate && String(requestedStartDate).trim() !== ''
        ? String(requestedStartDate).trim()
        : todayDate;

    parseDateParts(startDate);
    if (startDate < todayDate) {
      throw new ValidationError(
        `Tanggal mulai penyewaan tidak boleh lebih awal dari tanggal hari ini (${todayDate} WIB).`
      );
    }
    return startDate;
  }

  /**
   * Mengembalikan konfigurasi penyewaan kanonis dari server untuk tanggal mulai pilihan (default hari ini WIB).
   *
   * @param {string|null} [requestedStartDate=null] - Tanggal mulai opsional (YYYY-MM-DD) untuk menghitung batas hari bulan tersebut.
   * @returns {Object} Tanggal hari ini (WIB), tanggal mulai terpilih, batas hari bulanan/harian, dan matriks kompatibilitas.
   * @throws {ValidationError} Jika requestedStartDate tidak valid atau lebih awal dari hari ini.
   */
  getRentalConfig(requestedStartDate = null) {
    const todayDate = getTodayInJakarta(this.clock());
    const startDate = this.resolveStartDate(requestedStartDate, todayDate);
    const { year, month } = parseDateParts(startDate);
    const monthlyDays = getDaysInMonth(year, month);
    const maxDailyDays = getMaxDailyDuration(startDate);

    return {
      todayDate,
      startDate,
      timezone: 'Asia/Jakarta',
      monthlyDays,
      maxDailyDays,
      monthlyRateMultiplier: MONTHLY_RATE_MULTIPLIER,
      compatibility: VEHICLE_GARAGE_COMPATIBILITY,
      vehicleTypeLabels: VEHICLE_TYPE_LABELS,
      garageTypeLabels: GARAGE_TYPE_LABELS,
    };
  }

  /**
   * Memvalidasi parameter sewa baru dan menghitung tanggal selesai serta rincian biaya di backend
   * tanpa menyimpan transaksi (untuk pratinjau langsung pada form penyewa).
   *
   * @param {Object} payload - Parameter rencana penyewaan dari form frontend.
   * @returns {Object} Pratinjau jadwal, detail kendaraan, garasi, dan total biaya dari server.
   * @throws {ValidationError} Jika kendaraan, tanggal mulai (< hari ini), durasi, atau kompatibilitas tidak valid.
   * @throws {NotFoundError} Jika garasi yang dipilih tidak ditemukan.
   */
  previewRentalCost(payload) {
    const todayDate = getTodayInJakarta(this.clock());
    this.garageRepository.syncStatuses(todayDate);

    const startDate = this.resolveStartDate(payload.startDate, todayDate);

    const vehicle = new Vehicle({
      vehicleType: payload.vehicleType,
      plateNumber: payload.plateNumber,
      brand: payload.brand,
      model: payload.model,
      batteryCapacityKwh: payload.batteryCapacityKwh,
      currentBatteryPercent: payload.currentBatteryPercent,
    });
    vehicle.validate();

    const { durationDays, monthlyDays, maxDailyDays } = validateRentalDuration(
      startDate,
      payload.rentalType,
      payload.durationDays
    );
    const endDate = calculateEndDate(startDate, durationDays);

    if (!payload.garageId) {
      throw new ValidationError('Garasi wajib dipilih.');
    }

    const garage = this.garageRepository.findById(String(payload.garageId).trim().toUpperCase());
    if (!garage) {
      throw new NotFoundError(`Garasi "${payload.garageId}" tidak ditemukan.`);
    }

    vehicle.validateCompatibility(garage.garageType);

    const costs = calculateTotalRentalCost({
      vehicleType: vehicle.vehicleType,
      garageType: garage.garageType,
      rentalType: payload.rentalType,
      durationDays,
      dailyRate: garage.dailyRate,
      batteryCapacityKwh: vehicle.batteryCapacityKwh,
      currentBatteryPercent: vehicle.currentBatteryPercent,
      electricityRatePerKwh: garage.electricityRatePerKwh,
    });

    const chargePercent =
      vehicle.vehicleType === 'ELECTRIC_CAR' && vehicle.currentBatteryPercent !== null
        ? Number((100 - vehicle.currentBatteryPercent).toFixed(2))
        : 0;
    const kwhToCharge =
      vehicle.vehicleType === 'ELECTRIC_CAR' && vehicle.batteryCapacityKwh
        ? Number(((vehicle.batteryCapacityKwh * chargePercent) / 100).toFixed(2))
        : 0;

    return {
      startDate,
      endDate,
      durationDays,
      monthlyDays,
      maxDailyDays,
      rentalType: payload.rentalType,
      garage: garage.toJSON(),
      vehicle: vehicle.toJSON(),
      chargePercent,
      kwhToCharge,
      ...costs,
    };
  }

  /**
   * Membuat transaksi penyewaan garasi baru untuk penyewa berstatus APPROVED.
   * Mendukung pemilihan tanggal mulai (hari ini atau tanggal mendatang), lalu memvalidasi ulang
   * kendaraan, kompatibilitas, durasi maks 1 bulan sesuai bulan tanggal mulai, biaya, bukti gambar,
   * serta ketersediaan garasi bebas tabrakan jadwal secara atomik dalam transaksi database.
   *
   * @param {string} tenantUserId - UUID penyewa yang sedang login.
   * @param {Object} payload - Input form penyewaan garasi (termasuk startDate opsional).
   * @param {string} paymentProofFilename - Nama file unik gambar bukti pelunasan yang berhasil diunggah.
   * @returns {import('../models/Rental')} Entitas Rental yang berhasil disimpan.
   * @throws {ForbiddenError} Jika penyewa tidak berstatus APPROVED.
   * @throws {ValidationError} Jika ada pelanggaran aturan bisnis, tanggal lampau, atau bukti pembayaran kosong.
   * @throws {NotFoundError} Jika garasi yang dipilih tidak ditemukan.
   * @throws {import('../utils/errors').ConflictError} Jika garasi memiliki jadwal aktif yang bertabrakan.
   */
  createRental(tenantUserId, payload, paymentProofFilename) {
    const tenant = this.userRepository.findTenantByUserId(tenantUserId);
    if (!tenant) {
      throw new ForbiddenError('Hanya akun penyewa terdaftar yang dapat menyewa garasi.');
    }
    if (!tenant.canRent()) {
      throw new ForbiddenError(
        `Akun penyewa Anda berstatus ${tenant.approvalStatus}. Hanya penyewa berstatus APPROVED yang dapat melakukan penyewaan.`
      );
    }

    if (!paymentProofFilename || typeof paymentProofFilename !== 'string') {
      throw new ValidationError('Bukti pelunasan berupa file gambar wajib diunggah.');
    }

    const todayDate = getTodayInJakarta(this.clock());
    this.garageRepository.syncStatuses(todayDate);

    const startDate = this.resolveStartDate(payload.startDate, todayDate);

    const vehicle = new Vehicle({
      vehicleType: payload.vehicleType,
      plateNumber: payload.plateNumber,
      brand: payload.brand,
      model: payload.model,
      batteryCapacityKwh: payload.batteryCapacityKwh,
      currentBatteryPercent: payload.currentBatteryPercent,
    });
    vehicle.validate();

    const { durationDays } = validateRentalDuration(
      startDate,
      payload.rentalType,
      payload.durationDays
    );
    const endDate = calculateEndDate(startDate, durationDays);

    if (!payload.garageId) {
      throw new ValidationError('Garasi wajib dipilih.');
    }
    const garageId = String(payload.garageId).trim().toUpperCase();
    const garage = this.garageRepository.findById(garageId);
    if (!garage) {
      throw new NotFoundError(`Garasi "${garageId}" tidak ditemukan.`);
    }

    vehicle.validateCompatibility(garage.garageType);

    const { rentalFee, electricityFee, totalAmount } = calculateTotalRentalCost({
      vehicleType: vehicle.vehicleType,
      garageType: garage.garageType,
      rentalType: payload.rentalType,
      durationDays,
      dailyRate: garage.dailyRate,
      batteryCapacityKwh: vehicle.batteryCapacityKwh,
      currentBatteryPercent: vehicle.currentBatteryPercent,
      electricityRatePerKwh: garage.electricityRatePerKwh,
    });

    const createdAt = getJakartaTimestamp(this.clock());

    return this.rentalRepository.createRentalTransactional(
      {
        id: crypto.randomUUID(),
        tenantUserId,
        garageId: garage.id,
        vehicleType: vehicle.vehicleType,
        plateNumber: vehicle.plateNumber,
        brand: vehicle.brand,
        model: vehicle.model,
        batteryCapacityKwh: vehicle.batteryCapacityKwh,
        currentBatteryPercent: vehicle.currentBatteryPercent,
        rentalType: payload.rentalType,
        durationDays,
        startDate,
        endDate,
        rentalFee,
        electricityFee,
        totalAmount,
        paymentProofPath: paymentProofFilename,
        createdAt,
      },
      todayDate
    );
  }

  /**
   * Mengambil seluruh riwayat penyewaan milik seorang penyewa setelah sinkronisasi status.
   *
   * @param {string} tenantUserId - UUID pengguna penyewa.
   * @returns {import('../models/Rental')[]} Daftar transaksi penyewaan milik penyewa.
   */
  getTenantRentals(tenantUserId) {
    const todayDate = getTodayInJakarta(this.clock());
    this.garageRepository.syncStatuses(todayDate);
    return this.rentalRepository.listByTenant(tenantUserId);
  }

  /**
   * Mengambil detail lengkap satu transaksi penyewaan beserta histori perpanjangannya
   * dengan pemeriksaan hak akses (Admin atau penyewa pemilik transaksi).
   *
   * @param {string} rentalId - UUID transaksi penyewaan.
   * @param {import('../models/Admin')|import('../models/Tenant')} requestingUser - Pengguna yang meminta data.
   * @returns {import('../models/Rental')} Entitas Rental lengkap.
   * @throws {NotFoundError} Jika transaksi penyewaan tidak ditemukan.
   * @throws {ForbiddenError} Jika penyewa mencoba mengakses transaksi milik penyewa lain.
   */
  getRentalDetail(rentalId, requestingUser) {
    const todayDate = getTodayInJakarta(this.clock());
    this.garageRepository.syncStatuses(todayDate);

    const rental = this.rentalRepository.findById(rentalId);
    if (!rental) {
      throw new NotFoundError('Transaksi penyewaan tidak ditemukan.');
    }

    if (
      requestingUser.role !== USER_ROLES.ADMIN &&
      rental.tenantUserId !== requestingUser.id
    ) {
      throw new ForbiddenError('Anda tidak berhak melihat detail transaksi penyewaan milik penyewa lain.');
    }

    return rental;
  }

  /**
   * Mengambil daftar seluruh garasi yang sedang atau akan disewa (aktif hari ini sampai mendatang),
   * diurutkan dari hari ini di paling atas hingga tanggal terjauh di paling bawah.
   *
   * @returns {{ todayDate: string, rentals: import('../models/entities').Rental[] }} Tanggal hari ini dan daftar sewa aktif.
   */
  getActiveRentalsToday() {
    const todayDate = getTodayInJakarta(this.clock());
    this.garageRepository.syncStatuses(todayDate);
    const rentals = this.rentalRepository.listActiveOnDate(todayDate);
    return { todayDate, rentals };
  }

  /**
   * Mengambil seluruh transaksi penyewaan di sistem dengan filter opsional (khusus Admin).
   *
   * @param {Object} [filters={}] - Filter opsional (status, garageType).
   * @returns {import('../models/Rental')[]} Daftar transaksi penyewaan.
   */
  getAllRentals(filters = {}) {
    const todayDate = getTodayInJakarta(this.clock());
    this.garageRepository.syncStatuses(todayDate);
    return this.rentalRepository.listAll(filters);
  }

  /**
   * Menghitung pratinjau tambahan hari dan biaya perpanjangan bernilai positif untuk ditinjau Admin.
   *
   * @param {string} rentalId - UUID transaksi penyewaan aktif.
   * @param {string} newEndDate - Tanggal selesai baru yang diusulkan (YYYY-MM-DD).
   * @returns {Object} Informasi penyewaan dan rincian blok bulanan + sisa hari biaya perpanjangan.
   * @throws {NotFoundError} Jika transaksi tidak ditemukan.
   * @throws {ValidationError} Jika penyewaan tidak aktif hari ini atau tanggal baru <= tanggal selesai lama.
   */
  previewExtensionCost(rentalId, newEndDate) {
    const todayDate = getTodayInJakarta(this.clock());
    this.garageRepository.syncStatuses(todayDate);

    const rental = this.rentalRepository.findById(rentalId);
    if (!rental) {
      throw new NotFoundError('Transaksi penyewaan tidak ditemukan.');
    }

    if (rental.status !== RENTAL_STATUS.ACTIVE || rental.endDate < todayDate) {
      throw new ValidationError(
        'Hanya penyewaan aktif yang belum berakhir yang dapat diperpanjang.'
      );
    }

    const breakdown = calculateExtensionFee(
      rental.endDate,
      newEndDate,
      rental.garage.dailyRate
    );

    const hasConflict = this.rentalRepository.hasOverlappingActiveRental(
      rental.garageId,
      breakdown.extensionStartDate,
      newEndDate,
      rental.id
    );
    if (hasConflict) {
      throw new ConflictError(
        `Perpanjangan garasi ${rental.garageId} hingga ${newEndDate} bertabrakan dengan jadwal penyewaan aktif lain pada garasi yang sama.`
      );
    }

    return {
      rentalId: rental.id,
      garageId: rental.garageId,
      dailyRate: rental.garage.dailyRate,
      previousEndDate: rental.endDate,
      newEndDate,
      ...breakdown,
    };
  }

  /**
   * Memproses perpanjangan masa sewa garasi aktif oleh Admin (tanpa batas maksimal 1 bulan).
   * Menyimpan histori tanggal selesai sebelumnya, ID Admin pemroses, bukti bayar, dan memperbarui end_date secara atomik.
   *
   * @param {string} rentalId - UUID transaksi penyewaan aktif.
   * @param {string} adminUserId - UUID Admin yang memproses perpanjangan.
   * @param {string} newEndDate - Tanggal selesai baru yang diinginkan (YYYY-MM-DD).
   * @param {string} paymentProofFilename - Nama file unik gambar bukti pembayaran perpanjangan.
   * @returns {{
   *   extension: import('../models/RentalExtension'),
   *   rental: import('../models/Rental'),
   *   breakdown: Object
   * }} Catatan perpanjangan baru, entitas penyewaan terbarui, dan rincian perhitungan biaya.
   * @throws {ValidationError} Jika bukti bayar kosong, penyewaan tidak aktif hari ini, atau tanggal baru tidak valid.
   * @throws {NotFoundError} Jika transaksi penyewaan tidak ditemukan.
   */
  extendRental(rentalId, adminUserId, newEndDate, paymentProofFilename) {
    if (!paymentProofFilename || typeof paymentProofFilename !== 'string') {
      throw new ValidationError('Bukti pembayaran perpanjangan berupa gambar wajib diunggah.');
    }

    const todayDate = getTodayInJakarta(this.clock());
    this.garageRepository.syncStatuses(todayDate);

    const rental = this.rentalRepository.findById(rentalId);
    if (!rental) {
      throw new NotFoundError('Transaksi penyewaan tidak ditemukan.');
    }

    if (rental.status !== RENTAL_STATUS.ACTIVE || rental.endDate < todayDate) {
      throw new ValidationError(
        'Hanya penyewaan aktif yang belum berakhir yang dapat diperpanjang.'
      );
    }

    const breakdown = calculateExtensionFee(
      rental.endDate,
      newEndDate,
      rental.garage.dailyRate
    );

    const createdAt = getJakartaTimestamp(this.clock());

    const extension = this.rentalRepository.createExtensionTransactional(
      {
        id: crypto.randomUUID(),
        rentalId: rental.id,
        adminUserId,
        previousEndDate: rental.endDate,
        newEndDate,
        addedDays: breakdown.addedDays,
        extensionAmount: breakdown.extensionAmount,
        paymentProofPath: paymentProofFilename,
        createdAt,
      },
      todayDate
    );

    const updatedRental = this.rentalRepository.findById(rental.id);
    return {
      extension,
      rental: updatedRental,
      breakdown,
    };
  }
}

module.exports = RentalService;
