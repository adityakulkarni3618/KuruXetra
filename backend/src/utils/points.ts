import { prisma } from "../lib/prisma";

// Central point values — matches the spec. Change here, it changes everywhere.
export const POINTS = {
  ATTENDANCE: 10,
  WORKOUT: 15,
  RUNNING: 20,
  MATCH_WIN: 50,
  CAPTAIN_RECOMMENDATION: 25,
  CHALLENGE_COMPLETED: 100,
  PENALTY_MISSED_PRACTICE: -10,
  PENALTY_LATE_ARRIVAL: -5,
};

export async function awardPoints(
  userId: string,
  points: number,
  reason: string,
  refId?: string,
  seasonId?: string
) {
  return prisma.pointsLedger.create({
    data: { userId, points, reason, refId, seasonId },
  });
}
