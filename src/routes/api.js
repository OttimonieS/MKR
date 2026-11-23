/**
 * Definisi tunggal seluruh rute REST API aplikasi (`/api/*`) dengan middleware RBAC terstruktur.
 * @module routes/api
 */

const express = require('express');
const { USER_ROLES } = require('../utils/constants');

/**
 * Membangun router utama REST API yang menggabungkan rute autentikasi, admin, garasi, sewa, laporan, dan bukti bayar.
 *
 * @param {Object} deps - Kumpulan controller dan middleware Express.
 * @param {Object} deps.controllers - Instance AuthController, GarageController, RentalController, dan ReportController.
 * @param {Object} deps.authMiddleware - Middleware authenticate, requireRole, requireApprovedTenant, requireAdminOrApprovedTenant.
 * @param {import('express').RequestHandler} deps.uploadPaymentProof - Middleware unggah file gambar bukti pembayaran.
 * @returns {import('express').Router} Router Express terkonfigurasi untuk di-mount pada `/api`.
 */
function createApiRouter({ controllers, authMiddleware, uploadPaymentProof }) {
  const router = express.Router();
  const { auth, garage, rental, report } = controllers;
  const {
    authenticate,
    requireRole,
    requireApprovedTenant,
    requireAdminOrApprovedTenant,
  } = authMiddleware;
  const adminOnly = requireRole(USER_ROLES.ADMIN);
  const tenantOnly = requireRole(USER_ROLES.TENANT);

  // Autentikasi & Sesi
  router.post('/auth/register', auth.register);
  router.post('/auth/login', auth.login);
  router.post('/auth/logout', auth.logout);
  router.get('/auth/me', authenticate, auth.me);

  // Verifikasi Penyewa (Admin)
  router.get('/admin/tenants', authenticate, adminOnly, auth.listTenants);
  router.patch('/admin/tenants/:userId/verify', authenticate, adminOnly, auth.verifyTenant);

  // Manajemen & Ketersediaan Garasi
  router.post('/garages/batch', authenticate, adminOnly, garage.createBatch);
  router.get('/garages', authenticate, adminOnly, garage.listGarages);
  router.get('/garages/available', authenticate, requireAdminOrApprovedTenant, garage.getAvailableGarages);
  router.get('/garages/:id', authenticate, requireAdminOrApprovedTenant, garage.getGarageById);

  // Transaksi Penyewaan & Perpanjangan
  router.get('/rentals/config', authenticate, rental.getConfig);
  router.post('/rentals/preview', authenticate, requireApprovedTenant, rental.previewRental);
  router.post('/rentals', authenticate, requireApprovedTenant, uploadPaymentProof, rental.createRental);
  router.get('/rentals/my', authenticate, tenantOnly, rental.getMyRentals);
  router.get('/rentals/active', authenticate, adminOnly, rental.getActiveRentals);
  router.post('/rentals/:id/extend/preview', authenticate, adminOnly, rental.previewExtension);
  router.post('/rentals/:id/extend', authenticate, adminOnly, uploadPaymentProof, rental.extendRental);
  router.get('/rentals/:id', authenticate, rental.getRentalDetail);

  // Laporan (Admin)
  router.get('/reports/monthly', authenticate, adminOnly, report.getMonthlyReport);
  router.get('/reports/daily', authenticate, adminOnly, report.getDailyReport);
  router.get('/reports/by-garage-type', authenticate, adminOnly, report.getGarageTypeReport);
  router.get('/reports/by-tenant', authenticate, adminOnly, report.getTenantReport);

  // Akses Bukti Pembayaran Terproteksi
  router.get('/uploads/payment-proofs/:filename', authenticate, rental.servePaymentProof);

  return router;
}

module.exports = {
  createApiRouter,
};
