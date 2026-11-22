/**
 * Repository untuk akses database SQLite pada tabel users, tenants, dan admin sesuai ERD 8 tabel.
 * @module repositories/UserRepository
 */

const { Tenant, Admin } = require('../models/entities');
const { USER_ROLES } = require('../utils/constants');

/**
 * Lapisan akses data (Repository) untuk tabel users, tenants, dan admin.
 */
class UserRepository {
  /**
   * Membuat instance UserRepository.
   *
   * @param {import('better-sqlite3').Database} db - Koneksi database SQLite yang aktif.
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Memetakan satu baris hasil query join SQLite menjadi entitas domain Admin atau Tenant.
   *
   * @param {Object|undefined} row - Baris mentah SQLite hasil join tabel users, admin, dan tenants.
   * @returns {Admin|Tenant|null} Entitas domain Admin/Tenant atau null jika baris tidak ditemukan.
   */
  mapUserRow(row) {
    if (!row) {
      return null;
    }
    if (row.role === USER_ROLES.ADMIN) {
      return new Admin({
        id: row.user_id,
        email: row.email,
        fullName: row.admin_name,
        createdAt: row.created_at,
        passwordHash: row.password,
      });
    }
    return new Tenant({
      id: row.user_id,
      email: row.email,
      createdAt: row.created_at,
      nik: row.nik,
      fullName: row.tenant_full_name,
      phone: row.phone_number,
      approvalStatus: row.is_verified,
      passwordHash: row.password,
    });
  }

  /**
   * Mencari pengguna (Admin atau Tenant) berdasarkan UUID unik pengguna (users.user_id).
   *
   * @param {string} userId - UUID pengguna.
   * @returns {Admin|Tenant|null} Entitas pengguna atau null jika tidak ditemukan.
   */
  findById(userId) {
    const row = this.db
      .prepare(
        `SELECT u.user_id, u.email, u.password, u.role, u.created_at,
                a.name AS admin_name,
                t.nik, t.full_name AS tenant_full_name, t.phone_number, t.is_verified
         FROM users u
         LEFT JOIN admin a ON a.admin_id = u.user_id
         LEFT JOIN tenants t ON t.tenant_id = u.user_id
         WHERE u.user_id = ?`
      )
      .get(userId);
    return this.mapUserRow(row);
  }

  /**
   * Mencari pengguna (Admin atau Tenant) berdasarkan alamat email (case-insensitive).
   *
   * @param {string} email - Alamat email pengguna.
   * @returns {Admin|Tenant|null} Entitas pengguna atau null jika tidak ditemukan.
   */
  findByEmail(email) {
    const row = this.db
      .prepare(
        `SELECT u.user_id, u.email, u.password, u.role, u.created_at,
                a.name AS admin_name,
                t.nik, t.full_name AS tenant_full_name, t.phone_number, t.is_verified
         FROM users u
         LEFT JOIN admin a ON a.admin_id = u.user_id
         LEFT JOIN tenants t ON t.tenant_id = u.user_id
         WHERE lower(u.email) = lower(?)`
      )
      .get(email);
    return this.mapUserRow(row);
  }

  /**
   * Mencari penyewa (Tenant) berdasarkan nomor NIK 16 digit yang unik.
   *
   * @param {string} nik - NIK 16 digit penyewa.
   * @returns {Tenant|null} Entitas Tenant atau null jika tidak ditemukan.
   */
  findTenantByNik(nik) {
    const row = this.db
      .prepare(
        `SELECT u.user_id, u.email, u.password, u.role, u.created_at,
                t.nik, t.full_name AS tenant_full_name, t.phone_number, t.is_verified
         FROM tenants t
         JOIN users u ON u.user_id = t.tenant_id
         WHERE t.nik = ?`
      )
      .get(nik);
    return this.mapUserRow(row);
  }

