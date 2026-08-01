import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import {
  listWorkoutTypes,
  createWorkoutType,
  updateWorkoutType,
  listAnnouncements,
  createAnnouncement,
  scheduleMeeting,
  scoreMeeting,
  listMeetings,
  createSession,
  listSessions,
  logSessionWorkout,
  deleteMeeting,
  deleteAnnouncement,
  deleteSession,
} from "../controllers/admin-features.controller";

const router = Router();

router.get("/workout-types", requireAuth, listWorkoutTypes);
router.post("/workout-types", requireAuth, requireRole("SUPER_ADMIN"), createWorkoutType);
router.patch("/workout-types/:id", requireAuth, requireRole("SUPER_ADMIN"), updateWorkoutType);

router.get("/announcements", requireAuth, listAnnouncements);
router.post("/announcements", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN"), createAnnouncement);
router.delete("/announcements/:id", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN"), deleteAnnouncement);

router.get("/meetings", requireAuth, listMeetings);
router.post("/meetings", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN"), scheduleMeeting);
router.post("/meetings/:meetingId/scores", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN"), scoreMeeting);
router.delete("/meetings/:id", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN"), deleteMeeting);

router.get("/sessions", requireAuth, listSessions);
router.post("/sessions", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN"), createSession);
router.post("/sessions/:sessionId/logs", requireAuth, logSessionWorkout);
router.delete("/sessions/:id", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN"), deleteSession);

export default router;
