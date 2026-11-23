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
      default: null,
      validate: [
        {
          validator: function (v) {
            if (v === null || v === undefined) return true;
            return Number.isInteger(v) && v >= 1 && v <= 10;
          },
          message: 'activeSlot must be an integer between 1 and 10 or null',
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Engine-level partial unique index strictly preventing duplicate active slots
questionSchema.index(
  { activeSlot: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);
questionSchema.index({ createdAt: -1 });

// Pre-validate validation: Check option coverage and slot-activation invariants
questionSchema.pre('validate', function (next) {
  if (this.options && this.correctOption) {
    const validIds = this.options.map((o) => o.optionId);
    if (!validIds.includes(this.correctOption)) {
      return next(new ApiError(400, `Correct option '${this.correctOption}' does not match any option ID`));
    }
  }

  // Cross-field invariant validation
  if (this.isActive === true) {
    if (this.activeSlot !== undefined && this.activeSlot !== null) {
      if (!Number.isInteger(this.activeSlot) || this.activeSlot < 1 || this.activeSlot > 10) {
        return next(new ApiError(400, 'Active questions must have an integer activeSlot between 1 and 10'));
      }
    }
  } else if (this.isActive === false) {
    if (this.activeSlot !== null && this.activeSlot !== undefined) {
      return next(new ApiError(400, 'Inactive questions must have activeSlot null'));
    }
  }

  next();
});

// Guard against exceeding maximum 10 active questions via database-safe slot allocation
questionSchema.pre('save', async function (next) {
  if (this.isActive) {
    if (this.activeSlot === null || this.activeSlot === undefined) {
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
    } else {
      if (!Number.isInteger(this.activeSlot) || this.activeSlot < 1 || this.activeSlot > 10) {
        return next(new ApiError(400, 'activeSlot must be an integer between 1 and 10'));
      }
    }
  } else {
    this.activeSlot = null;
  }
  next();
});

// Query Middleware to enforce slot invariants across all update paths
function validateUpdateInvariants(next) {
  const update = this.getUpdate();
  if (!update) return next();

  const setObj = update.$set || update;

  // Validate activeSlot if being modified
  if (setObj.activeSlot !== undefined) {
    const slot = setObj.activeSlot;
    if (slot !== null) {
      if (!Number.isInteger(slot) || slot < 1 || slot > 10) {
        return next(new ApiError(400, 'activeSlot must be an integer between 1 and 10 or null'));
      }
    }
  }

  // Active question cannot have null or missing activeSlot
  if (setObj.isActive === true && setObj.activeSlot === null) {
    return next(new ApiError(400, 'Active questions cannot have a null activeSlot'));
  }

  // Inactive question cannot have a non-null activeSlot
  if (setObj.isActive === false && setObj.activeSlot !== null && setObj.activeSlot !== undefined) {
    return next(new ApiError(400, 'Inactive questions must have activeSlot null'));
  }

  next();
}

questionSchema.pre('findOneAndUpdate', validateUpdateInvariants);
questionSchema.pre('updateOne', validateUpdateInvariants);
questionSchema.pre('updateMany', validateUpdateInvariants);

/**
 * Applies collection-level validation rules on the questions collection in MongoDB
 */
export async function ensureQuestionCollectionValidator(db) {
  if (!db) return;
  try {
    await db.command({
      collMod: 'questions',
      validator: {
        $expr: {
          $cond: {
            if: { $eq: ['$isActive', true] },
            then: {
              $and: [
                { $ne: ['$activeSlot', null] },
                { $gte: ['$activeSlot', 1] },
                { $lte: ['$activeSlot', 10] },
                { $eq: [{ $floor: '$activeSlot' }, '$activeSlot'] },
              ],
            },
            else: {
              $eq: ['$activeSlot', null],
            },
          },
        },
      },
      validationLevel: 'moderate',
    });
  } catch {
    // If collection does not exist yet or collMod not supported on the driver session, ignore
  }
}

export const Question = mongoose.model('Question', questionSchema);
export default Question;
