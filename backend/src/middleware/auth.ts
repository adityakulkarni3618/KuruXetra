import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../lib/prisma";

export interface AuthedRequest extends Request {
  user?: { id: string; role: string };
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  try {
    const token = header.split(" ")[1];
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return res.status(401).json({ error: "User no longer exists" });
    if (user.status === "SUSPENDED") return res.status(403).json({ error: "Account suspended" });
    if (user.status === "PENDING_APPROVAL")
      return res.status(403).json({ error: "Account is pending Sports Secretary approval" });

    req.user = { id: user.id, role: user.role };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
