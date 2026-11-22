/**
 * Utilitas perhitungan inti bisnis (pemrograman terstruktur murni):
 * - Tanggal date-only aman timezone Asia/Jakarta, tahun kabisat, dan tanggal selesai inklusif.
 * - Kompatibilitas tipe kendaraan dan tipe garasi.
 * - Tarif harian, bulanan (25×), pengisian listrik mobil listrik, dan biaya perpanjangan sewa.
 * @module utils/rentalMath
 */

const {
  APP_TIMEZONE,
  GARAGE_TYPES,
  GARAGE_TYPE_LABELS,
  VEHICLE_TYPES,
  VEHICLE_TYPE_LABELS,
  VEHICLE_GARAGE_COMPATIBILITY,
  RENTAL_TYPES,
  MONTHLY_RATE_MULTIPLIER,
  ValidationError,
} = require('./constants');

const DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/* ==================== Perhitungan Tanggal (Date-Only UTC & Asia/Jakarta) ==================== */

/**
 * Menentukan apakah tahun Gregorian tertentu merupakan tahun kabisat.
 *
 * @param {number} year - Tahun kalender 4 digit (misalnya 2028).
 * @returns {boolean} True jika tahun kabisat, false jika bukan.
 * @throws {ValidationError} Jika tahun bukan bilangan bulat valid (1..9999).
 */
function isLeapYear(year) {
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new ValidationError('Tahun harus berupa bilangan bulat antara 1 sampai 9999.');
  }
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Menghitung jumlah hari kalender pada bulan dan tahun tertentu (28, 29, 30, atau 31).
 *
 * @param {number} year - Tahun kalender.
 * @param {number} month - Nomor bulan (1..12).
 * @returns {number} Jumlah hari dalam bulan tersebut.
 * @throws {ValidationError} Jika tahun atau bulan tidak valid.
 */
function getDaysInMonth(year, month) {
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new ValidationError('Tahun tidak valid.');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new ValidationError('Bulan harus berupa bilangan bulat antara 1 sampai 12.');
  }
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Mem-parsing dan memvalidasi ketat string tanggal YYYY-MM-DD menjadi komponen angka.
 *
 * @param {string} dateStr - Tanggal dalam format YYYY-MM-DD.
 * @returns {{ year: number, month: number, day: number }} Komponen tahun, bulan, dan hari.
 * @throws {ValidationError} Jika format atau tanggal kalender tidak valid (misalnya 2026-02-29).
 */
