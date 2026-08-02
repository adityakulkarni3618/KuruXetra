import { Router } from "express";
import { prisma } from "../lib/prisma";
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
  addExerciseToSession,
  deleteMeeting,
  deleteAnnouncement,
  deleteSession,
  endSession,
  endMeeting,
  reviewSessionLogs,
} from "../controllers/admin-features.controller";

const router = Router();

router.get("/badges", requireAuth, async (req, res) => {
  try {
    const badges = await prisma.badge.findMany({ orderBy: { name: "asc" } });
    res.json(badges);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to list badges" });
  }
});

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
router.post("/sessions/:id/add-exercise", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN"), addExerciseToSession);
router.delete("/sessions/:id", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN"), deleteSession);
router.post("/sessions/:id/end", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN"), endSession);
router.post("/meetings/:id/end", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN"), endMeeting);
router.post("/sessions/:sessionId/review-logs", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN"), reviewSessionLogs);

export default router;
