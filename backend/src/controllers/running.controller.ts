import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";
import { awardPoints, POINTS } from "../utils/points";
import { checkAndAwardBadges } from "../utils/badgeChecker";

const runSchema = z.object({
  distanceKm: z.number().positive().optional(),
  rounds: z.number().positive().optional(),
  durationMin: z.number().positive(),
  calories: z.number().optional(),
  avgSpeed: z.number().optional(),
  maxSpeed: z.number().optional(),
  notes: z.string().optional(),
}).refine((data) => Boolean(data.distanceKm ?? data.rounds), {
  message: "Either distanceKm or rounds is required",
  path: ["distanceKm"],
});

const ROUND_METERS = 250;

export async function logRun(req: AuthedRequest, res: Response) {
  const parsed = runSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  let distanceKm = parsed.data.distanceKm;
  let rounds = parsed.data.rounds;
  if (!distanceKm && rounds) {
    distanceKm = (rounds * ROUND_METERS) / 1000;
  }
  if (!rounds && distanceKm) {
    rounds = (distanceKm * 1000) / ROUND_METERS;
  }

  const distanceMeters = distanceKm ? Math.round(distanceKm * 1000) : undefined;
  const paceMinKm = parsed.data.durationMin / (distanceKm || 1);

  const run = await prisma.runningLog.create({
    data: {
      userId: req.user!.id,
      distanceKm: distanceKm!,
      distanceMeters,
      rounds,
      durationMin: parsed.data.durationMin,
      calories: parsed.data.calories,
      avgSpeed: parsed.data.avgSpeed,
      maxSpeed: parsed.data.maxSpeed,
      notes: parsed.data.notes,
      paceMinKm,
    },
  });
  await awardPoints(req.user!.id, POINTS.RUNNING, "RUNNING", run.id);
  await checkAndAwardBadges(req.user!.id);
  res.status(201).json(run);
}

export async function myRuns(req: AuthedRequest, res: Response) {
  const runs = await prisma.runningLog.findMany({
    where: { userId: req.user!.id, isCleared: false },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(runs);
}

export async function getUserRuns(req: AuthedRequest, res: Response) {
  const { userId } = req.params;
  const viewerId = req.user!.id;
  const viewerRole = req.user!.role;

  try {
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return res.status(404).json({ error: "User not found" });

    const isSelf = target.id === viewerId;
    const isViewerAdmin = viewerRole === "SUPER_ADMIN";
    const canSee = target.isPublic || isSelf || isViewerAdmin;

    if (!canSee) {
      return res.status(403).json({ error: "This profile is private." });
    }

    const runs = await prisma.runningLog.findMany({
      where: { userId, isCleared: false },
      orderBy: { createdAt: "desc" },
    });
    res.json(runs);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to retrieve user runs" });
  }
}

export async function clearRuns(req: AuthedRequest, res: Response) {
  try {
    await prisma.runningLog.updateMany({
      where: { userId: req.user!.id },
      data: { isCleared: true },
    });
    res.json({ message: "Running history cleared successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to clear runs" });
  }
}

export async function restoreRuns(req: AuthedRequest, res: Response) {
  try {
    await prisma.runningLog.updateMany({
      where: { userId: req.user!.id },
      data: { isCleared: false },
    });
    res.json({ message: "Running history restored successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to restore runs" });
  }
}
