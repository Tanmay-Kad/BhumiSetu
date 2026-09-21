const prisma = require("../utils/prisma");
const { createApplicationNotification } = require("./notificationService");

const APPLICATION_ACTIONS = Object.freeze({
  APPLICATION_CREATED: "APPLICATION_CREATED",
  APPLICATION_SUBMITTED: "APPLICATION_SUBMITTED",
  REVIEW_STARTED: "REVIEW_STARTED",
  ADDITIONAL_INFO_REQUESTED: "ADDITIONAL_INFO_REQUESTED",
  APPLICATION_RESUBMITTED: "APPLICATION_RESUBMITTED",
  APPLICATION_APPROVED: "APPLICATION_APPROVED",
  APPLICATION_APPROVED_WITH_CONDITIONS: "APPLICATION_APPROVED_WITH_CONDITIONS",
  APPLICATION_REJECTED: "APPLICATION_REJECTED",
  APPLICATION_CANCELLED: "APPLICATION_CANCELLED",
});

const TRANSITION_RULES = Object.freeze({
  APPLICATION_CREATED: {
    allowedFrom: [null],
    toStatus: "DRAFT",
  },
  APPLICATION_SUBMITTED: {
    allowedFrom: ["DRAFT"],
    toStatus: "SUBMITTED",
  },
  REVIEW_STARTED: {
    allowedFrom: ["SUBMITTED", "RESUBMITTED"],
    toStatus: "UNDER_REVIEW",
  },
  ADDITIONAL_INFO_REQUESTED: {
    allowedFrom: ["UNDER_REVIEW"],
    toStatus: "ADDITIONAL_INFO_REQUIRED",
  },
  APPLICATION_RESUBMITTED: {
    allowedFrom: ["ADDITIONAL_INFO_REQUIRED"],
    toStatus: "RESUBMITTED",
  },
  APPLICATION_APPROVED: {
    allowedFrom: ["UNDER_REVIEW"],
    toStatus: "APPROVED",
  },
  APPLICATION_APPROVED_WITH_CONDITIONS: {
    allowedFrom: ["UNDER_REVIEW"],
    toStatus: "APPROVED_WITH_CONDITIONS",
  },
  APPLICATION_REJECTED: {
    allowedFrom: ["UNDER_REVIEW"],
    toStatus: "REJECTED",
  },
  APPLICATION_CANCELLED: {
    allowedFrom: ["DRAFT", "SUBMITTED"],
    toStatus: "CANCELLED",
  },
});

const createApplicationWithHistory = async ({
  data,
  actorId,
  select,
  prismaClient = prisma,
}) => {
  return prismaClient.$transaction(async (tx) => {
    const application = await tx.application.create({
      data: {
        ...data,
        status: "DRAFT",
      },
      select,
    });

    await tx.applicationHistory.create({
      data: {
        applicationId: application.id,
        actorId: actorId ?? null,
        action: APPLICATION_ACTIONS.APPLICATION_CREATED,
        fromStatus: null,
        toStatus: "DRAFT",
        remarks: null,
      },
    });

    return application;
  });
};

const transitionApplication = async ({
  applicationId,
  action,
  actorId,
  remarks = null,
  whereConditions = {},
  updateData = {},
  select,
  conflictMessage,
  prismaClient = prisma,
}) => {
  const rule = TRANSITION_RULES[action];
  if (!rule) {
    const error = new Error(`Invalid transition action: ${action}`);
    error.statusCode = 400;
    throw error;
  }

  return prismaClient.$transaction(async (tx) => {
    const currentApplication = await tx.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        applicationNumber: true,
        status: true,
        type: true,
        citizenId: true,
        departmentId: true,
        assignedOfficerId: true,
      },
    });

    if (!currentApplication) {
      const error = new Error("Application not found");
      error.statusCode = 404;
      throw error;
    }

    if (!rule.allowedFrom.includes(currentApplication.status)) {
      const expected = rule.allowedFrom.join(" or ");
      const error = new Error(
        conflictMessage ||
          `Cannot perform ${action}: application status is '${currentApplication.status}', expected '${expected}'`,
      );
      error.statusCode = 409;
      throw error;
    }

    const fromStatus = currentApplication.status;

    const resolvedUpdates =
      typeof updateData === "function"
        ? await updateData(tx, currentApplication)
        : updateData;

    const updateResult = await tx.application.updateMany({
      where: {
        id: applicationId,
        status: fromStatus,
        ...whereConditions,
      },
      data: {
        status: rule.toStatus,
        ...resolvedUpdates,
      },
    });

    if (updateResult.count !== 1) {
      const error = new Error(
        conflictMessage ||
          "Application state transition failed due to a concurrent update or authorization condition mismatch",
      );
      error.statusCode = 409;
      throw error;
    }

    const historyRecord = await tx.applicationHistory.create({
      data: {
        applicationId,
        actorId: actorId ?? null,
        action,
        fromStatus,
        toStatus: rule.toStatus,
        remarks: remarks ?? null,
      },
    });

    const notificationRecord = await createApplicationNotification(tx, {
      citizenId: currentApplication.citizenId,
      applicationId,
      applicationNumber: currentApplication.applicationNumber,
      action,
      remarks,
    });

    const updatedApplication = await tx.application.findUnique({
      where: { id: applicationId },
      ...(select ? { select } : {}),
    });

    return {
      application: updatedApplication,
      history: historyRecord,
      notification: notificationRecord,
    };
  });
};

module.exports = {
  APPLICATION_ACTIONS,
  TRANSITION_RULES,
  createApplicationWithHistory,
  transitionApplication,
};
