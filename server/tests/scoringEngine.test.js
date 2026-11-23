import { describe, it, expect } from 'vitest';
import { evaluateAttempt } from '../services/scoringService.js';

describe('Phase 3 - Server-Side Scoring Engine Tests', () => {
  const dummyOptions = [
    { optionId: 'A', text: '1' },
    { optionId: 'B', text: '2' },
    { optionId: 'C', text: '3' },
    { optionId: 'D', text: '4' },
  ];

  const baseSettings = {
    testDurationMinutes: 15,
    passPercentage: 60,
    correctMarkWeight: 2,
    negativeMarkWeight: 1,
    totalTestQuestions: 10,
  };

  const createMockAttempt = (answers) => ({
    startedAt: new Date(Date.now() - 300000), // 5 minutes ago
    expiresAt: new Date(Date.now() + 600000),
    settingsSnapshot: baseSettings,
    questionSnapshots: answers.map((ans, idx) => ({
      orderNumber: idx + 1,
      questionText: `Question ${idx + 1}`,
      options: dummyOptions,
      correctOption: 'A',
      candidateAnswer: ans,
    })),
  });

  // Case 1: All 10 answers correct -> 20 marks, 100%
  it('Case 1: All 10 correct -> 20 marks, 100%, Passed', () => {
    const attempt = createMockAttempt(Array(10).fill('A'));
    const evaluation = evaluateAttempt(attempt, new Date());

    expect(evaluation.scoreSummary.correctCount).toBe(10);
    expect(evaluation.scoreSummary.incorrectCount).toBe(0);
    expect(evaluation.scoreSummary.unattemptedCount).toBe(0);
    expect(evaluation.scoreSummary.marksGained).toBe(20);
    expect(evaluation.scoreSummary.marksDeducted).toBe(0);
    expect(evaluation.scoreSummary.netScore).toBe(20);
    expect(evaluation.scoreSummary.scaledScoreOutOf10).toBe(10);
    expect(evaluation.scoreSummary.percentage).toBe(100);
    expect(evaluation.scoreSummary.isPassed).toBe(true);
  });

  // Case 2: All 10 answers incorrect -> -10 marks, -50%
  it('Case 2: All 10 incorrect -> -10 marks, -50%, Failed', () => {
    const attempt = createMockAttempt(Array(10).fill('B')); // all wrong
    const evaluation = evaluateAttempt(attempt, new Date());

    expect(evaluation.scoreSummary.correctCount).toBe(0);
    expect(evaluation.scoreSummary.incorrectCount).toBe(10);
    expect(evaluation.scoreSummary.unattemptedCount).toBe(0);
    expect(evaluation.scoreSummary.marksGained).toBe(0);
    expect(evaluation.scoreSummary.marksDeducted).toBe(10);
    expect(evaluation.scoreSummary.netScore).toBe(-10);
    expect(evaluation.scoreSummary.scaledScoreOutOf10).toBe(-5);
    expect(evaluation.scoreSummary.percentage).toBe(-50);
    expect(evaluation.scoreSummary.isPassed).toBe(false);
  });

  // Case 3: All 10 unanswered -> 0 marks, 0%
  it('Case 3: All 10 unanswered -> 0 marks, 0%, Failed', () => {
    const attempt = createMockAttempt(Array(10).fill(null));
    const evaluation = evaluateAttempt(attempt, new Date());

    expect(evaluation.scoreSummary.correctCount).toBe(0);
    expect(evaluation.scoreSummary.incorrectCount).toBe(0);
    expect(evaluation.scoreSummary.unattemptedCount).toBe(10);
    expect(evaluation.scoreSummary.marksGained).toBe(0);
    expect(evaluation.scoreSummary.marksDeducted).toBe(0);
    expect(evaluation.scoreSummary.netScore).toBe(0);
    expect(evaluation.scoreSummary.percentage).toBe(0);
    expect(evaluation.scoreSummary.isPassed).toBe(false);
  });

  // Case 4: 5 correct and 5 incorrect -> 5 marks, 25%
  it('Case 4: 5 correct, 5 incorrect -> 5 marks (10 - 5), 25%, Failed', () => {
    const answers = [...Array(5).fill('A'), ...Array(5).fill('C')];
    const attempt = createMockAttempt(answers);
    const evaluation = evaluateAttempt(attempt, new Date());

    expect(evaluation.scoreSummary.correctCount).toBe(5);
    expect(evaluation.scoreSummary.incorrectCount).toBe(5);
    expect(evaluation.scoreSummary.unattemptedCount).toBe(0);
    expect(evaluation.scoreSummary.marksGained).toBe(10);
    expect(evaluation.scoreSummary.marksDeducted).toBe(5);
    expect(evaluation.scoreSummary.netScore).toBe(5);
    expect(evaluation.scoreSummary.percentage).toBe(25);
    expect(evaluation.scoreSummary.isPassed).toBe(false);
  });

  // Case 5 & 6: Pass exactly at threshold (60% cut-off = 12 marks)
  // E.g. 7 correct, 2 incorrect, 1 blank -> 7*2 - 2*1 = 12 marks -> 12/20 = 60%
  it('Case 6: Pass exactly at threshold (60%) -> 7 correct, 2 incorrect, 1 blank = 12 marks (60%), Passed', () => {
    const answers = [...Array(7).fill('A'), ...Array(2).fill('B'), null];
    const attempt = createMockAttempt(answers);
    const evaluation = evaluateAttempt(attempt, new Date());

    expect(evaluation.scoreSummary.correctCount).toBe(7);
    expect(evaluation.scoreSummary.incorrectCount).toBe(2);
    expect(evaluation.scoreSummary.unattemptedCount).toBe(1);
    expect(evaluation.scoreSummary.marksGained).toBe(14);
    expect(evaluation.scoreSummary.marksDeducted).toBe(2);
    expect(evaluation.scoreSummary.netScore).toBe(12);
    expect(evaluation.scoreSummary.percentage).toBe(60);
    expect(evaluation.scoreSummary.isPassed).toBe(true);
  });

  // Case 7: Fail below threshold (e.g. 55% = 11 marks -> 6 correct, 1 incorrect, 3 blanks = 12 - 1 = 11 marks = 55%)
  it('Case 7: Fail below threshold (55%) -> 6 correct, 1 incorrect, 3 blanks = 11 marks (55%), Failed', () => {
    const answers = [...Array(6).fill('A'), 'B', null, null, null];
    const attempt = createMockAttempt(answers);
    const evaluation = evaluateAttempt(attempt, new Date());

    expect(evaluation.scoreSummary.correctCount).toBe(6);
    expect(evaluation.scoreSummary.incorrectCount).toBe(1);
    expect(evaluation.scoreSummary.unattemptedCount).toBe(3);
    expect(evaluation.scoreSummary.marksGained).toBe(12);
    expect(evaluation.scoreSummary.marksDeducted).toBe(1);
    expect(evaluation.scoreSummary.netScore).toBe(11);
    expect(evaluation.scoreSummary.percentage).toBe(55);
    expect(evaluation.scoreSummary.isPassed).toBe(false);
  });

  // Case 8: Negative score remains negative and is never clamped to 0
  it('Case 8: Negative net score remains negative and is not clamped to 0', () => {
    const answers = ['A', ...Array(9).fill('C')]; // 1 correct, 9 incorrect -> 2 - 9 = -7 marks
    const attempt = createMockAttempt(answers);
    const evaluation = evaluateAttempt(attempt, new Date());

    expect(evaluation.scoreSummary.netScore).toBe(-7);
    expect(evaluation.scoreSummary.netScore).toBeLessThan(0);
    expect(evaluation.scoreSummary.percentage).toBe(-35);
  });

  // Case 9: Time taken is calculated using server timestamps
  it('Case 9: Time taken is calculated correctly using server timestamps', () => {
    const now = Date.now();
    const startedAt = new Date(now - 185000); // 185 seconds ago
    const submittedAt = new Date(now);

    const attempt = {
      ...createMockAttempt(Array(10).fill('A')),
      startedAt,
    };

    const evaluation = evaluateAttempt(attempt, submittedAt);
    expect(evaluation.scoreSummary.timeTakenSeconds).toBe(185);
  });
});
