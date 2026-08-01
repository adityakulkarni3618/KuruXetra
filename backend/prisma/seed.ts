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

  console.log("Seeded super admin:", admin.uniqueId, "/ password: SSSS@123");
  console.log("Seeded sports:", sports.join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
