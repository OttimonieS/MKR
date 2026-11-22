/**
 * Titik masuk utama (entry point) server aplikasi yang menginisialisasi SQLite dan menjalankan HTTP server Express.
 * @module server
 */

const { createDatabaseConnection, initializeSchema } = require('./src/database/db');
const { createApp } = require('./src/app');

/**
 * Membuka koneksi database SQLite, memastikan skema terbentuk, dan menjalankan server HTTP pada port terkonfigurasi.
 *
 * @returns {{ server: import('http').Server, db: import('better-sqlite3').Database }} Handle server HTTP dan database aktif.
 */
function startServer() {
  const port = Number(process.env.PORT) || 3000;
  const db = createDatabaseConnection();
  initializeSchema(db);

  const { app } = createApp({ db });

  const server = app.listen(port, () => {
    console.log(
      `[Garage Rental] Server berjalan di http://localhost:${port} (NODE_ENV=${process.env.NODE_ENV || 'development'})`
    );
  });

  /**
   * Menutup server HTTP dan koneksi SQLite secara aman ketika menerima sinyal terminasi OS.
   *
   * @param {string} signal - Nama sinyal terminasi (SIGINT / SIGTERM).
   * @returns {void}
   */
  function shutdown(signal) {
    console.log(`[Garage Rental] Menerima sinyal ${signal}, menutup server...`);
    server.close(() => {
      db.close();
      process.exit(0);
    });
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return { server, db };
}

if (require.main === module) {
  startServer();
}

module.exports = {
  startServer,
};
