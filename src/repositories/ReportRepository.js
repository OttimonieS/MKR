/**
 * Repository pengeksekusi query agregasi SQL untuk laporan Admin dan ringkasan dashboard
 * sesuai skema 8 tabel ERD dengan predikat SARGable (ramah B-tree index) dan bebas N+1 query.
 * @module repositories/ReportRepository
 */

const {
  GARAGE_TYPES,
  GARAGE_TYPE_LABELS,
  GARAGE_STATUS,
  RENTAL_STATUS,
  APPROVAL_STATUS,
} = require('../utils/constants');
const { getDaysInMonth, roundCurrency } = require('../utils/rentalMath');

const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/**
 * Menghasilkan batas rentang setengah terbuka [startInclusive, endExclusive) untuk satu tahun kalender
 * agar klausa WHERE bersifat SARGable dan memanfaatkan index B-tree SQLite.
 *
 * @param {number} year - Tahun kalender 4 digit.
 * @returns {{ start: string, endExclusive: string }} Batas tanggal SARGable untuk satu tahun.
 */
function getYearRangeBounds(year) {
  const startYear = String(year).padStart(4, '0');
  const nextYear = String(year + 1).padStart(4, '0');
  return {
    start: `${startYear}-01-01`,
    endExclusive: `${nextYear}-01-01`,
  };
}

/**
 * Menghasilkan batas rentang setengah terbuka [startInclusive, endExclusive) untuk satu bulan kalender
 * agar klausa WHERE bersifat SARGable dan memanfaatkan index B-tree SQLite.
 *
 * @param {number} year - Tahun kalender 4 digit.
 * @param {number} month - Nomor bulan (1..12).
 * @returns {{ start: string, endExclusive: string }} Batas tanggal SARGable untuk satu bulan.
 */
function getMonthRangeBounds(year, month) {
  const startYear = String(year).padStart(4, '0');
  const startMonth = String(month).padStart(2, '0');
  const nextYearNum = month === 12 ? year + 1 : year;
  const nextMonthNum = month === 12 ? 1 : month + 1;
  const nextYear = String(nextYearNum).padStart(4, '0');
  const nextMonth = String(nextMonthNum).padStart(2, '0');
  return {
    start: `${startYear}-${startMonth}-01`,
    endExclusive: `${nextYear}-${nextMonth}-01`,
  };
}

/**
 * Lapisan akses data untuk query agregasi laporan penyewaan dan KPI dashboard dari SQLite.
 */
