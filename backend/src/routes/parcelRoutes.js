const express = require("express");
const {
  getParcels,
  getParcelsInBbox,
  getParcelsNearby,
  getParcelById,
  getParcelByUlpin,
  createParcel,
} = require("../controllers/parcelController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getParcels);
router.get("/spatial/bbox", getParcelsInBbox);
router.get("/spatial/nearby", getParcelsNearby);
router.get("/ulpin/:ulpin", getParcelByUlpin);
router.get("/:id", getParcelById);
router.post("/", authenticate, createParcel);

module.exports = router;
