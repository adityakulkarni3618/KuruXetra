import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";

// SS Admin: Create Combat Event
export async function createCombatEvent(req: AuthedRequest, res: Response) {
  const { name, isActive } = req.body as { name: string; isActive?: boolean };
  if (!name) return res.status(400).json({ error: "Event name is required" });

  try {
    const event = await prisma.combatEvent.create({
      data: { name, isActive: isActive !== false }
    });
    res.status(201).json(event);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create combat event" });
  }
}

// SS Admin: List all Combat Events
export async function listCombatEvents(req: AuthedRequest, res: Response) {
  try {
    const events = await prisma.combatEvent.findMany({
      include: {
        sports: {
          include: {
            headUser: { select: { id: true, fullName: true, uniqueId: true } },
            subHeads: { include: { user: { select: { id: true, fullName: true, uniqueId: true } } } },
            matches: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to list combat events" });
  }
}

// SS Admin: Add Sport to Event and assign Sport Head by Athletic ID (uniqueId)
export async function addCombatSport(req: AuthedRequest, res: Response) {
  const { eventId, sportName, headUniqueId } = req.body as { 
    eventId: string; 
    sportName: string; 
    headUniqueId?: string;
  };
  if (!eventId || !sportName) {
    return res.status(400).json({ error: "Event ID and Sport Name are required" });
  }

  try {
    let headUserId: string | null = null;
    if (headUniqueId) {
      const u = await prisma.user.findUnique({ where: { uniqueId: headUniqueId } });
      if (!u) return res.status(404).json({ error: "Athlete Head ID not found in database" });
      headUserId = u.id;
    }

    const sport = await prisma.combatSport.create({
      data: {
        eventId,
        sportName,
        headUserId
      },
      include: {
        headUser: { select: { id: true, fullName: true, uniqueId: true } }
      }
    });
    res.status(201).json(sport);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to add sport. Make sure it isn't a duplicate." });
  }
}

// SS Admin: Reassign Sport Head by Athletic ID (uniqueId)
export async function assignSportHead(req: AuthedRequest, res: Response) {
  const { sportId } = req.params;
  const { headUniqueId } = req.body as { headUniqueId: string };
  try {
    const u = await prisma.user.findUnique({ where: { uniqueId: headUniqueId } });
    if (!u) return res.status(404).json({ error: "Athlete Head ID not found" });

    const updated = await prisma.combatSport.update({
      where: { id: sportId },
      data: { headUserId: u.id },
      include: { headUser: { select: { id: true, fullName: true, uniqueId: true } } }
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to reassign head user" });
  }
}

// Sport Head: Assign Sub-Head by Athletic ID (uniqueId)
export async function addCombatSubHead(req: AuthedRequest, res: Response) {
  const { combatSportId } = req.params;
  const { subHeadUniqueId } = req.body as { subHeadUniqueId: string };
  const actorId = req.user!.id;

  try {
    const sport = await prisma.combatSport.findUnique({ where: { id: combatSportId } });
    if (!sport) return res.status(404).json({ error: "Combat sport not found" });

    // Validate request sender is the Sport Head
    if (sport.headUserId !== actorId && req.user!.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Only the assigned Sport Head can delegate sub-heads" });
    }

    const u = await prisma.user.findUnique({ where: { uniqueId: subHeadUniqueId } });
    if (!u) return res.status(404).json({ error: "Sub-Head Athlete ID not found" });

    const sub = await prisma.combatSubHead.create({
      data: {
        combatSportId,
        userId: u.id
      },
      include: {
        user: { select: { id: true, fullName: true, uniqueId: true } }
      }
    });
    res.status(201).json(sub);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delegate sub-head. Make sure they aren't already assigned." });
  }
}

// Sport Head: Schedule a match
export async function scheduleCombatMatch(req: AuthedRequest, res: Response) {
  const { combatSportId } = req.params;
  const { deptA, deptB, scheduledAt } = req.body as { 
    deptA: string; 
    deptB: string; 
    scheduledAt: string; 
  };
  const actorId = req.user!.id;

  if (!deptA || !deptB || !scheduledAt) {
    return res.status(400).json({ error: "Departments and scheduled time are required" });
  }

  try {
    const sport = await prisma.combatSport.findUnique({ where: { id: combatSportId } });
    if (!sport) return res.status(404).json({ error: "Combat sport not found" });

    if (sport.headUserId !== actorId && req.user!.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Only the Sport Head can schedule matches" });
    }

    const match = await prisma.combatMatch.create({
      data: {
        combatSportId,
        deptA,
        deptB,
        scheduledAt: new Date(scheduledAt),
        status: "SCHEDULED",
        currentScore: "Scheduled match"
      }
    });
    res.status(201).json(match);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to schedule match" });
  }
}

// Sport Head / Sub-Head: Update Live Score
export async function updateMatchScore(req: AuthedRequest, res: Response) {
  const { id } = req.params; // matchId
  const { scoreText, status, winnerDept } = req.body as {
    scoreText: string;
    status?: string; // "SCHEDULED" | "LIVE" | "COMPLETED"
    winnerDept?: string;
  };
  const actorId = req.user!.id;

  try {
    const match = await prisma.combatMatch.findUnique({
      where: { id },
      include: { combatSport: true }
    });
    if (!match) return res.status(404).json({ error: "Match not found" });

    // Validate actor is Head or delegated Sub-Head or Admin
    const isHead = match.combatSport.headUserId === actorId;
    const isSub = await prisma.combatSubHead.findUnique({
      where: {
        combatSportId_userId: { combatSportId: match.combatSportId, userId: actorId }
      }
    });
    const isAdmin = req.user!.role === "SUPER_ADMIN";

    if (!isHead && !isSub && !isAdmin) {
      return res.status(403).json({ error: "Unauthorized to update scores for this sport" });
    }

    const updated = await prisma.combatMatch.update({
      where: { id },
      data: {
        currentScore: scoreText,
        status: status || match.status,
        winnerDept: winnerDept || match.winnerDept
      }
    });

    // Write score logs
    await prisma.combatScoreLog.create({
      data: {
        matchId: id,
        scoreText,
        updatedById: actorId
      }
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update match scoreboard" });
  }
}

// Get active / completed matches scoreboard feed (Cricbuzz timeline)
export async function getLiveScoreboard(req: AuthedRequest, res: Response) {
  try {
    const matches = await prisma.combatMatch.findMany({
      include: {
        combatSport: {
          include: {
            event: true,
            headUser: { select: { id: true, fullName: true, uniqueId: true } }
          }
        },
        scoreUpdates: {
          orderBy: { updatedAt: "desc" },
          take: 5,
          include: { updatedBy: { select: { fullName: true } } }
        }
      },
      orderBy: { scheduledAt: "desc" }
    });
    res.json(matches);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load live match scorecard feed" });
  }
}

// Get user's headed and delegated combat sport panels
export async function getMyCombatSports(req: AuthedRequest, res: Response) {
  const userId = req.user!.id;
  try {
    const headed = await prisma.combatSport.findMany({
      where: { headUserId: userId },
      include: {
        event: true,
        subHeads: { include: { user: { select: { id: true, fullName: true, uniqueId: true } } } },
        matches: true
      }
    });

    const delegated = await prisma.combatSubHead.findMany({
      where: { userId },
      include: {
        combatSport: {
          include: {
            event: true,
            headUser: { select: { id: true, fullName: true, uniqueId: true } },
            matches: true
          }
        }
      }
    });

    res.json({
      headed,
      delegated: delegated.map(d => d.combatSport)
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load managed sports" });
  }
}
