const express = require("express");
const router = express.Router();

// corrected: require from singular "controller" folder (not "controllers")
const {
  addReading,
  getLatestReadings,
} = require("../controller/sensorController");

router.post("/add-reading", addReading);
router.get("/latest", getLatestReadings);

module.exports = router;
