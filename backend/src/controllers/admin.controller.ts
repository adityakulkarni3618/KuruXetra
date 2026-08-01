import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";

export async function searchUsers(req: AuthedRequest, res: Response) {
  const { uniqueId, name, rollNumber, department, academicYear, passoutYear } = req.query as {
    uniqueId?: string;
    name?: string;
    rollNumber?: string;
    department?: string;
    academicYear?: string;
    passoutYear?: string;
  };

  try {
    const where: any = { AND: [] };

    if (uniqueId) where.AND.push({ uniqueId: { contains: uniqueId, mode: "insensitive" } });
    if (name) where.AND.push({ fullName: { contains: name, mode: "insensitive" } });
    if (rollNumber) where.AND.push({ rollNumber: { contains: rollNumber, mode: "insensitive" } });
    if (department) where.AND.push({ department });
    if (academicYear) where.AND.push({ academicYear });
    if (passoutYear) where.AND.push({ passoutYear: Number(passoutYear) });

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