function parseDateParts(dateStr) {
  if (typeof dateStr !== 'string') {
    throw new ValidationError('Tanggal harus berupa string dengan format YYYY-MM-DD.');
  }
  const match = DATE_REGEX.exec(dateStr.trim());
  if (!match) {
    throw new ValidationError(`Format tanggal tidak valid: "${dateStr}". Gunakan format YYYY-MM-DD.`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > getDaysInMonth(year, month)) {
    throw new ValidationError(`Tanggal kalender tidak valid: "${dateStr}".`);
  }
  return { year, month, day };
}

/**
 * Memeriksa apakah suatu string merupakan tanggal YYYY-MM-DD yang valid tanpa melempar error.
 *
 * @param {string} dateStr - String tanggal kandidat.
 * @returns {boolean} True jika valid, false jika tidak.
 */
function isValidDateString(dateStr) {
  try {
    parseDateParts(dateStr);
    return true;
  } catch {
    return false;
  }
}

/**
 * Menambahkan sejumlah hari (bilangan bulat) ke tanggal YYYY-MM-DD secara aman tanpa pergeseran timezone.
 *
 * @param {string} dateStr - Tanggal dasar (YYYY-MM-DD).
 * @param {number} days - Jumlah hari bertanda yang ditambahkan.
 * @returns {string} Tanggal hasil penjumlahan (YYYY-MM-DD).
 * @throws {ValidationError} Jika tanggal atau jumlah hari tidak valid.
 */
function addDays(dateStr, days) {
  if (!Number.isInteger(days)) {
    throw new ValidationError('Jumlah hari yang ditambahkan harus berupa bilangan bulat.');
  }
  const { year, month, day } = parseDateParts(dateStr);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  const yyyy = String(utc.getUTCFullYear()).padStart(4, '0');
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utc.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Menghitung selisih hari bertanda antara dua tanggal YYYY-MM-DD (`endDate - startDate`).
 *
 * @param {string} startDate - Tanggal awal (YYYY-MM-DD).
 * @param {string} endDate - Tanggal akhir (YYYY-MM-DD).
 * @returns {number} Selisih hari dalam bilangan bulat.
 * @throws {ValidationError} Jika salah satu tanggal tidak valid.
 */
function diffDays(startDate, endDate) {
  const s = parseDateParts(startDate);
  const e = parseDateParts(endDate);
  return Math.round(
    (Date.UTC(e.year, e.month - 1, e.day) - Date.UTC(s.year, s.month - 1, s.day)) / MS_PER_DAY
  );
}

/**
 * Menghitung jumlah hari secara inklusif dari startDate sampai endDate.
 *
 * @param {string} startDate - Tanggal mulai inklusif (YYYY-MM-DD).
 * @param {string} endDate - Tanggal selesai inklusif (YYYY-MM-DD).
 * @returns {number} Jumlah hari inklusif.
 * @throws {ValidationError} Jika tanggal tidak valid atau endDate < startDate.
 */
function diffDaysInclusive(startDate, endDate) {
  const delta = diffDays(startDate, endDate);
  if (delta < 0) {
    throw new ValidationError('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
  }
  return delta + 1;
}

/**
 * Menghitung tanggal selesai sewa inklusif (`Tanggal Mulai + Durasi Hari - 1 Hari`).
 *
 * @param {string} startDate - Tanggal mulai sewa (YYYY-MM-DD).
 * @param {number} durationDays - Total durasi sewa (bilangan bulat minimal 1).
 * @returns {string} Tanggal selesai sewa (YYYY-MM-DD).
 * @throws {ValidationError} Jika tanggal mulai atau durasi tidak valid.
 */
function calculateEndDate(startDate, durationDays) {
  parseDateParts(startDate);
  if (!Number.isInteger(durationDays) || durationDays < 1) {
    throw new ValidationError('Durasi penyewaan harus berupa bilangan bulat minimal 1 hari.');
  }
  return addDays(startDate, durationDays - 1);
}

/**
 * Menghitung batas maksimal durasi sewa harian untuk bulan dari startDate (`jumlah hari bulan - 1`).
 *
 * @param {string} startDate - Tanggal mulai sewa (YYYY-MM-DD).
 * @returns {number} Maksimal hari sewa harian (27, 28, 29, atau 30).
 * @throws {ValidationError} Jika tanggal mulai tidak valid.
 */
function getMaxDailyDuration(startDate) {
  const { year, month } = parseDateParts(startDate);
  return getDaysInMonth(year, month) - 1;
}

/**
 * Memeriksa apakah dua rentang tanggal tertutup [startA, endA] dan [startB, endB] saling bertabrakan.
 *
 * @param {string} startA - Awal periode A (YYYY-MM-DD).
 * @param {string} endA - Akhir periode A (YYYY-MM-DD).
 * @param {string} startB - Awal periode B (YYYY-MM-DD).
 * @param {string} endB - Akhir periode B (YYYY-MM-DD).
 * @returns {boolean} True jika kedua periode bertabrakan.
 * @throws {ValidationError} Jika ada tanggal yang tidak valid.
 */
function datesOverlap(startA, endA, startB, endB) {
  parseDateParts(startA);
  parseDateParts(endA);
  parseDateParts(startB);
  parseDateParts(endB);
  return startA <= endB && endA >= startB;
}

/**
 * Mengambil tanggal hari ini pada zona waktu Asia/Jakarta dalam format YYYY-MM-DD.
 *
 * @param {Date} [now=new Date()] - Objek Date referensi (dapat diinjeksi saat testing).
 * @returns {string} Tanggal hari ini (YYYY-MM-DD WIB).
 * @throws {ValidationError} Jika objek Date tidak valid.
 */
function getTodayInJakarta(now = new Date()) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new ValidationError('Objek waktu tidak valid.');
  }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * Memformat objek Date menjadi timestamp ISO-8601 pada zona waktu Asia/Jakarta (+07:00).
 *
 * @param {Date} [now=new Date()] - Objek Date referensi.
 * @returns {string} Timestamp ISO-8601 (`YYYY-MM-DDTHH:mm:ss+07:00`).
 * @throws {ValidationError} Jika objek Date tidak valid.
 */
function getJakartaTimestamp(now = new Date()) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new ValidationError('Objek waktu tidak valid.');
  }
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const get = (t) => parts.find((p) => p.type === t).value;
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:${get('second')}+07:00`;
}

/* ==================== Kompatibilitas Kendaraan & Garasi ==================== */

/**
 * Mengembalikan daftar tipe garasi (`BIKE`, `CAR`, `EV`) yang diizinkan untuk suatu tipe kendaraan.
 *
 * @param {string} vehicleType - Kode tipe kendaraan.
 * @returns {string[]} Daftar tipe garasi yang kompatibel.
 * @throws {ValidationError} Jika tipe kendaraan tidak dikenali.
 */
function getAllowedGarageTypes(vehicleType) {
  if (!vehicleType || !Object.values(VEHICLE_TYPES).includes(vehicleType)) {
    throw new ValidationError(`Tipe kendaraan tidak valid: "${vehicleType}".`);
  }
  return [...VEHICLE_GARAGE_COMPATIBILITY[vehicleType]];
}

/**
 * Memeriksa kecocokan antara tipe kendaraan dan tipe garasi.
 *
 * @param {string} vehicleType - Kode tipe kendaraan.
 * @param {string} garageType - Kode tipe garasi ('BIKE', 'CAR', 'EV').
 * @returns {boolean} True jika kompatibel, false jika tidak.
 * @throws {ValidationError} Jika salah satu kode tipe tidak valid.
 */
function isVehicleCompatibleWithGarage(vehicleType, garageType) {
  const allowed = getAllowedGarageTypes(vehicleType);
  if (!garageType || !Object.values(GARAGE_TYPES).includes(garageType)) {
    throw new ValidationError(`Tipe garasi tidak valid: "${garageType}".`);
  }
  return allowed.includes(garageType);
}

/**
 * Memvalidasi kompatibilitas kendaraan terhadap garasi dan melempar ValidationError jika tidak cocok.
 *
 * @param {string} vehicleType - Kode tipe kendaraan.
 * @param {string} garageType - Kode tipe garasi tujuan.
 * @returns {true} Mengembalikan true jika kompatibel.
 * @throws {ValidationError} Jika kendaraan tidak diperbolehkan pada tipe garasi tersebut.
 */
function validateVehicleCompatibility(vehicleType, garageType) {
  if (!isVehicleCompatibleWithGarage(vehicleType, garageType)) {
    const vLabel = VEHICLE_TYPE_LABELS[vehicleType] || vehicleType;
    const gLabel = GARAGE_TYPE_LABELS[garageType] || garageType;
    const allowedLabels = getAllowedGarageTypes(vehicleType)
      .map((gt) => GARAGE_TYPE_LABELS[gt] || gt)
      .join(' atau ');
    throw new ValidationError(
      `Kendaraan tipe ${vLabel} tidak kompatibel dengan ${gLabel}. Garasi yang diperbolehkan: ${allowedLabels}.`
    );
  }
  return true;
}

/* ==================== Perhitungan Biaya Sewa, Listrik & Perpanjangan ==================== */

/**
 * Membulatkan nilai nominal uang ke bilangan bulat Rupiah (INTEGER) agar bebas galat floating-point.
 *
 * @param {number} amount - Nilai nominal mentah.
 * @returns {number} Nilai bilangan bulat Rupiah.
 * @throws {ValidationError} Jika amount bukan angka berhingga yang valid.
 */
function roundCurrency(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new ValidationError('Nilai nominal harus berupa angka yang valid.');
  }
  return Math.round(amount);
}

/**
 * Memvalidasi aturan durasi penyewaan baru (maksimal 1 periode bulanan sesuai bulan tanggal mulai).
 *
 * @param {string} startDate - Tanggal mulai sewa (YYYY-MM-DD).
 * @param {string} rentalType - Tipe sewa ('DAILY' atau 'MONTHLY').
 * @param {number|null|undefined} [requestedDurationDays] - Jumlah hari permintaan (wajib untuk DAILY).
 * @returns {{ durationDays: number, monthlyDays: number, maxDailyDays: number }} Durasi tervalidasi dan batas bulan.
 * @throws {ValidationError} Jika tipe sewa atau durasi tidak valid.
 */
function validateRentalDuration(startDate, rentalType, requestedDurationDays) {
  const { year, month } = parseDateParts(startDate);
  const monthlyDays = getDaysInMonth(year, month);
  const maxDailyDays = monthlyDays - 1;

  if (!Object.values(RENTAL_TYPES).includes(rentalType)) {
    throw new ValidationError(`Tipe sewa tidak valid: "${rentalType}". Gunakan DAILY atau MONTHLY.`);
  }

  if (rentalType === RENTAL_TYPES.MONTHLY) {
    if (requestedDurationDays !== undefined && requestedDurationDays !== null && requestedDurationDays !== '') {
      const parsed = Number(requestedDurationDays);
      if (!Number.isInteger(parsed) || parsed !== monthlyDays) {
        throw new ValidationError(
          `Sewa bulanan untuk bulan ini otomatis berdurasi ${monthlyDays} hari (tidak dapat melebihi satu periode bulanan).`
        );
      }
    }
    return { durationDays: monthlyDays, monthlyDays, maxDailyDays };
  }

  const parsedDays = Number(requestedDurationDays);
  if (!Number.isInteger(parsedDays) || parsedDays < 1) {
    throw new ValidationError('Durasi sewa harian harus berupa bilangan bulat minimal 1 hari.');
  }
  if (parsedDays > maxDailyDays) {
    throw new ValidationError(
      `Durasi sewa harian maksimal untuk bulan ini adalah ${maxDailyDays} hari. Untuk durasi ${monthlyDays} hari gunakan tipe sewa BULANAN.`
    );
  }
  return { durationDays: parsedDays, monthlyDays, maxDailyDays };
}

/**
 * Menghitung biaya sewa harian (`durationDays × dailyRate`).
 *
 * @param {number} durationDays - Jumlah hari sewa (bilangan bulat positif).
 * @param {number} dailyRate - Tarif sewa harian (positif).
 * @returns {number} Biaya sewa harian dalam Rupiah bulat.
 * @throws {ValidationError} Jika durationDays atau dailyRate tidak valid.
 */
function calculateDailyRentalFee(durationDays, dailyRate) {
  if (!Number.isInteger(durationDays) || durationDays < 1) {
    throw new ValidationError('Jumlah hari sewa harus berupa bilangan bulat minimal 1.');
  }
  if (typeof dailyRate !== 'number' || !Number.isFinite(dailyRate) || dailyRate <= 0) {
    throw new ValidationError('Harga sewa harian harus berupa angka positif.');
  }
  return roundCurrency(durationDays * dailyRate);
}

/**
 * Menghitung biaya sewa bulanan (`25 × dailyRate`).
 *
 * @param {number} dailyRate - Tarif sewa harian (positif).
 * @returns {number} Biaya sewa bulanan dalam Rupiah bulat.
 * @throws {ValidationError} Jika dailyRate tidak valid.
 */
function calculateMonthlyRentalFee(dailyRate) {
  if (typeof dailyRate !== 'number' || !Number.isFinite(dailyRate) || dailyRate <= 0) {
    throw new ValidationError('Harga sewa harian harus berupa angka positif.');
  }
  return roundCurrency(MONTHLY_RATE_MULTIPLIER * dailyRate);
}

/**
 * Menghitung biaya sewa dasar berdasarkan tipe sewa (DAILY atau MONTHLY).
 *
 * @param {string} rentalType - 'DAILY' atau 'MONTHLY'.
 * @param {number} durationDays - Durasi penyewaan dalam hari.
 * @param {number} dailyRate - Tarif sewa harian garasi.
 * @returns {number} Biaya sewa dasar.
 * @throws {ValidationError} Jika tipe sewa, durasi, atau tarif tidak valid.
 */
function calculateRentalFee(rentalType, durationDays, dailyRate) {
  if (rentalType === RENTAL_TYPES.MONTHLY) {
    return calculateMonthlyRentalFee(dailyRate);
  }
  if (rentalType === RENTAL_TYPES.DAILY) {
    return calculateDailyRentalFee(durationDays, dailyRate);
  }
  throw new ValidationError(`Tipe sewa tidak valid: "${rentalType}".`);
}

/**
 * Menghitung biaya pengisian listrik 1× transaksi berdasarkan sisa kapasitas yang perlu diisi hingga 100%:
 * `Kapasitas Baterai × ((100 - Persentase Baterai Sekarang) / 100) × Tarif per kWh`,
 * khusus untuk kendaraan ELECTRIC_CAR pada Garasi Mobil Listrik (EV).
 *
 * @param {string} vehicleType - Kode tipe kendaraan.
 * @param {string} garageType - Kode tipe garasi ('BIKE', 'CAR', 'EV').
 * @param {number|null|undefined} batteryCapacityKwh - Kapasitas total baterai (kWh).
 * @param {number|null|undefined} electricityRatePerKwh - Tarif pengisian listrik per kWh.
 * @param {number|null|undefined} [currentBatteryPercent=0] - Persentase baterai saat ini (0–100%).
 * @returns {number} Biaya pengisian listrik dalam Rupiah bulat (0 jika bukan EV di Garasi EV atau baterai 100%).
 * @throws {ValidationError} Jika kapasitas baterai, persentase baterai, atau tarif listrik tidak valid.
 */
function calculateElectricityFee(
  vehicleType,
  garageType,
  batteryCapacityKwh,
  electricityRatePerKwh,
  currentBatteryPercent = 0
) {
  if (vehicleType !== VEHICLE_TYPES.ELECTRIC_CAR || garageType !== GARAGE_TYPES.EV) {
    return 0;
  }
  if (typeof batteryCapacityKwh !== 'number' || !Number.isFinite(batteryCapacityKwh) || batteryCapacityKwh <= 0) {
    throw new ValidationError('Kapasitas baterai (kWh) harus berupa angka positif untuk mobil listrik.');
  }
  const percent =
    currentBatteryPercent === null || currentBatteryPercent === undefined || currentBatteryPercent === ''
      ? 0
      : Number(currentBatteryPercent);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new ValidationError('Persentase baterai sekarang harus berada antara 0% sampai 100%.');
  }
  if (typeof electricityRatePerKwh !== 'number' || !Number.isFinite(electricityRatePerKwh) || electricityRatePerKwh <= 0) {
    throw new ValidationError('Tarif listrik per kWh pada Garasi Mobil Listrik tidak valid.');
  }
  const chargeFraction = (100 - percent) / 100;
  const kwhToCharge = batteryCapacityKwh * chargeFraction;
  return roundCurrency(kwhToCharge * electricityRatePerKwh);
}

/**
 * Menghitung rincian total biaya penyewaan baru (`Biaya Sewa + Biaya Pengisian Listrik`).
 *
 * @param {Object} params - Parameter perhitungan biaya sewa.
 * @returns {{ rentalFee: number, electricityFee: number, totalAmount: number }} Rincian biaya sewa.
 * @throws {ValidationError} Jika ada parameter biaya yang tidak valid.
 */
function calculateTotalRentalCost({
  vehicleType,
  garageType,
  rentalType,
  durationDays,
  dailyRate,
  batteryCapacityKwh = null,
  currentBatteryPercent = 0,
  electricityRatePerKwh = null,
}) {
  const rentalFee = calculateRentalFee(rentalType, durationDays, dailyRate);
  const electricityFee = calculateElectricityFee(
    vehicleType,
    garageType,
    batteryCapacityKwh,
    electricityRatePerKwh,
    currentBatteryPercent
  );
  return {
    rentalFee,
    electricityFee,
    totalAmount: roundCurrency(rentalFee + electricityFee),
  };
}

/**
 * Memvalidasi tanggal selesai baru pada perpanjangan (wajib lebih besar dari tanggal selesai sebelumnya).
 *
 * @param {string} previousEndDate - Tanggal selesai saat ini (YYYY-MM-DD).
 * @param {string} newEndDate - Tanggal selesai baru (YYYY-MM-DD).
 * @returns {{ extensionStartDate: string, addedDays: number }} Tanggal mulai perpanjangan dan jumlah hari tambahan.
 * @throws {ValidationError} Jika tanggal tidak valid atau newEndDate <= previousEndDate.
 */
function validateExtensionDate(previousEndDate, newEndDate) {
  parseDateParts(previousEndDate);
  parseDateParts(newEndDate);
  const addedDays = diffDays(previousEndDate, newEndDate);
  if (addedDays <= 0) {
    throw new ValidationError('Tanggal selesai baru harus lebih besar dari tanggal selesai sebelumnya.');
  }
  return {
    extensionStartDate: addDays(previousEndDate, 1),
    addedDays,
  };
}

/**
 * Menghitung biaya perpanjangan sewa berdasarkan blok bulanan kalender (`25 × tarif harian`)
 * ditambah sisa hari (`sisa hari × tarif harian`). Selalu bernilai positif.
 *
 * @param {string} previousEndDate - Tanggal selesai saat ini (YYYY-MM-DD).
 * @param {string} newEndDate - Tanggal selesai baru (YYYY-MM-DD).
 * @param {number} dailyRate - Tarif sewa harian garasi.
 * @returns {Object} Rincian lengkap blok bulanan, sisa hari, dan total biaya perpanjangan.
 * @throws {ValidationError} Jika tanggal tidak valid, newEndDate <= previousEndDate, atau dailyRate <= 0.
 */
function calculateExtensionFee(previousEndDate, newEndDate, dailyRate) {
  if (typeof dailyRate !== 'number' || !Number.isFinite(dailyRate) || dailyRate <= 0) {
    throw new ValidationError('Harga sewa harian harus berupa angka positif.');
  }

  const { extensionStartDate, addedDays } = validateExtensionDate(previousEndDate, newEndDate);
  let cursorDate = extensionStartDate;
  let remainingDays = addedDays;
  let monthlyBlocks = 0;
  const blockDetails = [];

  while (remainingDays > 0) {
    const { year, month } = parseDateParts(cursorDate);
    const daysInBlockMonth = getDaysInMonth(year, month);
    if (remainingDays >= daysInBlockMonth) {
      monthlyBlocks += 1;
      blockDetails.push({
        startDate: cursorDate,
        endDate: addDays(cursorDate, daysInBlockMonth - 1),
        days: daysInBlockMonth,
        fee: calculateMonthlyRentalFee(dailyRate),
      });
      remainingDays -= daysInBlockMonth;
      cursorDate = addDays(cursorDate, daysInBlockMonth);
    } else {
      break;
    }
  }

  const monthlyFee = roundCurrency(monthlyBlocks * MONTHLY_RATE_MULTIPLIER * dailyRate);
  const remainingDailyFee = remainingDays > 0 ? calculateDailyRentalFee(remainingDays, dailyRate) : 0;

  return {
    extensionStartDate,
    addedDays,
    monthlyBlocks,
    remainingDays,
    blockDetails,
    monthlyFee,
    remainingDailyFee,
    extensionAmount: roundCurrency(monthlyFee + remainingDailyFee),
  };
}

module.exports = {
  isLeapYear,
  getDaysInMonth,
  parseDateParts,
  isValidDateString,
  addDays,
  diffDays,
  diffDaysInclusive,
  calculateEndDate,
  getMaxDailyDuration,
  datesOverlap,
  getTodayInJakarta,
  getJakartaTimestamp,
  getAllowedGarageTypes,
  isVehicleCompatibleWithGarage,
  validateVehicleCompatibility,
  roundCurrency,
  validateRentalDuration,
  calculateDailyRentalFee,
  calculateMonthlyRentalFee,
  calculateRentalFee,
  calculateElectricityFee,
  calculateTotalRentalCost,
  validateExtensionDate,
  calculateExtensionFee,
};
