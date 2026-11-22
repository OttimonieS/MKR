/**
 * Layanan autentikasi, registrasi penyewa, manajemen token JWT, dan verifikasi pendaftar oleh Admin.
 * @module services/AuthService
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  APPROVAL_STATUS,
  USER_ROLES,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
} = require('../utils/constants');
const {
  validateEmail,
  validateNik,
  validateFullName,
  validatePhone,
  validatePassword,
} = require('../utils/validators');
const { getJakartaTimestamp } = require('../utils/rentalMath');

/**
 * Service yang mengelola logika bisnis autentikasi, pendaftaran penyewa, dan verifikasi NIK/KTP.
 */
class AuthService {
  /**
   * Membuat instance AuthService dengan injeksi dependensi.
   *
   * @param {Object} deps - Dependensi yang diinjeksikan.
   * @param {import('../repositories/UserRepository')} deps.userRepository - Repository data pengguna.
   * @param {string} [deps.jwtSecret] - Kunci rahasia penandatanganan token JWT.
   * @param {string} [deps.jwtExpiresIn='8h'] - Masa berlaku token autentikasi.
   * @param {Function} [deps.clock] - Fungsi clock yang mengembalikan Date saat ini (dapat di-mock saat testing).
   */
  constructor({
    userRepository,
    jwtSecret,
    jwtExpiresIn = process.env.JWT_EXPIRES_IN || '8h',
    clock = () => new Date(),
  }) {
    this.userRepository = userRepository;
    this.jwtSecret = jwtSecret || process.env.JWT_SECRET || 'garage-rental-secret-key';
    this.jwtExpiresIn = jwtExpiresIn;
    this.clock = clock;
  }

  /**
   * Mendaftarkan akun Penyewa (Tenant) baru dengan status verifikasi awal PENDING.
   * Memastikan keunikan email dan NIK 16 digit serta mengenkripsi password menggunakan bcrypt.
   *
   * @param {Object} payload - Data pendaftaran penyewa.
   * @param {string} payload.nik - NIK 16 digit (Nomor KTP).
   * @param {string} payload.fullName - Nama lengkap sesuai KTP.
   * @param {string} payload.phone - Nomor telepon aktif.
   * @param {string} payload.email - Email unik yang digunakan sebagai username.
   * @param {string} payload.password - Password plaintext (di-hash sebelum disimpan).
   * @returns {import('../models/Tenant')} Entitas Tenant yang berhasil terdaftar.
   * @throws {ValidationError} Jika ada data input yang tidak memenuhi aturan validasi.
   * @throws {ConflictError} Jika email atau NIK sudah terdaftar di database.
   */
  registerTenant({ nik, fullName, phone, email, password }) {
    const validNik = validateNik(nik);
    const validFullName = validateFullName(fullName);
    const validPhone = validatePhone(phone);
    const validEmail = validateEmail(email);
    const validPassword = validatePassword(password);

    if (this.userRepository.findByEmail(validEmail)) {
      throw new ConflictError('Email sudah terdaftar. Gunakan email lain.');
    }

    if (this.userRepository.findTenantByNik(validNik)) {
      throw new ConflictError('NIK sudah terdaftar dalam sistem.');
    }

    const passwordHash = bcrypt.hashSync(validPassword, 10);
    const createdAt = getJakartaTimestamp(this.clock());

    return this.userRepository.createTenantUser({
      id: crypto.randomUUID(),
      email: validEmail,
      passwordHash,
      nik: validNik,
      fullName: validFullName,
      phone: validPhone,
      approvalStatus: APPROVAL_STATUS.PENDING,
      createdAt,
    });
  }

  /**
   * Mengautentikasi akun Admin atau Penyewa menggunakan email dan password.
   *
   * @param {string} email - Alamat email pengguna.
   * @param {string} password - Password plaintext dari form login.
   * @returns {{ user: import('../models/Admin')|import('../models/Tenant'), token: string }} Entitas pengguna dan token JWT.
   * @throws {ValidationError} Jika email atau password kosong.
   * @throws {AuthenticationError} Jika email tidak ditemukan atau password tidak cocok.
   */
  authenticate(email, password) {
    if (!email || !password) {
      throw new ValidationError('Email dan password wajib diisi.');
    }
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const user = this.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new AuthenticationError('Email atau password tidak valid.');
    }

