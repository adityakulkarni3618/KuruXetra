import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";

export async function pendingUsers(req: AuthedRequest, res: Response) {
  const users = await prisma.user.findMany({
    where: { status: "PENDING_APPROVAL" },
    select: {
      id: true, uniqueId: true, fullName: true, department: true,
      academicYear: true, email: true, mobileNumber: true, createdAt: true,
    },
  });
  res.json(users);
}

export async function approveUser(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  const user = await prisma.user.update({ where: { id }, data: { status: "ACTIVE" } });
  res.json({ message: "User approved", uniqueId: user.uniqueId });
}

export async function suspendUser(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  const user = await prisma.user.update({ where: { id }, data: { status: "SUSPENDED" } });
  res.json({ message: "User suspended", uniqueId: user.uniqueId });
}

export async function listUsers(req: AuthedRequest, res: Response) {
  const users = await prisma.user.findMany({
    select: {
      id: true, uniqueId: true, fullName: true, department: true, role: true,
      status: true, academicYear: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(users);
}

export async function getUserBadges(req: AuthedRequest, res: Response) {
  const { id } = req.params;

  try {
    const userBadges = await prisma.userBadge.findMany({
      where: { userId: id },
      include: {
        badge: true,
      },
      orderBy: { earnedAt: "desc" },
    });
    res.json(userBadges);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: "Failed to load user badges" });
  }
}
