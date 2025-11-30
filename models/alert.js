//لما يحصل مشكلة (Gas عالي – Fire – حرارة عالية – اهتزاز)
// بيعمل alerm
const mongoose = require("mongoose"); 


const alertSchema = new mongoose.Schema({
  sensor: {
    type: String,
    enum: ["gas", "temperature","detect"],
    required: true
  },

  message: {
    type: String,
    required: true
  },

  level: {
    type: String,
    enum: ["low", "medium", "high"],
    required: true
  },

  acknowledged: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Alert", alertSchema);
