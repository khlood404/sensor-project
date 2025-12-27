const express = require("express");
const router = express.Router();
const {
  getAlerts,
  acknowledgeAlert,
} = require("../controller/alertController");


router.get("/", getAlerts);


router.put("/:id", acknowledgeAlert);

module.exports = router;
