const express = require("express");
const { getParcelDossier } = require("../controllers/parcelDossierController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:parcelId/dossier", authenticate, getParcelDossier);

module.exports = router;
