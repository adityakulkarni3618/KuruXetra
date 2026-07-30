import { Response, NextFunction } from "express";
import { AuthedRequest } from "./auth";

/** Restrict a route to one or more roles, e.g. requireRole("SUPER_ADMIN", "CAPTAIN") */
export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You don't have permission to do this" });
    }
    next();
  };
}
