import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { Admin } from '../models/Admin.js';
import { seedAdmin } from '../seeders/seedAdmin.js';
import { generateToken } from '../utils/generateToken.js';

describe('Phase 4 - Admin Authentication & Authorization', () => {
  beforeEach(async () => {
    await seedAdmin();
  });

  it('should authenticate successfully with valid seeded admin credentials', async () => {
    const res = await request(app).post('/api/admin/auth/login').send({
      email: 'admin@assessment.com',
      password: 'AdminPassword123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.admin).toBeDefined();
    expect(res.body.admin.email).toBe('admin@assessment.com');
    expect(['admin', 'superadmin']).toContain(res.body.admin.role);
    expect(res.body.admin.passwordHash).toBeUndefined();
    expect(res.body.admin.lastLogin).toBeDefined();
  });

  it('should normalize email to lowercase during login', async () => {
    const res = await request(app).post('/api/admin/auth/login').send({
      email: '  ADMIN@ASSESSMENT.COM  ',
      password: 'AdminPassword123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.admin.email).toBe('admin@assessment.com');
  });

  it('should reject invalid password with generic error message', async () => {
    const res = await request(app).post('/api/admin/auth/login').send({
      email: 'admin@assessment.com',
      password: 'WrongPassword!',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid email or password/i);
    expect(res.body.token).toBeUndefined();
  });

  it('should reject non-existent admin email with generic error message', async () => {
    const res = await request(app).post('/api/admin/auth/login').send({
      email: 'nonexistent@assessment.com',
      password: 'AdminPassword123!',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid email or password/i);
  });

  it('should reject inactive admin account', async () => {
    await Admin.findOneAndUpdate({ email: 'admin@assessment.com' }, { isActive: false });

    const res = await request(app).post('/api/admin/auth/login').send({
      email: 'admin@assessment.com',
      password: 'AdminPassword123!',
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/deactivated/i);
  });

  it('should retrieve admin profile for authenticated admin (GET /api/admin/auth/me)', async () => {
    const loginRes = await request(app).post('/api/admin/auth/login').send({
      email: 'admin@assessment.com',
      password: 'AdminPassword123!',
    });
    const token = loginRes.body.token;

    const meRes = await request(app)
      .get('/api/admin/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.admin.email).toBe('admin@assessment.com');
    expect(meRes.body.admin.passwordHash).toBeUndefined();
  });

  it('should return logout instructions (POST /api/admin/auth/logout)', async () => {
    const loginRes = await request(app).post('/api/admin/auth/login').send({
      email: 'admin@assessment.com',
      password: 'AdminPassword123!',
    });
    const token = loginRes.body.token;

    const logoutRes = await request(app)
      .post('/api/admin/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);
    expect(logoutRes.body.message).toMatch(/discard the authentication token/i);
  });

  it('should reject candidate token trying to access admin endpoint with 403 Forbidden', async () => {
    const candidateToken = generateToken({
      id: '507f1f77bcf86cd799439011',
      email: 'candidate@test.com',
      role: 'candidate',
    });

    const res = await request(app)
      .get('/api/admin/auth/me')
      .set('Authorization', `Bearer ${candidateToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Administrator privileges required/i);
  });

  it('should reject missing authorization header with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/admin/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Authentication token missing/i);
  });

  it('should reject expired JWT token with 401 Unauthorized', async () => {
    const expiredToken = generateToken(
      {
        id: '507f1f77bcf86cd799439011',
        email: 'admin@assessment.com',
        role: 'admin',
      },
      '-1s'
    );

    const res = await request(app)
      .get('/api/admin/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Session expired/i);
  });
});
