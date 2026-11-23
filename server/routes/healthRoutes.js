import express from 'express';
import { getDBStatus } from '../config/database.js';

const router = express.Router();

router.get('/health', (req, res) => {
  const dbStatus = getDBStatus();
  const isHealthy = dbStatus === 'connected';

  return res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    message: isHealthy
      ? 'Aptitude Assessment API is running'
      : 'Aptitude Assessment API is running (Database disconnected)',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

export default router;
