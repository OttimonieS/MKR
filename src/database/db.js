/**
 * Modul koneksi SQLite (`better-sqlite3`) dan inisialisasi skema 8 tabel relasional sesuai ERD.
 * @module database/db
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const {
  GARAGE_TYPES,
  GARAGE_TYPE_IDS,
  GARAGE_TYPE_PREFIX,
} = require('../utils/constants');

/**
 * Menentukan path file database SQLite dari argumen, environment `DB_PATH`, atau default.
 *
 * @param {string} [customPath] - Path eksplisit file SQLite atau ':memory:'.
 * @returns {string} Path absolut file database atau ':memory:'.
 */
function resolveDatabasePath(customPath) {
  const target = customPath || process.env.DB_PATH || './data/garage-rental.db';
  return target === ':memory:' ? target : path.resolve(process.cwd(), target);
}

/**
 * Membuka koneksi database better-sqlite3, mengaktifkan `PRAGMA foreign_keys = ON`,
 * serta mode WAL untuk database berbasis file.
 *
 * @param {string} [dbPath] - Path file SQLite atau ':memory:'.
 * @returns {import('better-sqlite3').Database} Instance koneksi SQLite aktif.
 */
function createDatabaseConnection(dbPath) {
  const resolvedPath = resolveDatabasePath(dbPath);
  if (resolvedPath !== ':memory:') {
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  }
  const db = new Database(resolvedPath);
  db.pragma('foreign_keys = ON');
  if (resolvedPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }
  return db;
}

/**
 * Membuat seluruh 8 tabel relasional sesuai ERD (users, admin, tenants, garage_types,
 * garage_sequences, garages, rentals, rental_extensions), constraint PK/FK/UNIQUE/CHECK,
 * index pencarian, serta baris awal tabel garage_types dan garage_sequences.
 *
 * @param {import('better-sqlite3').Database} db - Koneksi SQLite aktif.
 * @returns {void}
 */
function initializeSchema(db) {
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('ADMIN', 'TENANT')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin (
      admin_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tenants (
      tenant_id TEXT PRIMARY KEY,
      nik TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      is_verified TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (is_verified IN ('PENDING', 'APPROVED', 'REJECTED')),
      FOREIGN KEY (tenant_id) REFERENCES users(user_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS garage_types (
      type_id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE CHECK (name IN ('BIKE', 'CAR', 'EV')),
      code_prefix TEXT NOT NULL UNIQUE CHECK (code_prefix IN ('S', 'C', 'E')),
      daily_rate INTEGER NOT NULL DEFAULT 0 CHECK (daily_rate >= 0),
      er_per_kwh INTEGER CHECK (
        (name = 'EV' AND (er_per_kwh IS NULL OR er_per_kwh > 0))
        OR (name != 'EV' AND er_per_kwh IS NULL)
      )
    );

    CREATE TABLE IF NOT EXISTS garage_sequences (
      type_id INTEGER PRIMARY KEY,
      last_num INTEGER NOT NULL DEFAULT 0 CHECK (last_num >= 0 AND last_num <= 999),
      FOREIGN KEY (type_id) REFERENCES garage_types(type_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS garages (
      garage_id TEXT PRIMARY KEY,
      type_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'USED')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (type_id) REFERENCES garage_types(type_id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS rentals (
      rental_id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      garage_id TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL CHECK (end_date >= start_date),
      duration_days INTEGER NOT NULL CHECK (duration_days >= 1 AND duration_days <= 31),
      rental_type TEXT NOT NULL CHECK (rental_type IN ('DAILY', 'MONTHLY')),
      vehicle_type TEXT NOT NULL
        CHECK (vehicle_type IN ('BICYCLE', 'MOTORCYCLE', 'CAR', 'ELECTRIC_CAR')),
      plate_number TEXT CHECK (
        (vehicle_type = 'BICYCLE')
        OR (plate_number IS NOT NULL AND length(trim(plate_number)) > 0)
      ),
      brand TEXT NOT NULL CHECK (length(trim(brand)) > 0),
      model TEXT NOT NULL CHECK (length(trim(model)) > 0),
      battery_capacity_kwh REAL CHECK (
        (vehicle_type = 'ELECTRIC_CAR' AND battery_capacity_kwh IS NOT NULL AND battery_capacity_kwh > 0)
        OR (vehicle_type != 'ELECTRIC_CAR' AND battery_capacity_kwh IS NULL)
      ),
      current_battery_percent REAL CHECK (
        current_battery_percent IS NULL
        OR (current_battery_percent >= 0 AND current_battery_percent <= 100)
      ),
      rental_fee INTEGER NOT NULL CHECK (rental_fee >= 0),
      electricity_fee INTEGER NOT NULL DEFAULT 0 CHECK (electricity_fee >= 0),
      total_price INTEGER NOT NULL CHECK (total_price >= 0),
      payment_proof TEXT NOT NULL CHECK (length(trim(payment_proof)) > 0),
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
      FOREIGN KEY (garage_id) REFERENCES garages(garage_id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS rental_extensions (
      rentalext_id TEXT PRIMARY KEY,
      rental_id TEXT NOT NULL,
      admin_id TEXT NOT NULL,
      previous_end_date TEXT NOT NULL,
      new_end_date TEXT NOT NULL CHECK (new_end_date > previous_end_date),
      additional_duration_days INTEGER NOT NULL CHECK (additional_duration_days > 0),
      extension_fee INTEGER NOT NULL CHECK (extension_fee >= 0),
      payment_proof TEXT NOT NULL CHECK (length(trim(payment_proof)) > 0),
      created_at TEXT NOT NULL,
      FOREIGN KEY (rental_id) REFERENCES rentals(rental_id) ON DELETE RESTRICT,
      FOREIGN KEY (admin_id) REFERENCES admin(admin_id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_tenants_is_verified ON tenants(is_verified);
    CREATE INDEX IF NOT EXISTS idx_garages_type_status ON garages(type_id, status);
    CREATE INDEX IF NOT EXISTS idx_rentals_tenant ON rentals(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_rentals_garage_status ON rentals(garage_id, status);
    CREATE INDEX IF NOT EXISTS idx_rentals_dates ON rentals(start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);
    CREATE INDEX IF NOT EXISTS idx_extensions_rental ON rental_extensions(rental_id);
    CREATE INDEX IF NOT EXISTS idx_extensions_admin ON rental_extensions(admin_id);
    CREATE INDEX IF NOT EXISTS idx_extensions_created_at ON rental_extensions(created_at);
  `);

  // Migrasi ringan untuk database lama yang belum memiliki kolom current_battery_percent
  const rentalColumns = db.pragma('table_info(rentals)');
  if (!rentalColumns.some((c) => c.name === 'current_battery_percent')) {
    db.exec('ALTER TABLE rentals ADD COLUMN current_battery_percent REAL');
  }

  const seedType = db.prepare(
    `INSERT OR IGNORE INTO garage_types (type_id, name, code_prefix, daily_rate, er_per_kwh)
     VALUES (?, ?, ?, 0, NULL)`
  );
  const seedSeq = db.prepare(
    `INSERT OR IGNORE INTO garage_sequences (type_id, last_num) VALUES (?, 0)`
  );

  db.transaction(() => {
    for (const typeName of Object.values(GARAGE_TYPES)) {
      const typeId = GARAGE_TYPE_IDS[typeName];
      seedType.run(typeId, typeName, GARAGE_TYPE_PREFIX[typeName]);
      seedSeq.run(typeId);
    }
  })();
}

module.exports = {
  resolveDatabasePath,
  createDatabaseConnection,
  initializeSchema,
};
