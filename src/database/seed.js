/**
 * Seeder database untuk membuat akun Admin bawaan secara idempoten (`npm run db:seed`).
 * @module database/seed
 */

require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { createDatabaseConnection, resolveDatabasePath, initializeSchema } = require('./db');
const { USER_ROLES } = require('../utils/constants');
const { getJakartaTimestamp } = require('../utils/rentalMath');

/**
 * Membuat akun Admin awal secara idempoten pada tabel users dan admin.
 *
 * @param {import('better-sqlite3').Database} db - Koneksi database SQLite aktif.
 * @param {Object} [options={}] - Opsi pengganti kredensial Admin bawaan.
 * @returns {{ created: boolean, admin: { id: string, email: string, fullName: string } }} Hasil seeding Admin.
 */
function seedAdmin(db, options = {}) {
  const email = (options.email || process.env.SEED_ADMIN_EMAIL || 'admin@garagerental.com')
    .trim()
    .toLowerCase();
  const password = options.password || process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
  const fullName = (options.fullName || process.env.SEED_ADMIN_NAME || 'Administrator Utama').trim();

  const existing = db
    .prepare(
      `SELECT u.user_id, u.email, a.name
       FROM users u JOIN admin a ON a.admin_id = u.user_id
       WHERE u.email = ?`
    )
    .get(email);

  if (existing) {
    return {
      created: false,
      admin: { id: existing.user_id, email: existing.email, fullName: existing.name },
    };
  }

  const userId = crypto.randomUUID();
  const passwordHash = bcrypt.hashSync(password, 10);
  const createdAt = getJakartaTimestamp();

  db.transaction(() => {
    db.prepare(
      `INSERT INTO users (user_id, email, password, role, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(userId, email, passwordHash, USER_ROLES.ADMIN, createdAt);
    db.prepare(`INSERT INTO admin (admin_id, name) VALUES (?, ?)`).run(userId, fullName);
  })();

  return { created: true, admin: { id: userId, email, fullName } };
}

/**
 * Menjalankan inisialisasi skema sekaligus seeding akun Admin bawaan pada database terkonfigurasi.
 *
 * @param {string} [dbPath] - Path opsional pengganti lokasi file SQLite.
 * @returns {{ dbPath: string, created: boolean, admin: { id: string, email: string, fullName: string } }} Hasil eksekusi seeder.
 */
function runDbSeed(dbPath) {
  const resolved = resolveDatabasePath(dbPath);
  const db = createDatabaseConnection(resolved);
  try {
    initializeSchema(db);
    return { dbPath: resolved, ...seedAdmin(db) };
  } finally {
    db.close();
  }
}

if (require.main === module) {
  const result = runDbSeed();
  console.log(
    result.created
      ? `[db:seed] Akun Admin berhasil dibuat: ${result.admin.email} (${result.admin.fullName})`
      : `[db:seed] Akun Admin sudah terdaftar: ${result.admin.email}`
  );
}

module.exports = { seedAdmin, runDbSeed };
