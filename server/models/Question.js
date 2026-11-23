import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';

const optionSchema = new mongoose.Schema(
  {
    optionId: {
      type: String,
      required: true,
      enum: ['A', 'B', 'C', 'D'],
    },
    text: {
      type: String,
      required: [true, 'Option text is required'],
      trim: true,
      minlength: [1, 'Option text cannot be empty'],
      maxlength: [500, 'Option text cannot exceed 500 characters'],
    },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    seedId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      minlength: [10, 'Question text must be at least 10 characters'],
      maxlength: [1000, 'Question text cannot exceed 1000 characters'],
    },
    options: {
      type: [optionSchema],
      required: true,
      validate: [
        {
          validator: (options) => Array.isArray(options) && options.length === 4,
          message: 'Questions must have exactly 4 options',
        },
        {
          validator: (options) => {
            if (!Array.isArray(options)) return false;
            const ids = options.map((opt) => opt.optionId);
            const expectedIds = ['A', 'B', 'C', 'D'];
            return expectedIds.every((id) => ids.includes(id)) && ids.length === 4;
          },
          message: 'Options must uniquely cover options A, B, C, and D',
        },
      ],
    },
    correctOption: {
      type: String,
      required: [true, 'Correct option is required'],
      enum: {
        values: ['A', 'B', 'C', 'D'],
        message: '{VALUE} is not a valid correct option',
      },
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['Quantitative', 'Logical Reasoning', 'Verbal'],
        message: '{VALUE} is not a valid category',
      },
      index: true,
    },
    difficulty: {
      type: String,
      required: [true, 'Difficulty is required'],
      enum: {
        values: ['Easy', 'Medium', 'Hard'],
        message: '{VALUE} is not a valid difficulty level',
      },
      index: true,
    },
    explanation: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    activeSlot: {
      type: Number,
      min: 1,
      max: 10,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

questionSchema.index({ activeSlot: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
questionSchema.index({ createdAt: -1 });

// Pre-save validation: Check that the correct option matches one of the provided options
questionSchema.pre('validate', function (next) {
  if (this.options && this.correctOption) {
    const validIds = this.options.map((o) => o.optionId);
    if (!validIds.includes(this.correctOption)) {
      return next(new Error(`Correct option '${this.correctOption}' does not match any option ID`));
    }
  }
  next();
});

// Guard against exceeding maximum 10 active questions via database-safe slot allocation
questionSchema.pre('save', async function (next) {
  if (this.isActive) {
    if (!this.activeSlot) {
      const occupiedSlots = await this.constructor
        .find({ isActive: true, activeSlot: { $ne: null } })
        .distinct('activeSlot');
      const allSlots = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const freeSlot = allSlots.find((s) => !occupiedSlots.includes(s));

      if (!freeSlot) {
        return next(
          new ApiError(400, 'Maximum 10 active questions permitted in the system. Deactivate another question first.')
        );
      }
      this.activeSlot = freeSlot;
    }
  } else {
    this.activeSlot = null;
  }
  next();
});

export const Question = mongoose.model('Question', questionSchema);
export default Question;