class ReportRepository {
  /**
   * Membuat instance ReportRepository.
   *
   * @param {import('better-sqlite3').Database} db - Koneksi database SQLite aktif.
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Menghasilkan laporan penyewaan dan pendapatan per bulan (Januari–Desember) pada tahun tertentu
   * menggunakan predikat rentang SARGable pada index tanggal.
   *
   * @param {number} year - Tahun kalender 4 digit.
   * @returns {Object} Rincian 12 bulan beserta ringkasan total satu tahun.
   */
  getMonthlyReport(year) {
    const yearStr = String(year).padStart(4, '0');
    const { start, endExclusive } = getYearRangeBounds(year);

    const rentalRows = this.db
      .prepare(
        `SELECT substr(start_date, 1, 7) AS period,
                COUNT(*) AS rental_transactions,
                COALESCE(SUM(total_price), 0) AS rental_revenue
         FROM rentals
         WHERE start_date >= ? AND start_date < ?
         GROUP BY period`
      )
      .all(start, endExclusive);

    const extensionRows = this.db
      .prepare(
        `SELECT substr(created_at, 1, 7) AS period,
                COUNT(*) AS extension_transactions,
                COALESCE(SUM(extension_fee), 0) AS extension_revenue
         FROM rental_extensions
         WHERE created_at >= ? AND created_at < ?
         GROUP BY period`
      )
      .all(start, endExclusive);

    const garagesUsedByMonthRows = this.db
      .prepare(
        `SELECT period, COUNT(DISTINCT garage_id) AS garages_used
         FROM (
           SELECT substr(start_date, 1, 7) AS period, garage_id
           FROM rentals
           WHERE start_date >= ? AND start_date < ?
           UNION
           SELECT substr(re.created_at, 1, 7) AS period, r.garage_id
           FROM rental_extensions re
           JOIN rentals r ON r.rental_id = re.rental_id
           WHERE re.created_at >= ? AND re.created_at < ?
         )
         GROUP BY period`
      )
      .all(start, endExclusive, start, endExclusive);

    const yearGaragesUsedRow = this.db
      .prepare(
        `SELECT COUNT(DISTINCT garage_id) AS garages_used
         FROM (
           SELECT garage_id FROM rentals
           WHERE start_date >= ? AND start_date < ?
           UNION
           SELECT r.garage_id
           FROM rental_extensions re
           JOIN rentals r ON r.rental_id = re.rental_id
           WHERE re.created_at >= ? AND re.created_at < ?
         )`
      )
      .get(start, endExclusive, start, endExclusive);

    const rentalMap = new Map(rentalRows.map((r) => [r.period, r]));
    const extMap = new Map(extensionRows.map((r) => [r.period, r]));
    const garageMap = new Map(
      garagesUsedByMonthRows.map((r) => [r.period, Number(r.garages_used)])
    );

    const rows = [];
    let totalRentalTx = 0;
    let totalExtTx = 0;
    let totalRentalRevenue = 0;
    let totalExtensionRevenue = 0;

    for (let m = 1; m <= 12; m += 1) {
      const mm = String(m).padStart(2, '0');
      const period = `${yearStr}-${mm}`;
      const rData = rentalMap.get(period);
      const eData = extMap.get(period);

      const rentalTransactions = rData ? Number(rData.rental_transactions) : 0;
      const extensionTransactions = eData ? Number(eData.extension_transactions) : 0;
      const rentalRevenue = roundCurrency(rData ? Number(rData.rental_revenue) : 0);
      const extensionRevenue = roundCurrency(eData ? Number(eData.extension_revenue) : 0);
      const totalRevenue = roundCurrency(rentalRevenue + extensionRevenue);
      const garagesUsed = garageMap.get(period) || 0;

      totalRentalTx += rentalTransactions;
      totalExtTx += extensionTransactions;
      totalRentalRevenue = roundCurrency(totalRentalRevenue + rentalRevenue);
      totalExtensionRevenue = roundCurrency(totalExtensionRevenue + extensionRevenue);

      rows.push({
        month: m,
        monthName: MONTH_NAMES_ID[m - 1],
        period,
        rentalTransactions,
        extensionTransactions,
        totalTransactions: rentalTransactions + extensionTransactions,
        garagesUsed,
        rentalRevenue,
        extensionRevenue,
        totalRevenue,
      });
    }

    return {
      year,
      summary: {
        rentalTransactions: totalRentalTx,
        extensionTransactions: totalExtTx,
        totalTransactions: totalRentalTx + totalExtTx,
        garagesUsed: Number(yearGaragesUsedRow ? yearGaragesUsedRow.garages_used : 0),
        rentalRevenue: totalRentalRevenue,
        extensionRevenue: totalExtensionRevenue,
        totalRevenue: roundCurrency(totalRentalRevenue + totalExtensionRevenue),
      },
      rows,
    };
  }

