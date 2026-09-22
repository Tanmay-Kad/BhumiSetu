require("dotenv").config();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const app = require("../src/app");

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

let server;
let baseUrl;

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();
  return { status: response.status, body };
};

const createToken = (user) =>
  jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "10m" },
  );

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
};

let testCount = 0;
const test = async (name, fn) => {
  testCount += 1;
  try {
    await fn();
    console.log(`  ✓ [TEST ${testCount}] ${name}`);
  } catch (error) {
    console.error(`  ✗ [TEST ${testCount}] ${name}`);
    console.error(error);
    throw error;
  }
};

const runSuite = async () => {
  console.log("\n==================================================");
  console.log("BHUMISETU DASHBOARD & SUMMARY APIS TEST SUITE");
  console.log("==================================================\n");

  // 1. Start ephemeral HTTP server
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}/api/v1`;
      console.log(`Live test server running at ${baseUrl}`);
      resolve();
    });
  });

  // 2. Setup test fixtures
  console.log("Setting up fixtures...");

  const tpdDept = await prisma.department.findUnique({ where: { code: "TPD" } });
  assert(tpdDept, "TPD department must exist in database");

  const treeDept = await prisma.department.findUnique({ where: { code: "TREE" } });
  assert(treeDept, "TREE department must exist in database");

  const tpdOfficer = await prisma.user.findUnique({
    where: { email: "officer.tpd@bhumisetu.local" },
  });
  assert(tpdOfficer, "TPD Officer must exist");

  const treeOfficer = await prisma.user.upsert({
    where: { email: "officer.tree.dash@bhumisetu.local" },
    create: {
      name: "Officer Tree Dash",
      email: "officer.tree.dash@bhumisetu.local",
      passwordHash: await bcrypt.hash("Officer@123", SALT_ROUNDS),
      role: "OFFICER",
      department: "TREE",
      isActive: true,
    },
    update: {
      department: "TREE",
      role: "OFFICER",
      isActive: true,
    },
  });

  const unassignedOfficer = await prisma.user.upsert({
    where: { email: "officer.unassigned.dash@bhumisetu.local" },
    create: {
      name: "Officer Unassigned Dash",
      email: "officer.unassigned.dash@bhumisetu.local",
      passwordHash: await bcrypt.hash("Officer@123", SALT_ROUNDS),
      role: "OFFICER",
      department: null,
      isActive: true,
    },
    update: {
      department: null,
      role: "OFFICER",
      isActive: true,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin.dash@bhumisetu.local" },
    create: {
      name: "Admin User Dash",
      email: "admin.dash@bhumisetu.local",
      passwordHash: await bcrypt.hash("Admin@123", SALT_ROUNDS),
      role: "ADMIN",
      isActive: true,
    },
    update: {
      role: "ADMIN",
      isActive: true,
    },
  });

  const citizenA = await prisma.user.upsert({
    where: { email: "citizen.dash.a@bhumisetu.local" },
    create: {
      name: "Citizen Alpha Dash",
      email: "citizen.dash.a@bhumisetu.local",
      passwordHash: await bcrypt.hash("Citizen@123", SALT_ROUNDS),
      role: "CITIZEN",
      isActive: true,
    },
    update: {
      role: "CITIZEN",
      isActive: true,
    },
  });

  const citizenB = await prisma.user.upsert({
    where: { email: "citizen.dash.b@bhumisetu.local" },
    create: {
      name: "Citizen Beta Dash",
      email: "citizen.dash.b@bhumisetu.local",
      passwordHash: await bcrypt.hash("Citizen@123", SALT_ROUNDS),
      role: "CITIZEN",
      isActive: true,
    },
    update: {
      role: "CITIZEN",
      isActive: true,
    },
  });

  const parcel = await prisma.parcel.findFirst();
  assert(parcel, "At least one parcel must exist in the database");

  // Assign ownership: Citizen A owns 1 parcel, Citizen B owns 0 (initially)
  await prisma.ownership.upsert({
    where: { userId_parcelId: { userId: citizenA.id, parcelId: parcel.id } },
    create: { userId: citizenA.id, parcelId: parcel.id },
    update: {},
  });

  // Create JWT tokens
  const citizenAToken = createToken(citizenA);
  const citizenBToken = createToken(citizenB);
  const tpdOfficerToken = createToken(tpdOfficer);
  const treeOfficerToken = createToken(treeOfficer);
  const unassignedOfficerToken = createToken(unassignedOfficer);
  const adminToken = createToken(admin);

  console.log("Fixtures ready. Executing tests...\n");

  // ========================================================================
  // SECTION 1: CITIZEN DASHBOARD
  // ========================================================================
  console.log("--- SECTION 1: Citizen Dashboard Tests ---");

  await test("1. Citizen dashboard requires authentication (401)", async () => {
    const resNoAuth = await request("/dashboard/citizen");
    assert(resNoAuth.status === 401, "No token returns 401");

    const resBadToken = await request("/dashboard/citizen", {
      headers: { Authorization: "Bearer invalid.jwt.token" },
    });
    assert(resBadToken.status === 401, "Invalid token returns 401");
  });

  await test("2. Citizen dashboard requires CITIZEN role (403 for Officer & Admin)", async () => {
    const resOfficer = await request("/dashboard/citizen", {
      headers: { Authorization: `Bearer ${tpdOfficerToken}` },
    });
    assert(resOfficer.status === 403, "Officer cannot access citizen dashboard");

    const resAdmin = await request("/dashboard/citizen", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resAdmin.status === 403, "Admin cannot access citizen dashboard");
  });

  // Seed known applications for Citizen A
  // 1. Draft application
  const draftRes = await request("/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${citizenAToken}` },
    body: JSON.stringify({
      parcelId: parcel.id,
      type: "BUILDING_PERMISSION",
      description: "Draft application for citizen A",
    }),
  });
  assert(draftRes.status === 201, "Draft application created");
  const draftApp = draftRes.body.data;

  // 2. Submitted application
  const subRes = await request("/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${citizenAToken}` },
    body: JSON.stringify({
      parcelId: parcel.id,
      type: "BUILDING_PERMISSION",
      description: "Submitted application for citizen A",
    }),
  });
  const subApp = subRes.body.data;
  await request(`/applications/${subApp.id}/submit`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${citizenAToken}` },
  });

  // 3. Under review application
  const revRes = await request("/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${citizenAToken}` },
    body: JSON.stringify({
      parcelId: parcel.id,
      type: "BUILDING_PERMISSION",
      description: "Under review application for citizen A",
    }),
  });
  const revApp = revRes.body.data;
  await request(`/applications/${revApp.id}/submit`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${citizenAToken}` },
  });
  await request(`/officer/applications/${revApp.id}/review`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${tpdOfficerToken}` },
  });

  // 4. Approved application
  const appRes = await request("/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${citizenAToken}` },
    body: JSON.stringify({
      parcelId: parcel.id,
      type: "BUILDING_PERMISSION",
      description: "Approved application for citizen A",
    }),
  });
  const approvedApp = appRes.body.data;
  await request(`/applications/${approvedApp.id}/submit`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${citizenAToken}` },
  });
  await request(`/officer/applications/${approvedApp.id}/review`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${tpdOfficerToken}` },
  });
  await request(`/officer/applications/${approvedApp.id}/decision`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tpdOfficerToken}` },
    body: JSON.stringify({ decision: "APPROVED", remarks: "Approved" }),
  });

  // 5. Approved with conditions application
  const condRes = await request("/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${citizenAToken}` },
    body: JSON.stringify({
      parcelId: parcel.id,
      type: "BUILDING_PERMISSION",
      description: "Approved with conditions application for citizen A",
    }),
  });
  const condApp = condRes.body.data;
  await request(`/applications/${condApp.id}/submit`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${citizenAToken}` },
  });
  await request(`/officer/applications/${condApp.id}/review`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${tpdOfficerToken}` },
  });
  const condDecRes = await request(`/officer/applications/${condApp.id}/decision`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tpdOfficerToken}` },
    body: JSON.stringify({ decision: "APPROVED_WITH_CONDITIONS", decisionRemarks: "Conditions apply" }),
  });
  assert(condDecRes.status === 200, "Approved with conditions decision recorded");

  // Seed an application for Citizen B to verify isolation
  await prisma.ownership.upsert({
    where: { userId_parcelId: { userId: citizenB.id, parcelId: parcel.id } },
    create: { userId: citizenB.id, parcelId: parcel.id },
    update: {},
  });
  const bRes = await request("/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${citizenBToken}` },
    body: JSON.stringify({
      parcelId: parcel.id,
      type: "TREE_CUTTING",
      description: "Citizen B application",
    }),
  });
  assert(bRes.status === 201, "Citizen B application created");

  await test("3. Citizen counts only include that citizen's applications (strict user scoping)", async () => {
    const resA = await request("/dashboard/citizen", {
      headers: { Authorization: `Bearer ${citizenAToken}` },
    });
    assert(resA.status === 200, "Citizen A dashboard returns 200");
    const dataA = resA.body.data;

    const resB = await request("/dashboard/citizen", {
      headers: { Authorization: `Bearer ${citizenBToken}` },
    });
    assert(resB.status === 200, "Citizen B dashboard returns 200");
    const dataB = resB.body.data;

    assert(dataA.summary.totalApplications >= 5, "Citizen A has at least 5 applications");
    assert(dataB.summary.totalApplications >= 1, "Citizen B has at least 1 application");
    assert(dataA.summary.totalApplications !== dataB.summary.totalApplications, "Citizen counts are isolated");
  });

  await test("4. Application status counts are correct in Citizen summary", async () => {
    const res = await request("/dashboard/citizen", {
      headers: { Authorization: `Bearer ${citizenAToken}` },
    });
    const s = res.body.data.summary;
    assert(typeof s.totalApplications === "number", "totalApplications is number");
    assert(typeof s.draftApplications === "number" && s.draftApplications >= 1, "draftApplications >= 1");
    assert(typeof s.submittedApplications === "number" && s.submittedApplications >= 1, "submittedApplications >= 1");
    assert(typeof s.underReviewApplications === "number" && s.underReviewApplications >= 1, "underReviewApplications >= 1");
    assert(typeof s.additionalInfoRequired === "number", "additionalInfoRequired is number");
    assert(typeof s.rejectedApplications === "number", "rejectedApplications is number");
    assert(typeof s.completedApplications === "number", "completedApplications is number");
    assert(typeof s.cancelledApplications === "number", "cancelledApplications is number");
  });

  await test("5 & 6. Approved count handles both APPROVED and APPROVED_WITH_CONDITIONS", async () => {
    const res = await request("/dashboard/citizen", {
      headers: { Authorization: `Bearer ${citizenAToken}` },
    });
    const s = res.body.data.summary;
    // We created 1 APPROVED and 1 APPROVED_WITH_CONDITIONS for Citizen A
    assert(s.approvedApplications >= 2, "approvedApplications includes both APPROVED and APPROVED_WITH_CONDITIONS");
  });

  await test("7. Owned parcel count is correct based on Ownership table", async () => {
    const resA = await request("/dashboard/citizen", {
      headers: { Authorization: `Bearer ${citizenAToken}` },
    });
    const actualCountA = await prisma.ownership.count({ where: { userId: citizenA.id } });
    assert(resA.body.data.parcels.ownedCount === actualCountA, "ownedCount matches DB ownerships");
  });

  await test("8. Unread notification count is correct based on Notification table", async () => {
    const resA = await request("/dashboard/citizen", {
      headers: { Authorization: `Bearer ${citizenAToken}` },
    });
    const actualUnreadA = await prisma.notification.count({ where: { userId: citizenA.id, isRead: false } });
    assert(resA.body.data.notifications.unreadCount === actualUnreadA, "unreadCount matches DB unread notifications");
  });

  await test("9. Recent applications belong only to the authenticated citizen", async () => {
    const resA = await request("/dashboard/citizen", {
      headers: { Authorization: `Bearer ${citizenAToken}` },
    });
    const recentsA = resA.body.data.recentApplications;
    assert(Array.isArray(recentsA), "recentApplications is array");
    assert(recentsA.length <= 5, "recentApplications capped at 5");

    // Check none belong to Citizen B
    for (const app of recentsA) {
      const dbApp = await prisma.application.findUnique({ where: { id: app.id } });
      assert(dbApp.citizenId === citizenA.id, "Recent app must belong to citizen A");
    }
  });

  await test("10. Recent applications are newest first", async () => {
    const resA = await request("/dashboard/citizen", {
      headers: { Authorization: `Bearer ${citizenAToken}` },
    });
    const recents = resA.body.data.recentApplications;
    for (let i = 0; i < recents.length - 1; i += 1) {
      const current = new Date(recents[i].createdAt).getTime();
      const next = new Date(recents[i + 1].createdAt).getTime();
      assert(current >= next, "Applications must be in descending order of createdAt");
    }
  });

  // ========================================================================
  // SECTION 2: OFFICER DASHBOARD
  // ========================================================================
  console.log("\n--- SECTION 2: Officer Dashboard Tests ---");

  await test("11. Officer dashboard requires authentication (401)", async () => {
    const res = await request("/dashboard/officer");
    assert(res.status === 401, "No token returns 401");
  });

  await test("12. Officer dashboard requires OFFICER or ADMIN role (403 for Citizen)", async () => {
    const resCitizen = await request("/dashboard/officer", {
      headers: { Authorization: `Bearer ${citizenAToken}` },
    });
    assert(resCitizen.status === 403, "Citizen cannot access officer dashboard");
  });

  await test("13. Officer only sees own department statistics", async () => {
    const resTpd = await request("/dashboard/officer", {
      headers: { Authorization: `Bearer ${tpdOfficerToken}` },
    });
    assert(resTpd.status === 200, "TPD officer dashboard returns 200");
    assert(resTpd.body.data.department.code === "TPD", "Department is TPD");

    const resTree = await request("/dashboard/officer", {
      headers: { Authorization: `Bearer ${treeOfficerToken}` },
    });
    assert(resTree.status === 200, "TREE officer dashboard returns 200");
    assert(resTree.body.data.department.code === "TREE", "Department is TREE");
  });

  await test("14. Department counts are correct and isolated", async () => {
    const resTpd = await request("/dashboard/officer", {
      headers: { Authorization: `Bearer ${tpdOfficerToken}` },
    });
    const tpdCountInDb = await prisma.application.count({ where: { departmentId: tpdDept.id } });
    assert(resTpd.body.data.summary.totalApplications === tpdCountInDb, "TPD dashboard count matches DB count exactly");

    const resTree = await request("/dashboard/officer", {
      headers: { Authorization: `Bearer ${treeOfficerToken}` },
    });
    const treeCountInDb = await prisma.application.count({ where: { departmentId: treeDept.id } });
    assert(resTree.body.data.summary.totalApplications === treeCountInDb, "TREE dashboard count matches DB count exactly");
  });

  await test("15. Pending and action-required workload counts match existing inbox semantics", async () => {
    const res = await request("/dashboard/officer", {
      headers: { Authorization: `Bearer ${tpdOfficerToken}` },
    });
    const data = res.body.data;
    const w = data.workload;
    const s = data.summary;

    assert(typeof w.pendingReview === "number", "pendingReview is number");
    assert(typeof w.actionRequired === "number", "actionRequired is number");
    assert(typeof w.inReview === "number", "inReview is number");
    assert(typeof w.awaitingCitizen === "number", "awaitingCitizen is number");

    // pendingReview = SUBMITTED + RESUBMITTED
    assert(w.pendingReview === s.submitted + s.resubmitted, "pendingReview equals submitted + resubmitted");
    // actionRequired = SUBMITTED + RESUBMITTED + UNDER_REVIEW
    assert(w.actionRequired === s.submitted + s.resubmitted + s.underReview, "actionRequired equals pendingReview + inReview");
  });

  await test("16. Officer recent applications are limited and newest first", async () => {
    const res = await request("/dashboard/officer", {
      headers: { Authorization: `Bearer ${tpdOfficerToken}` },
    });
    const recents = res.body.data.recentApplications;
    assert(Array.isArray(recents), "recentApplications is array");
    assert(recents.length <= 10, "recentApplications capped at 10");

    for (let i = 0; i < recents.length - 1; i += 1) {
      const current = new Date(recents[i].createdAt).getTime();
      const next = new Date(recents[i + 1].createdAt).getTime();
      assert(current >= next, "Officer recent apps are in descending order");
    }

    // All belong to TPD
    for (const app of recents) {
      assert(app.department?.code === "TPD" || app.department?.id === tpdDept.id, "App must belong to TPD");
    }
  });

  await test("17. Officer cannot override department through query parameters (400)", async () => {
    const res = await request(`/dashboard/officer?departmentId=${treeDept.id}`, {
      headers: { Authorization: `Bearer ${tpdOfficerToken}` },
    });
    assert(res.status === 400, "Officer passing departmentId is rejected with 400");
    assert(res.body.message.includes("only available to administrators"), "Correct error message");
  });

  await test("17b. Officer without an active department receives 403", async () => {
    const res = await request("/dashboard/officer", {
      headers: { Authorization: `Bearer ${unassignedOfficerToken}` },
    });
    assert(res.status === 403, "Unassigned officer receives 403");
  });

  // ========================================================================
  // SECTION 3: ADMIN DASHBOARD
  // ========================================================================
  console.log("\n--- SECTION 3: Admin Dashboard Tests ---");

  await test("18. Admin dashboard access works according to RBAC", async () => {
    const res = await request("/dashboard/officer", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res.status === 200, "Admin can access /dashboard/officer");
  });

  await test("19. Admin/system-wide counts are correct", async () => {
    const res = await request("/dashboard/officer", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const totalInDb = await prisma.application.count();
    assert(res.body.data.summary.totalApplications === totalInDb, "Admin summary total matches database total");
  });

  await test("20. Admin dashboard supports departmentId filtering", async () => {
    const resTpd = await request(`/dashboard/officer?departmentId=${tpdDept.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resTpd.status === 200, "Admin filtered by TPD returns 200");
    const tpdCount = await prisma.application.count({ where: { departmentId: tpdDept.id } });
    assert(resTpd.body.data.summary.totalApplications === tpdCount, "Admin filtered count matches TPD count");
    assert(resTpd.body.data.department.code === "TPD", "Department info returned for filtered department");

    // Invalid UUID
    const resInvalid = await request("/dashboard/officer?departmentId=not-a-uuid", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resInvalid.status === 400, "Invalid department UUID returns 400");

    // Non-existent UUID
    const resNotFound = await request("/dashboard/officer?departmentId=a0000000-0000-4000-8000-000000000000", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resNotFound.status === 404, "Non-existent department UUID returns 404");
  });

  await test("21. Admin dashboard provides department breakdown", async () => {
    const res = await request("/dashboard/officer", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const depts = res.body.data.departments;
    assert(Array.isArray(depts), "departments breakdown is array");
    assert(depts.length >= 2, "Includes at least TPD and TREE departments");

    const tpdEntry = depts.find((d) => d.departmentCode === "TPD");
    assert(tpdEntry, "TPD present in admin breakdown");
    assert(typeof tpdEntry.applicationCount === "number", "applicationCount is number");
    assert(typeof tpdEntry.pendingCount === "number", "pendingCount is number");
  });

  // ========================================================================
  // SECTION 4: SECURITY & HYGIENE
  // ========================================================================
  console.log("\n--- SECTION 4: Security & Hygiene Tests ---");

  await test("22. PasswordHash or sensitive auth fields are never returned", async () => {
    const resCitizen = await request("/dashboard/citizen", {
      headers: { Authorization: `Bearer ${citizenAToken}` },
    });
    const jsonStrCitizen = JSON.stringify(resCitizen.body);
    assert(!jsonStrCitizen.includes("passwordHash"), "Citizen dashboard does not leak passwordHash");

    const resOfficer = await request("/dashboard/officer", {
      headers: { Authorization: `Bearer ${tpdOfficerToken}` },
    });
    const jsonStrOfficer = JSON.stringify(resOfficer.body);
    assert(!jsonStrOfficer.includes("passwordHash"), "Officer dashboard does not leak passwordHash");
  });

  await test("23. Dashboard does not accept citizenId from client to switch user context", async () => {
    // Attempting to inject query parameter citizenId or body does not affect response
    const res = await request(`/dashboard/citizen?citizenId=${citizenB.id}`, {
      headers: { Authorization: `Bearer ${citizenAToken}` },
    });
    assert(res.status === 200, "Request succeeds");
    // Verifying it is still Citizen A's data
    const recents = res.body.data.recentApplications;
    for (const app of recents) {
      const dbApp = await prisma.application.findUnique({ where: { id: app.id } });
      assert(dbApp.citizenId === citizenA.id, "Data remains strictly bound to JWT user");
    }
  });

  console.log("\n==================================================");
  console.log("ALL 23 DASHBOARD TESTS PASSED!");
  console.log("==================================================\n");

  await prisma.$disconnect();
  await new Promise((resolve) => server.close(resolve));
};

runSuite().catch(async (error) => {
  console.error("Test Suite Failed with error:", error);
  if (server) {
    server.close();
  }
  await prisma.$disconnect();
  process.exit(1);
});
