const mongoose = require("mongoose");

/**
 * نموذج التحكم بالأجهزة - لإرسال الأوامر إلى الأجهزة الطرفية
 * يدعم: أجهزة الإنذار (Buzzer)، مصابيح LED، شاشات LCD
 * يستخدمه: الميكروكونترولر لقراءة الأوامر الجديدة وتنفيذها
 */

const deviceControlSchema = new mongoose.Schema(
  {
    // 🔹 معرف الجهاز (فريد لكل جهاز فيزيائي)
    deviceId: {
      type: String,
      required: [true, "معرف الجهاز مطلوب"],
      trim: true,
      lowercase: true,
      index: true,
      default: function() {
        // توليد معرف افتراضي إذا لم يتم تقديمه
        return `${this.deviceType}_${Date.now()}`;
      }
    },

    // 🔹 نوع الجهاز
    deviceType: {
      type: String,
      enum: {
        values: ["buzzer", "led", "lcd", "relay", "motor", "valve"],
        message: "نوع الجهاز يجب أن يكون: buzzer, led, lcd, relay, motor, valve"
      },
      required: [true, "نوع الجهاز مطلوب"],
      trim: true,
      lowercase: true,
      index: true
    },

    // 🔹 موقع الجهاز
    location: {
      type: String,
      trim: true,
      default: "unknown",
      index: true
    },

    // 🔹 نوع العملية/الأمر
    command: {
      type: String,
      enum: {
        values: ["on", "off", "toggle", "pulse", "blink", "show", "clear", "custom"],
        message: "الأمر يجب أن يكون: on, off, toggle, pulse, blink, show, clear, custom"
      },
      required: [true, "نوع الأمر مطلوب"],
      trim: true,
      lowercase: true,
      index: true
    },

    // 🔹 قيمة الأمر (إذا كانت رقمية)
    commandValue: {
      type: Number,
      min: [0, "القيمة يجب أن تكون موجبة أو صفر"],
      max: [255, "القيمة يجب أن تكون أقل من 256"],
      validate: {
        validator: function(value) {
          // التحقق بناءً على نوع الجهاز
          if (this.deviceType === "led") {
            return value >= 0 && value <= 100; // سطوع LED كنسبة مئوية
          }
          if (this.deviceType === "buzzer") {
            return value >= 100 && value <= 5000; // تردد البوزر بالهرتز
          }
          return true;
        },
        message: "قيمة الأمر غير مناسبة لنوع الجهاز"
      }
    },

    // 🔹 نص الرسالة (لشاشات LCD)
    displayText: {
      type: String,
      trim: true,
      maxlength: [32, "النص لا يمكن أن يتجاوز 32 حرفًا لشاشات LCD"],
      required: function() {
        return this.command === "show" && this.deviceType === "lcd";
      }
    },

    // 🔹 معلمات إضافية
    parameters: {
      duration: {
        type: Number, // المدة بالمللي ثانية
        min: [0, "المدة يجب أن تكون موجبة"],
        default: 0 // 0 يعني دائم
      },
      frequency: {
        type: Number, // التكرار بالهرتز (للوميض)
        min: [0, "التردد يجب أن يكون موجبًا"],
        default: 1
      },
      repeat: {
        type: Number, // عدد مرات التكرار
        min: [0, "عدد التكرارات يجب أن يكون موجبًا"],
        default: 1
      },
      priority: {
        type: Number, // أولوية التنفيذ
        min: [1, "الأولوية يجب أن تكون بين 1-10"],
        max: [10, "الأولوية يجب أن تكون بين 1-10"],
        default: 5
      }
    },

    // 🔹 حالة الأمر
    status: {
      type: String,
      enum: {
        values: ["pending", "sent", "executing", "completed", "failed", "cancelled"],
        message: "حالة الأمر يجب أن تكون: pending, sent, executing, completed, failed, cancelled"
      },
      default: "pending",
      index: true
    },

    // 🔹 وقت إرسال الأمر إلى الجهاز
    sentAt: {
      type: Date
    },

    // 🔹 وقت استلام التأكيد من الجهاز
    acknowledgedAt: {
      type: Date
    },

    // 🔹 وقت اكتمال التنفيذ
    completedAt: {
      type: Date
    },

    // 🔹 استجابة الجهاز
    deviceResponse: {
      type: String,
      trim: true
    },

    // 🔹 رمز الخطأ (إذا فشل الأمر)
    errorCode: {
      type: String,
      trim: true
    },

    // 🔹 رسالة الخطأ
    errorMessage: {
      type: String,
      trim: true
    },

    // 🔹 مصدر الأمر
    source: {
      type: String,
      enum: ["system", "manual", "schedule", "emergency", "api"],
      default: "manual",
      index: true
    },

    // 🔹 المستخدم الذي طلب الأمر
    requestedBy: {
      type: String,
      trim: true,
      default: "system"
    },

    // 🔹 هل الأمر مستعجل؟
    isUrgent: {
      type: Boolean,
      default: false,
      index: true
    },

    // 🔹 تاريخ انتهاء الصلاحية (للأوامر المؤقتة)
    expiresAt: {
      type: Date
    },

    // 🔹 بيانات إضافية
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    // 🔹 إضافة الطوابع الزمنية تلقائيًا
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    },
    
    // 🔹 لجعل JSON أكثر وضوحًا
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// 🔹 فهارس مركبة لأداء أفضل
deviceControlSchema.index({ deviceType: 1, status: 1, createdAt: -1 });
deviceControlSchema.index({ deviceId: 1, status: 1 });
deviceControlSchema.index({ isUrgent: 1, status: 1, createdAt: -1 });
deviceControlSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 🔹 virtual property: هل الأمر منتهي الصلاحية؟
deviceControlSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// 🔹 virtual property: هل الأمر نشط وقابل للتنفيذ؟
deviceControlSchema.virtual('isActive').get(function() {
  return this.status === 'pending' || this.status === 'sent';
});

// 🔹 virtual property: مدة انتظار الأمر
deviceControlSchema.virtual('waitingTime').get(function() {
  if (!this.createdAt || this.status !== 'pending') return 0;
  const now = new Date();
  return Math.floor((now - this.createdAt) / 1000); // بالثواني
});

// 🔹 virtual property: أمر الطوارئ؟
deviceControlSchema.virtual('isEmergencyCommand').get(function() {
  return this.source === 'emergency' || this.isUrgent;
});

// 🔹 Middleware: قبل التحقق من الصحة
deviceControlSchema.pre('validate', function(next) {
  // التأكد من أن displayText مطلوب لشاشات LCD عند أمر show
  if (this.deviceType === 'lcd' && this.command === 'show' && !this.displayText) {
    this.invalidate('displayText', 'نص العرض مطلوب لشاشات LCD عند استخدام أمر show');
  }
  
  // التأكد من أن commandValue موجود عند الحاجة
  if ((this.command === 'pulse' || this.command === 'blink') && !this.commandValue) {
    this.invalidate('commandValue', 'قيمة الأمر مطلوبة لأوامر pulse و blink');
  }
  
  next();
});

// 🔹 Middleware: قبل الحفظ
deviceControlSchema.pre('save', function(next) {
  // إذا كان الأمر مستعجلًا، ضع أولوية عالية
  if (this.isUrgent && this.parameters.priority < 8) {
    this.parameters.priority = 10;
  }
  
  // إذا كان الأمر من الطوارئ، ضع علامة urgent تلقائيًا
  if (this.source === 'emergency' && !this.isUrgent) {
    this.isUrgent = true;
  }
  
  // إذا انتهت صلاحية الأمر، غيّر حالته
  if (this.isExpired && this.status === 'pending') {
    this.status = 'cancelled';
    this.errorMessage = 'انتهت صلاحية الأمر قبل التنفيذ';
  }
  
  next();
});

// 🔹 دوال المثيل (Instance Methods)
deviceControlSchema.methods = {
  // إرسال الأمر إلى الجهاز
  async sendToDevice() {
    try {
      this.status = 'sent';
      this.sentAt = new Date();
      await this.save();
      
      // هنا سيكون كود الاتصال الفعلي بالجهاز
      console.log(`📤 تم إرسال الأمر إلى الجهاز ${this.deviceId}: ${this.command}`);
      
      return this;
    } catch (error) {
      console.error('❌ فشل إرسال الأمر:', error.message);
      this.status = 'failed';
      this.errorMessage = error.message;
      await this.save();
      throw error;
    }
  },

  // تأكيد استلام الأمر من الجهاز
  async acknowledge(response = '') {
    this.status = 'executing';
    this.acknowledgedAt = new Date();
    this.deviceResponse = response;
    return this.save();
  },

  // إكمال تنفيذ الأمر
  async complete(response = 'تم التنفيذ بنجاح') {
    this.status = 'completed';
    this.completedAt = new Date();
    this.deviceResponse = response;
    return this.save();
  },

  // فشل التنفيذ
  async fail(errorCode = 'UNKNOWN', errorMessage = 'فشل غير معروف') {
    this.status = 'failed';
    this.errorCode = errorCode;
    this.errorMessage = errorMessage;
    return this.save();
  },

  // إلغاء الأمر
  async cancel(reason = 'تم الإلغاء يدويًا') {
    this.status = 'cancelled';
    this.errorMessage = reason;
    return this.save();
  },

  // الحصول على ملخص الأمر
  getSummary() {
    return {
      id: this._id,
      deviceId: this.deviceId,
      deviceType: this.deviceType,
      command: this.command,
      status: this.status,
      isUrgent: this.isUrgent,
      waitingTime: this.waitingTime,
      createdAt: this.createdAt
    };
  },

  // توليد كود الأمر للميكروكونترولر
  generateCommandCode() {
    const commands = {
      buzzer: {
        on: `BUZZER_ON(${this.commandValue || 1000})`,
        off: 'BUZZER_OFF()',
        pulse: `BUZZER_PULSE(${this.commandValue || 1000}, ${this.parameters.duration || 100})`
      },
      led: {
        on: `LED_ON(${this.commandValue || 100})`,
        off: 'LED_OFF()',
        blink: `LED_BLINK(${this.commandValue || 50}, ${this.parameters.frequency || 2})`
      },
      lcd: {
        show: `LCD_SHOW("${this.displayText || ''}")`,
        clear: 'LCD_CLEAR()'
      }
    };

    return commands[this.deviceType]?.[this.command] || `CMD_${this.command.toUpperCase()}`;
  }
};

// 🔹 دوال ثابتة (Static Methods)
deviceControlSchema.statics = {
  // إنشاء أمر جديد
  async createCommand(data) {
    try {
      const command = new this(data);
      await command.save();
      
      // تسجيل إنشاء الأمر
      console.log(`🆕 أمر جديد: ${command.deviceType} - ${command.command} - ${command.deviceId}`);
      
      return command;
    } catch (error) {
      console.error('❌ خطأ في إنشاء الأمر:', error.message);
      throw error;
    }
  },

  // جلب الأوامر المعلقة لجهاز معين
  async getPendingCommands(deviceId, limit = 10) {
    return await this.find({ 
      deviceId,
      status: 'pending',
      expiresAt: { $gt: new Date() } // فقط الأوامر غير المنتهية
    })
    .sort({ 
      'parameters.priority': -1, 
      createdAt: 1 
    })
    .limit(limit)
    .lean();
  },

  // جلب الأوامر النشطة
  async getActiveCommands(options = {}) {
    const { deviceType, location, limit = 20 } = options;
    const query = {
      status: { $in: ['pending', 'sent', 'executing'] }
    };

    if (deviceType) query.deviceType = deviceType;
    if (location) query.location = location;

    return await this.find(query)
      .sort({ 
        isUrgent: -1,
        'parameters.priority': -1,
        createdAt: 1 
      })
      .limit(limit)
      .lean();
  },

  // تنظيف الأوامر القديمة
  async cleanupOldCommands(daysToKeep = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.deleteMany({
      createdAt: { $lt: cutoffDate },
      status: { $in: ['completed', 'failed', 'cancelled'] }
    });

    console.log(`🧹 تم تنظيف ${result.deletedCount} أمر قديم`);
    return result;
  },

  // أمر محاكاة (للتجربة)
  async simulateCommand(deviceType = 'led', command = 'on', deviceId = null) {
    const deviceNames = {
      led: ['led_kitchen', 'led_bedroom', 'led_living'],
      buzzer: ['buzzer_main', 'buzzer_backup'],
      lcd: ['lcd_display1', 'lcd_display2']
    };

    const selectedDeviceId = deviceId || 
      deviceNames[deviceType]?.[Math.floor(Math.random() * deviceNames[deviceType].length)] || 
      `${deviceType}_test_${Date.now()}`;

    const commandData = {
      deviceId: selectedDeviceId,
      deviceType,
      command,
      location: 'مختبر المحاكاة',
      source: 'simulation',
      requestedBy: 'test_script',
      metadata: { simulated: true }
    };

    // إضافة بيانات خاصة بكل نوع
    if (deviceType === 'lcd' && command === 'show') {
      commandData.displayText = '🔥 تجربة نظام الإنذار 🔥';
    } else if (deviceType === 'led' || deviceType === 'buzzer') {
      commandData.commandValue = deviceType === 'led' ? 75 : 2000;
    }

    return await this.createCommand(commandData);
  },

  // إحصائيات الأوامر
  async getCommandStats(timeRange = '24h') {
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
            deviceType: '$deviceType',
            status: '$status',
            command: '$command'
          },
          count: { $sum: 1 },
          avgResponseTime: {
            $avg: {
              $cond: [
                { $and: ['$sentAt', '$completedAt'] },
                { $subtract: ['$completedAt', '$sentAt'] },
                null
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: '$_id.deviceType',
          commands: {
            $push: {
              command: '$_id.command',
              status: '$_id.status',
              count: '$count',
              avgResponseTime: '$avgResponseTime'
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
      totalCommands: stats.reduce((sum, item) => sum + item.total, 0),
      byDeviceType: stats
    };
  }
};

// 🔹 Export النموذج as SensorReading (was mistakenly exporting DeviceControl)
const SensorReading = mongoose.model("SensorReading", deviceControlSchema);

module.exports = SensorReading;