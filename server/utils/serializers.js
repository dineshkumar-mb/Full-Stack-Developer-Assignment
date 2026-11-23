/**
 * Serializes a candidate document into a safe DTO without internal details.
 */
export function serializeCandidate(candidate) {
  if (!candidate) return null;
  return {
    id: candidate._id?.toString() || candidate.id,
    fullName: candidate.fullName,
    email: candidate.email,
    age: candidate.age,
    phone: candidate.phoneNumber || candidate.phone,
    gender: candidate.gender || '',
    qualification: candidate.highestQualification || candidate.qualification,
    city: candidate.city || '',
    hasAttempted: Boolean(candidate.hasAttempted),
    attemptId: candidate.attemptId ? candidate.attemptId.toString() : null,
  };
}

/**
 * Serializes a question snapshot for candidate viewing.
 * CRITICAL SECURITY: Never includes correctOption, explanation, or internal grading flags.
 */
export function serializeQuestionForCandidate(snapshot) {
  if (!snapshot) return null;
  const isAnswered = snapshot.candidateAnswer !== null && snapshot.candidateAnswer !== undefined;

  return {
    snapshotId: snapshot.snapshotId || snapshot._id?.toString(),
    questionId: snapshot.questionId?.toString() || snapshot.questionId,
    orderNumber: snapshot.orderNumber,
    questionText: snapshot.questionText,
    options: (snapshot.options || []).map((opt) => ({
      optionId: opt.optionId,
      text: opt.text,
    })),
    category: snapshot.category,
    difficulty: snapshot.difficulty,
    selectedOption: snapshot.candidateAnswer || null,
    isMarkedForReview: Boolean(snapshot.isMarkedForReview),
    isAnswered,
  };
}

/**
 * Serializes an assessment attempt for candidate viewing during the test.
 */
export function serializeAttemptForCandidate(attempt) {
  if (!attempt) return null;

  const now = Date.now();
  const expiresAtMs = new Date(attempt.expiresAt).getTime();
  const remainingSeconds = Math.max(0, Math.round((expiresAtMs - now) / 1000));

  const questions = (attempt.questionSnapshots || []).map(serializeQuestionForCandidate);
  const answeredCount = questions.filter((q) => q.isAnswered).length;
  const unansweredCount = questions.length - answeredCount;
  const markedForReviewCount = questions.filter((q) => q.isMarkedForReview).length;

  return {
    attemptId: attempt._id?.toString() || attempt.id,
    status: attempt.status,
    startedAt: attempt.startedAt,
    expiresAt: attempt.expiresAt,
    serverNow: new Date().toISOString(),
    remainingSeconds,
    durationMinutes: attempt.settingsSnapshot?.testDurationMinutes || 15,
    totalQuestions: questions.length,
    answeredCount,
    unansweredCount,
    markedForReviewCount,
    questions,
  };
}

/**
 * Serializes final assessment results for the candidate.
 */
export function serializeAssessmentResult(attempt, candidate) {
  if (!attempt) return null;

  const scores = attempt.scoreSummary || {};

  return {
    attemptId: attempt._id?.toString() || attempt.id,
    candidate: candidate
      ? {
          id: candidate._id?.toString() || candidate.id,
          fullName: candidate.fullName,
          email: candidate.email,
        }
      : attempt.candidateSnapshot || null,
    scoreSummary: {
      totalQuestions: scores.totalQuestions || 10,
      correctCount: scores.correctCount || 0,
      incorrectCount: scores.incorrectCount || 0,
      unattemptedCount: scores.unattemptedCount || 0,
      marksGained: scores.marksGained || 0,
      marksDeducted: scores.marksDeducted || 0,
      netScore: scores.netScore !== undefined ? scores.netScore : 0,
      scaledScoreOutOf10: scores.scaledScoreOutOf10 !== undefined ? scores.scaledScoreOutOf10 : 0,
      percentage: scores.percentage !== undefined ? Number(scores.percentage.toFixed(2)) : 0,
      passPercentageCutoff: scores.passPercentageCutoff || 60,
      isPassed: Boolean(scores.isPassed),
      timeTakenSeconds: scores.timeTakenSeconds || 0,
      submissionType: attempt.submissionType || 'manual',
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
    },
  };
}

export default {
  serializeCandidate,
  serializeQuestionForCandidate,
  serializeAttemptForCandidate,
  serializeAssessmentResult,
};
