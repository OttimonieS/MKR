/**
 * Entitas Domain Berorientasi Objek (OOP) untuk Garage Rental Management System.
 * Mencakup pewarisan (User <- Tenant, Admin), konfigurasi tipe garasi & generator urutan
 * (GarageTypeConfig, GarageSequence, Garage), komposisi kendaraan (Rental *-- Vehicle),
 * serta histori perpanjangan (RentalExtension).
 * @module models/entities
 */

const {
  USER_ROLES,
  APPROVAL_STATUS,
  GARAGE_TYPES,
  GARAGE_TYPE_IDS,
  GARAGE_TYPE_PREFIX,
  GARAGE_TYPE_LABELS,
  GARAGE_STATUS,
  VEHICLE_TYPES,
  VEHICLE_TYPE_LABELS,
  MONTHLY_RATE_MULTIPLIER,
  MAX_GARAGES_PER_TYPE,
  ValidationError,
} = require('../utils/constants');
const {
  roundCurrency,
  calculateEndDate,
  diffDaysInclusive,
  calculateRentalFee,
  calculateElectricityFee,
  calculateExtensionFee,
  isVehicleCompatibleWithGarage,
  validateVehicleCompatibility,
} = require('../utils/rentalMath');

/**
 * Kelas dasar abstrak pengguna sistem (diturunkan oleh Tenant dan Admin).
 */
class User {
  /**
   * Membuat instance User dan mencegah instansiasi langsung kelas abstrak.
   *
   * @param {Object} params - Properti dasar pengguna.
   * @throws {Error} Jika kelas abstrak User diinstansiasi secara langsung.
   */
  constructor({ id, email, role, createdAt, passwordHash = null }) {
    if (new.target === User) {
      throw new Error('Kelas abstrak User tidak dapat diinstansiasi secara langsung.');
    }
    this.id = id;
    this.email = email;
    this.role = role;
    this.createdAt = createdAt;
    this._passwordHash = passwordHash;
  }

  /**
   * Mengambil hash password internal khusus verifikasi autentikasi.
   *
   * @returns {string|null} Password yang tersimpan.
   */
  getPasswordHash() {
    return this._passwordHash;
  }

  /**
   * Menserialisasi atribut publik pengguna tanpa pernah mengekspos hash password.
   *
   * @returns {{ id: string, email: string, role: string, createdAt: string }} Objek JSON publik.
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      role: this.role,
      createdAt: this.createdAt,
    };
  }
}

/**
 * Entitas Penyewa (Tenant) yang mewarisi User beserta data KTP/NIK dan status verifikasi.
 * @extends User
 */
class Tenant extends User {
  /**
   * Membuat instance entitas Tenant.
   *
   * @param {Object} params - Atribut penyewa.
   */
  constructor({
    id,
    email,
    createdAt,
    nik,
    fullName,
    phone,
    approvalStatus = APPROVAL_STATUS.PENDING,
    passwordHash = null,
  }) {
    super({ id, email, role: USER_ROLES.TENANT, createdAt, passwordHash });
    this.nik = nik;
    this.fullName = fullName;
    this.phone = phone;
    this.approvalStatus = approvalStatus;
  }

  /**
   * Memeriksa apakah pendaftaran penyewa telah disetujui oleh Admin.
   *
   * @returns {boolean} True jika berstatus APPROVED.
   */
  isApproved() {
    return this.approvalStatus === APPROVAL_STATUS.APPROVED;
  }

  /**
   * Memeriksa apakah penyewa berhak membuat penyewaan garasi baru.
   *
   * @returns {boolean} True hanya untuk penyewa berstatus APPROVED.
   */
  canRent() {
    return this.isApproved();
  }

