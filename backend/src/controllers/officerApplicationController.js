const prisma = require("../utils/prisma");
const { getOfficerDepartment } = require("../utils/officerDepartment");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const APPLICATION_TYPES = new Set([
  "BUILDING_PERMISSION",
  "TREE_CUTTING",
  "UTILITY_CONNECTION",
  "LAND_USE_CHANGE",
  "OTHER",
]);
const APPLICATION_STATUSES = new Set([
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "ADDITIONAL_INFO_REQUIRED",
  "RESUBMITTED",
  "APPROVED",
  "APPROVED_WITH_CONDITIONS",
  "REJECTED",
  "COMPLETED",
  "CANCELLED",
]);
const DEFAULT_INBOX_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "ADDITIONAL_INFO_REQUIRED",
  "RESUBMITTED",
];
const MAX_PAGE_SIZE = 100;
const MAX_REVIEW_REMARKS_LENGTH = 2000;
const REVIEWABLE_APPLICATION_STATUSES = ["SUBMITTED", "RESUBMITTED"];
const DECISION_STATUS_MAP = Object.freeze({
  APPROVED: "APPROVED",
  APPROVED_WITH_CONDITIONS: "APPROVED_WITH_CONDITIONS",
  REJECTED: "REJECTED",
  ADDITIONAL_INFO_REQUIRED: "ADDITIONAL_INFO_REQUIRED",
});
const DECISIONS_REQUIRING_REMARKS = new Set([
  "APPROVED_WITH_CONDITIONS",
  "REJECTED",
  "ADDITIONAL_INFO_REQUIRED",
]);

