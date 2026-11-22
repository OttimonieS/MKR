/**
 * Modul frontend Penyewa (Tenant) untuk Riwayat Sewa, Modal Detail Transaksi, dan Profil.
 * @module frontend/tenant
 */

/**
 * Menampilkan banner pemberitahuan status verifikasi apabila akun penyewa masih PENDING atau REJECTED.
 *
 * @param {Object} user - Objek profil penyewa yang sedang login.
 * @param {string} containerId - ID DOM elemen banner pemberitahuan.
 * @returns {void}
 */
function renderTenantStatusNotice(user, containerId) {
  const banner = document.getElementById(containerId);
  if (!banner) {
    return;
  }

  if (user.approvalStatus === 'PENDING') {
    banner.className = 'alert alert-warning';
    banner.innerHTML =
      '<strong>Status Akun: PENDING</strong> — Pendaftaran Anda sedang menunggu verifikasi NIK/KTP oleh Admin. Fitur penyewaan garasi akan aktif setelah akun Anda disetujui.';
    banner.classList.remove('hidden');
  } else if (user.approvalStatus === 'REJECTED') {
    banner.className = 'alert alert-error';
    banner.innerHTML =
      '<strong>Status Akun: REJECTED</strong> — Pendaftaran Anda ditolak oleh Admin. Anda tidak dapat membuat penyewaan garasi.';
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

/**
 * Mengambil detail lengkap satu transaksi penyewaan milik penyewa dan menampilkannya dalam modal.
 *
 * @param {string} rentalId - UUID transaksi penyewaan yang akan dilihat.
 * @returns {Promise<void>}
 */
async function openTenantRentalDetailModal(rentalId) {
  const body = document.getElementById('tenantRentalDetailBody');
  if (!body) {
    return;
  }
  body.innerHTML = '<p>Memuat detail transaksi...</p>';
  window.AppUtils.openModal('tenantRentalDetailModal');

  try {
    const res = await window.AppUtils.apiRequest(`/api/rentals/${rentalId}`);
    body.innerHTML = window.AppUtils.buildRentalDetailHtml(res.data);
  } catch (err) {
    body.innerHTML = `<div class="alert alert-error">${window.AppUtils.escapeHtml(err.message)}</div>`;
  }
}

/**
 * Menginisialisasi halaman Riwayat Sewa Penyewa (public/tenant/rentals.html).
 *
 * @returns {Promise<void>}
 */
async function initTenantRentalsHistoryPage() {
  const tbody = document.getElementById('tenantHistoryTableBody');
  if (!tbody) {
    return;
  }

  const user = await window.AppUtils.requirePageAuth('TENANT');
  if (!user) {
    return;
  }

  renderTenantStatusNotice(user, 'tenantHistoryStatusBanner');

  const flash = window.AppUtils.consumeFlashNotice();
  if (flash && flash.message) {
    window.AppUtils.showAlert('tenantHistoryAlert', flash.message, flash.type || 'success');
    window.AppUtils.showToast(flash.message, flash.type || 'success');
  }

  try {
    const res = await window.AppUtils.apiRequest('/api/rentals/my');
    const rentals = res.data;

    if (rentals.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="8" class="empty-state">Belum ada riwayat penyewaan garasi.</td></tr>';
      return;
    }

    tbody.innerHTML = rentals
      .map(
        (r) => `
        <tr>
          <td class="mono">${window.AppUtils.escapeHtml(r.garageId)}</td>
          <td>${window.AppUtils.escapeHtml(r.garage ? r.garage.garageTypeLabel : '-')}</td>
          <td>${window.AppUtils.escapeHtml(r.vehicleTypeLabel)} — ${window.AppUtils.escapeHtml(r.brand)} ${window.AppUtils.escapeHtml(r.model)}${r.plateNumber ? `<br><span style="font-size:12px;color:#64748b;">${window.AppUtils.escapeHtml(r.plateNumber)}</span>` : ''}</td>
          <td>${window.AppUtils.formatDateId(r.startDate)} s/d ${window.AppUtils.formatDateId(r.endDate)}<br><span style="font-size:12px;color:#64748b;">${r.totalDurationDays} hari (${r.extensions.length}× perpanjangan)</span></td>
          <td class="num">${window.AppUtils.formatRupiah(r.totalAmount)}</td>
          <td class="num">${window.AppUtils.formatRupiah(r.totalExtensionAmount)}</td>
          <td>${window.AppUtils.renderStatusBadge(r.status)}</td>
          <td>
            <button type="button" class="btn btn-secondary btn-sm" data-history-detail="${window.AppUtils.escapeHtml(r.id)}">Detail</button>
          </td>
        </tr>`
      )
      .join('');

    tbody.querySelectorAll('[data-history-detail]').forEach((btn) => {
      btn.addEventListener('click', () =>
        openTenantRentalDetailModal(btn.dataset.historyDetail)
      );
    });
  } catch (err) {
    window.AppUtils.showAlert('tenantHistoryAlert', err.message, 'error');
  }
}

/**
 * Menginisialisasi halaman Profil Penyewa (public/tenant/profile.html).
 *
 * @returns {Promise<void>}
 */
async function initTenantProfilePage() {
  const container = document.getElementById('tenantProfileDetails');
  if (!container) {
    return;
  }

  const user = await window.AppUtils.requirePageAuth('TENANT');
  if (!user) {
    return;
  }

  renderTenantStatusNotice(user, 'tenantProfileStatusBanner');

  container.innerHTML = `
    <div class="detail-grid">
      <div>
        <div class="detail-item-label">Nama Lengkap</div>
        <div class="detail-item-value">${window.AppUtils.escapeHtml(user.fullName)}</div>
      </div>
      <div>
        <div class="detail-item-label">Status Verifikasi KTP/NIK</div>
        <div class="detail-item-value">${window.AppUtils.renderStatusBadge(user.approvalStatus)}</div>
      </div>
      <div>
        <div class="detail-item-label">NIK (Nomor KTP)</div>
        <div class="detail-item-value mono">${window.AppUtils.escapeHtml(user.nik)}</div>
      </div>
      <div>
        <div class="detail-item-label">Email (Username)</div>
        <div class="detail-item-value">${window.AppUtils.escapeHtml(user.email)}</div>
      </div>
      <div>
        <div class="detail-item-label">Nomor Telepon</div>
        <div class="detail-item-value">${window.AppUtils.escapeHtml(user.phone)}</div>
      </div>
      <div>
        <div class="detail-item-label">Tanggal Pendaftaran</div>
        <div class="detail-item-value">${window.AppUtils.formatDateId(user.createdAt)}</div>
      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  initTenantRentalsHistoryPage();
  initTenantProfilePage();
});
