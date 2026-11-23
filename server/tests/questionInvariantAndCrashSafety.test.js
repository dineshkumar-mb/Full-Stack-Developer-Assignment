import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { Candidate } from '../models/Candidate.js';
import { ReplacementJournal } from '../models/ReplacementJournal.js';
import { seedAdmin } from '../seeders/seedAdmin.js';
import { seedQuestions } from '../seeders/seedQuestions.js';
import { generateToken } from '../utils/generateToken.js';
import assessmentService from '../services/assessmentService.js';
import adminQuestionService from '../services/adminQuestionService.js';

describe('Phase 4 & 5 Hardening — Reliability, Invariants, Crash Safety & Ordering', () => {
  let adminToken;
  let candidateToken;
  let candidateId;

  const validQuestionPayload = {
    questionText: 'Which planet is known as the Red Planet in our solar system?',
    options: [
      { optionId: 'A', text: 'Venus' },
      { optionId: 'B', text: 'Mars' },
      { optionId: 'C', text: 'Jupiter' },
      { optionId: 'D', text: 'Saturn' },
    ],
    correctOption: 'B',
    category: 'Logical Reasoning',
    difficulty: 'Easy',
    explanation: 'Mars is reddish due to iron oxide on its surface.',
  };

  beforeEach(async () => {
    await seedAdmin();
    await seedQuestions(); // Seeds exactly 10 active questions with slots 1..10

    adminToken = generateToken({
      id: '507f1f77bcf86cd799439011',
      email: 'admin@assessment.com',
      role: 'admin',
    });

    candidateId = new mongoose.Types.ObjectId().toString();
    const candidate = await Candidate.create({
      _id: candidateId,
      fullName: 'Invariant Tester',
      email: 'invariant.tester@example.com',
      age: 25,
      phoneNumber: '9876543210',
      gender: 'Male',
      highestQualification: "Bachelor's Degree",
    });

    candidateToken = generateToken({
      id: candidate._id.toString(),
      email: candidate.email,
      role: 'candidate',
    });
  });

  describe('Issue 1: Exactly-10 Active Question Invariant & Slot Validation', () => {
    it('rejects document save with fractional activeSlot (e.g. 2.5)', async () => {
      const q = new Question({
        ...validQuestionPayload,
        isActive: true,
        activeSlot: 2.5,
      });

      await expect(q.save()).rejects.toThrow();
    });

    it('rejects document save with out-of-range activeSlot (0 or 11)', async () => {
      const qZero = new Question({
        ...validQuestionPayload,
        isActive: true,
        activeSlot: 0,
      });
      await expect(qZero.save()).rejects.toThrow();

      const qEleven = new Question({
        ...validQuestionPayload,
        isActive: true,
        activeSlot: 11,
      });
      await expect(qEleven.save()).rejects.toThrow();
    });

    it('rejects active question with null or undefined activeSlot when slots are full', async () => {
      const qNull = new Question({
        ...validQuestionPayload,
        isActive: true,
        activeSlot: null,
      });
      await expect(qNull.save()).rejects.toThrow(/Maximum 10 active questions permitted/i);
    });

    it('rejects inactive question with non-null activeSlot', async () => {
      const qInactiveSlot = new Question({
        ...validQuestionPayload,
        isActive: false,
        activeSlot: 3,
      });
      await expect(qInactiveSlot.save()).rejects.toThrow(/Inactive questions must have activeSlot null/i);
    });

    it('rejects findOneAndUpdate when setting isActive: true with null activeSlot', async () => {
      const inactiveQ = await Question.create({
        ...validQuestionPayload,
        isActive: false,
        activeSlot: null,
      });

      await expect(
        Question.findOneAndUpdate(
          { _id: inactiveQ._id },
          { $set: { isActive: true, activeSlot: null } },
          { runValidators: true }
        )
      ).rejects.toThrow(/Active questions cannot have a null activeSlot/i);
    });

    it('rejects updateOne when setting invalid fractional activeSlot', async () => {
      const inactiveQ = await Question.create({
        ...validQuestionPayload,
        isActive: false,
        activeSlot: null,
      });

      await expect(
        Question.updateOne(
          { _id: inactiveQ._id },
          { $set: { isActive: true, activeSlot: 4.8 } },
          { runValidators: true }
        )
      ).rejects.toThrow();
    });

    it('rejects duplicate activeSlot via unique partial index', async () => {
      // Deactivate slot 10 so total active is 9, leaving slot 1 occupied
      await Question.findOneAndUpdate({ activeSlot: 10 }, { $set: { isActive: false, activeSlot: null } });

      const duplicateSlotQ = new Question({
        ...validQuestionPayload,
        isActive: true,
        activeSlot: 1, // slot 1 already seeded
      });

      await expect(duplicateSlotQ.save()).rejects.toThrow(/E11000|duplicate key/i);
    });
  });

  describe('Issue 2: Crash-Safe Question Replacement & Journal Reconciliation', () => {
    it('executes atomic question replacement preserving exactly 10 active questions', async () => {
      const inactiveQ = await Question.create({
        ...validQuestionPayload,
        isActive: false,
        activeSlot: null,
      });

      const activeQ = await Question.findOne({ isActive: true, activeSlot: 5 });
      expect(activeQ).toBeDefined();

      const res = await request(app)
        .patch(`/api/admin/questions/${activeQ._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: false,
          replacementQuestionId: inactiveQ._id.toString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.question.isActive).toBe(false);

      const activeCount = await Question.countDocuments({ isActive: true });
      expect(activeCount).toBe(10);

      const oldQ = await Question.findById(activeQ._id);
      expect(oldQ.isActive).toBe(false);
      expect(oldQ.activeSlot).toBeNull();

      const newQ = await Question.findById(inactiveQ._id);
      expect(newQ.isActive).toBe(true);
      expect(newQ.activeSlot).toBe(5);
    });

    it('reconciles interrupted replacement from journal on crash recovery', async () => {
      // Create an inactive candidate replacement question
      const replacementQ = await Question.create({
        ...validQuestionPayload,
        isActive: false,
        activeSlot: null,
      });

      const targetActiveQ = await Question.findOne({ isActive: true, activeSlot: 7 });
      const targetSlot = targetActiveQ.activeSlot;

      // Simulate a crash scenario: active question was deactivated and logged in journal,
      // but the process halted before the replacement question was activated.
      await Question.findByIdAndUpdate(targetActiveQ._id, {
        $set: { isActive: false, activeSlot: null },
      });

      const journal = await ReplacementJournal.create({
        activeQuestionId: targetActiveQ._id,
        replacementQuestionId: replacementQ._id,
        activeSlot: targetSlot,
        status: 'deactivated',
      });

      // At this point in the simulated crash, active count is 9
      const preRecoveryCount = await Question.countDocuments({ isActive: true });
      expect(preRecoveryCount).toBe(9);

      // Trigger recovery reconciliation (same as runs on server startup)
      const reconciledCount = await adminQuestionService.reconcilePendingReplacements();
      expect(reconciledCount).toBe(1);

      // Verify that active questions are restored to exactly 10 with slot 7 assigned to replacement
      const postRecoveryCount = await Question.countDocuments({ isActive: true });
      expect(postRecoveryCount).toBe(10);

      const activatedQ = await Question.findById(replacementQ._id);
      expect(activatedQ.isActive).toBe(true);
      expect(activatedQ.activeSlot).toBe(targetSlot);

      const journalEntry = await ReplacementJournal.findById(journal._id);
      expect(journalEntry.status).toBe('completed');
    });
  });

  describe('Issue 3: Monotonic Sequence Autosave Ordering', () => {
    it('prevents stale delayed Option A request from overwriting newer Option B request in MongoDB', async () => {
      // 1. Start assessment attempt
      const startRes = await request(app)
        .post('/api/assessment/start')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(startRes.status).toBe(201);
      const attempt = startRes.body.attempt;
      const targetSnapshot = attempt.questions[0];
      const snapshotId = targetSnapshot.snapshotId;

      // 2. Client selects Option B (newer user action, sequence: 2)
      const resB = await request(app)
        .patch(`/api/assessment/attempt/questions/${snapshotId}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          selectedOption: 'B',
          sequence: 2,
        });

      expect(resB.status).toBe(200);

      // Confirm Option B is currently saved in MongoDB
      const checkAttempt1 = await Attempt.findOne({ candidateId });
      const savedSnapshot1 = checkAttempt1.questionSnapshots.find((s) => s.snapshotId === snapshotId);
      expect(savedSnapshot1.candidateAnswer).toBe('B');
      expect(savedSnapshot1.clientSequence).toBe(2);

      // 3. Delayed stale Request for Option A arrives late with older sequence: 1
      const resA = await request(app)
        .patch(`/api/assessment/attempt/questions/${snapshotId}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          selectedOption: 'A',
          sequence: 1,
        });

      expect(resA.status).toBe(200);

      // 4. VERIFICATION: Stale Option A MUST NOT have overwritten Option B in MongoDB!
      const checkAttempt2 = await Attempt.findOne({ candidateId });
      const savedSnapshot2 = checkAttempt2.questionSnapshots.find((s) => s.snapshotId === snapshotId);
      expect(savedSnapshot2.candidateAnswer).toBe('B'); // Option B preserved!
      expect(savedSnapshot2.clientSequence).toBe(2);

      // 5. Subsequent newer user action (Option C, sequence: 3) should succeed
      const resC = await request(app)
        .patch(`/api/assessment/attempt/questions/${snapshotId}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          selectedOption: 'C',
          sequence: 3,
        });

      expect(resC.status).toBe(200);
      const checkAttempt3 = await Attempt.findOne({ candidateId });
      const savedSnapshot3 = checkAttempt3.questionSnapshots.find((s) => s.snapshotId === snapshotId);
      expect(savedSnapshot3.candidateAnswer).toBe('C');
      expect(savedSnapshot3.clientSequence).toBe(3);
    });
  });

  describe('Issue 4: Submission Error Classification & ATTEMPT_ALREADY_FINALIZED', () => {
    it('returns code ATTEMPT_ALREADY_FINALIZED (400) when attempting mutations on finalized attempt', async () => {
      // 1. Start assessment
      const startRes = await request(app)
        .post('/api/assessment/start')
        .set('Authorization', `Bearer ${candidateToken}`);

      const snapshotId = startRes.body.attempt.questions[0].snapshotId;

      // 2. Submit assessment to finalize it
      const submitRes = await request(app)
        .post('/api/assessment/attempt/submit')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.result).toBeDefined();

      // 3. Attempting to change an answer on finalized exam returns 400 ATTEMPT_ALREADY_FINALIZED
      const mutateRes = await request(app)
        .patch(`/api/assessment/attempt/questions/${snapshotId}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          selectedOption: 'A',
          sequence: 10,
        });

      expect(mutateRes.status).toBe(400);
      expect(mutateRes.body.success).toBe(false);
      expect(mutateRes.body.code).toBe('ATTEMPT_ALREADY_FINALIZED');
      expect(mutateRes.body.message).toMatch(/already completed/i);
    });
  });
});
