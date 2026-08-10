import { Router } from "express";
import { requireAuth, requireActive } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import {
  listSports, createSport, updateSport, deleteSport,
  assignCaptain, joinSport, reviewMembership, sportMembers,
  demoteCaptain, removeTeamMember, awardSportBadge,
  assignViceCaptain, demoteViceCaptain, leaveSport, globalSearch
} from "../controllers/sports.controller";

const router = Router();
router.get("/", listSports);
router.get("/global-search", requireAuth, globalSearch);
router.post("/", requireAuth, requireRole("SUPER_ADMIN"), createSport);
router.patch("/:id", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN"), updateSport);
router.delete("/:id", requireAuth, requireRole("SUPER_ADMIN"), deleteSport);
router.post("/:id/captain", requireAuth, requireRole("SUPER_ADMIN"), assignCaptain);
router.post("/:id/vice-captain", requireAuth, requireRole("SUPER_ADMIN"), assignViceCaptain);
router.post("/:id/join", requireAuth, requireActive, joinSport);
router.post("/:id/leave", requireAuth, requireActive, leaveSport);
router.get("/:id/members", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN"), sportMembers);
router.post("/memberships/:membershipId/review", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN"), reviewMembership);
router.post("/:id/demote-captain", requireAuth, requireRole("SUPER_ADMIN"), demoteCaptain);
router.post("/:id/demote-vice-captain", requireAuth, requireRole("SUPER_ADMIN"), demoteViceCaptain);
router.post("/memberships/:membershipId/remove-member", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN"), removeTeamMember);
router.post("/:sportId/award-badge", requireAuth, requireActive, requireRole("SUPER_ADMIN", "CAPTAIN"), awardSportBadge);

export default router;

