import apiClient from './api.js';

export const candidateService = {
  /**
   * Register candidate or restore existing unfinished session.
   */
  register: (candidateData) => apiClient.post('/candidates/register', candidateData),

  /**
   * Get current authenticated candidate profile.
   */
  getProfile: () => apiClient.get('/candidates/me'),
};

export default candidateService;
