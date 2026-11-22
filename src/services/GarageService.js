/**
 * Layanan manajemen garasi massal, konfigurasi garage_types, generator ID garasi otomatis,
 * filter ketersediaan, dan kompatibilitas.
 * @module services/GarageService
 */

const { GarageSequence } = require('../models/entities');
const {
  GARAGE_TYPES,
  GARAGE_STATUS,
  MAX_GARAGES_PER_TYPE,
  RENTAL_TYPES,
  ValidationError,
  NotFoundError,
} = require('../utils/constants');
const {
  getAllowedGarageTypes,
  validateVehicleCompatibility,
  getTodayInJakarta,
  getJakartaTimestamp,
  parseDateParts,
  calculateEndDate,
  validateRentalDuration,
  roundCurrency,
} = require('../utils/rentalMath');

/**
 * Service yang mengelola seluruh logika bisnis dan validasi manajemen garasi.
 */
class GarageService {
  /**
   * Membuat instance GarageService.
   *
   * @param {Object} deps - Dependensi yang diinjeksikan.
   * @param {import('../repositories/GarageRepository')} deps.garageRepository - Repository garasi.
   * @param {Function} [deps.clock] - Fungsi clock yang mengembalikan Date saat ini (dapat di-mock saat testing).
   */
  constructor({ garageRepository, clock = () => new Date() }) {
    this.garageRepository = garageRepository;
    this.clock = clock;
  }

  /**
   * Menghasilkan ID garasi otomatis dari tipe garasi dan nomor urut 3 digit.
   *
   * @param {string} garageType - Tipe garasi ('BIKE', 'CAR', 'EV').
   * @param {number} sequenceNumber - Nomor urut bilangan bulat positif (1..999).
   * @returns {string} ID garasi otomatis (contoh: S001, C010, E005).
   * @throws {ValidationError} Jika tipe garasi atau nomor urut tidak valid.
   */
  generateGarageId(garageType, sequenceNumber) {
    return GarageSequence.formatId(garageType, sequenceNumber);
  }

  /**
   * Memvalidasi kecocokan antara tipe kendaraan dan tipe garasi.
   *
   * @param {string} vehicleType - Kode tipe kendaraan.
   * @param {string} garageType - Kode tipe garasi ('BIKE', 'CAR', 'EV').
   * @returns {boolean} True jika kompatibel.
   * @throws {ValidationError} Jika kendaraan tidak kompatibel dengan garasi.
   */
  validateCompatibility(vehicleType, garageType) {
    return validateVehicleCompatibility(vehicleType, garageType);
  }

  /**
   * Menyinkronkan status penyewaan kedaluwarsa dan status AVAILABLE/USED garasi terhadap tanggal hari ini (WIB).
   *
   * @returns {{ todayDate: string, completedRentals: number, updatedToAvailable: number, updatedToUsed: number }} Ringkasan sinkronisasi.
   */
  syncStatuses() {
    const todayDate = getTodayInJakarta(this.clock());
    const result = this.garageRepository.syncStatuses(todayDate);
    return { todayDate, ...result };
  }

  /**
   * Memvalidasi input, memperbarui tarif pada tabel garage_types, dan membuat sekumpulan garasi baru
   * secara massal dalam transaksi atomik.
   *
   * @param {Object} payload - Parameter pembuatan garasi massal.
   * @param {string} payload.garageType - Tipe garasi ('BIKE', 'CAR', 'EV').
   * @param {number|string} payload.quantity - Jumlah unit garasi yang dibuat (1..999 sesuai sisa kapasitas).
   * @param {number|string} payload.dailyRate - Harga sewa harian (harus > 0).
   * @param {number|string|null} [payload.electricityRatePerKwh=null] - Tarif listrik per kWh (wajib khusus EV).
   * @returns {import('../models/Garage')[]} Daftar entitas Garage yang berhasil dibuat.
   * @throws {ValidationError} Jika input tidak valid atau total unit melebihi batas 999 per tipe.
   */
  createGarageBatch({
    garageType,
    quantity,
    dailyRate,
    electricityRatePerKwh = null,
  }) {
    if (!Object.values(GARAGE_TYPES).includes(garageType)) {
      throw new ValidationError(
        `Tipe garasi tidak valid: "${garageType}". Pilih BIKE, CAR, atau EV.`
      );
    }

    const parsedQuantity = Number(quantity);
    if (
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity < 1 ||
      parsedQuantity > MAX_GARAGES_PER_TYPE
    ) {
      throw new ValidationError(
        `Jumlah garasi harus berupa bilangan bulat antara 1 sampai ${MAX_GARAGES_PER_TYPE}.`
      );
    }

    const parsedDailyRate = Number(dailyRate);
    if (!Number.isFinite(parsedDailyRate) || parsedDailyRate <= 0) {
      throw new ValidationError('Harga sewa harian harus berupa angka positif lebih dari 0.');
    }

    let resolvedElectricityRate = null;
    if (garageType === GARAGE_TYPES.EV) {
      const parsedElec = Number(electricityRatePerKwh);
      if (
        electricityRatePerKwh === null ||
        electricityRatePerKwh === undefined ||
        electricityRatePerKwh === '' ||
        !Number.isFinite(parsedElec) ||
        parsedElec <= 0
      ) {
        throw new ValidationError(
          'Harga pengisian listrik per kWh wajib diisi dengan angka positif untuk Garasi Mobil Listrik.'
        );
      }
      resolvedElectricityRate = roundCurrency(parsedElec);
    } else if (
      electricityRatePerKwh !== null &&
      electricityRatePerKwh !== undefined &&
      electricityRatePerKwh !== ''
    ) {
      throw new ValidationError(
        'Tarif pengisian listrik per kWh hanya berlaku untuk Garasi Mobil Listrik.'
      );
    }

    const createdAt = getJakartaTimestamp(this.clock());

    return this.garageRepository.createGarageBatch({
      garageType,
      quantity: parsedQuantity,
      dailyRate: roundCurrency(parsedDailyRate),
      electricityRatePerKwh: resolvedElectricityRate,
      createdAt,
    });
  }

