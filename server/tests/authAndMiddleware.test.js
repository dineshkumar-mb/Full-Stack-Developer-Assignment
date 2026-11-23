import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { hashPassword, comparePassword, generateToken } from '../utils/generateToken.js';
import { authenticateToken, requireAdmin, requireCandidate } from '../middleware/authMiddleware.js';
import { errorMiddleware } from '../middleware/errorMiddleware.js';
import { notFoundMiddleware } from '../middleware/notFoundMiddleware.js';
import ApiError from '../utils/ApiError.js';
import app from '../app.js';

describe('6. Password Hashing and Comparison Utilities', () => {
  // Test 9: Password hashing and comparison
  it('should hash a password securely and correctly compare valid and invalid passwords', async () => {
    const rawPassword = 'SecurePassword2026!';
    const hash = await hashPassword(rawPassword, 10);

    expect(hash).not.toBe(rawPassword);
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);

    const isMatch = await comparePassword(rawPassword, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await comparePassword('IncorrectPassword123', hash);
    expect(isWrongMatch).toBe(false);
  });
});

describe('7. JWT Token Generation and Verification', () => {
  // Test 10: JWT verification
  it('should generate a verifiable JWT with correct user payload', () => {
    const payload = { id: 'admin123', email: 'admin@test.com', role: 'admin' };
    const token = generateToken(payload, '1h');

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
  });

  // Test 11: Role authorization
  it('should permit access for authorized admin tokens and deny access for candidate tokens to admin routes', async () => {
    const testApp = express();
    testApp.use(express.json());

    testApp.get('/test/admin-only', authenticateToken, requireAdmin, (req, res) => {
      res.json({ success: true, message: 'Welcome Admin', user: req.user });
    });

    testApp.get('/test/candidate-only', authenticateToken, requireCandidate, (req, res) => {
      res.json({ success: true, message: 'Welcome Candidate', user: req.user });
    });

    testApp.use(errorMiddleware);

    const adminToken = generateToken({ id: 'adm_1', role: 'admin' });
    const candidateToken = generateToken({ id: 'cand_1', role: 'candidate' });

    // Admin accessing admin route -> 200
    const adminRes = await request(testApp)
      .get('/test/admin-only')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.success).toBe(true);

    // Candidate attempting to access admin route -> 403 Forbidden
    const forbiddenRes = await request(testApp)
      .get('/test/admin-only')
      .set('Authorization', `Bearer ${candidateToken}`);
    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.success).toBe(false);
    expect(forbiddenRes.body.message).toMatch(/Administrator privileges required/);

    // Admin attempting to access candidate-only route -> 403 Forbidden
    const adminOnCandRes = await request(testApp)
      .get('/test/candidate-only')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminOnCandRes.status).toBe(403);
    expect(adminOnCandRes.body.success).toBe(false);

    // Request without token -> 401 Unauthorized
    const unauthRes = await request(testApp).get('/test/admin-only');
    expect(unauthRes.status).toBe(401);
  });
});

describe('8. Error and 404 Middleware', () => {
  // Test 12: Error middleware
  it('should handle custom ApiError instances with consistent error structure', async () => {
    const testApp = express();
    testApp.get('/error-test', (req, res, next) => {
      next(ApiError.badRequest('Custom bad request message', ['field1 is invalid']));
    });
    testApp.use(errorMiddleware);

    const res = await request(testApp).get('/error-test');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Custom bad request message');
    expect(res.body.errors).toContain('field1 is invalid');
  });

  it('should handle 404 routes gracefully using notFoundMiddleware', async () => {
    const res = await request(app).get('/api/non-existent-endpoint-test-404');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Route not found/);
  });
});
