import express from 'express';
import {
  getInstructions,
  startAssessment,
  getCurrentAttempt,
  saveAnswer,
  getSubmissionPreview,
  submitAssessment,
  getResult,
} from '../controllers/assessmentController.js';
import { authenticateToken, requireCandidate } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { updateAnswerSchema } from '../validators/candidateValidators.js';

const router = express.Router();

// Instructions endpoint (accessible to candidate or public preview)
router.get('/instructions', getInstructions);

// All subsequent assessment routes strictly require candidate authentication
router.use(authenticateToken, requireCandidate);

// Assessment lifecycle endpoints
router.post('/start', startAssessment);
router.get('/attempt/current', getCurrentAttempt);
router.patch('/attempt/questions/:questionSnapshotId', validate(updateAnswerSchema), saveAnswer);
router.get('/attempt/submission-preview', getSubmissionPreview);
router.post('/attempt/submit', submitAssessment);
router.get('/result', getResult);

export default router;
