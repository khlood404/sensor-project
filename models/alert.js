const mongoose = require("mongoose");

/**
 * نموذج الإنذارات - يتتبع جميع الإنذارات والتحذيرات في النظام
 * الإنذارات تنشأ تلقائيًا عندما:
 * 1. تتجاوز قراءة مستشعار الحدود المسموح بها
 * 2. يتم اكتشاف خطر (حريق، غاز، إلخ)
 * 3. هناك مشكلة في الاتصال بالمستشعر
 * 4. يحتاج النظام إلى صيانة
 */

const alertSchema = new mongoose.Schema({
    // 🔹 نوع المستشعر المسبب للإنذار
    sensorType: {
        type: String,
        enum: ["gas", "temperature", "humidity", "fire", "vibration", "system", "network", "power"],
        required: [true, "نوع المستششر مطلوب"],
        index: true
    },

    // 🔹 قيمة القراءة التي سببت الإنذار
    sensorValue: {
        type: Number,
        required: function() {
            // مطلوب فقط لأنواع المستشعرات الرقمية
            return ["gas", "temperature", "humidity"].includes(this.sensorType);
        }
    },

    // 🔹 الجهاز المصدر (إذا كان معروفًا)
    deviceId: {
        type: String,
        index: true,
        default: "unknown"
    },

    // 🔹 موقع الجهاز
    location: {
        type: String,
        default: "unknown"
    },

    // 🔹 رسالة الإنذار
    message: {
        type: String,
        required: [true, "رسالة الإنذار مطلوبة"],
        trim: true,
        maxlength: [500, "الرسالة لا يمكن أن تتجاوز 500 حرف"]
    },

    // 🔹 الرسالة التفصيلية (اختياري)
    detailedMessage: {
        type: String,
        trim: true,
        maxlength: [1000, "الرسالة التفصيلية لا يمكن أن تتجاوز 1000 حرف"]
    },

    // 🔹 مستوى خطورة الإنذار
    severity: {
        type: String,
        enum: {
            values: ["info", "low", "medium", "high", "critical"],
            message: "مستوى الخطورة يجب أن يكون: info, low, medium, high, critical"
        },
        default: "medium",
        index: true
    },

    // 🔹 حالة الإنذار
    status: {
        type: String,
        enum: ["active", "acknowledged", "resolved", "false_alarm"],
        default: "active",
        index: true
    },

    // 🔹 تمت القراءة من قبل المستخدم؟
    acknowledged: {
        type: Boolean,
        default: false
    },

    // 🔹 وقت القراءة
    acknowledgedAt: {
        type: Date
    },

    // 🔹 المستخدم الذي قرأ الإنذار
    acknowledgedBy: {
        type: String
    },

    // 🔹 تم حل المشكلة؟
    resolved: {
        type: Boolean,
        default: false
    },

    // 🔹 وقت الحل
    resolvedAt: {
        type: Date
    },

    // 🔹 كيفية الحل
    resolutionNotes: {
        type: String,
        trim: true
    },

    // 🔹 البيانات الإضافية
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // 🔹 وقت الإنتهاء التلقائي (للإنذارات المؤقتة)
    expiresAt: {
        type: Date,
        index: { expireAfterSeconds: 0 } // لحذف السجلات تلقائيًا
    }
}, {
    // 🔹 إضافة الطوابع الزمنية تلقائيًا
    timestamps: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    },
    
    // 🔹 لجعل JSON أكثر وضوحًا
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// 🔹 فهرس مركب لأداء أفضل
alertSchema.index({ sensorType: 1, severity: 1, createdAt: -1 });
alertSchema.index({ status: 1, acknowledged: 1 });
alertSchema.index({ deviceId: 1, createdAt: -1 });

// 🔹 virtual property: مدة نشاط الإنذار
alertSchema.virtual('duration').get(function() {
    if (!this.createdAt) return 0;
    const now = new Date();
    return Math.floor((now - this.createdAt) / 1000); // بالثواني
});

// 🔹 virtual property: هل الإنذار طارئ؟
alertSchema.virtual('isEmergency').get(function() {
    return this.severity === 'critical' || this.severity === 'high';
});

// 🔹 virtual property: هل الإنذار قديم؟
alertSchema.virtual('isStale').get(function() {
    if (!this.createdAt) return false;
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.createdAt < hourAgo && this.status === 'active';
});

// 🔹 Middleware: قبل الحفظ
alertSchema.pre('save', function(next) {
    // إذا كان الإنذار critical، اضمن رسالة واضحة
    if (this.severity === 'critical' && !this.message.includes('حرج')) {
        this.message = `🔥 إنذار حرج: ${this.message}`;
    }
    
    // إذا تم التعرف على الإنذار، تحديث الحالة
    if (this.acknowledged && this.status === 'active') {
        this.status = 'acknowledged';
        this.acknowledgedAt = this.acknowledgedAt || new Date();
    }
    
    // إذا تم الحل، تحديث الحالة
    if (this.resolved && this.status !== 'resolved') {
        this.status = 'resolved';
        this.resolvedAt = this.resolvedAt || new Date();
    }
    
    next();
});

// 🔹 دوال المثيل (Instance Methods)
alertSchema.methods = {
    // تأكيد قراءة الإنذار
    acknowledge(user = 'system') {
        this.acknowledged = true;
        this.acknowledgedAt = new Date();
        this.acknowledgedBy = user;
        this.status = 'acknowledged';
        return this.save();
    },

    // حل الإنذار
    resolve(notes = '') {
        this.resolved = true;
        this.resolvedAt = new Date();
        this.resolutionNotes = notes;
        this.status = 'resolved';
        return this.save();
    },

    // إعادة تنشيط الإنذار (إذا كان إنذار خاطئ)
    reactivate() {
        this.status = 'active';
        this.resolved = false;
        this.resolvedAt = undefined;
        this.acknowledged = false;
        this.acknowledgedAt = undefined;
        return this.save();
    },

    // الحصول على ملخص الإنذار
    getSummary() {
        return {
            id: this._id,
            sensor: this.sensorType,
            severity: this.severity,
            message: this.message,
            status: this.status,
            duration: this.duration,
            isEmergency: this.isEmergency,
            createdAt: this.createdAt
        };
    }
};

// 🔹 دوال ثابتة (Static Methods)
alertSchema.statics = {
    // إنشاء إنذار جديد
    async createAlert(data) {
        try {
            const alert = new this(data);
            await alert.save();
            
            // تسجيل الإنذار في السجل
            console.log(`🚨 إنذار جديد: ${alert.sensorType} - ${alert.severity} - ${alert.message}`);
            
            return alert;
        } catch (error) {
            console.error('❌ خطأ في إنشاء الإنذار:', error.message);
            throw error;
        }
    },

    // جلب الإنذارات النشطة
    async getActiveAlerts(options = {}) {
        const { limit = 50, sort = '-createdAt' } = options;
        
        return await this.find({ 
            status: 'active',
            resolved: false 
        })
        .sort(sort)
        .limit(limit)
        .lean();
    },

    // جلب إحصائيات الإنذارات
    async getAlertStats(timeRange = '24h') {
        const now = new Date();
        let startDate;

        switch (timeRange) {
            case '1h':
                startDate = new Date(now.getTime() - 60 * 60 * 1000);
                break;
            case '24h':
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }

        const stats = await this.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        severity: '$severity',
                        sensor: '$sensorType',
                        status: '$status'
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: '$_id.severity',
                    sensors: {
                        $push: {
                            sensor: '$_id.sensor',
                            status: '$_id.status',
                            count: '$count'
                        }
                    },
                    total: { $sum: '$count' }
                }
            },
            {
                $sort: { total: -1 }
            }
        ]);

        return {
            timeRange,
            startDate,
            endDate: now,
            totalAlerts: stats.reduce((sum, item) => sum + item.total, 0),
            bySeverity: stats
        };
    },

    // تنظيف الإنذارات القديمة
    async cleanupOldAlerts(daysToKeep = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const result = await this.deleteMany({
            createdAt: { $lt: cutoffDate },
            severity: { $ne: 'critical' },
            resolved: true
        });

        console.log(`🧹 تم تنظيف ${result.deletedCount} إنذار قديم`);
        return result;
    },

    // إنذار محاكاة (للتجربة)
    async simulateAlert(sensorType = 'temperature', severity = 'medium') {
        const messages = {
            temperature: {
                medium: 'درجة الحرارة مرتفعة قليلاً',
                high: 'درجة الحرارة مرتفعة بشكل خطير',
                critical: '🔥 خطر حراري! درجة الحرارة مرتفعة جداً'
            },
            gas: {
                medium: 'تم رصد نسبة غاز متوسطة',
                high: 'نسبة الغاز مرتفعة - تهوية مطلوبة',
                critical: '⚠️ خطر تسرب غاز! إخلاء المنطقة'
            },
            fire: {
                critical: '🔥 حريق! تفعيل نظام الإطفاء'
            },
            system: {
                low: 'النظام يعمل بشكل طبيعي',
                medium: 'تحذير: ذاكرة النظام مرتفعة',
                high: 'خطأ في اتصال قاعدة البيانات'
            }
        };

        const message = messages[sensorType]?.[severity] || `إنذار تجريبي: ${sensorType} - ${severity}`;

        return await this.createAlert({
            sensorType,
            message,
            severity,
            deviceId: 'simulation_device',
            location: 'مختبر المحاكاة',
            metadata: { simulated: true, testRun: true }
        });
    }
};

// 🔹 Export النموذج
const Alert = mongoose.model("Alert", alertSchema);

module.exports = Alert;