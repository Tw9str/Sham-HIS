# Deploy Sham Clinic to Vercel

Vercel functions cannot persist the local SQLite file. Setting `SHAM_DB_PATH` to `/tmp` would lose records and sessions across instances. Configure hosted PostgreSQL instead; the app selects it whenever `DATABASE_URL` is set.

1. Create a PostgreSQL database, for example through [Neon on Vercel Marketplace](https://vercel.com/marketplace/neon). Use the provider's pooled connection URL, including its TLS options.
2. In Vercel → Project → Settings → Environment Variables, set the values below for Production. Keep credentials server-only; never use a `NEXT_PUBLIC_` prefix.
3. Select Node.js 24.x in Project Settings and redeploy. The first API request creates the tables and initializes an empty database in one transaction. Alternatively run `npm run db:setup` with these variables configured locally in `.env.local`.
4. Open the deployment and sign in as `admin@sham.clinic` using your configured password.

| Variable              | Empty workspace                              | Fictional evaluation workspace               |
| --------------------- | -------------------------------------------- | -------------------------------------------- |
| `DATABASE_URL`        | Hosted PostgreSQL URL                        | A separate hosted PostgreSQL URL             |
| `SHAM_DEMO_MODE`      | `false`                                      | `true`                                       |
| `SHAM_ADMIN_PASSWORD` | Unique password, at least 12 characters      | Not used                                     |
| `SHAM_PUBLIC_ORIGIN`  | Exact HTTPS origin, without a trailing slash | Exact HTTPS origin, without a trailing slash |

Demo mode shows the role selector and the default password **ShamDemo2026!** locally and on Vercel. SHAM_ADMIN_PASSWORD is used only to initialize a non-demo workspace. Existing passwords are preserved by database setup; Account security changes an existing password. Separate Preview and Production databases and configure each deployment's origin correctly.

## Source of truth and seeding

PostgreSQL is the deployed source of truth when `DATABASE_URL` is configured. Without it, local development uses `SHAM_DB_PATH` or `data/sham.sqlite`. `lib/seed.ts` supplies initial fictional data and staff names only when the database is empty. Normal startup and `db:setup` preserve existing records, names, and passwords. Changing seed code does not update existing rows. An existing database cannot switch demo mode.

Local SQLite records are not uploaded or migrated by this change. A new cloud database starts independently. Back up and explicitly migrate existing records if you need them in the deployment.

## Runtime behavior and verification

Each PostgreSQL operation uses one checked-out pool connection. Mutations acquire a transaction advisory lock so admission, appointment, stock, audit, and version checks remain atomic across instances. Reads use a consistent read-only snapshot. This intentionally serializes writes for this first single-hospital release; high-volume deployment needs narrower locks and performance testing. Vercel manages idle pool connections through `@vercel/functions`.

The automated suite runs workflow SQL against SQLite and embedded PostgreSQL (PGlite). A real hosted connection, TLS configuration, provider permissions, and Vercel deployment still require a deployment smoke test. Verify login/logout, patient creation, refresh persistence, Arabic digits, and role permissions after deployment.

A missing `DATABASE_URL` on Vercel returns `503 DATABASE_URL_REQUIRED`, rather than attempting to create `/var/task/data`. Connection failures never silently switch to SQLite. Provider credentials and connection strings are excluded from API responses and error logs.

This resolves storage compatibility. The clinical and enterprise limitations in [enterprise-roadmap.md](enterprise-roadmap.md) still apply.
