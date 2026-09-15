# BhumiSetu

GIS-based, parcel-centric digital platform for land governance in India.

Citizens can view land parcel information and apply for post-purchase approvals. Department officers can review and approve requests with map context.

## Tech stack

- **Frontend:** Next.js + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** PostgreSQL + PostGIS
- **ORM:** Prisma
- **Auth:** JWT + bcrypt + role-based access (not set up yet)

## Project structure

```
BhumiSetu/
├── frontend/    Next.js application
├── backend/     Express API
└── README.md
```

## Prerequisites

- Node.js 18 or later
- npm

## Getting started

### Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Edit `backend/.env` and replace `USER` and `PASSWORD` in `DATABASE_URL` with your PostgreSQL credentials.

Generate the Prisma Client and create tables:

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

The API runs at [http://localhost:5000](http://localhost:5000).

Health check: [http://localhost:5000/api/health](http://localhost:5000/api/health)

Database check: [http://localhost:5000/api/test-db](http://localhost:5000/api/test-db)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

On Linux or macOS, create the env file with `cp .env.example .env` instead of `copy`.

## Current status

Step 2 — Prisma schema and database connection are set up. Authentication, maps, and domain features are not included yet.