  /**
   * Menserialisasi data publik penyewa ke JSON secara aman.
   *
   * @returns {Object} Representasi JSON penyewa.
   */
  toJSON() {
    return {
      ...super.toJSON(),
      nik: this.nik,
      fullName: this.fullName,
      phone: this.phone,
      approvalStatus: this.approvalStatus,
    };
  }
}

/**
 * Entitas Administrator (Admin) yang mewarisi User.
 * @extends User
 */
class Admin extends User {
  /**
   * Membuat instance entitas Admin.
   *
   * @param {Object} params - Atribut administrator.
   */
  constructor({ id, email, fullName, createdAt, passwordHash = null }) {
    super({ id, email, role: USER_ROLES.ADMIN, createdAt, passwordHash });
    this.fullName = fullName;
  }

  /**
   * Menserialisasi data publik administrator ke JSON.
   *
   * @returns {Object} Representasi JSON administrator.
   */
  toJSON() {
    return {
      ...super.toJSON(),
      fullName: this.fullName,
    };
  }
}

/**
 * Entitas konfigurasi tipe garasi sesuai tabel garage_types (BIKE, CAR, EV).
 */
class GarageTypeConfig {
  /**
   * Membuat instance GarageTypeConfig.
   *
   * @param {Object} params - Atribut konfigurasi tipe garasi.
   */
  constructor({ typeId, name, codePrefix, dailyRate = 0, erPerKwh = null }) {
    this.typeId = Number(typeId);
    this.name = name;
    this.codePrefix = codePrefix;
    this.dailyRate = Number(dailyRate);
    this.erPerKwh = erPerKwh !== null && erPerKwh !== undefined ? Number(erPerKwh) : null;
  }

  /**
   * Menghitung tarif sewa bulanan (`25 × dailyRate`).
   *
   * @returns {number} Tarif bulanan dalam Rupiah.
   */
  getMonthlyRate() {
    return roundCurrency(this.dailyRate * MONTHLY_RATE_MULTIPLIER);
  }

  /**
   * Menserialisasi konfigurasi tipe garasi ke JSON.
   *
   * @returns {Object} Representasi JSON konfigurasi tipe garasi.
   */
  toJSON() {
    return {
      typeId: this.typeId,
      name: this.name,
      garageType: this.name,
      garageTypeLabel: GARAGE_TYPE_LABELS[this.name] || this.name,
      codePrefix: this.codePrefix,
      dailyRate: this.dailyRate,
      monthlyRate: this.getMonthlyRate(),
      erPerKwh: this.erPerKwh,
      electricityRatePerKwh: this.erPerKwh,
    };
  }
}

/**
 * Entitas penghitung urutan ID garasi otomatis (S001..S999, C001..C999, E001..E999).
 */
class GarageSequence {
  /**
   * Membuat instance GarageSequence.
   *
   * @param {Object} params - Properti counter urutan garasi.
   * @throws {ValidationError} Jika tipe garasi atau lastNumber tidak valid.
   */
  constructor({ garageType, typeId, lastNumber = 0 }) {
    if (!Object.values(GARAGE_TYPES).includes(garageType)) {
      throw new ValidationError(`Tipe garasi tidak valid: "${garageType}".`);
    }
    if (!Number.isInteger(lastNumber) || lastNumber < 0 || lastNumber > MAX_GARAGES_PER_TYPE) {
      throw new ValidationError(`Nomor urutan garasi harus antara 0 sampai ${MAX_GARAGES_PER_TYPE}.`);
    }
    this.typeId = typeId !== undefined ? Number(typeId) : GARAGE_TYPE_IDS[garageType];
    this.garageType = garageType;
    this.lastNumber = lastNumber;
    this.lastNum = lastNumber;
  }

