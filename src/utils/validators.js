/**
 * Utilitas validasi input pengguna dan format mata uang Rupiah.
 * @module utils/validators
 */

const { ValidationError } = require('./constants');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NIK_REGEX = /^\d{16}$/;
const PHONE_REGEX = /^[0-9+\-\s()]{8,20}$/;

/**
 * Memvalidasi dan menormalisasi alamat email menjadi huruf kecil.
 *
 * @param {string} email - Alamat email mentah.
 * @returns {string} Alamat email ternormalisasi.
 * @throws {ValidationError} Jika format email tidak valid.
 */
function validateEmail(email) {
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    throw new ValidationError('Format email tidak valid.');
  }
  return email.trim().toLowerCase();
}

/**
 * Memvalidasi NIK 16 digit angka sesuai KTP.
 *
 * @param {string} nik - Kandidat NIK.
 * @returns {string} NIK 16 digit tervalidasi.
 * @throws {ValidationError} Jika NIK bukan tepat 16 digit angka.
 */
function validateNik(nik) {
  const cleaned = typeof nik === 'string' ? nik.trim() : '';
  if (!NIK_REGEX.test(cleaned)) {
    throw new ValidationError('NIK harus terdiri dari tepat 16 digit angka.');
  }
  return cleaned;
}

/**
 * Memvalidasi nama lengkap pengguna (2..100 karakter).
 *
 * @param {string} fullName - Kandidat nama lengkap.
 * @returns {string} Nama lengkap yang sudah di-trim.
 * @throws {ValidationError} Jika nama terlalu pendek atau terlalu panjang.
 */
function validateFullName(fullName) {
  const cleaned = typeof fullName === 'string' ? fullName.trim() : '';
  if (cleaned.length < 2 || cleaned.length > 100) {
    throw new ValidationError('Nama lengkap harus terdiri dari 2 sampai 100 karakter.');
  }
  return cleaned;
}

/**
 * Memvalidasi nomor telepon pengguna.
 *
 * @param {string} phone - Kandidat nomor telepon.
 * @returns {string} Nomor telepon yang sudah di-trim.
 * @throws {ValidationError} Jika format nomor telepon tidak valid.
 */
function validatePhone(phone) {
  const cleaned = typeof phone === 'string' ? phone.trim() : '';
  if (!PHONE_REGEX.test(cleaned)) {
    throw new ValidationError('Nomor telepon tidak valid (minimal 8 karakter angka).');
  }
  return cleaned;
}

/**
 * Memvalidasi panjang minimum (6 karakter) dan maksimum (128 karakter) password.
 *
 * @param {string} password - Password plaintext.
 * @returns {string} Password tervalidasi.
 * @throws {ValidationError} Jika password tidak memenuhi ketentuan.
 */
function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 6) {
    throw new ValidationError('Password minimal terdiri dari 6 karakter.');
  }
  if (password.length > 128) {
    throw new ValidationError('Password maksimal 128 karakter.');
  }
  return password;
}

module.exports = {
  validateEmail,
  validateNik,
  validateFullName,
  validatePhone,
  validatePassword,
};
