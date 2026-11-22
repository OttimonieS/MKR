/**
 * Modul alur penyewaan frontend: Pembuatan Sewa Garasi Baru (Penyewa) dan Perpanjangan Sewa (Admin).
 * @module frontend/rental
 */

/* ==================== Alur Sewa Garasi Baru (Penyewa) ==================== */

let rentalConfig = null;
let availableGaragesCache = [];

/**
 * Menyesuaikan input spesifik kendaraan (nomor plat dan kapasitas baterai EV)
 * serta mengisi pilihan tipe garasi kompatibel setiap kali tipe kendaraan berubah.
 *
 * @returns {Promise<void>}
 */
async function handleVehicleTypeChange() {
  const vehicleType = document.getElementById('vehicleType').value;
  const plateGroup = document.getElementById('plateNumberGroup');
  const plateInput = document.getElementById('plateNumber');
  const batteryGroup = document.getElementById('batteryCapacityGroup');
  const batteryInput = document.getElementById('batteryCapacityKwh');
  const batteryPercentInput = document.getElementById('currentBatteryPercent');
  const garageTypeSelect = document.getElementById('compatibleGarageType');

  const isBicycle = vehicleType === 'BICYCLE';
  const isElectricCar = vehicleType === 'ELECTRIC_CAR';

  plateGroup.classList.toggle('hidden', isBicycle);
  plateInput.required = !isBicycle;
  if (isBicycle) {
    plateInput.value = '';
  }

  batteryGroup.classList.toggle('hidden', !isElectricCar);
  batteryInput.required = isElectricCar;
  if (batteryPercentInput) {
    batteryPercentInput.required = isElectricCar;
  }
  if (!isElectricCar) {
    batteryInput.value = '';
    if (batteryPercentInput) {
      batteryPercentInput.value = '0';
    }
  }

  const allowedTypes =
    (rentalConfig && rentalConfig.compatibility[vehicleType]) || [];
  garageTypeSelect.innerHTML = allowedTypes
    .map(
      (gt) =>
        `<option value="${gt}">${window.AppUtils.escapeHtml(window.AppUtils.GARAGE_TYPE_LABELS[gt] || gt)}</option>`
    )
    .join('');

  await refreshAvailableGaragesAndPreview();
}

/**
 * Menyesuaikan batas dan status input durasi saat tipe sewa (DAILY atau MONTHLY) berubah.
 *
 * @returns {Promise<void>}
 */
async function handleRentalTypeChange() {
  const rentalType = document.getElementById('rentalType').value;
  const durationInput = document.getElementById('durationDays');
  const durationHint = document.getElementById('durationHint');

  if (!rentalConfig) {
    return;
  }

  if (rentalType === 'MONTHLY') {
    durationInput.value = rentalConfig.monthlyDays;
    durationInput.readOnly = true;
    durationInput.min = rentalConfig.monthlyDays;
    durationInput.max = rentalConfig.monthlyDays;
    durationHint.textContent = `Sewa bulanan otomatis ${rentalConfig.monthlyDays} hari (jumlah hari kalender bulan ini) dengan tarif 25 × harga harian.`;
  } else {
    durationInput.readOnly = false;
    durationInput.min = 1;
    durationInput.max = rentalConfig.maxDailyDays;
    const current = Number(durationInput.value);
    if (!Number.isInteger(current) || current < 1 || current > rentalConfig.maxDailyDays) {
      durationInput.value = 1;
    }
    durationHint.textContent = `Sewa harian diperbolehkan antara 1 sampai ${rentalConfig.maxDailyDays} hari. Untuk ${rentalConfig.monthlyDays} hari pilih tipe Bulanan.`;
  }

  await refreshAvailableGaragesAndPreview();
}

/**
 * Memuat ulang batas durasi (jumlah hari bulan terpilih) dari server ketika penyewa mengganti tanggal mulai,
 * lalu memperbarui batasan input durasi, daftar garasi tersedia, dan pratinjau biaya.
 *
 * @returns {Promise<void>}
 */
