const prisma = require("../utils/prisma");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PAGE_SIZE = 100;

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

const notificationSelect = {
  id: true,
  userId: true,
  applicationId: true,
  type: true,
  title: true,
  message: true,
  isRead: true,
  readAt: true,
  createdAt: true,
  application: {
    select: {
      id: true,
      applicationNumber: true,
      type: true,
      status: true,
    },
  },
};

const getNotifications = async (req, res, next) => {
  try {
    const pageResult = parsePositiveInteger(req.query.page, "page", 1, Number.MAX_SAFE_INTEGER);
    const limitResult = parsePositiveInteger(req.query.limit, "limit", 20, MAX_PAGE_SIZE);

    if (pageResult.error || limitResult.error) {
      return res.status(400).json({ status: "error", message: pageResult.error || limitResult.error });
    }

    const page = pageResult.value;
    const limit = limitResult.value;
    const unreadOnly = req.query.unreadOnly === "true";

    const where = {
      userId: req.user.id,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        select: notificationSelect,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return res.status(200).json({
      status: "success",
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await prisma.notification.count({
      where: {
        userId: req.user.id,
        isRead: false,
      },
    });

    return res.status(200).json({
      status: "success",
      unreadCount,
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;

    if (!isValidId(notificationId)) {
      return res.status(400).json({ status: "error", message: "A valid notificationId is required" });
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { id: true, userId: true, isRead: true },
    });

    if (!notification) {
      return res.status(404).json({ status: "error", message: "Notification not found" });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({
        status: "error",
        message: "You are not authorized to access this notification",
      });
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      select: notificationSelect,
    });

    return res.status(200).json({
      status: "success",
      message: "Notification marked as read",
      data: updated,
    });
  } catch (error) {
    return next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return res.status(200).json({
      status: "success",
      message: "All notifications marked as read",
      updatedCount: result.count,
      data: {
        updatedCount: result.count,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
