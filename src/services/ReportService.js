/**
 * Layanan pelaporan Admin dan agregasi metrik dashboard secara langsung dari database SQLite.
 * @module services/ReportService
 */

const { GARAGE_TYPES, ValidationError } = require('../utils/constants');
const { getTodayInJakarta, parseDateParts } = require('../utils/rentalMath');

/**
 * Service yang menyediakan laporan bulanan, harian, per tipe garasi, per penyewa, dan KPI dashboard.
 */
class ReportService {
  /**
   * Membuat instance ReportService.
   *
   * @param {Object} deps - Dependensi yang diinjeksikan.
   * @param {import('../repositories/ReportRepository')} deps.reportRepository - Repository agregasi SQL laporan.
   * @param {import('../repositories/GarageRepository')} deps.garageRepository - Repository garasi untuk sinkronisasi status.
   * @param {Function} [deps.clock] - Fungsi clock yang mengembalikan Date saat ini (dapat di-mock saat testing).
   */
  constructor({ reportRepository, garageRepository, clock = () => new Date() }) {
    this.reportRepository = reportRepository;
    this.garageRepository = garageRepository;
    this.clock = clock;
  }

  /**
   * Menghasilkan laporan penyewaan dan pendapatan per bulan untuk satu tahun tertentu.
   *
   * @param {number|string} [year] - Tahun kalender laporan (default: tahun saat ini di Asia/Jakarta).
   * @returns {Object} Rincian bulanan dan total tahunan.
   * @throws {ValidationError} Jika parameter tahun tidak valid (di luar 2000..2100).
   */
  getMonthlyReport(year) {
    const todayDate = getTodayInJakarta(this.clock());
    this.garageRepository.syncStatuses(todayDate);

    const currentYear = parseDateParts(todayDate).year;
    const resolvedYear = year !== undefined && year !== '' ? Number(year) : currentYear;

    if (!Number.isInteger(resolvedYear) || resolvedYear < 2000 || resolvedYear > 2100) {
      throw new ValidationError('Tahun laporan harus berupa bilangan bulat antara 2000 sampai 2100.');
    }

    return this.reportRepository.getMonthlyReport(resolvedYear);
  }

  /**
   * Menghasilkan laporan penyewaan dan pendapatan per hari dalam satu bulan dan tahun tertentu.
   *
   * @param {number|string} [year] - Tahun kalender laporan (default: tahun saat ini WIB).
   * @param {number|string} [month] - Nomor bulan 1..12 (default: bulan saat ini WIB).
   * @param {boolean} [includeEmptyDays=false] - True untuk ikut menampilkan tanggal tanpa transaksi.
   * @returns {Object} Rincian harian dan ringkasan bulanan.
   * @throws {ValidationError} Jika parameter tahun atau bulan tidak valid.
   */
  getDailyReport(year, month, includeEmptyDays = false) {
    const todayDate = getTodayInJakarta(this.clock());
    this.garageRepository.syncStatuses(todayDate);

    const todayParts = parseDateParts(todayDate);
    const resolvedYear = year !== undefined && year !== '' ? Number(year) : todayParts.year;
    const resolvedMonth = month !== undefined && month !== '' ? Number(month) : todayParts.month;

    if (!Number.isInteger(resolvedYear) || resolvedYear < 2000 || resolvedYear > 2100) {
      throw new ValidationError('Tahun laporan harus berupa bilangan bulat antara 2000 sampai 2100.');
    }
    if (!Number.isInteger(resolvedMonth) || resolvedMonth < 1 || resolvedMonth > 12) {
      throw new ValidationError('Bulan laporan harus berupa bilangan bulat antara 1 sampai 12.');
    }

    return this.reportRepository.getDailyReport(
      resolvedYear,
      resolvedMonth,
      Boolean(includeEmptyDays)
    );
  }

  /**
   * Menghasilkan laporan penyewaan yang dikelompokkan berdasarkan tipe garasi dengan filter opsional.
   *
   * @param {Object} [filters={}] - Filter laporan opsional.
   * @param {string} [filters.garageType] - Filter satu tipe garasi tertentu.
   * @param {number|string} [filters.year] - Filter tahun opsional.
   * @param {number|string} [filters.month] - Filter bulan opsional (1..12).
   * @returns {Object} Baris metrik per tipe garasi dan ringkasan total.
   * @throws {ValidationError} Jika ada nilai filter yang tidak valid.
   */
  getGarageTypeReport(filters = {}) {
    const todayDate = getTodayInJakarta(this.clock());
    this.garageRepository.syncStatuses(todayDate);

    const parsedFilters = {};
    if (filters.garageType) {
      if (!Object.values(GARAGE_TYPES).includes(filters.garageType)) {
        throw new ValidationError(`Tipe garasi tidak valid: "${filters.garageType}".`);
      }
      parsedFilters.garageType = filters.garageType;
    }

    if (filters.year !== undefined && filters.year !== '') {
      const y = Number(filters.year);
      if (!Number.isInteger(y) || y < 2000 || y > 2100) {
        throw new ValidationError('Filter tahun tidak valid.');
      }
      parsedFilters.year = y;
    }

    if (filters.month !== undefined && filters.month !== '') {
      const m = Number(filters.month);
      if (!Number.isInteger(m) || m < 1 || m > 12) {
        throw new ValidationError('Filter bulan tidak valid.');
      }
      if (!parsedFilters.year) {
        parsedFilters.year = parseDateParts(todayDate).year;
      }
      parsedFilters.month = m;
    }

    return this.reportRepository.getGarageTypeReport(parsedFilters);
  }

  /**
   * Menghasilkan laporan penyewaan yang dikelompokkan per penyewa dengan filter opsional.
   *
   * @param {Object} [filters={}] - Filter opsional penyewa.
   * @param {string} [filters.tenantUserId] - UUID penyewa tertentu.
   * @param {string} [filters.search] - Kata kunci pencarian nama lengkap, NIK, atau email.
   * @returns {Object} Baris metrik per penyewa dan total keseluruhan.
   */
  getTenantReport(filters = {}) {
    const todayDate = getTodayInJakarta(this.clock());
    this.garageRepository.syncStatuses(todayDate);
    return this.reportRepository.getTenantReport(filters);
  }

  /**
   * Mengambil ringkasan metrik KPI aktual untuk Dashboard Admin.
   *
   * @returns {Object} Metrik Dashboard Admin dari database.
   */
  getAdminDashboardStats() {
    const todayDate = getTodayInJakarta(this.clock());
    this.garageRepository.syncStatuses(todayDate);
    return this.reportRepository.getAdminDashboardStats(todayDate);
  }

  /**
   * Mengambil ringkasan metrik KPI aktual untuk Dashboard Penyewa.
   *
   * @param {string} tenantUserId - UUID pengguna penyewa yang sedang login.
   * @returns {Object} Metrik Dashboard Penyewa dari database.
   */
  getTenantDashboardStats(tenantUserId) {
    const todayDate = getTodayInJakarta(this.clock());
    this.garageRepository.syncStatuses(todayDate);
    return this.reportRepository.getTenantDashboardStats(tenantUserId, todayDate);
  }
}

module.exports = ReportService;
