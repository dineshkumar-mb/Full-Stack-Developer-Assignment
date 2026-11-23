import mongoose from 'mongoose';
import { Attempt } from '../models/Attempt.js';
import { Question } from '../models/Question.js';
import { Settings } from '../models/Settings.js';
import { Candidate } from '../models/Candidate.js';
import { secureShuffle } from '../utils/shuffle.js';
import { evaluateAttempt } from './scoringService.js';
import ApiError from '../utils/ApiError.js';

/**
 * Initializes a new assessment attempt for the candidate or recovers existing in-progress attempt.
 */
export async function initializeAssessment(candidate) {
  if (!candidate) {
    throw ApiError.unauthorized('Candidate authentication required');
  }

  // Check if candidate already has an attempt record
  const existingAttempt = await Attempt.findOne({ candidateId: candidate._id });

  if (existingAttempt) {
    if (existingAttempt.status === 'in_progress') {
      // Opportunistic expiry check (past 30s grace period)
      const now = Date.now();
      const gracePeriodExpiry = new Date(existingAttempt.expiresAt).getTime() + 30000;
      if (now > gracePeriodExpiry) {
        return finalizeAttemptAtomically(existingAttempt._id, 'auto_timeout');
      }
      return existingAttempt;
    }
    // Completed or timed out
    throw ApiError.badRequest('Assessment has already been completed. Repeated attempts are not permitted.');
  }

  // Verify that active question count is exactly 10
  const activeQuestions = await Question.find({ isActive: true });
  if (activeQuestions.length !== 10) {
    throw ApiError.badRequest(
      `Cannot start assessment: Question bank requires exactly 10 active questions (currently ${activeQuestions.length} active).`
    );
  }

  // Fetch current global settings snapshot
  const settings = await Settings.getSettings();
  const durationMinutes = settings.testDurationMinutes || 15;
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);

  // Per-candidate randomized shuffle (Fisher-Yates)
  const shuffledQuestions = secureShuffle(activeQuestions);

  // Create immutable question snapshots
  const questionSnapshots = shuffledQuestions.map((q, idx) => ({
    snapshotId: new mongoose.Types.ObjectId().toString(),
    questionId: q._id,
    orderNumber: idx + 1,
    questionText: q.questionText,
    options: q.options.map((opt) => ({
      optionId: opt.optionId,
      text: opt.text,
    })),
    correctOption: q.correctOption,
    category: q.category,
    difficulty: q.difficulty,
    explanation: q.explanation || '',
    candidateAnswer: null,
    isMarkedForReview: false,
    isCorrect: null,
    answeredAt: null,
  }));

  const candidateSnapshot = {
    candidateId: candidate._id,
    fullName: candidate.fullName,
    email: candidate.email,
    age: candidate.age,
    phoneNumber: candidate.phoneNumber,
    highestQualification: candidate.highestQualification,
  };

  const settingsSnapshot = {
    testDurationMinutes: durationMinutes,
    passPercentage: settings.passPercentage,
    correctMarkWeight: settings.correctMarkWeight,
    negativeMarkWeight: settings.negativeMarkWeight,
    totalTestQuestions: settings.totalTestQuestions || 10,
  };

  const attempt = await Attempt.create({
    candidateId: candidate._id,
    candidateEmail: candidate.email,
    candidateSnapshot,
    status: 'in_progress',
    startedAt,
    expiresAt,
    questionSnapshots,
    settingsSnapshot,
    version: 0,
  });

  // Link attempt to candidate record
  await Candidate.findByIdAndUpdate(candidate._id, {
    hasAttempted: true,
    attemptId: attempt._id,
  });

  return attempt;
}

/**
 * Retrieves the candidate's existing attempt with refresh recovery and opportunistic expiry handling.
 */
export async function getOrRecoverCurrentAttempt(candidateId) {
  const attempt = await Attempt.findOne({ candidateId });

  if (!attempt) {
    throw ApiError.notFound('No assessment attempt found for this candidate. Please start the assessment first.');
  }

  // If in progress, check if time limit has passed (plus 30s grace period)
  if (attempt.status === 'in_progress') {
    const now = Date.now();
    const gracePeriodExpiry = new Date(attempt.expiresAt).getTime() + 30000;
    if (now > gracePeriodExpiry) {
      return finalizeAttemptAtomically(attempt._id, 'auto_timeout');
    }
  }

  return attempt;
}

