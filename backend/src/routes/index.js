const express = require("express");
const healthRoutes = require("./healthRoutes");
const dbRoutes = require("./dbRoutes");
const authRoutes = require("./authRoutes");
const parcelRoutes = require("./parcelRoutes");
const ownershipRoutes = require("./ownershipRoutes");
const parcelDossierRoutes = require("./parcelDossierRoutes");
const applicationRoutes = require("./applicationRoutes");
const applicationDocumentRoutes = require("./applicationDocumentRoutes");
const officerApplicationRoutes = require("./officerApplicationRoutes");
const notificationRoutes = require("./notificationRoutes");
const dashboardRoutes = require("./dashboardRoutes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/test-db", dbRoutes);
router.use("/v1/auth", authRoutes);
router.use("/v1/parcels", parcelRoutes);
router.use("/v1/parcels", parcelDossierRoutes);
router.use("/v1/ownerships", ownershipRoutes);
router.use("/v1/applications", applicationRoutes);
router.use("/v1/applications", applicationDocumentRoutes);
router.use("/v1/officer", officerApplicationRoutes);
router.use("/v1/notifications", notificationRoutes);
router.use("/v1/dashboard", dashboardRoutes);

module.exports = router;
