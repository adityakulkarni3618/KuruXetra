import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import sportsRoutes from "./routes/sports.routes";
import attendanceRoutes from "./routes/attendance.routes";
import workoutRoutes from "./routes/workout.routes";
import runningRoutes from "./routes/running.routes";
import leaderboardRoutes from "./routes/leaderboard.routes";
import usersRoutes from "./routes/users.routes";
import adminRoutes from "./routes/admin.routes";
import adminFeaturesRoutes from "./routes/admin-features.routes";

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => console.log(`KSMS backend running on http://localhost:${PORT}`));