  /**
   * Memformat angka urutan positif (1..999) menjadi ID garasi dengan prefix tipe (S/C/E).
   *
   * @param {string} garageType - Kode tipe garasi ('BIKE', 'CAR', 'EV').
   * @param {number} sequenceNumber - Nomor urut 1..999.
   * @returns {string} ID garasi otomatis (contoh: S001, C010, E005).
   * @throws {ValidationError} Jika tipe garasi atau nomor urut tidak valid.
   */
  static formatId(garageType, sequenceNumber) {
    const prefix = GARAGE_TYPE_PREFIX[garageType];
    if (!prefix) {
      throw new ValidationError(`Tipe garasi tidak valid: "${garageType}".`);
    }
    if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1 || sequenceNumber > MAX_GARAGES_PER_TYPE) {
      throw new ValidationError(`Nomor urut garasi harus antara 1 sampai ${MAX_GARAGES_PER_TYPE}.`);
    }
    return `${prefix}${String(sequenceNumber).padStart(3, '0')}`;
  }

  /**
   * Menaikkan counter sebesar 1 dan mengembalikan ID garasi otomatis berikutnya.
   *
   * @returns {string} ID garasi baru.
   * @throws {ValidationError} Jika batas 999 unit per tipe telah tercapai.
   */
  generateNextId() {
    if (this.lastNumber >= MAX_GARAGES_PER_TYPE) {
      throw new ValidationError(
        `Jumlah maksimum garasi (${MAX_GARAGES_PER_TYPE}) untuk tipe ${this.garageType} telah tercapai.`
      );
    }
    this.lastNumber += 1;
    this.lastNum = this.lastNumber;
    return GarageSequence.formatId(this.garageType, this.lastNumber);
  }
}

/**
 * Entitas unit garasi fisik yang terhubung dengan konfigurasi garage_types.
 */
class Garage {
  /**
   * Membuat instance entitas Garage.
   *
   * @param {Object} params - Atribut unit garasi.
   */
  constructor({
    id,
    typeId = null,
    garageType,
    codePrefix = null,
    dailyRate,
    electricityRatePerKwh = null,
    status = GARAGE_STATUS.AVAILABLE,
    createdAt = null,
  }) {
    this.id = id;
    this.garageId = id;
    this.typeId = typeId !== null && typeId !== undefined ? Number(typeId) : null;
    this.garageType = garageType;
    this.codePrefix = codePrefix;
    this.dailyRate = Number(dailyRate);
    this.electricityRatePerKwh =
      electricityRatePerKwh !== null && electricityRatePerKwh !== undefined
        ? Number(electricityRatePerKwh)
        : null;
    this.status = status;
    this.createdAt = createdAt;
  }

  /**
   * Mengembalikan status operasional garasi saat ini.
   *
   * @returns {string} 'AVAILABLE' atau 'USED'.
   */
  getStatus() {
    return this.status;
  }

  /**
   * Memeriksa apakah garasi berstatus AVAILABLE.
   *
   * @returns {boolean} True jika tersedia.
   */
  isAvailable() {
    return this.status === GARAGE_STATUS.AVAILABLE;
  }

  /**
   * Menghitung harga sewa bulanan (`25 × dailyRate`).
   *
   * @returns {number} Tarif bulanan.
   */
  getMonthlyRate() {
    return roundCurrency(this.dailyRate * MONTHLY_RATE_MULTIPLIER);
  }

  /**
   * Menserialisasi unit garasi menjadi JSON.
   *
   * @returns {Object} Representasi JSON garasi.
   */
  toJSON() {
    return {
      id: this.id,
      garageId: this.id,
      typeId: this.typeId,
      garageType: this.garageType,
      codePrefix: this.codePrefix,
      garageTypeLabel: GARAGE_TYPE_LABELS[this.garageType] || this.garageType,
      dailyRate: this.dailyRate,
      monthlyRate: this.getMonthlyRate(),
      electricityRatePerKwh: this.electricityRatePerKwh,
      status: this.status,
      createdAt: this.createdAt,
    };
  }
}

/**
 * Value Object kendaraan penyewa yang dikomposisikan di dalam entitas Rental.
 */
