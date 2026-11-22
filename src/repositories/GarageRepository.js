/**
 * Repository untuk akses database SQLite pada tabel garage_types, garage_sequences, garages,
 * dan sinkronisasi status operasional garasi sesuai ERD 8 tabel.
 * @module repositories/GarageRepository
 */

const { Garage, GarageSequence, GarageTypeConfig } = require('../models/entities');
const {
  GARAGE_STATUS,
  RENTAL_STATUS,
  MAX_GARAGES_PER_TYPE,
  ValidationError,
} = require('../utils/constants');

/**
 * Lapisan akses data untuk tabel garage_types, garage_sequences, dan garages.
 */
class GarageRepository {
  /**
   * Membuat instance GarageRepository.
   *
   * @param {import('better-sqlite3').Database} db - Koneksi database SQLite aktif.
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Memetakan satu baris join garages + garage_types menjadi entitas domain Garage.
   *
   * @param {Object|undefined} row - Baris mentah hasil join garages dan garage_types.
   * @returns {Garage|null} Entitas Garage atau null jika baris kosong.
   */
  mapGarageRow(row) {
    if (!row) {
      return null;
    }
    return new Garage({
      id: row.garage_id,
      typeId: row.type_id,
      garageType: row.garage_type,
      codePrefix: row.code_prefix,
      dailyRate: row.daily_rate,
      electricityRatePerKwh: row.er_per_kwh,
      status: row.status,
      createdAt: row.created_at,
    });
  }

  /**
   * Mengambil seluruh konfigurasi tipe garasi dari tabel garage_types.
   *
   * @returns {GarageTypeConfig[]} Daftar entitas GarageTypeConfig diurutkan berdasarkan type_id.
   */
  getAllGarageTypes() {
    const rows = this.db
      .prepare(
        `SELECT type_id, name, code_prefix, daily_rate, er_per_kwh
         FROM garage_types
         ORDER BY type_id ASC`
      )
      .all();

    return rows.map(
      (row) =>
        new GarageTypeConfig({
          typeId: row.type_id,
          name: row.name,
          codePrefix: row.code_prefix,
          dailyRate: row.daily_rate,
          erPerKwh: row.er_per_kwh,
        })
    );
  }

  /**
   * Mengambil entitas counter urutan (GarageSequence) untuk satu nama tipe garasi ('BIKE', 'CAR', 'EV').
   *
   * @param {string} garageType - Nama tipe garasi pada tabel garage_types.
   * @returns {GarageSequence|null} Entitas GarageSequence atau null jika tidak ditemukan.
   */
  getSequence(garageType) {
    const row = this.db
      .prepare(
        `SELECT gt.type_id, gt.name AS garage_type, gs.last_num
         FROM garage_types gt
         JOIN garage_sequences gs ON gs.type_id = gt.type_id
         WHERE gt.name = ?`
      )
      .get(garageType);

    if (!row) {
      return null;
    }
    return new GarageSequence({
      typeId: row.type_id,
      garageType: row.garage_type,
      lastNumber: row.last_num,
    });
  }

  /**
   * Mengambil seluruh counter urutan garasi beserta tarif terkini dan sisa kapasitas dari batas 999 unit per tipe.
   *
   * @returns {Array<{
   *   typeId: number,
   *   garageType: string,
   *   codePrefix: string,
   *   dailyRate: number,
   *   erPerKwh: number|null,
   *   lastNumber: number,
   *   remainingCapacity: number
   * }>} Ringkasan urutan dan tarif per tipe garasi.
   */
  getAllSequences() {
    const rows = this.db
      .prepare(
        `SELECT gt.type_id, gt.name AS garage_type, gt.code_prefix,
                gt.daily_rate, gt.er_per_kwh, gs.last_num
         FROM garage_types gt
         JOIN garage_sequences gs ON gs.type_id = gt.type_id
         ORDER BY gt.type_id ASC`
      )
      .all();

    return rows.map((row) => ({
      typeId: Number(row.type_id),
      garageType: row.garage_type,
      codePrefix: row.code_prefix,
      dailyRate: Number(row.daily_rate),
      erPerKwh: row.er_per_kwh !== null ? Number(row.er_per_kwh) : null,
      lastNumber: Number(row.last_num),
      remainingCapacity: MAX_GARAGES_PER_TYPE - Number(row.last_num),
    }));
  }

