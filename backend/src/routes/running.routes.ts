import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { logRun, myRuns } from "../controllers/running.controller";

const router = Router();
router.post("/", requireAuth, logRun);
router.get("/me", requireAuth, myRuns);

export default router;
