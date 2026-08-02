import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";
import { awardPoints, POINTS } from "../utils/points";
import { checkAndAwardBadges } from "../utils/badgeChecker";

const workoutSchema = z.object({
  name: z.string().min(1),         // free-text workout/exercise name
  exercise: z.string().optional(),
  sets: z.number().optional(),
  reps: z.number().optional(),
  weightKg: z.number().optional(),
  durationMin: z.number().optional(),
  calories: z.number().optional(),
  heartRate: z.number().optional(),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
  workoutTypeId: z.string().optional(), // optional — for legacy compatibility
});

export async function logWorkout(req: AuthedRequest, res: Response) {
  const parsed = workoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  // Determine points: 15 default for free-text workouts, or lookup workoutType if provided
  let points = 15;
  let resolvedWorkoutTypeId = parsed.data.workoutTypeId;

  if (resolvedWorkoutTypeId) {
    const workoutType = await prisma.workoutType.findUnique({ where: { id: resolvedWorkoutTypeId } });
    if (workoutType && workoutType.isActive) {
      points = workoutType.points;
    } else {
      resolvedWorkoutTypeId = undefined;
    }
  }

  const workout = await prisma.workout.create({
    data: {
      userId: req.user!.id,
      workoutTypeId: resolvedWorkoutTypeId,
      name: parsed.data.name,
      exercise: parsed.data.exercise,
      sets: parsed.data.sets,
      reps: parsed.data.reps,
      weightKg: parsed.data.weightKg,
      durationMin: parsed.data.durationMin,
      calories: parsed.data.calories,
      heartRate: parsed.data.heartRate,
      notes: parsed.data.notes,
      photoUrl: parsed.data.photoUrl,
    },
  });

  await awardPoints(req.user!.id, points, "WORKOUT", workout.id);
  await checkAndAwardBadges(req.user!.id);
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
