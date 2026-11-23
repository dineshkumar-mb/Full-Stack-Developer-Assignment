import express from 'express';
import rateLimit from 'express-rate-limit';
import env from '../config/environment.js';
import { validate } from '../middleware/validateMiddleware.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

import adminAuthController from '../controllers/adminAuthController.js';
import adminDashboardController from '../controllers/adminDashboardController.js';
import adminQuestionController from '../controllers/adminQuestionController.js';
import adminCandidateController from '../controllers/adminCandidateController.js';
import adminSettingsController from '../controllers/adminSettingsController.js';

import {
  adminLoginSchema,
  createQuestionSchema,
  updateQuestionSchema,
  updateQuestionStatusSchema,
  candidateQuerySchema,
  analyticsQuerySchema,
  updateSettingsSchema,
} from '../validators/adminValidators.js';

const router = express.Router();

// Targeted login rate limiter (skipped in test environments)
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
    errors: ['Admin login rate limit exceeded'],
  },
  skip: () => env.isTest,
});

// ==========================================
// 1. ADMIN AUTHENTICATION
// ==========================================
router.post('/auth/login', adminLoginLimiter, validate(adminLoginSchema), adminAuthController.login);
router.get('/auth/me', authenticateToken, requireAdmin, adminAuthController.getMe);
router.post('/auth/logout', authenticateToken, requireAdmin, adminAuthController.logout);

// ==========================================
// 2. DASHBOARD ANALYTICS
// ==========================================
router.get('/dashboard/summary', authenticateToken, requireAdmin, adminDashboardController.getSummary);
router.get(
  '/dashboard/analytics',
  authenticateToken,
  requireAdmin,
  validate(analyticsQuerySchema, 'query'),
  adminDashboardController.getAnalytics
);

// ==========================================
// 3. QUESTION MANAGEMENT
// ==========================================
router.get('/questions', authenticateToken, requireAdmin, adminQuestionController.listQuestions);
router.get('/questions/:id', authenticateToken, requireAdmin, adminQuestionController.getQuestionById);
router.post(
  '/questions',
  authenticateToken,
  requireAdmin,
  validate(createQuestionSchema),
  adminQuestionController.createQuestion
);
router.patch(
  '/questions/:id',
  authenticateToken,
  requireAdmin,
  validate(updateQuestionSchema),
  adminQuestionController.updateQuestion
);
router.patch(
  '/questions/:id/status',
  authenticateToken,
  requireAdmin,
  validate(updateQuestionStatusSchema),
  adminQuestionController.updateQuestionStatus
);
router.delete('/questions/:id', authenticateToken, requireAdmin, adminQuestionController.deleteQuestion);

// ==========================================
// 4. CANDIDATE MANAGEMENT & EXPORT
// ==========================================
// Specific export routes MUST precede parameterized :id route
router.get('/candidates/export/csv', authenticateToken, requireAdmin, adminCandidateController.exportCandidatesCsv);
router.get('/candidates/export/excel', authenticateToken, requireAdmin, adminCandidateController.exportCandidatesExcel);

router.get(
  '/candidates',
  authenticateToken,
  requireAdmin,
  validate(candidateQuerySchema, 'query'),
  adminCandidateController.listCandidates
);
router.get('/candidates/:id', authenticateToken, requireAdmin, adminCandidateController.getCandidateById);
router.get(
  '/candidates/:id/assessment',
  authenticateToken,
  requireAdmin,
  adminCandidateController.getCandidateAssessment
);

// ==========================================
// 5. ASSESSMENT SETTINGS
// ==========================================
router.get('/settings', authenticateToken, requireAdmin, adminSettingsController.getSettings);
router.patch(
  '/settings',
  authenticateToken,
  requireAdmin,
  validate(updateSettingsSchema),
  adminSettingsController.updateSettings
);

export default router;
