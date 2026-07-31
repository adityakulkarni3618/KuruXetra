import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";

const workoutTypeSchema = z.object({
  name: z.string().min(2),
  points: z.number().int(),
  isActive: z.boolean().optional(),
});

export async function listWorkoutTypes(_req: AuthedRequest, res: Response) {
  const types = await prisma.workoutType.findMany({ orderBy: { name: "asc" } });
  res.json(types);
}

export async function createWorkoutType(req: AuthedRequest, res: Response) {
  const parsed = workoutTypeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  const type = await prisma.workoutType.create({ data: { ...parsed.data, isActive: parsed.data.isActive ?? true } });
  res.status(201).json(type);
}

export async function updateWorkoutType(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  const parsed = workoutTypeSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  const type = await prisma.workoutType.update({ where: { id }, data: parsed.data });
  res.json(type);
}

export async function listAnnouncements(req: AuthedRequest, res: Response) {
  const { sportId } = req.query as { sportId?: string };
  const announcements = await prisma.announcement.findMany({
    where: {
      ...(sportId ? { sportId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, fullName: true, uniqueId: true } }, sport: { select: { id: true, name: true } } },
  });
  res.json(announcements);
}

const announcementSchema = z.object({
  title: z.string().min(2),
  body: z.string().min(10),
  sportId: z.string().optional(),
});

export async function createAnnouncement(req: AuthedRequest, res: Response) {
  const parsed = announcementSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  const announcement = await prisma.announcement.create({
    data: { ...parsed.data, authorId: req.user!.id },
  });
  res.status(201).json(announcement);
}

const meetingSchema = z.object({
  sportId: z.string().min(1),
  title: z.string().min(2),
  description: z.string().optional(),
  scheduledAt: z.string().refine((val) => !Number.isNaN(Date.parse(val)), "Invalid datetime"),
});

export async function scheduleMeeting(req: AuthedRequest, res: Response) {
  const parsed = meetingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  const meeting = await prisma.teamMeeting.create({
    data: {
      sportId: parsed.data.sportId,
      scheduledBy: req.user!.id,
      title: parsed.data.title,
      description: parsed.data.description,
      scheduledAt: new Date(parsed.data.scheduledAt),
    },
  });
  res.status(201).json(meeting);
}

const meetingScoreSchema = z.object({
  userId: z.string().min(1),
  points: z.number().min(0).max(10),
});

export async function scoreMeeting(req: AuthedRequest, res: Response) {
  const { meetingId } = req.params;
  const parsed = meetingScoreSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  const meeting = await prisma.teamMeeting.findUnique({ where: { id: meetingId }, include: { sport: true } });
  if (!meeting) return res.status(404).json({ error: "Meeting not found" });

  const sport = await prisma.sport.findUnique({ where: { id: meeting.sportId } });
  if (!sport) return res.status(404).json({ error: "Sport not found" });

  if (req.user!.role === "CAPTAIN" && sport.captainId !== req.user!.id) {
    return res.status(403).json({ error: "You can only score meetings for your own sport" });
  }

  const score = await prisma.meetingScore.create({
    data: {
      meetingId,
      userId: parsed.data.userId,
      points: parsed.data.points,
    },
  });

  await prisma.pointsLedger.create({
    data: {
      userId: parsed.data.userId,
      points: parsed.data.points,
      reason: "MEETING_SCORE",
      refId: score.id,
    },
  });

  res.status(201).json(score);
}

export async function listMeetings(req: AuthedRequest, res: Response) {
  const { sportId } = req.query as { sportId?: string };
  const meetings = await prisma.teamMeeting.findMany({
    where: {
      ...(sportId ? { sportId } : {}),
    },
    orderBy: { scheduledAt: "desc" },
    include: {
      sport: true,
      author: { select: { id: true, fullName: true, uniqueId: true } },
      scores: { include: { user: { select: { id: true, fullName: true } } } },
    },
  });
  res.json(meetings);
}
