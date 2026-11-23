import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { seedAdmin } from '../seeders/seedAdmin.js';
import { seedSettings } from '../seeders/seedSettings.js';
import { seedQuestions } from '../seeders/seedQuestions.js';
import { seedAll } from '../seeders/seedAll.js';
import { Admin } from '../models/Admin.js';
import { Settings } from '../models/Settings.js';
import { Question } from '../models/Question.js';

describe('9. Health Endpoint', () => {
  // Test 13: Health endpoint
  it('GET /api/health should return connected database status when DB is connected', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Aptitude Assessment API is running');
    expect(res.body.database).toBe('connected');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('10. Seeder Idempotency and Integrity', () => {
  // Test 14: Seed script idempotency
  it('should seed admin, settings, and 10 questions without duplicating on multiple runs', async () => {
    // Run seeders first time
    await seedAll();

    // Verify Admin seeded
    const adminCount1 = await Admin.countDocuments();
    expect(adminCount1).toBe(1);

    // Verify Settings seeded
    const settingsCount1 = await Settings.countDocuments();
    expect(settingsCount1).toBe(1);

    // Verify Questions seeded
    const questionCount1 = await Question.countDocuments({ isActive: true });
    expect(questionCount1).toBe(10);

    // Run seedAll a second time to verify idempotency
    await seedAll();

    const adminCount2 = await Admin.countDocuments();
    expect(adminCount2).toBe(1);

    const settingsCount2 = await Settings.countDocuments();
    expect(settingsCount2).toBe(1);

    const questionCount2 = await Question.countDocuments({ isActive: true });
    expect(questionCount2).toBe(10);
  });

  it('should verify exact question distribution is 4 Quantitative, 3 Logical Reasoning, 3 Verbal', async () => {
    await seedQuestions();

    const quant = await Question.countDocuments({ category: 'Quantitative', isActive: true });
    const logic = await Question.countDocuments({ category: 'Logical Reasoning', isActive: true });
    const verbal = await Question.countDocuments({ category: 'Verbal', isActive: true });

    expect(quant).toBe(4);
    expect(logic).toBe(3);
    expect(verbal).toBe(3);
  });
});
