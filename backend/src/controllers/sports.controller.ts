import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";

export async function listSports(req: AuthedRequest, res: Response) {
  const sports = await prisma.sport.findMany({
    include: {
      captain: { select: { id: true, fullName: true, uniqueId: true } },
      viceCaptain: { select: { id: true, fullName: true, uniqueId: true } },
      _count: { select: { memberships: true } },
    },
    orderBy: { name: "asc" },
  });
  res.json(sports);
}

const createSportSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional(),
  ground: z.string().optional(),
  practiceTime: z.string().optional(),
  maxMembers: z.number().optional(),
  logoUrl: z.string().optional(),
});

// SUPER_ADMIN only — creating/deleting sports is global control per the spec.
export async function createSport(req: AuthedRequest, res: Response) {
  const parsed = createSportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  const sport = await prisma.sport.create({ data: parsed.data });
  res.status(201).json(sport);
}

export async function updateSport(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  const sport = await prisma.sport.findUnique({ where: { id } });
  if (!sport) return res.status(404).json({ error: "Sport not found" });
  if (req.user!.role === "CAPTAIN" && sport.captainId !== req.user!.id && sport.viceCaptainId !== req.user!.id) {
    return res.status(403).json({ error: "You can only manage your own sport" });
  }
  const updated = await prisma.sport.update({ where: { id }, data: req.body });
  res.json(updated);
}

export async function deleteSport(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  await prisma.sport.update({ where: { id }, data: { status: "ARCHIVED" } });
  res.json({ message: "Sport archived" });
}

export async function assignCaptain(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  const { uniqueId, userId } = req.body as { uniqueId?: string; userId?: string };

  const user = uniqueId
    ? await prisma.user.findUnique({ where: { uniqueId } })
    : userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : null;

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const sport = await prisma.sport.update({ where: { id }, data: { captainId: user.id } });
  await prisma.user.update({ where: { id: user.id }, data: { role: "CAPTAIN" } });
  res.json(sport);
}

// Student requests to join a sport -> creates a PENDING membership
export async function joinSport(req: AuthedRequest, res: Response) {
  const { id: sportId } = req.params;
  const userId = req.user!.id;

  const existing = await prisma.membership.findUnique({
    where: { userId_sportId: { userId, sportId } },
  });
  if (existing) return res.status(409).json({ error: "You already requested/joined this sport" });

  const membership = await prisma.membership.create({
    data: { userId, sportId, status: "PENDING" },
  });
  res.status(201).json(membership);
}

// Captain or Super Admin approves/rejects a pending member
export async function reviewMembership(req: AuthedRequest, res: Response) {
  const { membershipId } = req.params;
  const { decision } = req.body as { decision: "APPROVED" | "REJECTED" };

  if (!["APPROVED", "REJECTED"].includes(decision)) {
    return res.status(400).json({ error: "decision must be APPROVED or REJECTED" });
  }

  const target = await prisma.membership.findUnique({ where: { id: membershipId }, include: { sport: true } });
  if (!target) return res.status(404).json({ error: "Membership request not found" });
  if (req.user!.role === "CAPTAIN" && target.sport.captainId !== req.user!.id) {
    return res.status(403).json({ error: "You can only review requests for your own sport" });
  }

  const membership = await prisma.membership.update({
    where: { id: membershipId },
    data: { status: decision },
  });
  res.json(membership);
}

export async function sportMembers(req: AuthedRequest, res: Response) {
  const { id: sportId } = req.params;
  const members = await prisma.membership.findMany({
    where: { sportId },
    include: { user: { select: { id: true, fullName: true, uniqueId: true, department: true } } },
  });
  res.json(members);
}

export async function demoteCaptain(req: AuthedRequest, res: Response) {
  const { id } = req.params; // sportId

  try {
    const sport = await prisma.sport.findUnique({ where: { id } });
    if (!sport) return res.status(404).json({ error: "Sport not found" });

    if (!sport.captainId) {
      return res.status(400).json({ error: "Sport has no captain assigned" });
    }

    const captain = await prisma.user.findUnique({ where: { id: sport.captainId } });
    if (!captain) {
      // Just clear the id if the user is missing
      await prisma.sport.update({ where: { id }, data: { captainId: null } });
      return res.json({ message: "Captain reference cleared" });
    }

    const nextRole = captain.priorRole === "SUPER_ADMIN" ? "STUDENT_ATHLETE" : captain.priorRole || "STUDENT_ATHLETE";

    await prisma.$transaction([
      prisma.sport.update({ where: { id }, data: { captainId: null } }),
      prisma.user.update({
        where: { id: captain.id },
        data: { role: nextRole, priorRole: null },
      }),
    ]);

    return res.json({ message: "Captain demoted successfully" });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to demote captain" });
  }
}

