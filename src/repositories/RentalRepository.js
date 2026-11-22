/**
 * Repository untuk akses database SQLite pada tabel rentals sesuai ERD 8 tabel
 * dengan penguncian transaksi atomik.
 * @module repositories/RentalRepository
 */

const { Rental, Vehicle, RentalExtension } = require('../models/entities');
const {
  GARAGE_STATUS,
  RENTAL_STATUS,
  ConflictError,
  NotFoundError,
  ValidationError,
} = require('../utils/constants');

/**
 * Lapisan akses data untuk tabel rentals beserta relasi garages, garage_types, tenants, users, dan rental_extensions.
 */
class RentalRepository {
  /**
   * Membuat instance RentalRepository.
   *
   * @param {import('better-sqlite3').Database} db - Koneksi database SQLite aktif.
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Memetakan satu baris hasil join rental beserta daftar perpanjangan menjadi entitas Rental.
   *
   * @param {Object|undefined} row - Baris mentah hasil query join rentals.
   * @param {RentalExtension[]} [extensions=[]] - Daftar entitas perpanjangan terkait.
   * @returns {Rental|null} Entitas domain Rental atau null jika baris kosong.
   */
  mapRentalRow(row, extensions = []) {
    if (!row) {
      return null;
    }
    const vehicle = new Vehicle({
      vehicleType: row.vehicle_type,
      plateNumber: row.plate_number,
      brand: row.brand,
      model: row.model,
      batteryCapacityKwh: row.battery_capacity_kwh,
      currentBatteryPercent: row.current_battery_percent,
    });

    const garage =
      row.garage_type !== undefined
        ? {
            id: row.garage_id,
            typeId: Number(row.garage_type_id),
            garageType: row.garage_type,
            codePrefix: row.garage_code_prefix,
            dailyRate: Number(row.garage_daily_rate),
            electricityRatePerKwh:
              row.garage_electricity_rate !== null &&
              row.garage_electricity_rate !== undefined
                ? Number(row.garage_electricity_rate)
                : null,
            status: row.garage_status,
          }
        : null;

    const tenant =
      row.tenant_full_name !== undefined
        ? {
            userId: row.tenant_id,
            nik: row.tenant_nik,
            fullName: row.tenant_full_name,
            phone: row.tenant_phone,
            email: row.tenant_email,
            approvalStatus: row.tenant_is_verified,
          }
        : null;

    return new Rental({
      id: row.rental_id,
      tenantUserId: row.tenant_id,
      garageId: row.garage_id,
      vehicle,
      rentalType: row.rental_type,
      durationDays: row.duration_days,
      startDate: row.start_date,
      endDate: row.end_date,
      rentalFee: row.rental_fee,
      electricityFee: row.electricity_fee,
      totalAmount: row.total_price,
      paymentProofPath: row.payment_proof,
      status: row.status,
      createdAt: row.created_at,
      garage,
      tenant,
      extensions,
    });
  }

  /**
   * Mengambil seluruh riwayat perpanjangan milik suatu transaksi rental secara kronologis.
   *
   * @param {string} rentalId - UUID transaksi penyewaan (rentals.rental_id).
   * @returns {RentalExtension[]} Array entitas RentalExtension.
   */
  getExtensionsForRental(rentalId) {
    const map = this.getExtensionsMapForRentals([rentalId]);
    return map.get(rentalId) || [];
  }

  /**
   * Mengambil riwayat perpanjangan untuk sekumpulan rental ID dalam satu query batch (`WHERE IN`)
   * guna menghilangkan masalah N+1 query saat menampilkan daftar transaksi penyewaan.
   *
   * @param {string[]} rentalIds - Daftar UUID transaksi penyewaan.
   * @returns {Map<string, RentalExtension[]>} Peta dari rental_id ke daftar RentalExtension kronologis.
   */
  getExtensionsMapForRentals(rentalIds) {
    const map = new Map();
    if (!Array.isArray(rentalIds) || rentalIds.length === 0) {
      return map;
    }

    const placeholders = rentalIds.map(() => '?').join(', ');
    const rows = this.db
      .prepare(
        `SELECT re.rentalext_id, re.rental_id, re.admin_id, a.name AS admin_name,
                re.previous_end_date, re.new_end_date, re.additional_duration_days,
                re.extension_fee, re.payment_proof, re.created_at
         FROM rental_extensions re
         LEFT JOIN admin a ON a.admin_id = re.admin_id
         WHERE re.rental_id IN (${placeholders})
         ORDER BY re.created_at ASC`
      )
      .all(...rentalIds);

    for (const r of rows) {
      const ext = new RentalExtension({
        id: r.rentalext_id,
        rentalId: r.rental_id,
        adminUserId: r.admin_id,
        adminName: r.admin_name,
        previousEndDate: r.previous_end_date,
        newEndDate: r.new_end_date,
        addedDays: r.additional_duration_days,
        extensionAmount: r.extension_fee,
        paymentProofPath: r.payment_proof,
        createdAt: r.created_at,
      });
      if (!map.has(r.rental_id)) {
        map.set(r.rental_id, []);
      }
      map.get(r.rental_id).push(ext);
    }

    return map;
  }