async function handleStartDateChange() {
  const startDateInput = document.getElementById('startDate');
  const startDate = startDateInput ? startDateInput.value : '';
  if (!startDate) {
    return;
  }

  window.AppUtils.hideAlert('newRentalAlert');

  try {
    const cfgRes = await window.AppUtils.apiRequest(
      `/api/rentals/config?startDate=${encodeURIComponent(startDate)}`
    );
    rentalConfig = cfgRes.data;
    await handleRentalTypeChange();
  } catch (err) {
    window.AppUtils.showAlert('newRentalAlert', err.message, 'error');
    document.getElementById('endDateDisplay').value = '-';
    renderEmptyCostSummary(err.message);
  }
}

/**
 * Memanggil GET /api/garages/available untuk memuat daftar garasi kompatibel yang tersedia
 * pada seluruh periode terpilih dimulai dari startDate sekaligus memperbarui tanggal selesai otomatis.
 *
 * @returns {Promise<void>}
 */
async function refreshAvailableGaragesAndPreview() {
  const vehicleType = document.getElementById('vehicleType').value;
  const garageType = document.getElementById('compatibleGarageType').value;
  const rentalType = document.getElementById('rentalType').value;
  const durationDays = Number(document.getElementById('durationDays').value);
  const startDate = document.getElementById('startDate').value;
  const garageSelect = document.getElementById('garageId');
  const endDateInput = document.getElementById('endDateDisplay');

  if (!vehicleType || !garageType || !rentalType || !durationDays || !startDate) {
    return;
  }

  window.AppUtils.hideAlert('newRentalAlert');

  try {
    const params = new URLSearchParams({
      vehicleType,
      garageType,
      rentalType,
      durationDays: String(durationDays),
      startDate,
    });

    const res = await window.AppUtils.apiRequest(
      `/api/garages/available?${params.toString()}`
    );
    const data = res.data;
    availableGaragesCache = data.garages;

    endDateInput.value = `${data.endDate} (${window.AppUtils.formatDateId(data.endDate)})`;

    const previousSelection = garageSelect.value;
    if (data.garages.length === 0) {
      garageSelect.innerHTML =
        '<option value="">Tidak ada garasi tersedia untuk tipe & periode ini</option>';
    } else {
      garageSelect.innerHTML = data.garages
        .map((g) => {
          const elecInfo = g.electricityRatePerKwh
            ? ` • Listrik ${window.AppUtils.formatRupiah(g.electricityRatePerKwh)}/kWh`
            : '';
          return `<option value="${window.AppUtils.escapeHtml(g.id)}">${window.AppUtils.escapeHtml(g.id)} — ${window.AppUtils.formatRupiah(g.dailyRate)}/hari${elecInfo}</option>`;
        })
        .join('');

      if (data.garages.some((g) => g.id === previousSelection)) {
        garageSelect.value = previousSelection;
      }
    }

    await updateRentalCostPreview();
  } catch (err) {
    endDateInput.value = '-';
    garageSelect.innerHTML = '<option value="">Periksa input durasi/kendaraan</option>';
    renderEmptyCostSummary(err.message);
  }
}

/**
 * Menampilkan pesan panduan atau error pada panel ringkasan biaya ketika input belum lengkap.
 *
 * @param {string} [message] - Pesan informasi atau error yang ditampilkan.
 * @returns {void}
 */
function renderEmptyCostSummary(message = 'Lengkapi data kendaraan dan pilih garasi untuk melihat rincian biaya.') {
  const summaryBox = document.getElementById('rentalCostSummary');
  if (!summaryBox) {
    return;
  }
  summaryBox.innerHTML = `<p style="color:#64748b;margin:0;font-size:13px;">${window.AppUtils.escapeHtml(message)}</p>`;
}

/**
 * Memanggil POST /api/rentals/preview agar seluruh rincian biaya dan tanggal selesai dihitung secara otoritatif oleh backend.
 *
 * @returns {Promise<void>}
 */
