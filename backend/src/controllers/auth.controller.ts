import { Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../utils/jwt";
import { generateUniqueId } from "../utils/idGenerator";
import { AuthedRequest } from "../middleware/auth";

const registerSchema = z.object({
  fullName: z.string().min(2),
  rollNumber: z.string().min(1),
  department: z.string().min(1),
  academicYear: z.string().min(1),
  mobileNumber: z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
  email: z.string().email(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  bloodGroup: z.string().optional(),
  passoutYear: z.preprocess((val) => {
    if (typeof val === "string") return Number(val);
    return val;
  }, z.number().int().positive().optional()),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
  fitnessGoal: z.string().optional(),
  profilePhotoUrl: z.string().optional(),
  collegeIdUrl: z.string().optional(),
  studentIdCardUrl: z.string().optional(),
  preferredSports: z.array(z.string()).optional(),
});

// First registered account becomes SUPER_ADMIN automatically and is auto-active,
// so there's always someone able to approve everyone else. Every account after
// that starts PENDING_APPROVAL as per the spec.
export async function register(req: AuthedRequest, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  const { preferredSports, password, confirmPassword, ...data } = parsed.data;

  if (password !== confirmPassword) {
    return res.status(400).json({ error: "Password and confirm password must match" });
  }

  const currentYear = new Date().getFullYear();
  if (data.passoutYear && (data.passoutYear < currentYear || data.passoutYear > currentYear + 4)) {
    return res.status(400).json({ error: `Passout year must be between ${currentYear} and ${currentYear + 4}` });
  }

  const existing = await prisma.user.findFirst({
    where: { email: data.email },
  });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(password, 10);
  const uniqueId = await generateUniqueId(data.rollNumber);
  const isFirstUser = (await prisma.user.count()) === 0;

  let user;
  try {
    user = await prisma.user.create({
      data: {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        passwordHash,
        uniqueId,
        role: isFirstUser ? "SUPER_ADMIN" : "STUDENT_ATHLETE",
        status: isFirstUser ? "ACTIVE" : "PENDING_APPROVAL",
      },
    });
  } catch (err: any) {
    if (err.code === "P2002") {
      return res.status(409).json({
        error: "This roll number is already registered. If this seems wrong, contact your Sports Secretary.",
      });
    }
    throw err;
  }

  if (preferredSports && preferredSports.length > 0) {
    const sports = await prisma.sport.findMany({
      where: {
        OR: [
          { id: { in: preferredSports } },
          { slug: { in: preferredSports } },
          { name: { in: preferredSports } },
        ],
      },
    });

    if (sports.length > 0) {
      await prisma.membership.createMany({
        data: sports.map((s) => ({
          userId: user.id,
          sportId: s.id,
          status: "PENDING",
        })),
        skipDuplicates: true,
      });
    }
  }

  return res.status(201).json({
    message: isFirstUser
      ? "Super Admin account created and active."
      : "Registered. Your account is pending Sports Secretary approval.",
    uniqueId: user.uniqueId,
  });
}

const loginSchema = z.object({
  uniqueId: z.string(),
  password: z.string(),
});

export async function login(req: AuthedRequest, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Athletic ID and password required" });

  const { uniqueId, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { uniqueId } });
  if (!user) return res.status(401).json({ error: "Invalid Athletic ID or password" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid Athletic ID or password" });

  if (user.status === "SUSPENDED")
    return res.status(403).json({ error: "Your account has been suspended" });

  const token = signToken({ userId: user.id, role: user.role });
  const captainOf = await prisma.sport.findMany({ where: { captainId: user.id } });
  return res.json({
    token,
    user: {
      id: user.id,
      uniqueId: user.uniqueId,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      department: user.department,
      captainOf,
    },
  });
}
export async function forgotPassword(req: AuthedRequest, res: Response) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const user = await prisma.user.findUnique({ where: { email } });
  // Always return success to not leak if email exists
  if (!user) return res.json({ message: "If that email is registered, an OTP has been sent." });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await prisma.user.update({
    where: { id: user.id },
    data: { resetOtp: otp, resetOtpExpires: expires },
  });

  // In production, send via email service. For now, log to console.
  console.log(`\n======== PASSWORD RESET OTP ========`);
  console.log(`Email: ${email}`);
  console.log(`OTP: ${otp}`);
  console.log(`Expires: ${expires.toISOString()}`);
  console.log(`====================================\n`);

  return res.json({ message: "If that email is registered, an OTP has been sent." });
}

export async function resetPasswordOtp(req: AuthedRequest, res: Response) {
  const { email, otp, newPassword, confirmPassword } = req.body;
  if (!email || !otp || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: "Email, OTP, new password, and confirm password are required." });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.resetOtp || !user.resetOtpExpires) {
    return res.status(400).json({ error: "Invalid or expired OTP. Please request a new one." });
  }
  if (user.resetOtp !== otp) {
    return res.status(400).json({ error: "Incorrect OTP code." });
  }
  if (user.resetOtpExpires < new Date()) {
    return res.status(400).json({ error: "OTP has expired. Please request a new one." });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetOtp: null, resetOtpExpires: null },
  });

  return res.json({ message: "Password reset successfully. You can now log in with your new password." });
}

export async function me(req: AuthedRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      memberships: { include: { sport: true } },
      captainOf: true,
    },
  });
  if (!user) return res.status(404).json({ error: "User not found" });

  const pointsSum = await prisma.pointsLedger.aggregate({
    where: { userId: req.user!.id },
    _sum: { points: true },
  });

  const { passwordHash, ...safeUser } = user;
  return res.json({
    ...safeUser,
    totalPoints: pointsSum._sum.points || 0,
  });
}
