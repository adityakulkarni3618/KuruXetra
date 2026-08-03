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
    where: { userId: req.user!.id, isCleared: false },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(workouts);
}

export async function getUserWorkouts(req: AuthedRequest, res: Response) {
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

    const workouts = await prisma.workout.findMany({
      where: { userId, isCleared: false },
      orderBy: { createdAt: "desc" },
    });
    res.json(workouts);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to retrieve user workouts" });
  }
}

export async function clearWorkouts(req: AuthedRequest, res: Response) {
  try {
    await prisma.workout.updateMany({
      where: { userId: req.user!.id },
      data: { isCleared: true },
    });
    res.json({ message: "Workout history cleared successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to clear workouts" });
  }
}

export async function restoreWorkouts(req: AuthedRequest, res: Response) {
  try {
    await prisma.workout.updateMany({
      where: { userId: req.user!.id },
      data: { isCleared: false },
    });
    res.json({ message: "Workout history restored successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to restore workouts" });
  }
}

export async function clearSessionLogs(req: AuthedRequest, res: Response) {
  try {
    await prisma.athleteSessionLog.updateMany({
      where: { userId: req.user!.id },
      data: { isCleared: true },
    });
    res.json({ message: "Session history cleared successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to clear sessions" });
  }
}

export async function restoreSessionLogs(req: AuthedRequest, res: Response) {
  try {
    await prisma.athleteSessionLog.updateMany({
      where: { userId: req.user!.id },
      data: { isCleared: false },
    });
    res.json({ message: "Session history restored successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to restore sessions" });
  }
}
