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
  console.log("BHUMISETU IN-APP NOTIFICATIONS TEST SUITE");
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
  assert(tpdDept, "TPD department must exist in database");

  // TPD Officer
  const tpdOfficer = await prisma.user.findUnique({
    where: { email: "officer.tpd@bhumisetu.local" },
  });
  assert(tpdOfficer, "TPD Officer must exist");

  // Citizen Alpha
  const citizenA = await prisma.user.upsert({
    where: { email: "citizen.notify.a@bhumisetu.local" },
    create: {
      name: "Citizen Alpha Notify",
      email: "citizen.notify.a@bhumisetu.local",
      passwordHash: await bcrypt.hash("Citizen@123", SALT_ROUNDS),
      role: "CITIZEN",
      isActive: true,
    },
    update: {
      name: "Citizen Alpha Notify",
      role: "CITIZEN",
      isActive: true,
    },
  });

  // Citizen Beta
  const citizenB = await prisma.user.upsert({
    where: { email: "citizen.notify.b@bhumisetu.local" },
    create: {
      name: "Citizen Beta Notify",
      email: "citizen.notify.b@bhumisetu.local",
      passwordHash: await bcrypt.hash("Citizen@123", SALT_ROUNDS),
      role: "CITIZEN",
      isActive: true,
    },
    update: {
      name: "Citizen Beta Notify",
      role: "CITIZEN",
      isActive: true,
    },
  });

  // Parcel
  const parcel = await prisma.parcel.findFirst();
  assert(parcel, "At least one parcel must exist in the database");

  // Ensure parcel ownership for citizens
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

  const authHeader = (token) => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  });

  console.log("Fixtures ready. Executing tests...\n");

  // ========================================================================
  // SUITE 1: NOTIFICATION CREATION ACROSS APPLICATION LIFECYCLE
  // ========================================================================
  console.log("--- SUITE 1: Notification Creation Across Lifecycle ---");

  let lifecycleAppId;
  let lifecycleAppNumber;

  await test("1. Create draft application → NO notification created for DRAFT", async () => {
    const unreadBefore = await request("/notifications/unread-count", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });

    const res = await request("/applications", {
      method: "POST",
      headers: authHeader(tokenCitizenA),
      body: JSON.stringify({
        parcelId: parcel.id,
        type: "BUILDING_PERMISSION",
        description: "Notification lifecycle application",
      }),
    });

    assert(res.status === 201, "Expected 201 Created");
    lifecycleAppId = res.body.data.id;
    lifecycleAppNumber = res.body.data.applicationNumber;

    const unreadAfter = await request("/notifications/unread-count", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });

    assert(
      unreadAfter.body.unreadCount === unreadBefore.body.unreadCount,
      "Draft creation must NOT create user-facing notification",
    );
  });

  await test("2. Submit application → APPLICATION_SUBMITTED notification created", async () => {
    const res = await request(`/applications/${lifecycleAppId}/submit`, {
      method: "PATCH",
      headers: authHeader(tokenCitizenA),
    });
    assert(res.status === 200, "Submit 200");

    const notifRes = await request("/notifications?limit=1", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(notifRes.status === 200, "Get notifications 200");
    const latest = notifRes.body.data[0];
    assert(latest.type === "APPLICATION_SUBMITTED", "Notification type");
    assert(latest.title === "Application submitted", "Notification title");
    assert(latest.message.includes(lifecycleAppNumber), "Message includes application number");
    assert(latest.isRead === false, "isRead false");
    assert(latest.applicationId === lifecycleAppId, "applicationId matched");
  });

  await test("3. Start review → APPLICATION_UNDER_REVIEW notification created", async () => {
    const res = await request(`/officer/applications/${lifecycleAppId}/review`, {
      method: "PATCH",
      headers: authHeader(tokenTpdOfficer),
      body: JSON.stringify({ reviewRemarks: "Commencing review" }),
    });
    assert(res.status === 200, "Review start 200");

    const notifRes = await request("/notifications?limit=1", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    const latest = notifRes.body.data[0];
    assert(latest.type === "APPLICATION_UNDER_REVIEW", "Notification type");
    assert(latest.title === "Application under review", "Notification title");
    assert(latest.message.includes(lifecycleAppNumber), "Message includes application number");
  });

  await test("4. Request additional info → APPLICATION_ADDITIONAL_INFO_REQUIRED notification created", async () => {
    const res = await request(`/officer/applications/${lifecycleAppId}/decision`, {
      method: "PATCH",
      headers: authHeader(tokenTpdOfficer),
      body: JSON.stringify({
        decision: "ADDITIONAL_INFO_REQUIRED",
        decisionRemarks: "Please provide updated architectural blueprint",
      }),
    });
    assert(res.status === 200, "Decision 200");

    const notifRes = await request("/notifications?limit=1", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    const latest = notifRes.body.data[0];
    assert(latest.type === "APPLICATION_ADDITIONAL_INFO_REQUIRED", "Notification type");
    assert(latest.title === "Additional information required", "Notification title");
    assert(latest.message.includes(lifecycleAppNumber), "Message includes application number");
  });

  await test("5. Citizen resubmits → APPLICATION_RESUBMITTED notification created", async () => {
    const res = await request(`/applications/${lifecycleAppId}/resubmit`, {
      method: "PATCH",
      headers: authHeader(tokenCitizenA),
      body: JSON.stringify({
        response: "Updated architectural blueprint provided",
      }),
    });
    assert(res.status === 200, "Resubmit 200");

    const notifRes = await request("/notifications?limit=1", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    const latest = notifRes.body.data[0];
    assert(latest.type === "APPLICATION_RESUBMITTED", "Notification type");
    assert(latest.title === "Application resubmitted", "Notification title");
    assert(latest.message.includes(lifecycleAppNumber), "Message includes application number");
  });

  await test("6. Officer resumes review → second APPLICATION_UNDER_REVIEW notification created", async () => {
    const res = await request(`/officer/applications/${lifecycleAppId}/review`, {
      method: "PATCH",
      headers: authHeader(tokenTpdOfficer),
    });
    assert(res.status === 200, "Review resume 200");

    const notifRes = await request("/notifications?limit=1", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    const latest = notifRes.body.data[0];
    assert(latest.type === "APPLICATION_UNDER_REVIEW", "Notification type");
    assert(latest.title === "Application under review", "Notification title");
  });

  await test("7. Officer approves application → APPLICATION_APPROVED notification created", async () => {
    const res = await request(`/officer/applications/${lifecycleAppId}/decision`, {
      method: "PATCH",
      headers: authHeader(tokenTpdOfficer),
      body: JSON.stringify({
        decision: "APPROVED",
        decisionRemarks: "Complies with building norms",
      }),
    });
    assert(res.status === 200, "Approve 200");

    const notifRes = await request("/notifications?limit=1", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    const latest = notifRes.body.data[0];
    assert(latest.type === "APPLICATION_APPROVED", "Notification type");
    assert(latest.title === "Application approved", "Notification title");
    assert(latest.message.includes(lifecycleAppNumber), "Message includes application number");
  });

  await test("8. Approved with conditions → APPLICATION_APPROVED_WITH_CONDITIONS notification", async () => {
    // Create, submit, review, decide with conditions
    const appRes = await request("/applications", {
      method: "POST",
      headers: authHeader(tokenCitizenA),
      body: JSON.stringify({
        parcelId: parcel.id,
        type: "BUILDING_PERMISSION",
        description: "Conditions notify test",
      }),
    });
    const appId = appRes.body.data.id;
    const appNum = appRes.body.data.applicationNumber;

    await request(`/applications/${appId}/submit`, { method: "PATCH", headers: authHeader(tokenCitizenA) });
    await request(`/officer/applications/${appId}/review`, { method: "PATCH", headers: authHeader(tokenTpdOfficer) });
    await request(`/officer/applications/${appId}/decision`, {
      method: "PATCH",
      headers: authHeader(tokenTpdOfficer),
      body: JSON.stringify({
        decision: "APPROVED_WITH_CONDITIONS",
        decisionRemarks: "Install rainwater harvesting tank",
      }),
    });

    const notifRes = await request("/notifications?limit=1", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    const latest = notifRes.body.data[0];
    assert(latest.type === "APPLICATION_APPROVED_WITH_CONDITIONS", "Notification type");
    assert(latest.title === "Application approved with conditions", "Notification title");
    assert(latest.message.includes(appNum), "Message includes app number");
  });

  await test("9. Rejection → APPLICATION_REJECTED notification", async () => {
    const appRes = await request("/applications", {
      method: "POST",
      headers: authHeader(tokenCitizenA),
      body: JSON.stringify({
        parcelId: parcel.id,
        type: "BUILDING_PERMISSION",
        description: "Reject notify test",
      }),
    });
    const appId = appRes.body.data.id;
    const appNum = appRes.body.data.applicationNumber;

    await request(`/applications/${appId}/submit`, { method: "PATCH", headers: authHeader(tokenCitizenA) });
    await request(`/officer/applications/${appId}/review`, { method: "PATCH", headers: authHeader(tokenTpdOfficer) });
    await request(`/officer/applications/${appId}/decision`, {
      method: "PATCH",
      headers: authHeader(tokenTpdOfficer),
      body: JSON.stringify({
        decision: "REJECTED",
        decisionRemarks: "Exceeds height limitation",
      }),
    });

    const notifRes = await request("/notifications?limit=1", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    const latest = notifRes.body.data[0];
    assert(latest.type === "APPLICATION_REJECTED", "Notification type");
    assert(latest.title === "Application rejected", "Notification title");
    assert(latest.message.includes(appNum), "Message includes app number");
  });

  await test("10. Cancellation → APPLICATION_CANCELLED notification", async () => {
    const appRes = await request("/applications", {
      method: "POST",
      headers: authHeader(tokenCitizenA),
      body: JSON.stringify({
        parcelId: parcel.id,
        type: "BUILDING_PERMISSION",
        description: "Cancel notify test",
      }),
    });
    const appId = appRes.body.data.id;
    const appNum = appRes.body.data.applicationNumber;

    await request(`/applications/${appId}/cancel`, { method: "PATCH", headers: authHeader(tokenCitizenA) });

    const notifRes = await request("/notifications?limit=1", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    const latest = notifRes.body.data[0];
    assert(latest.type === "APPLICATION_CANCELLED", "Notification type");
    assert(latest.title === "Application cancelled", "Notification title");
    assert(latest.message.includes(appNum), "Message includes app number");
  });

  // ========================================================================
  // SUITE 2: NOTIFICATION API, PAGINATION, AND FILTERS
  // ========================================================================
  console.log("\n--- SUITE 2: Notification API, Pagination & Filters ---");

  await test("11. GET /notifications requires JWT (401)", async () => {
    const res = await request("/notifications", { method: "GET" });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test("12. GET /notifications returns ONLY authenticated user's notifications", async () => {
    const resA = await request("/notifications", { method: "GET", headers: authHeader(tokenCitizenA) });
    const resB = await request("/notifications", { method: "GET", headers: authHeader(tokenCitizenB) });

    assert(resA.status === 200, "Citizen A 200");
    assert(resB.status === 200, "Citizen B 200");

    for (const notif of resA.body.data) {
      assert(notif.userId === citizenA.id, "Citizen A notifications must belong to Citizen A");
    }

    for (const notif of resB.body.data) {
      assert(notif.userId === citizenB.id, "Citizen B notifications must belong to Citizen B");
    }
  });

  await test("13. unreadOnly=true filters correctly", async () => {
    const allRes = await request("/notifications", { method: "GET", headers: authHeader(tokenCitizenA) });
    const unreadRes = await request("/notifications?unreadOnly=true", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });

    assert(unreadRes.status === 200, "Unread only 200");
    for (const notif of unreadRes.body.data) {
      assert(notif.isRead === false, "Every returned notification must have isRead === false");
    }
    assert(unreadRes.body.data.length <= allRes.body.data.length, "Unread count <= total count");
  });

  await test("14. Pagination works (page, limit, totalPages)", async () => {
    const resPage1 = await request("/notifications?page=1&limit=2", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });

    assert(resPage1.status === 200, "Page 1 200");
    assert(resPage1.body.data.length <= 2, "Limit 2 respected");
    assert(resPage1.body.pagination.page === 1, "Page 1");
    assert(resPage1.body.pagination.limit === 2, "Limit 2");
    assert(typeof resPage1.body.pagination.total === "number", "Total count returned");
    assert(resPage1.body.pagination.totalPages >= 1, "Total pages >= 1");
  });

  await test("15. Newest notifications appear first", async () => {
    const res = await request("/notifications?limit=10", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });

    assert(res.status === 200, "200 OK");
    const notifications = res.body.data;
    for (let i = 0; i < notifications.length - 1; i += 1) {
      const current = new Date(notifications[i].createdAt).getTime();
      const next = new Date(notifications[i + 1].createdAt).getTime();
      assert(current >= next, `Notifications must be ordered newest first (${current} >= ${next})`);
    }
  });

  await test("16. GET /notifications/unread-count returns accurate count", async () => {
    const res = await request("/notifications/unread-count", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });

    assert(res.status === 200, "200 OK");
    assert(typeof res.body.unreadCount === "number", "unreadCount is a number");

    // Cross-verify with database count directly
    const actualDbCount = await prisma.notification.count({
      where: { userId: citizenA.id, isRead: false },
    });
    assert(res.body.unreadCount === actualDbCount, "API unreadCount matches direct DB count");
  });

  // ========================================================================
  // SUITE 3: READ MUTATION APIS & AUTHORIZATION
  // ========================================================================
  console.log("\n--- SUITE 3: Read Mutations & Authorization ---");

  let singleNotifId;

  await test("17. Mark one notification as read (PATCH /notifications/:id/read)", async () => {
    const listRes = await request("/notifications?unreadOnly=true&limit=1", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(listRes.body.data.length > 0, "Must have at least one unread notification");
    singleNotifId = listRes.body.data[0].id;

    const readRes = await request(`/notifications/${singleNotifId}/read`, {
      method: "PATCH",
      headers: authHeader(tokenCitizenA),
    });

    assert(readRes.status === 200, `Expected 200, got ${readRes.status}`);
    assert(readRes.body.data.isRead === true, "isRead is now true");
    assert(readRes.body.data.readAt !== null, "readAt is now populated");
  });

  await test("18. Another user cannot mark notification as read (403)", async () => {
    const tamperRes = await request(`/notifications/${singleNotifId}/read`, {
      method: "PATCH",
      headers: authHeader(tokenCitizenB),
    });

    assert(tamperRes.status === 403, `Expected 403, got ${tamperRes.status}`);
  });

  await test("19. Read-all marks all unread notifications for user as read", async () => {
    const readAllRes = await request("/notifications/read-all", {
      method: "PATCH",
      headers: authHeader(tokenCitizenA),
    });

    assert(readAllRes.status === 200, "Read all 200");
    assert(typeof readAllRes.body.updatedCount === "number", "updatedCount returned");

    const unreadCheck = await request("/notifications/unread-count", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(unreadCheck.body.unreadCount === 0, "All notifications for Citizen A must now be read");
  });

  await test("20. Read-all does NOT modify another user's notifications", async () => {
    // Create an unread notification for Citizen B
    const appRes = await request("/applications", {
      method: "POST",
      headers: authHeader(tokenCitizenB),
      body: JSON.stringify({
        parcelId: parcel.id,
        type: "BUILDING_PERMISSION",
        description: "Citizen B unread test",
      }),
    });
    const bAppId = appRes.body.data.id;
    await request(`/applications/${bAppId}/submit`, { method: "PATCH", headers: authHeader(tokenCitizenB) });

    const bUnreadBefore = await request("/notifications/unread-count", {
      method: "GET",
      headers: authHeader(tokenCitizenB),
    });
    assert(bUnreadBefore.body.unreadCount > 0, "Citizen B has unread notifications");

    // Citizen A runs read-all
    await request("/notifications/read-all", {
      method: "PATCH",
      headers: authHeader(tokenCitizenA),
    });

    // Citizen B unread count must remain unchanged
    const bUnreadAfter = await request("/notifications/unread-count", {
      method: "GET",
      headers: authHeader(tokenCitizenB),
    });
    assert(
      bUnreadAfter.body.unreadCount === bUnreadBefore.body.unreadCount,
      "Citizen B unread count must not be affected by Citizen A's read-all",
    );
  });

  // ========================================================================
  // SUITE 4: TRANSACTION INTEGRITY
  // ========================================================================
  console.log("\n--- SUITE 4: Transaction Integrity ---");

  await test("21. Unsuccessful transition does not create orphan notification", async () => {
    // Create draft and cancel it
    const appRes = await request("/applications", {
      method: "POST",
      headers: authHeader(tokenCitizenB),
      body: JSON.stringify({
        parcelId: parcel.id,
        type: "BUILDING_PERMISSION",
        description: "Rollback notification test",
      }),
    });
    const testAppId = appRes.body.data.id;
    await request(`/applications/${testAppId}/cancel`, { method: "PATCH", headers: authHeader(tokenCitizenB) });

    const countBefore = await prisma.notification.count({ where: { userId: citizenB.id } });

    // Try submitting the cancelled application (which fails validation / status guard)
    const failRes = await request(`/applications/${testAppId}/submit`, {
      method: "PATCH",
      headers: authHeader(tokenCitizenB),
    });
    assert(failRes.status === 400 || failRes.status === 409, "Failed submission");

    const countAfter = await prisma.notification.count({ where: { userId: citizenB.id } });
    assert(
      countBefore === countAfter,
      "No notification record should be created when transition fails or rolls back",
    );
  });

  // ========================================================================
  // SUITE 5: REGRESSION TESTING (Existing APIs)
  // ========================================================================
  console.log("\n--- SUITE 5: Regression Testing ---");

  await test("22. POST /auth/login returns valid token", async () => {
    const res = await request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "officer.tpd@bhumisetu.local",
        password: "Officer@123",
      }),
    });
    assert(res.status === 200, "Login 200");
    assert(typeof res.body.token === "string", "Token string");
  });

  await test("23. GET /auth/me returns user details", async () => {
    const res = await request("/auth/me", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(res.status === 200, "Me 200");
    assert(res.body.user.email === citizenA.email, "Email match");
  });

  await test("24. Application audit history still works seamlessly", async () => {
    const res = await request(`/applications/${lifecycleAppId}/history`, {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(res.status === 200, "History 200");
    assert(Array.isArray(res.body.data), "History array");
    assert(res.body.data.length === 7, `Expected 7 history events, got ${res.body.data.length}`);
  });

  await test("25. Application document metadata CRUD still works seamlessly", async () => {
    const appRes = await request("/applications", {
      method: "POST",
      headers: authHeader(tokenCitizenA),
      body: JSON.stringify({
        parcelId: parcel.id,
        type: "BUILDING_PERMISSION",
        description: "Doc notify test",
      }),
    });
    const docAppId = appRes.body.data.id;

    const addDocRes = await request(`/applications/${docAppId}/documents`, {
      method: "POST",
      headers: authHeader(tokenCitizenA),
      body: JSON.stringify({
        documentType: "SITE_PLAN",
        originalFileName: "site_plan.pdf",
        storageKey: `docs/${docAppId}/site_plan.pdf`,
        mimeType: "application/pdf",
        fileSize: 1024 * 20,
      }),
    });
    assert(addDocRes.status === 201, "Add doc 201");
    const docId = addDocRes.body.data.id;

    const getDocRes = await request(`/applications/${docAppId}/documents/${docId}`, {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(getDocRes.status === 200, "Get doc 200");

    const delDocRes = await request(`/applications/${docAppId}/documents/${docId}`, {
      method: "DELETE",
      headers: authHeader(tokenCitizenA),
    });
    assert(delDocRes.status === 200, "Delete doc 200");
  });

  await test("26. Officer inbox still functions with department isolation", async () => {
    const res = await request("/officer/applications?status=APPROVED", {
      method: "GET",
      headers: authHeader(tokenTpdOfficer),
    });
    assert(res.status === 200, "Inbox 200");
    assert(Array.isArray(res.body.data), "Inbox array");
  });

  await test("27. Parcel & ownership APIs still function normally", async () => {
    const parcelsRes = await request("/parcels", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(parcelsRes.status === 200, "Parcels 200");

    const ownRes = await request("/ownerships/my-properties", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(ownRes.status === 200, "Ownerships 200");
  });

  console.log("\n==================================================");
  console.log(`ALL ${testCount} NOTIFICATION TESTS PASSED!`);
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
