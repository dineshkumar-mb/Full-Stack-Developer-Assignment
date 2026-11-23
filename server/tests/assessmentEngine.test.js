import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { Candidate } from '../models/Candidate.js';
import { seedQuestions } from '../seeders/seedQuestions.js';
import { seedSettings } from '../seeders/seedSettings.js';
import { processExpiredAssessments } from '../services/expiryService.js';

describe('Phase 3 - Assessment Engine & Lifecycle', () => {
  let candidateToken1;
  let candidateId1;
  let candidateToken2;
  let candidateId2;

  beforeEach(async () => {
    await seedSettings();
    await seedQuestions();

    // Register Candidate 1
    const reg1 = await request(app).post('/api/candidates/register').send({
      fullName: 'Alice Walker',
      email: 'alice.engine@test.com',
      age: 23,
      phone: '9876501234',
      qualification: "Bachelor's Degree",
    });
    candidateToken1 = reg1.body.token;
    candidateId1 = reg1.body.candidate.id;

    // Register Candidate 2
    const reg2 = await request(app).post('/api/candidates/register').send({
      fullName: 'Bob Roberts',
      email: 'bob.engine@test.com',
      age: 26,
      phone: '9876505678',
      qualification: "Master's Degree",
    });
    candidateToken2 = reg2.body.token;
    candidateId2 = reg2.body.candidate.id;
  });

  it('GET /api/assessment/instructions should return test duration, marking scheme, and pass percentage', async () => {
    const res = await request(app).get('/api/assessment/instructions');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.instructions.totalQuestions).toBe(10);
    expect(res.body.instructions.durationMinutes).toBe(15);
    expect(res.body.instructions.correctMarkWeight).toBe(2);
    expect(res.body.instructions.negativeMarkWeight).toBe(1);
    expect(res.body.instructions.passPercentage).toBe(60);
  });

  it('should start assessment, snapshot 10 questions, and NEVER expose correctOption or explanations', async () => {
    const startRes = await request(app)
      .post('/api/assessment/start')
      .set('Authorization', `Bearer ${candidateToken1}`);

    expect(startRes.status).toBe(201);
    expect(startRes.body.success).toBe(true);
    expect(startRes.body.attempt.questions.length).toBe(10);
    expect(startRes.body.attempt.status).toBe('in_progress');
    expect(startRes.body.attempt.remainingSeconds).toBeGreaterThan(0);

    // CRITICAL SECURITY: Verify correctOption & explanation are stripped
    startRes.body.attempt.questions.forEach((q) => {
      expect(q.correctOption).toBeUndefined();
      expect(q.explanation).toBeUndefined();
      expect(q.isCorrect).toBeUndefined();
      expect(q.options.length).toBe(4);
      expect(q.orderNumber).toBeDefined();
    });
  });

  it('should reject start if active questions count is not exactly 10', async () => {
    // Deactivate one question so only 9 active questions remain
    const oneQ = await Question.findOne({ isActive: true });
    oneQ.isActive = false;
    oneQ.activeSlot = null;
    await oneQ.save();

    const res = await request(app)
      .post('/api/assessment/start')
      .set('Authorization', `Bearer ${candidateToken1}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Question bank requires exactly 10 active questions/);
  });

  it('should maintain stable question order and saved answers across page refresh', async () => {
    // Start assessment
    const startRes = await request(app)
      .post('/api/assessment/start')
      .set('Authorization', `Bearer ${candidateToken1}`);

    const q1 = startRes.body.attempt.questions[0];

    // Save answer for first question
    const saveRes = await request(app)
      .patch(`/api/assessment/attempt/questions/${q1.snapshotId}`)
      .set('Authorization', `Bearer ${candidateToken1}`)
      .send({ selectedOption: 'B', isMarkedForReview: true });

    expect(saveRes.status).toBe(200);
    expect(saveRes.body.question.selectedOption).toBe('B');
    expect(saveRes.body.question.isMarkedForReview).toBe(true);

    // Simulate page refresh via GET /api/assessment/attempt/current
    const refreshRes = await request(app)
      .get('/api/assessment/attempt/current')
      .set('Authorization', `Bearer ${candidateToken1}`);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.attempt.questions[0].snapshotId).toBe(q1.snapshotId);
    expect(refreshRes.body.attempt.questions[0].selectedOption).toBe('B');
    expect(refreshRes.body.attempt.questions[0].isMarkedForReview).toBe(true);
    expect(refreshRes.body.attempt.answeredCount).toBe(1);
    expect(refreshRes.body.attempt.unansweredCount).toBe(9);
  });

  it('should allow clearing an answer by passing null', async () => {
    const startRes = await request(app)
      .post('/api/assessment/start')
      .set('Authorization', `Bearer ${candidateToken1}`);
    const q1 = startRes.body.attempt.questions[0];

    // Set answer
    await request(app)
      .patch(`/api/assessment/attempt/questions/${q1.snapshotId}`)
      .set('Authorization', `Bearer ${candidateToken1}`)
      .send({ selectedOption: 'C' });

    // Clear answer
    const clearRes = await request(app)
      .patch(`/api/assessment/attempt/questions/${q1.snapshotId}`)
      .set('Authorization', `Bearer ${candidateToken1}`)
      .send({ selectedOption: null });

    expect(clearRes.status).toBe(200);
    expect(clearRes.body.question.selectedOption).toBeNull();
    expect(clearRes.body.question.isAnswered).toBe(false);
  });

  it('should prevent Candidate B from modifying Candidate A questions (Ownership Protection)', async () => {
    const startResA = await request(app)
      .post('/api/assessment/start')
      .set('Authorization', `Bearer ${candidateToken1}`);
    const qA = startResA.body.attempt.questions[0];

    // Candidate B starts own assessment
    await request(app)
      .post('/api/assessment/start')
      .set('Authorization', `Bearer ${candidateToken2}`);

    // Candidate B attempts to mutate Candidate A's question snapshot
    const attackRes = await request(app)
      .patch(`/api/assessment/attempt/questions/${qA.snapshotId}`)
      .set('Authorization', `Bearer ${candidateToken2}`)
      .send({ selectedOption: 'D' });

    expect(attackRes.status).toBe(404);
    expect(attackRes.body.success).toBe(false);
    expect(attackRes.body.message).toMatch(/not found in this assessment/);
  });

  it('should reject answer modifications after assessment timer expires', async () => {
    const startRes = await request(app)
      .post('/api/assessment/start')
      .set('Authorization', `Bearer ${candidateToken1}`);
    const q1 = startRes.body.attempt.questions[0];

    // Manually set attempt expiresAt into the past
    await Attempt.findOneAndUpdate(
      { candidateId: candidateId1 },
      { $set: { expiresAt: new Date(Date.now() - 5000) } }
    );

    const expiredRes = await request(app)
      .patch(`/api/assessment/attempt/questions/${q1.snapshotId}`)
      .set('Authorization', `Bearer ${candidateToken1}`)
      .send({ selectedOption: 'A' });

    expect(expiredRes.status).toBe(400);
    expect(expiredRes.body.success).toBe(false);
    expect(expiredRes.body.message).toMatch(/time limit has expired/);
  });

  it('GET /api/assessment/attempt/submission-preview should return accurate counts', async () => {
    const startRes = await request(app)
      .post('/api/assessment/start')
      .set('Authorization', `Bearer ${candidateToken1}`);
    const q1 = startRes.body.attempt.questions[0];
    const q2 = startRes.body.attempt.questions[1];

    await request(app)
      .patch(`/api/assessment/attempt/questions/${q1.snapshotId}`)
      .set('Authorization', `Bearer ${candidateToken1}`)
      .send({ selectedOption: 'A', isMarkedForReview: true });

    await request(app)
      .patch(`/api/assessment/attempt/questions/${q2.snapshotId}`)
      .set('Authorization', `Bearer ${candidateToken1}`)
      .send({ selectedOption: 'B', isMarkedForReview: false });

    const previewRes = await request(app)
      .get('/api/assessment/attempt/submission-preview')
      .set('Authorization', `Bearer ${candidateToken1}`);

    expect(previewRes.status).toBe(200);
    expect(previewRes.body.preview.totalQuestions).toBe(10);
    expect(previewRes.body.preview.answeredCount).toBe(2);
    expect(previewRes.body.preview.unansweredCount).toBe(8);
    expect(previewRes.body.preview.markedForReviewCount).toBe(1);
  });

  it('should allow manual submission before expiry and support idempotent repeat submissions', async () => {
    await request(app)
      .post('/api/assessment/start')
      .set('Authorization', `Bearer ${candidateToken1}`);

    const submitRes1 = await request(app)
      .post('/api/assessment/attempt/submit')
      .set('Authorization', `Bearer ${candidateToken1}`);

    expect(submitRes1.status).toBe(200);
    expect(submitRes1.body.success).toBe(true);
    expect(submitRes1.body.result.scoreSummary).toBeDefined();
    expect(submitRes1.body.result.scoreSummary.submissionType).toBe('manual');

    // Repeated submit returns same completed result without re-evaluating
    const submitRes2 = await request(app)
      .post('/api/assessment/attempt/submit')
      .set('Authorization', `Bearer ${candidateToken1}`);

    expect(submitRes2.status).toBe(200);
    expect(submitRes2.body.result.attemptId).toBe(submitRes1.body.result.attemptId);
  });

  it('should auto-finalize overdue assessments in background via expiryService after grace period', async () => {
    await request(app)
      .post('/api/assessment/start')
      .set('Authorization', `Bearer ${candidateToken1}`);

    // Set expiresAt to 35 seconds ago (past 30s grace period)
    await Attempt.findOneAndUpdate(
      { candidateId: candidateId1 },
      { $set: { expiresAt: new Date(Date.now() - 35000) } }
    );

    // Trigger background expiry scan
    await processExpiredAssessments();

    const finalizedAttempt = await Attempt.findOne({ candidateId: candidateId1 });
    expect(finalizedAttempt.status).toBe('timed_out');
    expect(finalizedAttempt.submissionType).toBe('auto_timeout');
    expect(finalizedAttempt.scoreSummary.totalQuestions).toBe(10);
  });

  it('GET /api/assessment/result should reject when in progress and return full scores once completed', async () => {
    await request(app)
      .post('/api/assessment/start')
      .set('Authorization', `Bearer ${candidateToken1}`);

    // In progress -> 400
    const inProgressRes = await request(app)
      .get('/api/assessment/result')
      .set('Authorization', `Bearer ${candidateToken1}`);
    expect(inProgressRes.status).toBe(400);
    expect(inProgressRes.body.message).toMatch(/currently in progress/);

    // Submit
    await request(app)
      .post('/api/assessment/attempt/submit')
      .set('Authorization', `Bearer ${candidateToken1}`);

    // Completed -> 200
    const completedRes = await request(app)
      .get('/api/assessment/result')
      .set('Authorization', `Bearer ${candidateToken1}`);
    expect(completedRes.status).toBe(200);
    expect(completedRes.body.success).toBe(true);
    expect(completedRes.body.result.candidate.email).toBe('alice.engine@test.com');
    expect(completedRes.body.result.scoreSummary.totalQuestions).toBe(10);
    expect(completedRes.body.result.scoreSummary.netScore).toBeDefined();
    expect(completedRes.body.result.scoreSummary.isPassed).toBeDefined();

    // Candidate 2 accessing results without an attempt -> 404
    const cand2Res = await request(app)
      .get('/api/assessment/result')
      .set('Authorization', `Bearer ${candidateToken2}`);
    expect(cand2Res.status).toBe(404);
  });
});
