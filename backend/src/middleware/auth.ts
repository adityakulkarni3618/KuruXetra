import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../lib/prisma";

export interface AuthedRequest extends Request {
  user?: { id: string; role: string; status: string };
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

    req.user = { id: user.id, role: user.role, status: user.status };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireActive(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.user?.status !== "ACTIVE") {
    return res.status(403).json({ error: "Your account is pending Sports Secretary approval" });
  }
  next();
}
