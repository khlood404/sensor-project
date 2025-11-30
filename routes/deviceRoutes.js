const express = require("express");
const router = express.Router();
const {
  sendCommand,
  getLastCommand,
} = require("../controllers/deviceController");


router.post("/send", sendCommand);


router.get("/last/:device", getLastCommand);

module.exports = router;
