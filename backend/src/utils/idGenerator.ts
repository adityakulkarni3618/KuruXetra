import { prisma } from "../lib/prisma";

/**
 * Generates the next sequential college ID, e.g. KS000001, KS000002...
 * Uses a Postgres sequence to avoid concurrency race conditions.
 */
export async function generateUniqueId(): Promise<string> {
  await prisma.$executeRawUnsafe(`
    CREATE SEQUENCE IF NOT EXISTS user_unique_id_seq START WITH 2;
  `);

  const result: any[] = await prisma.$queryRawUnsafe(`
    SELECT nextval('user_unique_id_seq')::text as val;
  `);
  
  const next = result[0]?.val || "2";
  return `KS${String(next).padStart(6, "0")}`;
}