class Vehicle {
  /**
   * Membuat instance Vehicle.
   *
   * @param {Object} params - Informasi kendaraan.
   */
  constructor({
    vehicleType,
    plateNumber = null,
    brand,
    model,
    batteryCapacityKwh = null,
    currentBatteryPercent = null,
  }) {
    this.vehicleType = vehicleType;
    this.plateNumber =
      typeof plateNumber === 'string' && plateNumber.trim() !== ''
        ? plateNumber.trim().toUpperCase()
        : null;
    this.brand = typeof brand === 'string' ? brand.trim() : '';
    this.model = typeof model === 'string' ? model.trim() : '';
    this.batteryCapacityKwh =
      batteryCapacityKwh !== null && batteryCapacityKwh !== undefined && batteryCapacityKwh !== ''
        ? Number(batteryCapacityKwh)
        : null;
    this.currentBatteryPercent =
      currentBatteryPercent !== null &&
      currentBatteryPercent !== undefined &&
      currentBatteryPercent !== ''
        ? Number(currentBatteryPercent)
        : null;
  }

  /**
   * Memvalidasi seluruh atribut kendaraan (plat opsional khusus sepeda, baterai wajib positif & persen 0–100 khusus EV).
   *
   * @returns {true} True apabila seluruh atribut kendaraan valid.
   * @throws {ValidationError} Jika ada atribut yang melanggar aturan domain.
   */
  validate() {
    if (!Object.values(VEHICLE_TYPES).includes(this.vehicleType)) {
      throw new ValidationError(`Tipe kendaraan tidak valid: "${this.vehicleType}".`);
    }
    if (!this.brand || this.brand.length > 60) {
      throw new ValidationError('Merek kendaraan wajib diisi (maksimal 60 karakter).');
    }
    if (!this.model || this.model.length > 60) {
      throw new ValidationError('Tipe/model kendaraan wajib diisi (maksimal 60 karakter).');
    }

    if (this.vehicleType === VEHICLE_TYPES.BICYCLE) {
      this.plateNumber = null;
    } else if (!this.plateNumber || this.plateNumber.length > 25) {
      throw new ValidationError(
        'Nomor plat kendaraan wajib diisi untuk sepeda motor, mobil, dan mobil listrik.'
      );
    }

    if (this.vehicleType === VEHICLE_TYPES.ELECTRIC_CAR) {
      if (
        typeof this.batteryCapacityKwh !== 'number' ||
        !Number.isFinite(this.batteryCapacityKwh) ||
        this.batteryCapacityKwh <= 0
      ) {
        throw new ValidationError(
          'Kapasitas baterai (kWh) wajib diisi dengan angka positif untuk mobil listrik.'
        );
      }
      if (this.currentBatteryPercent === null) {
        this.currentBatteryPercent = 0;
      }
      if (
        typeof this.currentBatteryPercent !== 'number' ||
        !Number.isFinite(this.currentBatteryPercent) ||
        this.currentBatteryPercent < 0 ||
        this.currentBatteryPercent > 100
      ) {
        throw new ValidationError(
          'Persentase baterai sekarang harus berada antara 0% sampai 100%.'
        );
      }
    } else {
      this.batteryCapacityKwh = null;
      this.currentBatteryPercent = null;
    }
    return true;
  }

  /**
   * Memvalidasi kompatibilitas kendaraan dengan tipe garasi tujuan.
   *
   * @param {string} garageType - Kode tipe garasi ('BIKE', 'CAR', 'EV').
   * @returns {boolean} True jika kompatibel.
   * @throws {ValidationError} Jika tidak kompatibel.
   */
  validateCompatibility(garageType) {
    return validateVehicleCompatibility(this.vehicleType, garageType);
  }

  /**
   * Memeriksa kompatibilitas kendaraan tanpa melempar error.
   *
   * @param {string} garageType - Kode tipe garasi.
   * @returns {boolean} True jika kompatibel.
   */
  isCompatibleWith(garageType) {
    return isVehicleCompatibleWithGarage(this.vehicleType, garageType);
  }