  /**
   * Menampilkan daftar seluruh garasi, konfigurasi garage_types, dan counter urutan
   * setelah menyinkronkan status operasional.
   *
   * @param {Object} [filters={}] - Filter opsional (garageType, status, search).
   * @returns {{
   *   garages: import('../models/Garage')[],
   *   garageTypes: import('../models/GarageTypeConfig')[],
   *   sequences: Array<Object>
   * }} Daftar garasi, konfigurasi tipe garasi, dan kapasitas urutan.
   * @throws {ValidationError} Jika nilai filter tipe atau status garasi tidak valid.
   */
  listGarages(filters = {}) {
    if (
      filters.garageType &&
      !Object.values(GARAGE_TYPES).includes(filters.garageType)
    ) {
      throw new ValidationError(`Filter tipe garasi tidak valid: "${filters.garageType}".`);
    }
    if (filters.status && !Object.values(GARAGE_STATUS).includes(filters.status)) {
      throw new ValidationError(`Filter status garasi tidak valid: "${filters.status}".`);
    }

    this.syncStatuses();
    const garages = this.garageRepository.listGarages(filters);
    const garageTypes = this.garageRepository.getAllGarageTypes();
    const sequences = this.garageRepository.getAllSequences();
    return { garages, garageTypes, sequences };
  }

  /**
   * Mengambil detail satu garasi berdasarkan ID setelah menyinkronkan statusnya.
   *
   * @param {string} garageId - ID garasi (contoh: S001).
   * @returns {import('../models/Garage')} Entitas Garage yang ditemukan.
   * @throws {NotFoundError} Jika garasi tidak ditemukan.
   */
  getGarageById(garageId) {
    this.syncStatuses();
    const garage = this.garageRepository.findById(garageId);
    if (!garage) {
      throw new NotFoundError(`Garasi "${garageId}" tidak ditemukan.`);
    }
    return garage;
  }

  /**
   * Mencari garasi yang kompatibel dengan kendaraan dan bebas tabrakan jadwal
   * untuk seluruh periode sewa dimulai dari startDate yang dipilih penyewa (minimal hari ini WIB).
   *
   * @param {Object} query - Parameter pencarian ketersediaan garasi.
   * @param {string} query.vehicleType - Tipe kendaraan yang dipilih penyewa.
   * @param {string|null} [query.garageType=null] - Tipe garasi kompatibel spesifik ('BIKE', 'CAR', 'EV').
   * @param {string} [query.rentalType='DAILY'] - Tipe sewa ('DAILY' atau 'MONTHLY').
   * @param {number|string} [query.durationDays=1] - Durasi hari yang diinginkan.
   * @param {string|null} [query.startDate=null] - Tanggal mulai pilihan penyewa (YYYY-MM-DD, default hari ini WIB).
   * @returns {{
   *   startDate: string,
   *   endDate: string,
   *   durationDays: number,
   *   monthlyDays: number,
   *   maxDailyDays: number,
   *   allowedGarageTypes: string[],
   *   garages: import('../models/Garage')[]
   * }} Hasil pencarian garasi tersedia beserta periode tanggal yang dihitung.
   * @throws {ValidationError} Jika tipe kendaraan, tipe garasi, tanggal mulai (< hari ini), atau durasi tidak valid.
   */
  getAvailableGarages({
    vehicleType,
    garageType = null,
    rentalType = RENTAL_TYPES.DAILY,
    durationDays = 1,
    startDate = null,
  }) {
    const { todayDate } = this.syncStatuses();
    const resolvedStartDate =
      startDate && String(startDate).trim() !== ''
        ? String(startDate).trim()
        : todayDate;

    parseDateParts(resolvedStartDate);
    if (resolvedStartDate < todayDate) {
      throw new ValidationError(
        `Tanggal mulai penyewaan tidak boleh lebih awal dari tanggal hari ini (${todayDate} WIB).`
      );
    }

    const allowedGarageTypes = getAllowedGarageTypes(vehicleType);

    let targetGarageTypes = allowedGarageTypes;
    if (garageType) {
      validateVehicleCompatibility(vehicleType, garageType);
      targetGarageTypes = [garageType];
    }

    const {
      durationDays: resolvedDuration,
      monthlyDays,
      maxDailyDays,
    } = validateRentalDuration(
      resolvedStartDate,
      rentalType,
      rentalType === RENTAL_TYPES.MONTHLY ? undefined : durationDays
    );

    const endDate = calculateEndDate(resolvedStartDate, resolvedDuration);
    const garages = this.garageRepository.findAvailableForPeriod(
      targetGarageTypes,
      resolvedStartDate,
      endDate
    );

    return {
      startDate: resolvedStartDate,
      endDate,
      durationDays: resolvedDuration,
      monthlyDays,
      maxDailyDays,
      allowedGarageTypes,
      garages,
    };
  }
}

module.exports = GarageService;
