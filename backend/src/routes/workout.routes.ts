import { Router } from "express";
import { requireAuth, requireActive } from "../middleware/auth";
import { logWorkout, myWorkouts, getUserWorkouts, clearWorkouts, restoreWorkouts } from "../controllers/workout.controller";

const router = Router();
router.post("/", requireAuth, requireActive, logWorkout);
router.get("/me", requireAuth, myWorkouts);
router.post("/clear", requireAuth, clearWorkouts);
router.post("/restore", requireAuth, restoreWorkouts);
router.get("/user/:userId", requireAuth, getUserWorkouts);

export default router;
