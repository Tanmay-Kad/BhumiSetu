require("dotenv").config();

const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const storageService = require("../src/services/storageService");
const prisma = require("../src/utils/prisma");
const SALT_ROUNDS = 12;

let server;
let baseUrl;

const request = async (urlPath, options = {}) => {
  const response = await fetch(`${baseUrl}${urlPath}`, options);
  let body;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    body = await response.json();
  } else {
    body = Buffer.from(await response.arrayBuffer());
  }
  return {
    status: response.status,
    headers: response.headers,
    body,
  };
};

const createToken = (user) =>
  jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
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

// Fixture helpers for binary payloads
const createPdfBuffer = (text = "BhumiSetu Test PDF Document") => {
  const header = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Title (Test) >>\nendobj\n");
  const body = Buffer.from(`stream\n${text}\nendstream\n`);
  const footer = Buffer.from("xref\n0 2\n0000000000 65535 f \ntrailer\n<< /Root 1 0 R >>\nstartxref\n99\n%%EOF\n");
  return Buffer.concat([header, body, footer]);
};

const createJpegBuffer = () => {
  // Valid minimal JPEG signature (FF D8 FF E0 ... FF D9)
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0xff, 0xd9,
  ]);
};

const createPngBuffer = () => {
  // Valid minimal PNG signature (89 50 4E 47 0D 0A 1A 0A ...)
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
};