  /**
   * Memperbarui tarif pada tabel garage_types, menaikkan garage_sequences.last_num, dan menyisipkan
   * sekumpulan unit garasi ke tabel garages secara atomik dalam transaksi SQLite IMMEDIATE.
   *
   * @param {Object} params - Parameter pembuatan garasi massal.
   * @param {string} params.garageType - Nama tipe garasi ('BIKE', 'CAR', 'EV').
   * @param {number} params.quantity - Jumlah unit garasi yang akan dibuat.
   * @param {number} params.dailyRate - Harga sewa harian untuk tipe garasi tersebut.
   * @param {number|null} params.electricityRatePerKwh - Tarif listrik per kWh (khusus EV).
   * @param {string} params.createdAt - Timestamp pembuatan (ISO-8601 WIB).
   * @returns {Garage[]} Daftar entitas Garage yang berhasil dibuat.
   * @throws {ValidationError} Jika tipe garasi tidak ditemukan atau total unit melebihi 999 per tipe.
   */
  createGarageBatch({
    garageType,
    quantity,
    dailyRate,
    electricityRatePerKwh,
    createdAt,
  }) {
    const insertBatchTx = this.db.transaction(() => {
      const typeRow = this.db
        .prepare(
          `SELECT gt.type_id, gt.name, gt.code_prefix, gs.last_num
           FROM garage_types gt
           JOIN garage_sequences gs ON gs.type_id = gt.type_id
           WHERE gt.name = ?`
        )
        .get(garageType);

      if (!typeRow) {
        throw new ValidationError(`Tipe garasi "${garageType}" tidak ditemukan pada tabel garage_types.`);
      }

      const sequence = new GarageSequence({
        typeId: typeRow.type_id,
        garageType: typeRow.name,
        lastNumber: typeRow.last_num,
      });

      const remaining = MAX_GARAGES_PER_TYPE - sequence.lastNumber;
      if (quantity > remaining) {
        throw new ValidationError(
          `Jumlah melebihi kapasitas maksimum (${MAX_GARAGES_PER_TYPE}) untuk tipe ${garageType}. Sisa kapasitas yang dapat dibuat: ${remaining}.`
        );
      }

      // Perbarui tarif harian dan tarif listrik/kWh pada tabel master garage_types
      this.db
        .prepare(
          `UPDATE garage_types
           SET daily_rate = ?, er_per_kwh = ?
           WHERE type_id = ?`
        )
        .run(dailyRate, electricityRatePerKwh, typeRow.type_id);

      const insertStmt = this.db.prepare(
        `INSERT INTO garages (garage_id, type_id, status, created_at)
         VALUES (?, ?, ?, ?)`
      );

      const createdGarages = [];
      for (let i = 0; i < quantity; i += 1) {
        const nextId = sequence.generateNextId();
        insertStmt.run(
          nextId,
          typeRow.type_id,
          GARAGE_STATUS.AVAILABLE,
          createdAt
        );
        createdGarages.push(
          new Garage({
            id: nextId,
            typeId: typeRow.type_id,
            garageType: typeRow.name,
            codePrefix: typeRow.code_prefix,
            dailyRate,
            electricityRatePerKwh,
            status: GARAGE_STATUS.AVAILABLE,
            createdAt,
          })
        );
      }

      this.db
        .prepare(
          `UPDATE garage_sequences
           SET last_num = ?
           WHERE type_id = ?`
        )
        .run(sequence.lastNumber, typeRow.type_id);

      return createdGarages;
    });

    return insertBatchTx.immediate();
  }

