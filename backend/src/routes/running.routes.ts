import { Router } from "express";
import { requireAuth, requireActive } from "../middleware/auth";
import { logRun, myRuns, getUserRuns, clearRuns, restoreRuns } from "../controllers/running.controller";

const router = Router();
router.post("/", requireAuth, requireActive, logRun);
router.get("/me", requireAuth, myRuns);
router.post("/clear", requireAuth, clearRuns);
router.post("/restore", requireAuth, restoreRuns);
router.get("/user/:userId", requireAuth, getUserRuns);

export default router;