export async function removeTeamMember(req: AuthedRequest, res: Response) {
  const { membershipId } = req.params;
  const actorId = req.user!.id;
  const actorRole = req.user!.role;

  try {
    const membership = await prisma.membership.findUnique({
      where: { id: membershipId },
      include: { sport: true },
    });

    if (!membership) return res.status(404).json({ error: "Membership not found" });

    // Must be Admin or the captain of the sport
    if (actorRole !== "SUPER_ADMIN" && membership.sport.captainId !== actorId) {
      return res.status(403).json({ error: "You are not authorized to remove members from this team" });
    }

    await prisma.membership.update({
      where: { id: membershipId },
      data: { status: "REMOVED" },
    });

    return res.json({ message: "Member removed from team successfully" });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to remove member" });
  }
}

export async function awardSportBadge(req: AuthedRequest, res: Response) {
  const { sportId } = req.params;
  const { userId, badgeName } = req.body as { userId: string; badgeName: "MVP" | "Team Leader" };
  const actorId = req.user!.id;

  if (!["MVP", "Team Leader"].includes(badgeName)) {
    return res.status(400).json({ error: "Invalid badge. Only MVP or Team Leader can be manually awarded by captains." });
  }

  try {
    const sport = await prisma.sport.findUnique({ where: { id: sportId } });
    if (!sport) return res.status(404).json({ error: "Sport not found" });

    // Restrict to captain of the sport
    if (req.user!.role === "CAPTAIN" && sport.captainId !== actorId) {
      return res.status(403).json({ error: "You can only award badges to athletes on your own team." });
    }

    // Verify user is an approved member of the sport
    const membership = await prisma.membership.findFirst({
      where: { userId, sportId, status: "APPROVED" },
    });
    if (!membership) {
      return res.status(400).json({ error: "User is not an approved member of this sport." });
    }

    const badge = await prisma.badge.findUnique({ where: { name: badgeName } });
    if (!badge) return res.status(404).json({ error: `${badgeName} badge not found in database. Run seed first.` });

    const userBadge = await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
      update: { awardedById: actorId },
      create: { userId, badgeId: badge.id, awardedById: actorId },
    });

    return res.json({ message: `Badge ${badgeName} awarded successfully`, userBadge });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to award badge" });
  }
}

export async function assignViceCaptain(req: AuthedRequest, res: Response) {
  const { id } = req.params; // sportId
  const { uniqueId, userId } = req.body as { uniqueId?: string; userId?: string };

  const user = uniqueId
    ? await prisma.user.findUnique({ where: { uniqueId } })
    : userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : null;

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const sport = await prisma.sport.update({
    where: { id },
    data: { viceCaptainId: user.id },
  });

  // Promote to CAPTAIN role so they share Captain privileges
  await prisma.user.update({
    where: { id: user.id },
    data: { role: "CAPTAIN" },
  });

  res.json(sport);
}

export async function demoteViceCaptain(req: AuthedRequest, res: Response) {
  const { id } = req.params; // sportId

  try {
    const sport = await prisma.sport.findUnique({ where: { id } });
    if (!sport) return res.status(404).json({ error: "Sport not found" });

    if (!sport.viceCaptainId) {
      return res.status(400).json({ error: "Sport has no vice-captain assigned" });
    }

    const viceCaptainId = sport.viceCaptainId;

    const sportUpdated = await prisma.sport.update({
      where: { id },
      data: { viceCaptainId: null },
    });

    // Demote role if they are no longer captain/vice-captain of any sport
    const otherRoles = await prisma.sport.count({
      where: {
        OR: [{ captainId: viceCaptainId }, { viceCaptainId: viceCaptainId }],
        NOT: { id },
      },
    });

    if (otherRoles === 0) {
      await prisma.user.update({
        where: { id: viceCaptainId },
        data: { role: "STUDENT_ATHLETE" },
      });
    }

    res.json(sportUpdated);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: "Failed to demote vice-captain" });
  }
}