async function updateRentalCostPreview() {
  const garageId = document.getElementById('garageId').value;
  if (!garageId) {
    renderEmptyCostSummary('Tidak ada garasi tersedia yang dipilih.');
    return;
  }

  const vehicleType = document.getElementById('vehicleType').value;
  const brand = document.getElementById('brand').value.trim() || '-';
  const model = document.getElementById('model').value.trim() || '-';
  const plateNumber =
    vehicleType === 'BICYCLE'
      ? null
      : document.getElementById('plateNumber').value.trim() || 'TEMP';
  const batteryCapacityRaw = document.getElementById('batteryCapacityKwh').value;
  const batteryCapacityKwh =
    vehicleType === 'ELECTRIC_CAR' ? Number(batteryCapacityRaw) : null;
  const batteryPercentEl = document.getElementById('currentBatteryPercent');
  const currentBatteryPercent =
    vehicleType === 'ELECTRIC_CAR'
      ? (batteryPercentEl && batteryPercentEl.value !== '' ? Number(batteryPercentEl.value) : 0)
      : null;

  if (
    vehicleType === 'ELECTRIC_CAR' &&
    (!Number.isFinite(batteryCapacityKwh) || batteryCapacityKwh <= 0)
  ) {
    renderEmptyCostSummary(
      'Masukkan kapasitas baterai (kWh) mobil listrik untuk menghitung biaya pengisian listrik.'
    );
    return;
  }

  if (
    vehicleType === 'ELECTRIC_CAR' &&
    (!Number.isFinite(currentBatteryPercent) || currentBatteryPercent < 0 || currentBatteryPercent > 100)
  ) {
    renderEmptyCostSummary(
      'Persentase baterai sekarang harus berada antara 0% sampai 100%.'
    );
    return;
  }

  try {
    const res = await window.AppUtils.apiRequest('/api/rentals/preview', {
      method: 'POST',
      body: {
        garageId,
        vehicleType,
        plateNumber,
        brand,
        model,
        batteryCapacityKwh,
        currentBatteryPercent,
        startDate: document.getElementById('startDate').value,
        rentalType: document.getElementById('rentalType').value,
        durationDays: Number(document.getElementById('durationDays').value),
      },
    });

    const p = res.data;
    document.getElementById('endDateDisplay').value =
      `${p.endDate} (${window.AppUtils.formatDateId(p.endDate)})`;

    const evNote =
      vehicleType === 'ELECTRIC_CAR' && p.garage.garageType === 'EV'
        ? `<div class="alert alert-info" style="margin-top:12px;margin-bottom:0;">
             Pengisian baterai dari <strong>${p.vehicle.currentBatteryPercent}%</strong> ke 100% (sisa <strong>${p.chargePercent}%</strong> = <strong>${p.kwhToCharge} kWh</strong> dari ${p.vehicle.batteryCapacityKwh} kWh) × ${window.AppUtils.formatRupiah(p.garage.electricityRatePerKwh)}/kWh.
           </div>`
        : '';

    document.getElementById('rentalCostSummary').innerHTML = `
      <ul class="summary-list">
        <li><span>Garasi Dipilih</span><strong class="mono">${window.AppUtils.escapeHtml(p.garage.id)} (${window.AppUtils.escapeHtml(p.garage.garageTypeLabel)})</strong></li>
        <li><span>Tanggal Mulai (WIB)</span><strong>${window.AppUtils.formatDateId(p.startDate)}</strong></li>
        <li><span>Tanggal Selesai</span><strong>${window.AppUtils.formatDateId(p.endDate)}</strong></li>
        <li><span>Durasi & Tipe</span><strong>${p.durationDays} hari (${p.rentalType === 'MONTHLY' ? 'Bulanan' : 'Harian'})</strong></li>
        <li><span>Tarif Harian Garasi</span><strong>${window.AppUtils.formatRupiah(p.garage.dailyRate)}</strong></li>
        <li><span>Biaya Sewa</span><strong>${window.AppUtils.formatRupiah(p.rentalFee)}</strong></li>
        <li><span>Biaya Pengisian Listrik</span><strong>${window.AppUtils.formatRupiah(p.electricityFee)}</strong></li>
        <li class="summary-total"><span>Total Biaya Pelunasan</span><span>${window.AppUtils.formatRupiah(p.totalAmount)}</span></li>
      </ul>
      ${evNote}
    `;
  } catch (err) {
    renderEmptyCostSummary(err.message);
  }
}

