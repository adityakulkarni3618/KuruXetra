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

const createSessionSchema = z.object({
  sportId: z.string().min(1),
  title: z.string().min(2),
  startTime: z.string().refine((val) => !Number.isNaN(Date.parse(val)), "Invalid datetime"),
  workouts: z.array(z.object({
    workoutTypeId: z.string().min(1),
    rounds: z.boolean(),
  })).min(1),
});

export async function createSession(req: AuthedRequest, res: Response) {
  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  const { sportId, title, startTime, workouts } = parsed.data;

  const sport = await prisma.sport.findUnique({ where: { id: sportId } });
  if (!sport) return res.status(404).json({ error: "Sport not found" });

  if (req.user!.role === "CAPTAIN" && sport.captainId !== req.user!.id && sport.viceCaptainId !== req.user!.id) {
    return res.status(403).json({ error: "You can only create sessions for your own sport" });
  }

  const session = await prisma.session.create({
    data: {
      sportId,
      title,
      startTime: new Date(startTime),
      workouts: {
        create: workouts.map((w) => ({
          workoutTypeId: w.workoutTypeId,
          rounds: w.rounds,
        })),
      },
    },
    include: {
      workouts: { include: { workoutType: true } },
    },
  });

  res.status(201).json(session);
}

export async function listSessions(req: AuthedRequest, res: Response) {
  const { sportId } = req.query as { sportId?: string };

  const sessions = await prisma.session.findMany({
    where: {
      ...(sportId ? { sportId } : {}),
    },
    orderBy: { startTime: "desc" },
    include: {
      sport: true,
      workouts: { include: { workoutType: true } },
      athleteLogs: { include: { user: { select: { id: true, fullName: true, uniqueId: true } }, workoutType: true } },
    },
  });

  res.json(sessions);
}

const logSessionWorkoutSchema = z.object({
  workoutTypeId: z.string().min(1),
  completed: z.boolean(),
  value: z.number().optional(),
});

export async function logSessionWorkout(req: AuthedRequest, res: Response) {
  const { sessionId } = req.params;
  const parsed = logSessionWorkoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { sport: true } });
  if (!session) return res.status(404).json({ error: "Session not found" });

  if (session.status === "ENDED") {
    return res.status(400).json({ error: "This training session has already ended. Submissions are closed." });
  }

  // Verify athlete is approved member of the sport
  const membership = await prisma.membership.findFirst({
    where: { userId: req.user!.id, sportId: session.sportId, status: "APPROVED" },
  });
  if (!membership && req.user!.role !== "SUPER_ADMIN" && session.sport.captainId !== req.user!.id && session.sport.viceCaptainId !== req.user!.id) {
    return res.status(403).json({ error: "You are not an approved member of this sport" });
  }

  // Find if log already exists
  const existingLog = await prisma.athleteSessionLog.findFirst({
    where: {
      sessionId,
      userId: req.user!.id,
      workoutTypeId: parsed.data.workoutTypeId,
    },
  });

  let log;
  if (existingLog) {
    log = await prisma.athleteSessionLog.update({
      where: { id: existingLog.id },
      data: {
        completed: parsed.data.completed,
        value: parsed.data.value,
      },
    });
  } else {
    log = await prisma.athleteSessionLog.create({
      data: {
        sessionId,
        userId: req.user!.id,
        workoutTypeId: parsed.data.workoutTypeId,
        completed: parsed.data.completed,
        value: parsed.data.value,
      },
    });
  }

  res.json(log);
}

export async function deleteMeeting(req: AuthedRequest, res: Response) {
  const { id } = req.params;

  try {
    const meeting = await prisma.teamMeeting.findUnique({ where: { id }, include: { sport: true } });
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    // Auth check: Admin or captain of the sport
    if (req.user!.role === "CAPTAIN" && meeting.sport.captainId !== req.user!.id && meeting.sport.viceCaptainId !== req.user!.id) {
      return res.status(403).json({ error: "You can only delete meetings for your own sport" });
    }

    const scores = await prisma.meetingScore.findMany({ where: { meetingId: id } });
    const scoreIds = scores.map((s) => s.id);

    await prisma.$transaction([
      prisma.pointsLedger.deleteMany({ where: { reason: "MEETING_SCORE", refId: { in: scoreIds } } }),
      prisma.meetingScore.deleteMany({ where: { meetingId: id } }),
      prisma.teamMeeting.delete({ where: { id } }),
    ]);

    res.json({ message: "Meeting and associated scores deleted successfully" });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete meeting" });
  }
}

