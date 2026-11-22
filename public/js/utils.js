/**
 * Utilitas bersama frontend: klien Fetch API, penjaga sesi & role halaman,
 * sanitasi HTML (anti-XSS), format Rupiah/tanggal, badge status, dan kontrol modal.
 * @module frontend/utils
 */

const GARAGE_TYPE_LABELS = Object.freeze({
  BIKE: 'Garasi Sepeda',
  CAR: 'Garasi Mobil',
  EV: 'Garasi Mobil Listrik',
});

const VEHICLE_TYPE_LABELS = Object.freeze({
  BICYCLE: 'Sepeda',
  MOTORCYCLE: 'Sepeda Motor',
  CAR: 'Mobil',
  ELECTRIC_CAR: 'Mobil Listrik',
});

/**
 * Meng-escape karakter khusus HTML untuk mencegah kerentanan XSS saat menyisipkan teks dinamis ke innerHTML.
 *
 * @param {*} value - Nilai input yang akan disanitasi.
 * @returns {string} String aman untuk dirender di dalam HTML.
 */
function escapeHtml(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Memformat angka nominal menjadi tampilan mata uang Rupiah Indonesia (Rp).
 *
 * @param {number|string} amount - Nominal dalam satuan Rupiah.
 * @returns {string} String terformat Rupiah (contoh: "Rp 100.000").
 */
function formatRupiah(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Memformat string tanggal YYYY-MM-DD menjadi format tanggal bahasa Indonesia (DD MMM YYYY)
 * menggunakan parsing string date-only agar tidak bergeser akibat timezone browser.
 *
 * @param {string} dateStr - String tanggal dalam format YYYY-MM-DD.
 * @returns {string} Tanggal terformat (contoh: "21 Nov 2026") atau '-'.
 */
function formatDateId(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return '-';
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!match) {
    return dateStr;
  }
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ];
  const year = match[1];
  const monthIdx = Number(match[2]) - 1;
  const day = match[3];
  return `${day} ${months[monthIdx] || match[2]} ${year}`;
}

/**
 * Menghasilkan markup HTML badge status berwarna sesuai nilai status bisnis.
 *
 * @param {string} status - Nilai status (AVAILABLE, USED, PENDING, APPROVED, REJECTED, ACTIVE, COMPLETED).
 * @returns {string} String HTML elemen span badge status.
 */
function renderStatusBadge(status) {
  const normalized = String(status || '').toUpperCase();
  const classMap = {
    AVAILABLE: 'badge-available',
    USED: 'badge-used',
    PENDING: 'badge-pending',
    APPROVED: 'badge-approved',
    REJECTED: 'badge-rejected',
    ACTIVE: 'badge-active',
    COMPLETED: 'badge-completed',
  };
  const cls = classMap[normalized] || 'badge-used';
  return `<span class="badge ${cls}">${escapeHtml(normalized)}</span>`;
}

/**
 * Menjalankan permintaan HTTP JSON atau FormData ke backend menggunakan Fetch API beserta cookie sesi.
 *
 * @param {string} url - Alamat endpoint REST API backend.
 * @param {Object} [options={}] - Opsi permintaan (method, body, headers).
 * @returns {Promise<Object>} Payload JSON respons sukses dari backend.
 * @throws {Error} Apabila status HTTP >= 400 atau respons menandakan kegagalan.
 */
