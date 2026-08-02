import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import {
  createCombatEvent,
  listCombatEvents,
  addCombatSport,
  assignSportHead,
  addCombatSubHead,
  scheduleCombatMatch,
  updateMatchScore,
  getLiveScoreboard,
  getMyCombatSports
} from "../controllers/combat.controller";

const router = Router();

// Public / Authenticated user feeds
router.get("/active-matches", requireAuth, getLiveScoreboard);
router.get("/my-managed-sports", requireAuth, getMyCombatSports);

// Sports Secretary admins configs
router.post("/events", requireAuth, requireRole("SUPER_ADMIN"), createCombatEvent);
router.get("/events", requireAuth, listCombatEvents);
router.post("/sports", requireAuth, requireRole("SUPER_ADMIN"), addCombatSport);
router.patch("/sports/:sportId/head", requireAuth, requireRole("SUPER_ADMIN"), assignSportHead);

// Sport Heads delegation and scheduling
router.post("/sports/:combatSportId/subheads", requireAuth, addCombatSubHead);
router.post("/sports/:combatSportId/matches", requireAuth, scheduleCombatMatch);

// Scorekeepers logs updates
router.patch("/matches/:id/score", requireAuth, updateMatchScore);

export default router;
