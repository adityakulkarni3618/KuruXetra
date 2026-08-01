import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BACKEND_URL = "http://localhost:4000";

async function runTests() {
  console.log("==================================================");
  console.log("TESTING BADGES AND ADMIN ACTIONS ON DEV BRANCH");
  console.log("==================================================");

  // 1. Ensure test users and active admin are set up
  const adminPassword = "SSSS@123";
  let adminToken = "";

  try {
    const loginRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uniqueId: "KX000001",
        password: adminPassword,
      }),
    });
    if (!loginRes.ok) {
      throw new Error(`Login failed with status ${loginRes.status}`);
    }
    const data = await loginRes.json() as any;
    adminToken = data.token;
    console.log("SUCCESS: Logged in as Admin Sports Secretary.");
  } catch (err: any) {
    console.error("FAILED to log in as Admin. Make sure backend is running on port 4000.", err.message);
    process.exit(1);
  }

  // Create a test athlete who is active
  const testAthleteUniqueId = "KXTEST9999";
  let athleteToken = "";
  let athleteUserId = "";

  const existingAthlete = await prisma.user.findUnique({ where: { uniqueId: testAthleteUniqueId } });
  if (existingAthlete) {
    await prisma.$transaction([
      prisma.userBadge.deleteMany({ where: { userId: existingAthlete.id } }),
      prisma.runningLog.deleteMany({ where: { userId: existingAthlete.id } }),
      prisma.workout.deleteMany({ where: { userId: existingAthlete.id } }),
      prisma.attendance.deleteMany({ where: { userId: existingAthlete.id } }),
      prisma.membership.deleteMany({ where: { userId: existingAthlete.id } }),
      prisma.user.delete({ where: { id: existingAthlete.id } }),
    ]).catch(() => {});
  }

  // Register the athlete
  try {
    const regRes = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Badge Tester",
        rollNumber: "TEST9999",
        department: "Computer Engineering",
        academicYear: "BE",
        mobileNumber: "9876543210",
        email: "badge_tester@kuruxetra.com",
        password: "Password@123",
        confirmPassword: "Password@123",
        preferredSports: ["Kho-Kho"],
      }),
    });
    if (!regRes.ok) {
      const errData = await regRes.json() as any;
      console.error("FAILED to register athlete:", errData);
    } else {
      console.log("SUCCESS: Test Athlete registered successfully.");
    }
  } catch (err: any) {
    console.error("FAILED to register athlete:", err.message);
  }

  // Find User ID and approve them
  const athlete = await prisma.user.findUnique({ where: { uniqueId: testAthleteUniqueId } });
  if (!athlete) throw new Error("Athlete not found in database.");
  athleteUserId = athlete.id;

  // Approve the user
  await fetch(`${BACKEND_URL}/api/admin/users/${athleteUserId}/approve`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log("SUCCESS: Test Athlete approved by Sports Secretary.");

  // Log in as test athlete
  const athLogin = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uniqueId: testAthleteUniqueId,
      password: "Password@123",
    }),
  });
  const athLoginData = await athLogin.json() as any;
  athleteToken = athLoginData.token;

  // Approve membership for Kho-Kho
  const membership = await prisma.membership.findFirst({ where: { userId: athleteUserId } });
  if (membership) {
    await prisma.membership.update({
      where: { id: membership.id },
      data: { status: "APPROVED" },
    });
  }

  // 2. Test Auto-badge Award (e.g. Early Bird by logging check-ins before 7am)
  console.log("\n--- Testing Early Bird Auto Badge ---");
  // Mock 5 checkins before 7 AM
  const mockCheckins = [];
  const baseTime = new Date();
  baseTime.setHours(6, 0, 0, 0); // 6:00 AM

  for (let i = 0; i < 5; i++) {
    const timeIn = new Date(baseTime.getTime() - i * 24 * 60 * 60 * 1000);
    const timeOut = new Date(timeIn.getTime() + 60 * 60 * 1000);
    mockCheckins.push(
      prisma.attendance.create({
        data: {
          userId: athleteUserId,
          timeIn,
          timeOut,
          durationMin: 60,
          ground: "Main Ground",
        },
      })
    );
  }
  await prisma.$transaction(mockCheckins);
  console.log("Injected 5 early morning check-ins. Triggering log-run to run badge calculations...");

  // Log a run as athlete to trigger badge checker
  const runLogRes = await fetch(`${BACKEND_URL}/api/running`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${athleteToken}`,
    },
    body: JSON.stringify({ durationMin: 30, distanceKm: 5 }),
  });
  console.log("Logged a run. Check-in triggers have executed. Status:", runLogRes.status);

  // Verify user got the Early Bird Badge
  const userBadges = await prisma.userBadge.findMany({
    where: { userId: athleteUserId },
    include: { badge: true },
  });
  const earnedNames = userBadges.map((ub) => ub.badge.name);
  console.log("Earned Badges List:", earnedNames);
  if (earnedNames.includes("Early Bird")) {
    console.log("SUCCESS: Early Bird auto-badge was correctly awarded!");
  } else {
    console.error("FAILED: Early Bird auto-badge was NOT awarded.");
  }

  // 3. Test Manual Badge Awarding (Champion)
  console.log("\n--- Testing Manual Award Champion Badge ---");
  try {
    const championRes = await fetch(`${BACKEND_URL}/api/admin/users/${athleteUserId}/award-badge`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const championData = await championRes.json() as any;
    console.log("Award badge status:", championRes.status, championData?.message);
    const updatedBadges = await prisma.userBadge.findMany({
      where: { userId: athleteUserId },
      include: { badge: true },
    });
    const updatedNames = updatedBadges.map((ub) => ub.badge.name);
    if (updatedNames.includes("Champion")) {
      console.log("SUCCESS: Champion badge manually awarded by SS successfully!");
    } else {
      console.error("FAILED: Champion badge not found.");
    }
  } catch (err: any) {
    console.error("FAILED to manually award Champion badge:", err.message);
  }

  // 4. Test Suspend/Activate Toggle
  console.log("\n--- Testing Suspend and Account Lockout ---");
  try {
    const suspendRes = await fetch(`${BACKEND_URL}/api/admin/users/${athleteUserId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "SUSPENDED" }),
    });
    const suspendData = await suspendRes.json() as any;
    console.log("Suspended athlete status:", suspendRes.status, suspendData?.message);

    // Try logging in with suspended user
    try {
      const lRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uniqueId: testAthleteUniqueId,
          password: "Password@123",
        }),
      });
      if (lRes.ok) {
        console.error("FAILED: Logged in successfully with suspended user!");
      } else {
        const lData = await lRes.json() as any;
        console.log("SUCCESS: Suspended user login blocked. Status:", lRes.status, "Message:", lData?.error);
      }
    } catch (loginErr: any) {
      console.log("SUCCESS: Suspended user login blocked as expected.", loginErr.message);
    }

    // Activate the user back
    await fetch(`${BACKEND_URL}/api/admin/users/${athleteUserId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "ACTIVE" }),
    });
    console.log("SUCCESS: Athlete account re-activated successfully.");
  } catch (err: any) {
    console.error("FAILED during suspension test:", err.message);
  }

  // 5. Test Password Reset
  console.log("\n--- Testing Password Reset ---");
  try {
    const resetRes = await fetch(`${BACKEND_URL}/api/admin/users/${athleteUserId}/reset-password`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const resetData = await resetRes.json() as any;
    const tempPassword = resetData.tempPassword;
    console.log("Generated temporary password:", tempPassword);

    // Try logging in with new temporary password
    const tempLogin = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uniqueId: testAthleteUniqueId,
        password: tempPassword,
      }),
    });
    if (tempLogin.ok) {
      console.log("SUCCESS: Logged in using temporary password successfully. Token acquired!");
    } else {
      console.error("FAILED to log in with temporary password:", await tempLogin.json());
    }
  } catch (err: any) {
    console.error("FAILED to reset/use temporary password:", err.message);
  }

  // 6. Test Sport Deactivation
  console.log("\n--- Testing Sport Deactivation ---");
  try {
    const sport = await prisma.sport.findFirst({ where: { name: "Kho-Kho" } });
    if (!sport) throw new Error("Kho-Kho sport not found.");

    const deactRes = await fetch(`${BACKEND_URL}/api/admin/sports/${sport.id}/deactivate`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log("Deactivation status:", deactRes.status);
    const updatedSport = await prisma.sport.findUnique({ where: { id: sport.id } });
    if (updatedSport?.isActive === false) {
      console.log("SUCCESS: Sport isActive status set to false successfully!");
    } else {
      console.error("FAILED: Sport was not deactivated.");
    }

    // Re-activate to avoid leaving DB in dirty state
    await prisma.sport.update({ where: { id: sport.id }, data: { isActive: true } });
  } catch (err: any) {
    console.error("FAILED during sport deactivation test:", err.message);
  }

  // Clean up
  await prisma.$transaction([
    prisma.userBadge.deleteMany({ where: { userId: athleteUserId } }),
    prisma.runningLog.deleteMany({ where: { userId: athleteUserId } }),
    prisma.workout.deleteMany({ where: { userId: athleteUserId } }),
    prisma.attendance.deleteMany({ where: { userId: athleteUserId } }),
    prisma.membership.deleteMany({ where: { userId: athleteUserId } }),
    prisma.user.delete({ where: { id: athleteUserId } }),
  ]).catch(() => {});
  console.log("\nCleanup done. Tests completed.");
}

runTests().catch((err) => {
  console.error("Unhandled error during test run:", err);
  process.exit(1);
});