async function apiRequest(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const fetchOptions = {
    method,
    credentials: 'same-origin',
    headers: { ...(options.headers || {}) },
  };

  if (options.body !== undefined) {
    if (options.body instanceof FormData) {
      fetchOptions.body = options.body;
    } else {
      fetchOptions.headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(options.body);
    }
  }

  const response = await fetch(url, fetchOptions);
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = { success: false, message: 'Respons server tidak valid.' };
  }

  if (!response.ok || payload.success === false) {
    const err = new Error(payload.message || `Permintaan gagal (${response.status}).`);
    err.status = response.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

/**
 * Menampilkan notifikasi toast mengambang di pojok kanan atas layar agar selalu terlihat
 * tanpa terpengaruh posisi scroll halaman.
 *
 * @param {string} message - Isi pesan notifikasi.
 * @param {'success'|'error'|'warning'|'info'} [type='info'] - Varian warna notifikasi.
 * @param {number} [durationMs=4000] - Durasi tampil toast dalam milidetik.
 * @returns {void}
 */
function showToast(message, type = 'info', durationMs = 4000) {
  if (typeof document === 'undefined') {
    return;
  }
  let container = document.getElementById('appToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'appToastContainer';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  container.appendChild(toast);

  if (durationMs > 0) {
    setTimeout(() => {
      toast.remove();
    }, durationMs);
  }
}

/**
 * Menyimpan pesan notifikasi sementara ke sessionStorage untuk ditampilkan setelah pindah halaman.
 *
 * @param {string} message - Pesan notifikasi.
 * @param {'success'|'error'|'warning'|'info'} [type='success'] - Varian warna notifikasi.
 * @returns {void}
 */
function setFlashNotice(message, type = 'success') {
  try {
    sessionStorage.setItem('gr_flash_notice', JSON.stringify({ message, type }));
  } catch {
    // Abaikan apabila sessionStorage tidak tersedia
  }
}

/**
 * Mengambil sekaligus menghapus notifikasi sementara dari sessionStorage bila tersedia.
 *
 * @returns {{ message: string, type: string }|null} Objek notifikasi atau null jika kosong.
 */
function consumeFlashNotice() {
  try {
    const raw = sessionStorage.getItem('gr_flash_notice');
    if (!raw) {
      return null;
    }
    sessionStorage.removeItem('gr_flash_notice');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Menampilkan kotak pesan notifikasi (alert) pada elemen target serta menggulir halaman agar terlihat.
 *
 * @param {string} elementId - ID DOM elemen kontainer alert.
 * @param {string} message - Isi pesan yang akan ditampilkan.
 * @param {'success'|'error'|'warning'|'info'} [type='info'] - Varian warna alert.
 * @returns {void}
 */
function showAlert(elementId, message, type = 'info') {
  const el = document.getElementById(elementId);
  if (!el) {
    return;
  }
  el.className = `alert alert-${type}`;
  el.textContent = message;
  el.classList.remove('hidden');
  if (typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/**
 * Menyembunyikan kotak pesan notifikasi pada elemen target.
 *
 * @param {string} elementId - ID DOM elemen kontainer alert.
 * @returns {void}
 */
function hideAlert(elementId) {
  const el = document.getElementById(elementId);
  if (!el) {
    return;
  }
  el.classList.add('hidden');
  el.textContent = '';
}

/**
 * Memeriksa sesi aktif melalui GET /api/auth/me dan memastikan role pengguna sesuai dengan halaman.
 * Mengarahkan pengguna yang belum login ke halaman login atau ke dashboard role miliknya.
 *
 * @param {'ADMIN'|'TENANT'} expectedRole - Role yang berhak mengakses halaman saat ini.
 * @returns {Promise<Object|null>} Objek data pengguna yang sedang login, atau null jika dialihkan.
 */
async function requirePageAuth(expectedRole) {
  try {
    const res = await apiRequest('/api/auth/me');
    const user = res.data;

    if (expectedRole && user.role !== expectedRole) {
      window.location.href =
        user.role === 'ADMIN' ? '/admin/garages.html' : '/tenant/new-rental.html';
      return null;
    }

    const userDisplay = document.getElementById('currentUserDisplay');
    if (userDisplay) {
      userDisplay.textContent = `${user.fullName || user.email} (${user.role})`;
    }

    bindLogoutButton();
    return user;
  } catch {
    window.location.href = '/index.html';
    return null;
  }
}

/**
 * Mengikat event klik pada tombol Logout di sidebar untuk menghapus cookie sesi di backend.
 *
 * @returns {void}
 */
function bindLogoutButton() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn || logoutBtn.dataset.bound === 'true') {
    return;
  }
  logoutBtn.dataset.bound = 'true';
  logoutBtn.addEventListener('click', async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // Tetap alihkan ke halaman login meskipun sesi telah habis
    }
    window.location.href = '/index.html';
  });
}

/**
 * Membuka dialog modal dengan menghapus kelas hidden pada elemen backdrop-nya.
 *
 * @param {string} modalId - ID DOM elemen modal backdrop.
 * @returns {void}
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
  }
}

/**
 * Menutup dialog modal dengan menambahkan kelas hidden pada elemen backdrop-nya.
 *
 * @param {string} modalId - ID DOM elemen modal backdrop.
 * @returns {void}
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
  }
}

/**
 * Menyusun markup HTML lengkap detail transaksi penyewaan untuk ditampilkan pada modal Admin maupun Penyewa.
 *
 * @param {Object} rental - Payload JSON transaksi penyewaan dari REST API.
 * @returns {string} Blok HTML terstruktur berisi data kendaraan, garasi, rincian biaya, bukti bayar, dan perpanjangan.
 */
function buildRentalDetailHtml(rental) {
  const extRows =
    rental.extensions && rental.extensions.length > 0
      ? `
        <h4 style="margin: 20px 0 10px;">Riwayat Perpanjangan (${rental.extensions.length})</h4>
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>Tanggal Proses</th>
                <th>Selesai Lama</th>
                <th>Selesai Baru</th>
                <th class="num">Tambah Hari</th>
                <th class="num">Biaya Perpanjangan</th>
                <th>Admin</th>
                <th>Bukti</th>
              </tr>
            </thead>
            <tbody>
              ${rental.extensions
                .map(
                  (ext) => `
                <tr>
                  <td>${escapeHtml(formatDateId(ext.createdAt))}</td>
                  <td>${escapeHtml(formatDateId(ext.previousEndDate))}</td>
                  <td>${escapeHtml(formatDateId(ext.newEndDate))}</td>
                  <td class="num">${escapeHtml(ext.addedDays)} hari</td>
                  <td class="num">${escapeHtml(formatRupiah(ext.extensionAmount))}</td>
                  <td>${escapeHtml(ext.adminName || '-')}</td>
                  <td><a href="${escapeHtml(ext.paymentProofUrl)}" target="_blank" rel="noopener">Lihat</a></td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>`
      : '<p style="margin-top:16px;color:#64748b;font-size:13px;">Belum ada riwayat perpanjangan pada transaksi ini.</p>';

  return `
    <div class="detail-grid">
      <div>
        <div class="detail-item-label">ID Transaksi</div>
        <div class="detail-item-value mono" style="font-size:12px;">${escapeHtml(rental.id)}</div>
      </div>
      <div>
        <div class="detail-item-label">Status</div>
        <div class="detail-item-value">${renderStatusBadge(rental.status)}</div>
      </div>
      <div>
        <div class="detail-item-label">Garasi</div>
        <div class="detail-item-value mono">${escapeHtml(rental.garageId)} — ${escapeHtml(rental.garage ? rental.garage.garageTypeLabel : '')}</div>
      </div>
      <div>
        <div class="detail-item-label">Penyewa</div>
        <div class="detail-item-value">${escapeHtml(rental.tenant ? `${rental.tenant.fullName} (NIK: ${rental.tenant.nik})` : '-')}</div>
      </div>
      <div>
        <div class="detail-item-label">Kendaraan</div>
        <div class="detail-item-value">${escapeHtml(rental.vehicleTypeLabel)} — ${escapeHtml(rental.brand)} ${escapeHtml(rental.model)}</div>
      </div>
      <div>
        <div class="detail-item-label">Nomor Plat / Baterai</div>
        <div class="detail-item-value">
          ${escapeHtml(rental.plateNumber || 'Tanpa Plat (Sepeda)')}
          ${rental.batteryCapacityKwh ? ` • ${escapeHtml(rental.batteryCapacityKwh)} kWh${rental.currentBatteryPercent !== null && rental.currentBatteryPercent !== undefined ? ` (Baterai awal ${escapeHtml(rental.currentBatteryPercent)}%)` : ''}` : ''}
        </div>
      </div>
      <div>
        <div class="detail-item-label">Periode Sewa</div>
        <div class="detail-item-value">${escapeHtml(formatDateId(rental.startDate))} s/d ${escapeHtml(formatDateId(rental.endDate))} (${escapeHtml(rental.totalDurationDays)} hari)</div>
      </div>
      <div>
        <div class="detail-item-label">Tipe Sewa Awal</div>
        <div class="detail-item-value">${escapeHtml(rental.rentalType === 'MONTHLY' ? 'Bulanan' : 'Harian')} (${escapeHtml(rental.durationDays)} hari)</div>
      </div>
    </div>

    <h4 style="margin: 20px 0 8px;">Rincian Biaya</h4>
    <ul class="summary-list">
      <li><span>Biaya Sewa Awal</span><strong>${escapeHtml(formatRupiah(rental.rentalFee))}</strong></li>
      <li><span>Biaya Pengisian Listrik</span><strong>${escapeHtml(formatRupiah(rental.electricityFee))}</strong></li>
      <li><span>Total Sewa Awal</span><strong>${escapeHtml(formatRupiah(rental.totalAmount))}</strong></li>
      <li><span>Total Biaya Perpanjangan</span><strong>${escapeHtml(formatRupiah(rental.totalExtensionAmount))}</strong></li>
      <li class="summary-total"><span>Total Keseluruhan</span><span>${escapeHtml(formatRupiah(rental.grandTotalAmount))}</span></li>
    </ul>

    <h4 style="margin: 20px 0 8px;">Bukti Pelunasan Awal</h4>
    ${
      rental.paymentProofUrl
        ? `<a href="${escapeHtml(rental.paymentProofUrl)}" target="_blank" rel="noopener">Buka gambar di tab baru</a>
           <img class="proof-preview-img" src="${escapeHtml(rental.paymentProofUrl)}" alt="Bukti Pelunasan">`
        : '<p>-</p>'
    }
    ${extRows}
  `;
}

/**
 * Mengikat event klik terdelegasi pada seluruh tombol bertanda `data-close-modal`
 * agar penutupan modal mematuhi kebijakan CSP ketat tanpa inline `onclick`.
 *
 * @returns {void}
 */
function bindModalCloseHandlers() {
  if (typeof document === 'undefined' || document.documentElement.dataset.modalCloseBound === 'true') {
    return;
  }
  document.documentElement.dataset.modalCloseBound = 'true';
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-close-modal]');
    if (trigger) {
      closeModal(trigger.dataset.closeModal);
    }
  });
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', bindModalCloseHandlers);
}

window.AppUtils = {
  GARAGE_TYPE_LABELS,
  VEHICLE_TYPE_LABELS,
  escapeHtml,
  formatRupiah,
  formatDateId,
  renderStatusBadge,
  apiRequest,
  showToast,
  setFlashNotice,
  consumeFlashNotice,
  showAlert,
  hideAlert,
  requirePageAuth,
  bindLogoutButton,
  openModal,
  closeModal,
  bindModalCloseHandlers,
  buildRentalDetailHtml,
};
