import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runTests() {
  const baseUrl = "http://localhost:4000";

  // Ensure KX000001 is SUPER_ADMIN in the DB for testing
  await prisma.user.update({
    where: { uniqueId: "KX000001" },
    data: { role: "SUPER_ADMIN", status: "ACTIVE" }
  });
  console.log("Ensured KX000001 is SUPER_ADMIN in the DB.");

  console.log("\n==================================================");
  console.log("TESTING ATHLETIC ID GENERATION & REGISTRATION");
  console.log("==================================================");

  const testRoll = "TEST" + Math.floor(Math.random() * 1000000);
  const testEmail = `test_${testRoll}@test.com`;

  // 1. Register a user
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Test Athlete",
      rollNumber: testRoll,
      department: "Computer Engineering",
      academicYear: "FE",
      mobileNumber: "1234567890",
      email: testEmail,
      password: "password123",
      confirmPassword: "password123",
    }),
  });

  const regData = await regRes.json();
  console.log(`Registration status: ${regRes.status}`);
  console.log(`Registration response:`, regData);
  const registeredId = regData.uniqueId;
  
  if (registeredId !== `KX${testRoll}`) {
    console.error(`FAIL: Generated ID was ${registeredId}, expected KX${testRoll}`);
  } else {
    console.log(`SUCCESS: ID Generated successfully: ${registeredId}`);
  }

  // 2. Log in as pending user
  console.log("\n==================================================");
  console.log("TESTING LOGIN FOR PENDING USER");
  console.log("==================================================");
  
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uniqueId: registeredId,
      password: "password123",
    }),
  });

  const loginData = await loginRes.json();
  console.log(`Login status: ${loginRes.status}`);
  console.log(`Login response:`, loginData);

  const token = loginData.token;
  if (!token) {
    console.error("FAIL: Could not log in pending user");
    return;
  }

  // Find the database ID of the test user
  const testUserDb = await prisma.user.findUnique({ where: { uniqueId: registeredId } });
  const testUserId = testUserDb?.id;
  console.log(`Test User database UUID: ${testUserId}`);

  // 3. Attempt restricted calls
  console.log("\n==================================================");
  console.log("TESTING ENDPOINT PROTECTION FOR PENDING USER");
  console.log("==================================================");

  const endpoints = [
    { path: "/api/attendance/checkin", method: "POST", body: { ground: "Main Ground" } },
    { path: "/api/workouts", method: "POST", body: { name: "Pushups" } },
    { path: "/api/running", method: "POST", body: { distanceKm: 5, durationMin: 25 } },
    { path: `/api/sports/some_id/join`, method: "POST", body: {} },
  ];

  for (const ep of endpoints) {
    const res = await fetch(`${baseUrl}${ep.path}`, {
      method: ep.method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(ep.body),
    });
    const body = await res.json().catch(() => null);
    console.log(`${ep.method} ${ep.path} -> Status: ${res.status}, Body:`, body);
  }

  // 4. Log in as Super Admin
  const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uniqueId: "KX000001",
      password: "SSSS@123",
    }),
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.token;

  if (!adminToken) {
    console.error("FAIL: Could not log in admin");
    return;
  }
  
  const adminUser = await prisma.user.findUnique({ where: { uniqueId: "KX000001" } });
  console.log(`Admin database UUID: ${adminUser?.id}`);

  // 5. Test cascading delete (remove-profile) - Do this BEFORE demoting the admin!
  console.log("\n==================================================");
  console.log("TESTING CASCADING DELETE (REMOVE-PROFILE)");
  console.log("==================================================");

  if (testUserId) {
    const deleteRes = await fetch(`${baseUrl}/api/admin/users/${testUserId}/remove-profile`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${adminToken}`
      }
    });
    const deleteData = await deleteRes.json();
    console.log(`Delete player profile status: ${deleteRes.status}, Body:`, deleteData);

    // Verify deleted
    const verifyUser = await prisma.user.findUnique({ where: { id: testUserId } });
    console.log(`Verification: User exists in DB? ${verifyUser ? "YES (FAIL)" : "NO (SUCCESS)"}`);
  }

  // 6. Test Last-Super-Admin protection
  console.log("\n==================================================");
  console.log("TESTING LAST-SUPER-ADMIN PROTECTION");
  console.log("==================================================");

  const activeAdmins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN", status: "ACTIVE" },
  });
  console.log(`Active SUPER_ADMINs in DB:`, activeAdmins.map(a => a.uniqueId));

  // If there are multiple active admins, demote the non-KX000001 ones first until only one is left
  for (const admin of activeAdmins) {
    if (admin.uniqueId !== "KX000001") {
      console.log(`Temporarily demoting other admin ${admin.uniqueId} to isolate KX000001...`);
      await prisma.user.update({
        where: { id: admin.id },
        data: { role: "STUDENT_ATHLETE" }
      });
    }
  }

  // Now KX000001 is the ONLY active SUPER_ADMIN
  const isolatedAdminsCount = await prisma.user.count({
    where: { role: "SUPER_ADMIN", status: "ACTIVE" }
  });
  console.log(`Verify isolated SUPER_ADMIN count: ${isolatedAdminsCount}`);

  // Try to demote the last remaining admin
  const demoteRes = await fetch(`${baseUrl}/api/admin/users/${adminUser?.id}/demote-from-ss`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${adminToken}`
    }
  });
  const demoteData = await demoteRes.json();
  console.log(`Demote last remaining admin status: ${demoteRes.status}, Body:`, demoteData);

  // Restore the other admins back to SUPER_ADMIN role
  for (const admin of activeAdmins) {
    if (admin.uniqueId !== "KX000001") {
      await prisma.user.update({
        where: { id: admin.id },
        data: { role: "SUPER_ADMIN" }
      });
    }
  }
  console.log("Restored other admin accounts.");
  console.log("\n==================================================");
}

runTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
