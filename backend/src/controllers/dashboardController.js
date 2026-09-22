const prisma = require("../utils/prisma");
const { getOfficerDepartment } = require("../utils/officerDepartment");
const {
  getCitizenDashboardData,
  getOfficerDashboardData,
} = require("../services/dashboardService");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidId = (value) => typeof value === "string" && UUID_PATTERN.test(value);

/**
 * Controller for GET /api/v1/dashboard/citizen
 * Retrieves dashboard summary for the authenticated citizen.
 */
const getCitizenDashboard = async (req, res, next) => {
  try {
    const dashboardData = await getCitizenDashboardData(req.user.id);

    return res.status(200).json({
      status: "success",
      data: dashboardData,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller for GET /api/v1/dashboard/officer
 * Retrieves dashboard summary for the authenticated officer (department-scoped) or admin (system-wide/filtered).
 */
const getOfficerDashboard = async (req, res, next) => {
  try {
    if (req.user.role === "OFFICER") {
      if (req.query.departmentId !== undefined) {
        return res.status(400).json({
          status: "error",
          message: "departmentId filtering is only available to administrators",
        });
      }

      const department = await getOfficerDepartment(prisma, req.user.id);
      if (!department || !department.isActive) {
        return res.status(403).json({
          status: "error",
          message: "No active department is configured for this officer",
        });
      }

      const dashboardData = await getOfficerDashboardData({
        department,
        isAdmin: false,
      });

      return res.status(200).json({
        status: "success",
        data: dashboardData,
      });
    }

    // Role is ADMIN
    let departmentIdFilter = null;
    if (req.query.departmentId !== undefined) {
      if (!isValidId(req.query.departmentId)) {
        return res.status(400).json({
          status: "error",
          message: "departmentId must be a valid UUID",
        });
      }

      const deptExists = await prisma.department.findUnique({
        where: { id: req.query.departmentId },
        select: { id: true },
      });

      if (!deptExists) {
        return res.status(404).json({
          status: "error",
          message: "Department not found",
        });
      }

      departmentIdFilter = req.query.departmentId;
    }

    const dashboardData = await getOfficerDashboardData({
      department: null,
      isAdmin: true,
      departmentIdFilter,
    });

    return res.status(200).json({
      status: "success",
      data: dashboardData,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getCitizenDashboard,
  getOfficerDashboard,
};
