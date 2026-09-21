const NOTIFICATION_TYPES = Object.freeze({
  APPLICATION_SUBMITTED: "APPLICATION_SUBMITTED",
  APPLICATION_UNDER_REVIEW: "APPLICATION_UNDER_REVIEW",
  APPLICATION_ADDITIONAL_INFO_REQUIRED: "APPLICATION_ADDITIONAL_INFO_REQUIRED",
  APPLICATION_RESUBMITTED: "APPLICATION_RESUBMITTED",
  APPLICATION_APPROVED: "APPLICATION_APPROVED",
  APPLICATION_APPROVED_WITH_CONDITIONS: "APPLICATION_APPROVED_WITH_CONDITIONS",
  APPLICATION_REJECTED: "APPLICATION_REJECTED",
  APPLICATION_CANCELLED: "APPLICATION_CANCELLED",
});

const getApplicationNotificationContent = (action, applicationNumber) => {
  switch (action) {
    case "APPLICATION_SUBMITTED":
      return {
        type: NOTIFICATION_TYPES.APPLICATION_SUBMITTED,
        title: "Application submitted",
        message: `Your application ${applicationNumber} has been submitted successfully.`,
      };
    case "REVIEW_STARTED":
      return {
        type: NOTIFICATION_TYPES.APPLICATION_UNDER_REVIEW,
        title: "Application under review",
        message: `Your application ${applicationNumber} is now under review by the concerned department.`,
      };
    case "ADDITIONAL_INFO_REQUESTED":
      return {
        type: NOTIFICATION_TYPES.APPLICATION_ADDITIONAL_INFO_REQUIRED,
        title: "Additional information required",
        message: `Additional information is required for application ${applicationNumber}. Please review the application and submit the requested response.`,
      };
    case "APPLICATION_RESUBMITTED":
      return {
        type: NOTIFICATION_TYPES.APPLICATION_RESUBMITTED,
        title: "Application resubmitted",
        message: `Your response for application ${applicationNumber} has been submitted successfully.`,
      };
    case "APPLICATION_APPROVED":
      return {
        type: NOTIFICATION_TYPES.APPLICATION_APPROVED,
        title: "Application approved",
        message: `Your application ${applicationNumber} has been approved.`,
      };
    case "APPLICATION_APPROVED_WITH_CONDITIONS":
      return {
        type: NOTIFICATION_TYPES.APPLICATION_APPROVED_WITH_CONDITIONS,
        title: "Application approved with conditions",
        message: `Your application ${applicationNumber} has been approved subject to conditions. Please review the application decision.`,
      };
    case "APPLICATION_REJECTED":
      return {
        type: NOTIFICATION_TYPES.APPLICATION_REJECTED,
        title: "Application rejected",
        message: `Your application ${applicationNumber} has been rejected. Please review the decision remarks.`,
      };
    case "APPLICATION_CANCELLED":
      return {
        type: NOTIFICATION_TYPES.APPLICATION_CANCELLED,
        title: "Application cancelled",
        message: `Your application ${applicationNumber} has been cancelled.`,
      };
    default:
      return null;
  }
};

const createApplicationNotification = async (
  prismaClient,
  { citizenId, applicationId, applicationNumber, action, remarks },
) => {
  if (!citizenId) {
    return null;
  }

  const content = getApplicationNotificationContent(action, applicationNumber);
  if (!content) {
    return null;
  }

  return prismaClient.notification.create({
    data: {
      userId: citizenId,
      applicationId: applicationId ?? null,
      type: content.type,
      title: content.title,
      message: content.message,
    },
  });
};

const createNotification = async (
  prismaClient,
  { userId, applicationId, type, title, message },
) => {
  return prismaClient.notification.create({
    data: {
      userId,
      applicationId: applicationId ?? null,
      type,
      title,
      message,
    },
  });
};

module.exports = {
  NOTIFICATION_TYPES,
  getApplicationNotificationContent,
  createApplicationNotification,
  createNotification,
};
