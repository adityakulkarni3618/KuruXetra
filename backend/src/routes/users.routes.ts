import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { pendingUsers, approveUser, suspendUser, listUsers } from "../controllers/users.controller";

const router = Router();
router.get("/", requireAuth, requireRole("SUPER_ADMIN"), listUsers);
router.get("/pending", requireAuth, requireRole("SUPER_ADMIN"), pendingUsers);
router.post("/:id/approve", requireAuth, requireRole("SUPER_ADMIN"), approveUser);
router.post("/:id/suspend", requireAuth, requireRole("SUPER_ADMIN"), suspendUser);

export default router;
