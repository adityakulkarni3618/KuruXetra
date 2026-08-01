import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";
import { awardPoints, POINTS } from "../utils/points";

// Digital replacement for the physical register: a student checks in when
// they arrive on the ground.
export async function checkIn(req: AuthedRequest, res: Response) {
  const userId = req.user!.id;
  const { sportId, ground } = req.body as { sportId?: string; ground?: string };

  if (sportId) {
    const membership = await prisma.membership.findFirst({
      where: { userId, sportId, status: "APPROVED" },
    });
    if (!membership) {
      return res.status(403).json({ error: "You can only check in for sports you're an approved member of" });
    }
  }

  const openEntry = await prisma.attendance.findFirst({
    where: { userId, timeOut: null },
    orderBy: { timeIn: "desc" },
  });
  if (openEntry) return res.status(409).json({ error: "You already have an open check-in. Check out first." });

  const entry = await prisma.attendance.create({
    data: { userId, sportId, ground, timeIn: new Date() },
  });

  await awardPoints(userId, POINTS.ATTENDANCE, "ATTENDANCE", entry.id);
  res.status(201).json(entry);
}

export async function checkOut(req: AuthedRequest, res: Response) {
  const userId = req.user!.id;

  const openEntry = await prisma.attendance.findFirst({
    where: { userId, timeOut: null },
    orderBy: { timeIn: "desc" },
  });
  if (!openEntry) return res.status(404).json({ error: "No open check-in found" });

  const timeOut = new Date();
  const durationMin = Math.round((timeOut.getTime() - openEntry.timeIn.getTime()) / 60000);

  const updated = await prisma.attendance.update({
    where: { id: openEntry.id },
    data: { timeOut, durationMin },
  });
  res.json(updated);
}

// Captain manually marks attendance for a team member
export async function markAttendance(req: AuthedRequest, res: Response) {
  const { userId, sportId, ground } = req.body as { userId: string; sportId: string; ground?: string };

  if (req.user!.role === "CAPTAIN") {
    const sport = await prisma.sport.findUnique({ where: { id: sportId } });
    if (!sport || sport.captainId !== req.user!.id) {
      return res.status(403).json({ error: "You can only mark attendance for your own sport" });
    }
  }

  const entry = await prisma.attendance.create({
    data: { userId, sportId, ground, timeIn: new Date(), markedBy: req.user!.id },
  });
  await awardPoints(userId, POINTS.ATTENDANCE, "ATTENDANCE", entry.id);
  res.status(201).json(entry);
}

export async function myAttendance(req: AuthedRequest, res: Response) {
  const records = await prisma.attendance.findMany({
    where: { userId: req.user!.id },
    orderBy: { timeIn: "desc" },
    take: 100,
  });
  res.json(records);
}

export async function sportAttendance(req: AuthedRequest, res: Response) {
  const { sportId } = req.params;

  if (req.user!.role === "CAPTAIN") {
    const sport = await prisma.sport.findUnique({ where: { id: sportId } });
    if (!sport || sport.captainId !== req.user!.id) {
      return res.status(403).json({ error: "You can only view your own sport's attendance" });
    }
  }

  const records = await prisma.attendance.findMany({
    where: { sportId },
    include: { user: { select: { fullName: true, uniqueId: true } } },
    orderBy: { timeIn: "desc" },
    take: 200,
  });
  res.json(records);
}
