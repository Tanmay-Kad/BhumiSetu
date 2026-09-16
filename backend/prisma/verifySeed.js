require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const requiredDepartmentCodes = ["TPD", "TREE", "REV", "UTIL"];
const officerEmail = "officer.tpd@bhumisetu.local";

const main = async () => {
  const [departments, officer, citizenCount, applicationCount] = await Promise.all([
    prisma.department.findMany({
      where: { code: { in: requiredDepartmentCodes } },
      select: { name: true, code: true, description: true, isActive: true },
      orderBy: { code: "asc" },
    }),
    prisma.user.findUnique({
      where: { email: officerEmail },
      select: { email: true, role: true, department: true, isActive: true },
    }),
    prisma.user.count({ where: { role: "CITIZEN" } }),
    prisma.application.count(),
  ]);

  const allDepartmentsPresent = requiredDepartmentCodes.every((code) =>
    departments.some((department) => department.code === code),
  );
  const officerIsConfigured =
    officer?.role === "OFFICER" && officer.department === "TPD" && officer.isActive;

  const result = {
    allDepartmentsPresent,
    officerIsConfigured,
    departments,
    officer,
    existingDataCounts: {
      citizens: citizenCount,
      applications: applicationCount,
    },
  };

  console.log(JSON.stringify(result, null, 2));

  if (!allDepartmentsPresent || !officerIsConfigured) {
    process.exitCode = 1;
  }
};

main()
  .catch((error) => {
    console.error("BhumiSetu seed verification failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