  /**
   * Menserialisasi informasi kendaraan ke JSON.
   *
   * @returns {Object} Representasi JSON kendaraan.
   */
  toJSON() {
    return {
      vehicleType: this.vehicleType,
      vehicleTypeLabel: VEHICLE_TYPE_LABELS[this.vehicleType] || this.vehicleType,
      plateNumber: this.plateNumber,
      brand: this.brand,
      model: this.model,
      batteryCapacityKwh: this.batteryCapacityKwh,
      currentBatteryPercent: this.currentBatteryPercent,
    };
  }
}

/**
 * Entitas riwayat perpanjangan sewa yang diproses oleh Admin.
 */
class RentalExtension {
  /**
   * Membuat instance RentalExtension.
   *
   * @param {Object} params - Atribut perpanjangan sewa.
   */
  constructor({
    id,
    rentalId,
    adminUserId,
    adminName = null,
    previousEndDate,
    newEndDate,
    addedDays,
    extensionAmount,
    paymentProofPath,
    createdAt,
  }) {
    this.id = id;
    this.rentalId = rentalId;
    this.adminUserId = adminUserId;
    this.adminName = adminName;
    this.previousEndDate = previousEndDate;
    this.newEndDate = newEndDate;
    this.addedDays = Number(addedDays);
    this.extensionAmount = Number(extensionAmount);
    this.paymentProofPath = paymentProofPath;
    this.createdAt = createdAt;
  }

  /**
   * Menghitung rincian biaya perpanjangan untuk rentang tanggal dan tarif harian tertentu.
   *
   * @param {string} previousEndDate - Tanggal selesai lama (YYYY-MM-DD).
   * @param {string} newEndDate - Tanggal selesai baru (YYYY-MM-DD).
   * @param {number} dailyRate - Tarif sewa harian garasi.
   * @returns {Object} Rincian biaya perpanjangan.
   */
  static calculateExtensionFee(previousEndDate, newEndDate, dailyRate) {
    return calculateExtensionFee(previousEndDate, newEndDate, dailyRate);
  }

  /**
   * Menserialisasi catatan perpanjangan ke JSON.
   *
   * @returns {Object} Representasi JSON perpanjangan sewa.
   */
  toJSON() {
    return {
      id: this.id,
      rentalId: this.rentalId,
      adminUserId: this.adminUserId,
      adminName: this.adminName,
      previousEndDate: this.previousEndDate,
      newEndDate: this.newEndDate,
      addedDays: this.addedDays,
      extensionAmount: this.extensionAmount,
      paymentProofPath: this.paymentProofPath,
      paymentProofUrl: this.paymentProofPath
        ? `/api/uploads/payment-proofs/${this.paymentProofPath}`
        : null,
      createdAt: this.createdAt,
    };
  }
}

/**
 * Entitas transaksi penyewaan garasi yang merangkum kendaraan, jadwal, biaya, dan histori perpanjangan.
 */
class Rental {
  /**
   * Membuat instance entitas Rental.
   *
   * @param {Object} params - Properti transaksi penyewaan.
   */
  constructor({
    id,
    tenantUserId,
    garageId,
    vehicle,
    rentalType,
    durationDays,
    startDate,
    endDate,
    rentalFee,
    electricityFee,
    totalAmount,
    paymentProofPath,
    status,
    createdAt,
    garage = null,
    tenant = null,
    extensions = [],
  }) {
    this.id = id;
    this.tenantUserId = tenantUserId;
    this.garageId = garageId;
    this.vehicle = vehicle instanceof Vehicle ? vehicle : new Vehicle(vehicle);
    this.rentalType = rentalType;
    this.durationDays = Number(durationDays);
    this.startDate = startDate;
    this.endDate = endDate;
    this.rentalFee = Number(rentalFee);
    this.electricityFee = Number(electricityFee);
    this.totalAmount = Number(totalAmount);
    this.paymentProofPath = paymentProofPath;
    this.status = status;
    this.createdAt = createdAt;
    this.garage = garage;
    this.tenant = tenant;
    this.extensions = extensions;
  }

