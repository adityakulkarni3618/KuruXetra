import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";
import { awardPoints, POINTS } from "../utils/points";

const workoutSchema = z.object({
  workoutTypeId: z.string().min(1),
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

  const workoutType = await prisma.workoutType.findUnique({ where: { id: parsed.data.workoutTypeId } });
  if (!workoutType || !workoutType.isActive) {
    return res.status(404).json({ error: "Workout type not found or inactive" });
  }

  const workout = await prisma.workout.create({
    data: {
      userId: req.user!.id,
      workoutTypeId: workoutType.id,
      name: workoutType.name,
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
  await awardPoints(req.user!.id, workoutType.points, "WORKOUT", workout.id);
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
