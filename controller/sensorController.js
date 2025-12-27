const SensorReading = require("../models/SensorReading");
const Alert = require("../models/alert");

// Function to calculate status - محسنة
const getStatus = (type, value) => {
    if (!type || value === undefined) return "unknown";
    
    if (type === "gas") {
        if (value > 300) return "danger";
        if (value > 150) return "warning";
        return "normal";
    }

    if (type === "temperature") {
        if (value > 50) return "danger";
        if (value > 35) return "warning";
        return "normal";
    }

    if (type === "humidity") {
        if (value > 80) return "danger";
        if (value > 60) return "warning";
        return "normal";
    }

    if (type === "fire") {
        return value === 1 ? "danger" : "normal";
    }

    if (type === "vibration") {
        return value === 1 ? "warning" : "normal";
    }

    return "unknown"; // حالة افتراضية أفضل
};

// Create sensor reading - محسنة
exports.addReading = async (req, res) => {
    try {
        const { type, value, deviceId, timestamp } = req.body;

        // التحقق من البيانات المدخلة
        if (!type || value === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: "Type and value are required" 
            });
        }

        // Determine status
        const status = getStatus(type, value);

        // Save reading with additional data
        const readingData = {
            type, 
            value, 
            status,
            deviceId: deviceId || "default",
            timestamp: timestamp || new Date()
        };

        const reading = await SensorReading.create(readingData);

        // If status is warning/danger => create alert
        if (status !== "normal" && status !== "unknown") {
            await Alert.create({
                sensorType: type,
                sensorValue: value,
                message: status === "danger" 
                    ? `${type.toUpperCase()} Sensor detected DANGEROUS level (${value})`
                    : `${type.toUpperCase()} Sensor WARNING level (${value})`,
                level: status,
                acknowledged: false,
                deviceId: deviceId || "default"
            });
        }

        res.status(201).json({
            success: true,
            message: "Reading saved successfully",
            data: reading,
            status: status
        });
    } catch (error) {
        console.error("Error in addReading:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error",
            error: error.message 
        });
    }
};

// Get latest reading for each sensor - محسنة
exports.getLatestReadings = async (req, res) => {
    try {
        const types = ["gas", "temperature", "humidity", "fire", "vibration"];
        const data = {};
        const promises = [];

        for (let type of types) {
            promises.push(
                SensorReading.findOne({ type: type })
                    .sort({ createdAt: -1 })
                    .then(latest => {
                        data[type] = latest || { 
                            type, 
                            value: null, 
                            status: "no_data",
                            message: "No readings available"
                        };
                    })
            );
        }

        await Promise.all(promises);

        res.json({ 
            success: true, 
            timestamp: new Date(),
            data 
        });
    } catch (error) {
        console.error("Error in getLatestReadings:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error fetching sensor data",
            error: error.message 
        });
    }
};

// Get system status - محسنة (بدون تكرار)
exports.getSystemStatus = async (req, res) => {
    try {
        // استخدام نفس دالة getLatestReadings ولكن مع إضافة ملخص
        const types = ["gas", "temperature", "humidity", "fire", "vibration"];
        const status = {};
        let systemHealth = "healthy";
        let activeAlerts = 0;

        for (let type of types) {
            const latest = await SensorReading.findOne({ type: type })
                .sort({ createdAt: -1 });

            status[type] = latest || null;
            
            if (latest && latest.status !== "normal") {
                activeAlerts++;
                if (latest.status === "danger") {
                    systemHealth = "critical";
                } else if (systemHealth !== "critical" && latest.status === "warning") {
                    systemHealth = "warning";
                }
            }
        }

        // جلب الإنذارات غير المقروءة
        const unreadAlerts = await Alert.countDocuments({ acknowledged: false });

        res.json({
            success: true,
            systemHealth: systemHealth,
            activeAlerts: activeAlerts,
            unreadAlerts: unreadAlerts,
            lastUpdated: new Date(),
            sensors: status
        });
    } catch (error) {
        console.error("Error in getSystemStatus:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error",
            error: error.message 
        });
    }
};