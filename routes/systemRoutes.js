const express = require("express");
const router = express.Router();
const { getSystemStatus } = require("../controllers/systemController");


router.get("/status", getSystemStatus);

module.exports = router;
