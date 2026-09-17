const prisma = require("../utils/prisma");
const { getOfficerDepartment } = require("../utils/officerDepartment");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIME_TYPE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,126}\/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,126}$/;
const MAX_DOCUMENT_FILE_SIZE = 20 * 1024 * 1024;
const MAX_FILE_NAME_LENGTH = 255;
const MAX_STORAGE_KEY_LENGTH = 512;
const MAX_MIME_TYPE_LENGTH = 127;

const DOCUMENT_TYPES = new Set([
  "IDENTITY_PROOF",
  "SALE_DEED",
  "LAND_RECORD",
  "SITE_PLAN",
  "BUILDING_PLAN",
  "PROPERTY_TAX_RECEIPT",
  "TREE_RELATED_DOCUMENT",
  "UTILITY_DOCUMENT",
  "OTHER",
]);

const DOCUMENT_CREATION_STATUSES = new Set([
  "DRAFT",
  "SUBMITTED",
  "ADDITIONAL_INFO_REQUIRED",
  "RESUBMITTED",
]);
const DOCUMENT_DELETION_STATUSES = new Set([
  "DRAFT",
  "ADDITIONAL_INFO_REQUIRED",
  "RESUBMITTED",
]);

const isValidId = (value) => typeof value === "string" && UUID_PATTERN.test(value);

const applicationDocumentSelect = {
  id: true,
  applicationId: true,
  documentType: true,
  originalFileName: true,
  storageKey: true,
  mimeType: true,
  fileSize: true,
  uploadedAt: true,
  uploadedBy: {
    select: {
      id: true,
      name: true,
      role: true,
    },
  },
};

const getApplicationForDocumentAccess = async (applicationId) =>
  prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      citizenId: true,
      departmentId: true,
      status: true,
    },
  });

const authorizeApplicationDocumentRead = async (req, application) => {
  if (req.user.role === "ADMIN") {
    return null;
  }

  if (req.user.role === "CITIZEN") {
    return application.citizenId === req.user.id
      ? null
      : "You are not authorized to access this application's documents";
  }

  if (req.user.role === "OFFICER") {
    const department = await getOfficerDepartment(prisma, req.user.id);

    if (!department || !department.isActive) {
      return "No active department is configured for this officer";
    }

    return application.departmentId === department.id
      ? null
      : "You are not authorized to access documents for another department";
  }

  return "You are not authorized to access this resource";
};

const parseDocumentMetadata = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "A valid document metadata request body is required" };
  }

  const documentType = typeof body.documentType === "string" ? body.documentType.trim() : "";
  const originalFileName =
    typeof body.originalFileName === "string" ? body.originalFileName.trim() : "";
  const storageKey = typeof body.storageKey === "string" ? body.storageKey.trim() : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType.trim() : "";

  if (!DOCUMENT_TYPES.has(documentType)) {
    return { error: "documentType must be a valid document type" };
  }

  if (
    !originalFileName ||
    originalFileName.length > MAX_FILE_NAME_LENGTH ||
    originalFileName.includes("/") ||
    originalFileName.includes("\\") ||
    originalFileName.includes("\0") ||
    originalFileName === "." ||
    originalFileName === ".."
  ) {
    return {
      error: `originalFileName is required, must not exceed ${MAX_FILE_NAME_LENGTH} characters, and must be a file name rather than a path`,
    };
  }

  if (!storageKey || storageKey.length > MAX_STORAGE_KEY_LENGTH || storageKey.includes("\0")) {
    return { error: `storageKey is required and must not exceed ${MAX_STORAGE_KEY_LENGTH} characters` };
  }

  if (!mimeType || mimeType.length > MAX_MIME_TYPE_LENGTH || !MIME_TYPE_PATTERN.test(mimeType)) {
    return { error: "mimeType must be a valid type/subtype value" };
  }

  if (typeof body.fileSize !== "number" || !Number.isSafeInteger(body.fileSize) || body.fileSize <= 0) {
    return { error: "fileSize must be a positive integer" };
  }

  if (body.fileSize > MAX_DOCUMENT_FILE_SIZE) {
    return { error: `fileSize must not exceed ${MAX_DOCUMENT_FILE_SIZE} bytes` };
  }

  return {
    value: {
      documentType,
      originalFileName,
      storageKey,
      mimeType,
      fileSize: body.fileSize,
    },
  };
};

