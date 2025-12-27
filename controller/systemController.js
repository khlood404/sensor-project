const SensorReading = require("../models/SensorReading");
const Alert = require("../models/alert");
const DeviceControl = require("../models/DeviceControl");

// Get comprehensive system status
exports.getSystemStatus = async (req, res) => {
    try {
        const sensors = ["gas", "temperature", "humidity", "fire", "vibration"];
        
        // جلب البيانات بالتوازي لتحسين الأداء
        const [
            sensorData,
            unacknowledgedAlerts,
            pendingCommands,
            systemUptime,
            latestReadings
        ] = await Promise.all([
            // 1. بيانات أجهزة الاستشعار
            Promise.all(
                sensors.map(sensorType => 
                    SensorReading.findOne({ type: sensorType })
                        .sort({ createdAt: -1 })
                        .lean()
                )
            ),
            
            // 2. الإنذارات غير المقروءة
            Alert.countDocuments({ acknowledged: false }),
            
            // 3. الأوامر المعلقة
            DeviceControl.countDocuments({ status: "pending" }),
            
            // 4. وقت تشغيل النظام (محاكاة)
            Promise.resolve(Math.floor(process.uptime())),
            
            // 5. أحدث 5 قراءات من جميع الأجهزة
            SensorReading.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .lean()
        ]);

        // بناء حالة النظام
        const systemStatus = {};
        let overallHealth = "healthy";
        let criticalSensors = 0;
        let warningSensors = 0;

        sensors.forEach((sensorType, index) => {
            const reading = sensorData[index];
            
            if (reading) {
                systemStatus[sensorType] = {
                    value: reading.value,
                    status: reading.status || "unknown",
                    unit: this.getSensorUnit(sensorType),
                    lastUpdated: reading.createdAt || reading.timestamp,
                    dataAge: this.calculateDataAge(reading.createdAt || reading.timestamp)
                };

                if (reading.status === "danger") {
                    criticalSensors++;
                    overallHealth = "critical";
                } else if (reading.status === "warning" && overallHealth !== "critical") {
                    warningSensors++;
                    overallHealth = "warning";
                }
            } else {
                systemStatus[sensorType] = {
                    value: null,
                    status: "offline",
                    unit: this.getSensorUnit(sensorType),
                    lastUpdated: null,
                    dataAge: "no_data"
                };
                
                if (overallHealth === "healthy") {
                    overallHealth = "degraded";
                }
            }
        });

        // حساب إحصاءات النظام
        const stats = {
            totalSensors: sensors.length,
            onlineSensors: sensorData.filter(r => r !== null).length,
            offlineSensors: sensorData.filter(r => r === null).length,
            criticalSensors,
            warningSensors,
            unacknowledgedAlerts,
            pendingCommands,
            systemUptime: this.formatUptime(systemUptime),
            memoryUsage: process.memoryUsage(),
            lastDataUpdate: latestReadings[0]?.createdAt || null
        };

        res.json({
            success: true,
            timestamp: new Date(),
            systemHealth: overallHealth,
            status: systemStatus,
            statistics: stats,
            recentActivity: latestReadings,
            recommendations: this.generateRecommendations(systemStatus, stats)
        });
    } catch (error) {
        console.error("Error in getSystemStatus:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error",
            error: error.message,
            partialData: true 
        });
    }
};

// Helper function: Get sensor unit
exports.getSensorUnit = (sensorType) => {
    const units = {
        gas: "ppm",
        temperature: "°C",
        humidity: "%",
        fire: "binary",
        vibration: "intensity"
    };
    return units[sensorType] || "unit";
};

// Helper function: Calculate data age
exports.calculateDataAge = (timestamp) => {
    if (!timestamp) return "unknown";
    
    const now = new Date();
    const lastUpdate = new Date(timestamp);
    const diffMs = now - lastUpdate;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "just_now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
};

// Helper function: Format uptime
exports.formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
};

// Helper function: Generate recommendations
exports.generateRecommendations = (systemStatus, stats) => {
    const recommendations = [];
    
    if (stats.criticalSensors > 0) {
        recommendations.push({
            priority: "high",
            message: `Take immediate action: ${stats.criticalSensors} sensor(s) in DANGER state`,
            action: "check_alerts"
        });
    }
    
    if (stats.warningSensors > 0) {
        recommendations.push({
            priority: "medium",
            message: `Monitor closely: ${stats.warningSensors} sensor(s) in WARNING state`,
            action: "review_sensors"
        });
    }
    
    if (stats.unacknowledgedAlerts > 0) {
        recommendations.push({
            priority: "medium",
            message: `${stats.unacknowledgedAlerts} unacknowledged alerts need attention`,
            action: "review_alerts"
        });
    }
    
    if (stats.offlineSensors > 0) {
        recommendations.push({
            priority: "low",
            message: `${stats.offlineSensors} sensor(s) appear to be offline`,
            action: "check_connections"
        });
    }
    
    return recommendations;
};

// Get system health summary (lightweight version)
exports.getHealthSummary = async (req, res) => {
    try {
        const [alertsCount, latestReadings] = await Promise.all([
            Alert.countDocuments({ acknowledged: false }),
            SensorReading.findOne().sort({ createdAt: -1 })
        ]);

        const health = {
            status: alertsCount > 0 ? "needs_attention" : "healthy",
            activeAlerts: alertsCount,
            lastDataPoint: latestReadings?.createdAt || null,
            timestamp: new Date()
        };

        res.json({
            success: true,
            health: health
        });
    } catch (error) {
        console.error("Error in getHealthSummary:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error" 
        });
    }
};