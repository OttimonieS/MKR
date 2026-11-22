/**
 * Composition root aplikasi Express yang merangkai repository, service, controller,
 * middleware keamanan, rute REST API, serta penyajian aset statis frontend desktop.
 * @module app
 */

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { initializeSchema } = require('./database/db');
const UserRepository = require('./repositories/UserRepository');
const GarageRepository = require('./repositories/GarageRepository');
const RentalRepository = require('./repositories/RentalRepository');
const ReportRepository = require('./repositories/ReportRepository');

const AuthService = require('./services/AuthService');
const GarageService = require('./services/GarageService');
const RentalService = require('./services/RentalService');
const ReportService = require('./services/ReportService');

const {
  AuthController,
  GarageController,
  RentalController,
  ReportController,
} = require('./controllers/controllers');

const { createAuthMiddleware } = require('./middleware/auth');
const {
  createUploadMiddleware,
  errorHandler,
  notFoundHandler,
} = require('./middleware/common');
const { createApiRouter } = require('./routes/api');

/**
 * Membuat instance aplikasi Express terkonfigurasi lengkap dengan injeksi database, clock, dan direktori unggahan.
 *
 * @param {Object} options - Dependensi dan konfigurasi aplikasi.
 * @param {import('better-sqlite3').Database} options.db - Koneksi database better-sqlite3 aktif.
 * @param {Function} [options.clock] - Fungsi clock terinjeksi (default waktu sistem saat ini).
 * @param {string} [options.uploadDir] - Direktori penyimpanan file gambar bukti pembayaran.
 * @param {number} [options.maxUploadSizeBytes] - Batas maksimum ukuran file unggahan dalam byte.
 * @param {string} [options.jwtSecret] - Kunci rahasia JWT.
 * @param {string} [options.jwtExpiresIn] - Durasi kedaluwarsa token JWT.
 * @returns {{
 *   app: import('express').Express,
 *   services: {
 *     authService: AuthService,
 *     garageService: GarageService,
 *     rentalService: RentalService,
 *     reportService: ReportService
 *   },
 *   repositories: {
 *     userRepository: UserRepository,
 *     garageRepository: GarageRepository,
 *     rentalRepository: RentalRepository,
 *     reportRepository: ReportRepository
 *   }
 * }} Aplikasi Express siap pakai beserta referensi service dan repository internal.
 */
function createApp({
  db,
  clock = () => new Date(),
  uploadDir,
  maxUploadSizeBytes,
  jwtSecret,
  jwtExpiresIn,
}) {
  initializeSchema(db);

  // Inisialisasi Repository
  const userRepository = new UserRepository(db);
  const garageRepository = new GarageRepository(db);
  const rentalRepository = new RentalRepository(db);
  const reportRepository = new ReportRepository(db);

  // Inisialisasi Service
  const authService = new AuthService({
    userRepository,
    jwtSecret,
    jwtExpiresIn,
    clock,
  });
  const garageService = new GarageService({
    garageRepository,
    clock,
  });
  const rentalService = new RentalService({
    rentalRepository,
    garageRepository,
    userRepository,
    clock,
  });
  const reportService = new ReportService({
    reportRepository,
    garageRepository,
    clock,
  });

  // Inisialisasi Middleware
  const authMiddleware = createAuthMiddleware(authService);
  const { uploadPaymentProof, uploadDir: resolvedUploadDir } = createUploadMiddleware({
    uploadDir,
    maxFileSizeBytes: maxUploadSizeBytes,
  });

  // Inisialisasi Controller
  const controllers = {
    auth: new AuthController(authService),
    garage: new GarageController(garageService),
    rental: new RentalController({
      rentalService,
      uploadDir: resolvedUploadDir,
    }),
    report: new ReportController(reportService),
  };

  // Konfigurasi Express & pendaftaran rute REST API
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  app.use(
    '/api',
    createApiRouter({
      controllers,
      authMiddleware,
      uploadPaymentProof,
    })
  );
  app.use('/api', notFoundHandler);

  // Penyajian aset statis frontend desktop
  const publicDir = path.resolve(__dirname, '..', 'public');
  app.use(express.static(publicDir));

  app.get('/', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  // Handler error global
  app.use(errorHandler);

  return {
    app,
    services: {
      authService,
      garageService,
      rentalService,
      reportService,
    },
    repositories: {
      userRepository,
      garageRepository,
      rentalRepository,
      reportRepository,
    },
  };
}

module.exports = {
  createApp,
};
