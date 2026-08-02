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
  getMyCombatSports,
  getSportRoster,
  addPlayerToRoster,
  removePlayerFromRoster
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

// Roster management (Admin only)
router.get("/sports/:sportId/players", requireAuth, requireRole("SUPER_ADMIN"), getSportRoster);
router.post("/sports/:sportId/players", requireAuth, requireRole("SUPER_ADMIN"), addPlayerToRoster);
router.delete("/sports/:sportId/players/:playerId", requireAuth, requireRole("SUPER_ADMIN"), removePlayerFromRoster);

// Scorekeepers logs updates
router.patch("/matches/:id/score", requireAuth, updateMatchScore);

export default router;
