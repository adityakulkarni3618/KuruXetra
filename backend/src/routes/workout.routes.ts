import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { logWorkout, myWorkouts } from "../controllers/workout.controller";

const router = Router();
router.post("/", requireAuth, logWorkout);
router.get("/me", requireAuth, myWorkouts);

export default router;
