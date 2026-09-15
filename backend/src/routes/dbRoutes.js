const express = require("express");
const { testDb } = require("../controllers/dbController");

const router = express.Router();

router.get("/", testDb);

module.exports = router;