const runSuite = async () => {
  console.log("\n==================================================");
  console.log("BHUMISETU REAL APPLICATION DOCUMENT STORAGE TEST SUITE");
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
  assert(tpdDept && treeDept, "TPD and TREE departments must exist");

  // Officers
  const tpdOfficer = await prisma.user.findUnique({
    where: { email: "officer.tpd@bhumisetu.local" },
  });
  assert(tpdOfficer, "TPD Officer must exist");

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
    update: { role: "OFFICER", department: "TREE", isActive: true },
  });

  // Admin
  const adminUser = await prisma.user.upsert({
    where: { email: "admin.doc.test@bhumisetu.local" },
    create: {
      name: "Admin Doc User",
      email: "admin.doc.test@bhumisetu.local",
      passwordHash: await bcrypt.hash("Admin@123", SALT_ROUNDS),
      role: "ADMIN",
      isActive: true,
    },
    update: { role: "ADMIN", isActive: true },
  });

  // Citizen Alpha
  const citizenA = await prisma.user.upsert({
    where: { email: "citizen.doc.a@bhumisetu.local" },
    create: {
      name: "Citizen Alpha Docs",
      email: "citizen.doc.a@bhumisetu.local",
      passwordHash: await bcrypt.hash("Citizen@123", SALT_ROUNDS),
      role: "CITIZEN",
      isActive: true,
    },
    update: { role: "CITIZEN", isActive: true },
  });

  // Citizen Beta
  const citizenB = await prisma.user.upsert({
    where: { email: "citizen.doc.b@bhumisetu.local" },
    create: {
      name: "Citizen Beta Docs",
      email: "citizen.doc.b@bhumisetu.local",
      passwordHash: await bcrypt.hash("Citizen@123", SALT_ROUNDS),
      role: "CITIZEN",
      isActive: true,
    },
    update: { role: "CITIZEN", isActive: true },
  });

  // Parcels
  const parcelA = await prisma.parcel.upsert({
    where: { ulpin: "ULPIN-DOC-PARCEL-A" },
    create: {
      ulpin: "ULPIN-DOC-PARCEL-A",
      surveyNumber: "DOC-SN-001",
      village: "Doc Village",
      taluk: "Doc Taluk",
      district: "Bengaluru Urban",
      area: 2500.0,
      landUse: "RESIDENTIAL",
      zoning: "R-1",
    },
    update: {},
  });

  const parcelB = await prisma.parcel.upsert({
    where: { ulpin: "ULPIN-DOC-PARCEL-B" },
    create: {
      ulpin: "ULPIN-DOC-PARCEL-B",
      surveyNumber: "DOC-SN-002",
      village: "Doc Village",
      taluk: "Doc Taluk",
      district: "Bengaluru Urban",
      area: 3200.0,
      landUse: "RESIDENTIAL",
      zoning: "R-1",
    },
    update: {},
  });

  // Ownerships
  await prisma.ownership.upsert({
    where: { userId_parcelId: { userId: citizenA.id, parcelId: parcelA.id } },
    create: { userId: citizenA.id, parcelId: parcelA.id },
    update: {},
  });

  await prisma.ownership.upsert({
    where: { userId_parcelId: { userId: citizenB.id, parcelId: parcelB.id } },
    create: { userId: citizenB.id, parcelId: parcelB.id },
    update: {},
  });

  const tokenCitizenA = createToken(citizenA);
  const tokenCitizenB = createToken(citizenB);
  const tokenTpdOfficer = createToken(tpdOfficer);
  const tokenTreeOfficer = createToken(treeOfficer);
  const tokenAdmin = createToken(adminUser);

  const authHeader = (token) => ({
    Authorization: `Bearer ${token}`,
  });

  // Helper to create application
  const createTestApp = async (token, parcelId, type = "BUILDING_PERMISSION", desc = "Doc app") => {
    const res = await request("/applications", {
      method: "POST",
      headers: {
        ...authHeader(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parcelId,
        type,
        description: desc,
      }),
    });
    assert(res.status === 201, `Failed to create test app: ${JSON.stringify(res.body)}`);
    return res.body.data;
  };

  // Helper to upload multipart file
  const uploadDoc = async (token, appId, { buffer, filename, mimeType, documentType }) => {
    const formData = new FormData();
    if (documentType !== undefined) {
      formData.append("documentType", documentType);
    }
    if (buffer !== undefined) {
      const blob = new Blob([buffer], { type: mimeType || "application/octet-stream" });
      formData.append("file", blob, filename || "upload.dat");
    }

    return request(`/applications/${appId}/documents`, {
      method: "POST",
      headers: authHeader(token),
      body: formData,
    });
  };

  console.log("Fixtures ready. Executing tests...\n");

  // Create primary test application for Citizen A (starts in DRAFT)
  const appA = await createTestApp(tokenCitizenA, parcelA.id, "BUILDING_PERMISSION", "Citizen A Application");
  const appB = await createTestApp(tokenCitizenB, parcelB.id, "BUILDING_PERMISSION", "Citizen B Application");

  let uploadedPdfDoc;
  let uploadedJpegDoc;
  let uploadedPngDoc;
  const originalPdfBuffer = createPdfBuffer("Official Site Plan PDF Content 2026");

  // ========================================================================
  // SECTION 1: UPLOAD (Tests 1-9)
  // ========================================================================
  console.log("--- SECTION 1: Multipart File Upload ---");

  await test("1. Citizen can upload a valid PDF", async () => {
    const res = await uploadDoc(tokenCitizenA, appA.id, {
      buffer: originalPdfBuffer,
      filename: "site_plan_final.pdf",
      mimeType: "application/pdf",
      documentType: "SITE_PLAN",
    });

    assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.status === "success", "Response status must be success");
    uploadedPdfDoc = res.body.data;
    assert(uploadedPdfDoc.id, "Document ID must exist");
  });

  await test("2. Citizen can upload a valid JPEG", async () => {
    const jpegBuffer = createJpegBuffer();
    const res = await uploadDoc(tokenCitizenA, appA.id, {
      buffer: jpegBuffer,
      filename: "photo_id.jpg",
      mimeType: "image/jpeg",
      documentType: "IDENTITY_PROOF",
    });

    assert(res.status === 201, `Expected 201, got ${res.status}`);
    uploadedJpegDoc = res.body.data;
    assert(uploadedJpegDoc.mimeType === "image/jpeg", "MIME type must be image/jpeg");
  });

  await test("3. Citizen can upload a valid PNG", async () => {
    const pngBuffer = createPngBuffer();
    const res = await uploadDoc(tokenCitizenA, appA.id, {
      buffer: pngBuffer,
      filename: "tax_receipt.png",
      mimeType: "image/png",
      documentType: "PROPERTY_TAX_RECEIPT",
    });

    assert(res.status === 201, `Expected 201, got ${res.status}`);
    uploadedPngDoc = res.body.data;
    assert(uploadedPngDoc.mimeType === "image/png", "MIME type must be image/png");
  });

  await test("4. Metadata is correctly stored in database", async () => {
    const dbDoc = await prisma.applicationDocument.findUnique({
      where: { id: uploadedPdfDoc.id },
    });
    assert(dbDoc, "Document must exist in database");
    assert(dbDoc.applicationId === appA.id, "applicationId must match");
    assert(dbDoc.uploadedById === citizenA.id, "uploadedById must match citizen A");
    assert(dbDoc.documentType === "SITE_PLAN", "documentType must match");
  });

  await test("5. Actual physical file exists in storage", async () => {
    const exists = storageService.fileExists(uploadedPdfDoc.storageKey);
    assert(exists, "Physical file must exist in storage");
    const buffer = await storageService.getFile(uploadedPdfDoc.storageKey);
    assert(buffer !== null, "File buffer must be readable");
    assert(buffer.equals(originalPdfBuffer), "Stored buffer must match uploaded buffer byte-for-byte");
  });

  await test("6. Generated storage key is opaque and safe", async () => {
    assert(
      uploadedPdfDoc.storageKey.startsWith(`applications/${appA.id}/`),
      `Storage key must follow opaque pattern, got ${uploadedPdfDoc.storageKey}`,
    );
    assert(!uploadedPdfDoc.storageKey.includes("site_plan_final.pdf"), "Storage key must not contain user filename");
    assert(!uploadedPdfDoc.storageKey.includes(".."), "Storage key must not contain parent directory traversal");
  });

  await test("7. Original filename is preserved as metadata", async () => {
    assert(uploadedPdfDoc.originalFileName === "site_plan_final.pdf", "originalFileName preserved");
  });

  await test("8. Actual file size is stored correctly", async () => {
    assert(uploadedPdfDoc.fileSize === originalPdfBuffer.length, "fileSize must equal buffer length");
  });

  await test("9. MIME type is stored correctly", async () => {
    assert(uploadedPdfDoc.mimeType === "application/pdf", "mimeType must be application/pdf");
  });

  // ========================================================================
  // SECTION 2: VALIDATION (Tests 10-16)
  // ========================================================================
  console.log("\n--- SECTION 2: File & Metadata Validation ---");

  await test("10. Missing file rejected with 400", async () => {
    const res = await uploadDoc(tokenCitizenA, appA.id, {
      documentType: "SITE_PLAN",
      // no file buffer
    });
    assert(res.status === 400, `Expected 400 for missing file, got ${res.status}`);
  });

  await test("11. Missing documentType rejected with 400", async () => {
    const res = await uploadDoc(tokenCitizenA, appA.id, {
      buffer: createPdfBuffer(),
      filename: "test.pdf",
      mimeType: "application/pdf",
      // no documentType
    });
    assert(res.status === 400, `Expected 400 for missing documentType, got ${res.status}`);
  });

  await test("12. Invalid documentType rejected with 400", async () => {
    const res = await uploadDoc(tokenCitizenA, appA.id, {
      buffer: createPdfBuffer(),
      filename: "test.pdf",
      mimeType: "application/pdf",
      documentType: "NOT_A_REAL_TYPE",
    });
    assert(res.status === 400, `Expected 400 for invalid documentType, got ${res.status}`);
  });

  await test("13. File larger than 20 MB rejected with 400", async () => {
    // 21 MB buffer
    const largeBuffer = Buffer.alloc(21 * 1024 * 1024);
    // Write PDF magic bytes so it passes header check
    largeBuffer.write("%PDF-1.4\n", 0);

    const res = await uploadDoc(tokenCitizenA, appA.id, {
      buffer: largeBuffer,
      filename: "huge.pdf",
      mimeType: "application/pdf",
      documentType: "SITE_PLAN",
    });
    assert(res.status === 400, `Expected 400 for file > 20MB, got ${res.status}`);
  });

  await test("14. Unsupported MIME type rejected with 400", async () => {
    const textBuffer = Buffer.from("Plain text content");
    const res = await uploadDoc(tokenCitizenA, appA.id, {
      buffer: textBuffer,
      filename: "notes.txt",
      mimeType: "text/plain",
      documentType: "OTHER",
    });
    assert(res.status === 400, `Expected 400 for text/plain, got ${res.status}`);
  });

  await test("15. Executable/script file rejected with 400", async () => {
    // Test .exe
    const exeBuffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00");
    const resExe = await uploadDoc(tokenCitizenA, appA.id, {
      buffer: exeBuffer,
      filename: "malware.exe",
      mimeType: "application/x-msdownload",
      documentType: "OTHER",
    });
    assert(resExe.status === 400, `Expected 400 for .exe file, got ${resExe.status}`);

    // Test .sh shell script disguised as pdf mime
    const shBuffer = Buffer.from("#!/bin/bash\necho hello\n");
    const resSh = await uploadDoc(tokenCitizenA, appA.id, {
      buffer: shBuffer,
      filename: "script.sh",
      mimeType: "application/pdf",
      documentType: "OTHER",
    });
    assert(resSh.status === 400, `Expected 400 for .sh script, got ${resSh.status}`);
  });

  await test("16. Path traversal filename cannot escape storage directory", async () => {
    const res = await uploadDoc(tokenCitizenA, appA.id, {
      buffer: createPdfBuffer("Traversal test"),
      filename: "../../secret_file.pdf",
      mimeType: "application/pdf",
      documentType: "BUILDING_PLAN",
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body.data.originalFileName === "secret_file.pdf", "Filename must be sanitized of path components");
    assert(!res.body.data.storageKey.includes(".."), "Storage key must never contain traversal characters");

    // Also verify storageService throws on traversal directly
    let traversalCaught = false;
    try {
      storageService.resolveSafePath("../../../outside.txt");
    } catch (e) {
      traversalCaught = true;
    }
    assert(traversalCaught, "storageService.resolveSafePath must reject path traversal");
  });

  // ========================================================================
  // SECTION 3: AUTHORIZATION / RBAC (Tests 17-23)
  // ========================================================================
  console.log("\n--- SECTION 3: Authorization (RBAC) ---");

  await test("17. Citizen A cannot upload to Citizen B's application", async () => {
    const res = await uploadDoc(tokenCitizenA, appB.id, {
      buffer: createPdfBuffer(),
      filename: "unauthorized.pdf",
      mimeType: "application/pdf",
      documentType: "SITE_PLAN",
    });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  await test("18. Citizen A cannot read Citizen B's document metadata", async () => {
    // Upload a doc for Citizen B first
    const bDocRes = await uploadDoc(tokenCitizenB, appB.id, {
      buffer: createPdfBuffer(),
      filename: "citizen_b_plan.pdf",
      mimeType: "application/pdf",
      documentType: "SITE_PLAN",
    });
    assert(bDocRes.status === 201, "Citizen B doc uploaded");
    const bDocId = bDocRes.body.data.id;

    const res = await request(`/applications/${appB.id}/documents/${bDocId}`, {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(res.status === 403, `Expected 403 for Citizen A reading Citizen B's doc, got ${res.status}`);
  });

  await test("19. Citizen A cannot download Citizen B's file", async () => {
    const bDocRes = await request(`/applications/${appB.id}/documents`, {
      method: "GET",
      headers: authHeader(tokenCitizenB),
    });
    const bDocId = bDocRes.body.data[0].id;

    const res = await request(`/applications/${appB.id}/documents/${bDocId}/file`, {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(res.status === 403, `Expected 403 for Citizen A downloading Citizen B's file, got ${res.status}`);
  });

  await test("20. Citizen A cannot delete Citizen B's document", async () => {
    const bDocRes = await request(`/applications/${appB.id}/documents`, {
      method: "GET",
      headers: authHeader(tokenCitizenB),
    });
    const bDocId = bDocRes.body.data[0].id;

    const res = await request(`/applications/${appB.id}/documents/${bDocId}`, {
      method: "DELETE",
      headers: authHeader(tokenCitizenA),
    });
    assert(res.status === 403, `Expected 403 for Citizen A deleting Citizen B's doc, got ${res.status}`);
  });

  await test("21. TPD officer can read TPD application documents", async () => {
    // Submit appA to route it to TPD
    await request(`/applications/${appA.id}/submit`, {
      method: "PATCH",
      headers: authHeader(tokenCitizenA),
    });

    const listRes = await request(`/applications/${appA.id}/documents`, {
      method: "GET",
      headers: authHeader(tokenTpdOfficer),
    });
    assert(listRes.status === 200, `TPD officer list docs: expected 200, got ${listRes.status}`);
    assert(Array.isArray(listRes.body.data), "Documents array returned");

    const singleRes = await request(`/applications/${appA.id}/documents/${uploadedPdfDoc.id}`, {
      method: "GET",
      headers: authHeader(tokenTpdOfficer),
    });
    assert(singleRes.status === 200, `TPD officer single doc: expected 200, got ${singleRes.status}`);

    const fileRes = await request(`/applications/${appA.id}/documents/${uploadedPdfDoc.id}/file`, {
      method: "GET",
      headers: authHeader(tokenTpdOfficer),
    });
    assert(fileRes.status === 200, `TPD officer download doc file: expected 200, got ${fileRes.status}`);
  });

  await test("22. TPD officer cannot read TREE application documents", async () => {
    // Create and submit TREE application
    const treeApp = await createTestApp(tokenCitizenA, parcelA.id, "TREE_CUTTING", "Tree cutting request");
    await request(`/applications/${treeApp.id}/submit`, {
      method: "PATCH",
      headers: authHeader(tokenCitizenA),
    });

    // Upload doc to TREE application
    const treeDocRes = await uploadDoc(tokenCitizenA, treeApp.id, {
      buffer: createPdfBuffer("Tree report"),
      filename: "tree_survey.pdf",
      mimeType: "application/pdf",
      documentType: "TREE_RELATED_DOCUMENT",
    });
    assert(treeDocRes.status === 201, "Tree doc uploaded");
    const treeDocId = treeDocRes.body.data.id;

    // TPD officer attempt
    const listRes = await request(`/applications/${treeApp.id}/documents`, {
      method: "GET",
      headers: authHeader(tokenTpdOfficer),
    });
    assert(listRes.status === 403, `TPD officer reading TREE app docs should return 403, got ${listRes.status}`);

    const fileRes = await request(`/applications/${treeApp.id}/documents/${treeDocId}/file`, {
      method: "GET",
      headers: authHeader(tokenTpdOfficer),
    });
    assert(fileRes.status === 403, `TPD officer downloading TREE app doc file should return 403, got ${fileRes.status}`);

    // TREE officer should succeed
    const treeOfficerRes = await request(`/applications/${treeApp.id}/documents/${treeDocId}/file`, {
      method: "GET",
      headers: authHeader(tokenTreeOfficer),
    });
    assert(treeOfficerRes.status === 200, `TREE officer reading TREE doc should return 200, got ${treeOfficerRes.status}`);
  });

  await test("23. Admin can access documents across departments", async () => {
    const res = await request(`/applications/${appA.id}/documents/${uploadedPdfDoc.id}/file`, {
      method: "GET",
      headers: authHeader(tokenAdmin),
    });
    assert(res.status === 200, `Admin access expected 200, got ${res.status}`);
  });

  // ========================================================================
  // SECTION 4: STATUS RESTRICTIONS (Tests 24-31)
  // ========================================================================
  console.log("\n--- SECTION 4: Application Status Mutation Rules ---");

  let statusApp;

  await test("24. Upload to DRAFT works", async () => {
    statusApp = await createTestApp(tokenCitizenA, parcelA.id, "BUILDING_PERMISSION", "Status workflow app");
    assert(statusApp.status === "DRAFT", "Must be DRAFT");

    const res = await uploadDoc(tokenCitizenA, statusApp.id, {
      buffer: createPdfBuffer("Draft doc"),
      filename: "draft_plan.pdf",
      mimeType: "application/pdf",
      documentType: "SITE_PLAN",
    });
    assert(res.status === 201, `Upload in DRAFT: expected 201, got ${res.status}`);
  });

  await test("25. Upload to SUBMITTED works", async () => {
    await request(`/applications/${statusApp.id}/submit`, {
      method: "PATCH",
      headers: authHeader(tokenCitizenA),
    });

    const res = await uploadDoc(tokenCitizenA, statusApp.id, {
      buffer: createPdfBuffer("Submitted doc"),
      filename: "submitted_plan.pdf",
      mimeType: "application/pdf",
      documentType: "BUILDING_PLAN",
    });
    assert(res.status === 201, `Upload in SUBMITTED: expected 201, got ${res.status}`);
  });

  await test("26. Upload to ADDITIONAL_INFO_REQUIRED works", async () => {
    // Officer starts review
    await request(`/officer/applications/${statusApp.id}/review`, {
      method: "PATCH",
      headers: authHeader(tokenTpdOfficer),
    });

    // Officer requests info
    await request(`/officer/applications/${statusApp.id}/decision`, {
      method: "PATCH",
      headers: { ...authHeader(tokenTpdOfficer), "Content-Type": "application/json" },
      body: JSON.stringify({
        decision: "ADDITIONAL_INFO_REQUIRED",
        decisionRemarks: "Need structural certificate",
      }),
    });

    const res = await uploadDoc(tokenCitizenA, statusApp.id, {
      buffer: createPdfBuffer("Structural certificate"),
      filename: "structural_cert.pdf",
      mimeType: "application/pdf",
      documentType: "OTHER",
    });
    assert(res.status === 201, `Upload in ADDITIONAL_INFO_REQUIRED: expected 201, got ${res.status}`);
  });

  await test("27. Upload to RESUBMITTED works", async () => {
    // Citizen resubmits
    await request(`/applications/${statusApp.id}/resubmit`, {
      method: "PATCH",
      headers: { ...authHeader(tokenCitizenA), "Content-Type": "application/json" },
      body: JSON.stringify({ response: "Attached structural cert" }),
    });

    const res = await uploadDoc(tokenCitizenA, statusApp.id, {
      buffer: createPdfBuffer("Supplementary plan"),
      filename: "supplementary.pdf",
      mimeType: "application/pdf",
      documentType: "OTHER",
    });
    assert(res.status === 201, `Upload in RESUBMITTED: expected 201, got ${res.status}`);
  });

  await test("28. Upload to APPROVED is rejected with 400", async () => {
    // Officer resumes review and approves
    await request(`/officer/applications/${statusApp.id}/review`, {
      method: "PATCH",
      headers: authHeader(tokenTpdOfficer),
    });
    await request(`/officer/applications/${statusApp.id}/decision`, {
      method: "PATCH",
      headers: { ...authHeader(tokenTpdOfficer), "Content-Type": "application/json" },
      body: JSON.stringify({ decision: "APPROVED", decisionRemarks: "All checks passed" }),
    });

    const res = await uploadDoc(tokenCitizenA, statusApp.id, {
      buffer: createPdfBuffer("Post approval"),
      filename: "post_approval.pdf",
      mimeType: "application/pdf",
      documentType: "OTHER",
    });
    assert(res.status === 400, `Upload after APPROVED: expected 400, got ${res.status}`);
  });

  await test("29. Upload to REJECTED is rejected with 400", async () => {
    const rejectApp = await createTestApp(tokenCitizenA, parcelA.id, "BUILDING_PERMISSION", "Reject app");
    await request(`/applications/${rejectApp.id}/submit`, { method: "PATCH", headers: authHeader(tokenCitizenA) });
    await request(`/officer/applications/${rejectApp.id}/review`, { method: "PATCH", headers: authHeader(tokenTpdOfficer) });
    await request(`/officer/applications/${rejectApp.id}/decision`, {
      method: "PATCH",
      headers: { ...authHeader(tokenTpdOfficer), "Content-Type": "application/json" },
      body: JSON.stringify({ decision: "REJECTED", decisionRemarks: "Violates setbacks" }),
    });

    const res = await uploadDoc(tokenCitizenA, rejectApp.id, {
      buffer: createPdfBuffer(),
      filename: "post_reject.pdf",
      mimeType: "application/pdf",
      documentType: "OTHER",
    });
    assert(res.status === 400, `Upload after REJECTED: expected 400, got ${res.status}`);
  });

  await test("30. Delete after APPROVED is rejected with 400", async () => {
    // Fetch one of statusApp's documents
    const listRes = await request(`/applications/${statusApp.id}/documents`, {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    const docId = listRes.body.data[0].id;

    const res = await request(`/applications/${statusApp.id}/documents/${docId}`, {
      method: "DELETE",
      headers: authHeader(tokenCitizenA),
    });
    assert(res.status === 400, `Delete on APPROVED app: expected 400, got ${res.status}`);
  });

  await test("31. Delete after CANCELLED is rejected with 400", async () => {
    const cancelApp = await createTestApp(tokenCitizenA, parcelA.id, "BUILDING_PERMISSION", "Cancel app");
    const docRes = await uploadDoc(tokenCitizenA, cancelApp.id, {
      buffer: createPdfBuffer(),
      filename: "to_be_cancelled.pdf",
      mimeType: "application/pdf",
      documentType: "SITE_PLAN",
    });
    const cancelDocId = docRes.body.data.id;

    // Cancel application
    await request(`/applications/${cancelApp.id}/cancel`, {
      method: "PATCH",
      headers: authHeader(tokenCitizenA),
    });

    const res = await request(`/applications/${cancelApp.id}/documents/${cancelDocId}`, {
      method: "DELETE",
      headers: authHeader(tokenCitizenA),
    });
    assert(res.status === 400, `Delete on CANCELLED app: expected 400, got ${res.status}`);
  });

  // ========================================================================
  // SECTION 5: FILE RETRIEVAL / DOWNLOAD (Tests 32-35)
  // ========================================================================
  console.log("\n--- SECTION 5: File Retrieval & Streaming ---");

  let downloadedBuffer;

  await test("32. Downloaded content matches uploaded content byte-for-byte", async () => {
    const res = await request(`/applications/${appA.id}/documents/${uploadedPdfDoc.id}/file`, {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(res.status === 200, `Download file expected 200, got ${res.status}`);
    downloadedBuffer = res.body;
    assert(Buffer.isBuffer(downloadedBuffer), "Downloaded response must be a Buffer");
    assert(downloadedBuffer.equals(originalPdfBuffer), "Downloaded content must match uploaded buffer exactly");
  });

  await test("33. Correct Content-Type returned", async () => {
    const res = await request(`/applications/${appA.id}/documents/${uploadedPdfDoc.id}/file`, {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    const ct = res.headers.get("content-type");
    assert(ct && ct.includes("application/pdf"), `Content-Type must be application/pdf, got ${ct}`);
  });

  await test("34. Correct Content-Disposition returned", async () => {
    const res = await request(`/applications/${appA.id}/documents/${uploadedPdfDoc.id}/file`, {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    const cd = res.headers.get("content-disposition");
    assert(cd && cd.includes("attachment"), `Content-Disposition must specify attachment, got ${cd}`);
    assert(cd && cd.includes("site_plan_final.pdf"), `Content-Disposition must include filename, got ${cd}`);
  });

  await test("35. Missing physical file returns clean 404", async () => {
    // Create legacy metadata record without physical storage
    const legacyDoc = await prisma.applicationDocument.create({
      data: {
        applicationId: appB.id,
        uploadedById: citizenB.id,
        documentType: "OTHER",
        originalFileName: "legacy_ghost_file.pdf",
        storageKey: `applications/${appB.id}/non_existent_uuid`,
        mimeType: "application/pdf",
        fileSize: 12345,
      },
    });

    // Metadata GET should still work
    const metaRes = await request(`/applications/${appB.id}/documents/${legacyDoc.id}`, {
      method: "GET",
      headers: authHeader(tokenCitizenB),
    });
    assert(metaRes.status === 200, "Metadata GET for legacy record must return 200");

    // File download should return clean 404 without crashing
    const fileRes = await request(`/applications/${appB.id}/documents/${legacyDoc.id}/file`, {
      method: "GET",
      headers: authHeader(tokenCitizenB),
    });
    assert(fileRes.status === 404, `File download for missing physical file must return 404, got ${fileRes.status}`);
    assert(fileRes.body.status === "error", "Response status must be error");
    assert(fileRes.body.message.includes("not found"), "Error message must indicate file not found");
  });

  // ========================================================================
  // SECTION 6: DELETE (Tests 36-38)
  // ========================================================================
  console.log("\n--- SECTION 6: Document Deletion ---");

  let docToDelete;

  await test("36. Delete removes metadata from database", async () => {
    // Upload a doc to delete on appB (which is still in DRAFT)
    const res = await uploadDoc(tokenCitizenB, appB.id, {
      buffer: createPdfBuffer("Delete me"),
      filename: "to_delete.pdf",
      mimeType: "application/pdf",
      documentType: "OTHER",
    });
    assert(res.status === 201, "Upload doc to delete");
    docToDelete = res.body.data;

    // Verify exists in DB
    const beforeDb = await prisma.applicationDocument.findUnique({ where: { id: docToDelete.id } });
    assert(beforeDb !== null, "Doc must exist in DB before delete");

    // Delete
    const delRes = await request(`/applications/${appB.id}/documents/${docToDelete.id}`, {
      method: "DELETE",
      headers: authHeader(tokenCitizenB),
    });
    assert(delRes.status === 200, `Delete doc: expected 200, got ${delRes.status}`);

    // Verify removed from DB
    const afterDb = await prisma.applicationDocument.findUnique({ where: { id: docToDelete.id } });
    assert(afterDb === null, "Doc metadata must be removed from DB");
  });

  await test("37. Delete removes physical file from storage", async () => {
    const exists = storageService.fileExists(docToDelete.storageKey);
    assert(!exists, "Physical file must be deleted from storage");
  });

  await test("38. Missing physical file does not crash deletion", async () => {
    // Create record with missing physical file
    const ghostDoc = await prisma.applicationDocument.create({
      data: {
        applicationId: appB.id,
        uploadedById: citizenB.id,
        documentType: "OTHER",
        originalFileName: "ghost_to_delete.pdf",
        storageKey: `applications/${appB.id}/already_missing_uuid`,
        mimeType: "application/pdf",
        fileSize: 500,
      },
    });

    const delRes = await request(`/applications/${appB.id}/documents/${ghostDoc.id}`, {
      method: "DELETE",
      headers: authHeader(tokenCitizenB),
    });
    assert(delRes.status === 200, `Deleting ghost file must return 200, got ${delRes.status}`);

    const afterDb = await prisma.applicationDocument.findUnique({ where: { id: ghostDoc.id } });
    assert(afterDb === null, "Ghost record must be deleted from DB");
  });

  await test("38b. Simulated filesystem deletion failure returns server error and preserves DB metadata (no silent inconsistency)", async () => {
    // 1. Upload a valid doc for Citizen B
    const upRes = await uploadDoc(tokenCitizenB, appB.id, {
      buffer: createPdfBuffer("FS failure test document"),
      filename: "fs_fail_test.pdf",
      mimeType: "application/pdf",
      documentType: "SITE_PLAN",
    });
    assert(upRes.status === 201, "Upload doc for fs failure test");
    const testDocId = upRes.body.data.id;
    const testStorageKey = upRes.body.data.storageKey;
    assert(storageService.fileExists(testStorageKey), "Physical file must exist before test");

    // 2. Monkeypatch deleteFile to simulate an unexpected filesystem permission/access error
    const originalDeleteFile = storageService.deleteFile;
    storageService.deleteFile = async () => {
      const err = new Error("EACCES: permission denied, unlink");
      err.code = "EACCES";
      throw err;
    };

    let delRes;
    try {
      delRes = await request(`/applications/${appB.id}/documents/${testDocId}`, {
        method: "DELETE",
        headers: authHeader(tokenCitizenB),
      });
    } finally {
      // Always restore original function
      storageService.deleteFile = originalDeleteFile;
    }

    // 3. Assertions: server error returned, DB metadata remains intact, physical file intact
    assert(delRes.status >= 500, `Expected server error >= 500, got ${delRes.status}`);
    const dbDoc = await prisma.applicationDocument.findUnique({ where: { id: testDocId } });
    assert(dbDoc !== null, "DB metadata MUST remain intact when physical deletion fails");
    assert(storageService.fileExists(testStorageKey), "Physical file MUST still be present");

    // 4. Cleanup with restored deleteFile
    const cleanRes = await request(`/applications/${appB.id}/documents/${testDocId}`, {
      method: "DELETE",
      headers: authHeader(tokenCitizenB),
    });
    assert(cleanRes.status === 200, "Cleanup deletion should succeed");
    assert(!storageService.fileExists(testStorageKey), "Cleanup should remove physical file");
  });

  await test("38c. Simulated database deletion failure after physical delete restores physical file via compensation", async () => {
    // 1. Upload a valid doc for Citizen B
    const upRes = await uploadDoc(tokenCitizenB, appB.id, {
      buffer: createPdfBuffer("DB delete failure compensation test"),
      filename: "db_fail_test.pdf",
      mimeType: "application/pdf",
      documentType: "BUILDING_PLAN",
    });
    assert(upRes.status === 201, "Upload doc for compensation test");
    const testDocId = upRes.body.data.id;
    const testStorageKey = upRes.body.data.storageKey;
    assert(storageService.fileExists(testStorageKey), "Physical file must exist before test");

    // 2. Monkeypatch prisma.applicationDocument.delete to simulate a DB crash during delete
    const originalDbDelete = prisma.applicationDocument.delete;
    prisma.applicationDocument.delete = async () => {
      const err = new Error("Simulated database failure during delete transaction");
      err.statusCode = 500;
      throw err;
    };

    let delRes;
    try {
      delRes = await request(`/applications/${appB.id}/documents/${testDocId}`, {
        method: "DELETE",
        headers: authHeader(tokenCitizenB),
      });
    } finally {
      prisma.applicationDocument.delete = originalDbDelete;
    }

    // 3. Assertions: server error returned, physical file restored by compensation, DB record still exists
    assert(delRes.status >= 500, `Expected server error >= 500 on DB failure, got ${delRes.status}`);
    assert(storageService.fileExists(testStorageKey), "Physical file MUST be restored via compensation if DB delete fails");
    const dbDoc = await prisma.applicationDocument.findUnique({ where: { id: testDocId } });
    assert(dbDoc !== null, "DB metadata must still exist");

    // 4. Cleanup
    const cleanRes = await request(`/applications/${appB.id}/documents/${testDocId}`, {
      method: "DELETE",
      headers: authHeader(tokenCitizenB),
    });
    assert(cleanRes.status === 200, "Cleanup deletion should succeed");
    assert(!storageService.fileExists(testStorageKey), "Cleanup should remove physical file");
  });


  // ========================================================================
  // SECTION 7: FAILURE CLEANUP & ATOMICITY (Tests 39-40)
  // ========================================================================
  console.log("\n--- SECTION 7: Failure Cleanup & Atomicity ---");

  await test("39. Simulate metadata creation failure after physical file write and verify physical file cleanup", async () => {
    // Monkey patch prisma.applicationDocument.create to simulate DB failure
    const originalCreate = prisma.applicationDocument.create;
    let interceptedStorageKey = null;

    prisma.applicationDocument.create = async (args) => {
      interceptedStorageKey = args.data.storageKey;
      // Verify physical file was written before DB call
      assert(storageService.fileExists(interceptedStorageKey), "Physical file must exist when DB insert is attempted");
      const dbErr = new Error("Simulated database timeout / crash");
      dbErr.statusCode = 500;
      throw dbErr;
    };

    let uploadFailed = false;
    try {
      const res = await uploadDoc(tokenCitizenB, appB.id, {
        buffer: createPdfBuffer("Atomic failure test"),
        filename: "atomic_test.pdf",
        mimeType: "application/pdf",
        documentType: "SITE_PLAN",
      });
      assert(res.status >= 500, "Should have received 500 error");
      uploadFailed = true;
    } catch {
      uploadFailed = true;
    } finally {
      // Restore original create
      prisma.applicationDocument.create = originalCreate;
    }

    assert(uploadFailed, "Upload must have failed");
    assert(interceptedStorageKey !== null, "Storage key must have been intercepted");

    // CRITICAL: The physical file MUST have been cleaned up by the catch block
    const stillExists = storageService.fileExists(interceptedStorageKey);
    assert(!stillExists, "Physical file MUST be deleted if database metadata creation fails");
  });

  await test("40. Unauthorized/invalid uploads do not leave files behind", async () => {
    // Count files in appB directory before
    const appBDir = path.resolve(storageService.getStorageRoot(), `applications/${appB.id}`);
    const countBefore = fs.existsSync(appBDir) ? fs.readdirSync(appBDir).length : 0;

    // Attempt unauthorized upload (Citizen A on Citizen B's app)
    await uploadDoc(tokenCitizenA, appB.id, {
      buffer: createPdfBuffer("Unauthorized payload"),
      filename: "unauthorized.pdf",
      mimeType: "application/pdf",
      documentType: "SITE_PLAN",
    });

    // Attempt invalid MIME upload
    await uploadDoc(tokenCitizenB, appB.id, {
      buffer: Buffer.from("plain text"),
      filename: "bad.txt",
      mimeType: "text/plain",
      documentType: "SITE_PLAN",
    });

    const countAfter = fs.existsSync(appBDir) ? fs.readdirSync(appBDir).length : 0;
    assert(countBefore === countAfter, "No files should be added on unauthorized/invalid upload attempts");
  });

  // ========================================================================
  // SECTION 8: REGRESSION TESTING (Tests 41-45)
  // ========================================================================
  console.log("\n--- SECTION 8: Regression Testing ---");

  await test("41. Application History compatibility test", async () => {
    const histRes = await request(`/applications/${appA.id}/history`, {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(histRes.status === 200, "History GET 200");
    assert(Array.isArray(histRes.body.data), "History array returned");
  });

  await test("42. In-App Notifications compatibility test", async () => {
    const notifRes = await request("/notifications", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(notifRes.status === 200, "Notifications GET 200");
  });

  await test("43. Officer workflow inbox compatibility test", async () => {
    const inboxRes = await request("/officer/applications?status=APPROVED", {
      method: "GET",
      headers: authHeader(tokenTpdOfficer),
    });
    assert(inboxRes.status === 200, "Officer inbox GET 200");
  });

  await test("44. Parcel & ownership APIs compatibility test", async () => {
    const parcelRes = await request(`/parcels/${parcelA.id}`, {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(parcelRes.status === 200, "Parcel GET 200");

    const myPropsRes = await request("/ownerships/my-properties", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(myPropsRes.status === 200, "My properties GET 200");
  });

  await test("45. Authentication endpoints compatibility test", async () => {
    const meRes = await request("/auth/me", {
      method: "GET",
      headers: authHeader(tokenCitizenA),
    });
    assert(meRes.status === 200, "Auth /me GET 200");
    assert(meRes.body.user.email === citizenA.email, "User email matched");
  });

  console.log("\n==================================================");
  console.log(`ALL ${testCount} APPLICATION DOCUMENT TESTS PASSED!`);
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
