const prisma = require("../utils/prisma");

const citizenRecentApplicationSelect = {
  id: true,
  applicationNumber: true,
  type: true,
  status: true,
  description: true,
  submittedAt: true,
  createdAt: true,
  updatedAt: true,
  parcel: {
    select: {
      id: true,
      ulpin: true,
      surveyNumber: true,
      village: true,
      taluk: true,
      district: true,
      area: true,
      landUse: true,
      zoning: true,
    },
  },
  department: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
};

const officerRecentApplicationSelect = {
  id: true,
  applicationNumber: true,
  type: true,
  status: true,
  description: true,
  submittedAt: true,
  createdAt: true,
  updatedAt: true,
  citizen: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  parcel: {
    select: {
      id: true,
      ulpin: true,
      surveyNumber: true,
      village: true,
      taluk: true,
      district: true,
      area: true,
      landUse: true,
      zoning: true,
    },
  },
  department: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  assignedOfficer: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

/**
 * Retrieves dashboard summary data for an authenticated citizen.
 *
 * @param {string} citizenId - The authenticated citizen's UUID
 * @returns {Promise<object>} Citizen dashboard data
 */
const getCitizenDashboardData = async (citizenId) => {
  const [
    statusGroups,
    totalApplications,
    ownedParcelsCount,
    unreadNotificationsCount,
    recentApplications,
  ] = await Promise.all([
    prisma.application.groupBy({
      by: ["status"],
      where: { citizenId },
      _count: { status: true },
    }),
    prisma.application.count({
      where: { citizenId },
    }),
    prisma.ownership.count({
      where: { userId: citizenId },
    }),
    prisma.notification.count({
      where: { userId: citizenId, isRead: false },
    }),
    prisma.application.findMany({
      where: { citizenId },
      select: citizenRecentApplicationSelect,
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const counts = {
    DRAFT: 0,
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    ADDITIONAL_INFO_REQUIRED: 0,
    RESUBMITTED: 0,
    APPROVED: 0,
    APPROVED_WITH_CONDITIONS: 0,
    REJECTED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  for (const group of statusGroups) {
    if (counts[group.status] !== undefined) {
      counts[group.status] = group._count.status;
    }
  }

  const summary = {
    totalApplications,
    draftApplications: counts.DRAFT,
    submittedApplications: counts.SUBMITTED,
    underReviewApplications: counts.UNDER_REVIEW,
    additionalInfoRequired: counts.ADDITIONAL_INFO_REQUIRED,
    resubmittedApplications: counts.RESUBMITTED,
    approvedApplications: counts.APPROVED + counts.APPROVED_WITH_CONDITIONS,
    rejectedApplications: counts.REJECTED,
    completedApplications: counts.COMPLETED,
    cancelledApplications: counts.CANCELLED,
  };

  return {
    summary,
    parcels: {
      ownedCount: ownedParcelsCount,
    },
    notifications: {
      unreadCount: unreadNotificationsCount,
    },
    recentApplications,
  };
};

/**
 * Retrieves dashboard summary data for an officer or administrator.
 *
 * @param {object} options
 * @param {object|null} options.department - Officer's department object (if role === OFFICER)
 * @param {boolean} options.isAdmin - Whether caller is ADMIN
 * @param {string|null} options.departmentIdFilter - Department UUID filter if admin provided it
 * @returns {Promise<object>} Officer/Admin dashboard data
 */
const getOfficerDashboardData = async ({ department = null, isAdmin = false, departmentIdFilter = null }) => {
  const where = {};

  if (!isAdmin && department) {
    where.departmentId = department.id;
  } else if (isAdmin && departmentIdFilter) {
    where.departmentId = departmentIdFilter;
  }

  const queries = [
    prisma.application.groupBy({
      by: ["status"],
      where,
      _count: { status: true },
    }),
    prisma.application.count({
      where,
    }),
    prisma.application.findMany({
      where,
      select: officerRecentApplicationSelect,
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ];

  // If admin is requesting without a specific department filter, include system-wide department breakdown
  if (isAdmin) {
    queries.push(
      prisma.department.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      }),
      prisma.application.groupBy({
        by: ["departmentId", "status"],
        where: { departmentId: { not: null } },
        _count: { status: true },
      })
    );
  }

  const results = await Promise.all(queries);
  const statusGroups = results[0];
  const totalApplications = results[1];
  const recentApplications = results[2];

  const counts = {
    DRAFT: 0,
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    ADDITIONAL_INFO_REQUIRED: 0,
    RESUBMITTED: 0,
    APPROVED: 0,
    APPROVED_WITH_CONDITIONS: 0,
    REJECTED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  for (const group of statusGroups) {
    if (counts[group.status] !== undefined) {
      counts[group.status] = group._count.status;
    }
  }

  const summary = {
    totalApplications,
    submitted: counts.SUBMITTED,
    underReview: counts.UNDER_REVIEW,
    additionalInfoRequired: counts.ADDITIONAL_INFO_REQUIRED,
    resubmitted: counts.RESUBMITTED,
    approved: counts.APPROVED,
    approvedWithConditions: counts.APPROVED_WITH_CONDITIONS,
    rejected: counts.REJECTED,
    completed: counts.COMPLETED,
    draft: counts.DRAFT,
    cancelled: counts.CANCELLED,
  };

  const workload = {
    pendingReview: counts.SUBMITTED + counts.RESUBMITTED,
    inReview: counts.UNDER_REVIEW,
    awaitingCitizen: counts.ADDITIONAL_INFO_REQUIRED,
    actionRequired: counts.SUBMITTED + counts.RESUBMITTED + counts.UNDER_REVIEW,
  };

  let departmentData = null;
  if (!isAdmin && department) {
    departmentData = {
      id: department.id,
      name: department.name,
      code: department.code,
    };
  } else if (isAdmin && departmentIdFilter) {
    const filteredDept = await prisma.department.findUnique({
      where: { id: departmentIdFilter },
      select: { id: true, name: true, code: true },
    });
    departmentData = filteredDept ? {
      id: filteredDept.id,
      name: filteredDept.name,
      code: filteredDept.code,
    } : null;
  }

  const responseData = {
    summary,
    workload,
    recentApplications,
    department: departmentData,
  };

  if (isAdmin) {
    const allDepartments = results[3] || [];
    const deptStatusGroups = results[4] || [];

    // Map department counts
    const deptMap = new Map();
    for (const d of allDepartments) {
      deptMap.set(d.id, {
        departmentId: d.id,
        departmentName: d.name,
        departmentCode: d.code,
        applicationCount: 0,
        pendingCount: 0,
      });
    }

    const PENDING_STATUSES = new Set(["SUBMITTED", "RESUBMITTED", "UNDER_REVIEW"]);
    for (const group of deptStatusGroups) {
      const dept = deptMap.get(group.departmentId);
      if (dept) {
        const c = group._count.status;
        dept.applicationCount += c;
        if (PENDING_STATUSES.has(group.status)) {
          dept.pendingCount += c;
        }
      }
    }

    responseData.departments = Array.from(deptMap.values());
  }

  return responseData;
};

module.exports = {
  getCitizenDashboardData,
  getOfficerDashboardData,
};
