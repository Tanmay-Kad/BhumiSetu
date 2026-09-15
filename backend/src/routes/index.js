const express = require("express");
const healthRoutes = require("./healthRoutes");
const dbRoutes = require("./dbRoutes");
const authRoutes = require("./authRoutes");
const parcelRoutes = require("./parcelRoutes");
const ownershipRoutes = require("./ownershipRoutes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/test-db", dbRoutes);
router.use("/v1/auth", authRoutes);
router.use("/v1/parcels", parcelRoutes);
router.use("/v1/ownerships", ownershipRoutes);

module.exports = router;