  /**
   * Memetakan sekumpulan baris rental menjadi entitas Rental menggunakan satu query batch perpanjangan.
   *
   * @param {Object[]} rows - Baris hasil query join rentals.
   * @returns {Rental[]} Daftar entitas Rental beserta histori perpanjangannya tanpa N+1 query.
   */
  mapRentalRowsWithExtensions(rows) {
    if (!rows || rows.length === 0) {
      return [];
    }
    const rentalIds = rows.map((row) => row.rental_id);
    const extMap = this.getExtensionsMapForRentals(rentalIds);
    return rows.map((row) =>
      this.mapRentalRow(row, extMap.get(row.rental_id) || [])
    );
  }

  /**
   * Memeriksa apakah suatu garasi memiliki penyewaan aktif yang bertabrakan dengan periode [startDate, endDate].
   *
   * @param {string} garageId - ID garasi.
   * @param {string} startDate - Tanggal mulai periode (YYYY-MM-DD).
   * @param {string} endDate - Tanggal selesai periode (YYYY-MM-DD).
   * @param {string|null} [excludeRentalId=null] - UUID rental yang dikecualikan (opsional).
   * @returns {boolean} True jika terdapat jadwal penyewaan aktif yang bertabrakan.
   */
  hasOverlappingActiveRental(garageId, startDate, endDate, excludeRentalId = null) {
    const row = excludeRentalId
      ? this.db
          .prepare(
            `SELECT rental_id FROM rentals
             WHERE garage_id = ?
               AND status = ?
               AND rental_id != ?
               AND start_date <= ?
               AND end_date >= ?
             LIMIT 1`
          )
          .get(garageId, RENTAL_STATUS.ACTIVE, excludeRentalId, endDate, startDate)
      : this.db
          .prepare(
            `SELECT rental_id FROM rentals
             WHERE garage_id = ?
               AND status = ?
               AND start_date <= ?
               AND end_date >= ?
             LIMIT 1`
          )
          .get(garageId, RENTAL_STATUS.ACTIVE, endDate, startDate);

    return Boolean(row);
  }

