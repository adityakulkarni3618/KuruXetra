import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import {
  listSports, createSport, updateSport, deleteSport,
  assignCaptain, joinSport, reviewMembership, sportMembers,
  demoteCaptain, removeTeamMember,
} from "../controllers/sports.controller";

const router = Router();
router.get("/", listSports);
router.post("/", requireAuth, requireRole("SUPER_ADMIN"), createSport);
router.patch("/:id", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN"), updateSport);
router.delete("/:id", requireAuth, requireRole("SUPER_ADMIN"), deleteSport);
router.post("/:id/captain", requireAuth, requireRole("SUPER_ADMIN"), assignCaptain);
router.post("/:id/join", requireAuth, joinSport);
router.get("/:id/members", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN"), sportMembers);
router.post("/memberships/:membershipId/review", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN"), reviewMembership);
router.post("/:id/demote-captain", requireAuth, requireRole("SUPER_ADMIN"), demoteCaptain);
router.post("/memberships/:membershipId/remove-member", requireAuth, requireRole("SUPER_ADMIN", "CAPTAIN"), removeTeamMember);

export default router;