  /**
   * Memeriksa secara read-only (tanpa write lock) apakah terdapat transaksi rental kedaluwarsa
   * atau status garasi yang tidak sinkron terhadap todayDate.
   *
   * @param {string} todayDate - Tanggal hari ini pada zona Asia/Jakarta (YYYY-MM-DD).
   * @returns {boolean} True jika diperlukan pembaruan status, false jika database sudah sinkron.
   */
  needsStatusSync(todayDate) {
    const staleCheck = this.db
      .prepare(
        `SELECT (
           EXISTS (
             SELECT 1 FROM rentals
             WHERE status = ? AND end_date < ?
           )
           OR EXISTS (
             SELECT 1 FROM garages g
             WHERE g.status = ?
               AND EXISTS (
                 SELECT 1 FROM rentals r
                 WHERE r.garage_id = g.garage_id
                   AND r.status = ?
                   AND r.start_date <= ?
                   AND r.end_date >= ?
               )
           )
           OR EXISTS (
             SELECT 1 FROM garages g
             WHERE g.status = ?
               AND NOT EXISTS (
                 SELECT 1 FROM rentals r
                 WHERE r.garage_id = g.garage_id
                   AND r.status = ?
                   AND r.start_date <= ?
                   AND r.end_date >= ?
               )
           )
         ) AS needs_sync`
      )
      .get(
        RENTAL_STATUS.ACTIVE,
        todayDate,
        GARAGE_STATUS.AVAILABLE,
        RENTAL_STATUS.ACTIVE,
        todayDate,
        todayDate,
        GARAGE_STATUS.USED,
        RENTAL_STATUS.ACTIVE,
        todayDate,
        todayDate
      );

    return Boolean(staleCheck && staleCheck.needs_sync);
  }

  /**
   * Menyinkronkan status rental yang telah berakhir menjadi COMPLETED dan menyelaraskan status
   * AVAILABLE/USED setiap garasi berdasarkan tanggal hari ini (Asia/Jakarta) dan data rental aktual.
   * Melakukan pre-check read-only terlebih dahulu sehingga operasi GET tidak mengambil write lock
   * apabila seluruh status sudah sinkron.
   *
   * @param {string} todayDate - Tanggal hari ini pada zona Asia/Jakarta (YYYY-MM-DD).
   * @returns {{ skipped: boolean, completedRentals: number, updatedToAvailable: number, updatedToUsed: number }} Jumlah baris yang diperbarui.
   */
  syncStatuses(todayDate) {
    if (!this.needsStatusSync(todayDate)) {
      return {
        skipped: true,
        completedRentals: 0,
        updatedToUsed: 0,
        updatedToAvailable: 0,
      };
    }

    const syncTx = this.db.transaction((currentDate) => {
      const completedInfo = this.db
        .prepare(
          `UPDATE rentals
           SET status = ?
           WHERE status = ? AND end_date < ?`
        )
        .run(RENTAL_STATUS.COMPLETED, RENTAL_STATUS.ACTIVE, currentDate);

      const toUsedInfo = this.db
        .prepare(
          `UPDATE garages
           SET status = ?
           WHERE status != ?
             AND EXISTS (
               SELECT 1 FROM rentals r
               WHERE r.garage_id = garages.garage_id
                 AND r.status = ?
                 AND r.start_date <= ?
                 AND r.end_date >= ?
             )`
        )
        .run(
          GARAGE_STATUS.USED,
          GARAGE_STATUS.USED,
          RENTAL_STATUS.ACTIVE,
          currentDate,
          currentDate
        );

      const toAvailableInfo = this.db
        .prepare(
          `UPDATE garages
           SET status = ?
           WHERE status != ?
             AND NOT EXISTS (
               SELECT 1 FROM rentals r
               WHERE r.garage_id = garages.garage_id
                 AND r.status = ?
                 AND r.start_date <= ?
                 AND r.end_date >= ?
             )`
        )
        .run(
          GARAGE_STATUS.AVAILABLE,
          GARAGE_STATUS.AVAILABLE,
          RENTAL_STATUS.ACTIVE,
          currentDate,
          currentDate
        );

      return {
        skipped: false,
        completedRentals: completedInfo.changes,
        updatedToUsed: toUsedInfo.changes,
        updatedToAvailable: toAvailableInfo.changes,
      };
    });

    return syncTx.immediate(todayDate);
  }

