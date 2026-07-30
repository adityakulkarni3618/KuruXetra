import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";
import { awardPoints, POINTS } from "../utils/points";

const runSchema = z.object({
  distanceKm: z.number().positive(),
  durationMin: z.number().positive(),
  calories: z.number().optional(),
  avgSpeed: z.number().optional(),
  maxSpeed: z.number().optional(),
  notes: z.string().optional(),
});

export async function logRun(req: AuthedRequest, res: Response) {
  const parsed = runSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  const { distanceKm, durationMin } = parsed.data;
  const paceMinKm = durationMin / distanceKm;

  const run = await prisma.runningLog.create({
    data: { ...parsed.data, paceMinKm, userId: req.user!.id },
  });
  await awardPoints(req.user!.id, POINTS.RUNNING, "RUNNING", run.id);
  res.status(201).json(run);
}

export async function myRuns(req: AuthedRequest, res: Response) {
  const runs = await prisma.runningLog.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(runs);
}
