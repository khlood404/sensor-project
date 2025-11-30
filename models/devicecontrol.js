//ده مهم جدًا علشان 
// Microcontroller يعرف آخر Command اتبعت له
//(تشغيل Buzzer – إطفاء L
// ED – عرض رسالة على LCD
const mongoose = require("mongoose");

const deviceControlSchema = new mongoose.Schema({
  device: {
    type: String,
    enum: ["buzzer", "led", "lcd"],
    required: true
  },

  action: {
    type: String,
    enum: ["on", "off", "show", "hide"],
    required: true
  },

  message: {
    type: String,
    required: false // لو LCD هيعرض نص
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("DeviceControl", deviceControlSchema);
