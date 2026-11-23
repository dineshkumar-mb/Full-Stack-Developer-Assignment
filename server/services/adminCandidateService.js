import mongoose from 'mongoose';
import { Candidate } from '../models/Candidate.js';
import { Attempt } from '../models/Attempt.js';
import ApiError from '../utils/ApiError.js';

/**
 * Lists candidates using MongoDB aggregation for zero-N+1 pagination, filtering, and sorting.
 */
export async function listCandidates(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const matchStage = {};

  if (query.search) {
    const searchRegex = { $regex: query.search.trim(), $options: 'i' };
    matchStage.$or = [{ fullName: searchRegex }, { email: searchRegex }];
  }

  // Determine sort field and direction
  const sortDirection = query.sortOrder === 'asc' ? 1 : -1;
  let sortStage = { createdAt: -1 };

  switch (query.sortBy) {
    case 'fullName':
      sortStage = { fullName: sortDirection };
      break;
    case 'email':
      sortStage = { email: sortDirection };
      break;
    case 'submittedAt':
      sortStage = { submittedAt: sortDirection };
      break;
    case 'score':
      sortStage = { netScore: sortDirection };
      break;
    case 'createdAt':
    default:
      sortStage = { createdAt: sortDirection };
      break;
  }

  const pipeline = [
    ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
    {
      $lookup: {
        from: 'attempts',
        localField: '_id',
        foreignField: 'candidateId',
        as: 'attempt',
      },
    },
    {
      $unwind: {
        path: '$attempt',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        assessmentStatus: {
          $ifNull: ['$attempt.status', 'not_started'],
        },
        netScore: '$attempt.scoreSummary.netScore',
        isPassed: '$attempt.scoreSummary.isPassed',
        submittedAt: '$attempt.submittedAt',
      },
    },
  ];

  // Filter by assessmentStatus
  if (query.assessmentStatus) {
    pipeline.push({
      $match: { assessmentStatus: query.assessmentStatus },
    });
  }

  // Filter by isPassed
  if (query.isPassed !== undefined) {
    const isPassedBool = query.isPassed === true || query.isPassed === 'true';
    pipeline.push({
      $match: { isPassed: isPassedBool },
    });
  }

  // Facet for pagination and metadata
  pipeline.push({
    $facet: {
      metadata: [{ $count: 'total' }],
      data: [
        { $sort: sortStage },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            id: '$_id',
            fullName: 1,
            email: 1,
            age: 1,
            phoneNumber: 1,
            phone: '$phoneNumber',
            gender: 1,
            highestQualification: 1,
            qualification: '$highestQualification',
            city: 1,
            createdAt: 1,
            registrationDate: '$createdAt',
            hasAttempted: 1,
            assessmentStatus: 1,
            attemptId: '$attempt._id',
            startedAt: '$attempt.startedAt',
            submittedAt: '$attempt.submittedAt',
            score: '$attempt.scoreSummary.netScore',
            percentage: '$attempt.scoreSummary.percentage',
            isPassed: '$attempt.scoreSummary.isPassed',
            totalCorrect: '$attempt.scoreSummary.correctCount',
            totalWrong: '$attempt.scoreSummary.incorrectCount',
            totalUnattempted: '$attempt.scoreSummary.unattemptedCount',
          },
        },
      ],
    },
  });

  const [result] = await Candidate.aggregate(pipeline);

  const total = result.metadata[0]?.total || 0;
  const data = result.data || [];

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
 * Retrieves safe details for a single candidate.
 */
export async function getCandidateById(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw ApiError.badRequest('Invalid candidate ID format');
  }

  const candidate = await Candidate.findById(id);
  if (!candidate) {
    throw ApiError.notFound('Candidate not found');
  }

  const attempt = await Attempt.findOne({ candidateId: candidate._id });

  return {
    id: candidate._id.toString(),
    fullName: candidate.fullName,
    email: candidate.email,
    age: candidate.age,
    phoneNumber: candidate.phoneNumber,
    phone: candidate.phoneNumber,
    gender: candidate.gender,
    highestQualification: candidate.highestQualification,
    qualification: candidate.highestQualification,
    city: candidate.city,
    registrationDate: candidate.createdAt,
    hasAttempted: candidate.hasAttempted,
    assessmentStatus: attempt ? attempt.status : 'not_started',
    attemptId: attempt ? attempt._id.toString() : null,
    startedAt: attempt?.startedAt || null,
    submittedAt: attempt?.submittedAt || null,
  };
}

/**
 * Retrieves candidate assessment details including full question-level review.
 */
export async function getCandidateAssessmentDetails(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw ApiError.badRequest('Invalid candidate ID format');
  }

  const candidate = await Candidate.findById(id);
  if (!candidate) {
    throw ApiError.notFound('Candidate not found');
  }

  const attempt = await Attempt.findOne({ candidateId: candidate._id });
  if (!attempt) {
    return {
      status: 'not_started',
      message: 'Candidate has not started the assessment.',
      candidate: {
        id: candidate._id.toString(),
        fullName: candidate.fullName,
        email: candidate.email,
      },
    };
  }

  if (attempt.status === 'in_progress') {
    return {
      status: 'in_progress',
      attemptId: attempt._id.toString(),
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      message: 'Assessment is currently in progress.',
      candidate: {
        id: candidate._id.toString(),
        fullName: candidate.fullName,
        email: candidate.email,
      },
    };
  }

  // Attempt is completed or timed_out
  const questions = (attempt.questionSnapshots || []).map((q) => ({
    snapshotId: q.snapshotId,
    questionId: q.questionId,
    orderNumber: q.orderNumber,
    questionText: q.questionText,
    options: q.options,
    correctOption: q.correctOption,
    candidateAnswer: q.candidateAnswer, // Can be null/unanswered
    isCorrect: q.isCorrect,
    category: q.category,
    difficulty: q.difficulty,
    explanation: q.explanation || '',
    answeredAt: q.answeredAt,
  }));

  return {
    status: attempt.status,
    attemptId: attempt._id.toString(),
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    timeTakenSeconds: attempt.scoreSummary?.timeTakenSeconds || 0,
    submissionType: attempt.submissionType,
    candidate: {
      id: candidate._id.toString(),
      fullName: candidate.fullName,
      email: candidate.email,
      phone: candidate.phoneNumber,
      qualification: candidate.highestQualification,
      city: candidate.city,
    },
    scoreSummary: attempt.scoreSummary,
    questions,
  };
}

export default {
  listCandidates,
  getCandidateById,
  getCandidateAssessmentDetails,
};
