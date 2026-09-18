# DPS Echo (`dps_echo`)

School administration portal for the **Delhi Public School Kanpur** group
(`https://echo.dpskanpur.com`), covering four campuses: Azad Nagar, Barra,
Kidwai Nagar and Servodaya Nagar.

**Stack:** Next.js 15 (App Router) · TypeScript · Prisma · PostgreSQL ·
Tailwind · Google Cloud Run

**Runtime:** Node 22 LTS (`.nvmrc`). The container image builds on
`node:22-alpine`; Node 20 reached end of life in April 2026 and no longer
receives security patches.

---

## Modules

| Module | What it covers |
|---|---|
| Student Information | Admissions (staff + public online), student dossier, guardians, documents, class/section masters, bulk CSV import |
| Fee & Finance | Fee heads, class-wise structures, invoices, receipts, partial payments, discounts, ledger, defaulters, daily cashier register |
| Online Payments | Parent self-service fee payment via Razorpay (UPI / cards / net banking) |
| Notifications | Fee due & overdue reminders, payment receipts and announcements over email + SMS |
| Transfer Certificate | CBSE-format TC issuance with QR-based public verification |
| Alumni | Graduated student archive |
| RBAC | Per-module view/update/delete matrix for staff, scoped by campus |

> Transfer Certificate and Alumni were built beyond the original module scope —
> they are in production use and carry their own maintenance cost.

---

## Access model

Staff sign in with Google Workspace; only `@dpskanpur.com` accounts are
accepted. New accounts land in `PENDING` and get no access until an
administrator grants permissions in the RBAC console.

There is **no bypass login**. Authentication fails closed: a missing, forged
or idle-expired session is anonymous, and anonymous callers reach only the
public pages (`/pay`, `/verify-tc`, `/public-registration`, `/login`).

A user carrying a `campusId` is pinned to that campus. Editing `?campus=` in
the URL, or posting another campus's record id to a server action, is refused
server-side rather than filtered in the UI.

---

## Local development

```bash
# 0. Match the runtime used in production
nvm use            # reads .nvmrc -> Node 22 LTS

# 1. Start PostgreSQL
docker compose up -d

# 2. Configure the environment
cp .env.example .env        # then fill in the values (see below)

# 3. Create the schema and seed reference data
npx prisma migrate dev --name init
npm run db:seed

# 4. Run
npm install
npm run dev                 # http://localhost:8088
```

`SESSION_SECRET` is required in production — the app refuses to start without
it, because a default signing key would let anyone forge an administrator
session. Generate one with `openssl rand -hex 32`.

For Google sign-in, register `http://localhost:8088/api/auth/callback/google`
as an authorized redirect URI on the OAuth client.

---

## Payments

Online payment is only enabled when `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
and `RAZORPAY_WEBHOOK_SECRET` are all set; otherwise the public fee page shows
dues but disables the pay button rather than pretending to collect money.

A fee is marked paid in exactly one place: the signed webhook at
`/api/payments/webhook`. The browser callback is never treated as proof of
payment. Configure the webhook in the Razorpay dashboard against
`payment.captured` and `payment.failed`. Every delivery is recorded by event
id, so a replayed webhook cannot produce a second receipt.

---

## Scheduled jobs

Fee reminders run from Cloud Scheduler:

```bash
curl -X POST https://echo.dpskanpur.com/api/cron/fee-reminders \
     -H "x-cron-secret: $CRON_SECRET"
```

It marks past-due invoices `OVERDUE`, queues due/overdue reminders on every
channel a parent can be reached on, then flushes the queue. Re-running it is
safe — a parent is not messaged twice for the same invoice in the same window.

Unconfigured channels record messages as `SKIPPED` instead of dropping them,
so nothing is lost while a provider is being set up.

---

## API

`/api/v1/students` accepts either a staff session or a service token:

```bash
curl https://echo.dpskanpur.com/api/v1/students?query=sharma \
     -H "Authorization: Bearer $ECHO_API_KEY"
```

Token auth is disabled entirely when `ECHO_API_KEY` is unset. Set
`ECHO_API_CAMPUS_ID` to pin a token to one campus.

---

## Deployment

Cloud Build builds the image and deploys to Cloud Run with Cloud SQL attached
and secrets injected from Secret Manager. Before the first deploy:

1. Create the Cloud SQL (PostgreSQL) instance named in `_SQL_INSTANCE`.
2. Create the Secret Manager secrets referenced in `cloudbuild.yaml`.
3. Grant the runtime service account `roles/cloudsql.client` and
   `roles/secretmanager.secretAccessor`.

Migrations are **not** applied during the image build. Apply them deliberately
against Cloud SQL (via the Cloud SQL Auth Proxy) before rolling out a release:

```bash
cloud-sql-proxy dpskanpur-backup:asia-southeast1:dps-echo-db &
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/dps_echo" \
  npx prisma migrate deploy
```

---

## Git workflow

> Direct pushes to `main` are blocked. All work goes to `dev`.

```bash
git checkout dev
git pull origin dev
git add -A
git commit -m "feat(fees): ..."
git push origin dev
```

Open a pull request from `dev` to `main`; merging triggers the production
Cloud Run deployment.
