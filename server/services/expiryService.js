import { Attempt } from '../models/Attempt.js';
import { finalizeAttemptAtomically } from './assessmentService.js';

let scannerInterval = null;

/**
 * Scans for and finalizes any overdue assessments that have passed their 30-second submission grace period.
 * Safe for multi-instance deployments due to atomic conditional status updates.
 */
export async function processExpiredAssessments() {
  try {
    const graceCutoff = new Date(Date.now() - 30000); // 30s grace period passed

    const expiredAttempts = await Attempt.find({
      status: 'in_progress',
      expiresAt: { $lt: graceCutoff },
    }).select('_id');

    if (expiredAttempts.length > 0) {
      console.log(`[ExpiryService] Found ${expiredAttempts.length} overdue attempt(s) to finalize.`);
      for (const attempt of expiredAttempts) {
        try {
          await finalizeAttemptAtomically(attempt._id, 'auto_timeout');
        } catch (err) {
          console.error(`[ExpiryService Error] Failed to finalize attempt ${attempt._id}: ${err.message}`);
        }
      }
    }
  } catch (error) {
    console.error(`[ExpiryService Fatal] Scanner run failed: ${error.message}`);
  }
}

/**
 * Starts the periodic background scanner.
 */
export function startExpiryScanner(intervalMs = 15000) {
  if (scannerInterval) {
    clearInterval(scannerInterval);
  }

  // Run initial scan on startup
  processExpiredAssessments();

  scannerInterval = setInterval(processExpiredAssessments, intervalMs);
  // Allow Node process to exit without waiting for this interval
  if (scannerInterval.unref) {
    scannerInterval.unref();
  }
  console.log(`[ExpiryService] Expiry scanner started (interval: ${intervalMs}ms)`);
}

/**
 * Stops the periodic background scanner cleanly.
 */
export function stopExpiryScanner() {
  if (scannerInterval) {
    clearInterval(scannerInterval);
    scannerInterval = null;
    console.log('[ExpiryService] Expiry scanner stopped');
  }
}

export default {
  processExpiredAssessments,
  startExpiryScanner,
  stopExpiryScanner,
};
