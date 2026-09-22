const express = require("express");
const {
  addApplicationDocument,
  listApplicationDocuments,
  getApplicationDocument,
  getApplicationDocumentFile,
  deleteApplicationDocument,
} = require("../controllers/applicationDocumentController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { documentUploadMiddleware } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post(
  "/:applicationId/documents",
  authenticate,
  authorizeRoles("CITIZEN"),
  documentUploadMiddleware,
  addApplicationDocument,
);
router.get("/:applicationId/documents", authenticate, listApplicationDocuments);
router.get("/:applicationId/documents/:documentId", authenticate, getApplicationDocument);
router.get("/:applicationId/documents/:documentId/file", authenticate, getApplicationDocumentFile);
router.delete(
  "/:applicationId/documents/:documentId",
  authenticate,
  authorizeRoles("CITIZEN"),
  deleteApplicationDocument,
);

module.exports = router;
