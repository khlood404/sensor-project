const DeviceControl = require("..devicecontrol/models/deviceControl");

// Create device command
exports.sendCommand = async (req, res) => {
  try {
    const { device, action, message } = req.body;

    const command = await DeviceControl.create({
      device,
      action,
      message,
    });

    res.json({
      success: true,
      message: "Command sent to device",
      data: command,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get last command for a device (microcontroller will read this)
exports.getLastCommand = async (req, res) => {
  try {
    const { device } = req.params;

    const command = await DeviceControl.findOne({ device })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: command || null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
