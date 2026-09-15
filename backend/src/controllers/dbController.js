const prisma = require("../utils/prisma");

const testDb = async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "OK",
      message: "Prisma connected to the database",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  testDb,
};
