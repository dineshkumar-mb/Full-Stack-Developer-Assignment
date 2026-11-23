import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { Candidate } from '../models/Candidate.js';
import { Attempt } from '../models/Attempt.js';
import { seedAdmin } from '../seeders/seedAdmin.js';
import { generateToken } from '../utils/generateToken.js';

describe('Phase 4 - Admin Dashboard Analytics', () => {
  let adminToken;

  beforeEach(async () => {
    await seedAdmin();
    adminToken = generateToken({
      id: '507f1f77bcf86cd799439011',
      email: 'admin@assessment.com',
      role: 'admin',
    });
  });

  it('should return safe zeroed summary metrics when database has no candidates or attempts', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary).toEqual({
      totalCandidates: 0,
      completedAssessments: 0,
      inProgressAssessments: 0,
      notStartedCandidates: 0,
      averageScore: 0,
      passRate: 0,
      highestScore: 0,
      lowestScore: 0,
      passedCandidates: 0,
      failedCandidates: 0,
    });
  });

  it('should calculate accurate dashboard summary metrics for populated data', async () => {
    // Create candidates
    const cand1 = await Candidate.create({
      fullName: 'Passed Candidate',
      email: 'cand1@test.com',
      age: 22,
      phoneNumber: '1111111111',
      highestQualification: "Bachelor's Degree",
      hasAttempted: true,
    });

    const cand2 = await Candidate.create({
      fullName: 'Failed Candidate',
      email: 'cand2@test.com',
      age: 24,
      phoneNumber: '2222222222',
      highestQualification: "Bachelor's Degree",
      hasAttempted: true,
    });

    const cand3 = await Candidate.create({
      fullName: 'InProgress Candidate',
      email: 'cand3@test.com',
      age: 26,
      phoneNumber: '3333333333',
      highestQualification: "Bachelor's Degree",
      hasAttempted: true,
    });

    const cand4 = await Candidate.create({
      fullName: 'NotStarted Candidate',
      email: 'cand4@test.com',
      age: 28,
      phoneNumber: '4444444444',
      highestQualification: "Bachelor's Degree",
      hasAttempted: false,
    });

    // Create Attempts
    // Cand1: Passed with score 14
    await Attempt.create({
      candidateId: cand1._id,
      candidateEmail: cand1.email,
      candidateSnapshot: cand1.toObject(),
      status: 'completed',
      startedAt: new Date(Date.now() - 600000),
      expiresAt: new Date(Date.now() + 300000),
      submittedAt: new Date(Date.now() - 100000),
      questionSnapshots: Array.from({ length: 10 }, (_, i) => ({
        questionId: cand1._id,
        orderNumber: i + 1,
        questionText: `Q${i}`,
        options: [{ optionId: 'A', text: 'Opt A' }],
        correctOption: 'A',
        category: 'Quantitative',
        difficulty: 'Medium',
        isCorrect: true,
      })),
      scoreSummary: {
        totalQuestions: 10,
        correctCount: 8,
        incorrectCount: 2,
        unattemptedCount: 0,
        marksGained: 16,
        marksDeducted: 2,
        netScore: 14,
        scaledScoreOutOf10: 7,
        percentage: 70,
        passPercentageCutoff: 60,
        isPassed: true,
      },
      settingsSnapshot: {},
    });

    // Cand2: Failed with score 4
    await Attempt.create({
      candidateId: cand2._id,
      candidateEmail: cand2.email,
      candidateSnapshot: cand2.toObject(),
      status: 'timed_out',
      startedAt: new Date(Date.now() - 1000000),
      expiresAt: new Date(Date.now() - 100000),
      submittedAt: new Date(Date.now() - 50000),
      questionSnapshots: Array.from({ length: 10 }, (_, i) => ({
        questionId: cand2._id,
        orderNumber: i + 1,
        questionText: `Q${i}`,
        options: [{ optionId: 'A', text: 'Opt A' }],
        correctOption: 'A',
        category: 'Verbal',
        difficulty: 'Easy',
        isCorrect: false,
      })),
      scoreSummary: {
        totalQuestions: 10,
        correctCount: 4,
        incorrectCount: 4,
        unattemptedCount: 2,
        marksGained: 8,
        marksDeducted: 4,
        netScore: 4,
        scaledScoreOutOf10: 2,
        percentage: 20,
        passPercentageCutoff: 60,
        isPassed: false,
      },
      settingsSnapshot: {},
    });

    // Cand3: In-Progress
    await Attempt.create({
      candidateId: cand3._id,
      candidateEmail: cand3.email,
      candidateSnapshot: cand3.toObject(),
      status: 'in_progress',
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 900000),
      questionSnapshots: Array.from({ length: 10 }, (_, i) => ({
        questionId: cand3._id,
        orderNumber: i + 1,
        questionText: `Q${i}`,
        options: [{ optionId: 'A', text: 'Opt A' }],
        correctOption: 'A',
        category: 'Logical Reasoning',
        difficulty: 'Hard',
      })),
      settingsSnapshot: {},
    });

    const res = await request(app)
      .get('/api/admin/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const summary = res.body.summary;
    expect(summary.totalCandidates).toBe(4);
    expect(summary.completedAssessments).toBe(2); // 1 completed + 1 timed_out
    expect(summary.inProgressAssessments).toBe(1);
    expect(summary.notStartedCandidates).toBe(1);
    expect(summary.passedCandidates).toBe(1);
    expect(summary.failedCandidates).toBe(1);
    expect(summary.passRate).toBe(50); // 1/2 = 50%
    expect(summary.averageScore).toBe(9); // (14 + 4) / 2 = 9
    expect(summary.highestScore).toBe(14);
    expect(summary.lowestScore).toBe(4);
  });

  it('should return chart-ready analytics datasets (GET /api/admin/dashboard/analytics)', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard/analytics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const a = res.body.analytics;
    expect(Array.isArray(a.completionTrend)).toBe(true);
    expect(Array.isArray(a.registrationTrend)).toBe(true);
    expect(a.passFailDistribution).toHaveProperty('passed');
    expect(a.passFailDistribution).toHaveProperty('failed');
    expect(Array.isArray(a.scoreDistribution)).toBe(true);
    expect(Array.isArray(a.categoryPerformance)).toBe(true);
  });
});
