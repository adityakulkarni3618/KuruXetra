import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { searchUsers, promoteToSportsSecretary, demoteFromSportsSecretary, deleteUserPermanently } from "../controllers/admin.controller";
import { prisma } from "../lib/prisma";
import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";

const router = Router();

router.use(requireAuth, requireRole("SUPER_ADMIN"));

router.get("/pending-users", async (req: AuthedRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { status: "PENDING_APPROVAL" },
      select: {
        id: true,
        uniqueId: true,
        fullName: true,
        rollNumber: true,
        department: true,
        academicYear: true,
        mobileNumber: true,
        email: true,
        gender: true,
        dateOfBirth: true,
        bloodGroup: true,
        fitnessGoal: true,
        profilePhotoUrl: true,
        studentIdCardUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(users);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to load pending users" });
  }
});

router.patch("/users/:id/approve", async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { status: "ACTIVE" },
    });
    return res.json({ message: "User approved successfully", uniqueId: user.uniqueId });
  } catch (error: any) {
    return res.status(404).json({ error: "User not found or update failed" });
  }
});

router.patch("/users/:id/reject", async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.membership.deleteMany({ where: { userId: id } });
    const user = await prisma.user.delete({ where: { id } });
    return res.json({ message: "User registration rejected and profile removed", uniqueId: user.uniqueId });
  } catch (error: any) {
    return res.status(404).json({ error: "User not found or deletion failed" });
  }
});

router.get("/users/search", searchUsers);
router.post("/users/:id/promote-to-ss", promoteToSportsSecretary);
router.post("/users/:id/demote-from-ss", demoteFromSportsSecretary);
router.delete("/users/:id/remove-profile", deleteUserPermanently);

export default router;

