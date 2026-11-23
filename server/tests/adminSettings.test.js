import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { Settings } from '../models/Settings.js';
import { Attempt } from '../models/Attempt.js';
import { Candidate } from '../models/Candidate.js';
import { seedAdmin } from '../seeders/seedAdmin.js';
import { seedSettings } from '../seeders/seedSettings.js';
import { seedQuestions } from '../seeders/seedQuestions.js';
import { generateToken } from '../utils/generateToken.js';

describe('Phase 4 - Assessment Settings Management', () => {
  let adminToken;
  let candidateToken;

  beforeEach(async () => {
    await seedAdmin();
    await seedSettings();
    await seedQuestions();

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

  it('should retrieve current global settings (GET /api/admin/settings)', async () => {
    const res = await request(app)
      .get('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.testDurationMinutes).toBe(15);
    expect(res.body.settings.passPercentage).toBe(60);
    expect(res.body.settings.totalTestQuestions).toBe(10);
  });

  it('should update duration and pass percentage successfully (PATCH /api/admin/settings)', async () => {
    const res = await request(app)
      .patch('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        testDurationMinutes: 20,
        passPercentage: 70,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.testDurationMinutes).toBe(20);
    expect(res.body.settings.passPercentage).toBe(70);

    const doc = await Settings.getSettings();
    expect(doc.testDurationMinutes).toBe(20);
    expect(doc.passPercentage).toBe(70);
  });

  it('should reject invalid duration less than 5 or greater than 180', async () => {
    const lowRes = await request(app)
      .patch('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ testDurationMinutes: 3 });

    expect(lowRes.status).toBe(400);

    const highRes = await request(app)
      .patch('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ testDurationMinutes: 200 });

    expect(highRes.status).toBe(400);
  });

  it('should reject invalid pass percentage less than 0 or greater than 100', async () => {
    const invalidRes = await request(app)
      .patch('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ passPercentage: 110 });

    expect(invalidRes.status).toBe(400);
  });

  it('should reject modifying totalTestQuestions away from 10', async () => {
    const res = await request(app)
      .patch('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ totalTestQuestions: 15 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/validation failed/i);
  });

  it('should reject unknown fields in settings update', async () => {
    const res = await request(app)
      .patch('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ unknownField: 'malicious' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/validation failed/i);
  });

  it('should reject candidate token trying to update settings with 403 Forbidden', async () => {
    const res = await request(app)
      .patch('/api/admin/settings')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({ testDurationMinutes: 30 });

    expect(res.status).toBe(403);
  });

  it('should ensure existing attempt settings snapshots are unaffected when global settings are updated', async () => {
    // 1. Candidate registers and starts assessment under 15m duration
    const regRes = await request(app).post('/api/candidates/register').send({
      fullName: 'Settings Candidate',
      email: 'settings.test@test.com',
      age: 22,
      phoneNumber: '9000000000',
      highestQualification: "Bachelor's Degree",
    });

    const startRes = await request(app)
      .post('/api/assessment/start')
      .set('Authorization', `Bearer ${regRes.body.token}`);

    const attemptId = startRes.body.attempt.attemptId;
    const initialAttempt = await Attempt.findById(attemptId);
    expect(initialAttempt.settingsSnapshot.testDurationMinutes).toBe(15);

    // 2. Admin updates global settings to 30 minutes
    await request(app)
      .patch('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ testDurationMinutes: 30, passPercentage: 75 });

    // 3. Verify original attempt retains original 15m duration
    const reloadedAttempt = await Attempt.findById(attemptId);
    expect(reloadedAttempt.settingsSnapshot.testDurationMinutes).toBe(15);
    expect(reloadedAttempt.settingsSnapshot.testDurationMinutes).not.toBe(30);
  });
});
