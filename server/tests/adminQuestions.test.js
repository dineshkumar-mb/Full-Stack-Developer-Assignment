import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { Candidate } from '../models/Candidate.js';
import { seedAdmin } from '../seeders/seedAdmin.js';
import { seedQuestions } from '../seeders/seedQuestions.js';
import { generateToken } from '../utils/generateToken.js';

describe('Phase 4 - Question Management CRUD & Active Limit Enforcement', () => {
  let adminToken;
  let candidateToken;

  const validQuestionData = {
    questionText: 'What is the sum of angles in a triangle in Euclidean geometry?',
    options: [
      { optionId: 'A', text: '90 degrees' },
      { optionId: 'B', text: '180 degrees' },
      { optionId: 'C', text: '270 degrees' },
      { optionId: 'D', text: '360 degrees' },
    ],
    correctOption: 'B',
    category: 'Quantitative',
    difficulty: 'Easy',
    explanation: 'The interior angles of a Euclidean triangle always sum to 180 degrees.',
    isActive: false,
  };

  beforeEach(async () => {
    await seedAdmin();
    await seedQuestions(); // Seeds 10 active questions
    adminToken = generateToken({
      id: '507f1f77bcf86cd799439011',
      email: 'admin@assessment.com',
      role: 'admin',
    });
    candidateToken = generateToken({
      id: '507f1f77bcf86cd799439022',
      email: 'cand@test.com',
      role: 'candidate',
    });
  });

  it('should list questions with pagination and filtering (GET /api/admin/questions)', async () => {
    const res = await request(app)
      .get('/api/admin/questions?page=1&limit=5&category=Quantitative')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.questions.length).toBeLessThanOrEqual(5);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(5);
    expect(res.body.pagination.total).toBe(4); // 4 Quant questions in seed
  });

  it('should retrieve a single question by ID (GET /api/admin/questions/:id)', async () => {
    const questions = await Question.find();
    const target = questions[0];

    const res = await request(app)
      .get(`/api/admin/questions/${target._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.question._id).toBe(target._id.toString());
  });

  it('should create an inactive question successfully (POST /api/admin/questions)', async () => {
    const res = await request(app)
      .post('/api/admin/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validQuestionData);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.question.questionText).toBe(validQuestionData.questionText);
    expect(res.body.question.isActive).toBe(false);
  });

  it('should reject creating an active 11th question when 10 questions are already active', async () => {
    const activeQ = { ...validQuestionData, isActive: true };

    const res = await request(app)
      .post('/api/admin/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(activeQ);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Maximum 10 active questions permitted/i);
  });

  it('should reject deactivating a question if doing so leaves fewer than 10 active questions', async () => {
    const activeQuestions = await Question.find({ isActive: true });
    expect(activeQuestions.length).toBe(10);

    const target = activeQuestions[0];

    const res = await request(app)
      .patch(`/api/admin/questions/${target._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/exactly 10 active questions must remain active/i);
  });

  it('should permit activating a new question if an existing question is first deactivated via atomic swap', async () => {
    // 1. Create an 11th inactive question
    const createRes = await request(app)
      .post('/api/admin/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validQuestionData);
    const newQuestionId = createRes.body.question._id;

    const activeQuestions = await Question.find({ isActive: true });
    expect(activeQuestions.length).toBe(10);
    const oldQuestion = activeQuestions[0];

    // 2. Deactivate the old question and atomically activate the replacement
    const swapRes = await request(app)
      .patch(`/api/admin/questions/${oldQuestion._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        isActive: false,
        replacementQuestionId: newQuestionId,
      });

    expect(swapRes.status).toBe(200);
    expect(swapRes.body.success).toBe(true);

    // Verify database state: old is inactive, replacement is active, total active is still 10
    const reloadedOld = await Question.findById(oldQuestion._id);
    const reloadedNew = await Question.findById(newQuestionId);
    expect(reloadedOld.isActive).toBe(false);
    expect(reloadedOld.activeSlot).toBeNull();
    expect(reloadedNew.isActive).toBe(true);
    expect(reloadedNew.activeSlot).toBeDefined();

    const activeCount = await Question.countDocuments({ isActive: true });
    expect(activeCount).toBe(10);
  });

  it('should reject invalid options format (missing option D)', async () => {
    const invalidData = {
      ...validQuestionData,
      options: [
        { optionId: 'A', text: 'Opt A' },
        { optionId: 'B', text: 'Opt B' },
        { optionId: 'C', text: 'Opt C' },
      ],
    };

    const res = await request(app)
      .post('/api/admin/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(invalidData);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/validation failed/i);
  });

  it('should reject invalid correctOption not matching options', async () => {
    const invalidData = {
      ...validQuestionData,
      correctOption: 'D',
      options: [
        { optionId: 'A', text: 'Opt A' },
        { optionId: 'B', text: 'Opt B' },
        { optionId: 'C', text: 'Opt C' },
        { optionId: 'D', text: '' }, // empty text
      ],
    };

    const res = await request(app)
      .post('/api/admin/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(invalidData);

    expect(res.status).toBe(400);
  });

  it('should reject candidate token trying to access admin question endpoints with 403', async () => {
    const res = await request(app)
      .get('/api/admin/questions')
      .set('Authorization', `Bearer ${candidateToken}`);

    expect(res.status).toBe(403);
  });

  it('should ensure historical attempt question snapshots are immutable when a question is edited', async () => {
    const activeQuestions = await Question.find({ isActive: true });
    const targetQ = activeQuestions[0];

    // Create a candidate and completed attempt referencing this question
    const cand = await Candidate.create({
      fullName: 'History Tester',
      email: 'history@test.com',
      age: 23,
      phoneNumber: '9999999999',
      highestQualification: "Bachelor's Degree",
      hasAttempted: true,
    });

    const originalText = targetQ.questionText;

    const attempt = await Attempt.create({
      candidateId: cand._id,
      candidateEmail: cand.email,
      candidateSnapshot: cand.toObject(),
      status: 'completed',
      startedAt: new Date(Date.now() - 60000),
      expiresAt: new Date(Date.now() + 60000),
      submittedAt: new Date(),
      questionSnapshots: [
        {
          questionId: targetQ._id,
          orderNumber: 1,
          questionText: originalText,
          options: targetQ.options,
          correctOption: targetQ.correctOption,
          category: targetQ.category,
          difficulty: targetQ.difficulty,
          candidateAnswer: 'A',
          isCorrect: true,
        },
        ...Array.from({ length: 9 }, (_, i) => ({
          questionId: activeQuestions[i + 1]._id,
          orderNumber: i + 2,
          questionText: activeQuestions[i + 1].questionText,
          options: activeQuestions[i + 1].options,
          correctOption: activeQuestions[i + 1].correctOption,
          category: activeQuestions[i + 1].category,
          difficulty: activeQuestions[i + 1].difficulty,
          candidateAnswer: 'A',
          isCorrect: true,
        })),
      ],
      settingsSnapshot: {},
    });

    // Admin edits the question in the question bank
    const updateRes = await request(app)
      .patch(`/api/admin/questions/${targetQ._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        questionText: 'MODIFIED QUESTION TEXT BY ADMIN FOR NEW ASSESSMENTS',
      });

    expect(updateRes.status).toBe(200);

    // Verify the historical Attempt still retains the ORIGINAL question text
    const historicalAttempt = await Attempt.findById(attempt._id);
    expect(historicalAttempt.questionSnapshots[0].questionText).toBe(originalText);
    expect(historicalAttempt.questionSnapshots[0].questionText).not.toBe(
      'MODIFIED QUESTION TEXT BY ADMIN FOR NEW ASSESSMENTS'
    );
  });

  it('should reject deleting a question referenced in historical candidate attempts', async () => {
    const activeQuestions = await Question.find({ isActive: true });
    const targetQ = activeQuestions[0];

    const cand = await Candidate.create({
      fullName: 'Audit Tester',
      email: 'audit@test.com',
      age: 24,
      phoneNumber: '8888888888',
      highestQualification: "Bachelor's Degree",
      hasAttempted: true,
    });

    await Attempt.create({
      candidateId: cand._id,
      candidateEmail: cand.email,
      candidateSnapshot: cand.toObject(),
      status: 'completed',
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 60000),
      questionSnapshots: Array.from({ length: 10 }, (_, i) => ({
        questionId: targetQ._id,
        orderNumber: i + 1,
        questionText: `Q${i}`,
        options: [{ optionId: 'A', text: 'Opt' }],
        correctOption: 'A',
        category: 'Verbal',
        difficulty: 'Easy',
      })),
      settingsSnapshot: {},
    });

    const deleteRes = await request(app)
      .delete(`/api/admin/questions/${targetQ._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(400);
    expect(deleteRes.body.message).toMatch(/referenced in.*attempts/i);
  });
});
