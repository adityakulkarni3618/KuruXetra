import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BACKEND_URL = "http://localhost:4000";

async function runTests() {
  console.log("==================================================");
  console.log("TESTING SPEC GAPS AND ATTENDANCE MARKING");
  console.log("==================================================");

  // 1. Ensure active admin credentials are set up
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

  // Create a captain user in DB if none exists
  const captainUniqueId = "KXCAPT9999";
  let captainToken = "";
  let captainUserId = "";

  let captain = await prisma.user.findUnique({ where: { uniqueId: captainUniqueId } });
  if (captain) {
    await prisma.$transaction([
      prisma.userBadge.deleteMany({ where: { userId: captain.id } }),
      prisma.runningLog.deleteMany({ where: { userId: captain.id } }),
      prisma.workout.deleteMany({ where: { userId: captain.id } }),
      prisma.attendance.deleteMany({ where: { userId: captain.id } }),
      prisma.membership.deleteMany({ where: { userId: captain.id } }),
      prisma.user.delete({ where: { id: captain.id } }),
    ]).catch(() => {});
  }

  // Register Captain
  const regRes = await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Captain Tester",
      rollNumber: "CAPT9999",
      department: "Computer Engineering",
      academicYear: "BE",
      mobileNumber: "9876543211",
      email: "captain_tester@kuruxetra.com",
      password: "Password@123",
      confirmPassword: "Password@123",
      preferredSports: ["Kho-Kho"],
    }),
  });
  if (!regRes.ok) {
    console.error("FAILED to register captain:", await regRes.json());
  }

  captain = await prisma.user.findUnique({ where: { uniqueId: captainUniqueId } });
  if (!captain) throw new Error("Captain not found in database.");
  captainUserId = captain.id;

  // Approve Captain user and promote to CAPTAIN
  await prisma.user.update({
    where: { id: captainUserId },
    data: { status: "ACTIVE", role: "CAPTAIN" },
  });

  // Assign Captain to Kho-Kho sport
  const sport = await prisma.sport.findFirst({ where: { name: "Kho-Kho" } });
  if (!sport) throw new Error("Sport Kho-Kho not found.");
  await prisma.sport.update({
    where: { id: sport.id },
    data: { captainId: captainUserId },
  });

  // Log in as captain
  const capLogin = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uniqueId: captainUniqueId,
      password: "Password@123",
    }),
  });
  const capLoginData = await capLogin.json() as any;
  captainToken = capLoginData.token;
  console.log("SUCCESS: Captain authenticated.");

  // Create a regular athlete user
  const athleteUniqueId = "KXATHL9999";
  let athlete = await prisma.user.findUnique({ where: { uniqueId: athleteUniqueId } });
  if (athlete) {
    await prisma.$transaction([
      prisma.userBadge.deleteMany({ where: { userId: athlete.id } }),
      prisma.runningLog.deleteMany({ where: { userId: athlete.id } }),
      prisma.workout.deleteMany({ where: { userId: athlete.id } }),
      prisma.attendance.deleteMany({ where: { userId: athlete.id } }),
      prisma.membership.deleteMany({ where: { userId: athlete.id } }),
      prisma.user.delete({ where: { id: athlete.id } }),
    ]).catch(() => {});
  }

  const regAth = await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Athlete Tester",
      rollNumber: "ATHL9999",
      department: "Computer Engineering",
      academicYear: "SE",
      mobileNumber: "9876543212",
      email: "athlete_tester@kuruxetra.com",
      password: "Password@123",
      confirmPassword: "Password@123",
      preferredSports: ["Kho-Kho"],
    }),
  });
  if (!regAth.ok) {
    console.error("FAILED to register athlete:", await regAth.json());
  }

  athlete = await prisma.user.findUnique({ where: { uniqueId: athleteUniqueId } });
  if (!athlete) throw new Error("Athlete not found in database.");

  // Approve athlete user
  await prisma.user.update({
    where: { id: athlete.id },
    data: { status: "ACTIVE" },
  });

  // Approve membership for Kho-Kho
  const membership = await prisma.membership.findFirst({ where: { userId: athlete.id, sportId: sport.id } });
  if (membership) {
    await prisma.membership.update({
      where: { id: membership.id },
      data: { status: "APPROVED" },
    });
  }
  console.log("SUCCESS: Approved athlete membership on Kho-Kho.");

  // 2. Test Captain Marking Attendance
  console.log("\n--- Testing Captain Marking Athlete Attendance ---");
  const markRes = await fetch(`${BACKEND_URL}/api/attendance/mark`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${captainToken}`,
    },
    body: JSON.stringify({
      userId: athlete.id,
      sportId: sport.id,
      ground: "Practice Ground",
    }),
  });
  console.log("Mark attendance response status:", markRes.status);
  const markData = await markRes.json() as any;
  if (markRes.ok && markData.id) {
    console.log("SUCCESS: Captain marked attendance successfully!");
    console.log("Record Details: Athlete:", markData.userId, "Ground:", markData.ground, "Marked By:", markData.markedBy);
  } else {
    console.error("FAILED to mark athlete attendance:", markData);
  }

  // 3. Test Retrieving Sport Attendance History
  console.log("\n--- Testing Fetching Sport Attendance ---");
  const fetchRes = await fetch(`${BACKEND_URL}/api/attendance/sport/${sport.id}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${captainToken}` },
  });
  const fetchLogs = await fetchRes.json() as any[];
  console.log("Fetched logs length:", fetchLogs.length);
  const targetLog = fetchLogs.find((l) => l.userId === athlete!.id);
  if (targetLog) {
    console.log("SUCCESS: Log entry found in sport attendance history. Marked by Captain?", targetLog.markedBy === captainUserId);
  } else {
    console.error("FAILED to locate marked attendance log entry.");
  }

  // Cleanup
  await prisma.$transaction([
    prisma.userBadge.deleteMany({ where: { userId: athlete.id } }),
    prisma.runningLog.deleteMany({ where: { userId: athlete.id } }),
    prisma.workout.deleteMany({ where: { userId: athlete.id } }),
    prisma.attendance.deleteMany({ where: { userId: athlete.id } }),
    prisma.membership.deleteMany({ where: { userId: athlete.id } }),
    prisma.user.delete({ where: { id: athlete.id } }),

    prisma.userBadge.deleteMany({ where: { userId: captainUserId } }),
    prisma.runningLog.deleteMany({ where: { userId: captainUserId } }),
    prisma.workout.deleteMany({ where: { userId: captainUserId } }),
    prisma.attendance.deleteMany({ where: { userId: captainUserId } }),
    prisma.membership.deleteMany({ where: { userId: captainUserId } }),
    prisma.user.delete({ where: { id: captainUserId } }),
  ]).catch(() => {});
  console.log("\nCleanup done. Tests completed.");
}

runTests().catch((err) => {
  console.error("Unhandled error during test run:", err);
  process.exit(1);
});
