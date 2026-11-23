import mongoose from 'mongoose';

const questionSnapshotSchema = new mongoose.Schema(
  {
    snapshotId: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    orderNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    questionText: {
      type: String,
      required: true,
    },
    options: [
      {
        optionId: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
        text: { type: String, required: true },
        _id: false,
      },
    ],
    correctOption: {
      type: String,
      enum: ['A', 'B', 'C', 'D'],
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      required: true,
    },
    candidateAnswer: {
      type: String,
      enum: ['A', 'B', 'C', 'D', null],
      default: null,
    },
    isMarkedForReview: {
      type: Boolean,
      default: false,
    },
    isCorrect: {
      type: Boolean,
      default: null,
    },
    answeredAt: {
      type: Date,
      default: null,
    },
  },
  { _id: true }
);

const scoreSummarySchema = new mongoose.Schema(
  {
    totalQuestions: { type: Number, default: 10 },
    correctCount: { type: Number, default: 0 },
    incorrectCount: { type: Number, default: 0 },
    unattemptedCount: { type: Number, default: 10 },
    marksGained: { type: Number, default: 0 },
    marksDeducted: { type: Number, default: 0 },
    netScore: { type: Number, default: 0 },
    scaledScoreOutOf10: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    passPercentageCutoff: { type: Number, default: 60 },
    isPassed: { type: Boolean, default: false },
    timeTakenSeconds: { type: Number, default: 0 },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: [true, 'Candidate ID is required'],
      unique: true,
      index: true,
    },
    candidateEmail: {
      type: String,
      required: [true, 'Candidate email is required'],
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    candidateSnapshot: {
      type: Object,
      required: true,
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'timed_out'],
      default: 'in_progress',
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    submittedAt: {
      type: Date,
      default: null,
      index: true,
    },
    submissionType: {
      type: String,
      enum: ['manual', 'auto_timeout', null],
      default: null,
    },
    questionSnapshots: {
      type: [questionSnapshotSchema],
      required: true,
      validate: {
        validator: (snapshots) => Array.isArray(snapshots) && snapshots.length === 10,
        message: 'Assessment attempt must contain exactly 10 question snapshots',
      },
    },
    scoreSummary: {
      type: scoreSummarySchema,
      default: () => ({}),
    },
    settingsSnapshot: {
      type: Object,
      required: true,
    },
    version: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

attemptSchema.index({ submittedAt: -1 });

export const Attempt = mongoose.model('Attempt', attemptSchema);
export default Attempt;
