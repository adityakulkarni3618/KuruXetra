import { prisma } from "../lib/prisma";

/**
 * Generates the next sequential college ID, e.g. KS000001, KS000002...
 * Uses a Postgres sequence to avoid concurrency race conditions.
 */
export async function generateUniqueId(rollNumber: string): Promise<string> {
  const cleanRoll = rollNumber.trim().toUpperCase().replace(/\s+/g, "");
  return `KX${cleanRoll}`;
}


