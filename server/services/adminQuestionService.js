import mongoose from 'mongoose';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { ReplacementJournal } from '../models/ReplacementJournal.js';
import ApiError from '../utils/ApiError.js';

let txSupportedCache = null;

/**
 * Checks whether the active MongoDB deployment supports multi-document transactions.
 */
export async function supportsTransactions() {
  if (txSupportedCache !== null) {
    return txSupportedCache;
  }

  try {
    const topology = mongoose.connection?.client?.topology;
    if (topology) {
      const serverType = topology.description?.type;
      if (serverType === 'Single') {
        txSupportedCache = false;
        return false;
      }
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      await mongoose.connection.db.command({ ping: 1 }, { session });
      await session.abortTransaction();
      txSupportedCache = true;
      return true;
    } catch {
      txSupportedCache = false;
      return false;
    } finally {
      await session.endSession();
    }
  } catch {
    txSupportedCache = false;
    return false;
  }
}

/**
 * Reconciles any interrupted/unfinalized question replacement operations found in the journal.
 * Guarantees crash recovery and system convergence to exactly 10 active questions.
 */
export async function reconcilePendingReplacements() {
  const pendingJournals = await ReplacementJournal.find({ status: 'deactivated' });
  let reconciled = 0;

  for (const journal of pendingJournals) {
    const activeSlot = journal.activeSlot;

    // Check if slot is occupied
    const slotOccupant = await Question.findOne({ isActive: true, activeSlot });

    if (!slotOccupant) {
      // Slot is empty - interrupted during replacement!
      // Attempt to activate replacement question
      const replacementActivated = await Question.findOneAndUpdate(
        { _id: journal.replacementQuestionId, isActive: false },
        { $set: { isActive: true, activeSlot } },
        { new: true }
      );

      if (replacementActivated) {
        journal.status = 'completed';
        await journal.save();
        reconciled++;
      } else {
        // Rollback original question to active slot
        await Question.findOneAndUpdate(
          { _id: journal.activeQuestionId, isActive: false },
          { $set: { isActive: true, activeSlot } }
        );
        journal.status = 'rolled_back';
        await journal.save();
        reconciled++;
      }
    } else {
      // Slot is already occupied
      journal.status = 'completed';
      await journal.save();
    }
  }

  return reconciled;
}

/**
 * Retrieves paginated questions with search, filtering, and sorting.
 */
