# Kuruxetra Sports Management System (KSMS) — v1

A sports management and attendance system with training logs, leaderboards, role-based access, and season-aware tracking.

## Stack
- **Backend**: Node.js, Express, TypeScript, PostgreSQL, Prisma, JWT auth
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Recharts

## Project structure
- `/backend`
  - `src/index.ts`: Express server entrypoint, API routing, health check, CORS, JSON parsing.
  - `src/routes/`: Auth, sports, attendance, workouts, running, leaderboard, users, admin.
  - `prisma/schema.prisma`: Database models and relations.
  - `prisma/seed.ts`: Seed data for Super Admin and demo sports.
  - `package.json`: Scripts for development, build, start, Prisma migrate/generate/seed.
- `/frontend`
  - `app/`: Next.js App Router with login, register, dashboard, and nested dashboard views.
  - `components/`: Shared UI components.
  - `lib/`: Client helpers and auth context.
  - `package.json`: Scripts for dev, build, start, lint.

## Core features
- Registration, approval workflow, and login
- Role-based access: `SUPER_ADMIN`, `CAPTAIN`, `STUDENT_ATHLETE`, `FITNESS_MEMBER`
- Sport management with join requests and captain assignment
- Attendance tracking, self-check-in/out, and captain-marked attendance
- Workout logging and running log entries with pace/speed metrics
- Leaderboard and points ledger tracking user activity
- Season-aware data model ready for future season selection and reporting

## Backend API routes
- `POST /api/auth/*`
- `GET/POST /api/sports/*`
- `GET/POST /api/attendance/*`
- `GET/POST /api/workouts/*`
- `GET/POST /api/running/*`
- `GET /api/leaderboard/*`
- `GET/POST /api/users/*`
- `GET/POST /api/admin/*`

## Frontend routes
- `/`: Landing page
- `/login`: Login page
- `/register`: Registration page
- `/dashboard`: Dashboard home
- `/dashboard/admin`: Admin dashboard
- `/dashboard/attendance`: Attendance view
- `/dashboard/captain`: Captain area
- `/dashboard/leaderboard`: Leaderboard
- `/dashboard/running`: Running log view
- `/dashboard/sports`: Sports management view
- `/dashboard/workouts`: Workout log view

## Prisma schema summary
- `Role`: `SUPER_ADMIN`, `CAPTAIN`, `STUDENT_ATHLETE`, `FITNESS_MEMBER`
- `UserStatus`: `PENDING_APPROVAL`, `ACTIVE`, `SUSPENDED`
- `MembershipStatus`: `PENDING`, `APPROVED`, `REJECTED`, `REMOVED`
- `Season`: Used for time-bound competition periods and optional season-linked activity data
- `User`: Stores identity, academic details, contact, role/status, and related activity
- `Sport`: Sport metadata, captain relation, capacity, and status
- `Membership`: Links users to sports with approval status
- `Attendance`: Check-in/out logs, sport, season, and marked-by data
- `Workout`: Exercise entries with sets, reps, weight, duration, and calories
- `RunningLog`: Distance, duration, pace, speed, calories, notes
- `PointsLedger`: Append-only points history for leaderboard calculations

## Running locally

### Backend
```bash
cd backend
npm install
cp .env.example .env
# update .env with DATABASE_URL, DIRECT_URL, JWT_SECRET, CORS_ORIGIN, and Cloudinary values
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

The backend starts on `http://localhost:4000` by default.

### Frontend
```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
npm run dev
```

The frontend starts on `http://localhost:3000`.

### Local Postgres
```bash
docker run --name ksms-db -e POSTGRES_USER=ksms_user -e POSTGRES_PASSWORD=ksms_pass -e POSTGRES_DB=ksms -p 5432:5432 -d postgres:16
```

## Seeded demo data
- Super Admin: `ss_admin` / `Admin@123`
- Demo sports: Kho-Kho, Kabaddi, Cricket, Football, Volleyball, Badminton, Table Tennis

## Notes
- `backend` uses `tsx watch` for local TypeScript execution.
- CORS defaults to `http://localhost:3000` if `CORS_ORIGIN` is unset.
- `Season` exists in the schema, but the UI does not yet expose season switching.

## Next improvements
1. Add user search for captain assignment instead of internal IDs
2. Expose active season selection in the UI
3. Add profile/photo uploads and documents
4. Add badges, challenges, events/matches, announcements
5. Add Docker Compose for full local stack startup
