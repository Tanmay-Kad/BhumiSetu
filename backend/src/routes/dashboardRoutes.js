const express = require("express");
const {
  getCitizenDashboard,
  getOfficerDashboard,
} = require("../controllers/dashboardController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/citizen", authenticate, authorizeRoles("CITIZEN"), getCitizenDashboard);
router.get("/officer", authenticate, authorizeRoles("OFFICER", "ADMIN"), getOfficerDashboard);

module.exports = router;
