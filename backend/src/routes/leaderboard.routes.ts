import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { leaderboard } from "../controllers/leaderboard.controller";

const router = Router();
router.get("/", requireAuth, leaderboard);

export default router;