export async function deleteAnnouncement(req: AuthedRequest, res: Response) {
  const { id } = req.params;

  try {
    const announcement = await prisma.announcement.findUnique({ where: { id }, include: { sport: true } });
    if (!announcement) return res.status(404).json({ error: "Announcement not found" });

    // Auth check: Admin or author or captain of the sport
    if (req.user!.role === "CAPTAIN" && announcement.sport && announcement.sport.captainId !== req.user!.id && announcement.sport.viceCaptainId !== req.user!.id) {
      return res.status(403).json({ error: "You can only delete announcements for your own sport" });
    }

    await prisma.announcement.delete({ where: { id } });
    res.json({ message: "Announcement deleted successfully" });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete announcement" });
  }
}

export async function deleteSession(req: AuthedRequest, res: Response) {
  const { id } = req.params;

  try {
    const session = await prisma.session.findUnique({ where: { id }, include: { sport: true } });
    if (!session) return res.status(404).json({ error: "Session not found" });

    // Auth check: Admin or captain of the sport
    if (req.user!.role === "CAPTAIN" && session.sport.captainId !== req.user!.id && session.sport.viceCaptainId !== req.user!.id) {
      return res.status(403).json({ error: "You can only delete sessions for your own sport" });
    }

    await prisma.$transaction([
      prisma.athleteSessionLog.deleteMany({ where: { sessionId: id } }),
      prisma.sessionWorkout.deleteMany({ where: { sessionId: id } }),
      prisma.session.delete({ where: { id } }),
    ]);

    res.json({ message: "Session and associated logs deleted successfully" });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete session" });
  }
}

export async function endSession(req: AuthedRequest, res: Response) {
  const { id } = req.params;

  try {
    const session = await prisma.session.findUnique({ where: { id }, include: { sport: true } });
    if (!session) return res.status(404).json({ error: "Session not found" });

    // Auth check: Admin or captain/vice-captain of the sport
    if (req.user!.role === "CAPTAIN" && session.sport.captainId !== req.user!.id && session.sport.viceCaptainId !== req.user!.id) {
      return res.status(403).json({ error: "You can only end sessions for your own sport" });
    }

    const updated = await prisma.session.update({
      where: { id },
      data: { status: "ENDED" },
    });

    res.json(updated);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: "Failed to end session" });
  }
}

const reviewSessionLogsSchema = z.object({
  reviews: z.array(z.object({
    logId: z.string().min(1),
    status: z.enum(["APPROVED", "REJECTED"]),
  })).min(1),
});

export async function reviewSessionLogs(req: AuthedRequest, res: Response) {
  const { sessionId } = req.params;
  const parsed = reviewSessionLogsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  try {
    const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { sport: true } });
    if (!session) return res.status(404).json({ error: "Session not found" });

    if (req.user!.role === "CAPTAIN" && session.sport.captainId !== req.user!.id && session.sport.viceCaptainId !== req.user!.id) {
      return res.status(403).json({ error: "You can only review logs for your own sport" });
    }

    for (const item of parsed.data.reviews) {
      const log = await prisma.athleteSessionLog.findUnique({
        where: { id: item.logId },
        include: { workoutType: true },
      });

      if (!log || log.sessionId !== sessionId) continue;

      // Update log status
      await prisma.athleteSessionLog.update({
        where: { id: log.id },
        data: { status: item.status },
      });

      if (item.status === "APPROVED") {
        // Award points if not already awarded
        const existingLedger = await prisma.pointsLedger.findFirst({
          where: { reason: "SESSION_WORKOUT", refId: log.id },
        });

        if (!existingLedger) {
          await prisma.pointsLedger.create({
            data: {
              userId: log.userId,
              points: log.workoutType.points,
              reason: "SESSION_WORKOUT",
              refId: log.id,
            },
          });
        }
      } else {
        // If rejected, remove points if previously awarded
        await prisma.pointsLedger.deleteMany({
          where: { reason: "SESSION_WORKOUT", refId: log.id },
        });
      }
    }

    res.json({ message: "Session logs reviewed and points updated successfully" });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: "Failed to review session logs" });
  }
}


