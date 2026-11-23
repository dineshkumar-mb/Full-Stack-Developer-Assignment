/**
 * Server-side evaluation engine.
 * Computes exact marks, negative marking, percentage, and pass/fail status.
 *
 * Scoring Rules:
 * - Correct: +2 marks
 * - Incorrect: -1 mark
 * - Unanswered: 0 marks
 * - Negative net scores are preserved and never clamped to zero.
 */
export function evaluateAttempt(attempt, submittedAt = new Date(), submissionType = 'manual') {
  const settings = attempt.settingsSnapshot || {};
  const correctMarkWeight = Number(settings.correctMarkWeight) || 2;
  const negativeMarkWeight = Number(settings.negativeMarkWeight) || 1;
  const passPercentage = Number(settings.passPercentage) || 60;
  const totalQuestions = (attempt.questionSnapshots || []).length || 10;
  const maximumScore = totalQuestions * correctMarkWeight; // 20 marks

  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;

  const evaluatedSnapshots = (attempt.questionSnapshots || []).map((snapshot) => {
    const candAnswer = snapshot.candidateAnswer;
    const isAnswered = candAnswer !== null && candAnswer !== undefined && candAnswer !== '';
    let isCorrect = false;

    if (!isAnswered) {
      unattemptedCount++;
      isCorrect = false;
    } else if (candAnswer === snapshot.correctOption) {
      correctCount++;
      isCorrect = true;
    } else {
      incorrectCount++;
      isCorrect = false;
    }

    const plainSnapshot = snapshot.toObject ? snapshot.toObject() : { ...snapshot };
    return {
      ...plainSnapshot,
      isCorrect,
    };
  });

  const marksGained = correctCount * correctMarkWeight;
  const marksDeducted = incorrectCount * negativeMarkWeight;
  const netScore = marksGained - marksDeducted; // Can be negative (e.g. -10)
  const percentage = Number(((netScore / maximumScore) * 100).toFixed(2));
  const scaledScoreOutOf10 = Number((netScore / 2).toFixed(2));
  const isPassed = percentage >= passPercentage;

  const startedTime = new Date(attempt.startedAt).getTime();
  const submitTime = new Date(submittedAt).getTime();
  const maxDurationSec = (settings.testDurationMinutes || 15) * 60;
  const timeTakenSeconds = Math.min(
    maxDurationSec,
    Math.max(0, Math.round((submitTime - startedTime) / 1000))
  );

  const scoreSummary = {
    totalQuestions,
    correctCount,
    incorrectCount,
    unattemptedCount,
    marksGained,
    marksDeducted,
    netScore,
    scaledScoreOutOf10,
    percentage,
    passPercentageCutoff: passPercentage,
    isPassed,
    timeTakenSeconds,
  };

  return {
    evaluatedSnapshots,
    scoreSummary,
    submittedAt,
    submissionType,
  };
}

export default {
  evaluateAttempt,
};
