import { Router } from "express";
import { requireAuth, requireActive } from "../middleware/auth";
import { logWorkout, myWorkouts, getUserWorkouts, clearWorkouts, restoreWorkouts, clearSessionLogs, restoreSessionLogs } from "../controllers/workout.controller";

const router = Router();
router.post("/", requireAuth, requireActive, logWorkout);
router.get("/me", requireAuth, myWorkouts);
router.post("/clear", requireAuth, clearWorkouts);
router.post("/restore", requireAuth, restoreWorkouts);
router.post("/sessions/clear", requireAuth, clearSessionLogs);
router.post("/sessions/restore", requireAuth, restoreSessionLogs);
router.get("/user/:userId", requireAuth, getUserWorkouts);

export default router;
