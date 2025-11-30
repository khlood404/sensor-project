const SensorReading = require("../models/SensorReading");

exports.getSystemStatus = async (req, res) => {
  try {
    const sensors = ["gas", "temperature", "humidity", "fire", "vibration"];
    let status = {};

    for (let s of sensors) {
      const latest = await SensorReading.findOne({ type: s })
        .sort({ createdAt: -1 });

      status[s] = latest || null;
    }

    res.json({
      success: true,
      systemStatus: status,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