  /**
   * Menghasilkan laporan penyewaan dan pendapatan per hari dalam suatu bulan dan tahun tertentu
   * menggunakan predikat rentang SARGable pada index tanggal.
   *
   * @param {number} year - Tahun kalender 4 digit.
   * @param {number} month - Nomor bulan (1..12).
   * @param {boolean} [includeEmptyDays=false] - True untuk menyertakan tanggal tanpa transaksi.
   * @returns {Object} Rincian harian dan ringkasan total satu bulan.
   */
  getDailyReport(year, month, includeEmptyDays = false) {
    const yearStr = String(year).padStart(4, '0');
    const monthStr = String(month).padStart(2, '0');
    const periodPrefix = `${yearStr}-${monthStr}`;
    const daysInMonth = getDaysInMonth(year, month);
    const { start, endExclusive } = getMonthRangeBounds(year, month);

    const rentalRows = this.db
      .prepare(
        `SELECT start_date AS date,
                COUNT(*) AS rental_transactions,
                COALESCE(SUM(total_price), 0) AS rental_revenue
         FROM rentals
         WHERE start_date >= ? AND start_date < ?
         GROUP BY start_date`
      )
      .all(start, endExclusive);

    const extensionRows = this.db
      .prepare(
        `SELECT substr(created_at, 1, 10) AS date,
                COUNT(*) AS extension_transactions,
                COALESCE(SUM(extension_fee), 0) AS extension_revenue
         FROM rental_extensions
         WHERE created_at >= ? AND created_at < ?
         GROUP BY date`
      )
      .all(start, endExclusive);

    const garagesByDayRows = this.db
      .prepare(
        `SELECT date, COUNT(DISTINCT garage_id) AS garages_used
         FROM (
           SELECT start_date AS date, garage_id
           FROM rentals
           WHERE start_date >= ? AND start_date < ?
           UNION
           SELECT substr(re.created_at, 1, 10) AS date, r.garage_id
           FROM rental_extensions re
           JOIN rentals r ON r.rental_id = re.rental_id
           WHERE re.created_at >= ? AND re.created_at < ?
         )
         GROUP BY date`
      )
      .all(start, endExclusive, start, endExclusive);

    const monthGaragesUsedRow = this.db
      .prepare(
        `SELECT COUNT(DISTINCT garage_id) AS garages_used
         FROM (
           SELECT garage_id FROM rentals
           WHERE start_date >= ? AND start_date < ?
           UNION
           SELECT r.garage_id
           FROM rental_extensions re
           JOIN rentals r ON r.rental_id = re.rental_id
           WHERE re.created_at >= ? AND re.created_at < ?
         )`
      )
      .get(start, endExclusive, start, endExclusive);

    const rentalMap = new Map(rentalRows.map((r) => [r.date, r]));
    const extMap = new Map(extensionRows.map((r) => [r.date, r]));
    const garageMap = new Map(
      garagesByDayRows.map((r) => [r.date, Number(r.garages_used)])
    );

    const rows = [];
    let totalRentalTx = 0;
    let totalExtTx = 0;
    let totalRentalRevenue = 0;
    let totalExtensionRevenue = 0;

    for (let d = 1; d <= daysInMonth; d += 1) {
      const dd = String(d).padStart(2, '0');
      const dateStr = `${periodPrefix}-${dd}`;
      const rData = rentalMap.get(dateStr);
      const eData = extMap.get(dateStr);

      const rentalTransactions = rData ? Number(rData.rental_transactions) : 0;
      const extensionTransactions = eData ? Number(eData.extension_transactions) : 0;
      const totalTransactions = rentalTransactions + extensionTransactions;

      const rentalRevenue = roundCurrency(rData ? Number(rData.rental_revenue) : 0);
      const extensionRevenue = roundCurrency(eData ? Number(eData.extension_revenue) : 0);
      const totalRevenue = roundCurrency(rentalRevenue + extensionRevenue);
      const garagesUsed = garageMap.get(dateStr) || 0;

      totalRentalTx += rentalTransactions;
      totalExtTx += extensionTransactions;
      totalRentalRevenue = roundCurrency(totalRentalRevenue + rentalRevenue);
      totalExtensionRevenue = roundCurrency(totalExtensionRevenue + extensionRevenue);

      if (includeEmptyDays || totalTransactions > 0) {
        rows.push({
          date: dateStr,
          day: d,
          rentalTransactions,
          extensionTransactions,
          totalTransactions,
          garagesUsed,
          rentalRevenue,
          extensionRevenue,
          totalRevenue,
        });
      }
    }

    return {
      year,
      month,
      monthName: MONTH_NAMES_ID[month - 1],
      period: periodPrefix,
      daysInMonth,
      summary: {
        rentalTransactions: totalRentalTx,
        extensionTransactions: totalExtTx,
        totalTransactions: totalRentalTx + totalExtTx,
        garagesUsed: Number(monthGaragesUsedRow ? monthGaragesUsedRow.garages_used : 0),
        rentalRevenue: totalRentalRevenue,
        extensionRevenue: totalExtensionRevenue,
        totalRevenue: roundCurrency(totalRentalRevenue + totalExtensionRevenue),
      },
      rows,
    };
  }

