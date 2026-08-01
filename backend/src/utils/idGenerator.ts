import { prisma } from "../lib/prisma";

/**
 * Generates the next sequential college ID, e.g. KS000001, KS000002...
 * Uses a Postgres sequence to avoid concurrency race conditions.
 */
export async function generateUniqueId(rollNumber: string): Promise<string> {
  // Extract the first 2 digits from the roll number, e.g. "24" from "24CO01".
  // Fallback to "00" if no digits are found.
  const prefix = rollNumber.replace(/\D/g, "").slice(0, 2).padEnd(2, "0");
  const idPrefix = `KX${prefix}`;

  // Find the user with the highest uniqueId starting with this prefix
  const lastUser = await prisma.user.findFirst({
    where: {
      uniqueId: {
        startsWith: idPrefix,
      },
    },
    orderBy: {
      uniqueId: "desc",
    },
  });

  let nextSerial = 1;
  if (lastUser && lastUser.uniqueId.length === 8) {
    const serialStr = lastUser.uniqueId.slice(4);
    const parsed = parseInt(serialStr, 10);
    if (!isNaN(parsed)) {
      nextSerial = parsed + 1;
    }
  }

  return `${idPrefix}${String(nextSerial).padStart(4, "0")}`;
}


