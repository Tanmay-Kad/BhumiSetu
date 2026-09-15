const express = require("express");
const {
  createOwnership,
  getMyProperties,
  getOwnershipsByParcel,
} = require("../controllers/ownershipController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authenticate, createOwnership);
router.get("/my-properties", authenticate, getMyProperties);
router.get("/parcel/:parcelId", authenticate, getOwnershipsByParcel);

module.exports = router;
