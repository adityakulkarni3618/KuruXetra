import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";
import { awardPoints, POINTS } from "../utils/points";

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
