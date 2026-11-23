import { Candidate } from '../models/Candidate.js';
import { Attempt } from '../models/Attempt.js';
import { generateToken } from '../utils/generateToken.js';
import { serializeCandidate } from '../utils/serializers.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Register candidate and issue authentication token.
 * POST /api/candidates/register
 */
export const registerCandidate = asyncHandler(async (req, res, next) => {
  const { fullName, email, age, phone, phoneNumber, gender, qualification, highestQualification, city } = req.body;

  const normalizedEmail = email.toLowerCase().trim();
  const validPhone = phone || phoneNumber;
  const validQualification = qualification || highestQualification;

  // Check if candidate already exists
  const existingCandidate = await Candidate.findOne({ email: normalizedEmail });

  if (existingCandidate) {
    // Check if candidate has an existing attempt
    const existingAttempt = await Attempt.findOne({ candidateId: existingCandidate._id });

    if (existingAttempt) {
      if (existingAttempt.status === 'completed' || existingAttempt.status === 'timed_out') {
        throw ApiError.conflict(
          'A candidate with this email address has already completed the assessment. Only one attempt is permitted.'
        );
      }
      // If attempt is in-progress, issue token to allow resume
      const token = generateToken({
        id: existingCandidate._id,
        email: existingCandidate.email,
        role: 'candidate',
      });

      return res.status(200).json({
        success: true,
        message: 'Existing in-progress assessment session restored.',
        candidate: serializeCandidate(existingCandidate),
        token,
      });
    }

    // Candidate registered but hasn't started test yet -> issue token to proceed
    const token = generateToken({
      id: existingCandidate._id,
      email: existingCandidate.email,
      role: 'candidate',
    });

    return res.status(200).json({
      success: true,
      message: 'Candidate registration verified. You may proceed to the assessment.',
      candidate: serializeCandidate(existingCandidate),
      token,
    });
  }

  // Create new candidate
  const candidate = await Candidate.create({
    fullName,
    email: normalizedEmail,
    age,
    phoneNumber: validPhone,
    gender: gender || '',
    highestQualification: validQualification,
    city: city || '',
    hasAttempted: false,
    attemptId: null,
  });

  const token = generateToken({
    id: candidate._id,
    email: candidate.email,
    role: 'candidate',
  });

  return res.status(201).json({
    success: true,
    message: 'Candidate registered successfully.',
    candidate: serializeCandidate(candidate),
    token,
  });
});

/**
 * Get current authenticated candidate profile and assessment state flags.
 * GET /api/candidates/me
 */
export const getCandidateProfile = asyncHandler(async (req, res, next) => {
  const candidate = await Candidate.findById(req.user.id);
  if (!candidate) {
    throw ApiError.notFound('Candidate profile not found');
  }

  const attempt = await Attempt.findOne({ candidateId: candidate._id });

  const hasStarted = Boolean(attempt);
  const hasAttemptInProgress = attempt ? attempt.status === 'in_progress' : false;
  const hasCompleted = attempt ? (attempt.status === 'completed' || attempt.status === 'timed_out') : false;

  return res.status(200).json({
    success: true,
    candidate: {
      ...serializeCandidate(candidate),
      hasRegistered: true,
      hasStarted,
      hasAttemptInProgress,
      hasCompleted,
      attemptId: attempt?._id || null,
      attemptStatus: attempt?.status || null,
    },
  });
});

export default {
  registerCandidate,
  getCandidateProfile,
};
