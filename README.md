# Kuruxetra Sports Management System (KSMS) — v1

Digital replacement for the ground attendance register, plus Strava-style
training tracking, leaderboards, and role-based sports management.

## Stack
- **Backend**: Node.js, Express, TypeScript, PostgreSQL, Prisma, JWT auth
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS

## What's implemented in v1
- Registration (collects all the fields from the spec) → pending approval → Sports Secretary approval → login
- Auto-generated unique IDs (KS000001, KS000002, ...)
- Roles: Super Admin (Sports Secretary), Captain, Student Athlete, Fitness Member
- Sports: create/edit/archive (Super Admin), assign captain, join requests + approval
- Attendance: self check-in/out, captain can mark manually, per-sport attendance view
- Workouts and Running logs (auto pace calculation), Strava-style manual entry
- Points ledger (auto-awarded on attendance/workout/run) and leaderboard (global + per-sport)
- Season model in the schema, ready for your "sports seasons" idea (2026-27 etc.) —
  not yet wired into the UI, but every record already has an optional `seasonId`.

## What's NOT built yet (intentionally, to ship the core first)
Badges/achievements, challenges, events & matches, notifications, GPS tracking,
file uploads (profile photo / ID card — the API accepts a URL string for now,
pair it with Cloudinary or S3 later), announcements, analytics/reports/exports,
gamification (XP/coins/season pass). The database schema and route structure
are built so these slot in without breaking existing data.

---

## 1. Backend setup

```bash
cd backend
cp .env.example .env
# edit .env: set DATABASE_URL to your Postgres instance, and a real JWT_SECRET

npm install
npx prisma migrate dev --name init   # creates tables
npx prisma db seed                    # creates Super Admin (ss_admin / Admin@123) + demo sports
npm run dev                           # http://localhost:4000
```

> Note: `prisma generate` needs to reach `binaries.prisma.sh` to download the
> query engine. That domain wasn't reachable in the sandbox this was built in,
> so the Prisma client itself hasn't been generated/verified end-to-end yet —
> run `npx prisma generate` as your first step locally (it works on a normal
> machine with internet access) before `migrate dev`.

You'll need a running PostgreSQL instance. Easiest local option:
```bash
docker run --name ksms-db -e POSTGRES_USER=ksms_user -e POSTGRES_PASSWORD=ksms_pass \
  -e POSTGRES_DB=ksms -p 5432:5432 -d postgres:16
```

## 2. Frontend setup

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
npm run dev   # http://localhost:3000
```

## 3. First login

The seed script creates:
- **Super Admin**: username `ss_admin`, password `Admin@123`
- 7 demo sports (Kho-Kho, Kabaddi, Cricket, Football, Volleyball, Badminton, Table Tennis)

Log in as `ss_admin`, go to **Admin**, approve any students who register,
and assign captains (currently by internal user ID — visible via
`GET /api/users` — a friendlier lookup-by-college-ID UI is a good next step).

## Suggested next steps, roughly in priority order
1. Add a `GET /api/users?search=` endpoint + dropdown so admins can assign
   captains by name instead of pasting an internal ID.
2. Wire the `Season` model into the UI (a season switcher + "current season" badge).
3. Cloudinary upload for profile photos and student ID cards.
4. Badges + challenges (schema pattern: same append-only ledger style as `PointsLedger`).
5. Events/matches module, then announcements.
6. Docker Compose for one-command deploy (Postgres + backend + frontend) once
   you're happy with the core flows.

## Deploying to kuruxetra.com
- Frontend: Vercel (native Next.js support) — point `NEXT_PUBLIC_API_URL` at your backend's URL.
- Backend: Railway, Render, or a small VPS + PM2/Docker, with a managed Postgres
  (Railway/Neon/Supabase all work well with Prisma).
- Point `kuruxetra.com` at the frontend, `api.kuruxetra.com` at the backend, set `CORS_ORIGIN` accordingly.
