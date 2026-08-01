import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { pendingUsers, approveUser, suspendUser, listUsers, getUserBadges } from "../controllers/users.controller";
import { updateProfile, updateProfilePicture, updateCollegeId } from "../controllers/user-profile.controller";

const router = Router();
router.get("/", requireAuth, requireRole("SUPER_ADMIN"), listUsers);
router.get("/pending", requireAuth, requireRole("SUPER_ADMIN"), pendingUsers);
router.post("/:id/approve", requireAuth, requireRole("SUPER_ADMIN"), approveUser);
router.post("/:id/suspend", requireAuth, requireRole("SUPER_ADMIN"), suspendUser);
router.get("/:id/badges", requireAuth, getUserBadges);

router.patch("/me", requireAuth, updateProfile);
router.patch("/me/profile-picture", requireAuth, updateProfilePicture);
router.patch("/me/college-id", requireAuth, updateCollegeId);

export default router;
