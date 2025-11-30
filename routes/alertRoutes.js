const express = require("express");
const router = express.Router();
const {
  getAlerts,
  acknowledgeAlert,
} = require("../controllers/alertController");


router.get("/", getAlerts);


router.put("/:id", acknowledgeAlert);

module.exports = router;
