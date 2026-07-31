import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";

// Aggregates the append-only PointsLedger into a ranked list.
// Optional ?sportId= filters to students who are approved members of that sport.
export async function leaderboard(req: AuthedRequest, res: Response) {
  const { sportId, department } = req.query as { sportId?: string; department?: string };

  const grouped = await prisma.pointsLedger.groupBy({
    by: ["userId"],
    _sum: { points: true },
  });

  let userIds: string[] = grouped.map((g: { userId: string }) => g.userId);

  const approvedMembers = await prisma.membership.findMany({
    where: {
      status: "APPROVED",
      ...(sportId ? { sportId } : {}),
    },
    select: { userId: true },
  });

  const approvedMemberIds = new Set(approvedMembers.map((m: { userId: string }) => m.userId));
  userIds = userIds.filter((id: string) => approvedMemberIds.has(id));

  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      ...(department ? { department } : {}),
    },
    select: { id: true, fullName: true, uniqueId: true, department: true, profilePhotoUrl: true },
  });

  const pointsByUser = new Map(
    grouped.map((g: { userId: string; _sum: { points: number | null } }) => [g.userId, g._sum.points || 0])
  );

  const board = users
    .map((u: { id: string }) => ({ ...u, points: pointsByUser.get(u.id) || 0 }))
    .sort((a: { points: number }, b: { points: number }) => b.points - a.points)
    .map((row: any, i: number) => ({ rank: i + 1, ...row }));

  res.json(board);
}