const addApplicationDocument = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const parsedMetadata = parseDocumentMetadata(req.body);

    if (req.user.role !== "CITIZEN") {
      return res.status(403).json({
        status: "error",
        message: "Only the citizen who owns this application can add document metadata",
      });
    }

    if (!isValidId(applicationId)) {
      return res.status(400).json({ status: "error", message: "A valid applicationId is required" });
    }

    if (parsedMetadata.error) {
      return res.status(400).json({ status: "error", message: parsedMetadata.error });
    }

    const document = await prisma.$transaction(async (transaction) => {
      const application = await transaction.application.findUnique({
        where: { id: applicationId },
        select: {
          id: true,
          citizenId: true,
          status: true,
        },
      });

      if (!application) {
        const error = new Error("Application not found");
        error.statusCode = 404;
        throw error;
      }

      if (application.citizenId !== req.user.id) {
        const error = new Error("You are not authorized to add documents to this application");
        error.statusCode = 403;
        throw error;
      }

      if (!DOCUMENT_CREATION_STATUSES.has(application.status)) {
        const error = new Error("Documents cannot be added while the application is in its current status");
        error.statusCode = 400;
        throw error;
      }

      return transaction.applicationDocument.create({
        data: {
          applicationId: application.id,
          uploadedById: req.user.id,
          documentType: parsedMetadata.value.documentType,
          originalFileName: parsedMetadata.value.originalFileName,
          storageKey: parsedMetadata.value.storageKey,
          mimeType: parsedMetadata.value.mimeType,
          fileSize: parsedMetadata.value.fileSize,
        },
        select: applicationDocumentSelect,
      });
    });

    return res.status(201).json({
      status: "success",
      message: "Document metadata recorded. Binary file storage is not enabled yet.",
      data: document,
    });
  } catch (error) {
    return next(error);
  }
};

const listApplicationDocuments = async (req, res, next) => {
  try {
    const { applicationId } = req.params;

    if (!isValidId(applicationId)) {
      return res.status(400).json({ status: "error", message: "A valid applicationId is required" });
    }

    const application = await getApplicationForDocumentAccess(applicationId);
    if (!application) {
      return res.status(404).json({ status: "error", message: "Application not found" });
    }

    const authorizationError = await authorizeApplicationDocumentRead(req, application);
    if (authorizationError) {
      return res.status(403).json({ status: "error", message: authorizationError });
    }

    const documents = await prisma.applicationDocument.findMany({
      where: { applicationId },
      select: applicationDocumentSelect,
      orderBy: { uploadedAt: "asc" },
    });

    return res.status(200).json({ status: "success", data: documents });
  } catch (error) {
    return next(error);
  }
};

const getApplicationDocument = async (req, res, next) => {
  try {
    const { applicationId, documentId } = req.params;

    if (!isValidId(applicationId) || !isValidId(documentId)) {
      return res.status(400).json({ status: "error", message: "A valid applicationId and documentId are required" });
    }

    const application = await getApplicationForDocumentAccess(applicationId);
    if (!application) {
      return res.status(404).json({ status: "error", message: "Application not found" });
    }

    const authorizationError = await authorizeApplicationDocumentRead(req, application);
    if (authorizationError) {
      return res.status(403).json({ status: "error", message: authorizationError });
    }

    const document = await prisma.applicationDocument.findFirst({
      where: { id: documentId, applicationId },
      select: applicationDocumentSelect,
    });

    if (!document) {
      return res.status(404).json({ status: "error", message: "Document not found" });
    }

    return res.status(200).json({ status: "success", data: document });
  } catch (error) {
    return next(error);
  }
};

const deleteApplicationDocument = async (req, res, next) => {
  try {
    const { applicationId, documentId } = req.params;

    if (req.user.role !== "CITIZEN") {
      return res.status(403).json({
        status: "error",
        message: "Only the citizen who owns this application can delete document metadata",
      });
    }

    if (!isValidId(applicationId) || !isValidId(documentId)) {
      return res.status(400).json({ status: "error", message: "A valid applicationId and documentId are required" });
    }

    await prisma.$transaction(async (transaction) => {
      const application = await transaction.application.findUnique({
        where: { id: applicationId },
        select: {
          id: true,
          citizenId: true,
          status: true,
        },
      });

      if (!application) {
        const error = new Error("Application not found");
        error.statusCode = 404;
        throw error;
      }

      if (application.citizenId !== req.user.id) {
        const error = new Error("You are not authorized to delete documents from this application");
        error.statusCode = 403;
        throw error;
      }

      if (!DOCUMENT_DELETION_STATUSES.has(application.status)) {
        const error = new Error("Documents cannot be deleted while the application is in its current status");
        error.statusCode = 400;
        throw error;
      }

      const document = await transaction.applicationDocument.findFirst({
        where: { id: documentId, applicationId: application.id },
        select: { id: true, uploadedById: true },
      });

      if (!document) {
        const error = new Error("Document not found");
        error.statusCode = 404;
        throw error;
      }

      if (document.uploadedById !== req.user.id) {
        const error = new Error("Only the citizen who uploaded this document can delete it");
        error.statusCode = 403;
        throw error;
      }

      await transaction.applicationDocument.delete({ where: { id: document.id } });
    });

    return res.status(200).json({
      status: "success",
      message: "Document metadata deleted successfully. No binary file was stored.",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  addApplicationDocument,
  listApplicationDocuments,
  getApplicationDocument,
  deleteApplicationDocument,
};
