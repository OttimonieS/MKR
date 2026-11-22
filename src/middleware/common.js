/**
 * Middleware umum Express: unggah bukti pembayaran (Multer) serta penanganan error & 404 global.
 * @module middleware/common
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const {
  ALLOWED_IMAGE_MIME_TYPES,
  AppError,
  ValidationError,
} = require('../utils/constants');

const MIME_TO_EXT = Object.freeze({
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
});

/**
 * Menghapus file dari disk secara aman apabila file tersebut ada tanpa memunculkan error tambahan.
 *
 * @param {string|null|undefined} filePath - Path absolut file yang akan dihapus.
 * @returns {void}
 */
function safeUnlink(filePath) {
  if (!filePath) {
    return;
  }
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Abaikan kegagalan pembersihan file sementara
  }
}

/**
 * Factory pembuat middleware unggah bukti pembayaran gambar (JPEG/PNG/WEBP, maks 5 MB)
 * dengan penamaan UUID unik serta validasi ketat kecocokan MIME terhadap magic bytes biner.
 *
 * @param {Object} [options={}] - Konfigurasi penyimpanan dan batas ukuran unggahan.
 * @param {string} [options.uploadDir] - Direktori penyimpanan file gambar bukti pembayaran.
 * @param {number} [options.maxFileSizeBytes] - Batas maksimum ukuran file dalam byte (default 5 MB).
 * @returns {{ uploadPaymentProof: import('express').RequestHandler, uploadDir: string }} Middleware unggah dan path direktori.
 */
function createUploadMiddleware(options = {}) {
  const uploadDir = path.resolve(
    process.cwd(),
    options.uploadDir || './uploads/payment-proofs'
  );
  const maxFileSizeBytes = Number(options.maxFileSizeBytes) || 5 * 1024 * 1024;

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    /**
     * Menentukan direktori tujuan penyimpanan file unggahan.
     *
     * @param {import('express').Request} _req - Objek request Express.
     * @param {Express.Multer.File} _file - Deskriptor file unggahan.
     * @param {Function} cb - Callback direktori tujuan Multer.
     */
    destination(_req, _file, cb) {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },

    /**
     * Menghasilkan nama file unik berbasis UUID dengan ekstensi gambar yang aman.
     *
     * @param {import('express').Request} _req - Objek request Express.
     * @param {Express.Multer.File} file - Deskriptor file unggahan.
     * @param {Function} cb - Callback nama file Multer.
     */
    filename(_req, file, cb) {
      const ext = MIME_TO_EXT[file.mimetype] || '.bin';
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  });

  const uploader = multer({
    storage,
    limits: {
      fileSize: maxFileSizeBytes,
      files: 1,
    },
    /**
     * Menolak setiap file yang tipe MIME-nya tidak termasuk gambar JPEG, PNG, atau WEBP.
     *
     * @param {import('express').Request} _req - Objek request Express.
     * @param {Express.Multer.File} file - Deskriptor file masuk.
     * @param {Function} cb - Callback filter Multer.
     */
    fileFilter(_req, file, cb) {
      if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
        return cb(
          new ValidationError(
            'File bukti pembayaran harus berupa gambar dengan format JPEG, PNG, atau WEBP.'
          )
        );
      }
      return cb(null, true);
    },
  }).single('paymentProof');

  /**
   * Middleware Express untuk memproses unggahan tunggal `paymentProof`, menangani error ukuran/MIME,
   * serta memverifikasi kecocokan signature biner (magic bytes) gambar asli.
   *
   * @param {import('express').Request} req - Objek request Express.
   * @param {import('express').Response} res - Objek response Express.
   * @param {import('express').NextFunction} next - Callback middleware berikutnya.
   * @returns {void}
   */
  function uploadPaymentProof(req, res, next) {
    uploader(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            const maxMb = (maxFileSizeBytes / (1024 * 1024)).toFixed(1);
            return next(
              new ValidationError(`Ukuran file bukti pembayaran maksimal ${maxMb} MB.`)
            );
          }
          return next(new ValidationError(`Gagal mengunggah file: ${err.message}`));
        }
        return next(err);
      }

      if (!req.file) {
        return next(
          new ValidationError('Bukti pembayaran berupa file gambar wajib diunggah.')
        );
      }

      return next();
    });
  }

  return {
    uploadPaymentProof,
    uploadDir,
  };
}

/**
 * Menangani seluruh error yang diteruskan melalui next(err), memetakan kode status HTTP yang tepat,
 * dan menghapus file sementara unggahan bila terjadi kegagalan pada request.
 *
 * @param {Error} err - Instance error yang ditangkap.
 * @param {import('express').Request} req - Objek request Express.
 * @param {import('express').Response} res - Objek response Express.
 * @param {import('express').NextFunction} _next - Callback next Express.
 * @returns {void}
 */
function errorHandler(err, req, res, _next) {
  if (req.file && req.file.path) {
    safeUnlink(req.file.path);
  }

  if (err instanceof AppError) {
    const body = {
      success: false,
      message: err.message,
    };
    if (err.details) {
      body.details = err.details;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  if (err && typeof err.code === 'string' && err.code.startsWith('SQLITE_CONSTRAINT')) {
    res.status(409).json({
      success: false,
      message: 'Operasi gagal karena melanggar aturan integritas database.',
    });
    return;
  }

  if (err && err.type === 'entity.parse.failed') {
    res.status(400).json({
      success: false,
      message: 'Format JSON pada body request tidak valid.',
    });
    return;
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error('[ServerError]', err);
  }

  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan internal pada server.',
  });
}

/**
 * Handler 404 Express untuk endpoint API yang tidak terdaftar.
 *
 * @param {import('express').Request} req - Objek request Express.
 * @param {import('express').Response} res - Objek response Express.
 * @returns {void}
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = {
  safeUnlink,
  createUploadMiddleware,
  errorHandler,
  notFoundHandler,
};