/**
 * Updates a candidate's answer and/or marked-for-review status with concurrency and timer protections.
 */
export async function updateCandidateAnswer(candidateId, questionSnapshotId, updates) {
  const attempt = await Attempt.findOne({ candidateId });

  if (!attempt) {
    throw ApiError.notFound('Assessment attempt not found');
  }

  if (attempt.status !== 'in_progress') {
    throw ApiError.alreadyFinalized('Assessment is already completed and cannot be modified');
  }

  // Strict Server-Authoritative Timer: Answer modifications stop immediately at expiresAt
  const now = Date.now();
  const expiresAtMs = new Date(attempt.expiresAt).getTime();
  if (now >= expiresAtMs) {
    throw ApiError.badRequest('Assessment time limit has expired. Answers cannot be changed.');
  }

  // Locate the target snapshot within the candidate's attempt
  const snapshotIndex = attempt.questionSnapshots.findIndex(
    (s) =>
      s.snapshotId === questionSnapshotId ||
      s._id?.toString() === questionSnapshotId ||
      s.questionId?.toString() === questionSnapshotId
  );

  if (snapshotIndex === -1) {
    throw ApiError.notFound(`Question snapshot '${questionSnapshotId}' not found in this assessment`);
  }

  const snapshot = attempt.questionSnapshots[snapshotIndex];

  // Enforce monotonic clientSequence ordering:
  // If a delayed, older sequence request arrives after a newer sequence was already recorded,
  // do not overwrite the newer state in the database.
  if (updates.sequence !== undefined) {
    const incomingSeq = Number(updates.sequence);
    const existingSeq = Number(snapshot.clientSequence || 0);
    if (incomingSeq < existingSeq) {
      return snapshot;
    }
    snapshot.clientSequence = incomingSeq;
  }

  // Apply updates
  if (updates.selectedOption !== undefined) {
    snapshot.candidateAnswer = updates.selectedOption; // Can be 'A'|'B'|'C'|'D' or null to clear
    snapshot.answeredAt = updates.selectedOption ? new Date() : null;
  }

  if (updates.isMarkedForReview !== undefined) {
    snapshot.isMarkedForReview = updates.isMarkedForReview;
  }

  // Optimistic concurrency update
  const updatedAttempt = await Attempt.findOneAndUpdate(
    {
      _id: attempt._id,
      status: 'in_progress',
      version: attempt.version || 0,
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        [`questionSnapshots.${snapshotIndex}`]: snapshot,
      },
      $inc: { version: 1 },
    },
    { new: true }
  );

  if (!updatedAttempt) {
    // Check if expired or version conflicted
    const refreshed = await Attempt.findById(attempt._id);
    if (!refreshed || refreshed.status !== 'in_progress' || Date.now() >= new Date(refreshed.expiresAt).getTime()) {
      if (refreshed && refreshed.status !== 'in_progress') {
        throw ApiError.alreadyFinalized('Assessment is already completed and cannot be modified');
      }
      throw ApiError.badRequest('Assessment has expired or completed. Changes could not be saved.');
    }

    const refreshedSnapshot = refreshed.questionSnapshots[snapshotIndex];
    if (updates.sequence !== undefined) {
      const incomingSeq = Number(updates.sequence);
      const existingSeq = Number(refreshedSnapshot.clientSequence || 0);
      if (incomingSeq < existingSeq) {
        return refreshedSnapshot;
      }
      refreshedSnapshot.clientSequence = incomingSeq;
    }

    // Retry once on version conflict, strictly enforcing database-level expiry and concurrency filter
    refreshedSnapshot.candidateAnswer =
      updates.selectedOption !== undefined
        ? updates.selectedOption
        : refreshedSnapshot.candidateAnswer;
    refreshedSnapshot.isMarkedForReview =
      updates.isMarkedForReview !== undefined
        ? updates.isMarkedForReview
        : refreshedSnapshot.isMarkedForReview;
    if (updates.selectedOption !== undefined) {
      refreshedSnapshot.answeredAt = updates.selectedOption ? new Date() : null;
    }

    const retriedAttempt = await Attempt.findOneAndUpdate(
      {
        _id: refreshed._id,
        status: 'in_progress',
        version: refreshed.version || 0,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          [`questionSnapshots.${snapshotIndex}`]: refreshedSnapshot,
        },
        $inc: { version: 1 },
      },
      { new: true }
    );

    if (!retriedAttempt) {
      throw ApiError.badRequest('Assessment has expired or completed. Changes could not be saved.');
    }

    return retriedAttempt.questionSnapshots[snapshotIndex];
  }

  return updatedAttempt.questionSnapshots[snapshotIndex];
}

