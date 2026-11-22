/**
 * Middleware autentikasi sesi JWT dan otorisasi berbasis role (Admin / Penyewa).
 * @module middleware/auth
 */

const {
  AUTH_COOKIE_NAME,
  USER_ROLES,
  AuthenticationError,
  ForbiddenError,
} = require('../utils/constants');

/**
 * Mengekstrak token JWT dari cookie autentikasi atau header Authorization Bearer.
 *
 * @param {import('express').Request} req - Objek HTTP request Express.
 * @returns {string|null} Token JWT yang ditemukan atau null jika tidak tersedia.
 */
function extractAuthToken(req) {
  if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
    return req.cookies[AUTH_COOKIE_NAME];
  }
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

/**
 * Factory yang membentuk kumpulan middleware autentikasi dan otorisasi terhubung ke AuthService.
 *
 * @param {import('../services/AuthService')} authService - Layanan autentikasi untuk verifikasi token.
 * @returns {{
 *   authenticate: import('express').RequestHandler,
 *   requireRole: (...roles: string[]) => import('express').RequestHandler,
 *   requireApprovedTenant: import('express').RequestHandler,
 *   requireAdminOrApprovedTenant: import('express').RequestHandler
 * }} Kumpulan middleware autentikasi dan otorisasi.
 */
function createAuthMiddleware(authService) {
  /**
   * Memverifikasi token sesi pemanggil dan menyematkan entitas User terbaru dari database ke req.user.
   *
   * @param {import('express').Request} req - Objek request Express.
   * @param {import('express').Response} _res - Objek response Express.
   * @param {import('express').NextFunction} next - Callback middleware berikutnya.
   * @returns {void}
   */
  function authenticate(req, _res, next) {
    try {
      const token = extractAuthToken(req);
      if (!token) {
        throw new AuthenticationError(
          'Autentikasi diperlukan. Silakan login terlebih dahulu.'
        );
      }
      req.user = authService.verifyToken(token);
      next();
    } catch (err) {
      next(err);
    }
  }

  /**
   * Membatasi akses endpoint hanya bagi pengguna dengan role yang diizinkan.
   *
   * @param {...string} roles - Daftar kode role yang diperbolehkan ('ADMIN' / 'TENANT').
   * @returns {import('express').RequestHandler} Middleware penjaga role Express.
   */
  function requireRole(...roles) {
    return function roleGuard(req, _res, next) {
      if (!req.user) {
        return next(new AuthenticationError('Autentikasi diperlukan.'));
      }
      if (!roles.includes(req.user.role)) {
        return next(
          new ForbiddenError(
            'Anda tidak memiliki hak akses role untuk mengakses endpoint ini.'
          )
        );
      }
      return next();
    };
  }

  /**
   * Memastikan pemanggil adalah Penyewa (TENANT) dengan status verifikasi APPROVED.
   * Menolak penyewa berstatus PENDING atau REJECTED dengan HTTP 403 Forbidden.
   *
   * @param {import('express').Request} req - Objek request Express.
   * @param {import('express').Response} _res - Objek response Express.
   * @param {import('express').NextFunction} next - Callback middleware berikutnya.
   * @returns {void}
   */
  function requireApprovedTenant(req, _res, next) {
    if (!req.user) {
      return next(new AuthenticationError('Autentikasi diperlukan.'));
    }
    if (req.user.role !== USER_ROLES.TENANT) {
      return next(
        new ForbiddenError('Fitur ini hanya dapat diakses oleh penyewa (Tenant).')
      );
    }
    if (!req.user.canRent()) {
      return next(
        new ForbiddenError(
          `Akun Anda berstatus ${req.user.approvalStatus}. Hanya penyewa berstatus APPROVED yang dapat melakukan penyewaan.`
        )
      );
    }
    return next();
  }

  /**
   * Mengizinkan akses hanya bagi Admin atau Penyewa (TENANT) yang berstatus APPROVED.
   *
   * @param {import('express').Request} req - Objek request Express.
   * @param {import('express').Response} _res - Objek response Express.
   * @param {import('express').NextFunction} next - Callback middleware berikutnya.
   * @returns {void}
   */
  function requireAdminOrApprovedTenant(req, _res, next) {
    if (!req.user) {
      return next(new AuthenticationError('Autentikasi diperlukan.'));
    }
    if (req.user.role === USER_ROLES.ADMIN) {
      return next();
    }
    if (req.user.role === USER_ROLES.TENANT && req.user.canRent()) {
      return next();
    }
    return next(
      new ForbiddenError(
        `Akun Anda berstatus ${req.user.approvalStatus || req.user.role}. Hanya Admin atau penyewa berstatus APPROVED yang dapat mengakses data garasi.`
      )
    );
  }

  return {
    authenticate,
    requireRole,
    requireApprovedTenant,
    requireAdminOrApprovedTenant,
  };
}

module.exports = {
  extractAuthToken,
  createAuthMiddleware,
};