const officerInboxSelect = {
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
  citizen: {
    select: {
      id: true,
      name: true,
      email: true,
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

const reviewApplicationSelect = {
  id: true,
  applicationNumber: true,
  type: true,
  status: true,
  reviewRemarks: true,
  reviewedAt: true,
  assignedOfficer: {
    select: {
      id: true,
      name: true,
      email: true,
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

const decisionApplicationSelect = {
  id: true,
  applicationNumber: true,
  type: true,
  status: true,
  reviewedAt: true,
  decisionAt: true,
  reviewRemarks: true,
  decisionRemarks: true,
  assignedOfficer: {
    select: {
      id: true,
      name: true,
      email: true,
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

const isValidId = (value) => typeof value === "string" && UUID_PATTERN.test(value);

const parsePositiveInteger = (value, fieldName, defaultValue, maximum) => {
  if (value === undefined) {
    return { value: defaultValue };
  }

  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return { error: `${fieldName} must be a positive integer` };
  }

  const parsedValue = Number(value);
  if (!Number.isSafeInteger(parsedValue) || parsedValue < 1 || parsedValue > maximum) {
    return { error: `${fieldName} must be between 1 and ${maximum}` };
  }

  return { value: parsedValue };
};

const parseInboxFilters = (query) => {
  const page = parsePositiveInteger(query.page, "page", 1, Number.MAX_SAFE_INTEGER);
  const limit = parsePositiveInteger(query.limit, "limit", 20, MAX_PAGE_SIZE);

  if (page.error || limit.error) {
    return { error: page.error || limit.error };
  }

  if (query.status !== undefined && (!APPLICATION_STATUSES.has(query.status) || typeof query.status !== "string")) {
    return { error: "status must be a valid application status" };
  }

  if (query.type !== undefined && (!APPLICATION_TYPES.has(query.type) || typeof query.type !== "string")) {
    return { error: "type must be a valid application type" };
  }

  if (query.departmentId !== undefined && !isValidId(query.departmentId)) {
    return { error: "departmentId must be a valid UUID" };
  }

  return {
    value: {
      page: page.value,
      limit: limit.value,
      status: query.status,
      type: query.type,
      departmentId: query.departmentId,
    },
  };
};

const getOfficerApplications = async (req, res, next) => {
  try {
    const parsedFilters = parseInboxFilters(req.query);
    if (parsedFilters.error) {
      return res.status(400).json({ status: "error", message: parsedFilters.error });
    }

    const filters = parsedFilters.value;
    const where = {
      status: filters.status ? filters.status : { in: DEFAULT_INBOX_STATUSES },
      ...(filters.type ? { type: filters.type } : {}),
    };

    if (req.user.role === "OFFICER") {
      if (filters.departmentId) {
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

      where.departmentId = department.id;
    } else if (filters.departmentId) {
      where.departmentId = filters.departmentId;
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        select: officerInboxSelect,
        orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.application.count({ where }),
    ]);

    return res.status(200).json({
      status: "success",
      data: applications,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getReviewRemarks = (body = {}) => {
  if (body.reviewRemarks === undefined) {
    return { value: undefined };
  }

  if (typeof body.reviewRemarks !== "string") {
    return { error: "reviewRemarks must be a string" };
  }

  const reviewRemarks = body.reviewRemarks.trim();
  if (reviewRemarks.length > MAX_REVIEW_REMARKS_LENGTH) {
    return { error: `reviewRemarks must not exceed ${MAX_REVIEW_REMARKS_LENGTH} characters` };
  }

  return { value: reviewRemarks };
};

const startApplicationReview = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const parsedRemarks = getReviewRemarks(req.body);

    if (!isValidId(applicationId)) {
      return res.status(400).json({ status: "error", message: "A valid applicationId is required" });
    }

    if (parsedRemarks.error) {
      return res.status(400).json({ status: "error", message: parsedRemarks.error });
    }

    const officerDepartment =
      req.user.role === "OFFICER" ? await getOfficerDepartment(prisma, req.user.id) : null;

    if (req.user.role === "OFFICER" && (!officerDepartment || !officerDepartment.isActive)) {
      return res.status(403).json({
        status: "error",
        message: "No active department is configured for this officer",
      });
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true, departmentId: true, status: true },
    });

    if (!application) {
      return res.status(404).json({ status: "error", message: "Application not found" });
    }

    if (req.user.role === "OFFICER" && application.departmentId !== officerDepartment.id) {
      return res.status(403).json({
        status: "error",
        message: "You are not authorized to review applications for another department",
      });
    }

    if (!REVIEWABLE_APPLICATION_STATUSES.includes(application.status)) {
      return res.status(400).json({
        status: "error",
        message: "Only submitted or resubmitted applications can be moved to under review",
      });
    }

    const updatedApplication = await prisma.$transaction(async (transaction) => {
      const updateResult = await transaction.application.updateMany({
        where: {
          id: applicationId,
          status: { in: REVIEWABLE_APPLICATION_STATUSES },
          ...(req.user.role === "OFFICER" ? { departmentId: officerDepartment.id } : {}),
        },
        data: {
          status: "UNDER_REVIEW",
          assignedOfficerId: req.user.id,
          reviewedAt: new Date(),
          ...(parsedRemarks.value === undefined ? {} : { reviewRemarks: parsedRemarks.value }),
        },
      });

      if (updateResult.count !== 1) {
        const error = new Error("Application is no longer available to start review");
        error.statusCode = 409;
        throw error;
      }

      return transaction.application.findUnique({
        where: { id: applicationId },
        select: reviewApplicationSelect,
      });
    });

    return res.status(200).json({
      status: "success",
      message: "Application review started",
      data: updatedApplication,
    });
  } catch (error) {
    return next(error);
  }
};

const parseDecisionInput = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "A valid decision request body is required" };
  }

  if (typeof body.decision !== "string" || !DECISION_STATUS_MAP[body.decision]) {
    return { error: "decision must be APPROVED, APPROVED_WITH_CONDITIONS, REJECTED, or ADDITIONAL_INFO_REQUIRED" };
  }

  if (body.decisionRemarks !== undefined && typeof body.decisionRemarks !== "string") {
    return { error: "decisionRemarks must be a string" };
  }

  const decisionRemarks = body.decisionRemarks?.trim();
  if (decisionRemarks && decisionRemarks.length > MAX_REVIEW_REMARKS_LENGTH) {
    return { error: `decisionRemarks must not exceed ${MAX_REVIEW_REMARKS_LENGTH} characters` };
  }

  if (DECISIONS_REQUIRING_REMARKS.has(body.decision) && !decisionRemarks) {
    return { error: `decisionRemarks is required when decision is ${body.decision}` };
  }

  return {
    value: {
      decision: body.decision,
      status: DECISION_STATUS_MAP[body.decision],
      decisionRemarks,
    },
  };
};

const recordApplicationDecision = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const parsedDecision = parseDecisionInput(req.body);

    if (!isValidId(applicationId)) {
      return res.status(400).json({ status: "error", message: "A valid applicationId is required" });
    }

    if (parsedDecision.error) {
      return res.status(400).json({ status: "error", message: parsedDecision.error });
    }

    const officerDepartment =
      req.user.role === "OFFICER" ? await getOfficerDepartment(prisma, req.user.id) : null;

    if (req.user.role === "OFFICER" && (!officerDepartment || !officerDepartment.isActive)) {
      return res.status(403).json({
        status: "error",
        message: "No active department is configured for this officer",
      });
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true, departmentId: true, assignedOfficerId: true, status: true },
    });

    if (!application) {
      return res.status(404).json({ status: "error", message: "Application not found" });
    }

    if (req.user.role === "OFFICER" && application.departmentId !== officerDepartment.id) {
      return res.status(403).json({
        status: "error",
        message: "You are not authorized to decide applications for another department",
      });
    }

    if (req.user.role === "OFFICER" && application.assignedOfficerId !== req.user.id) {
      return res.status(403).json({
        status: "error",
        message: "You are not assigned to this application",
      });
    }

    if (application.status !== "UNDER_REVIEW") {
      return res.status(400).json({
        status: "error",
        message: "Only applications under review can receive a decision",
      });
    }

    const { status, decisionRemarks } = parsedDecision.value;
    const updatedApplication = await prisma.$transaction(async (transaction) => {
      const updateResult = await transaction.application.updateMany({
        where: {
          id: applicationId,
          status: "UNDER_REVIEW",
          ...(req.user.role === "OFFICER"
            ? {
                departmentId: officerDepartment.id,
                assignedOfficerId: req.user.id,
              }
            : {}),
        },
        data: {
          status,
          decisionAt: new Date(),
          ...(decisionRemarks === undefined ? {} : { decisionRemarks }),
        },
      });

      if (updateResult.count !== 1) {
        const error = new Error("Application is no longer available for a decision");
        error.statusCode = 409;
        throw error;
      }

      return transaction.application.findUnique({
        where: { id: applicationId },
        select: decisionApplicationSelect,
      });
    });

    return res.status(200).json({
      status: "success",
      message: "Application decision recorded",
      data: updatedApplication,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getOfficerApplications,
  startApplicationReview,
  recordApplicationDecision,
};
