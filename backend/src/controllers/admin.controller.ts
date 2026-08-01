import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";
import bcrypt from "bcryptjs";

export async function searchUsers(req: AuthedRequest, res: Response) {
  const { uniqueId, name, rollNumber, department, academicYear, passoutYear, role } = req.query as {
    uniqueId?: string;
    name?: string;
    rollNumber?: string;
    department?: string;
    academicYear?: string;
    passoutYear?: string;
    role?: string;
  };

  try {
    const where: any = { AND: [] };

    if (uniqueId) where.AND.push({ uniqueId: { contains: uniqueId, mode: "insensitive" } });
    if (name) where.AND.push({ fullName: { contains: name, mode: "insensitive" } });
    if (rollNumber) where.AND.push({ rollNumber: { contains: rollNumber, mode: "insensitive" } });
    if (department) where.AND.push({ department });
    if (academicYear) where.AND.push({ academicYear });
    if (passoutYear) where.AND.push({ passoutYear: Number(passoutYear) });
    if (role) where.AND.push({ role });

    if (where.AND.length === 0) delete where.AND;

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        uniqueId: true,
        fullName: true,
        email: true,
        mobileNumber: true,
        gender: true,
        dateOfBirth: true,
        bloodGroup: true,
        collegeIdUrl: true,
        studentIdCardUrl: true,
        rollNumber: true,
        department: true,
        academicYear: true,
        passoutYear: true,
        role: true,
        status: true,
        profilePhotoUrl: true,
        fitnessGoal: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json(users);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to search users" });
  }
}

export async function promoteToSportsSecretary(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  const actorId = req.user!.id;

  try {
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) return res.status(404).json({ error: "Target user not found" });

    if (targetUser.role === "SUPER_ADMIN") {
      return res.status(400).json({ error: "User is already a Sports Secretary" });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: targetUser.id },
        data: { priorRole: targetUser.role, role: "SUPER_ADMIN" },
      }),
      prisma.roleChangeLog.create({
        data: {
          userId: targetUser.id,
          oldRole: targetUser.role,
          newRole: "SUPER_ADMIN",
          changedById: actorId,
        },
      }),
    ]);

    return res.json({ message: "Promoted to Sports Secretary successfully" });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to promote user" });
  }
}

export async function demoteFromSportsSecretary(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  const actorId = req.user!.id;

  try {
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) return res.status(404).json({ error: "Target user not found" });

    if (targetUser.role !== "SUPER_ADMIN") {
      return res.status(400).json({ error: "User is not a Sports Secretary" });
    }

    // Verify there is at least one other active SUPER_ADMIN to avoid locking out the system
    const activeAdminCount = await prisma.user.count({
      where: { role: "SUPER_ADMIN", status: "ACTIVE", id: { not: targetUser.id } },
    });
    if (activeAdminCount === 0) {
      return res.status(400).json({ error: "Cannot demote the last remaining Sports Secretary" });
    }

    const nextRole = targetUser.priorRole || "STUDENT_ATHLETE";

    await prisma.$transaction([
      prisma.user.update({
        where: { id: targetUser.id },
        data: { role: nextRole, priorRole: null },
      }),
      prisma.roleChangeLog.create({
        data: {
          userId: targetUser.id,
          oldRole: "SUPER_ADMIN",
          newRole: nextRole,
          changedById: actorId,
        },
      }),
    ]);

    return res.json({ message: "Demoted from Sports Secretary successfully" });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to demote user" });
  }
}

export async function deleteUserPermanently(req: AuthedRequest, res: Response) {
  const { id } = req.params;

  try {
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    // Make sure they don't delete the last admin
    if (targetUser.role === "SUPER_ADMIN") {
      const activeAdminCount = await prisma.user.count({
        where: { role: "SUPER_ADMIN", status: "ACTIVE", id: { not: targetUser.id } },
      });
      if (activeAdminCount === 0) {
        return res.status(400).json({ error: "Cannot delete the last remaining Sports Secretary" });
      }
    }

    await prisma.$transaction([
      // 1. Delete relations
      prisma.membership.deleteMany({ where: { userId: id } }),
      prisma.attendance.deleteMany({ where: { userId: id } }),
      prisma.workout.deleteMany({ where: { userId: id } }),
      prisma.runningLog.deleteMany({ where: { userId: id } }),
      prisma.pointsLedger.deleteMany({ where: { userId: id } }),
      prisma.meetingScore.deleteMany({ where: { userId: id } }),
      prisma.meetingScore.deleteMany({ where: { meeting: { scheduledBy: id } } }),
      prisma.userBadge.deleteMany({ where: { OR: [{ userId: id }, { awardedById: id }] } }),

      // 2. Dissociate captaincy, delete meetings/announcements authored
      prisma.sport.updateMany({ where: { captainId: id }, data: { captainId: null } }),
      prisma.teamMeeting.deleteMany({ where: { scheduledBy: id } }),
      prisma.announcement.deleteMany({ where: { authorId: id } }),
      prisma.roleChangeLog.deleteMany({ where: { OR: [{ userId: id }, { changedById: id }] } }),

      // 3. Delete user
      prisma.user.delete({ where: { id } }),
    ]);

    return res.json({ message: "Player profile removed permanently from system" });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to permanently remove user" });
  }
}

export async function awardChampionBadge(req: AuthedRequest, res: Response) {
  const { id } = req.params; // userId
  const actorId = req.user!.id;

  try {
    const badge = await prisma.badge.findUnique({ where: { name: "Champion" } });
    if (!badge) return res.status(404).json({ error: "Champion badge not found in database. Run seed first." });

    const userBadge = await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId: id, badgeId: badge.id } },
      update: { awardedById: actorId },
      create: { userId: id, badgeId: badge.id, awardedById: actorId },
    });

    return res.json({ message: "Champion badge awarded successfully", userBadge });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to award Champion badge" });
  }
}

export async function toggleUserStatus(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  const { status } = req.body as { status: "ACTIVE" | "SUSPENDED" };

  if (!["ACTIVE", "SUSPENDED"].includes(status)) {
    return res.status(400).json({ error: "Invalid status. Must be ACTIVE or SUSPENDED." });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { status },
    });
    return res.json({ message: `User status changed to ${status}`, user: { id: user.id, status: user.status } });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to change user status" });
  }
}

export async function resetUserPassword(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  const tempPassword = "TMP-" + Math.floor(100000 + Math.random() * 900000);

  try {
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
    return res.json({ message: "Password reset successfully", tempPassword });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to reset password" });
  }
}

export async function deactivateSport(req: AuthedRequest, res: Response) {
  const { id } = req.params; // sportId

  try {
    const sport = await prisma.sport.update({
      where: { id },
      data: { isActive: false },
    });
    return res.json({ message: "Sport deactivated successfully", sport });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to deactivate sport" });
  }
}

