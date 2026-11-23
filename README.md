# Garage Rental Management System

Aplikasi web manajemen penyewaan garasi kendaraan berbasis basis data relasional SQLite untuk proyek **Uji Kompetensi Pemrogram (KKNI / LSP)**.

## 1. Tech Stack & Library

- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Fetch API (tanpa framework & build tools).
- **Backend**: Node.js, Express.js (`^4.21.2`), `cookie-parser` (`^1.4.7`), `jsonwebtoken` (`^9.0.2`), `multer` (`^2.5.0`).
- **Database**: SQLite via `better-sqlite3` (`^12.0.0`) dengan 8 tabel relasional sesuai ERD (`PRAGMA foreign_keys = ON`, transaksi atomik).
- **Testing**: `vitest` (`^3.0.5`) & `supertest` (`^7.0.0`) untuk White Box dan Black Box Testing.
- **Documentation**: JSDoc bahasa Indonesia pada setiap function dan diagram UML (`UML/`).

## 2. Cara Instalasi & Menjalankan

```bash
npm install
npm run db:init
npm run db:seed
npm start
```

Buka browser di `http://localhost:3000`.

### Akun Demo Admin (dari `npm run db:seed`)

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@garagerental.com` | `Admin123!` |

## 3. Menjalankan Unit Testing

```bash
npm test
```

## 4. Struktur Project

```text
.
├── public/                     # Frontend Desktop (HTML5, CSS3, Vanilla JS)
│   ├── index.html
│   ├── admin/                  # garages, tenants, extensions, reports
│   ├── tenant/                 # register, new-rental, rentals, profile
│   ├── css/style.css
│   └── js/                     # utils, auth, admin, garage, rental, tenant
├── src/                        # Backend Node.js & Express.js
│   ├── app.js
│   ├── controllers/controllers.js
│   ├── routes/api.js
│   ├── services/               # AuthService, GarageService, RentalService, ReportService
│   ├── repositories/           # UserRepository, GarageRepository, RentalRepository, ReportRepository
│   ├── models/entities.js      # 9 Kelas OOP
│   ├── middleware/             # auth.js, common.js
│   ├── database/               # db.js, init.js, seed.js
│   └── utils/                  # constants.js, rentalMath.js, validators.js
├── tests/
│   ├── unit/businessLogic.test.js
│   └── integration/api.test.js
├── package.json
├── server.js
└── README.md
```
