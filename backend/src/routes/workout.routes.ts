import { Router } from "express";
import { requireAuth, requireActive } from "../middleware/auth";
import { logWorkout, myWorkouts } from "../controllers/workout.controller";

const router = Router();
router.post("/", requireAuth, requireActive, logWorkout);
router.get("/me", requireAuth, myWorkouts);

export default router;
