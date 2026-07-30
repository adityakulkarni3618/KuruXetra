import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";
import { awardPoints, POINTS } from "../utils/points";

const workoutSchema = z.object({
  name: z.string().min(1),
  exercise: z.string().optional(),
  sets: z.number().optional(),
  reps: z.number().optional(),
  weightKg: z.number().optional(),
  durationMin: z.number().optional(),
  calories: z.number().optional(),
  heartRate: z.number().optional(),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
});

export async function logWorkout(req: AuthedRequest, res: Response) {
  const parsed = workoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  const workout = await prisma.workout.create({ data: { ...parsed.data, userId: req.user!.id } });
  await awardPoints(req.user!.id, POINTS.WORKOUT, "WORKOUT", workout.id);
  res.status(201).json(workout);
}

export async function myWorkouts(req: AuthedRequest, res: Response) {
  const workouts = await prisma.workout.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(workouts);
}
