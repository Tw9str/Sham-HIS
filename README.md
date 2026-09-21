# Sham Clinic — عيادة شام

A bilingual Next.js hospital workspace with persistent SQLite or PostgreSQL records, server-enforced roles, and connected clinical and administrative screens. This is a working **first evaluation release**, not a complete or clinically certified enterprise HIS.

## Run locally

Requires Node.js 24 (uses `node:sqlite`).

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open http://127.0.0.1:3000. Development and production scripts bind to loopback by default.

Demo accounts: `admin@sham.clinic`, `doctor@sham.clinic`, `nurse@sham.clinic`, `reception@sham.clinic`, `lab@sham.clinic`, `pharmacy@sham.clinic`, and `billing@sham.clinic`. All use **ShamDemo2026!**. Use the role buttons on the login page. Demo mode contains fictional data. Hosted demos require a unique SHAM_DEMO_PASSWORD; see [Vercel deployment](docs/deployment.md).

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm start
```

Browser tests use installed Microsoft Edge, an isolated `.test-data/e2e.sqlite` database, and a separate `.next-e2e` build directory on port 3100. Screenshots are saved to `test-results/`. If Edge is unavailable, install Playwright Chromium and adjust the browser channel in `playwright.config.ts`. Use `npm run format` / `npm run format:check` for source formatting.

## Vercel

Configure hosted PostgreSQL with DATABASE_URL. Follow [docs/deployment.md](docs/deployment.md) for environment variables, seeding, and deployment verification. Existing local records are not automatically migrated.

## Implemented

- English / Arabic with persistent language selection, RTL layout, a locally bundled licensed Arabic font, responsive navigation, keyboard-accessible native dialogs, CSV export, and print/PDF through the browser.
- Hospital overview based on stored data, 7-day appointment chart, bed availability, priority queues, global bilingual search, and role-specific navigation.
- Patient registration and editing, demographic data, allergy flags, encounter history, orders, medications, invoices, and patient chart printing.
- Appointments, clinical encounters, emergency tracking, admissions and transfers through editing the bed, nursing tasks, laboratory, radiology reports, pharmacy, surgery, billing, insurance tracking, inventory, procurement tracking, housekeeping, biomedical maintenance, quality incidents, and staff roster records.
- Typed forms, required fields, statuses, record detail views, optimistic version checks, and final-record write protection.
- Duplicate active admission / occupied-bed checks; appointment conflicts at the same clinician/patient/date/time; exact decimal input validation for amounts.
- Results required before lab / radiology completion; diagnosis and assessment required to sign encounters; completion notes required for nursing, surgery, quality, and equipment workflows.
- Pharmacy dispensing atomically deducts stock and rejects expired/inactive/insufficient inventory. Pharmacist permission required. Selection of the correct medication and stock lot is a manual clinical responsibility; there is no drug dictionary or automated matching.
- Issued invoices are immutable; paid invoices cannot be edited or voided. Billing permission required to record payment. These are local payment records, not payment processing or a general ledger.
- Password hashing with scrypt, hashed opaque sessions in HttpOnly/SameSite cookies, a 12-hour session lifetime, password-change session revocation, per-account login throttling, origin checks, input validation, and server-side read/write permissions.
- Transactional audit events. Audit view shows the latest 300 events; the database retains older events. Audit data is application-read-only, **not** tamper-evident against filesystem/database administrators.
- SQLite persistence locally and hosted PostgreSQL on Vercel, with transactional writes and foreign keys. No patient data is stored in browser local storage; only the language preference is stored there.

## Architecture

- `app/api/hospital/route.ts`: authenticated API and same-origin mutation checks.
- `lib/store.ts`: asynchronous store and database selection; `lib/domain-store.ts`: identity, authorization, and workflow rules; `lib/*-database.ts`: transactional storage adapters.
- `lib/catalog.ts`: bilingual module definitions, roles, statuses, and field metadata.
- `lib/validation.ts`: Zod schemas, dates, integers, monetary input validation.
- `lib/seed.ts`: fictional evaluation data.
- `components/`: dashboard, work queues, charts, forms, app shell, and settings.
- `tests/`: domain integration tests and browser workflows.

Use `.env.example` for configuration. An empty non-demo workspace requires `SHAM_DEMO_MODE=false`, a **new** `SHAM_DB_PATH`, and `SHAM_ADMIN_PASSWORD` with at least 12 characters. It starts with one administrator and no fictional records. Changing demo mode on an existing database is intentionally rejected. Non-demo mode does not make this release production-ready. Changing `SHAM_ADMIN_PASSWORD` after initialization does not rotate an existing password; use Account security.

## Scope and next milestones

See [docs/enterprise-roadmap.md](docs/enterprise-roadmap.md) for the implementation boundary and the work needed for hospital deployment. No feature is claimed to be certified, jurisdiction-compliant, or integrated merely because its module screen exists. Review clinical workflows with hospital staff before any real use.

Arabic font: Noto Sans Arabic, bundled under the SIL Open Font License; see `public/fonts/OFL.txt`.
