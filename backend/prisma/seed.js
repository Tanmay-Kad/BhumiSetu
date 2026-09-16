require("dotenv").config();

const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

const departments = [
  {
    name: "Town Planning Department",
    code: "TPD",
    description: "Handles building permissions and related planning approvals.",
  },
  {
    name: "Tree Authority",
    code: "TREE",
    description: "Handles tree cutting, tree relocation, and compensatory plantation requests.",
  },
  {
    name: "Revenue Department",
    code: "REV",
    description: "Handles land-use changes, mutation, and related revenue services.",
  },
  {
    name: "Public Works / Utilities",
    code: "UTIL",
    description: "Handles utility connection related requests.",
  },
];

const officer = {
  name: "Town Planning Officer",
  email: "officer.tpd@bhumisetu.local",
  password: "Officer@123",
  role: "OFFICER",
  department: "TPD",
};

const seedDepartments = async () => {
  await Promise.all(
    departments.map((department) =>
      prisma.department.upsert({
        where: { code: department.code },
        create: {
          ...department,
          isActive: true,
        },
        update: {
          name: department.name,
          description: department.description,
          isActive: true,
        },
      }),
    ),
  );
};

const seedOfficer = async () => {
  const existingOfficer = await prisma.user.findUnique({
    where: { email: officer.email },
    select: { id: true, passwordHash: true },
  });

  const passwordMatches =
    existingOfficer && (await bcrypt.compare(officer.password, existingOfficer.passwordHash));
  const passwordHash = passwordMatches
    ? existingOfficer.passwordHash
    : await bcrypt.hash(officer.password, SALT_ROUNDS);

  await prisma.user.upsert({
    where: { email: officer.email },
    create: {
      name: officer.name,
      email: officer.email,
      passwordHash,
      role: officer.role,
      department: officer.department,
      isActive: true,
    },
    update: {
      name: officer.name,
      role: officer.role,
      department: officer.department,
      isActive: true,
      ...(!passwordMatches ? { passwordHash } : {}),
    },
  });
};

const main = async () => {
  await seedDepartments();
  await seedOfficer();

  console.log("BhumiSetu development seed completed.");
};

main()
  .catch((error) => {
    console.error("BhumiSetu development seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
