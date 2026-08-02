const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const event = await prisma.combatEvent.upsert({
    where: { name: "COMBAT 2026" },
    update: {},
    create: {
      name: "COMBAT 2026",
      isActive: true,
    }
  });
  console.log("Combat Event seeded:", event);
}

main().catch(console.error).finally(() => prisma.$disconnect());
