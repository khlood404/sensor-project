const express = require("express");
const router = express.Router();

const {
  addReading,
  getLatestReadings,
} = require("../controllers/sensorController");

//  بياخد القراه الجديده من microcontroller
router.post("/add-reading", addReading);

//  اخر قراءه لكل سينسور 
router.get("/latest", getLatestReadings);

module.exports = router;
 