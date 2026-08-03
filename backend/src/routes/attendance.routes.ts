import { Router } from "express";
import { requireAuth, requireActive } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { checkIn, checkOut, markAttendance, batchMarkAttendance, myAttendance, sportAttendance, clearAttendance, restoreAttendance, clearSportAttendance, restoreSportAttendance } from "../controllers/attendance.controller";

const router = Router();
router.post("/checkin", requireAuth, requireActive, checkIn);
router.post("/checkout", requireAuth, requireActive, checkOut);
router.post("/mark", requireAuth, requireActive, requireRole("SUPER_ADMIN", "CAPTAIN"), markAttendance);
router.post("/batch-mark", requireAuth, requireActive, requireRole("SUPER_ADMIN", "CAPTAIN"), batchMarkAttendance);
router.post("/clear", requireAuth, clearAttendance);
router.post("/restore", requireAuth, restoreAttendance);
router.post("/sport/:sportId/clear", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN", "SPORTS_SECRETARY"), clearSportAttendance);
router.post("/sport/:sportId/restore", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN", "SPORTS_SECRETARY"), restoreSportAttendance);
router.get("/me", requireAuth, myAttendance);
router.get("/sport/:sportId", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN"), sportAttendance);

export default router;
