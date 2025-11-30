const mongoose = require("mongoose");

const sensorReadingSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["gas", "temperature", "humidity", "detect"],//  we have a variable not neccery
    required: true
  },

  value: {
    type: Number,
    required: false 
  },

  status: {
    type: String,
    enum: ["normal", "warning", "danger"],
    default: "normal"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("SensorReading", sensorReadingSchema);
