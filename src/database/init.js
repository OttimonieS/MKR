/**
 * Skrip CLI untuk menginisialisasi database SQLite 8 tabel (`npm run db:init`).
 * @module database/init
 */

const { createDatabaseConnection, resolveDatabasePath, initializeSchema } = require('./db');

/**
 * Menginisialisasi skema database pada path SQLite yang dikonfigurasi.
 *
 * @param {string} [dbPath] - Path opsional pengganti lokasi file SQLite.
 * @returns {string} Path absolut database yang berhasil diinisialisasi.
 */
function runDbInit(dbPath) {
  const resolved = resolveDatabasePath(dbPath);
  const db = createDatabaseConnection(resolved);
  try {
    initializeSchema(db);
    return resolved;
  } finally {
    db.close();
  }
}

if (require.main === module) {
  console.log(`[db:init] Skema database berhasil diinisialisasi di: ${runDbInit()}`);
}

module.exports = { runDbInit };
