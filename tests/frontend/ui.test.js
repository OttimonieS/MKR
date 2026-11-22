// @vitest-environment jsdom
/**
 * Pengujian otomatis UI/Frontend Vanilla JavaScript menggunakan Vitest + JSDOM.
 * Memverifikasi sanitasi XSS, penutupan modal patuh CSP, toggle form EV Admin,
 * gerbang status penyewa, pemilihan tanggal mulai, dan notifikasi + redirect setelah transaksi sewa.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
const fs = require('fs');
const path = require('path');

/**
 * Mengeksekusi skrip frontend Vanilla JS ke dalam konteks global window JSDOM.
 *
 * @param {string} relativePath - Path relatif file JS dari root project.
 * @returns {void}
 */
function loadFrontendScript(relativePath) {
  const fullPath = path.resolve(process.cwd(), relativePath);
  const code = fs.readFileSync(fullPath, 'utf8');
  window.eval(code);
}

describe('Frontend UI — Vanilla JS & DOM Behavior (JSDOM)', () => {
  beforeEach(() => {
    document.documentElement.innerHTML = '<head></head><body></body>';
    document.documentElement.removeAttribute('data-modal-close-bound');
    delete window.AppUtils;
    vi.restoreAllMocks();
  });

  it('escapeHtml mencegah XSS dan formatters memformat Rupiah, tanggal, serta badge status', () => {
    loadFrontendScript('public/js/utils.js');

    expect(window.AppUtils.escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
    expect(window.AppUtils.formatDateId('2026-02-28')).toBe('28 Feb 2026');
    expect(window.AppUtils.formatRupiah(2500000)).toContain('2.500.000');
    expect(window.AppUtils.renderStatusBadge('APPROVED')).toContain('badge-approved');
    expect(window.AppUtils.renderStatusBadge('USED')).toContain('badge-used');
  });

  it('penutupan modal bekerja melalui atribut data-close-modal tanpa inline onclick (patuh CSP)', () => {
    document.body.innerHTML = `
      <div id="demoModal" class="modal-backdrop">
        <button type="button" id="closeBtn" data-close-modal="demoModal">&times;</button>
      </div>
    `;
    loadFrontendScript('public/js/utils.js');
    window.AppUtils.bindModalCloseHandlers();

    const modal = document.getElementById('demoModal');
    expect(modal.classList.contains('hidden')).toBe(false);

    document.getElementById('closeBtn').click();
    expect(modal.classList.contains('hidden')).toBe(true);
  });

  it('halaman Manajemen Garasi menampilkan input tarif listrik/kWh hanya untuk tipe EV', () => {
    document.body.innerHTML = `
      <select id="garageType">
        <option value="BIKE">BIKE</option>
        <option value="CAR">CAR</option>
        <option value="EV">EV</option>
      </select>
      <div id="electricityRateGroup" class="hidden">
        <input id="electricityRatePerKwh" type="number" value="2500">
      </div>
    `;
    loadFrontendScript('public/js/utils.js');
    loadFrontendScript('public/js/garage.js');

    const select = document.getElementById('garageType');
    const group = document.getElementById('electricityRateGroup');
    const input = document.getElementById('electricityRatePerKwh');

    select.value = 'EV';
    window.eval('toggleElectricityRateField()');
    expect(group.classList.contains('hidden')).toBe(false);
    expect(input.required).toBe(true);

    select.value = 'CAR';
    window.eval('toggleElectricityRateField()');
    expect(group.classList.contains('hidden')).toBe(true);
    expect(input.required).toBe(false);
    expect(input.value).toBe('');
  });

  it('banner status penyewa menampilkan peringatan untuk PENDING, error untuk REJECTED, dan tersembunyi untuk APPROVED', () => {
    document.body.innerHTML = '<div id="banner" class="alert hidden"></div>';
    loadFrontendScript('public/js/utils.js');
    loadFrontendScript('public/js/tenant.js');

    const banner = document.getElementById('banner');

    window.eval("renderTenantStatusNotice({ approvalStatus: 'PENDING' }, 'banner')");
    expect(banner.classList.contains('hidden')).toBe(false);
    expect(banner.className).toContain('alert-warning');

    window.eval("renderTenantStatusNotice({ approvalStatus: 'REJECTED' }, 'banner')");
    expect(banner.classList.contains('hidden')).toBe(false);
    expect(banner.className).toContain('alert-error');

    window.eval("renderTenantStatusNotice({ approvalStatus: 'APPROVED' }, 'banner')");
    expect(banner.classList.contains('hidden')).toBe(true);
  });

  it('form Sewa Garasi Baru mengirim startDate pilihan penyewa saat memuat config & garasi tersedia', async () => {
    document.body.innerHTML = `
      <div id="newRentalAlert" class="alert hidden"></div>
      <select id="vehicleType"><option value="CAR">CAR</option></select>
      <select id="compatibleGarageType"><option value="CAR">CAR</option></select>
      <select id="rentalType"><option value="DAILY">DAILY</option><option value="MONTHLY">MONTHLY</option></select>
      <input id="durationDays" type="number" value="1">
      <span id="durationHint"></span>
      <input id="startDate" type="date" value="2028-02-10">
      <input id="endDateDisplay" type="text" readonly>
      <select id="garageId"></select>
      <input id="plateNumber" type="text" value="L 1234 AA">
      <input id="brand" type="text" value="Toyota">
      <input id="model" type="text" value="Avanza">
      <input id="batteryCapacityKwh" type="number" value="">
      <div id="rentalCostSummary"></div>
    `;

    const mockFetch = vi.fn().mockImplementation(async (url) => {
      if (url.startsWith('/api/rentals/config')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              todayDate: '2026-11-21',
              startDate: '2028-02-10',
              monthlyDays: 29,
              maxDailyDays: 28,
              compatibility: { CAR: ['CAR'] },
            },
          }),
        };
      }
      if (url.startsWith('/api/garages/available')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              startDate: '2028-02-10',
              endDate: '2028-03-09',
              durationDays: 29,
              garages: [],
            },
          }),
        };
      }
      return { ok: true, status: 200, json: async () => ({ success: true, data: {} }) };
    });
    globalThis.fetch = mockFetch;

    loadFrontendScript('public/js/utils.js');
    loadFrontendScript('public/js/rental.js');

    document.getElementById('rentalType').value = 'MONTHLY';
    await window.eval('handleStartDateChange()');

    expect(mockFetch.mock.calls[0][0]).toBe('/api/rentals/config?startDate=2028-02-10');
    expect(document.getElementById('durationDays').value).toBe('29');
    expect(mockFetch.mock.calls[1][0]).toContain('startDate=2028-02-10');
    expect(document.getElementById('endDateDisplay').value).toContain('2028-03-09');
  });

  it('klik Simpan Transaksi Sewa menampilkan notifikasi toast, menyimpan flash notice, dan mengarahkan ke Riwayat Sewa', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <div id="newRentalAlert" class="alert hidden"></div>
      <form id="newRentalForm" novalidate>
        <select id="vehicleType"><option value="CAR">CAR</option></select>
        <input id="plateNumber" type="text" value="L 1234 AA">
        <input id="brand" type="text" value="Toyota">
        <input id="model" type="text" value="Avanza">
        <input id="batteryCapacityKwh" type="number" value="">
        <input id="startDate" type="date" value="2026-11-21">
        <select id="rentalType"><option value="DAILY">DAILY</option></select>
        <input id="durationDays" type="number" value="3">
        <select id="garageId"><option value="C001">C001</option></select>
        <input id="paymentProof" type="file">
        <button type="submit" id="submitRentalBtn">Simpan Transaksi Sewa</button>
      </form>
    `;

    const fileInput = document.getElementById('paymentProof');
    const fakeFile = new File(['pngdata'], 'bukti.png', { type: 'image/png' });
    Object.defineProperty(fileInput, 'files', {
      value: [fakeFile],
      configurable: true,
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        message: 'Penyewaan garasi C001 berhasil disimpan.',
        data: { id: 'r1', garageId: 'C001' },
      }),
    });

    loadFrontendScript('public/js/utils.js');
    loadFrontendScript('public/js/rental.js');

    await window.eval(
      'handleCreateRentalSubmit({ preventDefault() {} })'
    );

    const toast = document.querySelector('#appToastContainer .toast-success');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toContain('Penyewaan garasi C001 berhasil disimpan.');

    const alertEl = document.getElementById('newRentalAlert');
    expect(alertEl.classList.contains('hidden')).toBe(false);
    expect(alertEl.textContent).toContain('Mengalihkan ke halaman Riwayat Sewa');

    const flash = window.AppUtils.consumeFlashNotice();
    expect(flash).toEqual({
      message: 'Penyewaan garasi C001 berhasil disimpan.',
      type: 'success',
    });

    vi.useRealTimers();
  });
});
