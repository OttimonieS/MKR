/**
 * Modul frontend Admin untuk Dashboard Admin, Verifikasi Pendaftar Penyewa, dan 4 Jenis Laporan.
 * @module frontend/admin
 */

/* ==================== Dashboard Admin ==================== */

/**
 * Memuat ringkasan metrik KPI aktual dan tabel garasi yang sedang disewa hari ini
 * pada halaman public/admin/dashboard.html.
 *
 * @returns {Promise<void>}
 */
async function initAdminDashboardPage() {
  const statsContainer = document.getElementById('adminDashboardStats');
  if (!statsContainer) {
    return;
  }

  const user = await window.AppUtils.requirePageAuth('ADMIN');
  if (!user) {
    return;
  }

  try {
    const [statsRes, activeRes] = await Promise.all([
      window.AppUtils.apiRequest('/api/reports/dashboard'),
      window.AppUtils.apiRequest('/api/rentals/active'),
    ]);

    const s = statsRes.data;
    document.getElementById('todayDateLabel').textContent =
      `Tanggal Sistem (WIB): ${window.AppUtils.formatDateId(s.todayDate)}`;

    statsContainer.innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Total Garasi</div>
        <div class="stat-value">${s.totalGarages}</div>
        <div class="stat-sub">Available: ${s.availableGarages} • Used: ${s.usedGarages}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Penyewa Menunggu Verifikasi</div>
        <div class="stat-value">${s.pendingTenants}</div>
        <div class="stat-sub">Approved: ${s.approvedTenants} • Rejected: ${s.rejectedTenants}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Sewa Aktif Hari Ini</div>
        <div class="stat-value">${s.activeRentalsToday}</div>
        <div class="stat-sub">Total Transaksi Sewa: ${s.totalRentals} • Perpanjangan: ${s.totalExtensions}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Pendapatan</div>
        <div class="stat-value">${window.AppUtils.formatRupiah(s.totalRevenue)}</div>
        <div class="stat-sub">Sewa: ${window.AppUtils.formatRupiah(s.rentalRevenue)} • Perpanjangan: ${window.AppUtils.formatRupiah(s.extensionRevenue)}</div>
      </div>
    `;

    const tbody = document.getElementById('activeRentalsTableBody');
    const activeRentals = activeRes.data.rentals;

    if (activeRentals.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="empty-state">Belum ada garasi yang sedang atau akan disewa.</td></tr>';
      return;
    }

    tbody.innerHTML = activeRentals
      .map(
        (r) => `
        <tr>
          <td class="mono">${window.AppUtils.escapeHtml(r.garageId)}</td>
          <td>${window.AppUtils.escapeHtml(r.tenant ? r.tenant.fullName : '-')}</td>
          <td>${window.AppUtils.escapeHtml(r.vehicleTypeLabel)} (${window.AppUtils.escapeHtml(r.brand)} ${window.AppUtils.escapeHtml(r.model)})</td>
          <td>${window.AppUtils.escapeHtml(r.plateNumber || '-')}</td>
          <td>${window.AppUtils.escapeHtml(window.AppUtils.formatDateId(r.startDate))} s/d ${window.AppUtils.escapeHtml(window.AppUtils.formatDateId(r.endDate))}</td>
          <td class="num">${window.AppUtils.escapeHtml(window.AppUtils.formatRupiah(r.grandTotalAmount))}</td>
          <td>
            <button type="button" class="btn btn-secondary btn-sm" data-view-rental="${window.AppUtils.escapeHtml(r.id)}">Detail</button>
          </td>
        </tr>`
      )
      .join('');

    tbody.querySelectorAll('[data-view-rental]').forEach((btn) => {
      btn.addEventListener('click', () =>
        openAdminRentalDetailModal(btn.dataset.viewRental)
      );
    });
  } catch (err) {
    window.AppUtils.showAlert('adminDashboardAlert', err.message, 'error');
  }
}

/**
 * Mengambil detail lengkap transaksi penyewaan dari backend dan menampilkannya pada modal detail.
 *
 * @param {string} rentalId - UUID transaksi penyewaan yang akan dilihat.
 * @returns {Promise<void>}
 */
async function openAdminRentalDetailModal(rentalId) {
  const modalBody = document.getElementById('rentalDetailModalBody');
  if (!modalBody) {
    return;
  }
  modalBody.innerHTML = '<p>Memuat detail transaksi...</p>';
  window.AppUtils.openModal('rentalDetailModal');

  try {
    const res = await window.AppUtils.apiRequest(`/api/rentals/${rentalId}`);
    modalBody.innerHTML = window.AppUtils.buildRentalDetailHtml(res.data);
  } catch (err) {
    modalBody.innerHTML = `<div class="alert alert-error">${window.AppUtils.escapeHtml(err.message)}</div>`;
  }
}

/* ==================== Verifikasi Penyewa ==================== */

let pendingVerificationAction = null;

/**
 * Memuat daftar pendaftar penyewa sesuai filter status dan kata kunci pada public/admin/tenants.html.
 *
 * @returns {Promise<void>}
 */
async function loadTenantsVerificationTable() {
  const tbody = document.getElementById('tenantsTableBody');
  if (!tbody) {
    return;
  }

  const status = document.getElementById('filterTenantStatus').value;
  const search = document.getElementById('filterTenantSearch').value.trim();
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (search) params.set('search', search);

  try {
    const res = await window.AppUtils.apiRequest(
      `/api/admin/tenants?${params.toString()}`
    );
    const tenants = res.data;

    if (tenants.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="empty-state">Tidak ada data penyewa yang sesuai filter.</td></tr>';
      return;
    }

    tbody.innerHTML = tenants
      .map(
        (t) => `
        <tr>
          <td class="mono">${window.AppUtils.escapeHtml(t.nik)}</td>
          <td><strong>${window.AppUtils.escapeHtml(t.fullName)}</strong></td>
          <td>${window.AppUtils.escapeHtml(t.email)}</td>
          <td>${window.AppUtils.escapeHtml(t.phone)}</td>
          <td>${window.AppUtils.escapeHtml(window.AppUtils.formatDateId(t.createdAt))}</td>
          <td>${window.AppUtils.renderStatusBadge(t.approvalStatus)}</td>
          <td>
            <div class="action-group">
              <button
                type="button"
                class="btn btn-success btn-sm"
                data-verify-user="${window.AppUtils.escapeHtml(t.id)}"
                data-verify-name="${window.AppUtils.escapeHtml(t.fullName)}"
                data-verify-nik="${window.AppUtils.escapeHtml(t.nik)}"
                data-verify-decision="APPROVED"
                ${t.approvalStatus === 'APPROVED' ? 'disabled' : ''}
              >Terima</button>
              <button
                type="button"
                class="btn btn-danger btn-sm"
                data-verify-user="${window.AppUtils.escapeHtml(t.id)}"
                data-verify-name="${window.AppUtils.escapeHtml(t.fullName)}"
                data-verify-nik="${window.AppUtils.escapeHtml(t.nik)}"
                data-verify-decision="REJECTED"
                ${t.approvalStatus === 'REJECTED' ? 'disabled' : ''}
              >Tolak</button>
            </div>
          </td>
        </tr>`
      )
      .join('');

    tbody.querySelectorAll('[data-verify-user]').forEach((btn) => {
      btn.addEventListener('click', () => {
        openTenantVerifyConfirmModal({
          userId: btn.dataset.verifyUser,
          fullName: btn.dataset.verifyName,
          nik: btn.dataset.verifyNik,
          decision: btn.dataset.verifyDecision,
        });
      });
    });
  } catch (err) {
    window.AppUtils.showAlert('tenantVerifyAlert', err.message, 'error');
  }
}

/**
 * Membuka dialog konfirmasi sebelum Admin menyetujui atau menolak pendaftaran penyewa.
 *
 * @param {{ userId: string, fullName: string, nik: string, decision: string }} action - Target keputusan verifikasi.
 * @returns {void}
 */
function openTenantVerifyConfirmModal(action) {
  pendingVerificationAction = action;
  const label = action.decision === 'APPROVED' ? 'MENYETUJUI (APPROVED)' : 'MENOLAK (REJECTED)';
  document.getElementById('confirmVerifyText').textContent =
    `Apakah Anda yakin ingin ${label} pendaftaran penyewa ${action.fullName} (NIK: ${action.nik})?`;
  const confirmBtn = document.getElementById('confirmVerifyBtn');
  confirmBtn.className =
    action.decision === 'APPROVED' ? 'btn btn-success' : 'btn btn-danger';
  confirmBtn.textContent =
    action.decision === 'APPROVED' ? 'Ya, Setujui' : 'Ya, Tolak';
  window.AppUtils.openModal('confirmVerifyModal');
}

/**
 * Mengirimkan keputusan verifikasi penyewa yang telah dikonfirmasi ke backend API.
 *
 * @returns {Promise<void>}
 */
async function executeTenantVerification() {
  if (!pendingVerificationAction) {
    return;
  }
  const { userId, decision } = pendingVerificationAction;
  const confirmBtn = document.getElementById('confirmVerifyBtn');
  confirmBtn.disabled = true;

  try {
    const res = await window.AppUtils.apiRequest(
      `/api/admin/tenants/${userId}/verify`,
      {
        method: 'PATCH',
        body: { status: decision },
      }
    );
    window.AppUtils.closeModal('confirmVerifyModal');
    window.AppUtils.showAlert('tenantVerifyAlert', res.message, 'success');
    await loadTenantsVerificationTable();
  } catch (err) {
    window.AppUtils.closeModal('confirmVerifyModal');
    window.AppUtils.showAlert('tenantVerifyAlert', err.message, 'error');
  } finally {
    confirmBtn.disabled = false;
    pendingVerificationAction = null;
  }
}

/**
 * Menginisialisasi halaman Verifikasi Penyewa Admin (public/admin/tenants.html).
 *
 * @returns {Promise<void>}
 */
async function initAdminTenantsPage() {
  const tbody = document.getElementById('tenantsTableBody');
  if (!tbody) {
    return;
  }

  const user = await window.AppUtils.requirePageAuth('ADMIN');
  if (!user) {
    return;
  }

  document
    .getElementById('filterTenantStatus')
    .addEventListener('change', loadTenantsVerificationTable);
  document
    .getElementById('filterTenantBtn')
    .addEventListener('click', loadTenantsVerificationTable);
  document
    .getElementById('confirmVerifyBtn')
    .addEventListener('click', executeTenantVerification);

  await loadTenantsVerificationTable();
}

/* ==================== Laporan Admin ==================== */

let activeReportTab = 'monthly';

/**
 * Merender 5 kartu ringkasan metrik utama untuk setiap jenis laporan Admin.
 *
 * @param {Object} summary - Objek total ringkasan dari API laporan.
 * @returns {void}
 */
function renderReportSummaryCards(summary) {
  const el = document.getElementById('reportSummaryCards');
  if (!el) {
    return;
  }
  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Jumlah Transaksi</div>
      <div class="stat-value">${summary.totalTransactions}</div>
      <div class="stat-sub">Sewa: ${summary.rentalTransactions} • Perpanjangan: ${summary.extensionTransactions}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Garasi Digunakan</div>
      <div class="stat-value">${summary.garagesUsed}</div>
      <div class="stat-sub">Unit garasi unik</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Pendapatan Sewa</div>
      <div class="stat-value" style="font-size:20px;">${window.AppUtils.formatRupiah(summary.rentalRevenue)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Pendapatan Perpanjangan</div>
      <div class="stat-value" style="font-size:20px;">${window.AppUtils.formatRupiah(summary.extensionRevenue)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Pendapatan</div>
      <div class="stat-value" style="font-size:20px;color:#1d4ed8;">${window.AppUtils.formatRupiah(summary.totalRevenue)}</div>
    </div>
  `;
}

/**
 * Mengambil dan merender Laporan Per Bulan untuk tahun yang dipilih.
 *
 * @returns {Promise<void>}
 */
async function loadMonthlyReport() {
  const year = document.getElementById('reportMonthlyYear').value;
  const res = await window.AppUtils.apiRequest(`/api/reports/monthly?year=${encodeURIComponent(year)}`);
  const data = res.data;

  renderReportSummaryCards(data.summary);

  const thead = document.getElementById('reportTableHead');
  const tbody = document.getElementById('reportTableBody');
  const tfoot = document.getElementById('reportTableFoot');

  thead.innerHTML = `
    <tr>
      <th>Bulan</th>
      <th class="num">Transaksi Sewa</th>
      <th class="num">Perpanjangan</th>
      <th class="num">Total Transaksi</th>
      <th class="num">Garasi Digunakan</th>
      <th class="num">Pendapatan Sewa</th>
      <th class="num">Pendapatan Perpanjangan</th>
      <th class="num">Total Pendapatan</th>
    </tr>`;

  tbody.innerHTML = data.rows
    .map(
      (r) => `
      <tr>
        <td><strong>${window.AppUtils.escapeHtml(r.monthName)} ${data.year}</strong></td>
        <td class="num">${r.rentalTransactions}</td>
        <td class="num">${r.extensionTransactions}</td>
        <td class="num">${r.totalTransactions}</td>
        <td class="num">${r.garagesUsed}</td>
        <td class="num">${window.AppUtils.formatRupiah(r.rentalRevenue)}</td>
        <td class="num">${window.AppUtils.formatRupiah(r.extensionRevenue)}</td>
        <td class="num"><strong>${window.AppUtils.formatRupiah(r.totalRevenue)}</strong></td>
      </tr>`
    )
    .join('');

  tfoot.innerHTML = `
    <tr>
      <td>TOTAL TAHUN ${data.year}</td>
      <td class="num">${data.summary.rentalTransactions}</td>
      <td class="num">${data.summary.extensionTransactions}</td>
      <td class="num">${data.summary.totalTransactions}</td>
      <td class="num">${data.summary.garagesUsed}</td>
      <td class="num">${window.AppUtils.formatRupiah(data.summary.rentalRevenue)}</td>
      <td class="num">${window.AppUtils.formatRupiah(data.summary.extensionRevenue)}</td>
      <td class="num">${window.AppUtils.formatRupiah(data.summary.totalRevenue)}</td>
    </tr>`;
}

/**
 * Mengambil dan merender Laporan Per Hari untuk bulan dan tahun yang dipilih.
 *
 * @returns {Promise<void>}
 */
async function loadDailyReport() {
  const year = document.getElementById('reportDailyYear').value;
  const month = document.getElementById('reportDailyMonth').value;
  const includeEmpty = document.getElementById('reportDailyIncludeEmpty').checked;

  const res = await window.AppUtils.apiRequest(
    `/api/reports/daily?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}&includeEmpty=${includeEmpty}`
  );
  const data = res.data;

  renderReportSummaryCards(data.summary);

  const thead = document.getElementById('reportTableHead');
  const tbody = document.getElementById('reportTableBody');
  const tfoot = document.getElementById('reportTableFoot');

  thead.innerHTML = `
    <tr>
      <th>Tanggal</th>
      <th class="num">Transaksi Sewa</th>
      <th class="num">Perpanjangan</th>
      <th class="num">Total Transaksi</th>
      <th class="num">Garasi Digunakan</th>
      <th class="num">Pendapatan Sewa</th>
      <th class="num">Pendapatan Perpanjangan</th>
      <th class="num">Total Pendapatan</th>
    </tr>`;

  if (data.rows.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="empty-state">Tidak ada transaksi pada bulan yang dipilih.</td></tr>';
  } else {
    tbody.innerHTML = data.rows
      .map(
        (r) => `
        <tr>
          <td><strong>${window.AppUtils.formatDateId(r.date)}</strong></td>
          <td class="num">${r.rentalTransactions}</td>
          <td class="num">${r.extensionTransactions}</td>
          <td class="num">${r.totalTransactions}</td>
          <td class="num">${r.garagesUsed}</td>
          <td class="num">${window.AppUtils.formatRupiah(r.rentalRevenue)}</td>
          <td class="num">${window.AppUtils.formatRupiah(r.extensionRevenue)}</td>
          <td class="num"><strong>${window.AppUtils.formatRupiah(r.totalRevenue)}</strong></td>
        </tr>`
      )
      .join('');
  }

  tfoot.innerHTML = `
    <tr>
      <td>TOTAL ${window.AppUtils.escapeHtml(data.monthName.toUpperCase())} ${data.year}</td>
      <td class="num">${data.summary.rentalTransactions}</td>
      <td class="num">${data.summary.extensionTransactions}</td>
      <td class="num">${data.summary.totalTransactions}</td>
      <td class="num">${data.summary.garagesUsed}</td>
      <td class="num">${window.AppUtils.formatRupiah(data.summary.rentalRevenue)}</td>
      <td class="num">${window.AppUtils.formatRupiah(data.summary.extensionRevenue)}</td>
      <td class="num">${window.AppUtils.formatRupiah(data.summary.totalRevenue)}</td>
    </tr>`;
}

/**
 * Mengambil dan merender Laporan Per Tipe Garasi sesuai filter opsional tipe dan tahun.
 *
 * @returns {Promise<void>}
 */
async function loadGarageTypeReport() {
  const garageType = document.getElementById('reportGarageTypeSelect').value;
  const year = document.getElementById('reportGarageTypeYear').value;
  const params = new URLSearchParams();
  if (garageType) params.set('garageType', garageType);
  if (year) params.set('year', year);

  const res = await window.AppUtils.apiRequest(
    `/api/reports/by-garage-type?${params.toString()}`
  );
  const data = res.data;

  renderReportSummaryCards(data.summary);

  const thead = document.getElementById('reportTableHead');
  const tbody = document.getElementById('reportTableBody');
  const tfoot = document.getElementById('reportTableFoot');

  thead.innerHTML = `
    <tr>
      <th>Tipe Garasi</th>
      <th class="num">Total Unit</th>
      <th class="num">Garasi Digunakan</th>
      <th class="num">Total Transaksi</th>
      <th class="num">Pendapatan Sewa</th>
      <th class="num">Pendapatan Perpanjangan</th>
      <th class="num">Total Pendapatan</th>
    </tr>`;

  tbody.innerHTML = data.rows
    .map(
      (r) => `
      <tr>
        <td><strong>${window.AppUtils.escapeHtml(r.garageTypeLabel)}</strong></td>
        <td class="num">${r.totalGarages} (Used: ${r.currentlyUsedGarages})</td>
        <td class="num">${r.garagesUsed}</td>
        <td class="num">${r.totalTransactions} (${r.rentalTransactions} + ${r.extensionTransactions})</td>
        <td class="num">${window.AppUtils.formatRupiah(r.rentalRevenue)}</td>
        <td class="num">${window.AppUtils.formatRupiah(r.extensionRevenue)}</td>
        <td class="num"><strong>${window.AppUtils.formatRupiah(r.totalRevenue)}</strong></td>
      </tr>`
    )
    .join('');

  tfoot.innerHTML = `
    <tr>
      <td>TOTAL</td>
      <td class="num">-</td>
      <td class="num">${data.summary.garagesUsed}</td>
      <td class="num">${data.summary.totalTransactions}</td>
      <td class="num">${window.AppUtils.formatRupiah(data.summary.rentalRevenue)}</td>
      <td class="num">${window.AppUtils.formatRupiah(data.summary.extensionRevenue)}</td>
      <td class="num">${window.AppUtils.formatRupiah(data.summary.totalRevenue)}</td>
    </tr>`;
}

/**
 * Mengambil dan merender Laporan Per Penyewa dengan filter pencarian opsional.
 *
 * @returns {Promise<void>}
 */
async function loadTenantReport() {
  const search = document.getElementById('reportTenantSearch').value.trim();
  const params = new URLSearchParams();
  if (search) params.set('search', search);

  const res = await window.AppUtils.apiRequest(
    `/api/reports/by-tenant?${params.toString()}`
  );
  const data = res.data;

  renderReportSummaryCards(data.summary);

  const thead = document.getElementById('reportTableHead');
  const tbody = document.getElementById('reportTableBody');
  const tfoot = document.getElementById('reportTableFoot');

  thead.innerHTML = `
    <tr>
      <th>Penyewa</th>
      <th>NIK</th>
      <th>Status</th>
      <th class="num">Total Transaksi</th>
      <th class="num">Garasi Digunakan</th>
      <th class="num">Pendapatan Sewa</th>
      <th class="num">Pendapatan Perpanjangan</th>
      <th class="num">Total Pendapatan</th>
    </tr>`;

  if (data.rows.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="empty-state">Tidak ada data penyewa.</td></tr>';
  } else {
    tbody.innerHTML = data.rows
      .map(
        (r) => `
        <tr>
          <td><strong>${window.AppUtils.escapeHtml(r.fullName)}</strong><br><span style="font-size:12px;color:#64748b;">${window.AppUtils.escapeHtml(r.email)}</span></td>
          <td class="mono">${window.AppUtils.escapeHtml(r.nik)}</td>
          <td>${window.AppUtils.renderStatusBadge(r.approvalStatus)}</td>
          <td class="num">${r.totalTransactions} (${r.rentalTransactions} + ${r.extensionTransactions})</td>
          <td class="num">${r.garagesUsed}</td>
          <td class="num">${window.AppUtils.formatRupiah(r.rentalRevenue)}</td>
          <td class="num">${window.AppUtils.formatRupiah(r.extensionRevenue)}</td>
          <td class="num"><strong>${window.AppUtils.formatRupiah(r.totalRevenue)}</strong></td>
        </tr>`
      )
      .join('');
  }

  tfoot.innerHTML = `
    <tr>
      <td colspan="3">TOTAL KESELURUHAN</td>
      <td class="num">${data.summary.totalTransactions}</td>
      <td class="num">${data.summary.garagesUsed}</td>
      <td class="num">${window.AppUtils.formatRupiah(data.summary.rentalRevenue)}</td>
      <td class="num">${window.AppUtils.formatRupiah(data.summary.extensionRevenue)}</td>
      <td class="num">${window.AppUtils.formatRupiah(data.summary.totalRevenue)}</td>
    </tr>`;
}

/**
 * Memuat data laporan sesuai tab laporan yang sedang aktif saat ini.
 *
 * @returns {Promise<void>}
 */
async function loadActiveReport() {
  window.AppUtils.hideAlert('reportAlert');
  try {
    if (activeReportTab === 'monthly') {
      await loadMonthlyReport();
    } else if (activeReportTab === 'daily') {
      await loadDailyReport();
    } else if (activeReportTab === 'garageType') {
      await loadGarageTypeReport();
    } else if (activeReportTab === 'tenant') {
      await loadTenantReport();
    }
  } catch (err) {
    window.AppUtils.showAlert('reportAlert', err.message, 'error');
  }
}

/**
 * Berpindah antar 4 tab laporan Admin dan menampilkan panel filter yang relevan.
 *
 * @param {'monthly'|'daily'|'garageType'|'tenant'} tabName - Nama tab laporan tujuan.
 * @returns {Promise<void>}
 */
async function switchReportTab(tabName) {
  activeReportTab = tabName;

  document.querySelectorAll('[data-report-tab]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.reportTab === tabName);
  });

  ['monthly', 'daily', 'garageType', 'tenant'].forEach((name) => {
    const panel = document.getElementById(`filterPanel-${name}`);
    if (panel) {
      panel.classList.toggle('hidden', name !== tabName);
    }
  });

  await loadActiveReport();
}

