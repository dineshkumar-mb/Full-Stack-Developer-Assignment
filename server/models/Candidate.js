import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [50, 'Full name cannot exceed 50 characters'],
      match: [/^[A-Za-z\s]+$/, 'Full name must contain only letters and spaces'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [18, 'Candidate must be at least 18 years old'],
      max: [60, 'Candidate age cannot exceed 60 years'],
      validate: {
        validator: Number.isInteger,
        message: 'Age must be an integer',
      },
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^[0-9]{10}$/, 'Phone number must be exactly 10 digits'],
    },
    gender: {
      type: String,
      enum: {
        values: ['Male', 'Female', 'Non-Binary', 'Prefer not to say', 'Other', ''],
        message: '{VALUE} is not a valid gender selection',
      },
      default: '',
    },
    highestQualification: {
      type: String,
      required: [true, 'Highest qualification is required'],
      trim: true,
      enum: {
        values: ['High School', 'Diploma', "Bachelor's Degree", "Master's Degree", 'Doctorate', 'Other'],
        message: '{VALUE} is not a recognized qualification option',
      },
    },
    city: {
      type: String,
      trim: true,
      maxlength: [50, 'City cannot exceed 50 characters'],
      default: '',
    },
    hasAttempted: {
      type: Boolean,
      default: false,
    },
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attempt',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Backward-compatible field mapping
candidateSchema.pre('validate', function (next) {
  if (!this.phoneNumber && this.get('phone')) {
    this.phoneNumber = this.get('phone');
  }
  if (!this.highestQualification && this.get('qualification')) {
    this.highestQualification = this.get('qualification');
  }
  next();
});

candidateSchema.virtual('phone').get(function () {
  return this.phoneNumber;
});

candidateSchema.virtual('qualification').get(function () {
  return this.highestQualification;
});

candidateSchema.index({ fullName: 1 });

export const Candidate = mongoose.model('Candidate', candidateSchema);
export default Candidate;
