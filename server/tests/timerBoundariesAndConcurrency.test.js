import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { Attempt } from '../models/Attempt.js';
import { Question } from '../models/Question.js';
import { Candidate } from '../models/Candidate.js';
import { seedQuestions } from '../seeders/seedQuestions.js';
import { seedSettings } from '../seeders/seedSettings.js';
import { finalizeAttemptAtomically, updateCandidateAnswer } from '../services/assessmentService.js';
import { processExpiredAssessments } from '../services/expiryService.js';

describe('Phase 3 Audit - Exact Expiry Boundaries & Concurrency', () => {
  let candidateToken;
  let candidateId;
  let attemptId;
  let snapshotId1;

  beforeEach(async () => {
    await seedSettings();
    await seedQuestions();

    const reg = await request(app).post('/api/candidates/register').send({
      fullName: 'Boundary Tester',
      email: `boundary.${Date.now()}.${Math.random()}@test.com`,
      age: 25,
      phone: '9876543210',
      qualification: "Bachelor's Degree",
    });
    candidateToken = reg.body.token;
    candidateId = reg.body.candidate.id;

    const startRes = await request(app)
      .post('/api/assessment/start')
      .set('Authorization', `Bearer ${candidateToken}`);

    attemptId = startRes.body.attempt.attemptId;
    snapshotId1 = startRes.body.attempt.questions[0].snapshotId;
  });

  // --- 1. DETERMINISTIC BOUNDARY TESTS ---

  it('Boundary 1: Exactly 1 millisecond before expiry (expiresAt - 1ms) -> Answer updates and manual submission permitted', async () => {
    const fixedNow = 1700000000000;
    // Set expiresAt to fixedNow + 1ms (so fixedNow is 1ms before expiry)
    const expiresAt = new Date(fixedNow + 1);

    await Attempt.findByIdAndUpdate(attemptId, {
      startedAt: new Date(fixedNow - 900000),
      expiresAt,
    });

    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);

    // Answer modification should succeed (1ms before expiry)
    const updateRes = await request(app)
      .patch(`/api/assessment/attempt/questions/${snapshotId1}`)
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({ selectedOption: 'A' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.question.selectedOption).toBe('A');

    // Manual submission should succeed as 'manual'
    const submitRes = await request(app)
      .post('/api/assessment/attempt/submit')
      .set('Authorization', `Bearer ${candidateToken}`);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.result.scoreSummary.submissionType).toBe('manual');

    vi.useRealTimers();
  });

  it('Boundary 2: Exactly at expiry (now === expiresAt) -> Answer updates rejected, submission allowed as auto_timeout', async () => {
    const fixedNow = 1700000000000;
    const expiresAt = new Date(fixedNow); // Exactly at expiry

    await Attempt.findByIdAndUpdate(attemptId, {
      startedAt: new Date(fixedNow - 900000),
      expiresAt,
    });

    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);

    // Answer modification MUST be rejected at expiry
    const updateRes = await request(app)
      .patch(`/api/assessment/attempt/questions/${snapshotId1}`)
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({ selectedOption: 'B' });

    expect(updateRes.status).toBe(400);
    expect(updateRes.body.message).toMatch(/time limit has expired/);

    // Submission within grace period is accepted, classified as auto_timeout
    const submitRes = await request(app)
      .post('/api/assessment/attempt/submit')
      .set('Authorization', `Bearer ${candidateToken}`);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.result.scoreSummary.submissionType).toBe('auto_timeout');

    vi.useRealTimers();
  });

  it('Boundary 3: Exactly 1 millisecond after expiry (expiresAt + 1ms) -> Answer updates rejected, submission allowed as auto_timeout', async () => {
    const fixedNow = 1700000000000;
    const expiresAt = new Date(fixedNow - 1); // 1ms past expiry

    await Attempt.findByIdAndUpdate(attemptId, {
      startedAt: new Date(fixedNow - 900000),
      expiresAt,
    });

    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);

    // Answer modification rejected
    const updateRes = await request(app)
      .patch(`/api/assessment/attempt/questions/${snapshotId1}`)
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({ selectedOption: 'C' });

    expect(updateRes.status).toBe(400);
    expect(updateRes.body.message).toMatch(/time limit has expired/);

    // Submission within grace period allowed as auto_timeout
    const submitRes = await request(app)
      .post('/api/assessment/attempt/submit')
      .set('Authorization', `Bearer ${candidateToken}`);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.result.scoreSummary.submissionType).toBe('auto_timeout');

    vi.useRealTimers();
  });

  it('Boundary 4: Exactly at end of grace period (expiresAt + 30,000ms) -> Submission allowed, worker does not finalize prematurely', async () => {
    const fixedNow = 1700000000000;
    const expiresAt = new Date(fixedNow - 30000); // Exactly at 30s grace boundary

    await Attempt.findByIdAndUpdate(attemptId, {
      startedAt: new Date(fixedNow - 930000),
      expiresAt,
    });

    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);

    // Expiry scanner should NOT finalize at exactly 30s boundary (requires strictly > 30s)
    await processExpiredAssessments();
    const stillInProgress = await Attempt.findById(attemptId);
    expect(stillInProgress.status).toBe('in_progress');

    // Submission at end of grace period allowed
    const submitRes = await request(app)
      .post('/api/assessment/attempt/submit')
      .set('Authorization', `Bearer ${candidateToken}`);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.result.scoreSummary.submissionType).toBe('auto_timeout');

    vi.useRealTimers();
  });

  it('Boundary 5: Exactly 1 millisecond beyond grace period (expiresAt + 30,001ms) -> Worker finalizes as auto_timeout', async () => {
    const fixedNow = 1700000000000;
    const expiresAt = new Date(fixedNow - 30001); // 1ms past grace period

    await Attempt.findByIdAndUpdate(attemptId, {
      startedAt: new Date(fixedNow - 930001),
      expiresAt,
    });

    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);

    // Scanner should discover and finalize this attempt
    await processExpiredAssessments();

    const finalized = await Attempt.findById(attemptId);
    expect(finalized.status).toBe('timed_out');
    expect(finalized.submissionType).toBe('auto_timeout');
    expect(finalized.scoreSummary.totalQuestions).toBe(10);

    vi.useRealTimers();
  });

  it('Prerequisite Check: Database-level expiry guard enforces rejection inside atomic MongoDB update filter even if initial validation checked prior to expiry', async () => {
    // Set actual DB document to expired
    await Attempt.findByIdAndUpdate(attemptId, {
      expiresAt: new Date(Date.now() - 5000),
    });

    // Mock initial Attempt.findOne so application-level timer check passes as if validated just before expiry
    const realFindOne = Attempt.findOne.bind(Attempt);
    const findOneSpy = vi.spyOn(Attempt, 'findOne').mockImplementation(async (query) => {
      const doc = await realFindOne(query);
      if (doc && doc._id.toString() === attemptId) {
        doc.expiresAt = new Date(Date.now() + 60000);
      }
      return doc;
    });

    const mutateRes = await request(app)
      .patch(`/api/assessment/attempt/questions/${snapshotId1}`)
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({ selectedOption: 'C' });

    findOneSpy.mockRestore();

    // The update must be rejected by MongoDB filter { expiresAt: { $gt: new Date() } }
    expect(mutateRes.status).toBe(400);
    expect(mutateRes.body.message).toMatch(/expired or completed/);

    // Verify DB was NOT mutated
    const currentDoc = await Attempt.findById(attemptId);
    const snap = currentDoc.questionSnapshots.find((s) => s.snapshotId === snapshotId1);
    expect(snap.candidateAnswer).not.toBe('C');
  });

  // --- 2. OPTIMISTIC CONCURRENCY AUDIT ---

  it('should increment version on every accepted answer or review update', async () => {
    const initialAttempt = await Attempt.findById(attemptId);
    const v0 = initialAttempt.version || 0;

    // First update
    await request(app)
      .patch(`/api/assessment/attempt/questions/${snapshotId1}`)
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({ selectedOption: 'A' });

    const afterFirst = await Attempt.findById(attemptId);
    expect(afterFirst.version).toBe(v0 + 1);

    // Second update (review flag toggle)
    await request(app)
      .patch(`/api/assessment/attempt/questions/${snapshotId1}`)
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({ isMarkedForReview: true });

    const afterSecond = await Attempt.findById(attemptId);
    expect(afterSecond.version).toBe(v0 + 2);
  });

  it('should prevent completed attempts from receiving further answer modifications', async () => {
    // Submit assessment
    await request(app)
      .post('/api/assessment/attempt/submit')
      .set('Authorization', `Bearer ${candidateToken}`);

    const completed = await Attempt.findById(attemptId);
    expect(completed.status).toBe('completed');

    // Attempting answer update on completed attempt must fail
    const mutateRes = await request(app)
      .patch(`/api/assessment/attempt/questions/${snapshotId1}`)
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({ selectedOption: 'D' });

    expect(mutateRes.status).toBe(400);
    expect(mutateRes.body.message).toMatch(/already completed/);
  });

  // --- 3. MULTI-INSTANCE EXPIRY PROCESSING AUDIT ---

  it('should handle competing concurrent expiry workers safely without duplicate evaluation', async () => {
    // Set attempt past grace period
    await Attempt.findByIdAndUpdate(attemptId, {
      expiresAt: new Date(Date.now() - 40000),
    });

    // Simulate 3 worker instances attempting to finalize the exact same attempt concurrently
    const worker1 = finalizeAttemptAtomically(attemptId, 'auto_timeout');
    const worker2 = finalizeAttemptAtomically(attemptId, 'auto_timeout');
    const worker3 = finalizeAttemptAtomically(attemptId, 'auto_timeout');

    const [res1, res2, res3] = await Promise.all([worker1, worker2, worker3]);

    // All workers must resolve successfully to the same single finalized attempt
    expect(res1._id.toString()).toBe(attemptId);
    expect(res2._id.toString()).toBe(attemptId);
    expect(res3._id.toString()).toBe(attemptId);
    expect(res1.status).toBe('timed_out');
    expect(res2.status).toBe('timed_out');
    expect(res3.status).toBe('timed_out');

    // Verify only ONE attempt record exists in database
    const totalAttempts = await Attempt.countDocuments({ candidateId });
    expect(totalAttempts).toBe(1);

    // Verify version was incremented exactly once for finalization
    const finalDoc = await Attempt.findById(attemptId);
    expect(finalDoc.version).toBe(1); // v0 -> v1 upon finalization
  });
});
