require("dotenv").config();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const baseUrl = "http://localhost:5000/api/v1";

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();
  return { status: response.status, body };
};

const createToken = (user) =>
  jwt.sign({ sub: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "5m",
  });

const main = async () => {
  const [citizen, resubmissionApplication, submittedApplication, approvedApplication, treeDepartment] = await Promise.all([
    prisma.user.findFirst({
      where: { role: "CITIZEN" },
      select: { id: true, email: true, role: true },
    }),
    prisma.application.findFirst({
      where: { status: "ADDITIONAL_INFO_REQUIRED" },
      select: {
        id: true,
        applicationNumber: true,
        departmentId: true,
        assignedOfficerId: true,
        decisionAt: true,
        decisionRemarks: true,
      },
    }),
    prisma.application.findFirst({ where: { status: "SUBMITTED" }, select: { id: true } }),
    prisma.application.findFirst({ where: { status: "APPROVED" }, select: { id: true } }),
    prisma.department.findUnique({ where: { code: "TREE" }, select: { id: true } }),
  ]);

  if (!citizen || !resubmissionApplication || !submittedApplication || !approvedApplication || !treeDepartment) {
    throw new Error("Required citizen, workflow applications, and TREE department were not found");
  }

  const otherCitizen = await prisma.user.upsert({
    where: { email: "citizen.resubmit.test@bhumisetu.local" },
    create: {
      name: "Resubmission Test Citizen",
      email: "citizen.resubmit.test@bhumisetu.local",
      passwordHash: await bcrypt.hash("CitizenTest@123", 12),
      role: "CITIZEN",
      isActive: true,
    },
    update: {
      name: "Resubmission Test Citizen",
      role: "CITIZEN",
      isActive: true,
    },
    select: { id: true, email: true, role: true },
  });

  const citizenToken = createToken(citizen);
  const otherCitizenToken = createToken(otherCitizen);
  const citizenHeaders = {
    Authorization: `Bearer ${citizenToken}`,
    "Content-Type": "application/json",
  };

  const officerLogin = await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "officer.tpd@bhumisetu.local",
      password: "Officer@123",
    }),
  });
  if (officerLogin.status !== 200) {
    throw new Error("Unable to authenticate the TPD officer");
  }

  const noJwt = await request(`/applications/${resubmissionApplication.id}/resubmit`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response: "No token" }),
  });
  const officerAttempt = await request(`/applications/${resubmissionApplication.id}/resubmit`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${officerLogin.body.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ response: "Officer attempt" }),
  });
  const otherCitizenAttempt = await request(`/applications/${resubmissionApplication.id}/resubmit`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${otherCitizenToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ response: "Other citizen attempt" }),
  });
  const emptyResponse = await request(`/applications/${resubmissionApplication.id}/resubmit`, {
    method: "PATCH",
    headers: citizenHeaders,
    body: JSON.stringify({ response: "" }),
  });
  const whitespaceResponse = await request(`/applications/${resubmissionApplication.id}/resubmit`, {
    method: "PATCH",
    headers: citizenHeaders,
    body: JSON.stringify({ response: "   \n  " }),
  });
  const longResponse = await request(`/applications/${resubmissionApplication.id}/resubmit`, {
    method: "PATCH",
    headers: citizenHeaders,
    body: JSON.stringify({ response: "x".repeat(5001) }),
  });
  const submittedAttempt = await request(`/applications/${submittedApplication.id}/resubmit`, {
    method: "PATCH",
    headers: citizenHeaders,
    body: JSON.stringify({ response: "Attempt on submitted application" }),
  });
  const approvedAttempt = await request(`/applications/${approvedApplication.id}/resubmit`, {
    method: "PATCH",
    headers: citizenHeaders,
    body: JSON.stringify({ response: "Attempt on approved application" }),
  });
  const validResubmission = await request(`/applications/${resubmissionApplication.id}/resubmit`, {
    method: "PATCH",
    headers: citizenHeaders,
    body: JSON.stringify({
      response: "I have provided the requested clarification regarding the proposed building height.",
      departmentId: treeDepartment.id,
      assignedOfficerId: otherCitizen.id,
      citizenId: otherCitizen.id,
      status: "APPROVED",
      decisionRemarks: "Attempted overwrite",
    }),
  });
  const afterResubmission = await prisma.application.findUnique({
    where: { id: resubmissionApplication.id },
    select: {
      status: true,
      applicationNumber: true,
      departmentId: true,
      assignedOfficerId: true,
      decisionAt: true,
      decisionRemarks: true,
      citizenResponse: true,
    },
  });
  const officerInbox = await request("/officer/applications?status=RESUBMITTED", {
    headers: { Authorization: `Bearer ${officerLogin.body.token}` },
  });
  const inboxEntry = officerInbox.body.data.find(
    (application) => application.id === resubmissionApplication.id,
  );
  const citizenApplications = await request("/applications/my", {
    headers: { Authorization: `Bearer ${citizenToken}` },
  });

  console.log(
    JSON.stringify(
      {
        noJwtStatus: noJwt.status,
        officerAttemptStatus: officerAttempt.status,
        otherCitizenAttemptStatus: otherCitizenAttempt.status,
        emptyResponseStatus: emptyResponse.status,
        whitespaceResponseStatus: whitespaceResponse.status,
        longResponseStatus: longResponse.status,
        submittedAttemptStatus: submittedAttempt.status,
        approvedAttemptStatus: approvedAttempt.status,
        validResubmission: validResubmission.body.data,
        preservedFields: {
          applicationNumberUnchanged:
            afterResubmission.applicationNumber === resubmissionApplication.applicationNumber,
          departmentUnchanged: afterResubmission.departmentId === resubmissionApplication.departmentId,
          assignedOfficerUnchanged:
            afterResubmission.assignedOfficerId === resubmissionApplication.assignedOfficerId,
          decisionAtUnchanged:
            afterResubmission.decisionAt?.toISOString() === resubmissionApplication.decisionAt?.toISOString(),
          decisionRemarksUnchanged:
            afterResubmission.decisionRemarks === resubmissionApplication.decisionRemarks,
        },
        inboxContainsResubmission: Boolean(inboxEntry),
        inboxDepartment: inboxEntry?.department ?? null,
        inboxAssignedOfficer: inboxEntry?.assignedOfficer ?? null,
        citizenApplicationsStatus: citizenApplications.status,
      },
      null,
      2,
    ),
  );
};

main()
  .catch((error) => {
    console.error("Citizen resubmission test failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
