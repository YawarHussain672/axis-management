# Axis Max Life — Print Management System

A production-ready print project management platform built for Axis Max Life Insurance. Manages the full lifecycle of print collateral projects — from request and approval through production, dispatch, and delivery.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)

---

## Features

| Module | Description |
|---|---|
| **Authentication** | Role-based login (Admin / POC) via NextAuth credentials |
| **Projects** | Create, edit, delete print projects with multi-collateral support |
| **Approvals** | Approve / reject / send reminders on pending project requests |
| **Dispatch & Tracking** | Bulk upload courier data via Excel, track shipments, upload POD |
| **Documents** | Upload PO, Challan, and Tax Invoice files to Cloudinary per project |
| **Rate Card** | Manage pricing slabs for all print collateral types |
| **Team Management** | Add, edit, activate/deactivate team members |
| **Analytics** | Charts for spend by location, status breakdown, monthly trends |
| **Export** | Download Projects and Dispatch reports as branded PDFs |
| **GST** | 18% GST automatically applied to all project costs |

---

## Tech Stack

- **Framework** — Next.js 16 (App Router, Server Components)
- **Language** — TypeScript 5
- **Database** — Neon PostgreSQL (serverless)
- **ORM** — Prisma 6
- **Auth** — NextAuth.js v4 (JWT + Credentials)
- **Styling** — Tailwind CSS v4 + Radix UI
- **File Storage** — Cloudinary
- **Charts** — Recharts
- **PDF Export** — jsPDF + jspdf-autotable
- **Excel Parsing** — xlsx
- **Deployment** — Vercel

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) PostgreSQL database
- A [Cloudinary](https://cloudinary.com) account (for file uploads)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/axis-print-management.git
cd axis-print-management
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`. See the [Environment Variables](#environment-variables) section below.

### 4. Set up the database

```bash
# Push schema to your Neon database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Seed with initial data (admin user, POCs, rate cards, sample projects)
npm run db:seed
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon PostgreSQL pooled connection string |
| `NEXTAUTH_URL` | ✅ | Your app URL (e.g. `https://yourapp.vercel.app`) |
| `NEXTAUTH_SECRET` | ✅ | Random 32-byte hex string |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary API secret |
| `NEXT_PUBLIC_PUSHER_APP_KEY` | ⬜ | Pusher app key (real-time, optional) |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | ⬜ | Pusher cluster (default: `ap2`) |
| `PUSHER_APP_ID` | ⬜ | Pusher app ID |
| `PUSHER_SECRET` | ⬜ | Pusher secret |
| `ADMIN_EMAIL` | ⬜ | Admin email for seeding |
| `ADMIN_PASSWORD` | ⬜ | Admin password for seeding |

Generate `NEXTAUTH_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Default Login

After seeding, log in with the admin credentials you set in `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your `.env.local`.

> **Never share or commit login credentials. Change the default password immediately after first login.**

---

## Project Structure

```
axis-print-management/
├── prisma/
│   ├── schema.prisma          # Database schema (11 models)
│   └── seed.ts                # Initial data seeder
├── public/
│   └── dispatch-template.xlsx # Excel template for courier upload
├── src/
│   ├── app/
│   │   ├── (dashboard)/       # Protected routes (auth required)
│   │   │   ├── dashboard/     # Overview & stats
│   │   │   ├── projects/      # Project list, detail, new, edit
│   │   │   ├── approvals/     # Approval workflow
│   │   │   ├── dispatch/      # Dispatch & tracking
│   │   │   ├── rate-card/     # Pricing management
│   │   │   ├── team/          # User management
│   │   │   └── analytics/     # Charts & reports
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # NextAuth handler
│   │   │   ├── projects/      # CRUD + status updates
│   │   │   ├── approvals/     # Approve/reject actions
│   │   │   ├── dispatch/      # Dispatch CRUD + Excel upload
│   │   │   ├── team/          # Team CRUD
│   │   │   ├── rate-card/     # Rate card CRUD
│   │   │   ├── upload/        # Cloudinary file upload
│   │   │   ├── export/        # PDF/data export
│   │   │   └── counts/        # Sidebar badge counts
│   │   ├── login/             # Login page
│   │   └── layout.tsx         # Root layout
│   ├── components/
│   │   ├── ui/                # Radix UI base components
│   │   ├── layout/            # Sidebar, TopBar, DashboardLayout
│   │   ├── dashboard/         # StatsCard, RecentProjectsTable
│   │   ├── projects/          # Forms, filters, actions, upload
│   │   ├── approvals/         # ApprovalActions
│   │   ├── dispatch/          # DispatchHeaderActions, TrackButton
│   │   ├── team/              # TeamActions
│   │   ├── rate-card/         # RateCardClient
│   │   └── analytics/         # Chart components
│   ├── lib/
│   │   ├── auth.ts            # NextAuth config
│   │   ├── prisma.ts          # Prisma client singleton
│   │   └── env.ts             # Env variable validation
│   ├── types/
│   │   ├── index.ts           # Shared TypeScript types
│   │   └── next-auth.d.ts     # NextAuth type extensions
│   └── utils/
│       ├── cn.ts              # Tailwind class merger
│       └── formatters.ts      # Currency, date, GST helpers
└── package.json
```

---

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:migrate   # Run Prisma migrations
npm run db:generate  # Generate Prisma client
npm run db:seed      # Seed database with initial data
npm run db:studio    # Open Prisma Studio (DB GUI)
```

---

## Deploying to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/axis-print-management.git
git push -u origin main
```

### 2. Import on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Set **Root Directory** to `axis-print-management` (if in a monorepo)
4. Framework preset: **Next.js** (auto-detected)

### 3. Add Environment Variables

In Vercel dashboard → Settings → Environment Variables, add all variables from `.env.example`:

> **Important:** Set `NEXTAUTH_URL` to your Vercel deployment URL, e.g. `https://axis-print.vercel.app`

### 4. Deploy

Vercel will automatically:
- Run `npm install`
- Run `npx prisma generate` (via postinstall)
- Run `npm run build`
- Deploy to edge network

### 5. Run database seed (first deploy only)

After first deployment, run the seed from your local machine pointing to the production DB:

```bash
DATABASE_URL="your-neon-production-url" npm run db:seed
```

---

## Excel Upload Format (Dispatch)

Download the template from the Dispatch page or use this column structure:

| Column | Required | Example |
|---|---|---|
| Project ID | ✅ | `PRJ-2026-100` |
| Courier | ✅ | `Blue Dart` |
| Tracking ID | ✅ | `BD123456789` |
| Tracking URL | ⬜ | `https://bluedart.com/tracking` |
| Dispatch Date | ⬜ | `2026-04-17` |
| Expected Delivery | ⬜ | `2026-04-20` |
| Notes | ⬜ | `Handle with care` |

Column names are case-insensitive. Supports `.xlsx`, `.xls`, and `.csv`.

---

## License

MIT — free to use and modify.
