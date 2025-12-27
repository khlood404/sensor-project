const Alert = require("../models/alert");

// Get all alerts with pagination and filtering
exports.getAlerts = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            acknowledged, 
            level, 
            startDate, 
            endDate 
        } = req.query;

        // بناء الاستعلام
        const query = {};
        
        if (ackledged !== undefined) {
            query.acknowledged = acknowledged === 'true';
        }
        
        if (level) {
            query.level = level;
        }
        
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { createdAt: -1 }
        };

        // استخدام Pagination لو كان النموذج يدعمه، وإلا find عادي
        let alerts, total;
        
        try {
            // محاولة Pagination
            const result = await Alert.paginate(query, options);
            alerts = result.docs;
            total = result.totalDocs;
        } catch (e) {
            // Fallback إلى find عادي
            alerts = await Alert.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit));
            total = await Alert.countDocuments(query);
        }

        res.json({
            success: true,
            count: alerts.length,
            total: total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit),
            data: alerts,
        });
    } catch (error) {
        console.error("Error in getAlerts:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error",
            error: error.message 
        });
    }
};

// Mark alert as acknowledged
exports.acknowledgeAlert = async (req, res) => {
    try {
        const { id } = req.params;

        const alert = await Alert.findByIdAndUpdate(
            id,
            { 
                acknowledged: true,
                acknowledgedAt: new Date()
            },
            { new: true, runValidators: true }
        );

        if (!alert) {
            return res.status(404).json({ 
                success: false, 
                message: "Alert not found" 
            });
        }

        res.json({
            success: true,
            message: "Alert acknowledged successfully",
            data: alert,
        });
    } catch (error) {
        console.error("Error in acknowledgeAlert:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error",
            error: error.message 
        });
    }
};

// Bulk acknowledge alerts
exports.bulkAcknowledge = async (req, res) => {
    try {
        const { alertIds } = req.body;

        if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: "alertIds array is required" 
            });
        }

        const result = await Alert.updateMany(
            { _id: { $in: alertIds } },
            { 
                acknowledged: true,
                acknowledgedAt: new Date()
            }
        );

        res.json({
            success: true,
            message: `${result.modifiedCount} alerts acknowledged`,
            acknowledgedCount: result.modifiedCount
        });
    } catch (error) {
        console.error("Error in bulkAcknowledge:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error",
            error: error.message 
        });
    }
};

// Get alert statistics
exports.getAlertStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const stats = {
            total: await Alert.countDocuments(),
            unacknowledged: await Alert.countDocuments({ acknowledged: false }),
            acknowledged: await Alert.countDocuments({ acknowledged: true }),
            today: await Alert.countDocuments({ createdAt: { $gte: today } }),
            last24Hours: await Alert.countDocuments({ createdAt: { $gte: last24Hours } }),
            byLevel: {
                danger: await Alert.countDocuments({ level: "danger" }),
                warning: await Alert.countDocuments({ level: "warning" }),
                normal: await Alert.countDocuments({ level: "normal" })
            },
            bySensor: {
                gas: await Alert.countDocuments({ sensorType: "gas" }),
                temperature: await Alert.countDocuments({ sensorType: "temperature" }),
                humidity: await Alert.countDocuments({ sensorType: "humidity" }),
                fire: await Alert.countDocuments({ sensorType: "fire" }),
                vibration: await Alert.countDocuments({ sensorType: "vibration" })
            }
        };

        res.json({
            success: true,
            timestamp: new Date(),
            stats: stats
        });
    } catch (error) {
        console.error("Error in getAlertStats:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error",
            error: error.message 
        });
    }
};