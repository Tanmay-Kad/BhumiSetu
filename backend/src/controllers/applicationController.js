const { randomInt } = require("crypto");
const prisma = require("../utils/prisma");
const { resolveRoutedDepartment } = require("../utils/applicationRouting");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const APPLICATION_TYPES = new Set([
  "BUILDING_PERMISSION",
  "TREE_CUTTING",
  "UTILITY_CONNECTION",
  "LAND_USE_CHANGE",
  "OTHER",
]);
const APPLICATION_NUMBER_ATTEMPTS = 5;
const MAX_CITIZEN_RESPONSE_LENGTH = 5000;

const isValidId = (value) => typeof value === "string" && UUID_PATTERN.test(value);

const generateApplicationNumber = () => {
  const year = new Date().getFullYear();
  const suffix = randomInt(0, 1_000_000).toString().padStart(6, "0");

  return `BS-${year}-${suffix}`;
};

const applicationSelect = {
  id: true,
  applicationNumber: true,
  type: true,
  status: true,
  description: true,
  parcelId: true,
  citizenId: true,
  departmentId: true,
  assignedOfficerId: true,
  submittedAt: true,
  reviewedAt: true,
  decisionAt: true,
  reviewRemarks: true,
  decisionRemarks: true,
  citizenResponse: true,
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
  assignedOfficer: {
    select: {
      id: true,
      name: true,
      role: true,
    },
  },
};

const resubmissionApplicationSelect = {
  ...applicationSelect,
  assignedOfficer: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

const normaliseCreateInput = (body = {}) => ({
  parcelId: typeof body.parcelId === "string" ? body.parcelId.trim() : "",
  type: typeof body.type === "string" ? body.type.trim() : "",
  description: typeof body.description === "string" ? body.description.trim() : "",
});

const validateCreateInput = ({ parcelId, type, description }) => {
  if (!isValidId(parcelId)) {
    return "A valid parcelId is required";
  }

  if (!APPLICATION_TYPES.has(type)) {
    return "A valid application type is required";
  }

  if (!description || description.length > 2000) {
    return "description is required and must not exceed 2000 characters";
  }

  return null;
};

const getOwnedApplication = async (applicationId, citizenId) => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, citizenId: true, status: true, type: true },
  });

  if (!application) {
    return { error: { statusCode: 404, message: "Application not found" } };
  }

  if (application.citizenId !== citizenId) {
    return { error: { statusCode: 403, message: "You are not authorized to access this application" } };
  }

  return { application };
};

const createApplication = async (req, res, next) => {
  try {
    const input = normaliseCreateInput(req.body);
    const validationError = validateCreateInput(input);

    if (validationError) {
      return res.status(400).json({ status: "error", message: validationError });
    }

    const parcel = await prisma.parcel.findUnique({
      where: { id: input.parcelId },
      select: { id: true },
    });

    if (!parcel) {
      return res.status(404).json({ status: "error", message: "Parcel not found" });
    }

    const ownership = await prisma.ownership.findUnique({
      where: {
        userId_parcelId: {
          userId: req.user.id,
          parcelId: input.parcelId,
        },
      },
      select: { id: true },
    });

    if (!ownership) {
      return res.status(403).json({
        status: "error",
        message: "You must be associated with this parcel to create an application",
      });
    }

    for (let attempt = 0; attempt < APPLICATION_NUMBER_ATTEMPTS; attempt += 1) {
      try {
        const application = await prisma.application.create({
          data: {
            applicationNumber: generateApplicationNumber(),
            type: input.type,
            description: input.description,
            parcelId: input.parcelId,
            citizenId: req.user.id,
            status: "DRAFT",
          },
          select: applicationSelect,
        });

        return res.status(201).json({ status: "success", data: application });
      } catch (error) {
        if (error.code !== "P2002") {
          throw error;
        }
      }
    }

    return res.status(409).json({
      status: "error",
      message: "Could not generate a unique application number. Please try again.",
    });
  } catch (error) {
    return next(error);
  }
};

