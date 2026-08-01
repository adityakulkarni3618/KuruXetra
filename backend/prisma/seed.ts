import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("SSSS@123", 10);

  const admin = await prisma.user.upsert({
    where: { uniqueId: "KX000001" },
    update: { passwordHash, role: "SUPER_ADMIN" },
    create: {
      uniqueId: "KX000001",
      passwordHash,
      fullName: "Sports Secretary",
      rollNumber: "N/A",
      department: "Sports Office",
      academicYear: "N/A",
      mobileNumber: "9999999999",
      email: "ss_admin@kuruxetra.com",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });

  const sports = ["Kho-Kho", "Kabaddi", "Cricket", "Football", "Volleyball", "Badminton", "Table Tennis"];
  for (const name of sports) {
    await prisma.sport.upsert({
      where: { name },
      update: {},
      create: {
        name,
        slug: name.toLowerCase().replace(/\s+/g, "-"),
        description: `${name} team at Kurukshetra`,
      },
    });
  }

  const badges = [
    { name: "100 Hours of Practice", isManual: false, description: "SUM(Workout.duration + RunningLog.duration) >= 100 hours all-time" },
    { name: "Perfect Attendance", isManual: false, description: "Attendance % = 100 for a given Season (no missed sessions)" },
    { name: "Most Consistent Player", isManual: false, description: "Highest attendance streak in a rolling 30-day window" },
    { name: "Early Bird", isManual: false, description: "X check-ins logged before 7 AM" },
    { name: "Iron Player", isManual: false, description: "N consecutive days with at least one logged activity" },
    { name: "MVP", isManual: true, description: "Awarded by Captain per sport, per season/tournament" },
    { name: "Champion", isManual: true, description: "Awarded by Sports Secretary (tournament-level)" },
    { name: "Team Leader", isManual: true, description: "Awarded by Captain for recognition of a specific player" }
  ];

  for (const b of badges) {
    await prisma.badge.upsert({
      where: { name: b.name },
      update: { description: b.description, isManual: b.isManual },
      create: b,
    });
  }

  console.log("Seeded super admin:", admin.uniqueId, "/ password: SSSS@123");
  console.log("Seeded sports:", sports.join(", "));
  console.log("Seeded badges:", badges.map((b) => b.name).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
