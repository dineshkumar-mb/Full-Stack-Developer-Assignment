import { Settings } from '../models/Settings.js';
import { Attempt } from '../models/Attempt.js';
import { Candidate } from '../models/Candidate.js';
import assessmentService from '../services/assessmentService.js';
import {
  serializeAttemptForCandidate,
  serializeAssessmentResult,
  serializeQuestionForCandidate,
} from '../utils/serializers.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Retrieve current assessment instructions and candidate-relevant settings.
 * GET /api/assessment/instructions
 */
export const getInstructions = asyncHandler(async (req, res) => {
  const settings = await Settings.getSettings();

  return res.status(200).json({
    success: true,
    instructions: {
      totalQuestions: settings.totalTestQuestions || 10,
      durationMinutes: settings.testDurationMinutes || 15,
      correctMarkWeight: settings.correctMarkWeight || 2,
      negativeMarkWeight: settings.negativeMarkWeight || 1,
      unattemptedMark: 0,
      passPercentage: settings.passPercentage || 60,
      rules: [
        'Each correct answer awards +2 marks.',
        'Each wrong answer deducts -1 mark.',
        'Unattempted questions receive 0 marks (no penalty).',
        'You may navigate between questions freely using the question palette.',
        'You may mark questions for review and return to them before the time runs out.',
        'The assessment will automatically submit when the countdown timer reaches zero.',
        'Refreshing or closing the browser will not reset your timer. Your saved answers are preserved.',
      ],
    },
  });
});

/**
 * Start a new assessment or recover an existing in-progress attempt.
 * POST /api/assessment/start
 */
export const startAssessment = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.user.id);
  if (!candidate) {
    throw ApiError.unauthorized('Candidate profile not found');
  }

  const attempt = await assessmentService.initializeAssessment(candidate);

  return res.status(attempt.createdAt?.getTime() === attempt.updatedAt?.getTime() ? 201 : 200).json({
    success: true,
    message:
      attempt.status === 'in_progress'
        ? 'Assessment started successfully'
        : 'Assessment session loaded',
    attempt: serializeAttemptForCandidate(attempt),
  });
});

/**
 * Retrieve current in-progress assessment attempt with safe questions.
 * GET /api/assessment/attempt/current
 */
export const getCurrentAttempt = asyncHandler(async (req, res) => {
  const attempt = await assessmentService.getOrRecoverCurrentAttempt(req.user.id);

  return res.status(200).json({
    success: true,
    attempt: serializeAttemptForCandidate(attempt),
  });
});

/**
 * Save candidate answer or marked-for-review status for a question snapshot.
 * PATCH /api/assessment/attempt/questions/:questionSnapshotId
 */
export const saveAnswer = asyncHandler(async (req, res) => {
  const { questionSnapshotId } = req.params;
  const updates = req.body;

  const updatedSnapshot = await assessmentService.updateCandidateAnswer(
    req.user.id,
    questionSnapshotId,
    updates
  );

  return res.status(200).json({
    success: true,
    message: 'Answer updated successfully',
    question: serializeQuestionForCandidate(updatedSnapshot),
  });
});

/**
 * Get submission preview showing counts of answered, unanswered, and review questions.
 * GET /api/assessment/attempt/submission-preview
 */
export const getSubmissionPreview = asyncHandler(async (req, res) => {
  const preview = await assessmentService.getSubmissionPreview(req.user.id);

  return res.status(200).json({
    success: true,
    preview,
  });
});

/**
 * Submit assessment (manual or automatic timeout).
 * POST /api/assessment/attempt/submit
 */
export const submitAssessment = asyncHandler(async (req, res) => {
  const attempt = await assessmentService.submitAssessment(req.user.id);
  const candidate = await Candidate.findById(req.user.id);

  return res.status(200).json({
    success: true,
    message:
      attempt.submissionType === 'auto_timeout'
        ? 'Assessment timed out and submitted automatically.'
        : 'Assessment submitted successfully.',
    result: serializeAssessmentResult(attempt, candidate),
  });
});

/**
 * Get completed assessment results.
 * GET /api/assessment/result
 */
export const getResult = asyncHandler(async (req, res) => {
  const attempt = await Attempt.findOne({ candidateId: req.user.id });

  if (!attempt) {
    throw ApiError.notFound('No assessment attempt found for this candidate');
  }

  if (attempt.status === 'in_progress') {
    throw ApiError.badRequest('Assessment is currently in progress. Submit the assessment to view results.');
  }

  const candidate = await Candidate.findById(req.user.id);

  return res.status(200).json({
    success: true,
    result: serializeAssessmentResult(attempt, candidate),
  });
});

export default {
  getInstructions,
  startAssessment,
  getCurrentAttempt,
  saveAnswer,
  getSubmissionPreview,
  submitAssessment,
  getResult,
};
