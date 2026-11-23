import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { Candidate } from '../models/Candidate.js';
import { Attempt } from '../models/Attempt.js';
import { seedAdmin } from '../seeders/seedAdmin.js';
import { generateToken } from '../utils/generateToken.js';
import { sanitizeFormulaInjection } from '../services/adminExportService.js';

describe('Phase 4 - Candidate Management & CSV/Excel Export', () => {
  let adminToken;
  let candidate1Id;
  let candidate2Id;

  beforeEach(async () => {
    await seedAdmin();
    adminToken = generateToken({
      id: '507f1f77bcf86cd799439011',
      email: 'admin@assessment.com',
      role: 'admin',
    });

    // Seed test candidate 1: with formula attempt in city to test CWE-1236 protection
    const cand1 = await Candidate.create({
      fullName: 'Formula Candidate',
      email: 'formula.injection@test.com',
      age: 25,
      phoneNumber: '9876543210',
      highestQualification: "Bachelor's Degree",
      city: '+New York', // Formula injection attempt with +
      hasAttempted: true,
    });
    candidate1Id = cand1._id;

    // Cand1 attempt: completed
    await Attempt.create({
      candidateId: cand1._id,
      candidateEmail: cand1.email,
      candidateSnapshot: cand1.toObject(),
      status: 'completed',
      startedAt: new Date(Date.now() - 600000),
      expiresAt: new Date(Date.now() + 300000),
      submittedAt: new Date(Date.now() - 50000),
      questionSnapshots: [
        {
          questionId: cand1._id,
          orderNumber: 1,
          questionText: 'Test Question 1',
          options: [
            { optionId: 'A', text: 'Option A' },
            { optionId: 'B', text: 'Option B' },
            { optionId: 'C', text: 'Option C' },
            { optionId: 'D', text: 'Option D' },
          ],
          correctOption: 'B',
          candidateAnswer: 'B',
          isCorrect: true,
          category: 'Quantitative',
          difficulty: 'Easy',
          explanation: 'Because B is correct.',
        },
        ...Array.from({ length: 9 }, (_, i) => ({
          questionId: cand1._id,
          orderNumber: i + 2,
          questionText: `Test Q${i + 2}`,
          options: [{ optionId: 'A', text: 'Opt A' }],
          correctOption: 'A',
          candidateAnswer: null, // Unanswered
          isCorrect: false,
          category: 'Verbal',
          difficulty: 'Medium',
          explanation: '',
        })),
      ],
      scoreSummary: {
        totalQuestions: 10,
        correctCount: 1,
        incorrectCount: 0,
        unattemptedCount: 9,
        marksGained: 2,
        marksDeducted: 0,
        netScore: 2,
        scaledScoreOutOf10: 1,
        percentage: 10,
        passPercentageCutoff: 60,
        isPassed: false,
        timeTakenSeconds: 550,
      },
      settingsSnapshot: {},
    });

    // Seed test candidate 2: Normal passed candidate
    const cand2 = await Candidate.create({
      fullName: 'Alice Walker',
      email: 'alice.walker@example.com',
      age: 27,
      phoneNumber: '9123456780',
      highestQualification: "Master's Degree",
      city: 'Boston',
      hasAttempted: true,
    });
    candidate2Id = cand2._id;

    await Attempt.create({
      candidateId: cand2._id,
      candidateEmail: cand2.email,
      candidateSnapshot: cand2.toObject(),
      status: 'completed',
      startedAt: new Date(Date.now() - 800000),
      expiresAt: new Date(Date.now() + 100000),
      submittedAt: new Date(Date.now() - 10000),
      questionSnapshots: Array.from({ length: 10 }, (_, i) => ({
        questionId: cand2._id,
        orderNumber: i + 1,
        questionText: `Q${i}`,
        options: [{ optionId: 'A', text: 'A' }],
        correctOption: 'A',
        candidateAnswer: 'A',
        isCorrect: true,
        category: 'Logical Reasoning',
        difficulty: 'Hard',
      })),
      scoreSummary: {
        totalQuestions: 10,
        correctCount: 10,
        incorrectCount: 0,
        unattemptedCount: 0,
        marksGained: 20,
        marksDeducted: 0,
        netScore: 20,
        scaledScoreOutOf10: 10,
        percentage: 100,
        passPercentageCutoff: 60,
        isPassed: true,
        timeTakenSeconds: 450,
      },
      settingsSnapshot: {},
    });
  });

  it('should list candidates with pagination, search, and score details (GET /api/admin/candidates)', async () => {
    const res = await request(app)
      .get('/api/admin/candidates?page=1&limit=10&sortBy=score&sortOrder=desc')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.candidates.length).toBe(2);
    expect(res.body.pagination.total).toBe(2);
    // Highest score first (Alice with 20)
    expect(res.body.candidates[0].fullName).toBe('Alice Walker');
    expect(res.body.candidates[0].score).toBe(20);
    expect(res.body.candidates[0].isPassed).toBe(true);
  });

  it('should search candidates by email or name (GET /api/admin/candidates?search=...)', async () => {
    const res = await request(app)
      .get('/api/admin/candidates?search=alice')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.candidates.length).toBe(1);
    expect(res.body.candidates[0].email).toBe('alice.walker@example.com');
  });

  it('should filter candidates by isPassed status', async () => {
    const res = await request(app)
      .get('/api/admin/candidates?isPassed=true')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.candidates.length).toBe(1);
    expect(res.body.candidates[0].fullName).toBe('Alice Walker');
  });

  it('should retrieve single candidate safe profile (GET /api/admin/candidates/:id)', async () => {
    const res = await request(app)
      .get(`/api/admin/candidates/${candidate2Id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.candidate.fullName).toBe('Alice Walker');
    expect(res.body.candidate.assessmentStatus).toBe('completed');
  });

  it('should return complete assessment review for completed candidate (GET /api/admin/candidates/:id/assessment)', async () => {
    const res = await request(app)
      .get(`/api/admin/candidates/${candidate1Id}/assessment`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const assessment = res.body.assessment;
    expect(assessment.status).toBe('completed');
    expect(assessment.scoreSummary.netScore).toBe(2);
    expect(assessment.questions.length).toBe(10);

    // Transparency for admin: question details + correct option + candidate answer
    const q1 = assessment.questions[0];
    expect(q1.questionText).toBe('Test Question 1');
    expect(q1.correctOption).toBe('B');
    expect(q1.candidateAnswer).toBe('B');
    expect(q1.isCorrect).toBe(true);
    expect(q1.explanation).toBe('Because B is correct.');

    // Unanswered question representation
    const q2 = assessment.questions[1];
    expect(q2.candidateAnswer).toBeNull();
    expect(q2.isCorrect).toBe(false);
  });

  it('should sanitize formula injection triggering characters (=, +, -, @) safely', () => {
    expect(sanitizeFormulaInjection('=SUM(A1:B1)')).toBe("'=SUM(A1:B1)");
    expect(sanitizeFormulaInjection('+123456')).toBe("'+123456");
    expect(sanitizeFormulaInjection('-10')).toBe("'-10");
    expect(sanitizeFormulaInjection('@mention')).toBe("'@mention");
    expect(sanitizeFormulaInjection('Safe Name')).toBe('Safe Name');
    expect(sanitizeFormulaInjection(100)).toBe('100');
    expect(sanitizeFormulaInjection(null)).toBe('');
  });

  it('should export candidates as CSV with formula injection protection (GET /api/admin/candidates/export/csv)', async () => {
    const res = await request(app)
      .get('/api/admin/candidates/export/csv')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="candidates_export_/);

    const csvBody = res.text;
    expect(csvBody).toContain('"Candidate Name","Email","Phone"');
    expect(csvBody).toContain('"Formula Candidate"');
    // CWE-1236 check: '+New York' must be sanitized with prepended single quote
    expect(csvBody).toContain("'+New York");
    // Legitimate numeric values remain numbers
    expect(csvBody).toContain('20');
  });

  it('should export candidates as Excel with formula injection protection (GET /api/admin/candidates/export/excel)', async () => {
    const res = await request(app)
      .get('/api/admin/candidates/export/excel')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/vnd\.ms-excel/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="candidates_export_/);

    const xmlBody = res.text;
    expect(xmlBody).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xmlBody).toContain('<Workbook');
    expect(xmlBody).toContain('<Data ss:Type="String">');
    // String data contains sanitized content
    expect(xmlBody).toContain("&apos;+New York");
  });
});
