import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      required: true,
      unique: true,
      default: 'GLOBAL_SETTINGS',
    },
    testDurationMinutes: {
      type: Number,
      required: [true, 'Test duration is required'],
      min: [5, 'Test duration must be at least 5 minutes'],
      max: [180, 'Test duration cannot exceed 180 minutes'],
      default: 15,
    },
    passPercentage: {
      type: Number,
      required: [true, 'Pass percentage is required'],
      min: [1, 'Pass percentage must be at least 1%'],
      max: [100, 'Pass percentage cannot exceed 100%'],
      default: 60,
    },
    correctMarkWeight: {
      type: Number,
      required: [true, 'Correct mark weight is required'],
      min: [0.1, 'Correct mark weight must be positive'],
      default: 2,
    },
    negativeMarkWeight: {
      type: Number,
      required: [true, 'Negative mark weight is required'],
      min: [0, 'Negative mark weight cannot be negative'],
      default: 1,
    },
    totalTestQuestions: {
      type: Number,
      required: [true, 'Total test questions count is required'],
      validate: {
        validator: (v) => v === 10,
        message: 'Total test questions must be exactly 10',
      },
      default: 10,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Static method to retrieve or initialize singleton settings document
settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
  if (!settings) {
    settings = await this.create({
      singletonKey: 'GLOBAL_SETTINGS',
      testDurationMinutes: 15,
      passPercentage: 60,
      correctMarkWeight: 2,
      negativeMarkWeight: 1,
      totalTestQuestions: 10,
    });
  }
  return settings;
};

export const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
