import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { checkIn, checkOut, markAttendance, myAttendance, sportAttendance } from "../controllers/attendance.controller";

const router = Router();
router.post("/checkin", requireAuth, checkIn);
router.post("/checkout", requireAuth, checkOut);
router.post("/mark", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN"), markAttendance);
router.get("/me", requireAuth, myAttendance);
router.get("/sport/:sportId", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN"), sportAttendance);

export default router;
