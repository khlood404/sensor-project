const Alert = require("../models/alert");

// Get all alerts
exports.getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Mark alert as acknowledged (user read it)
exports.acknowledgeAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await Alert.findByIdAndUpdate(
      id,
      { acknowledged: true },
      { new: true }
    );

    if (!alert) {
      return res
        .status(404)
        .json({ success: false, message: "Alert not found" });
    }

    res.json({
      success: true,
      message: "Alert acknowledged",
      data: alert,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