/**
 * Menginisialisasi halaman Laporan Admin (public/admin/reports.html).
 *
 * @returns {Promise<void>}
 */
async function initAdminReportsPage() {
  const reportContainer = document.getElementById('reportSummaryCards');
  if (!reportContainer) {
    return;
  }

  const user = await window.AppUtils.requirePageAuth('ADMIN');
  if (!user) {
    return;
  }

  try {
    const cfgRes = await window.AppUtils.apiRequest('/api/rentals/config');
    const [yearStr, monthStr] = cfgRes.data.todayDate.split('-');
    document.getElementById('reportMonthlyYear').value = Number(yearStr);
    document.getElementById('reportDailyYear').value = Number(yearStr);
    document.getElementById('reportDailyMonth').value = Number(monthStr);
  } catch {
    const now = new Date();
    document.getElementById('reportMonthlyYear').value = now.getFullYear();
    document.getElementById('reportDailyYear').value = now.getFullYear();
    document.getElementById('reportDailyMonth').value = now.getMonth() + 1;
  }

  document.querySelectorAll('[data-report-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchReportTab(btn.dataset.reportTab));
  });

  document.getElementById('applyMonthlyFilterBtn').addEventListener('click', loadActiveReport);
  document.getElementById('applyDailyFilterBtn').addEventListener('click', loadActiveReport);
  document.getElementById('applyGarageTypeFilterBtn').addEventListener('click', loadActiveReport);
  document.getElementById('applyTenantFilterBtn').addEventListener('click', loadActiveReport);

  await switchReportTab('monthly');
}

document.addEventListener('DOMContentLoaded', () => {
  initAdminDashboardPage();
  initAdminTenantsPage();
  initAdminReportsPage();
});
