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
  console.log("BHUMISETU APPLICATION AUDIT HISTORY TEST SUITE");
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

  // Departments
  const tpdDept = await prisma.department.findUnique({ where: { code: "TPD" } });
  const treeDept = await prisma.department.findUnique({ where: { code: "TREE" } });
  assert(tpdDept && treeDept, "TPD and TREE departments must exist in the database");

  // Existing TPD Officer
  const tpdOfficer = await prisma.user.findUnique({
    where: { email: "officer.tpd@bhumisetu.local" },
  });
  assert(tpdOfficer, "TPD Officer must exist");

  // TREE Officer
  const treeOfficer = await prisma.user.upsert({
    where: { email: "officer.tree.test@bhumisetu.local" },
    create: {
      name: "Tree Test Officer",
      email: "officer.tree.test@bhumisetu.local",
      passwordHash: await bcrypt.hash("Officer@123", SALT_ROUNDS),
      role: "OFFICER",
      department: "TREE",
      isActive: true,
    },
    update: {
      name: "Tree Test Officer",
      role: "OFFICER",
      department: "TREE",
      isActive: true,
    },
  });

  // Admin
  const adminUser = await prisma.user.upsert({
    where: { email: "admin.history.test@bhumisetu.local" },
    create: {
      name: "Admin History Tester",
      email: "admin.history.test@bhumisetu.local",
      passwordHash: await bcrypt.hash("Admin@123", SALT_ROUNDS),
      role: "ADMIN",
      isActive: true,
    },
    update: {
      name: "Admin History Tester",
      role: "ADMIN",
      isActive: true,
    },
  });

  // Citizen A
  const citizenA = await prisma.user.upsert({
    where: { email: "citizen.history.a@bhumisetu.local" },
    create: {
      name: "Citizen Alpha",
      email: "citizen.history.a@bhumisetu.local",
      passwordHash: await bcrypt.hash("Citizen@123", SALT_ROUNDS),
      role: "CITIZEN",
      isActive: true,
    },
    update: {
      name: "Citizen Alpha",
      role: "CITIZEN",
      isActive: true,
    },
  });

  // Citizen B
  const citizenB = await prisma.user.upsert({
    where: { email: "citizen.history.b@bhumisetu.local" },
    create: {
      name: "Citizen Beta",
      email: "citizen.history.b@bhumisetu.local",
      passwordHash: await bcrypt.hash("Citizen@123", SALT_ROUNDS),
      role: "CITIZEN",
      isActive: true,
    },
    update: {
      name: "Citizen Beta",
      role: "CITIZEN",
      isActive: true,
    },
  });

  // Parcels
  const parcel = await prisma.parcel.findFirst();
  assert(parcel, "At least one parcel must exist in the database");

  // Ensure ownership for Citizen A and Citizen B
  await prisma.ownership.upsert({
    where: { userId_parcelId: { userId: citizenA.id, parcelId: parcel.id } },
    create: { userId: citizenA.id, parcelId: parcel.id },
    update: {},
  });

  await prisma.ownership.upsert({
    where: { userId_parcelId: { userId: citizenB.id, parcelId: parcel.id } },
    create: { userId: citizenB.id, parcelId: parcel.id },
    update: {},
  });

  const tokenCitizenA = createToken(citizenA);
  const tokenCitizenB = createToken(citizenB);
  const tokenTpdOfficer = createToken(tpdOfficer);
  const tokenTreeOfficer = createToken(treeOfficer);
  const tokenAdmin = createToken(adminUser);

  const authHeader = (token) => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  });

  console.log("Fixtures ready. Executing tests...\n");

  // ========================================================================
  // SUITE 1: FULL LIFECYCLE AUDIT HISTORY (DRAFT -> APPROVED)
  // ========================================================================
  console.log("--- SUITE 1: Full Lifecycle (7 Transitions) ---");

  let lifecycleAppId;

  await test("1. Citizen creates draft application -> APPLICATION_CREATED", async () => {
    const res = await request("/applications", {
      method: "POST",
      headers: authHeader(tokenCitizenA),
      body: JSON.stringify({
        parcelId: parcel.id,
        type: "BUILDING_PERMISSION",
        description: "Application for residential house construction",
      }),
    });

    assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.status === "success", "Response status should be success");
    assert(res.body.data.status === "DRAFT", "Status should be DRAFT");
    assert(res.body.data.citizenId === citizenA.id, "Citizen ID should match");
    lifecycleAppId = res.body.data.id;
  });

  await test("2. Citizen submits draft application -> APPLICATION_SUBMITTED", async () => {
    const res = await request(`/applications/${lifecycleAppId}/submit`, {
      method: "PATCH",
      headers: authHeader(tokenCitizenA),
    });

    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.data.status === "SUBMITTED", "Status should be SUBMITTED");
    assert(res.body.data.departmentId === tpdDept.id, "Should be routed to TPD department");
  });

  await test("3. TPD Officer starts review -> REVIEW_STARTED", async () => {
    const res = await request(`/officer/applications/${lifecycleAppId}/review`, {
      method: "PATCH",
      headers: authHeader(tokenTpdOfficer),
      body: JSON.stringify({
        reviewRemarks: "Initial assessment of building permission application",
      }),
    });

    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.data.status === "UNDER_REVIEW", "Status should be UNDER_REVIEW");
    assert(res.body.data.assignedOfficer.id === tpdOfficer.id, "Assigned officer should match");
  });

  await test("4. Officer requests additional info -> ADDITIONAL_INFO_REQUESTED", async () => {
    const res = await request(`/officer/applications/${lifecycleAppId}/decision`, {
      method: "PATCH",
      headers: authHeader(tokenTpdOfficer),
      body: JSON.stringify({
        decision: "ADDITIONAL_INFO_REQUIRED",
        decisionRemarks: "Please provide soil test report and structural drawings",
      }),
    });

    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.data.status === "ADDITIONAL_INFO_REQUIRED", "Status should be ADDITIONAL_INFO_REQUIRED");
  });

  await test("5. Citizen resubmits with response -> APPLICATION_RESUBMITTED", async () => {
    const res = await request(`/applications/${lifecycleAppId}/resubmit`, {
      method: "PATCH",
      headers: authHeader(tokenCitizenA),
      body: JSON.stringify({
        response: "Uploaded soil test report and certified structural drawings",
      }),
    });

    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.data.status === "RESUBMITTED", "Status should be RESUBMITTED");
    assert(res.body.data.citizenResponse === "Uploaded soil test report and certified structural drawings", "citizenResponse matched");
  });

  await test("6. Officer resumes review -> REVIEW_STARTED (from RESUBMITTED)", async () => {
    const res = await request(`/officer/applications/${lifecycleAppId}/review`, {
      method: "PATCH",
      headers: authHeader(tokenTpdOfficer),
      body: JSON.stringify({
        reviewRemarks: "Reviewing updated drawings and soil test report",
      }),
    });

    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.data.status === "UNDER_REVIEW", "Status should be UNDER_REVIEW");
  });

  await test("7. Officer approves application -> APPLICATION_APPROVED", async () => {
    const res = await request(`/officer/applications/${lifecycleAppId}/decision`, {
      method: "PATCH",
      headers: authHeader(tokenTpdOfficer),
      body: JSON.stringify({
        decision: "APPROVED",
        decisionRemarks: "All structural requirements satisfied. Permission granted.",
      }),
    });

    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.data.status === "APPROVED", "Status should be APPROVED");
  });

  await test("8. GET /applications/:id/history returns complete 7-step history in chronological order", async () => {
    const res = await request(`/applications/${lifecycleAppId}/history`, {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });

    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    const history = res.body.data;
    assert(Array.isArray(history), "History should be an array");
    assert(history.length === 7, `Expected exactly 7 history events, got ${history.length}`);

    // Verify chronological order
    for (let i = 0; i < history.length - 1; i += 1) {
      const current = new Date(history[i].createdAt).getTime();
      const next = new Date(history[i + 1].createdAt).getTime();
      assert(current <= next, `History events must be sorted chronologically asc (${i} <= ${i + 1})`);
    }

    // Event 1: APPLICATION_CREATED
    assert(history[0].action === "APPLICATION_CREATED", "Event 1 action");
    assert(history[0].fromStatus === null, "Event 1 fromStatus");
    assert(history[0].toStatus === "DRAFT", "Event 1 toStatus");
    assert(history[0].actor.id === citizenA.id, "Event 1 actor id");
    assert(history[0].actor.role === "CITIZEN", "Event 1 actor role");
    assert(history[0].actor.name === citizenA.name, "Event 1 actor name");
    assert(history[0].remarks === null, "Event 1 remarks");

    // Event 2: APPLICATION_SUBMITTED
    assert(history[1].action === "APPLICATION_SUBMITTED", "Event 2 action");
    assert(history[1].fromStatus === "DRAFT", "Event 2 fromStatus");
    assert(history[1].toStatus === "SUBMITTED", "Event 2 toStatus");
    assert(history[1].actor.id === citizenA.id, "Event 2 actor id");
    assert(history[1].remarks === null, "Event 2 remarks");

    // Event 3: REVIEW_STARTED
    assert(history[2].action === "REVIEW_STARTED", "Event 3 action");
    assert(history[2].fromStatus === "SUBMITTED", "Event 3 fromStatus");
    assert(history[2].toStatus === "UNDER_REVIEW", "Event 3 toStatus");
    assert(history[2].actor.id === tpdOfficer.id, "Event 3 actor id");
    assert(history[2].actor.role === "OFFICER", "Event 3 actor role");
    assert(history[2].remarks === "Initial assessment of building permission application", "Event 3 remarks");

    // Event 4: ADDITIONAL_INFO_REQUESTED
    assert(history[3].action === "ADDITIONAL_INFO_REQUESTED", "Event 4 action");
    assert(history[3].fromStatus === "UNDER_REVIEW", "Event 4 fromStatus");
    assert(history[3].toStatus === "ADDITIONAL_INFO_REQUIRED", "Event 4 toStatus");
    assert(history[3].actor.id === tpdOfficer.id, "Event 4 actor id");
    assert(history[3].remarks === "Please provide soil test report and structural drawings", "Event 4 remarks");

    // Event 5: APPLICATION_RESUBMITTED
    assert(history[4].action === "APPLICATION_RESUBMITTED", "Event 5 action");
    assert(history[4].fromStatus === "ADDITIONAL_INFO_REQUIRED", "Event 5 fromStatus");
    assert(history[4].toStatus === "RESUBMITTED", "Event 5 toStatus");
    assert(history[4].actor.id === citizenA.id, "Event 5 actor id");
    assert(history[4].remarks === "Uploaded soil test report and certified structural drawings", "Event 5 remarks");

    // Event 6: REVIEW_STARTED (from RESUBMITTED)
    assert(history[5].action === "REVIEW_STARTED", "Event 6 action");
    assert(history[5].fromStatus === "RESUBMITTED", "Event 6 fromStatus");
    assert(history[5].toStatus === "UNDER_REVIEW", "Event 6 toStatus");
    assert(history[5].actor.id === tpdOfficer.id, "Event 6 actor id");
    assert(history[5].remarks === "Reviewing updated drawings and soil test report", "Event 6 remarks");

    // Event 7: APPLICATION_APPROVED
    assert(history[6].action === "APPLICATION_APPROVED", "Event 7 action");
    assert(history[6].fromStatus === "UNDER_REVIEW", "Event 7 fromStatus");
    assert(history[6].toStatus === "APPROVED", "Event 7 toStatus");
    assert(history[6].actor.id === tpdOfficer.id, "Event 7 actor id");
    assert(history[6].remarks === "All structural requirements satisfied. Permission granted.", "Event 7 remarks");

    // Verify sanitized actor: no passwordHash, email, phone exposed in history
    for (const item of history) {
      assert(item.actor !== undefined, "Actor must be present");
      assert(item.actor.passwordHash === undefined, "passwordHash must never be exposed");
      assert(item.actor.phone === undefined, "phone should not be exposed");
    }
  });

  // ========================================================================
  // SUITE 2: VARIATION DECISION & CANCELLATION TESTS
  // ========================================================================
  console.log("\n--- SUITE 2: Decision Variations & Cancellations ---");

  await test("9. Decision APPROVED_WITH_CONDITIONS generates correct history", async () => {
    // Create & submit
    const appRes = await request("/applications", {
      method: "POST",
      headers: authHeader(tokenCitizenA),
      body: JSON.stringify({
        parcelId: parcel.id,
        type: "BUILDING_PERMISSION",
        description: "Conditions test",
      }),
    });
    const appId = appRes.body.data.id;
    await request(`/applications/${appId}/submit`, { method: "PATCH", headers: authHeader(tokenCitizenA) });
    await request(`/officer/applications/${appId}/review`, { method: "PATCH", headers: authHeader(tokenTpdOfficer) });

    const decRes = await request(`/officer/applications/${appId}/decision`, {
      method: "PATCH",
      headers: authHeader(tokenTpdOfficer),
      body: JSON.stringify({
        decision: "APPROVED_WITH_CONDITIONS",
        decisionRemarks: "Subject to mandatory rooftop solar installation",
      }),
    });
    assert(decRes.status === 200, `Expected 200, got ${decRes.status}`);
    assert(decRes.body.data.status === "APPROVED_WITH_CONDITIONS", "Status");

    const histRes = await request(`/applications/${appId}/history`, {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    const lastEvent = histRes.body.data.at(-1);
    assert(lastEvent.action === "APPLICATION_APPROVED_WITH_CONDITIONS", "Action");
    assert(lastEvent.fromStatus === "UNDER_REVIEW", "fromStatus");
    assert(lastEvent.toStatus === "APPROVED_WITH_CONDITIONS", "toStatus");
    assert(lastEvent.remarks === "Subject to mandatory rooftop solar installation", "remarks");
  });

  await test("10. Decision REJECTED generates correct history", async () => {
    // Create & submit
    const appRes = await request("/applications", {
      method: "POST",
      headers: authHeader(tokenCitizenA),
      body: JSON.stringify({
        parcelId: parcel.id,
        type: "BUILDING_PERMISSION",
        description: "Rejection test",
      }),
    });
    const appId = appRes.body.data.id;
    await request(`/applications/${appId}/submit`, { method: "PATCH", headers: authHeader(tokenCitizenA) });
    await request(`/officer/applications/${appId}/review`, { method: "PATCH", headers: authHeader(tokenTpdOfficer) });

    const decRes = await request(`/officer/applications/${appId}/decision`, {
      method: "PATCH",
      headers: authHeader(tokenTpdOfficer),
      body: JSON.stringify({
        decision: "REJECTED",
        decisionRemarks: "Proposed structure encroaches upon road setback limit",
      }),
    });
    assert(decRes.status === 200, `Expected 200, got ${decRes.status}`);
    assert(decRes.body.data.status === "REJECTED", "Status");

    const histRes = await request(`/applications/${appId}/history`, {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    const lastEvent = histRes.body.data.at(-1);
    assert(lastEvent.action === "APPLICATION_REJECTED", "Action");
    assert(lastEvent.fromStatus === "UNDER_REVIEW", "fromStatus");
    assert(lastEvent.toStatus === "REJECTED", "toStatus");
    assert(lastEvent.remarks === "Proposed structure encroaches upon road setback limit", "remarks");
  });

  await test("11. Cancel DRAFT application -> APPLICATION_CANCELLED (fromStatus: DRAFT)", async () => {
    const appRes = await request("/applications", {
      method: "POST",
      headers: authHeader(tokenCitizenA),
      body: JSON.stringify({
        parcelId: parcel.id,
        type: "BUILDING_PERMISSION",
        description: "Cancel draft test",
      }),
    });
    const appId = appRes.body.data.id;

    const cancelRes = await request(`/applications/${appId}/cancel`, {
      method: "PATCH",
      headers: authHeader(tokenCitizenA),
    });
    assert(cancelRes.status === 200, `Expected 200, got ${cancelRes.status}`);
    assert(cancelRes.body.data.status === "CANCELLED", "Status should be CANCELLED");

    const histRes = await request(`/applications/${appId}/history`, {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(histRes.body.data.length === 2, "Expected 2 history events");
    assert(histRes.body.data[1].action === "APPLICATION_CANCELLED", "Action");
    assert(histRes.body.data[1].fromStatus === "DRAFT", "fromStatus must be DRAFT");
    assert(histRes.body.data[1].toStatus === "CANCELLED", "toStatus must be CANCELLED");
    assert(histRes.body.data[1].actor.id === citizenA.id, "Actor");
  });

  await test("12. Cancel SUBMITTED application -> APPLICATION_CANCELLED (fromStatus: SUBMITTED)", async () => {
    const appRes = await request("/applications", {
      method: "POST",
      headers: authHeader(tokenCitizenA),
      body: JSON.stringify({
        parcelId: parcel.id,
        type: "BUILDING_PERMISSION",
        description: "Cancel submitted test",
      }),
    });
    const appId = appRes.body.data.id;
    await request(`/applications/${appId}/submit`, { method: "PATCH", headers: authHeader(tokenCitizenA) });

    const cancelRes = await request(`/applications/${appId}/cancel`, {
      method: "PATCH",
      headers: authHeader(tokenCitizenA),
    });
    assert(cancelRes.status === 200, `Expected 200, got ${cancelRes.status}`);
    assert(cancelRes.body.data.status === "CANCELLED", "Status should be CANCELLED");

    const histRes = await request(`/applications/${appId}/history`, {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(histRes.body.data.length === 3, "Expected 3 history events");
    assert(histRes.body.data[2].action === "APPLICATION_CANCELLED", "Action");
    assert(histRes.body.data[2].fromStatus === "SUBMITTED", "fromStatus must be SUBMITTED");
    assert(histRes.body.data[2].toStatus === "CANCELLED", "toStatus must be CANCELLED");
  });

  // ========================================================================
  // SUITE 3: SECURITY & AUTHORIZATION TESTS
  // ========================================================================
  console.log("\n--- SUITE 3: Security & Authorization (RBAC) ---");

  await test("13. Missing JWT token on GET history -> 401 Unauthorized", async () => {
    const res = await request(`/applications/${lifecycleAppId}/history`, {
      method: "GET",
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test("14. Invalid JWT token on GET history -> 401 Unauthorized", async () => {
    const res = await request(`/applications/${lifecycleAppId}/history`, {
      method: "GET",
      headers: { Authorization: "Bearer invalid.token.value" },
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test("15. Citizen B accessing Citizen A's application history -> 403 Forbidden", async () => {
    const res = await request(`/applications/${lifecycleAppId}/history`, {
      method: "GET",
      headers: authHeader(tokenCitizenB),
    });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    assert(res.body.message.includes("not authorized"), "Forbidden message");
  });

  await test("16. Citizen A accessing own application history -> 200 OK", async () => {
    const res = await request(`/applications/${lifecycleAppId}/history`, {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.status === "success", "Status success");
  });

  await test("17. TPD Officer accessing TPD application history -> 200 OK", async () => {
    const res = await request(`/applications/${lifecycleAppId}/history`, {
      method: "GET",
      headers: authHeader(tokenTpdOfficer),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.data), "History array");
  });

  // Create a TREE department application to test department isolation
  const treeAppRes = await request("/applications", {
    method: "POST",
    headers: authHeader(tokenCitizenA),
    body: JSON.stringify({
      parcelId: parcel.id,
      type: "TREE_CUTTING",
      description: "Permission to cut dried neem tree",
    }),
  });
  const treeAppId = treeAppRes.body.data.id;
  await request(`/applications/${treeAppId}/submit`, { method: "PATCH", headers: authHeader(tokenCitizenA) });

  await test("18. TPD Officer accessing TREE application history -> 403 Forbidden", async () => {
    const res = await request(`/applications/${treeAppId}/history`, {
      method: "GET",
      headers: authHeader(tokenTpdOfficer),
    });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    assert(res.body.message.includes("another department"), "Department isolation error message");
  });

  await test("19. TREE Officer accessing TREE application history -> 200 OK", async () => {
    const res = await request(`/applications/${treeAppId}/history`, {
      method: "GET",
      headers: authHeader(tokenTreeOfficer),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test("20. Admin accessing Citizen A's application history -> 200 OK", async () => {
    const res = await request(`/applications/${lifecycleAppId}/history`, {
      method: "GET",
      headers: authHeader(tokenAdmin),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test("21. Admin accessing TREE application history -> 200 OK", async () => {
    const res = await request(`/applications/${treeAppId}/history`, {
      method: "GET",
      headers: authHeader(tokenAdmin),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test("22a. Invalid application UUID on GET history -> 400 Bad Request", async () => {
    const res = await request("/applications/invalid-application-id/history", {
      method: "GET",
      headers: authHeader(tokenAdmin),
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await test("22b. Non-existent application ID on GET history -> 404 Not Found", async () => {
    const res = await request("/applications/a0000000-0000-4000-8000-000000000000/history", {
      method: "GET",
      headers: authHeader(tokenAdmin),
    });
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  await test("23. Client payload cannot manipulate actorId, action, fromStatus, toStatus", async () => {
    // Create new application with attempted payload overrides
    const maliciousBody = {
      parcelId: parcel.id,
      type: "BUILDING_PERMISSION",
      description: "Tamper test",
      status: "APPROVED",
      actorId: adminUser.id,
      action: "APPLICATION_APPROVED",
      fromStatus: "UNDER_REVIEW",
      toStatus: "APPROVED",
    };

    const res = await request("/applications", {
      method: "POST",
      headers: authHeader(tokenCitizenB),
      body: JSON.stringify(maliciousBody),
    });

    assert(res.status === 201, "Should create application");
    assert(res.body.data.status === "DRAFT", "Status must be DRAFT, ignoring client status field");

    const tamperAppId = res.body.data.id;
    const histRes = await request(`/applications/${tamperAppId}/history`, {
      method: "GET",
      headers: authHeader(tokenCitizenB),
    });

    const event = histRes.body.data[0];
    assert(event.action === "APPLICATION_CREATED", "Action must be APPLICATION_CREATED, ignoring client");
    assert(event.actor.id === citizenB.id, "Actor must be authenticated citizen B, ignoring admin override");
    assert(event.fromStatus === null, "fromStatus must be null");
    assert(event.toStatus === "DRAFT", "toStatus must be DRAFT");
  });

  // ========================================================================
  // SUITE 4: STATE TRANSITION & CONCURRENCY CONSTRAINTS
  // ========================================================================
  console.log("\n--- SUITE 4: State Machine Invariants & Concurrency ---");

  await test("24. Cannot submit a CANCELLED application", async () => {
    const appRes = await request("/applications", {
      method: "POST",
      headers: authHeader(tokenCitizenA),
      body: JSON.stringify({
        parcelId: parcel.id,
        type: "BUILDING_PERMISSION",
        description: "Invariant test",
      }),
    });
    const appId = appRes.body.data.id;
    await request(`/applications/${appId}/cancel`, { method: "PATCH", headers: authHeader(tokenCitizenA) });

    const submitRes = await request(`/applications/${appId}/submit`, {
      method: "PATCH",
      headers: authHeader(tokenCitizenA),
    });
    assert(submitRes.status === 400 || submitRes.status === 409, `Expected 400 or 409, got ${submitRes.status}`);
  });

  await test("25. Cannot start review on a DRAFT application (Officer gets 403 unrouted, Admin gets 400 invalid status)", async () => {
    const appRes = await request("/applications", {
      method: "POST",
      headers: authHeader(tokenCitizenA),
      body: JSON.stringify({
        parcelId: parcel.id,
        type: "BUILDING_PERMISSION",
        description: "Draft review guard",
      }),
    });
    const appId = appRes.body.data.id;

    const officerReviewRes = await request(`/officer/applications/${appId}/review`, {
      method: "PATCH",
      headers: authHeader(tokenTpdOfficer),
    });
    assert(officerReviewRes.status === 403, `Officer should get 403 on unrouted draft, got ${officerReviewRes.status}`);

    const adminReviewRes = await request(`/officer/applications/${appId}/review`, {
      method: "PATCH",
      headers: authHeader(tokenAdmin),
    });
    assert(adminReviewRes.status === 400, `Admin should get 400 on draft review attempt, got ${adminReviewRes.status}`);
  });

  // ========================================================================
  // SUITE 5: REGRESSION TESTING (Existing APIs)
  // ========================================================================
  console.log("\n--- SUITE 5: Regression Testing ---");

  await test("26. POST /auth/login returns valid token for officer", async () => {
    const res = await request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "officer.tpd@bhumisetu.local",
        password: "Officer@123",
      }),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(typeof res.body.token === "string", "Token string returned");
  });

  await test("27. GET /auth/me returns authenticated user details", async () => {
    const res = await request("/auth/me", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.user.email === citizenA.email, "Email matched");
  });

  await test("28. GET /parcels and GET /parcels/:id return parcel data", async () => {
    const listRes = await request("/parcels", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(listRes.status === 200, "Parcels list 200");
    assert(Array.isArray(listRes.body.data), "Parcels array");

    const singleRes = await request(`/parcels/${parcel.id}`, {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(singleRes.status === 200, "Single parcel 200");
    assert(singleRes.body.data.id === parcel.id, "Parcel id matched");
  });

  await test("29. GET /parcels/:parcelId/dossier returns parcel dossier", async () => {
    const res = await request(`/parcels/${parcel.id}/dossier`, {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.data.parcel.id === parcel.id, "Dossier parcel matched");
  });

  await test("30. GET /ownerships/my-properties returns citizen properties", async () => {
    const res = await request("/ownerships/my-properties", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(res.status === 200, "My properties 200");
    assert(Array.isArray(res.body.data), "Properties array");
  });

  await test("31. GET /officer/applications returns filtered inbox for TPD officer", async () => {
    const res = await request("/officer/applications?status=APPROVED", {
      method: "GET",
      headers: authHeader(tokenTpdOfficer),
    });
    assert(res.status === 200, "Officer inbox 200");
    assert(Array.isArray(res.body.data), "Applications array");
    for (const app of res.body.data) {
      assert(app.department.code === "TPD", "Must belong to TPD");
      assert(app.status === "APPROVED", "Status must be APPROVED");
    }
  });

  await test("32. Document Metadata CRUD on application still operates seamlessly", async () => {
    // Create draft application
    const appRes = await request("/applications", {
      method: "POST",
      headers: authHeader(tokenCitizenA),
      body: JSON.stringify({
        parcelId: parcel.id,
        type: "BUILDING_PERMISSION",
        description: "Doc test app",
      }),
    });
    const docAppId = appRes.body.data.id;

    // Add document metadata
    const addDocRes = await request(`/applications/${docAppId}/documents`, {
      method: "POST",
      headers: authHeader(tokenCitizenA),
      body: JSON.stringify({
        documentType: "SITE_PLAN",
        originalFileName: "site_plan_rev1.pdf",
        storageKey: `docs/${docAppId}/site_plan_rev1.pdf`,
        mimeType: "application/pdf",
        fileSize: 1024 * 50,
      }),
    });
    assert(addDocRes.status === 201, `Expected 201, got ${addDocRes.status}`);
    const docId = addDocRes.body.data.id;

    // List documents
    const listDocRes = await request(`/applications/${docAppId}/documents`, {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(listDocRes.status === 200, "List documents 200");
    assert(listDocRes.body.data.length === 1, "Expected 1 document");

    // Get document by id
    const getDocRes = await request(`/applications/${docAppId}/documents/${docId}`, {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(getDocRes.status === 200, "Get document 200");
    assert(getDocRes.body.data.originalFileName === "site_plan_rev1.pdf", "File name matched");

    // Delete document
    const delDocRes = await request(`/applications/${docAppId}/documents/${docId}`, {
      method: "DELETE",
      headers: authHeader(tokenCitizenA),
    });
    assert(delDocRes.status === 200, "Delete document 200");
  });

  console.log("\n==================================================");
  console.log(`ALL ${testCount} TESTS PASSED SUCCESSFULLY!`);
  console.log("==================================================\n");
};

runSuite()
  .catch((err) => {
    console.error("Test Suite Failed with error:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await prisma.$disconnect();
  });
