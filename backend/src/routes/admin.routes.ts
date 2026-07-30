import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { requireRole } from "../middleware/role";

const router = Router();

// Apply auth and role protection to all routes in this file
router.use(requireAuth, requireRole("SUPER_ADMIN"));

// GET /api/admin/pending-users - List all PENDING_APPROVAL accounts
router.get("/pending-users", async (req: AuthedRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { status: "PENDING_APPROVAL" },
      select: {
        id: true,
        uniqueId: true,
        fullName: true,
        collegeId: true,
        rollNumber: true,
        department: true,
        academicYear: true,
        division: true,
        mobileNumber: true,
        email: true,
        gender: true,
        dateOfBirth: true,
        bloodGroup: true,
        emergencyContact: true,
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

// PATCH /api/admin/users/:id/approve - Approve a user
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

// PATCH /api/admin/users/:id/reject - Reject a user (deletes them so they can retry registration)
router.patch("/users/:id/reject", async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  try {
    // Delete memberships first to avoid constraint issues, though on cascade should trigger
    await prisma.membership.deleteMany({ where: { userId: id } });
    const user = await prisma.user.delete({
      where: { id },
    });
    return res.json({ message: "User registration rejected and profile removed", uniqueId: user.uniqueId });
  } catch (error: any) {
    return res.status(404).json({ error: "User not found or deletion failed" });
  }
});

export default router;