/**
 * Mengirimkan data transaksi sewa baru beserta gambar bukti pelunasan menggunakan multipart/form-data.
 * Menampilkan notifikasi instan (toast + alert) untuk setiap validasi/kesalahan, dan saat berhasil
 * langsung menampilkan notifikasi sukses lalu mengalihkan penyewa ke halaman Riwayat Sewa.
 *
 * @param {SubmitEvent} event - Event submit form penyewaan baru.
 * @returns {Promise<void>}
 */
async function handleCreateRentalSubmit(event) {
  event.preventDefault();
  window.AppUtils.hideAlert('newRentalAlert');

  const submitBtn = document.getElementById('submitRentalBtn');
  const fileInput = document.getElementById('paymentProof');
  const vehicleType = document.getElementById('vehicleType').value;
  const garageId = document.getElementById('garageId').value;
  const brand = document.getElementById('brand').value.trim();
  const model = document.getElementById('model').value.trim();
  const plateNumber = document.getElementById('plateNumber').value.trim();
  const batteryCapacityKwh = document.getElementById('batteryCapacityKwh').value;
  const batteryPercentEl = document.getElementById('currentBatteryPercent');
  const currentBatteryPercent =
    batteryPercentEl && batteryPercentEl.value !== '' ? batteryPercentEl.value : '0';
  const startDate = document.getElementById('startDate').value;
  const rentalType = document.getElementById('rentalType').value;
  const durationDays = document.getElementById('durationDays').value;

  const failValidation = (msg) => {
    window.AppUtils.showAlert('newRentalAlert', msg, 'error');
    window.AppUtils.showToast(msg, 'error');
  };

  if (vehicleType !== 'BICYCLE' && !plateNumber) {
    failValidation('Nomor plat kendaraan wajib diisi.');
    return;
  }
  if (!brand) {
    failValidation('Merek kendaraan wajib diisi.');
    return;
  }
  if (!model) {
    failValidation('Tipe/model kendaraan wajib diisi.');
    return;
  }
  if (
    vehicleType === 'ELECTRIC_CAR' &&
    (!batteryCapacityKwh || Number(batteryCapacityKwh) <= 0)
  ) {
    failValidation('Kapasitas baterai (kWh) mobil listrik wajib diisi dengan angka positif.');
    return;
  }
  if (
    vehicleType === 'ELECTRIC_CAR' &&
    (Number(currentBatteryPercent) < 0 || Number(currentBatteryPercent) > 100 || Number.isNaN(Number(currentBatteryPercent)))
  ) {
    failValidation('Persentase baterai sekarang harus berada antara 0% sampai 100%.');
    return;
  }
  if (!startDate) {
    failValidation('Tanggal mulai sewa wajib dipilih.');
    return;
  }
  if (!garageId) {
    failValidation('Silakan pilih garasi yang tersedia untuk periode ini.');
    return;
  }
  if (!fileInput.files || fileInput.files.length === 0) {
    failValidation('Silakan unggah gambar bukti pelunasan terlebih dahulu.');
    return;
  }

  const formData = new FormData();
  formData.append('garageId', garageId);
  formData.append('vehicleType', vehicleType);
  if (vehicleType !== 'BICYCLE') {
    formData.append('plateNumber', plateNumber);
  }
  formData.append('brand', brand);
  formData.append('model', model);
  if (vehicleType === 'ELECTRIC_CAR') {
    formData.append('batteryCapacityKwh', batteryCapacityKwh);
    formData.append('currentBatteryPercent', currentBatteryPercent);
  }
  formData.append('startDate', startDate);
  formData.append('rentalType', rentalType);
  formData.append('durationDays', durationDays);
  formData.append('paymentProof', fileInput.files[0]);

  submitBtn.disabled = true;
  submitBtn.textContent = 'Menyimpan Transaksi...';

  try {
    const res = await window.AppUtils.apiRequest('/api/rentals', {
      method: 'POST',
      body: formData,
    });

    const successMsg =
      res.message || 'Transaksi penyewaan garasi berhasil disimpan.';
    window.AppUtils.showAlert(
      'newRentalAlert',
      `${successMsg} Mengalihkan ke halaman Riwayat Sewa...`,
      'success'
    );
    window.AppUtils.showToast(
      `${successMsg} Mengalihkan ke Riwayat Sewa...`,
      'success',
      3000
    );
    window.AppUtils.setFlashNotice(successMsg, 'success');

    setTimeout(() => {
      window.location.href = '/tenant/rentals.html';
    }, 900);
  } catch (err) {
    window.AppUtils.showAlert('newRentalAlert', err.message, 'error');
    window.AppUtils.showToast(err.message, 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Simpan Transaksi Sewa';
  }
}

/**
 * Menginisialisasi halaman Sewa Garasi Baru Penyewa (public/tenant/new-rental.html).
 *
 * @returns {Promise<void>}
 */
async function initTenantNewRentalPage() {
  const form = document.getElementById('newRentalForm');
  if (!form) {
    return;
  }

  const user = await window.AppUtils.requirePageAuth('TENANT');
  if (!user) {
    return;
  }

  if (user.approvalStatus !== 'APPROVED') {
    document.getElementById('tenantApprovalGate').classList.remove('hidden');
    document.getElementById('tenantApprovalGate').innerHTML =
      `Akun Anda saat ini berstatus <strong>${window.AppUtils.escapeHtml(user.approvalStatus)}</strong>. Hanya penyewa berstatus <strong>APPROVED</strong> yang dapat menyewa garasi.`;
    document.getElementById('newRentalContent').classList.add('hidden');
    return;
  }

  try {
    const cfgRes = await window.AppUtils.apiRequest('/api/rentals/config');
    rentalConfig = cfgRes.data;
    const startDateInput = document.getElementById('startDate');
    startDateInput.min = rentalConfig.todayDate;
    startDateInput.value = rentalConfig.todayDate;
  } catch (err) {
    window.AppUtils.showAlert('newRentalAlert', err.message, 'error');
    return;
  }

  document.getElementById('startDate').addEventListener('change', handleStartDateChange);
  document.getElementById('vehicleType').addEventListener('change', handleVehicleTypeChange);
  document.getElementById('compatibleGarageType').addEventListener('change', refreshAvailableGaragesAndPreview);
  document.getElementById('rentalType').addEventListener('change', handleRentalTypeChange);
  document.getElementById('durationDays').addEventListener('input', refreshAvailableGaragesAndPreview);
  document.getElementById('garageId').addEventListener('change', updateRentalCostPreview);
  document.getElementById('batteryCapacityKwh').addEventListener('input', updateRentalCostPreview);
  const batteryPercentEl = document.getElementById('currentBatteryPercent');
  if (batteryPercentEl) {
    batteryPercentEl.addEventListener('input', updateRentalCostPreview);
  }
  form.addEventListener('submit', handleCreateRentalSubmit);

  await handleVehicleTypeChange();
  await handleRentalTypeChange();
}

/* ==================== Alur Perpanjangan Sewa (Khusus Admin) ==================== */

let activeRentalsForExt = [];
let selectedExtRental = null;

/**
 * Memuat daftar garasi yang sedang aktif disewa pada hari ini di halaman public/admin/extensions.html.
 *
 * @returns {Promise<void>}
 */
async function loadActiveRentalsForExtension() {
  const tbody = document.getElementById('extActiveRentalsBody');
  if (!tbody) {
    return;
  }

  try {
    const res = await window.AppUtils.apiRequest('/api/rentals/active');
    const { todayDate, rentals } = res.data;
    activeRentalsForExt = rentals;

    document.getElementById('extTodayLabel').textContent =
      `Tanggal Hari Ini (WIB): ${window.AppUtils.formatDateId(todayDate)}`;

    if (rentals.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="empty-state">Belum ada garasi yang sedang atau akan disewa.</td></tr>';
      return;
    }

    tbody.innerHTML = rentals
      .map(
        (r) => `
        <tr>
          <td class="mono">${window.AppUtils.escapeHtml(r.garageId)}</td>
          <td>${window.AppUtils.escapeHtml(r.tenant ? r.tenant.fullName : '-')}</td>
          <td>${window.AppUtils.escapeHtml(r.vehicleTypeLabel)} — ${window.AppUtils.escapeHtml(r.brand)} ${window.AppUtils.escapeHtml(r.model)}</td>
          <td>${window.AppUtils.formatDateId(r.startDate)}</td>
          <td><strong>${window.AppUtils.formatDateId(r.endDate)}</strong></td>
          <td>
            <button type="button" class="btn btn-primary btn-sm" data-select-ext-rental="${window.AppUtils.escapeHtml(r.id)}">Pilih</button>
          </td>
        </tr>`
      )
      .join('');

    tbody.querySelectorAll('[data-select-ext-rental]').forEach((btn) => {
      btn.addEventListener('click', () =>
        selectRentalForExtension(btn.dataset.selectExtRental)
      );
    });
  } catch (err) {
    window.AppUtils.showAlert('extensionAlert', err.message, 'error');
  }
}

/**
 * Menampilkan informasi penyewa, kendaraan, garasi, dan histori perpanjangan dari transaksi aktif yang dipilih Admin.
 *
 * @param {string} rentalId - UUID transaksi penyewaan aktif terpilih.
 * @returns {void}
 */
function selectRentalForExtension(rentalId) {
  const rental = activeRentalsForExt.find((r) => r.id === rentalId);
  if (!rental) {
    return;
  }
  selectedExtRental = rental;
  window.AppUtils.hideAlert('extensionAlert');

  document.getElementById('extFormPlaceholder').classList.add('hidden');
  document.getElementById('extFormContainer').classList.remove('hidden');

  document.getElementById('extSelectedInfo').innerHTML = `
    <div class="detail-grid">
      <div>
        <div class="detail-item-label">Garasi</div>
        <div class="detail-item-value mono">${window.AppUtils.escapeHtml(rental.garageId)} (${window.AppUtils.escapeHtml(rental.garage.garageTypeLabel)})</div>
      </div>
      <div>
        <div class="detail-item-label">Tarif Harian</div>
        <div class="detail-item-value">${window.AppUtils.formatRupiah(rental.garage.dailyRate)} / hari</div>
      </div>
      <div>
        <div class="detail-item-label">Penyewa</div>
        <div class="detail-item-value">${window.AppUtils.escapeHtml(rental.tenant.fullName)} (NIK: ${window.AppUtils.escapeHtml(rental.tenant.nik)})</div>
      </div>
      <div>
        <div class="detail-item-label">Kendaraan</div>
        <div class="detail-item-value">${window.AppUtils.escapeHtml(rental.vehicleTypeLabel)} — ${window.AppUtils.escapeHtml(rental.brand)} ${window.AppUtils.escapeHtml(rental.model)} ${rental.plateNumber ? `(${window.AppUtils.escapeHtml(rental.plateNumber)})` : ''}</div>
      </div>
      <div>
        <div class="detail-item-label">Tanggal Mulai</div>
        <div class="detail-item-value">${window.AppUtils.formatDateId(rental.startDate)}</div>
      </div>
      <div>
        <div class="detail-item-label">Tanggal Selesai Saat Ini</div>
        <div class="detail-item-value" style="color:#1d4ed8;">${window.AppUtils.formatDateId(rental.endDate)}</div>
      </div>
    </div>
  `;

  const dateInput = document.getElementById('extNewEndDate');
  dateInput.value = '';
  // Atur tanggal minimal = tanggal selesai saat ini + 1 hari menggunakan perhitungan UTC
  const [y, m, d] = rental.endDate.split('-').map(Number);
  const nextDay = new Date(Date.UTC(y, m - 1, d + 1));
  const minStr = `${nextDay.getUTCFullYear()}-${String(nextDay.getUTCMonth() + 1).padStart(2, '0')}-${String(nextDay.getUTCDate()).padStart(2, '0')}`;
  dateInput.min = minStr;

  document.getElementById('extPaymentProof').value = '';
  document.getElementById('extCostPreview').innerHTML =
    '<p style="color:#64748b;margin:0;font-size:13px;">Pilih tanggal selesai baru untuk menghitung tambahan hari dan biaya perpanjangan.</p>';

  renderExtensionHistoryForSelected(rental);
}

/**
 * Merender tabel histori perpanjangan sebelumnya dari transaksi yang sedang dipilih Admin.
 *
 * @param {Object} rental - Objek penyewaan beserta array extensions.
 * @returns {void}
 */
function renderExtensionHistoryForSelected(rental) {
  const container = document.getElementById('extHistorySection');
  if (!container) {
    return;
  }
  if (!rental.extensions || rental.extensions.length === 0) {
    container.innerHTML =
      '<p style="color:#64748b;font-size:13px;margin:0;">Belum ada riwayat perpanjangan untuk transaksi ini.</p>';
    return;
  }

  container.innerHTML = `
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Selesai Lama</th>
            <th>Selesai Baru</th>
            <th class="num">Tambah Hari</th>
            <th class="num">Biaya</th>
            <th>Admin</th>
            <th>Bukti</th>
          </tr>
        </thead>
        <tbody>
          ${rental.extensions
            .map(
              (ext) => `
            <tr>
              <td>${window.AppUtils.formatDateId(ext.previousEndDate)}</td>
              <td>${window.AppUtils.formatDateId(ext.newEndDate)}</td>
              <td class="num">${ext.addedDays} hari</td>
              <td class="num">${window.AppUtils.formatRupiah(ext.extensionAmount)}</td>
              <td>${window.AppUtils.escapeHtml(ext.adminName || '-')}</td>
              <td><a href="${window.AppUtils.escapeHtml(ext.paymentProofUrl)}" target="_blank" rel="noopener">Lihat</a></td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Memanggil POST /api/rentals/:id/extend/preview untuk menampilkan rincian tambahan hari dan biaya perpanjangan.
 *
 * @returns {Promise<void>}
 */
async function updateExtensionCostPreview() {
  if (!selectedExtRental) {
    return;
  }
  const newEndDate = document.getElementById('extNewEndDate').value;
  const previewBox = document.getElementById('extCostPreview');

  if (!newEndDate) {
    previewBox.innerHTML =
      '<p style="color:#64748b;margin:0;font-size:13px;">Pilih tanggal selesai baru.</p>';
    return;
  }

  try {
    const res = await window.AppUtils.apiRequest(
      `/api/rentals/${selectedExtRental.id}/extend/preview`,
      {
        method: 'POST',
        body: { newEndDate },
      }
    );

    const p = res.data;
    const blockList =
      p.blockDetails.length > 0
        ? p.blockDetails
            .map(
              (b, idx) =>
                `Blok ${idx + 1}: ${window.AppUtils.formatDateId(b.startDate)} s/d ${window.AppUtils.formatDateId(b.endDate)} (${b.days} hari) = ${window.AppUtils.formatRupiah(b.fee)}`
            )
            .join('<br>')
        : 'Tidak ada blok bulanan penuh';

    previewBox.innerHTML = `
      <ul class="summary-list">
        <li><span>Periode Tambahan</span><strong>${window.AppUtils.formatDateId(p.extensionStartDate)} s/d ${window.AppUtils.formatDateId(p.newEndDate)}</strong></li>
        <li><span>Total Tambahan Durasi</span><strong>${p.addedDays} hari</strong></li>
        <li><span>Blok Bulanan (${p.monthlyBlocks} × 25 × ${window.AppUtils.formatRupiah(p.dailyRate)})</span><strong>${window.AppUtils.formatRupiah(p.monthlyFee)}</strong></li>
        <li><span>Sisa Hari (${p.remainingDays} × ${window.AppUtils.formatRupiah(p.dailyRate)})</span><strong>${window.AppUtils.formatRupiah(p.remainingDailyFee)}</strong></li>
        <li class="summary-total"><span>Total Biaya Perpanjangan</span><span>${window.AppUtils.formatRupiah(p.extensionAmount)}</span></li>
      </ul>
      <div style="margin-top:8px;font-size:12px;color:#475569;">${blockList}</div>
    `;
  } catch (err) {
    previewBox.innerHTML = `<div class="alert alert-error" style="margin:0;">${window.AppUtils.escapeHtml(err.message)}</div>`;
    window.AppUtils.showToast(err.message, 'error');
  }
}

/**
 * Mengirimkan permintaan perpanjangan sewa beserta bukti pembayaran gambar ke backend API.
 *
 * @param {SubmitEvent} event - Event submit form perpanjangan sewa.
 * @returns {Promise<void>}
 */
async function handleExtensionSubmit(event) {
  event.preventDefault();
  if (!selectedExtRental) {
    return;
  }
  window.AppUtils.hideAlert('extensionAlert');

  const newEndDate = document.getElementById('extNewEndDate').value;
  const fileInput = document.getElementById('extPaymentProof');
  const submitBtn = document.getElementById('extSubmitBtn');

  if (!newEndDate) {
    const msg = 'Tanggal selesai baru wajib dipilih.';
    window.AppUtils.showAlert('extensionAlert', msg, 'error');
    window.AppUtils.showToast(msg, 'error');
    return;
  }

  if (!fileInput.files || fileInput.files.length === 0) {
    const msg = 'Bukti pembayaran perpanjangan wajib diunggah.';
    window.AppUtils.showAlert('extensionAlert', msg, 'error');
    window.AppUtils.showToast(msg, 'error');
    return;
  }

  const formData = new FormData();
  formData.append('newEndDate', newEndDate);
  formData.append('paymentProof', fileInput.files[0]);

  submitBtn.disabled = true;
  submitBtn.textContent = 'Menyimpan Perpanjangan...';

  try {
    const res = await window.AppUtils.apiRequest(
      `/api/rentals/${selectedExtRental.id}/extend`,
      {
        method: 'POST',
        body: formData,
      }
    );

    window.AppUtils.showAlert('extensionAlert', res.message, 'success');
    window.AppUtils.showToast(res.message, 'success');
    await loadActiveRentalsForExtension();
    selectRentalForExtension(res.data.rental.id);
  } catch (err) {
    window.AppUtils.showAlert('extensionAlert', err.message, 'error');
    window.AppUtils.showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Simpan Perpanjangan Sewa';
  }
}

/**
 * Menginisialisasi halaman Perpanjangan Sewa Admin (public/admin/extensions.html).
 *
 * @returns {Promise<void>}
 */
async function initAdminExtensionsPage() {
  const form = document.getElementById('extendRentalForm');
  if (!form) {
    return;
  }

  const user = await window.AppUtils.requirePageAuth('ADMIN');
  if (!user) {
    return;
  }

  document
    .getElementById('extNewEndDate')
    .addEventListener('change', updateExtensionCostPreview);
  form.addEventListener('submit', handleExtensionSubmit);

  await loadActiveRentalsForExtension();
}

document.addEventListener('DOMContentLoaded', () => {
  initTenantNewRentalPage();
  initAdminExtensionsPage();
});
