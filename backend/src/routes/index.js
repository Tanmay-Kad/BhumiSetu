const express = require("express");
const healthRoutes = require("./healthRoutes");
const dbRoutes = require("./dbRoutes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/test-db", dbRoutes);

module.exports = router;
