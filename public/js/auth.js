/**
 * Modul autentikasi frontend yang menangani halaman Login dan Registrasi Penyewa.
 * @module frontend/auth
 */

/**
 * Memeriksa apakah pengguna sudah memiliki sesi login aktif di halaman login/registrasi,
 * lalu mengarahkan langsung ke dashboard sesuai role masing-masing.
 *
 * @returns {Promise<void>}
 */
async function redirectIfAuthenticated() {
  try {
    const res = await window.AppUtils.apiRequest('/api/auth/me');
    if (res.data && res.data.role === 'ADMIN') {
      window.location.href = '/admin/dashboard.html';
    } else if (res.data && res.data.role === 'TENANT') {
      window.location.href = '/tenant/dashboard.html';
    }
  } catch {
    // Pengguna belum login; tetap berada di halaman autentikasi
  }
}

/**
 * Menginisialisasi event submit form login pada halaman public/index.html.
 *
 * @returns {void}
 */
function initLoginPage() {
  const form = document.getElementById('loginForm');
  if (!form) {
    return;
  }

  redirectIfAuthenticated();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    window.AppUtils.hideAlert('authAlert');

    const submitBtn = document.getElementById('loginSubmitBtn');
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Memproses...';

    try {
      const res = await window.AppUtils.apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      const user = res.data.user;
      if (user.role === 'ADMIN') {
        window.location.href = '/admin/dashboard.html';
      } else {
        window.location.href = '/tenant/dashboard.html';
      }
    } catch (err) {
      window.AppUtils.showAlert('authAlert', err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Masuk ke Sistem';
    }
  });
}

/**
 * Menginisialisasi event submit form pendaftaran penyewa pada halaman public/tenant/register.html.
 *
 * @returns {void}
 */
function initRegisterPage() {
  const form = document.getElementById('registerForm');
  if (!form) {
    return;
  }

  redirectIfAuthenticated();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    window.AppUtils.hideAlert('registerAlert');

    const submitBtn = document.getElementById('registerSubmitBtn');
    const payload = {
      nik: document.getElementById('nik').value.trim(),
      fullName: document.getElementById('fullName').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value,
    };

    const confirmPassword = document.getElementById('confirmPassword').value;
    if (payload.password !== confirmPassword) {
      window.AppUtils.showAlert(
        'registerAlert',
        'Konfirmasi password tidak cocok.',
        'error'
      );
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Mendaftarkan...';

    try {
      const res = await window.AppUtils.apiRequest('/api/auth/register', {
        method: 'POST',
        body: payload,
      });

      window.AppUtils.showAlert(
        'registerAlert',
        `${res.message} Anda sekarang dapat login untuk memeriksa status persetujuan akun.`,
        'success'
      );
      form.reset();
    } catch (err) {
      window.AppUtils.showAlert('registerAlert', err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Daftar Sebagai Penyewa';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initLoginPage();
  initRegisterPage();
});