  /**
   * Mencari penyewa (Tenant) berdasarkan UUID penyewa (tenants.tenant_id).
   *
   * @param {string} userId - UUID penyewa.
   * @returns {Tenant|null} Entitas Tenant atau null jika tidak ditemukan.
   */
  findTenantByUserId(userId) {
    const row = this.db
      .prepare(
        `SELECT u.user_id, u.email, u.password, u.role, u.created_at,
                t.nik, t.full_name AS tenant_full_name, t.phone_number, t.is_verified
         FROM tenants t
         JOIN users u ON u.user_id = t.tenant_id
         WHERE t.tenant_id = ?`
      )
      .get(userId);
    return this.mapUserRow(row);
  }

  /**
   * Menyimpan data akun user dan profil tenant baru secara atomik di dalam satu transaksi SQLite.
   *
   * @param {Object} data - Payload penyimpanan penyewa baru.
   * @param {string} data.id - UUID pengguna baru.
   * @param {string} data.email - Email ternormalisasi huruf kecil.
   * @param {string} data.passwordHash - Password akun pengguna.
   * @param {string} data.nik - NIK 16 digit.
   * @param {string} data.fullName - Nama lengkap penyewa.
   * @param {string} data.phone - Nomor telepon penyewa.
   * @param {string} data.approvalStatus - Status awal ('PENDING').
   * @param {string} data.createdAt - Timestamp pembuatan dalam zona Asia/Jakarta.
   * @returns {Tenant} Entitas Tenant yang berhasil disimpan.
   * @throws {Error} Jika melanggar constraint UNIQUE atau CHECK pada SQLite.
   */
  createTenantUser(data) {
    const insertTx = this.db.transaction((payload) => {
      this.db
        .prepare(
          `INSERT INTO users (user_id, email, password, role, created_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(
          payload.id,
          payload.email,
          payload.passwordHash,
          USER_ROLES.TENANT,
          payload.createdAt
        );

      this.db
        .prepare(
          `INSERT INTO tenants (tenant_id, nik, full_name, phone_number, is_verified)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(
          payload.id,
          payload.nik,
          payload.fullName,
          payload.phone,
          payload.approvalStatus
        );
    });

    insertTx(data);
    return this.findTenantByUserId(data.id);
  }

  /**
   * Mengambil daftar seluruh penyewa terdaftar dengan filter status verifikasi dan kata kunci pencarian.
   *
   * @param {Object} [filters={}] - Filter opsional query penyewa.
   * @param {string} [filters.status] - Filter status ('PENDING', 'APPROVED', 'REJECTED').
   * @param {string} [filters.search] - Kata kunci pencarian pada nama, NIK, email, atau nomor telepon.
   * @returns {Tenant[]} Daftar entitas Tenant diurutkan dari pendaftar terbaru.
   */
  listTenants(filters = {}) {
    const conditions = [];
    const params = [];

    if (filters.status) {
      conditions.push('t.is_verified = ?');
      params.push(filters.status);
    }

    if (filters.search && filters.search.trim() !== '') {
      const pattern = `%${filters.search.trim()}%`;
      conditions.push(
        '(t.full_name LIKE ? OR t.nik LIKE ? OR u.email LIKE ? OR t.phone_number LIKE ?)'
      );
      params.push(pattern, pattern, pattern, pattern);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = this.db
      .prepare(
        `SELECT u.user_id, u.email, u.password, u.role, u.created_at,
                t.nik, t.full_name AS tenant_full_name, t.phone_number, t.is_verified
         FROM tenants t
         JOIN users u ON u.user_id = t.tenant_id
         ${whereClause}
         ORDER BY u.created_at DESC`
      )
      .all(...params);

    return rows.map((row) => this.mapUserRow(row));
  }

  /**
   * Memperbarui status verifikasi KTP/NIK penyewa (tenants.is_verified) di database.
   *
   * @param {string} userId - UUID penyewa target.
   * @param {string} approvalStatus - Status baru ('APPROVED' atau 'REJECTED').
   * @returns {Tenant|null} Entitas Tenant terbarui atau null jika penyewa tidak ditemukan.
   */
  updateTenantApprovalStatus(userId, approvalStatus) {
    const info = this.db
      .prepare(
        `UPDATE tenants
         SET is_verified = ?
         WHERE tenant_id = ?`
      )
      .run(approvalStatus, userId);

    if (info.changes === 0) {
      return null;
    }
    return this.findTenantByUserId(userId);
  }
}

module.exports = UserRepository;
