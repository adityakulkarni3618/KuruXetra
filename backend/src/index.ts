import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma";

import authRoutes from "./routes/auth.routes";
import sportsRoutes from "./routes/sports.routes";
import attendanceRoutes from "./routes/attendance.routes";
import workoutRoutes from "./routes/workout.routes";
import runningRoutes from "./routes/running.routes";
import leaderboardRoutes from "./routes/leaderboard.routes";
import usersRoutes from "./routes/users.routes";
import adminRoutes from "./routes/admin.routes";
import adminFeaturesRoutes from "./routes/admin-features.routes";
import socialRoutes from "./routes/social.routes";
import combatRoutes from "./routes/combat.routes";

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "ksms-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/sports", sportsRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/running", runningRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin-features", adminFeaturesRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/combat", combatRoutes);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

async function ensureBadgesSeeded() {
  try {
    const badges = [
      { name: "100 Hours of Practice", isManual: false, description: "SUM(Workout.duration + RunningLog.duration) >= 100 hours all-time" },
      { name: "Perfect Attendance", isManual: false, description: "Attendance % = 100 for a given Season (no missed sessions)" },
      { name: "Most Consistent Player", isManual: false, description: "Highest attendance streak in a rolling 30-day window" },
      { name: "Early Bird", isManual: false, description: "X check-ins logged before 7 AM" },
      { name: "Iron Player", isManual: false, description: "N consecutive days with at least one logged activity" },
      { name: "MVP", isManual: true, description: "Awarded by Captain per sport, per season/tournament" },
      { name: "Champion", isManual: true, description: "Awarded by Sports Secretary (tournament-level)" },
      { name: "Team Leader", isManual: true, description: "Awarded by Captain for recognition of a specific player" }
    ];
    for (const b of badges) {
      await prisma.badge.upsert({
        where: { name: b.name },
        update: { description: b.description, isManual: b.isManual },
        create: b,
      });
    }
    console.log("SUCCESS: Default badges ensured in database.");
  } catch (err) {
    console.error("Error ensuring badges seeded:", err);
  }
}

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, async () => {
  console.log(`KSMS backend running on http://localhost:${PORT}`);
  await ensureBadgesSeeded();
});
