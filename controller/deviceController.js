// ✅ تم التصحيح: المسار الصحيح
const DeviceControl = require("../models/DeviceControl");

// Create device command
exports.sendCommand = async (req, res) => {
    try {
        const { device, action, message, priority = "normal" } = req.body;

        // التحقق من البيانات المدخلة
        if (!device || !action) {
            return res.status(400).json({ 
                success: false, 
                message: "Device and action are required" 
            });
        }

        // التحقق من صحة الأولوية
        const validPriorities = ["low", "normal", "high", "critical"];
        if (!validPriorities.includes(priority)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid priority. Use: low, normal, high, critical" 
            });
        }

        const command = await DeviceControl.create({
            device,
            action,
            message: message || `Command: ${action} for device ${device}`,
            priority,
            status: "pending",
            createdAt: new Date()
        });

        // محاكاة معالجة الأمر (في الواقع ستكون هناك خدمة منفصلة)
        setTimeout(async () => {
            await DeviceControl.findByIdAndUpdate(command._id, {
                status: "executed",
                executedAt: new Date()
            });
        }, 1000);

        res.status(201).json({
            success: true,
            message: "Command sent to device successfully",
            commandId: command._id,
            data: command,
        });
    } catch (error) {
        console.error("Error in sendCommand:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error",
            error: error.message 
        });
    }
};

// Get last command for a device
exports.getLastCommand = async (req, res) => {
    try {
        const { device } = req.params;

        if (!device) {
            return res.status(400).json({ 
                success: false, 
                message: "Device parameter is required" 
            });
        }

        const command = await DeviceControl.findOne({ device })
            .sort({ createdAt: -1 });

        if (!command) {
            return res.json({
                success: true,
                message: "No commands found for this device",
                data: null,
            });
        }

        res.json({
            success: true,
            data: command,
        });
    } catch (error) {
        console.error("Error in getLastCommand:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error",
            error: error.message 
        });
    }
};

// Get pending commands for a device
exports.getPendingCommands = async (req, res) => {
    try {
        const { device } = req.params;

        const commands = await DeviceControl.find({ 
            device, 
            status: "pending" 
        }).sort({ priority: -1, createdAt: 1 });

        res.json({
            success: true,
            count: commands.length,
            data: commands,
        });
    } catch (error) {
        console.error("Error in getPendingCommands:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error",
            error: error.message 
        });
    }
};

// Update command status
exports.updateCommandStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, response } = req.body;

        const validStatuses = ["pending", "executing", "executed", "failed", "cancelled"];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: `Invalid status. Use: ${validStatuses.join(", ")}` 
            });
        }

        const updateData = { status };
        if (status === "executed") {
            updateData.executedAt = new Date();
        }
        if (response) {
            updateData.deviceResponse = response;
        }

        const command = await DeviceControl.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!command) {
            return res.status(404).json({ 
                success: false, 
                message: "Command not found" 
            });
        }

        res.json({
            success: true,
            message: `Command status updated to ${status}`,
            data: command,
        });
    } catch (error) {
        console.error("Error in updateCommandStatus:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error",
            error: error.message 
        });
    }
};

// Get command history for a device
exports.getCommandHistory = async (req, res) => {
    try {
        const { device } = req.params;
        const { limit = 50, status } = req.query;

        const query = { device };
        if (status) query.status = status;

        const commands = await DeviceControl.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        const stats = {
            total: await DeviceControl.countDocuments({ device }),
            executed: await DeviceControl.countDocuments({ device, status: "executed" }),
            pending: await DeviceControl.countDocuments({ device, status: "pending" }),
            failed: await DeviceControl.countDocuments({ device, status: "failed" })
        };

        res.json({
            success: true,
            count: commands.length,
            stats: stats,
            data: commands,
        });
    } catch (error) {
        console.error("Error in getCommandHistory:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error",
            error: error.message 
        });
    }
};