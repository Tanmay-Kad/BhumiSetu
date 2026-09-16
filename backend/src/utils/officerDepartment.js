const getOfficerDepartment = async (prismaClient, userId) => {
  const officer = await prismaClient.user.findUnique({
    where: { id: userId },
    select: { department: true, isActive: true },
  });

  if (!officer || !officer.isActive || !officer.department) {
    return null;
  }

  return prismaClient.department.findUnique({
    where: { code: officer.department },
    select: { id: true, name: true, code: true, isActive: true },
  });
};

module.exports = {
  getOfficerDepartment,
};
