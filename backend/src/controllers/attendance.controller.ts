import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";
import { awardPoints, POINTS } from "../utils/points";
import { checkAndAwardBadges } from "../utils/badgeChecker";

async function autoCheckoutPendingEntries(userId: string) {
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const expiredEntries = await prisma.attendance.findMany({
    where: {
      userId,
      timeOut: null,
      isSession: false,
      timeIn: { lt: threeHoursAgo }
    }
  });

  for (const entry of expiredEntries) {
    const timeOut = new Date(entry.timeIn.getTime() + 3 * 60 * 60 * 1000);
    await prisma.attendance.update({
      where: { id: entry.id },
      data: {
        timeOut,
        durationMin: 180
      }
    });
  }
}

// Digital replacement for the physical register: a student checks in when
// they arrive on the ground.
export async function checkIn(req: AuthedRequest, res: Response) {
  const userId = req.user!.id;
  const { sportId, ground, isSession } = req.body as { sportId?: string; ground?: string; isSession?: boolean };

  await autoCheckoutPendingEntries(userId);

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
    data: { userId, sportId, ground, timeIn: new Date(), isSession: isSession ?? false },
  });

  await awardPoints(userId, POINTS.ATTENDANCE, "ATTENDANCE", entry.id);
  await checkAndAwardBadges(userId);
  res.status(201).json(entry);
}

export async function checkOut(req: AuthedRequest, res: Response) {
  const userId = req.user!.id;

  await autoCheckoutPendingEntries(userId);

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
  await checkAndAwardBadges(userId);
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

  // Enforce no past/future attendance: checkIn/mark must be for the current day/time.
  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  const todayEnd = new Date();
  todayEnd.setHours(23,59,59,999);

  // Check if user already has attendance marked for today
  const existingToday = await prisma.attendance.findFirst({
    where: {
      userId,
      sportId,
      timeIn: {
        gte: todayStart,
        lte: todayEnd,
      }
    }
  });

  if (existingToday) {
    return res.status(400).json({ error: "Attendance already marked for this user today." });
  }

  const entry = await prisma.attendance.create({
    data: { userId, sportId, ground, timeIn: new Date(), markedBy: req.user!.id },
  });
  await awardPoints(userId, POINTS.ATTENDANCE, "ATTENDANCE", entry.id);
  await checkAndAwardBadges(userId);
  res.status(201).json(entry);
}

export async function batchMarkAttendance(req: AuthedRequest, res: Response) {
  const { userIds, sportId, ground } = req.body as { userIds: string[]; sportId: string; ground?: string };

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: "No athletes selected." });
  }

  if (req.user!.role === "CAPTAIN") {
    const sport = await prisma.sport.findUnique({ where: { id: sportId } });
    if (!sport || sport.captainId !== req.user!.id) {
      return res.status(403).json({ error: "You can only mark attendance for your own sport" });
    }
  }

  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  const todayEnd = new Date();
  todayEnd.setHours(23,59,59,999);

  const results: any[] = [];
  const errors: string[] = [];

  for (const userId of userIds) {
    try {
      const existingToday = await prisma.attendance.findFirst({
        where: {
          userId,
          sportId,
          timeIn: { gte: todayStart, lte: todayEnd }
        }
      });
      if (existingToday) {
        errors.push(`Attendance already marked for user ${userId} today.`);
        continue;
      }
      const entry = await prisma.attendance.create({
        data: { userId, sportId, ground, timeIn: new Date(), markedBy: req.user!.id }
      });
      await awardPoints(userId, POINTS.ATTENDANCE, "ATTENDANCE", entry.id);
      await checkAndAwardBadges(userId);
      results.push(entry);
    } catch (err: any) {
      errors.push(`Failed to mark user ${userId}: ${err.message}`);
    }
  }

  res.status(200).json({ success: true, markedCount: results.length, errors });
}

export async function myAttendance(req: AuthedRequest, res: Response) {
  await autoCheckoutPendingEntries(req.user!.id);
  const records = await prisma.attendance.findMany({
    where: { userId: req.user!.id, isCleared: false },
    orderBy: { timeIn: "desc" },
    take: 100,
  });
  res.json(records);
}

export async function clearAttendance(req: AuthedRequest, res: Response) {
  try {
    await prisma.attendance.updateMany({
      where: { userId: req.user!.id },
      data: { isCleared: true },
    });
    res.json({ message: "Attendance history cleared successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to clear attendance history" });
  }
}

export async function restoreAttendance(req: AuthedRequest, res: Response) {
  try {
    await prisma.attendance.updateMany({
      where: { userId: req.user!.id },
      data: { isCleared: false },
    });
    res.json({ message: "Attendance history restored successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to restore attendance history" });
  }
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
