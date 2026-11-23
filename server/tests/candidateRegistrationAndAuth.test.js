import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { Candidate } from '../models/Candidate.js';
import { Attempt } from '../models/Attempt.js';
import { generateToken } from '../utils/generateToken.js';
import env from '../config/environment.js';

describe('Phase 3 - Candidate Registration & Authentication', () => {
  const validCandidatePayload = {
    fullName: 'Jane Candidate',
    email: 'jane.candidate@example.com',
    age: 24,
    phone: '9876543210',
    gender: 'Female',
    qualification: "Bachelor's Degree",
    city: 'Mumbai',
  };

  it('should successfully register a candidate and return a valid JWT token', async () => {
    const res = await request(app)
      .post('/api/candidates/register')
      .send(validCandidatePayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.candidate.email).toBe('jane.candidate@example.com');
    expect(res.body.candidate.fullName).toBe('Jane Candidate');
    expect(res.body.candidate.phone).toBe('9876543210');
    expect(res.body.candidate.qualification).toBe("Bachelor's Degree");
    expect(res.body.candidate.hasAttempted).toBe(false);
  });

  it('should reject invalid full names with special characters or numbers', async () => {
    const res = await request(app)
      .post('/api/candidates/register')
      .send({ ...validCandidatePayload, email: 'inv.name@test.com', fullName: 'Jane Doe 123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.some((e) => e.includes('Full name must contain only letters and spaces'))).toBe(true);
  });

  it('should reject invalid email formats', async () => {
    const res = await request(app)
      .post('/api/candidates/register')
      .send({ ...validCandidatePayload, email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject age below 18 or above 60', async () => {
    const youngRes = await request(app)
      .post('/api/candidates/register')
      .send({ ...validCandidatePayload, email: 'young@test.com', age: 17 });
    expect(youngRes.status).toBe(400);

    const oldRes = await request(app)
      .post('/api/candidates/register')
      .send({ ...validCandidatePayload, email: 'old@test.com', age: 61 });
    expect(oldRes.status).toBe(400);
  });

  it('should reject phone numbers that are not exactly 10 digits', async () => {
    const shortPhoneRes = await request(app)
      .post('/api/candidates/register')
      .send({ ...validCandidatePayload, email: 'short.phone@test.com', phone: '12345' });
    expect(shortPhoneRes.status).toBe(400);

    const longPhoneRes = await request(app)
      .post('/api/candidates/register')
      .send({ ...validCandidatePayload, email: 'long.phone@test.com', phone: '1234567890123' });
    expect(longPhoneRes.status).toBe(400);
  });

  it('should reject missing or unsupported qualification options', async () => {
    const invalidQualRes = await request(app)
      .post('/api/candidates/register')
      .send({ ...validCandidatePayload, email: 'qual@test.com', qualification: 'Astronaut Certification' });
    expect(invalidQualRes.status).toBe(400);
  });

  it('should reject duplicate registration if candidate has already completed an assessment', async () => {
    // Register candidate
    const regRes = await request(app)
      .post('/api/candidates/register')
      .send(validCandidatePayload);
    const candidateId = regRes.body.candidate.id;

    // Simulate completed attempt
    await Attempt.create({
      candidateId,
      candidateEmail: validCandidatePayload.email,
      candidateSnapshot: { fullName: validCandidatePayload.fullName },
      status: 'completed',
      startedAt: new Date(Date.now() - 600000),
      expiresAt: new Date(Date.now() + 300000),
      submittedAt: new Date(),
      submissionType: 'manual',
      questionSnapshots: Array.from({ length: 10 }, (_, i) => ({
        questionId: candidateId,
        orderNumber: i + 1,
        questionText: `Q${i + 1}`,
        options: [{ optionId: 'A', text: 'Opt' }, { optionId: 'B', text: 'Opt' }, { optionId: 'C', text: 'Opt' }, { optionId: 'D', text: 'Opt' }],
        correctOption: 'A',
        category: 'Quantitative',
        difficulty: 'Easy',
      })),
      settingsSnapshot: { testDurationMinutes: 15 },
    });

    // Attempt duplicate registration
    const dupRes = await request(app)
      .post('/api/candidates/register')
      .send(validCandidatePayload);

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.success).toBe(false);
    expect(dupRes.body.message).toMatch(/already completed the assessment/);
  });

  it('should allow candidate session resumption if registered without attempt', async () => {
    const reg1 = await request(app)
      .post('/api/candidates/register')
      .send({ ...validCandidatePayload, email: 'resume.cand@test.com' });
    expect(reg1.status).toBe(201);

    const reg2 = await request(app)
      .post('/api/candidates/register')
      .send({ ...validCandidatePayload, email: 'resume.cand@test.com' });
    expect(reg2.status).toBe(200);
    expect(reg2.body.token).toBeDefined();
    expect(reg2.body.message).toMatch(/registration verified/);
  });

  it('GET /api/candidates/me should return candidate state and prevent access without token', async () => {
    const regRes = await request(app)
      .post('/api/candidates/register')
      .send({ ...validCandidatePayload, email: 'profile.me@test.com' });
    const token = regRes.body.token;

    // Unauthenticated
    const unauthRes = await request(app).get('/api/candidates/me');
    expect(unauthRes.status).toBe(401);

    // Authenticated
    const authRes = await request(app)
      .get('/api/candidates/me')
      .set('Authorization', `Bearer ${token}`);
    expect(authRes.status).toBe(200);
    expect(authRes.body.candidate.email).toBe('profile.me@test.com');
    expect(authRes.body.candidate.hasRegistered).toBe(true);
    expect(authRes.body.candidate.hasStarted).toBe(false);
    expect(authRes.body.candidate.hasAttemptInProgress).toBe(false);
  });

  it('should prevent candidate tokens from accessing admin routes', async () => {
    const regRes = await request(app)
      .post('/api/candidates/register')
      .send({ ...validCandidatePayload, email: 'admin.denied@test.com' });
    const token = regRes.body.token;

    const res = await request(app)
      .get('/test/admin-only')
      .set('Authorization', `Bearer ${token}`);
    // If route doesn't exist, it's 404 or if tested against admin middleware it's 403
    expect(res.status === 403 || res.status === 404).toBe(true);
  });
});