  /**
   * Mencari satu unit garasi berdasarkan ID garasi (garages.garage_id) beserta tarif dari garage_types.
   *
   * @param {string} garageId - ID garasi (contoh: S001, C010, E002).
   * @returns {Garage|null} Entitas Garage atau null jika tidak ditemukan.
   */
  findById(garageId) {
    const row = this.db
      .prepare(
        `SELECT g.garage_id, g.type_id, g.status, g.created_at,
                gt.name AS garage_type, gt.code_prefix, gt.daily_rate, gt.er_per_kwh
         FROM garages g
         JOIN garage_types gt ON gt.type_id = g.type_id
         WHERE g.garage_id = ?`
      )
      .get(garageId);
    return this.mapGarageRow(row);
  }

  /**
   * Menampilkan daftar garasi dengan filter opsional tipe garasi, status, dan pencarian ID.
   *
   * @param {Object} [filters={}] - Kriteria filter opsional.
   * @param {string} [filters.garageType] - Filter berdasarkan garage_types.name ('BIKE', 'CAR', 'EV').
   * @param {string} [filters.status] - Filter berdasarkan status ('AVAILABLE' atau 'USED').
   * @param {string} [filters.search] - Filter pencarian potongan ID garasi.
   * @returns {Garage[]} Daftar entitas Garage yang cocok, diurutkan berdasarkan tipe dan ID.
   */
  listGarages(filters = {}) {
    const conditions = [];
    const params = [];

    if (filters.garageType) {
      conditions.push('gt.name = ?');
      params.push(filters.garageType);
    }
    if (filters.status) {
      conditions.push('g.status = ?');
      params.push(filters.status);
    }
    if (filters.search && filters.search.trim() !== '') {
      conditions.push('g.garage_id LIKE ?');
      params.push(`%${filters.search.trim().toUpperCase()}%`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = this.db
      .prepare(
        `SELECT g.garage_id, g.type_id, g.status, g.created_at,
                gt.name AS garage_type, gt.code_prefix, gt.daily_rate, gt.er_per_kwh
         FROM garages g
         JOIN garage_types gt ON gt.type_id = g.type_id
         ${whereClause}
         ORDER BY g.type_id ASC, g.garage_id ASC`
      )
      .all(...params);

    return rows.map((row) => this.mapGarageRow(row));
  }

  /**
   * Mencari seluruh garasi yang kompatibel dan bebas dari jadwal rental aktif
   * yang bertabrakan sepanjang periode [startDate, endDate] (baik mulai hari ini maupun tanggal mendatang).
   *
   * @param {string[]} allowedGarageTypes - Daftar nama tipe garasi kompatibel ('BIKE', 'CAR', 'EV').
   * @param {string} startDate - Tanggal mulai rencana sewa (YYYY-MM-DD).
   * @param {string} endDate - Tanggal selesai rencana sewa (YYYY-MM-DD).
   * @returns {Garage[]} Daftar garasi kompatibel yang tersedia untuk periode tersebut.
   */
  findAvailableForPeriod(allowedGarageTypes, startDate, endDate) {
    if (!Array.isArray(allowedGarageTypes) || allowedGarageTypes.length === 0) {
      return [];
    }
    const placeholders = allowedGarageTypes.map(() => '?').join(', ');
    const rows = this.db
      .prepare(
        `SELECT g.garage_id, g.type_id, g.status, g.created_at,
                gt.name AS garage_type, gt.code_prefix, gt.daily_rate, gt.er_per_kwh
         FROM garages g
         JOIN garage_types gt ON gt.type_id = g.type_id
         WHERE gt.name IN (${placeholders})
           AND NOT EXISTS (
             SELECT 1 FROM rentals r
             WHERE r.garage_id = g.garage_id
               AND r.status = ?
               AND r.start_date <= ?
               AND r.end_date >= ?
           )
         ORDER BY g.type_id ASC, g.garage_id ASC`
      )
      .all(
        ...allowedGarageTypes,
        RENTAL_STATUS.ACTIVE,
        endDate,
        startDate
      );

    return rows.map((row) => this.mapGarageRow(row));
  }
}

module.exports = GarageRepository;
