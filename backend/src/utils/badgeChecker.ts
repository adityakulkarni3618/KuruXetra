import { prisma } from "../lib/prisma";

export async function checkAndAwardBadges(userId: string): Promise<void> {
  try {
    // Fetch user and existing badges to avoid duplicate awards
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: { where: { status: "APPROVED" } },
        badges: { include: { badge: true } },
      },
    });

    if (!user) return;

    const existingBadgeNames = new Set(user.badges.map((ub) => ub.badge.name));

    // Helper to award a badge if not already awarded
    async function awardBadge(badgeName: string) {
      if (existingBadgeNames.has(badgeName)) return;

      const badge = await prisma.badge.findUnique({ where: { name: badgeName } });
      if (!badge) return;

      await prisma.userBadge.create({
        data: {
          userId,
          badgeId: badge.id,
        },
      }).catch((err) => {
        // Handle race conditions/unique constraints gracefully
        console.error(`Failed to award badge ${badgeName} to ${userId}:`, err.message);
      });
      console.log(`Badge "${badgeName}" awarded to user ${userId}`);
    }

    // 1. 100 Hours of Practice
    // Sum of logged workout duration + running log duration >= 100 hours (6000 minutes)
    if (!existingBadgeNames.has("100 Hours of Practice")) {
      const workoutSum = await prisma.workout.aggregate({
        where: { userId },
        _sum: { durationMin: true },
      });
      const runSum = await prisma.runningLog.aggregate({
        where: { userId },
        _sum: { durationMin: true },
      });

      const totalMinutes = (workoutSum._sum.durationMin || 0) + (runSum._sum.durationMin || 0);
      if (totalMinutes >= 6000) {
        await awardBadge("100 Hours of Practice");
      }
    }

    // 2. Perfect Attendance
    // User has attended all scheduled team meetings for their sport in the active season (min 3 meetings)
    if (!existingBadgeNames.has("Perfect Attendance")) {
      const activeSeason = await prisma.season.findFirst({ where: { isActive: true } });
      if (activeSeason && user.memberships.length > 0) {
        const sportIds = user.memberships.map((m) => m.sportId);

        // Find meetings for these sports scheduled during the active season
        const meetings = await prisma.teamMeeting.findMany({
          where: {
            sportId: { in: sportIds },
            scheduledAt: {
              gte: activeSeason.startsAt,
              lte: activeSeason.endsAt,
            },
          },
        });

        if (meetings.length >= 3) {
          const meetingIds = meetings.map((m) => m.id);
          const attendedCount = await prisma.meetingScore.count({
            where: {
              userId,
              meetingId: { in: meetingIds },
            },
          });

          if (attendedCount === meetings.length) {
            await awardBadge("Perfect Attendance");
          }
        }
      }
    }

    // 3. Most Consistent Player & 5. Iron Player (Streaks calculations)
    // Activities dates compilation
    const [attendanceList, workoutList, runList] = await Promise.all([
      prisma.attendance.findMany({ where: { userId }, select: { timeIn: true } }),
      prisma.workout.findMany({ where: { userId }, select: { createdAt: true } }),
      prisma.runningLog.findMany({ where: { userId }, select: { createdAt: true } }),
    ]);

    const activityDates = new Set<string>();
    const attendanceDates = new Set<string>();

    // Parse date to local YYYY-MM-DD
    const toDateStr = (date: Date) => {
      const d = new Date(date);
      // Format as YYYY-MM-DD in local time zone
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    attendanceList.forEach((a) => {
      const dStr = toDateStr(a.timeIn);
      attendanceDates.add(dStr);
      activityDates.add(dStr);
    });
    workoutList.forEach((w) => activityDates.add(toDateStr(w.createdAt)));
    runList.forEach((r) => activityDates.add(toDateStr(r.createdAt)));

    // Calculate streaking helper
    function getStreaks(datesSet: Set<string>, limitDaysBack?: number): number[] {
      const dates = Array.from(datesSet).map((d) => new Date(d).getTime());
      dates.sort((a, b) => a - b);

      if (dates.length === 0) return [0];

      let maxStreak = 0;
      let currentStreak = 0;
      let lastTime: number | null = null;

      const cutoffTime = limitDaysBack
        ? new Date().getTime() - limitDaysBack * 24 * 60 * 60 * 1000
        : null;

      for (const time of dates) {
        if (cutoffTime && time < cutoffTime) continue;

        if (lastTime === null) {
          currentStreak = 1;
        } else {
          const diffDays = Math.round((time - lastTime) / (24 * 60 * 60 * 1000));
          if (diffDays === 1) {
            currentStreak += 1;
          } else if (diffDays > 1) {
            maxStreak = Math.max(maxStreak, currentStreak);
            currentStreak = 1;
          }
        }
        lastTime = time;
      }
      maxStreak = Math.max(maxStreak, currentStreak);
      return [maxStreak, currentStreak];
    }

    // Streaks for Most Consistent Player (rolling 30-day window, highest attendance streak >= 5 days)
    if (!existingBadgeNames.has("Most Consistent Player")) {
      const [maxAttendanceStreak] = getStreaks(attendanceDates, 30);
      if (maxAttendanceStreak >= 5) {
        await awardBadge("Most Consistent Player");
      }
    }

    // Streaks for Iron Player (7 consecutive days with any logged activity)
    if (!existingBadgeNames.has("Iron Player")) {
      const [maxActivityStreak] = getStreaks(activityDates);
      if (maxActivityStreak >= 7) {
        await awardBadge("Iron Player");
      }
    }

    // 4. Early Bird
    // Checked in before 7:00 AM (local time hour < 7) at least 5 times
    if (!existingBadgeNames.has("Early Bird")) {
      let earlyCheckins = 0;
      for (const a of attendanceList) {
        const localHour = new Date(a.timeIn).getHours();
        if (localHour < 7) {
          earlyCheckins++;
        }
      }
      if (earlyCheckins >= 5) {
        await awardBadge("Early Bird");
      }
    }

  } catch (error: any) {
    console.error("Error in checkAndAwardBadges utility:", error);
  }
}