  /**
   * Menghasilkan laporan penyewaan dan pendapatan yang dikelompokkan berdasarkan tipe garasi (garage_types)
   * menggunakan predikat rentang SARGable untuk filter periode tahun/bulan.
   *
   * @param {Object} [filters={}] - Filter laporan opsional.
   * @param {string} [filters.garageType] - Filter satu tipe garasi tertentu ('BIKE', 'CAR', 'EV').
   * @param {number} [filters.year] - Filter tahun opsional.
   * @param {number} [filters.month] - Filter bulan opsional.
   * @returns {Object} Baris metrik per tipe garasi beserta total ringkasan.
   */
  getGarageTypeReport(filters = {}) {
    const periodClauseRental = [];
    const rentalParams = [];
    const periodClauseExt = [];
    const extParams = [];

    if (filters.year) {
      const bounds = filters.month
        ? getMonthRangeBounds(filters.year, filters.month)
        : getYearRangeBounds(filters.year);

      periodClauseRental.push('r.start_date >= ? AND r.start_date < ?');
      rentalParams.push(bounds.start, bounds.endExclusive);
      periodClauseExt.push('re.created_at >= ? AND re.created_at < ?');
      extParams.push(bounds.start, bounds.endExclusive);
    }

    const rentalWhere =
      periodClauseRental.length > 0 ? `WHERE ${periodClauseRental.join(' AND ')}` : '';
    const extWhere =
      periodClauseExt.length > 0 ? `WHERE ${periodClauseExt.join(' AND ')}` : '';

    const inventoryRows = this.db
      .prepare(
        `SELECT gt.name AS garage_type,
                COUNT(g.garage_id) AS total_garages,
                SUM(CASE WHEN g.status = ? THEN 1 ELSE 0 END) AS available_garages,
                SUM(CASE WHEN g.status = ? THEN 1 ELSE 0 END) AS used_garages
         FROM garage_types gt
         LEFT JOIN garages g ON g.type_id = gt.type_id
         GROUP BY gt.name`
      )
      .all(GARAGE_STATUS.AVAILABLE, GARAGE_STATUS.USED);

    const rentalAgg = this.db
      .prepare(
        `SELECT gt.name AS garage_type,
                COUNT(r.rental_id) AS rental_transactions,
                COALESCE(SUM(r.total_price), 0) AS rental_revenue
         FROM rentals r
         JOIN garages g ON g.garage_id = r.garage_id
         JOIN garage_types gt ON gt.type_id = g.type_id
         ${rentalWhere}
         GROUP BY gt.name`
      )
      .all(...rentalParams);

    const extAgg = this.db
      .prepare(
        `SELECT gt.name AS garage_type,
                COUNT(re.rentalext_id) AS extension_transactions,
                COALESCE(SUM(re.extension_fee), 0) AS extension_revenue
         FROM rental_extensions re
         JOIN rentals r ON r.rental_id = re.rental_id
         JOIN garages g ON g.garage_id = r.garage_id
         JOIN garage_types gt ON gt.type_id = g.type_id
         ${extWhere}
         GROUP BY gt.name`
      )
      .all(...extParams);

    const garagesUsedAgg = this.db
      .prepare(
        `SELECT garage_type, COUNT(DISTINCT garage_id) AS garages_used
         FROM (
           SELECT gt.name AS garage_type, r.garage_id
           FROM rentals r
           JOIN garages g ON g.garage_id = r.garage_id
           JOIN garage_types gt ON gt.type_id = g.type_id
           ${rentalWhere}
           UNION
           SELECT gt.name AS garage_type, r.garage_id
           FROM rental_extensions re
           JOIN rentals r ON r.rental_id = re.rental_id
           JOIN garages g ON g.garage_id = r.garage_id
           JOIN garage_types gt ON gt.type_id = g.type_id
           ${extWhere}
         )
         GROUP BY garage_type`
      )
      .all(...rentalParams, ...extParams);

    const invMap = new Map(inventoryRows.map((r) => [r.garage_type, r]));
    const rentalMap = new Map(rentalAgg.map((r) => [r.garage_type, r]));
    const extMap = new Map(extAgg.map((r) => [r.garage_type, r]));
    const usedMap = new Map(
      garagesUsedAgg.map((r) => [r.garage_type, Number(r.garages_used)])
    );

    const types = filters.garageType
      ? [filters.garageType]
      : Object.values(GARAGE_TYPES);

    const rows = [];
    let totalRentalTx = 0;
    let totalExtTx = 0;
    let totalGaragesUsed = 0;
    let totalRentalRevenue = 0;
    let totalExtensionRevenue = 0;

    for (const type of types) {
      const inv = invMap.get(type);
      const rData = rentalMap.get(type);
      const eData = extMap.get(type);

      const rentalTransactions = rData ? Number(rData.rental_transactions) : 0;
      const extensionTransactions = eData ? Number(eData.extension_transactions) : 0;
      const garagesUsed = usedMap.get(type) || 0;
      const rentalRevenue = roundCurrency(rData ? Number(rData.rental_revenue) : 0);
      const extensionRevenue = roundCurrency(eData ? Number(eData.extension_revenue) : 0);
      const totalRevenue = roundCurrency(rentalRevenue + extensionRevenue);

      totalRentalTx += rentalTransactions;
      totalExtTx += extensionTransactions;
      totalGaragesUsed += garagesUsed;
      totalRentalRevenue = roundCurrency(totalRentalRevenue + rentalRevenue);
      totalExtensionRevenue = roundCurrency(totalExtensionRevenue + extensionRevenue);

      rows.push({
        garageType: type,
        garageTypeLabel: GARAGE_TYPE_LABELS[type] || type,
        totalGarages: inv ? Number(inv.total_garages) : 0,
        availableGarages: inv ? Number(inv.available_garages) : 0,
        currentlyUsedGarages: inv ? Number(inv.used_garages) : 0,
        rentalTransactions,
        extensionTransactions,
        totalTransactions: rentalTransactions + extensionTransactions,
        garagesUsed,
        rentalRevenue,
        extensionRevenue,
        totalRevenue,
      });
    }

    return {
      filters: {
        garageType: filters.garageType || null,
        year: filters.year || null,
        month: filters.month || null,
      },
      summary: {
        rentalTransactions: totalRentalTx,
        extensionTransactions: totalExtTx,
        totalTransactions: totalRentalTx + totalExtTx,
        garagesUsed: totalGaragesUsed,
        rentalRevenue: totalRentalRevenue,
        extensionRevenue: totalExtensionRevenue,
        totalRevenue: roundCurrency(totalRentalRevenue + totalExtensionRevenue),
      },
      rows,
    };
  }

