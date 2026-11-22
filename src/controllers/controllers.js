/**
 * Kumpulan Controller HTTP REST API: AuthController, GarageController, RentalController, dan ReportController.
 * @module controllers/controllers
 */

const fs = require('fs');
const path = require('path');
const {
  AUTH_COOKIE_NAME,
  USER_ROLES,
  NotFoundError,
} = require('../utils/constants');

/**
 * Controller yang mengelola endpoint autentikasi, sesi cookie HttpOnly, dan verifikasi akun penyewa.
 */
class AuthController {
  /**
   * Membuat instance AuthController dan mengikat konteks method handler.
   *
   * @param {import('../services/AuthService')} authService - Layanan autentikasi.
   */
  constructor(authService) {
    this.authService = authService;
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.me = this.me.bind(this);
    this.listTenants = this.listTenants.bind(this);
    this.verifyTenant = this.verifyTenant.bind(this);
  }

  /**
   * Menangani POST /api/auth/register untuk pendaftaran penyewa (Tenant) baru.
   *
   * @param {import('express').Request} req - Request berisi nik, fullName, phone, email, password.
   * @param {import('express').Response} res - Response JSON status 201.
   * @param {import('express').NextFunction} next - Callback penerus error.
   * @returns {void}
   */
  register(req, res, next) {
    try {
      const tenant = this.authService.registerTenant({
        nik: req.body.nik,
        fullName: req.body.fullName,
        phone: req.body.phone,
        email: req.body.email,
        password: req.body.password,
      });

      res.status(201).json({
        success: true,
        message:
          'Pendaftaran berhasil. Akun Anda berstatus PENDING dan menunggu verifikasi Admin.',
        data: tenant.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Menangani POST /api/auth/login untuk Admin dan Penyewa serta menyetel cookie sesi HttpOnly.
   *
   * @param {import('express').Request} req - Request berisi email dan password.
   * @param {import('express').Response} res - Response JSON status 200 dengan data pengguna.
   * @param {import('express').NextFunction} next - Callback penerus error.
   * @returns {void}
   */
  login(req, res, next) {
    try {
      const { user, token } = this.authService.authenticate(
        req.body.email,
        req.body.password
      );

      res.cookie(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 8 * 60 * 60 * 1000,
        path: '/',
      });

      res.status(200).json({
        success: true,
        message: 'Login berhasil.',
        data: {
          user: user.toJSON(),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Menangani POST /api/auth/logout dengan menghapus cookie autentikasi HttpOnly.
   *
   * @param {import('express').Request} _req - Objek request Express.
   * @param {import('express').Response} res - Response JSON status 200.
   * @returns {void}
   */
  logout(_req, res) {
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    res.status(200).json({
      success: true,
      message: 'Logout berhasil.',
    });
  }

  /**
   * Menangani GET /api/auth/me untuk mengembalikan profil pengguna yang sedang login.
   *
   * @param {import('express').Request} req - Request terautentikasi dengan req.user.
   * @param {import('express').Response} res - Response JSON status 200.
   * @returns {void}
   */
  me(req, res) {
    res.status(200).json({
      success: true,
      data: req.user.toJSON(),
    });
  }

  /**
   * Menangani GET /api/admin/tenants (khusus Admin) untuk mengambil daftar pendaftar penyewa.
   *
   * @param {import('express').Request} req - Request dengan filter opsional query.status dan query.search.
   * @param {import('express').Response} res - Response JSON daftar penyewa.
   * @param {import('express').NextFunction} next - Callback penerus error.
   * @returns {void}
   */
  listTenants(req, res, next) {
    try {
      const tenants = this.authService.listTenants({
        status: req.query.status || undefined,
        search: req.query.search || undefined,
      });

      res.status(200).json({
        success: true,
        data: tenants.map((t) => t.toJSON()),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Menangani PATCH /api/admin/tenants/:userId/verify (khusus Admin) untuk menyetujui atau menolak penyewa.
   *
   * @param {import('express').Request} req - Request dengan params.userId dan body.status.
   * @param {import('express').Response} res - Response JSON data penyewa terbarui.
   * @param {import('express').NextFunction} next - Callback penerus error.
   * @returns {void}
   */
  verifyTenant(req, res, next) {
    try {
      const updatedTenant = this.authService.verifyTenant(
        req.params.userId,
        req.body.status
      );

      res.status(200).json({
        success: true,
        message: `Status penyewa berhasil diperbarui menjadi ${updatedTenant.approvalStatus}.`,
        data: updatedTenant.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }
}

/**
 * Controller yang mengelola endpoint pembuatan garasi massal, inventaris garasi, dan ketersediaan garasi.
 */
class GarageController {
  /**
   * Membuat instance GarageController.
   *
   * @param {import('../services/GarageService')} garageService - Layanan bisnis garasi.
   */
  constructor(garageService) {
    this.garageService = garageService;
    this.createBatch = this.createBatch.bind(this);
    this.listGarages = this.listGarages.bind(this);
    this.getAvailableGarages = this.getAvailableGarages.bind(this);
    this.getGarageById = this.getGarageById.bind(this);
  }

  /**
   * Menangani POST /api/garages/batch (khusus Admin) untuk membuat garasi secara massal dengan ID otomatis.
   *
   * @param {import('express').Request} req - Request berisi garageType, quantity, dailyRate, electricityRatePerKwh.
   * @param {import('express').Response} res - Response JSON status 201 berisi daftar garasi baru.
   * @param {import('express').NextFunction} next - Callback penerus error.
   * @returns {void}
   */
  createBatch(req, res, next) {
    try {
      const created = this.garageService.createGarageBatch({
        garageType: req.body.garageType,
        quantity: req.body.quantity,
        dailyRate: req.body.dailyRate,
        electricityRatePerKwh: req.body.electricityRatePerKwh,
      });

      const firstId = created[0].id;
      const lastId = created[created.length - 1].id;
      const rangeText =
        created.length === 1 ? firstId : `${firstId} s/d ${lastId}`;

      res.status(201).json({
        success: true,
        message: `Berhasil membuat ${created.length} garasi baru (${rangeText}).`,
        data: created.map((g) => g.toJSON()),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Menangani GET /api/garages (khusus Admin) untuk mengambil seluruh garasi dan counter urutan per tipe.
   *
   * @param {import('express').Request} req - Request dengan filter opsional garageType, status, search.
   * @param {import('express').Response} res - Response JSON berisi daftar garasi dan sequences.
   * @param {import('express').NextFunction} next - Callback penerus error.
   * @returns {void}
   */
  listGarages(req, res, next) {
    try {
      const { garages, garageTypes, sequences } = this.garageService.listGarages({
        garageType: req.query.garageType || undefined,
        status: req.query.status || undefined,
        search: req.query.search || undefined,
      });

      res.status(200).json({
        success: true,
        data: {
          garages: garages.map((g) => g.toJSON()),
          garageTypes: garageTypes.map((gt) => gt.toJSON()),
          sequences,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Menangani GET /api/garages/available untuk mencari garasi kompatibel yang tersedia pada periode pilihan.
   *
   * @param {import('express').Request} req - Request dengan query vehicleType, garageType, rentalType, durationDays, startDate.
   * @param {import('express').Response} res - Response JSON berisi periode tanggal dan daftar garasi tersedia.
   * @param {import('express').NextFunction} next - Callback penerus error.
   * @returns {void}
   */
  getAvailableGarages(req, res, next) {
    try {
      const result = this.garageService.getAvailableGarages({
        vehicleType: req.query.vehicleType,
        garageType: req.query.garageType || null,
        rentalType: req.query.rentalType || 'DAILY',
        durationDays: req.query.durationDays
          ? Number(req.query.durationDays)
          : 1,
        startDate: req.query.startDate || null,
      });

      res.status(200).json({
        success: true,
        data: {
          ...result,
          garages: result.garages.map((g) => g.toJSON()),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Menangani GET /api/garages/:id untuk mengambil informasi satu unit garasi berdasarkan ID.
   *
   * @param {import('express').Request} req - Request dengan params.id.
   * @param {import('express').Response} res - Response JSON detail garasi.
   * @param {import('express').NextFunction} next - Callback penerus error.
   * @returns {void}
   */
  getGarageById(req, res, next) {
    try {
      const garage = this.garageService.getGarageById(
        String(req.params.id).trim().toUpperCase()
      );
      res.status(200).json({
        success: true,
        data: garage.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }
}

/**
 * Controller yang mengelola transaksi penyewaan baru, perpanjangan sewa, dan akses bukti pembayaran terproteksi.
 */
class RentalController {
  /**
   * Membuat instance RentalController.
   *
   * @param {Object} deps - Dependensi yang diinjeksikan.
   * @param {import('../services/RentalService')} deps.rentalService - Layanan bisnis penyewaan.
   * @param {import('../repositories/RentalRepository')} deps.rentalRepository - Repository untuk cek kepemilikan file bukti bayar.
   * @param {string} deps.uploadDir - Path absolut direktori penyimpanan bukti pembayaran.
   */
  constructor({ rentalService, rentalRepository, uploadDir }) {
    this.rentalService = rentalService;
    this.rentalRepository = rentalRepository;
    this.uploadDir = uploadDir;

    this.getConfig = this.getConfig.bind(this);
    this.previewRental = this.previewRental.bind(this);
    this.createRental = this.createRental.bind(this);
    this.getMyRentals = this.getMyRentals.bind(this);
    this.getActiveRentals = this.getActiveRentals.bind(this);
    this.getAllRentals = this.getAllRentals.bind(this);
    this.getRentalDetail = this.getRentalDetail.bind(this);
    this.previewExtension = this.previewExtension.bind(this);
    this.extendRental = this.extendRental.bind(this);
    this.servePaymentProof = this.servePaymentProof.bind(this);
  }

  /**
   * Menangani GET /api/rentals/config untuk mengembalikan tanggal hari ini (WIB) dan batas durasi
   * berdasarkan tanggal mulai opsional (`?startDate=YYYY-MM-DD`).
   *
   * @param {import('express').Request} req - Objek request Express.
   * @param {import('express').Response} res - Response JSON konfigurasi sewa.
   * @param {import('express').NextFunction} next - Callback penerus error.
   * @returns {void}
   */
  getConfig(req, res, next) {
    try {
      const config = this.rentalService.getRentalConfig(req.query.startDate || null);
      res.status(200).json({
        success: true,
        data: config,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Menangani POST /api/rentals/preview untuk menghitung pratinjau tanggal selesai dan biaya di backend.
   *
   * @param {import('express').Request} req - Request berisi parameter rencana sewa.
   * @param {import('express').Response} res - Response JSON rincian pratinjau biaya.
   * @param {import('express').NextFunction} next - Callback penerus error.
   * @returns {void}
   */
  previewRental(req, res, next) {
    try {
      const preview = this.rentalService.previewRentalCost(req.body);
      res.status(200).json({
        success: true,
        data: preview,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Menangani POST /api/rentals (khusus Penyewa APPROVED) dalam format multipart/form-data dengan bukti gambar.
   *
   * @param {import('express').Request} req - Request berisi data kendaraan/sewa dan req.file.
   * @param {import('express').Response} res - Response JSON status 201 berisi transaksi baru.
   * @param {import('express').NextFunction} next - Callback penerus error.
   * @returns {void}
   */
  createRental(req, res, next) {
    try {
      const rental = this.rentalService.createRental(
        req.user.id,
        req.body,
        req.file ? req.file.filename : null
      );

      res.status(201).json({
        success: true,
        message: `Penyewaan garasi ${rental.garageId} berhasil disimpan.`,
        data: rental.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Menangani GET /api/rentals/my (khusus Penyewa) untuk menampilkan riwayat penyewaan milik penyewa.
   *
   * @param {import('express').Request} req - Request terautentikasi dengan req.user.
   * @param {import('express').Response} res - Response JSON daftar penyewaan penyewa.
   * @param {import('express').NextFunction} next - Callback penerus error.
   * @returns {void}
   */
  getMyRentals(req, res, next) {
    try {
      const rentals = this.rentalService.getTenantRentals(req.user.id);
      res.status(200).json({
        success: true,
        data: rentals.map((r) => r.toJSON()),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Menangani GET /api/rentals/active (khusus Admin) untuk mengambil daftar garasi aktif disewa hari ini.
   *
   * @param {import('express').Request} _req - Objek request Express.
   * @param {import('express').Response} res - Response JSON berisi tanggal hari ini dan daftar sewa aktif.
   * @param {import('express').NextFunction} next - Callback penerus error.
   * @returns {void}
   */
  getActiveRentals(_req, res, next) {
    try {
      const { todayDate, rentals } = this.rentalService.getActiveRentalsToday();
      res.status(200).json({
        success: true,
        data: {
          todayDate,
          rentals: rentals.map((r) => r.toJSON()),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Menangani GET /api/rentals (khusus Admin) untuk menampilkan seluruh riwayat penyewaan di sistem.
   *
   * @param {import('express').Request} req - Request dengan filter opsional status dan garageType.
   * @param {import('express').Response} res - Response JSON seluruh transaksi penyewaan.
   * @param {import('express').NextFunction} next - Callback penerus error.
   * @returns {void}
   */
  getAllRentals(req, res, next) {
    try {
      const rentals = this.rentalService.getAllRentals({
        status: req.query.status || undefined,
        garageType: req.query.garageType || undefined,
      });

      res.status(200).json({
        success: true,
        data: rentals.map((r) => r.toJSON()),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Menangani GET /api/rentals/:id untuk menampilkan detail satu transaksi beserta histori perpanjangannya.
   *
   * @param {import('express').Request} req - Request dengan params.id dan req.user.
   * @param {import('express').Response} res - Response JSON detail transaksi.
   * @param {import('express').NextFunction} next - Callback penerus error.
   * @returns {void}
   */
  getRentalDetail(req, res, next) {
    try {
      const rental = this.rentalService.getRentalDetail(req.params.id, req.user);
      res.status(200).json({
        success: true,
        data: rental.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Menangani POST /api/rentals/:id/extend/preview (khusus Admin) untuk menghitung pratinjau biaya perpanjangan.
   *
   * @param {import('express').Request} req - Request dengan params.id dan body.newEndDate.
   * @param {import('express').Response} res - Response JSON rincian pratinjau perpanjangan.
   * @param {import('express').NextFunction} next - Callback penerus error.
   * @returns {void}
   */
  previewExtension(req, res, next) {
    try {
      const preview = this.rentalService.previewExtensionCost(
        req.params.id,
        req.body.newEndDate
      );
      res.status(200).json({
        success: true,
        data: preview,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Menangani POST /api/rentals/:id/extend (khusus Admin) untuk menyimpan perpanjangan sewa dan bukti bayar.
   *
   * @param {import('express').Request} req - Request multipart dengan body.newEndDate dan req.file.
   * @param {import('express').Response} res - Response JSON status 201 berisi data perpanjangan dan rental terbarui.
   * @param {import('express').NextFunction} next - Callback penerus error.
   * @returns {void}
   */
  extendRental(req, res, next) {
    try {
      const result = this.rentalService.extendRental(
        req.params.id,
        req.user.id,
        req.body.newEndDate,
        req.file ? req.file.filename : null
      );

      res.status(201).json({
        success: true,
        message: `Perpanjangan sewa garasi ${result.rental.garageId} hingga ${result.extension.newEndDate} berhasil disimpan.`,
        data: {
          extension: result.extension.toJSON(),
          rental: result.rental.toJSON(),
          breakdown: result.breakdown,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Menangani GET /api/uploads/payment-proofs/:filename untuk menampilkan file gambar bukti pembayaran.
   *
   * @param {import('express').Request} req - Request terautentikasi.
   * @param {import('express').Response} res - Response file gambar.
   * @param {import('express').NextFunction} next - Callback penerus error.
   * @returns {void}
   */
  servePaymentProof(req, res, next) {
    try {
      const safeName = path.basename(req.params.filename || '');
      const fullPath = path.join(path.resolve(this.uploadDir), safeName);

      if (!fs.existsSync(fullPath)) {
        throw new NotFoundError('File bukti pembayaran tidak ditemukan.');
      }

      res.sendFile(fullPath);
    } catch (err) {
      next(err);
    }
  }
}

/**
 * Controller yang mengelola endpoint dashboard KPI dan 4 laporan penyewaan berbasis SQL.
 */
class ReportController {
  /**
   * Membuat instance ReportController.
   *
   * @param {import('../services/ReportService')} reportService - Layanan pelaporan.
   */
  constructor(reportService) {
    this.reportService = reportService;
    this.getDashboard = this.getDashboard.bind(this);
    this.getMonthlyReport = this.getMonthlyReport.bind(this);
    this.getDailyReport = this.getDailyReport.bind(this);
    this.getGarageTypeReport = this.getGarageTypeReport.bind(this);
    this.getTenantReport = this.getTenantReport.bind(this);
  }

  /**
   * Menangani GET /api/reports/dashboard untuk mengembalikan KPI aktual sesuai role pengguna.
   *
   * @param {import('express').Request} req - Request terautentikasi.
   * @param {import('express').Response} res - Response JSON metrik dashboard.
   * @param {import('express').NextFunction} next - Callback penerus error.
   * @returns {void}
   */
  getDashboard(req, res, next) {
    try {
      const data =
        req.user.role === USER_ROLES.ADMIN
          ? this.reportService.getAdminDashboardStats()
          : this.reportService.getTenantDashboardStats(req.user.id);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Menangani GET /api/reports/monthly (khusus Admin) untuk laporan per bulan pada tahun tertentu.
   *
   * @param {import('express').Request} req - Request dengan filter opsional query.year.
   * @param {import('express').Response} res - Response JSON laporan bulanan.
   * @param {import('express').NextFunction} next - Callback penerus error.
   * @returns {void}
   */
  getMonthlyReport(req, res, next) {
    try {
      const data = this.reportService.getMonthlyReport(req.query.year);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Menangani GET /api/reports/daily (khusus Admin) untuk laporan per hari pada bulan dan tahun tertentu.
   *
   * @param {import('express').Request} req - Request dengan query.year, query.month, dan query.includeEmpty.
   * @param {import('express').Response} res - Response JSON laporan harian.
   * @param {import('express').NextFunction} next - Callback penerus error.
   * @returns {void}
   */
  getDailyReport(req, res, next) {
    try {
      const includeEmpty = req.query.includeEmpty === 'true';
      const data = this.reportService.getDailyReport(
        req.query.year,
        req.query.month,
        includeEmpty
      );
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Menangani GET /api/reports/by-garage-type (khusus Admin) untuk laporan per tipe garasi.
   *
   * @param {import('express').Request} req - Request dengan filter opsional garageType, year, month.
   * @param {import('express').Response} res - Response JSON laporan per tipe garasi.
   * @param {import('express').NextFunction} next - Callback penerus error.
   * @returns {void}
   */
  getGarageTypeReport(req, res, next) {
    try {
      const data = this.reportService.getGarageTypeReport({
        garageType: req.query.garageType || undefined,
        year: req.query.year,
        month: req.query.month,
      });
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Menangani GET /api/reports/by-tenant (khusus Admin) untuk laporan per penyewa.
   *
   * @param {import('express').Request} req - Request dengan filter opsional tenantUserId atau search.
   * @param {import('express').Response} res - Response JSON laporan per penyewa.
   * @param {import('express').NextFunction} next - Callback penerus error.
   * @returns {void}
   */
  getTenantReport(req, res, next) {
    try {
      const data = this.reportService.getTenantReport({
        tenantUserId: req.query.tenantUserId || undefined,
        search: req.query.search || undefined,
      });
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = {
  AuthController,
  GarageController,
  RentalController,
  ReportController,
};
