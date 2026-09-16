const express = require("express");
const {
  getOfficerApplications,
  startApplicationReview,
  recordApplicationDecision,
} = require("../controllers/officerApplicationController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/applications", authenticate, authorizeRoles("OFFICER", "ADMIN"), getOfficerApplications);
router.patch(
  "/applications/:applicationId/review",
  authenticate,
  authorizeRoles("OFFICER", "ADMIN"),
  startApplicationReview,
);
router.patch(
  "/applications/:applicationId/decision",
  authenticate,
  authorizeRoles("OFFICER", "ADMIN"),
  recordApplicationDecision,
);

module.exports = router;
