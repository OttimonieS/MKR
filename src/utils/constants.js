/**
 * Konstanta domain bisnis dan hierarki kelas error HTTP aplikasi.
 * @module utils/constants
 */

const USER_ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  TENANT: 'TENANT',
});

const APPROVAL_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});

const GARAGE_TYPES = Object.freeze({
  BIKE: 'BIKE',
  CAR: 'CAR',
  EV: 'EV',
});

const GARAGE_TYPE_IDS = Object.freeze({
  BIKE: 1,
  CAR: 2,
  EV: 3,
});

const GARAGE_TYPE_PREFIX = Object.freeze({
  BIKE: 'S',
  CAR: 'C',
  EV: 'E',
});

const GARAGE_TYPE_LABELS = Object.freeze({
  BIKE: 'Garasi Sepeda',
  CAR: 'Garasi Mobil',
  EV: 'Garasi Mobil Listrik',
});

const GARAGE_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  USED: 'USED',
});

const VEHICLE_TYPES = Object.freeze({
  BICYCLE: 'BICYCLE',
  MOTORCYCLE: 'MOTORCYCLE',
  CAR: 'CAR',
  ELECTRIC_CAR: 'ELECTRIC_CAR',
});

const VEHICLE_TYPE_LABELS = Object.freeze({
  BICYCLE: 'Sepeda',
  MOTORCYCLE: 'Sepeda Motor',
  CAR: 'Mobil',
  ELECTRIC_CAR: 'Mobil Listrik',
});

const VEHICLE_GARAGE_COMPATIBILITY = Object.freeze({
  BICYCLE: Object.freeze(['BIKE']),
  MOTORCYCLE: Object.freeze(['BIKE']),
  CAR: Object.freeze(['CAR']),
  ELECTRIC_CAR: Object.freeze(['CAR', 'EV']),
});

const RENTAL_TYPES = Object.freeze({
  DAILY: 'DAILY',
  MONTHLY: 'MONTHLY',
});

const RENTAL_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
});

const MONTHLY_RATE_MULTIPLIER = 25;
const MAX_GARAGES_PER_TYPE = 999;
const APP_TIMEZONE = 'Asia/Jakarta';
const AUTH_COOKIE_NAME = 'gr_auth_token';
const ALLOWED_IMAGE_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/**
 * Kelas dasar error operasional aplikasi dengan kode status HTTP.
 */
class AppError extends Error {
  /**
   * Membuat instance error operasional aplikasi.
   *
   * @param {string} message - Pesan error untuk pengguna.
   * @param {number} [statusCode=500] - Kode status HTTP.
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

/**
 * Error validasi input atau pelanggaran aturan bisnis (HTTP 400).
 */
class ValidationError extends AppError {
  /**
   * Membuat instance ValidationError (400).
   *
   * @param {string} message - Penjelasan kegagalan validasi.
   */
  constructor(message) {
    super(message, 400);
  }
}

/**
 * Error kredensial tidak valid atau belum login (HTTP 401).
 */
class AuthenticationError extends AppError {
  /**
   * Membuat instance AuthenticationError (401).
   *
   * @param {string} [message='Autentikasi diperlukan.'] - Pesan kesalahan autentikasi.
   */
  constructor(message = 'Autentikasi diperlukan.') {
    super(message, 401);
  }
}

/**
 * Error penolakan hak akses role atau status akun penyewa (HTTP 403).
 */
class ForbiddenError extends AppError {
  /**
   * Membuat instance ForbiddenError (403).
   *
   * @param {string} [message='Anda tidak memiliki akses untuk melakukan aksi ini.'] - Pesan penolakan akses.
   */
  constructor(message = 'Anda tidak memiliki akses untuk melakukan aksi ini.') {
    super(message, 403);
  }
}

/**
 * Error data tidak ditemukan (HTTP 404).
 */
class NotFoundError extends AppError {
  /**
   * Membuat instance NotFoundError (404).
   *
   * @param {string} [message='Data tidak ditemukan.'] - Pesan data tidak ditemukan.
   */
  constructor(message = 'Data tidak ditemukan.') {
    super(message, 404);
  }
}

/**
 * Error konflik keunikan data atau bentrok jadwal garasi (HTTP 409).
 */
class ConflictError extends AppError {
  /**
   * Membuat instance ConflictError (409).
   *
   * @param {string} message - Penjelasan konflik yang terjadi.
   */
  constructor(message) {
    super(message, 409);
  }
}

module.exports = {
  USER_ROLES,
  APPROVAL_STATUS,
  GARAGE_TYPES,
  GARAGE_TYPE_IDS,
  GARAGE_TYPE_PREFIX,
  GARAGE_TYPE_LABELS,
  GARAGE_STATUS,
  VEHICLE_TYPES,
  VEHICLE_TYPE_LABELS,
  VEHICLE_GARAGE_COMPATIBILITY,
  RENTAL_TYPES,
  RENTAL_STATUS,
  MONTHLY_RATE_MULTIPLIER,
  MAX_GARAGES_PER_TYPE,
  APP_TIMEZONE,
  AUTH_COOKIE_NAME,
  ALLOWED_IMAGE_MIME_TYPES,
  AppError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};
