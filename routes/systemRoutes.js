const express = require("express");
const router = express.Router();
const { getSystemStatus } = require("../controller/systemController");


router.get("/status", getSystemStatus);

module.exports = router;