  /**
   * Menghasilkan laporan penyewaan dan pendapatan yang dikelompokkan per penyewa (Tenant)
   * tanpa N+1 query (jumlah garasi unik total dihitung dalam satu query agregasi terpisah).
   *
   * @param {Object} [filters={}] - Filter opsional penyewa.
   * @param {string} [filters.tenantUserId] - UUID penyewa tertentu.
   * @param {string} [filters.search] - Kata kunci pencarian nama lengkap, NIK, atau email.
   * @returns {Object} Baris laporan per penyewa beserta total agregasi.
   */
  getTenantReport(filters = {}) {
    const conditions = [];
    const params = [];

    if (filters.tenantUserId) {
      conditions.push('t.tenant_id = ?');
      params.push(filters.tenantUserId);
    }
    if (filters.search && filters.search.trim() !== '') {
      const pattern = `%${filters.search.trim()}%`;
      conditions.push('(t.full_name LIKE ? OR t.nik LIKE ? OR u.email LIKE ?)');
      params.push(pattern, pattern, pattern);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const tenantRows = this.db
      .prepare(
        `SELECT t.tenant_id, t.nik, t.full_name, t.phone_number, t.is_verified, u.email
         FROM tenants t
         JOIN users u ON u.user_id = t.tenant_id
         ${whereClause}
         ORDER BY t.full_name ASC`
      )
      .all(...params);

    const rentalAgg = this.db
      .prepare(
        `SELECT r.tenant_id,
                COUNT(*) AS rental_transactions,
                COUNT(DISTINCT r.garage_id) AS garages_used,
                SUM(CASE WHEN r.status = ? THEN 1 ELSE 0 END) AS active_rentals,
                COALESCE(SUM(r.total_price), 0) AS rental_revenue
         FROM rentals r
         JOIN tenants t ON t.tenant_id = r.tenant_id
         JOIN users u ON u.user_id = t.tenant_id
         ${whereClause}
         GROUP BY r.tenant_id`
      )
      .all(RENTAL_STATUS.ACTIVE, ...params);

    const extAgg = this.db
      .prepare(
        `SELECT r.tenant_id,
                COUNT(re.rentalext_id) AS extension_transactions,
                COALESCE(SUM(re.extension_fee), 0) AS extension_revenue
         FROM rental_extensions re
         JOIN rentals r ON r.rental_id = re.rental_id
         JOIN tenants t ON t.tenant_id = r.tenant_id
         JOIN users u ON u.user_id = t.tenant_id
         ${whereClause}
         GROUP BY r.tenant_id`
      )
      .all(...params);

    // Hitung total unit garasi unik lintas penyewa yang sesuai filter dalam satu query (tanpa N+1)
    const distinctGaragesRow = this.db
      .prepare(
        `SELECT COUNT(DISTINCT r.garage_id) AS garages_used
         FROM rentals r
         JOIN tenants t ON t.tenant_id = r.tenant_id
         JOIN users u ON u.user_id = t.tenant_id
         ${whereClause}`
      )
      .get(...params);

    const rentalMap = new Map(rentalAgg.map((r) => [r.tenant_id, r]));
    const extMap = new Map(extAgg.map((r) => [r.tenant_id, r]));

    const rows = [];
    let totalRentalTx = 0;
    let totalExtTx = 0;
    let totalRentalRevenue = 0;
    let totalExtensionRevenue = 0;

    for (const t of tenantRows) {
      const rData = rentalMap.get(t.tenant_id);
      const eData = extMap.get(t.tenant_id);

      const rentalTransactions = rData ? Number(rData.rental_transactions) : 0;
      const extensionTransactions = eData ? Number(eData.extension_transactions) : 0;
      const garagesUsed = rData ? Number(rData.garages_used) : 0;
      const activeRentals = rData ? Number(rData.active_rentals) : 0;
      const rentalRevenue = roundCurrency(rData ? Number(rData.rental_revenue) : 0);
      const extensionRevenue = roundCurrency(eData ? Number(eData.extension_revenue) : 0);
      const totalRevenue = roundCurrency(rentalRevenue + extensionRevenue);

      totalRentalTx += rentalTransactions;
      totalExtTx += extensionTransactions;
      totalRentalRevenue = roundCurrency(totalRentalRevenue + rentalRevenue);
      totalExtensionRevenue = roundCurrency(totalExtensionRevenue + extensionRevenue);

      rows.push({
        tenantUserId: t.tenant_id,
        nik: t.nik,
        fullName: t.full_name,
        phone: t.phone_number,
        email: t.email,
        approvalStatus: t.is_verified,
        activeRentals,
        rentalTransactions,
        extensionTransactions,
        totalTransactions: rentalTransactions + extensionTransactions,
        garagesUsed,
        rentalRevenue,
        extensionRevenue,
        totalRevenue,
      });
    }

    return {
      filters: {
        tenantUserId: filters.tenantUserId || null,
        search: filters.search || null,
      },
      summary: {
        rentalTransactions: totalRentalTx,
        extensionTransactions: totalExtTx,
        totalTransactions: totalRentalTx + totalExtTx,
        garagesUsed: Number(distinctGaragesRow ? distinctGaragesRow.garages_used : 0),
        rentalRevenue: totalRentalRevenue,
        extensionRevenue: totalExtensionRevenue,
        totalRevenue: roundCurrency(totalRentalRevenue + totalExtensionRevenue),
      },
      rows,
    };
  }
}

module.exports = ReportRepository;
module.exports.getYearRangeBounds = getYearRangeBounds;
module.exports.getMonthRangeBounds = getMonthRangeBounds;
