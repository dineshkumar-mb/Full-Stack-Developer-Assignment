import express from 'express';
import { registerCandidate, getCandidateProfile } from '../controllers/candidateController.js';
import { validate } from '../middleware/validateMiddleware.js';
import { registerCandidateSchema } from '../validators/candidateValidators.js';
import { authenticateToken, requireCandidate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Candidate registration (public)
router.post('/register', validate(registerCandidateSchema), registerCandidate);

// Candidate profile / session state (protected)
router.get('/me', authenticateToken, requireCandidate, getCandidateProfile);

export default router;