/**
 * Retrieves a submission preview for confirmation modal.
 */
export async function getSubmissionPreview(candidateId) {
  const attempt = await Attempt.findOne({ candidateId });

  if (!attempt) {
    throw ApiError.notFound('Assessment attempt not found');
  }

  const questions = attempt.questionSnapshots || [];
  const answeredCount = questions.filter((q) => q.candidateAnswer !== null && q.candidateAnswer !== undefined).length;
  const unansweredCount = questions.length - answeredCount;
  const markedForReviewCount = questions.filter((q) => q.isMarkedForReview).length;
  const isExpired = Date.now() > new Date(attempt.expiresAt).getTime();

  return {
    totalQuestions: questions.length,
    answeredCount,
    unansweredCount,
    markedForReviewCount,
    status: attempt.status,
    isExpired,
  };
}

/**
 * Submits the assessment (manual or automatic timeout).
 */
export async function submitAssessment(candidateId) {
  const attempt = await Attempt.findOne({ candidateId });

  if (!attempt) {
    throw ApiError.notFound('Assessment attempt not found');
  }

  // Idempotent: If already completed, return existing result
  if (attempt.status === 'completed' || attempt.status === 'timed_out') {
    return attempt;
  }

  const now = Date.now();
  const expiresAtMs = new Date(attempt.expiresAt).getTime();
  const gracePeriodExpiryMs = expiresAtMs + 30000;

  // Determine submission type based on server time
  let submissionType = 'manual';
  if (now >= expiresAtMs) {
    submissionType = 'auto_timeout';
  }

  // If past 30s grace period, it's strictly auto_timeout
  if (now > gracePeriodExpiryMs) {
    submissionType = 'auto_timeout';
  }

  return finalizeAttemptAtomically(attempt._id, submissionType);
}

/**
 * Atomically finalizes and evaluates an attempt using optimistic concurrency.
 */
export async function finalizeAttemptAtomically(attemptId, submissionType = 'manual') {
  const attempt = await Attempt.findById(attemptId);

  if (!attempt) {
    throw ApiError.notFound('Assessment attempt not found');
  }

  // Idempotent: return if already completed
  if (attempt.status === 'completed' || attempt.status === 'timed_out') {
    return attempt;
  }

  const now = new Date();
  const evaluation = evaluateAttempt(attempt, now, submissionType);

  const targetStatus = submissionType === 'auto_timeout' ? 'timed_out' : 'completed';

  const updatedAttempt = await Attempt.findOneAndUpdate(
    {
      _id: attempt._id,
      status: 'in_progress',
      version: attempt.version || 0,
    },
    {
      $set: {
        status: targetStatus,
        submittedAt: evaluation.submittedAt,
        submissionType: evaluation.submissionType,
        scoreSummary: evaluation.scoreSummary,
        questionSnapshots: evaluation.evaluatedSnapshots,
      },
      $inc: { version: 1 },
    },
    { new: true }
  );

  // If null, either another concurrent process finalized it, or an answer update incremented version
  if (!updatedAttempt) {
    const reloaded = await Attempt.findById(attemptId);
    if (!reloaded) {
      throw ApiError.notFound('Assessment attempt not found during finalization');
    }
    // If already finalized by a competing submission or worker, return it
    if (reloaded.status === 'completed' || reloaded.status === 'timed_out') {
      return reloaded;
    }
    // If it failed due to a concurrent answer version change, safely retry finalization with updated state
    return finalizeAttemptAtomically(attemptId, submissionType);
  }

  // Update candidate status
  await Candidate.findByIdAndUpdate(attempt.candidateId, {
    hasAttempted: true,
  });

  return updatedAttempt;
}

export default {
  initializeAssessment,
  getOrRecoverCurrentAttempt,
  updateCandidateAnswer,
  getSubmissionPreview,
  submitAssessment,
  finalizeAttemptAtomically,
};