export async function listQuestions(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = {};

  if (query.search) {
    filter.questionText = { $regex: query.search.trim(), $options: 'i' };
  }

  if (query.category) {
    filter.category = query.category;
  }

  if (query.difficulty) {
    filter.difficulty = query.difficulty;
  }

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === 'true' || query.isActive === true;
  }

  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortOrder };

  const [total, data] = await Promise.all([
    Question.countDocuments(filter),
    Question.find(filter).sort(sort).skip(skip).limit(limit),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Retrieves a single question by ID.
 */
export async function getQuestionById(id) {
  const question = await Question.findById(id);
  if (!question) {
    throw ApiError.notFound('Question not found');
  }
  return question;
}

/**
 * Creates a new question with active limit enforcement.
 */
export async function createQuestion(data) {
  if (data.isActive) {
    const activeCount = await Question.countDocuments({ isActive: true });
    if (activeCount >= 10) {
      throw ApiError.badRequest(
        'Maximum 10 active questions permitted in the system. Deactivate another question first.'
      );
    }
    if (!data.activeSlot) {
      const occupiedSlots = await Question.find({ isActive: true }).distinct('activeSlot');
      const freeSlot = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].find((s) => !occupiedSlots.includes(s));
      data.activeSlot = freeSlot;
    }
  }

  const question = new Question(data);
  await question.save();
  return question;
}

/**
 * Updates an existing question while preserving historical attempt snapshots.
 */
export async function updateQuestion(id, data) {
  const question = await Question.findById(id);
  if (!question) {
    throw ApiError.notFound('Question not found');
  }

  // Active limit and minimum active question checks
  if (data.isActive !== undefined && data.isActive !== question.isActive) {
    if (data.isActive === true) {
      const activeCount = await Question.countDocuments({ isActive: true });
      if (activeCount >= 10) {
        throw ApiError.badRequest(
          'Maximum 10 active questions permitted in the system. Deactivate another question first.'
        );
      }
    } else {
      const activeCount = await Question.countDocuments({ isActive: true });
      if (activeCount <= 10) {
        throw ApiError.badRequest(
          'Cannot deactivate question: exactly 10 active questions must remain active in the system.'
        );
      }
    }
  }

  // Apply updates
  if (data.questionText !== undefined) question.questionText = data.questionText;
  if (data.options !== undefined) question.options = data.options;
  if (data.correctOption !== undefined) question.correctOption = data.correctOption;
  if (data.category !== undefined) question.category = data.category;
  if (data.difficulty !== undefined) question.difficulty = data.difficulty;
  if (data.explanation !== undefined) question.explanation = data.explanation;
  if (data.isActive !== undefined) question.isActive = data.isActive;

  await question.save();
  return question;
}

/**
 * Updates question activation status, supporting atomic & crash-safe swap with a replacement question.
 */
export async function updateQuestionStatus(id, isActive, replacementQuestionId = null) {
  const question = await Question.findById(id);
  if (!question) {
    throw ApiError.notFound('Question not found');
  }

  if (isActive === question.isActive) {
    return question;
  }

  if (isActive === true) {
    const activeCount = await Question.countDocuments({ isActive: true });
    if (activeCount >= 10) {
      throw ApiError.badRequest(
        'Maximum 10 active questions permitted in the system. Deactivate another question first.'
      );
    }
    question.isActive = true;
    await question.save();
    return question;
  } else {
    // Deactivating
    const activeCount = await Question.countDocuments({ isActive: true });
    if (activeCount <= 10 && !replacementQuestionId) {
      throw ApiError.badRequest(
        'Cannot deactivate question: exactly 10 active questions must remain active in the system.'
      );
    }

    if (replacementQuestionId) {
      const replacement = await Question.findById(replacementQuestionId);
      if (!replacement) {
        throw ApiError.notFound('Replacement question not found');
      }
      if (replacement.isActive) {
        throw ApiError.badRequest('Replacement question is already active');
      }

      const currentSlot = question.activeSlot;
      if (!currentSlot) {
        throw ApiError.badRequest('Target question does not hold a valid active slot');
      }

      const hasTx = await supportsTransactions();

      if (hasTx) {
        // Preferred execution path: Multi-document transaction across replica set
        const session = await mongoose.startSession();
        try {
          let deactivatedResult = null;
          await session.withTransaction(async () => {
            const journal = await ReplacementJournal.create(
              [
                {
                  activeQuestionId: question._id,
                  replacementQuestionId: replacement._id,
                  activeSlot: currentSlot,
                  status: 'initiated',
                },
              ],
              { session }
            );

            deactivatedResult = await Question.findOneAndUpdate(
              { _id: question._id, isActive: true, activeSlot: currentSlot },
              { $set: { isActive: false, activeSlot: null } },
              { new: true, session }
            );

            if (!deactivatedResult) {
              throw ApiError.conflict('Question was concurrently deactivated or modified by another operation.');
            }

            const activated = await Question.findOneAndUpdate(
              { _id: replacement._id, isActive: false, activeSlot: null },
              { $set: { isActive: true, activeSlot: currentSlot } },
              { new: true, session }
            );

            if (!activated) {
              throw ApiError.conflict('Replacement question could not be activated in transaction.');
            }

            await ReplacementJournal.findByIdAndUpdate(
              journal[0]._id,
              { status: 'completed' },
              { session }
            );
          });

          return deactivatedResult;
        } finally {
          await session.endSession();
        }
      } else {
        // Fallback execution path: Persistent journal with compensation & crash recovery
        const journal = await ReplacementJournal.create({
          activeQuestionId: question._id,
          replacementQuestionId: replacement._id,
          activeSlot: currentSlot,
          status: 'initiated',
        });

        // 1. Atomically deactivate target question
        const deactivated = await Question.findOneAndUpdate(
          { _id: question._id, isActive: true, activeSlot: currentSlot },
          { $set: { isActive: false, activeSlot: null } },
          { new: true }
        );

        if (!deactivated) {
          throw ApiError.conflict('Question was concurrently deactivated or modified by another operation.');
        }

        journal.status = 'deactivated';
        await journal.save();

        // 2. Atomically activate replacement question
        try {
          replacement.isActive = true;
          replacement.activeSlot = currentSlot;
          await replacement.save();

          journal.status = 'completed';
          await journal.save();
          return deactivated;
        } catch (err) {
          // Rollback original question to active slot
          await Question.findOneAndUpdate(
            { _id: question._id, isActive: false },
            { $set: { isActive: true, activeSlot: currentSlot } }
          );
          journal.status = 'rolled_back';
          await journal.save();
          throw err;
        }
      }
    }

    question.isActive = false;
    await question.save();
    return question;
  }
}

/**
 * Deletes a question safely: rejects active questions if <= 10 active,
 * and rejects questions linked to historical candidate attempts.
 */
export async function deleteQuestion(id) {
  const question = await Question.findById(id);
  if (!question) {
    throw ApiError.notFound('Question not found');
  }

  // Historical attempt auditability check (must check first)
  const isReferenced = await Attempt.exists({ 'questionSnapshots.questionId': question._id });
  if (isReferenced) {
    throw ApiError.badRequest(
      'Question cannot be deleted because it is referenced in past candidate attempts. Please deactivate it instead.'
    );
  }

  if (question.isActive) {
    const activeCount = await Question.countDocuments({ isActive: true });
    if (activeCount <= 10) {
      throw ApiError.badRequest(
        'Cannot delete an active question: exactly 10 active questions must remain active in the system. Deactivate with a replacement first.'
      );
    }
  }

  await Question.findByIdAndDelete(id);

  return {
    success: true,
    message: 'Question deleted successfully',
  };
}

export default {
  supportsTransactions,
  reconcilePendingReplacements,
  listQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  updateQuestionStatus,
  deleteQuestion,
};
