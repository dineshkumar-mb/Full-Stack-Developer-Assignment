import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { Candidate } from '../models/Candidate.js';
import { Admin } from '../models/Admin.js';
import { Settings } from '../models/Settings.js';
import { seedAdmin } from '../seeders/seedAdmin.js';
import { seedQuestions } from '../seeders/seedQuestions.js';
import { seedSettings } from '../seeders/seedSettings.js';

describe('Phase 6 — Complete End-to-End User Journeys & Security Audit', () => {
  beforeEach(async () => {
    // Reset database and seed default baseline data
    await seedAdmin();
    await seedSettings();
    await seedQuestions();
  });

  describe('1. Candidate End-to-End Lifecycle Journey', () => {
    it('executes the full candidate journey from registration to final result with answer persistence and recovery', async () => {
      // Step A: Candidate Registration
      const registrationPayload = {
        fullName: 'Jane Candidate',
        email: 'jane.candidate@company.com',
        age: 24,
        phoneNumber: '9876543210',
        gender: 'Female',
        highestQualification: "Bachelor's Degree",
        city: 'Bangalore',
      };

      const regRes = await request(app)
        .post('/api/candidate/register')
        .send(registrationPayload);

      expect(regRes.status).toBe(201);
      expect(regRes.body.success).toBe(true);
      expect(regRes.body.token).toBeDefined();
      expect(regRes.body.candidate.email).toBe('jane.candidate@company.com');

      const candidateToken = regRes.body.token;

      // Verify duplicate email is blocked with friendly error
      const dupRes = await request(app)
        .post('/api/candidate/register')
        .send(registrationPayload);

      // In-progress candidate gets reconnected/resumed rather than duplicate creation
      expect(dupRes.status).toBe(200);
      expect(dupRes.body.message).toMatch(/Candidate registration verified/i);

      // Step B: Candidate retrieves instructions (dynamic duration & weights)
      const instRes = await request(app)
        .get('/api/assessment/instructions')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(instRes.status).toBe(200);
      expect(instRes.body.instructions.totalQuestions).toBe(10);
      expect(instRes.body.instructions.durationMinutes).toBe(15);
      expect(instRes.body.instructions.correctMarkWeight).toBe(2);
      expect(instRes.body.instructions.negativeMarkWeight).toBe(1);

      // Step C: Start Assessment (creates attempt and shuffles questions)
      const startRes = await request(app)
        .post('/api/assessment/start')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(startRes.status).toBe(201);
      expect(startRes.body.attempt.questions.length).toBe(10);

      const questions = startRes.body.attempt.questions;
      const q1 = questions[0];
      const q2 = questions[1];

      // Security check: Verify correctOption and explanation are NEVER leaked during exam!
      expect(q1.correctOption).toBeUndefined();
      expect(q1.explanation).toBeUndefined();

      // Step D: Answer Question 1 (Select Option B with monotonic sequence 1)
      const ans1Res = await request(app)
        .patch(`/api/assessment/attempt/questions/${q1.snapshotId}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ selectedOption: 'B', sequence: 1 });

      expect(ans1Res.status).toBe(200);
      expect(ans1Res.body.question.selectedOption).toBe('B');

      // Step E: Answer Question 2 and mark for review
      const ans2Res = await request(app)
        .patch(`/api/assessment/attempt/questions/${q2.snapshotId}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ selectedOption: 'C', isMarkedForReview: true, sequence: 1 });

      expect(ans2Res.status).toBe(200);
      expect(ans2Res.body.question.selectedOption).toBe('C');
      expect(ans2Res.body.question.isMarkedForReview).toBe(true);

      // Step F: Simulate Accidental Page Refresh -> Recover in-progress exam
      const recoverRes = await request(app)
        .get('/api/assessment/attempt/current')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(recoverRes.status).toBe(200);
      const recoveredSnapshots = recoverRes.body.attempt.questions;
      expect(recoveredSnapshots[0].selectedOption).toBe('B');
      expect(recoveredSnapshots[1].selectedOption).toBe('C');
      expect(recoveredSnapshots[1].isMarkedForReview).toBe(true);

      // Step G: Submission Preview
      const previewRes = await request(app)
        .get('/api/assessment/attempt/submission-preview')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.preview.answeredCount).toBe(2);
      expect(previewRes.body.preview.unansweredCount).toBe(8);
      expect(previewRes.body.preview.markedForReviewCount).toBe(1);

      // Step H: Submit Assessment
      const submitRes = await request(app)
        .post('/api/assessment/attempt/submit')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.result).toBeDefined();
      expect(submitRes.body.result.scoreSummary).toBeDefined();

      const summary = submitRes.body.result.scoreSummary;
      expect(summary.totalQuestions).toBe(10);
      expect(summary.scaledScoreOutOf10).toBeDefined();
      expect(summary.percentage).toBeDefined();
      expect(typeof summary.isPassed).toBe('boolean');

      // Step I: Fetch finalized result via /api/assessment/result
      const resultRes = await request(app)
        .get('/api/assessment/result')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(resultRes.status).toBe(200);
      expect(resultRes.body.result.scoreSummary.netScore).toBe(summary.netScore);

      // Step J: Verify that candidate cannot start another attempt after completing the exam
      const secondAttemptRes = await request(app)
        .post('/api/candidate/register')
        .send(registrationPayload);

      expect(secondAttemptRes.status).toBe(409);
      expect(secondAttemptRes.body.message).toMatch(/already completed the assessment/i);
    });
  });

  describe('2. Admin End-to-End Lifecycle Journey', () => {
    it('executes full administrator workflow: login, dashboard analytics, question swap, candidate audit, export, and settings update', async () => {
      // Step A: Admin Authentication
      const loginRes = await request(app)
        .post('/api/admin/auth/login')
        .send({
          email: 'admin@assessment.com',
          password: 'AdminPassword123!',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.token).toBeDefined();

      const adminToken = loginRes.body.token;

      // Step B: Admin Dashboard Metrics
      const summaryRes = await request(app)
        .get('/api/admin/dashboard/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.summary.totalCandidates).toBeDefined();
      expect(summaryRes.body.summary.completedAssessments).toBeDefined();
      expect(summaryRes.body.summary.averageScore).toBeDefined();
      expect(summaryRes.body.summary.passRate).toBeDefined();

      // Step C: Question Management — Create an inactive reserve question and perform atomic swap
      const reserveQRes = await request(app)
        .post('/api/admin/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          questionText: 'Reserve Q: What is the primary function of an operating system kernel?',
          options: [
            { optionId: 'A', text: 'Resource management and process isolation' },
            { optionId: 'B', text: 'Web browsing' },
            { optionId: 'C', text: 'Video compression' },
            { optionId: 'D', text: 'Database indexing' },
          ],
          correctOption: 'A',
          category: 'Logical Reasoning',
          difficulty: 'Medium',
          isActive: false,
        });

      expect(reserveQRes.status).toBe(201);
      const reserveQId = reserveQRes.body.question._id;

      // Find an active question to replace
      const activeQuestions = await Question.find({ isActive: true });
      expect(activeQuestions.length).toBe(10);
      const targetActive = activeQuestions[0];
      const targetSlot = targetActive.activeSlot;

      // Swap active question with reserve question
      const swapRes = await request(app)
        .patch(`/api/admin/questions/${targetActive._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: false,
          replacementQuestionId: reserveQId,
        });

      expect(swapRes.status).toBe(200);

      // Verify active invariant: exactly 10 active questions with slots 1..10
      const postSwapActive = await Question.find({ isActive: true });
      expect(postSwapActive.length).toBe(10);
      const activeSlots = postSwapActive.map((q) => q.activeSlot).sort((a, b) => a - b);
      expect(activeSlots).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      // Step D: Candidate Management — List with sorting by score
      const listRes = await request(app)
        .get('/api/admin/candidates?sortBy=score&sortOrder=desc&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.candidates).toBeDefined();
      expect(listRes.body.pagination.limit).toBe(10);

      // Step E: Export Candidates to CSV
      const csvRes = await request(app)
        .get('/api/admin/candidates/export/csv')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(csvRes.status).toBe(200);
      expect(csvRes.headers['content-type']).toMatch(/text\/csv/);
      expect(csvRes.text).toContain('"Candidate Name","Email","Phone","Age"');

      // Step F: Export Candidates to Excel (.xls SpreadsheetML)
      const excelRes = await request(app)
        .get('/api/admin/candidates/export/excel')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(excelRes.status).toBe(200);
      expect(excelRes.headers['content-type']).toMatch(/application\/vnd\.ms-excel/);
      expect(excelRes.text).toContain('<?xml version="1.0"');
      expect(excelRes.text).toContain('<Workbook');

      // Step G: Update Global Settings
      const settingsUpdateRes = await request(app)
        .patch('/api/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          testDurationMinutes: 20,
          passPercentage: 65,
        });

      expect(settingsUpdateRes.status).toBe(200);
      expect(settingsUpdateRes.body.settings.testDurationMinutes).toBe(20);
      expect(settingsUpdateRes.body.settings.passPercentage).toBe(65);

      // Step H: Admin Logout
      const logoutRes = await request(app)
        .post('/api/admin/auth/logout')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);
    });
  });

  describe('3. Security & Boundary Guard Audit', () => {
    it('enforces strict role-based isolation between candidate and admin endpoints', async () => {
      // 1. Unauthenticated request to admin dashboard returns 401
      const unauthRes = await request(app).get('/api/admin/dashboard/summary');
      expect(unauthRes.status).toBe(401);

      // 2. Candidate token accessing admin endpoint returns 403 Forbidden
      const candidateReg = await request(app)
        .post('/api/candidate/register')
        .send({
          fullName: 'Security Candidate',
          email: 'sec.cand@test.com',
          age: 26,
          phoneNumber: '9123456780',
          highestQualification: "Bachelor's Degree",
        });

      const candidateToken = candidateReg.body.token;

      const breachRes = await request(app)
        .get('/api/admin/dashboard/summary')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(breachRes.status).toBe(403);
      expect(breachRes.body.message).toMatch(/Access denied|Administrator privileges required/i);

      // 3. Admin token accessing candidate test mutation returns 403 Forbidden
      const adminLogin = await request(app)
        .post('/api/admin/auth/login')
        .send({
          email: 'admin@assessment.com',
          password: 'AdminPassword123!',
        });

      const adminToken = adminLogin.body.token;

      const adminAsCandRes = await request(app)
        .post('/api/assessment/start')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminAsCandRes.status).toBe(403);

      // 4. Invalid or tampered token returns 401
      const tamperedRes = await request(app)
        .get('/api/admin/dashboard/summary')
        .set('Authorization', 'Bearer invalid.tampered.token');

      expect(tamperedRes.status).toBe(401);
    });
  });
});
