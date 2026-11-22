/**
 * Modul manajemen garasi frontend untuk pembuatan garasi massal dan inventaris garasi Admin.
 * @module frontend/garage
 */

/**
 * Menampilkan atau menyembunyikan input tarif pengisian listrik per kWh
 * sesuai tipe garasi yang dipilih (hanya tampil untuk Garasi Mobil Listrik).
 *
 * @returns {void}
 */
function toggleElectricityRateField() {
  const typeSelect = document.getElementById('garageType');
  const elecGroup = document.getElementById('electricityRateGroup');
  const elecInput = document.getElementById('electricityRatePerKwh');
  if (!typeSelect || !elecGroup || !elecInput) {
    return;
  }

  const isEv = typeSelect.value === 'EV';
  elecGroup.classList.toggle('hidden', !isEv);
  elecInput.required = isEv;
  if (!isEv) {
    elecInput.value = '';
  }
}

/**
 * Merender kartu ringkasan jumlah unit, sisa kapasitas urutan (maks 999),
 * serta tarif terkini dari tabel garage_types untuk ketiga tipe garasi.
 *
 * @param {Array<Object>} sequences - Daftar counter urutan & tarif dari respons GET /api/garages.
 * @returns {void}
 */
function renderGarageSequenceSummary(sequences) {
  const container = document.getElementById('sequenceSummary');
  if (!container) {
    return;
  }
  const labels = window.AppUtils.GARAGE_TYPE_LABELS;

  container.innerHTML = sequences
    .map((seq) => {
      const rateInfo =
        seq.dailyRate > 0
          ? `Tarif: ${window.AppUtils.formatRupiah(seq.dailyRate)}/hari${seq.erPerKwh ? ` • ${window.AppUtils.formatRupiah(seq.erPerKwh)}/kWh` : ''}`
          : 'Tarif belum diatur';
      return `
      <div class="stat-card">
        <div class="stat-label">${window.AppUtils.escapeHtml(labels[seq.garageType] || seq.garageType)} (${window.AppUtils.escapeHtml(seq.codePrefix)})</div>
        <div class="stat-value">${window.AppUtils.escapeHtml(seq.lastNumber)} / 999</div>
        <div class="stat-sub">Sisa kapasitas: ${window.AppUtils.escapeHtml(seq.remainingCapacity)} unit • ${window.AppUtils.escapeHtml(rateInfo)}</div>
      </div>`;
    })
    .join('');
}

/**
 * Mengambil daftar garasi sesuai filter tipe, status, dan pencarian ID lalu merendernya ke tabel.
 *
 * @returns {Promise<void>}
 */
async function loadGaragesTable() {
  const tbody = document.getElementById('garagesTableBody');
  if (!tbody) {
    return;
  }

  const type = document.getElementById('filterGarageType').value;
  const status = document.getElementById('filterGarageStatus').value;
  const search = document.getElementById('filterGarageSearch').value.trim();

  const params = new URLSearchParams();
  if (type) params.set('garageType', type);
  if (status) params.set('status', status);
  if (search) params.set('search', search);

  try {
    const res = await window.AppUtils.apiRequest(`/api/garages?${params.toString()}`);
    const { garages, sequences } = res.data;

    renderGarageSequenceSummary(sequences);

    if (garages.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="empty-state">Belum ada data garasi yang sesuai filter.</td></tr>';
      return;
    }

    tbody.innerHTML = garages
      .map(
        (g) => `
        <tr>
          <td class="mono">${window.AppUtils.escapeHtml(g.id)}</td>
          <td>${window.AppUtils.escapeHtml(g.garageTypeLabel)}</td>
          <td class="num">${window.AppUtils.escapeHtml(window.AppUtils.formatRupiah(g.dailyRate))}</td>
          <td class="num">${window.AppUtils.escapeHtml(window.AppUtils.formatRupiah(g.monthlyRate))}</td>
          <td class="num">${
            g.electricityRatePerKwh !== null
              ? window.AppUtils.escapeHtml(window.AppUtils.formatRupiah(g.electricityRatePerKwh)) + '/kWh'
              : '-'
          }</td>
          <td>${window.AppUtils.renderStatusBadge(g.status)}</td>
        </tr>`
      )
      .join('');
  } catch (err) {
    window.AppUtils.showAlert('garagePageAlert', err.message, 'error');
  }
}

/**
 * Menginisialisasi halaman Manajemen Garasi Admin (public/admin/garages.html).
 *
 * @returns {Promise<void>}
 */
async function initAdminGaragesPage() {
  const form = document.getElementById('createGarageBatchForm');
  if (!form) {
    return;
  }

  const user = await window.AppUtils.requirePageAuth('ADMIN');
  if (!user) {
    return;
  }

  const typeSelect = document.getElementById('garageType');
  typeSelect.addEventListener('change', toggleElectricityRateField);
  toggleElectricityRateField();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    window.AppUtils.hideAlert('garageFormAlert');

    const submitBtn = document.getElementById('createGarageBtn');
    const garageType = document.getElementById('garageType').value;
    const quantity = Number(document.getElementById('quantity').value);
    const dailyRate = Number(document.getElementById('dailyRate').value);
    const elecRaw = document.getElementById('electricityRatePerKwh').value;

    const body = {
      garageType,
      quantity,
      dailyRate,
      electricityRatePerKwh:
        garageType === 'EV' ? Number(elecRaw) : null,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Menyimpan...';

    try {
      const res = await window.AppUtils.apiRequest('/api/garages/batch', {
        method: 'POST',
        body,
      });
      window.AppUtils.showAlert('garageFormAlert', res.message, 'success');
      form.reset();
      toggleElectricityRateField();
      await loadGaragesTable();
    } catch (err) {
      window.AppUtils.showAlert('garageFormAlert', err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Buat Garasi';
    }
  });

  document.getElementById('filterGarageType').addEventListener('change', loadGaragesTable);
  document.getElementById('filterGarageStatus').addEventListener('change', loadGaragesTable);
  document.getElementById('filterGarageBtn').addEventListener('click', loadGaragesTable);

  await loadGaragesTable();
}

document.addEventListener('DOMContentLoaded', () => {
  initAdminGaragesPage();
});
