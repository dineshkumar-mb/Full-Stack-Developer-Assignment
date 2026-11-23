import apiClient from './api.js';

export const assessmentService = {
  /**
   * Fetch assessment instructions, rules, durations, and weights.
   */
  getInstructions: () => apiClient.get('/assessment/instructions'),

  /**
   * Start new assessment attempt or recover in-progress attempt.
   */
  startAssessment: () => apiClient.post('/assessment/start'),

  /**
   * Fetch current in-progress assessment attempt with safe question snapshots.
   */
  getCurrentAttempt: () => apiClient.get('/assessment/attempt/current'),

  /**
   * Save candidate answer or marked-for-review status.
   */
  saveAnswer: (snapshotId, updates) =>
    apiClient.patch(`/assessment/attempt/questions/${snapshotId}`, updates),

  /**
   * Fetch submission preview showing counts of answered, unanswered, marked questions.
   */
  getSubmissionPreview: () => apiClient.get('/assessment/attempt/submission-preview'),

  /**
   * Submit assessment manually.
   */
  submitAssessment: () => apiClient.post('/assessment/attempt/submit'),

  /**
   * Fetch finalized assessment result.
   */
  getResult: () => apiClient.get('/assessment/result'),
};

export default assessmentService;