const submitApplication = async (req, res, next) => {
  try {
    const { applicationId } = req.params;

    if (!isValidId(applicationId)) {
      return res.status(400).json({ status: "error", message: "A valid applicationId is required" });
    }

    const result = await getOwnedApplication(applicationId, req.user.id);
    if (result.error) {
      return res.status(result.error.statusCode).json({ status: "error", message: result.error.message });
    }

    if (result.application.status !== "DRAFT") {
      return res.status(400).json({
        status: "error",
        message: "Only draft applications can be submitted",
      });
    }

    const application = await prisma.$transaction(async (transaction) => {
      const routedDepartment = await resolveRoutedDepartment(transaction, result.application.type);
      const submittedAt = new Date();
      const updateResult = await transaction.application.updateMany({
        where: {
          id: applicationId,
          citizenId: req.user.id,
          status: "DRAFT",
        },
        data: {
          status: "SUBMITTED",
          submittedAt,
          departmentId: routedDepartment?.id ?? null,
        },
      });

      if (updateResult.count !== 1) {
        const error = new Error("Only draft applications can be submitted");
        error.statusCode = 400;
        throw error;
      }

      return transaction.application.findUnique({
        where: { id: applicationId },
        select: applicationSelect,
      });
    });

    return res.status(200).json({ status: "success", data: application });
  } catch (error) {
    return next(error);
  }
};

const getMyApplications = async (req, res, next) => {
  try {
    const applications = await prisma.application.findMany({
      where: { citizenId: req.user.id },
      select: applicationSelect,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ status: "success", data: applications });
  } catch (error) {
    return next(error);
  }
};

const getApplicationById = async (req, res, next) => {
  try {
    const { applicationId } = req.params;

    if (!isValidId(applicationId)) {
      return res.status(400).json({ status: "error", message: "A valid applicationId is required" });
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: applicationSelect,
    });

    if (!application) {
      return res.status(404).json({ status: "error", message: "Application not found" });
    }

    if (application.citizenId !== req.user.id) {
      return res.status(403).json({
        status: "error",
        message: "You are not authorized to access this application",
      });
    }

    return res.status(200).json({ status: "success", data: application });
  } catch (error) {
    return next(error);
  }
};

const cancelApplication = async (req, res, next) => {
  try {
    const { applicationId } = req.params;

    if (!isValidId(applicationId)) {
      return res.status(400).json({ status: "error", message: "A valid applicationId is required" });
    }

    const result = await getOwnedApplication(applicationId, req.user.id);
    if (result.error) {
      return res.status(result.error.statusCode).json({ status: "error", message: result.error.message });
    }

    if (!new Set(["DRAFT", "SUBMITTED"]).has(result.application.status)) {
      return res.status(400).json({
        status: "error",
        message: "Only draft or submitted applications can be cancelled",
      });
    }

    const application = await prisma.application.update({
      where: { id: applicationId },
      data: { status: "CANCELLED" },
      select: applicationSelect,
    });

    return res.status(200).json({ status: "success", data: application });
  } catch (error) {
    return next(error);
  }
};

const parseCitizenResponse = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.response !== "string") {
    return { error: "response must be a non-empty string" };
  }

  const citizenResponse = body.response.trim();
  if (!citizenResponse) {
    return { error: "response must be a non-empty string" };
  }

  if (citizenResponse.length > MAX_CITIZEN_RESPONSE_LENGTH) {
    return { error: `response must not exceed ${MAX_CITIZEN_RESPONSE_LENGTH} characters` };
  }

  return { value: citizenResponse };
};

const resubmitApplication = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const parsedResponse = parseCitizenResponse(req.body);

    if (!isValidId(applicationId)) {
      return res.status(400).json({ status: "error", message: "A valid applicationId is required" });
    }

    if (parsedResponse.error) {
      return res.status(400).json({ status: "error", message: parsedResponse.error });
    }

    const result = await getOwnedApplication(applicationId, req.user.id);
    if (result.error) {
      return res.status(result.error.statusCode).json({ status: "error", message: result.error.message });
    }

    if (result.application.status !== "ADDITIONAL_INFO_REQUIRED") {
      return res.status(400).json({
        status: "error",
        message: "Only applications requiring additional information can be resubmitted",
      });
    }

    const application = await prisma.$transaction(async (transaction) => {
      const updateResult = await transaction.application.updateMany({
        where: {
          id: applicationId,
          citizenId: req.user.id,
          status: "ADDITIONAL_INFO_REQUIRED",
        },
        data: {
          status: "RESUBMITTED",
          citizenResponse: parsedResponse.value,
        },
      });

      if (updateResult.count !== 1) {
        const error = new Error("Application is no longer available for resubmission");
        error.statusCode = 409;
        throw error;
      }

      return transaction.application.findUnique({
        where: { id: applicationId },
        select: resubmissionApplicationSelect,
      });
    });

    return res.status(200).json({
      status: "success",
      message: "Application resubmitted successfully",
      data: application,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createApplication,
  submitApplication,
  getMyApplications,
  getApplicationById,
  cancelApplication,
  resubmitApplication,
};
