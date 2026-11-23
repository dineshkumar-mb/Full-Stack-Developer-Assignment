import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import ApiError from '../utils/ApiError.js';

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
 * Updates question activation status, supporting atomic swap with a replacement question.
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

      // Atomically mark current question inactive
      const deactivated = await Question.findOneAndUpdate(
        { _id: question._id, isActive: true, activeSlot: currentSlot },
        { $set: { isActive: false, activeSlot: null } },
        { new: true }
      );

      if (!deactivated) {
        throw ApiError.conflict('Question was concurrently deactivated or modified by another operation.');
      }

      // Activate replacement question in the vacated slot with compensation rollback
      try {
        replacement.isActive = true;
        replacement.activeSlot = currentSlot;
        await replacement.save();
      } catch (err) {
        // Rollback original question to active state if replacement activation fails
        await Question.findByIdAndUpdate(question._id, {
          isActive: true,
          activeSlot: currentSlot,
        });
        throw err;
      }

      return deactivated;
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
  listQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  updateQuestionStatus,
  deleteQuestion,
};
