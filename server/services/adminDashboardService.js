import { Candidate } from '../models/Candidate.js';
import { Attempt } from '../models/Attempt.js';

/**
 * Calculates high-level summary metrics for the admin dashboard.
 */
export async function getDashboardSummary() {
  const [totalCandidates, completedAttempts, inProgressAssessments, attemptedCandidateIds] =
    await Promise.all([
      Candidate.countDocuments(),
      Attempt.find({ status: { $in: ['completed', 'timed_out'] } }).select('scoreSummary'),
      Attempt.countDocuments({ status: 'in_progress' }),
      Attempt.distinct('candidateId'),
    ]);

  const notStartedCandidates = await Candidate.countDocuments({
    _id: { $nin: attemptedCandidateIds },
  });

  const completedCount = completedAttempts.length;

  if (completedCount === 0) {
    return {
      totalCandidates,
      completedAssessments: 0,
      inProgressAssessments,
      notStartedCandidates,
      averageScore: 0,
      passRate: 0,
      highestScore: 0,
      lowestScore: 0,
      passedCandidates: 0,
      failedCandidates: 0,
    };
  }

  const scores = completedAttempts.map((a) => a.scoreSummary?.netScore ?? 0);
  const passedCandidates = completedAttempts.filter((a) => a.scoreSummary?.isPassed).length;
  const failedCandidates = completedCount - passedCandidates;
  const sumScores = scores.reduce((acc, s) => acc + s, 0);

  const averageScore = Math.round((sumScores / completedCount) * 100) / 100;
  const passRate = Math.round((passedCandidates / completedCount) * 10000) / 100;
  const highestScore = Math.max(...scores);
  const lowestScore = Math.min(...scores);

  return {
    totalCandidates,
    completedAssessments: completedCount,
    inProgressAssessments,
    notStartedCandidates,
    averageScore,
    passRate,
    highestScore,
    lowestScore,
    passedCandidates,
    failedCandidates,
  };
}

/**
 * Calculates chart-ready analytics datasets with optional date filtering.
 */
export async function getDashboardAnalytics(filters = {}) {
  const { from, to } = filters;

  const dateMatch = {};
  if (from) {
    dateMatch.$gte = new Date(from);
  }
  if (to) {
    dateMatch.$lte = new Date(to);
  }

  const attemptMatch = { status: { $in: ['completed', 'timed_out'] } };
  if (Object.keys(dateMatch).length > 0) {
    attemptMatch.submittedAt = dateMatch;
  }

  const candidateMatch = {};
  if (Object.keys(dateMatch).length > 0) {
    candidateMatch.createdAt = dateMatch;
  }

  // 1. Completion trend over time
  const completionTrendPromise = Attempt.aggregate([
    { $match: attemptMatch },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' },
        },
        completed: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        completed: 1,
      },
    },
  ]);

  // 2. Candidate registration trend over time
  const registrationTrendPromise = Candidate.aggregate([
    { $match: candidateMatch },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        registrations: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        registrations: 1,
      },
    },
  ]);

  // 3. Pass/Fail distribution
  const passFailPromise = Attempt.aggregate([
    { $match: attemptMatch },
    {
      $group: {
        _id: null,
        passed: { $sum: { $cond: ['$scoreSummary.isPassed', 1, 0] } },
        failed: { $sum: { $cond: ['$scoreSummary.isPassed', 0, 1] } },
      },
    },
  ]);

  // 4. Score distribution across standard bins
  const scoreDistributionPromise = Attempt.aggregate([
    { $match: attemptMatch },
    {
      $bucket: {
        groupBy: '$scoreSummary.netScore',
        boundaries: [-10, 0, 6, 11, 16, 21],
        default: 'other',
        output: {
          count: { $sum: 1 },
        },
      },
    },
  ]);

  // 5. Category-wise performance aggregation
  const categoryPerformancePromise = Attempt.aggregate([
    { $match: attemptMatch },
    { $unwind: '$questionSnapshots' },
    {
      $group: {
        _id: '$questionSnapshots.category',
        totalQuestions: { $sum: 1 },
        totalCorrect: { $sum: { $cond: ['$questionSnapshots.isCorrect', 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        category: '$_id',
        totalQuestions: 1,
        totalCorrect: 1,
        accuracyPercentage: {
          $cond: [
            { $eq: ['$totalQuestions', 0] },
            0,
            {
              $round: [
                {
                  $multiply: [{ $divide: ['$totalCorrect', '$totalQuestions'] }, 100],
                },
                1,
              ],
            },
          ],
        },
      },
    },
    { $sort: { category: 1 } },
  ]);

  const [
    completionTrend,
    registrationTrend,
    passFailRaw,
    scoreDistRaw,
    categoryPerformance,
  ] = await Promise.all([
    completionTrendPromise,
    registrationTrendPromise,
    passFailPromise,
    scoreDistributionPromise,
    categoryPerformancePromise,
  ]);

  const passFailDistribution = {
    passed: passFailRaw[0]?.passed || 0,
    failed: passFailRaw[0]?.failed || 0,
  };

  // Map bucket boundaries to readable ranges
  const rangeMap = {
    '-10': '< 0',
    '0': '0-5',
    '6': '6-10',
    '11': '11-15',
    '16': '16-20',
  };

  const defaultRanges = [
    { range: '< 0', count: 0 },
    { range: '0-5', count: 0 },
    { range: '6-10', count: 0 },
    { range: '11-15', count: 0 },
    { range: '16-20', count: 0 },
  ];

  const scoreDistribution = defaultRanges.map((item) => {
    const found = scoreDistRaw.find((b) => rangeMap[String(b._id)] === item.range);
    return {
      range: item.range,
      count: found ? found.count : 0,
    };
  });

  return {
    completionTrend,
    registrationTrend,
    passFailDistribution,
    scoreDistribution,
    categoryPerformance,
  };
}

export default {
  getDashboardSummary,
  getDashboardAnalytics,
};
