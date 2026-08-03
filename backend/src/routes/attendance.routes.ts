import { Router } from "express";
import { requireAuth, requireActive } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { checkIn, checkOut, markAttendance, batchMarkAttendance, myAttendance, sportAttendance, clearAttendance, restoreAttendance } from "../controllers/attendance.controller";

const router = Router();
router.post("/checkin", requireAuth, requireActive, checkIn);
router.post("/checkout", requireAuth, requireActive, checkOut);
router.post("/mark", requireAuth, requireActive, requireRole("SUPER_ADMIN", "CAPTAIN"), markAttendance);
router.post("/batch-mark", requireAuth, requireActive, requireRole("SUPER_ADMIN", "CAPTAIN"), batchMarkAttendance);
router.post("/clear", requireAuth, clearAttendance);
router.post("/restore", requireAuth, restoreAttendance);
router.get("/me", requireAuth, myAttendance);
router.get("/sport/:sportId", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN"), sportAttendance);

export default router;