  /**
   * Menghitung biaya sewa dasar berdasarkan tarif harian garasi.
   *
   * @param {number} dailyRate - Tarif harian garasi.
   * @returns {number} Biaya sewa dasar.
   */
  calculateRentalFee(dailyRate) {
    return calculateRentalFee(this.rentalType, this.durationDays, dailyRate);
  }

  /**
   * Menghitung biaya pengisian listrik kendaraan untuk garasi tujuan.
   *
   * @param {string} garageType - Tipe garasi ('BIKE', 'CAR', 'EV').
   * @param {number|null} electricityRatePerKwh - Tarif listrik per kWh.
   * @returns {number} Biaya pengisian listrik.
   */
  calculateElectricityFee(garageType, electricityRatePerKwh) {
    return calculateElectricityFee(
      this.vehicle.vehicleType,
      garageType,
      this.vehicle.batteryCapacityKwh,
      electricityRatePerKwh,
      this.vehicle.currentBatteryPercent
    );
  }

  /**
   * Menghitung tanggal selesai inklusif dari startDate dan durasi awal.
   *
   * @returns {string} Tanggal selesai (YYYY-MM-DD).
   */
  calculateEndDate() {
    return calculateEndDate(this.startDate, this.durationDays);
  }

  /**
   * Menghitung total hari inklusif dari tanggal mulai sampai tanggal selesai terkini.
   *
   * @returns {number} Total durasi hari keseluruhan.
   */
  getTotalDurationDays() {
    return diffDaysInclusive(this.startDate, this.endDate);
  }

  /**
   * Menjumlahkan seluruh biaya perpanjangan pada transaksi ini.
   *
   * @returns {number} Total akumulasi biaya perpanjangan.
   */
  getTotalExtensionAmount() {
    return this.extensions.reduce((sum, ext) => sum + Number(ext.extensionAmount || 0), 0);
  }

  /**
   * Menserialisasi entitas penyewaan beserta relasinya ke objek JSON.
   *
   * @returns {Object} Objek JSON siap kirim ke API.
   */
  toJSON() {
    const vehicleJson = this.vehicle.toJSON();
    const totalExtensionAmount = this.getTotalExtensionAmount();
    return {
      id: this.id,
      tenantUserId: this.tenantUserId,
      garageId: this.garageId,
      vehicleType: vehicleJson.vehicleType,
      vehicleTypeLabel: vehicleJson.vehicleTypeLabel,
      plateNumber: vehicleJson.plateNumber,
      brand: vehicleJson.brand,
      model: vehicleJson.model,
      batteryCapacityKwh: vehicleJson.batteryCapacityKwh,
      currentBatteryPercent: vehicleJson.currentBatteryPercent,
      vehicle: vehicleJson,
      rentalType: this.rentalType,
      durationDays: this.durationDays,
      totalDurationDays: this.getTotalDurationDays(),
      startDate: this.startDate,
      endDate: this.endDate,
      rentalFee: this.rentalFee,
      electricityFee: this.electricityFee,
      totalAmount: this.totalAmount,
      totalExtensionAmount,
      grandTotalAmount: this.totalAmount + totalExtensionAmount,
      paymentProofPath: this.paymentProofPath,
      paymentProofUrl: this.paymentProofPath
        ? `/api/uploads/payment-proofs/${this.paymentProofPath}`
        : null,
      status: this.status,
      createdAt: this.createdAt,
      garage: this.garage
        ? {
            ...this.garage,
            garageTypeLabel: GARAGE_TYPE_LABELS[this.garage.garageType] || this.garage.garageType,
          }
        : null,
      tenant: this.tenant,
      extensions: this.extensions.map((ext) =>
        typeof ext.toJSON === 'function' ? ext.toJSON() : ext
      ),
    };
  }
}

module.exports = {
  User,
  Tenant,
  Admin,
  GarageTypeConfig,
  GarageSequence,
  Garage,
  Vehicle,
  Rental,
  RentalExtension,
};