  /**
   * Memverifikasi ulang ketersediaan garasi, menyimpan transaksi sewa baru, dan mengubah status garasi
   * menjadi USED secara atomik dalam transaksi SQLite IMMEDIATE guna mencegah double-booking.
   *
   * @param {Object} data - Payload data transaksi penyewaan yang telah tervalidasi.
   * @param {string} todayDate - Tanggal hari ini di Asia/Jakarta (YYYY-MM-DD) untuk sinkronisasi.
   * @returns {Rental} Entitas Rental lengkap yang baru disimpan.
   * @throws {NotFoundError} Jika garasi tujuan tidak ditemukan.
   * @throws {ConflictError} Jika garasi berstatus USED atau memiliki jadwal aktif yang bertabrakan.
   */
  createRentalTransactional(data, todayDate) {
    const createTx = this.db.transaction(() => {
      // Tandai rental yang sudah melewati tanggal selesai menjadi COMPLETED
      this.db
        .prepare(
          `UPDATE rentals
           SET status = ?
           WHERE status = ? AND end_date < ?`
        )
        .run(RENTAL_STATUS.COMPLETED, RENTAL_STATUS.ACTIVE, todayDate);

      const garage = this.db
        .prepare(
          `SELECT g.garage_id, g.type_id, g.status,
                  gt.name AS garage_type, gt.daily_rate, gt.er_per_kwh
           FROM garages g
           JOIN garage_types gt ON gt.type_id = g.type_id
           WHERE g.garage_id = ?`
        )
        .get(data.garageId);

      if (!garage) {
        throw new NotFoundError(`Garasi dengan ID "${data.garageId}" tidak ditemukan.`);
      }

      const activeOverlap = this.hasOverlappingActiveRental(
        data.garageId,
        data.startDate,
        data.endDate
      );

      if (activeOverlap) {
        throw new ConflictError(
          `Garasi ${data.garageId} sedang disewa atau memiliki jadwal penyewaan aktif yang bertabrakan pada periode ${data.startDate} s/d ${data.endDate}.`
        );
      }

      this.db
        .prepare(
          `INSERT INTO rentals (
             rental_id, tenant_id, garage_id, start_date, end_date, duration_days,
             rental_type, vehicle_type, plate_number, brand, model, battery_capacity_kwh,
             current_battery_percent, rental_fee, electricity_fee, total_price,
             payment_proof, status, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          data.id,
          data.tenantUserId,
          data.garageId,
          data.startDate,
          data.endDate,
          data.durationDays,
          data.rentalType,
          data.vehicleType,
          data.plateNumber,
          data.brand,
          data.model,
          data.batteryCapacityKwh,
          data.currentBatteryPercent ?? null,
          data.rentalFee,
          data.electricityFee,
          data.totalAmount,
          data.paymentProofPath,
          RENTAL_STATUS.ACTIVE,
          data.createdAt
        );

      // Ubah status garasi menjadi USED segera jika periode sewa mencakup hari ini
      if (data.startDate <= todayDate && data.endDate >= todayDate) {
        this.db
          .prepare(
            `UPDATE garages
             SET status = ?
             WHERE garage_id = ?`
          )
          .run(GARAGE_STATUS.USED, data.garageId);
      }
    });

    createTx.immediate();
    return this.findById(data.id);
  }

  /**
   * Menyusun klausa dasar SELECT yang menggabungkan tabel rentals, garages, garage_types, tenants, dan users.
   *
   * @returns {string} String SQL SELECT dasar.
   */
  getBaseSelectSql() {
    return `
      SELECT r.*,
             g.type_id AS garage_type_id,
             g.status AS garage_status,
             gt.name AS garage_type,
             gt.code_prefix AS garage_code_prefix,
             gt.daily_rate AS garage_daily_rate,
             gt.er_per_kwh AS garage_electricity_rate,
             t.nik AS tenant_nik,
             t.full_name AS tenant_full_name,
             t.phone_number AS tenant_phone,
             t.is_verified AS tenant_is_verified,
             u.email AS tenant_email
      FROM rentals r
      JOIN garages g ON g.garage_id = r.garage_id
      JOIN garage_types gt ON gt.type_id = g.type_id
      JOIN tenants t ON t.tenant_id = r.tenant_id
      JOIN users u ON u.user_id = t.tenant_id
    `;
  }

  /**
   * Mencari satu transaksi penyewaan berdasarkan ID lengkap dengan info garasi, penyewa, dan perpanjangan.
   *
   * @param {string} rentalId - UUID transaksi penyewaan.
   * @returns {Rental|null} Entitas Rental atau null jika tidak ditemukan.
   */
  findById(rentalId) {
    const row = this.db
      .prepare(`${this.getBaseSelectSql()} WHERE r.rental_id = ?`)
      .get(rentalId);
    if (!row) {
      return null;
    }
    const extensions = this.getExtensionsForRental(rentalId);
    return this.mapRentalRow(row, extensions);
  }

  /**
   * Mengambil seluruh riwayat penyewaan milik seorang penyewa tertentu beserta riwayat perpanjangannya.
   *
   * @param {string} tenantUserId - UUID penyewa (rentals.tenant_id).
   * @returns {Rental[]} Daftar entitas Rental diurutkan dari yang terbaru.
   */
  listByTenant(tenantUserId) {
    const rows = this.db
      .prepare(
        `${this.getBaseSelectSql()}
         WHERE r.tenant_id = ?
         ORDER BY r.created_at DESC`
      )
      .all(tenantUserId);

    return this.mapRentalRowsWithExtensions(rows);
  }

  /**
   * Mengambil seluruh transaksi penyewaan aktif (hari ini hingga jadwal mendatang)
   * diurutkan dari yang aktif hari ini di paling atas sampai tanggal mulai terjauh di paling bawah.
   *
   * @param {string} targetDate - Tanggal acuan hari ini dalam format YYYY-MM-DD (WIB).
   * @returns {Rental[]} Daftar penyewaan aktif terurut dari hari ini hingga terjauh.
   */
  listActiveOnDate(targetDate) {
    const rows = this.db
      .prepare(
        `${this.getBaseSelectSql()}
         WHERE r.status = ?
           AND r.end_date >= ?
         ORDER BY
           CASE WHEN r.start_date <= ? THEN 0 ELSE 1 END ASC,
           r.start_date ASC,
           r.end_date ASC,
           r.garage_id ASC`
      )
      .all(RENTAL_STATUS.ACTIVE, targetDate, targetDate);

    return this.mapRentalRowsWithExtensions(rows);
  }

  /**
   * Mengambil seluruh transaksi penyewaan di sistem dengan filter opsional status dan tipe garasi.
   *
   * @param {Object} [filters={}] - Filter opsional.
   * @param {string} [filters.status] - Filter status transaksi ('ACTIVE' atau 'COMPLETED').
   * @param {string} [filters.garageType] - Filter nama tipe garasi ('BIKE', 'CAR', 'EV').
   * @returns {Rental[]} Daftar entitas Rental diurutkan dari yang terbaru.
   */
  listAll(filters = {}) {
    const conditions = [];
    const params = [];

    if (filters.status) {
      conditions.push('r.status = ?');
      params.push(filters.status);
    }
    if (filters.garageType) {
      conditions.push('gt.name = ?');
      params.push(filters.garageType);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = this.db
      .prepare(
        `${this.getBaseSelectSql()}
         ${whereClause}
         ORDER BY r.created_at DESC`
      )
      .all(...params);

    return this.mapRentalRowsWithExtensions(rows);
  }

  /**
   * Mencatat riwayat perpanjangan sewa baru, mempertahankan previous_end_date di histori,
   * memperbarui end_date pada tabel rentals, dan memastikan bebas bentrok jadwal secara atomik.
   *
   * @param {Object} data - Payload data perpanjangan sewa.
   * @param {string} todayDate - Tanggal hari ini di Asia/Jakarta (YYYY-MM-DD).
   * @returns {RentalExtension} Entitas RentalExtension yang berhasil disimpan.
   * @throws {NotFoundError|ValidationError|ConflictError} Jika rental tidak ditemukan, tidak aktif, atau bentrok jadwal.
   */
  createExtensionTransactional(data, todayDate) {
    const extendTx = this.db.transaction(() => {
      const rental = this.db
        .prepare(
          `SELECT rental_id, garage_id, start_date, end_date, status
           FROM rentals
           WHERE rental_id = ?`
        )
        .get(data.rentalId);

      if (!rental) {
        throw new NotFoundError('Transaksi penyewaan tidak ditemukan.');
      }
      if (
        rental.status !== RENTAL_STATUS.ACTIVE ||
        rental.end_date < todayDate
      ) {
        throw new ValidationError(
          'Hanya penyewaan aktif yang belum berakhir yang dapat diperpanjang.'
        );
      }
      if (rental.end_date !== data.previousEndDate) {
        throw new ConflictError(
          'Tanggal selesai penyewaan telah berubah. Silakan muat ulang data dan coba kembali.'
        );
      }

      const conflict = this.db
        .prepare(
          `SELECT rental_id FROM rentals
           WHERE garage_id = ?
             AND rental_id != ?
             AND status = ?
             AND start_date <= ?
             AND end_date > ?
           LIMIT 1`
        )
        .get(
          rental.garage_id,
          rental.rental_id,
          RENTAL_STATUS.ACTIVE,
          data.newEndDate,
          data.previousEndDate
        );

      if (conflict) {
        throw new ConflictError(
          'Perpanjangan bertabrakan dengan jadwal penyewaan aktif lain pada garasi yang sama.'
        );
      }

      this.db
        .prepare(
          `INSERT INTO rental_extensions (
             rentalext_id, rental_id, admin_id, previous_end_date, new_end_date,
             additional_duration_days, extension_fee, payment_proof, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          data.id,
          data.rentalId,
          data.adminUserId,
          data.previousEndDate,
          data.newEndDate,
          data.addedDays,
          data.extensionAmount,
          data.paymentProofPath,
          data.createdAt
        );

      this.db
        .prepare(`UPDATE rentals SET end_date = ? WHERE rental_id = ?`)
        .run(data.newEndDate, data.rentalId);

      if (rental.start_date <= todayDate && data.newEndDate >= todayDate) {
        this.db
          .prepare(`UPDATE garages SET status = ? WHERE garage_id = ?`)
          .run(GARAGE_STATUS.USED, rental.garage_id);
      }
    });

    extendTx.immediate();

    const row = this.db
      .prepare(
        `SELECT re.*, a.name AS admin_name
         FROM rental_extensions re
         LEFT JOIN admin a ON a.admin_id = re.admin_id
         WHERE re.rentalext_id = ?`
      )
      .get(data.id);

    return new RentalExtension({
      id: row.rentalext_id,
      rentalId: row.rental_id,
      adminUserId: row.admin_id,
      adminName: row.admin_name || null,
      previousEndDate: row.previous_end_date,
      newEndDate: row.new_end_date,
      addedDays: row.additional_duration_days,
      extensionAmount: row.extension_fee,
      paymentProofPath: row.payment_proof,
      createdAt: row.created_at,
    });
  }
}

module.exports = RentalRepository;