    const passwordMatches = bcrypt.compareSync(String(password), user.getPasswordHash());
    if (!passwordMatches) {
      throw new AuthenticationError('Email atau password tidak valid.');
    }

    const token = this.signToken(user);
    return { user, token };
  }

  /**
   * Membuat token JWT bertanda tangan yang berisi klaim identitas minimal (sub & role).
   *
   * @param {import('../models/User')} user - Entitas pengguna terautentikasi.
   * @returns {string} String JSON Web Token.
   */
  signToken(user) {
    return jwt.sign(
      {
        sub: user.id,
        role: user.role,
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn }
    );
  }

  /**
   * Memverifikasi token JWT dan memuat ulang entitas pengguna terkini (termasuk status persetujuan terbaru) dari database.
   *
   * @param {string} token - Token JWT dari cookie HttpOnly atau header Authorization.
   * @returns {import('../models/Admin')|import('../models/Tenant')} Entitas pengguna terbaru dari database.
   * @throws {AuthenticationError} Jika token tidak ada, kedaluwarsa, tidak valid, atau akun tidak ditemukan.
   */
  verifyToken(token) {
    if (!token) {
      throw new AuthenticationError('Sesi login tidak ditemukan. Silakan login terlebih dahulu.');
    }
    let decoded;
    try {
      decoded = jwt.verify(token, this.jwtSecret);
    } catch {
      throw new AuthenticationError('Sesi login telah berakhir atau tidak valid. Silakan login kembali.');
    }

    const user = this.userRepository.findById(decoded.sub);
    if (!user) {
      throw new AuthenticationError('Akun pengguna tidak ditemukan.');
    }
    return user;
  }

  /**
   * Mengambil daftar penyewa terdaftar untuk halaman verifikasi Admin.
   *
   * @param {Object} [filters={}] - Filter opsional status dan kata kunci pencarian.
   * @param {string} [filters.status] - Filter status ('PENDING', 'APPROVED', 'REJECTED').
   * @param {string} [filters.search] - Kata kunci pencarian nama, NIK, email, atau nomor telepon.
   * @returns {import('../models/Tenant')[]} Daftar entitas Tenant yang cocok.
   * @throws {ValidationError} Jika filter status tidak valid.
   */
  listTenants(filters = {}) {
    if (
      filters.status &&
      !Object.values(APPROVAL_STATUS).includes(filters.status)
    ) {
      throw new ValidationError(
        `Status persetujuan tidak valid: "${filters.status}".`
      );
    }
    return this.userRepository.listTenants(filters);
  }

  /**
   * Menyetujui (APPROVED) atau menolak (REJECTED) pendaftaran penyewa setelah Admin memeriksa NIK/KTP.
   *
   * @param {string} tenantUserId - UUID pengguna penyewa target.
   * @param {string} decision - Keputusan verifikasi ('APPROVED' atau 'REJECTED').
   * @returns {import('../models/Tenant')} Entitas Tenant dengan status terbaru.
   * @throws {ValidationError} Jika keputusan bukan APPROVED atau REJECTED.
   * @throws {NotFoundError} Jika data penyewa tidak ditemukan.
   */
  verifyTenant(tenantUserId, decision) {
    const validDecisions = [APPROVAL_STATUS.APPROVED, APPROVAL_STATUS.REJECTED];
    if (!validDecisions.includes(decision)) {
      throw new ValidationError(
        'Keputusan verifikasi harus berupa APPROVED atau REJECTED.'
      );
    }

    const tenant = this.userRepository.findTenantByUserId(tenantUserId);
    if (!tenant || tenant.role !== USER_ROLES.TENANT) {
      throw new NotFoundError('Data penyewa tidak ditemukan.');
    }

    return this.userRepository.updateTenantApprovalStatus(tenantUserId, decision);
  }
}

module.exports = AuthService;
