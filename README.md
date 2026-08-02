# Kuruxetra Sports Management System (KSMS) — v1

A sports management and attendance system with training logs, leaderboards, role-based access, and season-aware tracking.

## Project Stack
- **Backend**: Node.js, Express, TypeScript, PostgreSQL (Neon DB Cloud), Prisma, JWT auth
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Recharts

## Project Structure
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

## Core Features
- Registration, approval workflow, and login (via Athletic ID)
- Role-based access: `SUPER_ADMIN`, `CAPTAIN`, `STUDENT_ATHLETE`, `FITNESS_MEMBER` (supports multiple Super Admins)
- Sport management with join requests and captain assignment
- Attendance tracking, self-check-in/out, and captain-marked attendance
- Workout logging and running log entries with pace/speed metrics
- Leaderboard and points ledger tracking user activity
- Season-aware data model ready for future season selection and reporting

## Security Practices & Architecture
1. **Secret & Key Isolation**: Sensitive parameters (`DATABASE_URL`, `JWT_SECRET`, and Cloudinary upload credentials) are completely externalized from the source code and loaded dynamically through environment variables (`.env`).
2. **Data Sanitization**: Direct ORM queries using Prisma prevent SQL injection attacks. Inputs are strictly validated on REST API entry points using schemas.
3. **Role-Based Access Control (RBAC)**: All administrative, captain review, and user management routes are protected by backend route guards validation logic.
4. **Password Security**: Passwords are securely hashed with bcrypt (10 rounds salting strength) before storage. Unencrypted credentials are never logged or exposed.
5. **Session Management**: Session tokens are encrypted using JSON Web Tokens (JWT) with configured expiration periods.

## Public Repository Safety Guidelines
> [!IMPORTANT]
> Maintaining the GitHub repository as public is **completely safe** provided that these rules are strictly enforced:
> - **Environment Variables (.env)**: Never commit the `.env` file or raw passwords (e.g. Neon connection strings) to GitHub. Keep `.env` in the `.gitignore` list.
> - **Build/Key Secrets**: Manage API passwords, Cloudinary credentials, and JWT hashes exclusively through Vercel and Render Environment Variables settings pages.
> - **Default Admin Credentials**: Change the seeded default admin password (`SSSS@123`) inside the production database immediately.

## Running Locally

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

## Seeded Demo Data
- Super Admin: `KX000001` / `SSSS@123`
- Demo sports: Kho-Kho, Kabaddi, Cricket, Football, Volleyball, Badminton, Table Tennis
