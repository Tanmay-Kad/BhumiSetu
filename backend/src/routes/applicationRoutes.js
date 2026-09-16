const express = require("express");
const {
  createApplication,
  submitApplication,
  getMyApplications,
  getApplicationById,
  cancelApplication,
  resubmitApplication,
} = require("../controllers/applicationController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", authenticate, createApplication);
router.get("/my", authenticate, getMyApplications);
router.patch("/:applicationId/submit", authenticate, submitApplication);
router.patch("/:applicationId/cancel", authenticate, cancelApplication);
router.patch("/:applicationId/resubmit", authenticate, authorizeRoles("CITIZEN"), resubmitApplication);
router.get("/:applicationId", authenticate, getApplicationById);

module.exports = router;
