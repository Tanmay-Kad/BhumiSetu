const APPLICATION_DEPARTMENT_CODES = Object.freeze({
  BUILDING_PERMISSION: "TPD",
  TREE_CUTTING: "TREE",
  LAND_USE_CHANGE: "REV",
  UTILITY_CONNECTION: "UTIL",
});

const getDepartmentCodeForApplicationType = (applicationType) =>
  APPLICATION_DEPARTMENT_CODES[applicationType] ?? null;

const resolveRoutedDepartment = async (prismaClient, applicationType) => {
  const departmentCode = getDepartmentCodeForApplicationType(applicationType);

  if (!departmentCode) {
    return null;
  }

  const department = await prismaClient.department.findUnique({
    where: { code: departmentCode },
    select: { id: true, code: true, isActive: true },
  });

  if (!department || !department.isActive) {
    const error = new Error(`Active routing department '${departmentCode}' is not available`);
    error.statusCode = 500;
    throw error;
  }

  return department;
};

module.exports = {
  getDepartmentCodeForApplicationType,
  resolveRoutedDepartment,
};
