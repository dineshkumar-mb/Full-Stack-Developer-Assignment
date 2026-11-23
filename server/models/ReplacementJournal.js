import mongoose from 'mongoose';

const replacementJournalSchema = new mongoose.Schema(
  {
    activeQuestionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
      index: true,
    },
    replacementQuestionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
      index: true,
    },
    activeSlot: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    status: {
      type: String,
      enum: ['initiated', 'deactivated', 'completed', 'rolled_back'],
      default: 'initiated',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const ReplacementJournal = mongoose.model('ReplacementJournal', replacementJournalSchema);
export default ReplacementJournal;
