import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin@123", 10);

  const admin = await prisma.user.upsert({
    where: { username: "ss_admin" },
    update: {},
    create: {
      uniqueId: "KS000001",
      username: "ss_admin",
      passwordHash,
      fullName: "Sports Secretary",
      collegeId: "ADMIN001",
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

  console.log("Seeded super admin:", admin.username, "/ password: Admin@123");
  console.log("Seeded sports:", sports.join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
