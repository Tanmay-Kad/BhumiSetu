const express = require("express");
const {
  addApplicationDocument,
  listApplicationDocuments,
  getApplicationDocument,
  deleteApplicationDocument,
} = require("../controllers/applicationDocumentController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/:applicationId/documents",
  authenticate,
  authorizeRoles("CITIZEN"),
  addApplicationDocument,
);
router.get("/:applicationId/documents", authenticate, listApplicationDocuments);
router.get("/:applicationId/documents/:documentId", authenticate, getApplicationDocument);
router.delete(
  "/:applicationId/documents/:documentId",
  authenticate,
  authorizeRoles("CITIZEN"),
  deleteApplicationDocument,
);

module.exports = router;
