//ده بيسجّل آخر حالة لكل Sensor
const mongoose = require("mongoose");

const systemStatusSchema = new mongoose.Schema({
  gas: {
    value: Number,
    status: String
  },

  temperature: {
    value: Number,
    status: String
  },

  humidity: {
    value: Number,
    status: String
  },

  vibration: {
   detected: Boolean,
   status: String
 },

  detect: {
    detected: Boolean,
    status: String
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("SystemStatus", systemStatusSchema);
