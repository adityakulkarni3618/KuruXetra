import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";

const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  mobileNumber: z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits").optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  bloodGroup: z.string().optional(),
  department: z.string().optional(),
  academicYear: z.string().optional(),
  passoutYear: z.preprocess((val) => {
    if (typeof val === "string") return Number(val);
    return val;
  }, z.number().int().positive().optional()),
  fitnessGoal: z.string().optional(),
});

const updateUrlSchema = z.object({
  url: z.string().url(),
});

export async function updateProfile(req: AuthedRequest, res: Response) {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid profile data", details: parsed.error.flatten() });
  }

  const data = parsed.data;
  const currentYear = new Date().getFullYear();
  if (data.passoutYear && (data.passoutYear < currentYear || data.passoutYear > currentYear + 4)) {
    return res.status(400).json({ error: `Passout year must be between ${currentYear} and ${currentYear + 4}` });
  }

  try {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      },
    });
    const { passwordHash, ...safeUser } = user;
    return res.json(safeUser);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to update profile" });
  }
}

export async function updateProfilePicture(req: AuthedRequest, res: Response) {
  const parsed = updateUrlSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid image URL", details: parsed.error.flatten() });
  }

  try {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { profilePhotoUrl: parsed.data.url },
    });
    const { passwordHash, ...safeUser } = user;
    return res.json(safeUser);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to update profile picture" });
  }
}

export async function updateCollegeId(req: AuthedRequest, res: Response) {
  const parsed = updateUrlSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid college ID URL", details: parsed.error.flatten() });
  }

  try {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { collegeIdUrl: parsed.data.url },
    });
    const { passwordHash, ...safeUser } = user;
    return res.json(safeUser);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to update college ID document" });
  }
}
