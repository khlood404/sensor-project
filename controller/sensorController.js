const SensorReading = require("../models/SensorReading");
const Alert = require("../models/alert");// المسار

// Function to calculate status
const getStatus = (type, value) => {
  if (type === "gas") {
    if (value > 300) return "danger";//دى قيم وهميه 
    if (value > 150) return "warning";
    return "normal";
  }

  if (type === "temperature") {
    if (value > 50) return "danger";// قيم وهميه دى 
    if (value > 35) return "warning";
    return "normal";
  }

//   if (type === "humidity") {
//     if (value > 80) return "danger";// دى قرات وهميه 
//     if (value > 60) return "warning";
//     return "normal";
//   }

  if (type === "fire") {
    return value === 1 ? "danger" : "normal";
  }

  if (type === "vibration") {
    return value === 1 ? "warning" : "normal";
  }

  return "normal";
};

// Create sensor reading
exports.addReading = async (req, res) => {
  try {
    const { type, value } = req.body;

    // Determine status
    const status = getStatus(type, value);

    // Save reading
    const reading = await SensorReading.create({ type, value, status });

    // If status is warning/danger => create alert
    if (status !== "normal") {
      await Alert.create({
        sensor: type,
        message:
          status === "danger"
            ? `${type} Sensor detected dangerous level`
            : `${type} Sensor warning level`,
        level: status === "danger" ? "high" : "medium",
      });
    }

    res.json({
      success: true,
      message: "Reading saved",
      data: reading,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get latest reading for each sensor
exports.getLatestReadings = async (req, res) => {
  try {
    const types = ["gas", "temperature", "humidity", "fire", "vibration"];
    let data = {};

    for (let t of types) {
      data[t] = await SensorReading.findOne({ type: t }).sort({
        createdAt: -1,
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching" });
  }
};
//استقبلنا readings من المايكروكونترولر
//حسبنا Status
//سجلناها في MongoDB
//سجلنا Alert لو في خطر
//عملنا Endpoint يجيب آخر قراءة لكل Sensor