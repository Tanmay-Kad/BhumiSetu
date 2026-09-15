const express = require("express");
const healthRoutes = require("./healthRoutes");
const dbRoutes = require("./dbRoutes");
const authRoutes = require("./authRoutes");
const parcelRoutes = require("./parcelRoutes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/test-db", dbRoutes);
router.use("/v1/auth", authRoutes);
router.use("/v1/parcels", parcelRoutes);

module.exports = router;
