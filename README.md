# DPS Echo (`dps_echo`)

Official school administration and admissions portal for the **Delhi Public School Kanpur** group, covering four campuses: **DPS Azad Nagar (AZD)**, **DPS Barra (BAR)**, **DPS Kidwai Nagar (KID)**, and **DPS Servodaya Nagar (SRV)**.

**Live Service URL:** [https://echo.dpskanpur.com](https://echo.dpskanpur.com)  
**Cloud Run URL:** [https://dps-echo-1095199168782.asia-southeast1.run.app](https://dps-echo-1095199168782.asia-southeast1.run.app)

**Tech Stack:** Next.js 15 (App Router) · TypeScript · Prisma ORM · PostgreSQL · Tailwind CSS · Google Cloud Run · GCP Cloud Build

**Runtime:** Node 22 LTS (`.nvmrc`). The container image builds on `node:22-alpine`.

---

## 1. Key Modules & Features

| Module | Features & Capabilities |
|---|---|
| **Student Directory & Dossier** | Admissions (staff + public online form), student dossier, guardian info, document uploads, class/section masters, drag-and-drop **CSV Bulk Import** |
| **Public Online Registration** | Mobile-responsive public admission form (`/public-registration`) with Razorpay online gateway payment |
| **Fee & Financial Management** | Class-wise fee structures, quarterly invoices, payment receipts, partial fee collection, discounts, ledger, defaulters register, cashier daily register |
| **Online Payments** | Razorpay integration (UPI, Credit/Debit Cards, NetBanking, Wallets) with webhooks (`/api/payments/webhook`) |
| **Notifications** | Automated fee due/overdue reminders over email & SMS |
| **Transfer Certificate (TC)** | CBSE-format TC generator with QR code public verification portal (`/verify-tc`) |
| **Alumni Network** | Archive of graduated students |
| **Campus RBAC Console** | Module-level permission matrix (View / Update / Delete) scoped per campus (`/admin/rbac`) |

---

## 2. Authentication & Security Model

- **Staff Authentication**: Restricted to Google Workspace `@dpskanpur.com` email accounts.
- **Role-Based Access**: New staff land in `PENDING` status and require explicit permission assignment by a Super Admin in `/admin/rbac`.
- **Anonymous Access**: Only public routes are accessible without a session: `/login`, `/pay`, `/verify-tc`, `/public-registration`.
- **Session Security**: Signed HMAC session cookies validated via `lib/session-cookie.ts` and enforced in `middleware.ts`.

---

## 3. Local Development Setup

```bash
# 1. Use Node 22 LTS
nvm use

# 2. Install dependencies
npm install

# 3. Configure local environment
cp .env.example .env

# 4. Start PostgreSQL (or local container)
docker compose up -d

# 5. Apply Prisma migrations & seed reference data
npx prisma migrate dev --name init
npm run db:seed

# 6. Start development server on port 8088
npm run dev
```

Local server starts at `http://localhost:8088/`.

---

## 4. Multi-Repository CLI Workflow (`scripts/dps_manager.py`)

All development across the 8 DPS Kanpur repositories follows strict Git workflows:

```bash
# Check branch status
python3 scripts/dps_manager.py status --site dps_echo

# Commit & push changes to dev branch
python3 scripts/dps_manager.py push -m "feat(module): description" --site dps_echo

# Create Pull Request (dev -> main)
python3 scripts/dps_manager.py pr create --site dps_echo -t "Title"

# Merge PR into main (Triggers GCP Cloud Build & Cloud Run deployment)
python3 scripts/dps_manager.py pr merge --site dps_echo
```

---

## 5. Production Infrastructure & Cloud Build

- **Google Cloud Run**: Deployed to region `asia-southeast1` in GCP project `dpskanpur-backup`.
- **Containerization**: `Dockerfile` using multi-stage Node 22 Alpine build with Next.js standalone output (`output: "standalone"`).
- **Automated Pipeline**: Merging to `main` triggers GCP Cloud Build (`cloudbuild.yaml`) to build the Docker image and update the `dps-echo` Cloud Run service.
