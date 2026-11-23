import apiClient from './api.js';

export const adminService = {
  // Auth
  login: (credentials) => apiClient.post('/admin/auth/login', credentials),
  getMe: () => apiClient.get('/admin/auth/me'),
  logout: () => apiClient.post('/admin/auth/logout'),

  // Dashboard Analytics
  getDashboardSummary: () => apiClient.get('/admin/dashboard/summary'),
  getDashboardAnalytics: (params) => apiClient.get('/admin/dashboard/analytics', { params }),

  // Question Management
  getQuestions: (params) => apiClient.get('/admin/questions', { params }),
  getQuestionById: (id) => apiClient.get(`/admin/questions/${id}`),
  createQuestion: (data) => apiClient.post('/admin/questions', data),
  updateQuestion: (id, data) => apiClient.patch(`/admin/questions/${id}`, data),
  updateQuestionStatus: (id, statusData) =>
    apiClient.patch(`/admin/questions/${id}/status`, statusData),
  deleteQuestion: (id) => apiClient.delete(`/admin/questions/${id}`),

  // Candidate Management
  getCandidates: (params) => apiClient.get('/admin/candidates', { params }),
  getCandidateById: (id) => apiClient.get(`/admin/candidates/${id}`),
  getCandidateAssessment: (id) => apiClient.get(`/admin/candidates/${id}/assessment`),

  // Exports
  exportCandidatesCsv: (params) =>
    apiClient.get('/admin/candidates/export/csv', {
      params,
      responseType: 'blob',
    }),
  exportCandidatesExcel: (params) =>
    apiClient.get('/admin/candidates/export/excel', {
      params,
      responseType: 'blob',
    }),

  // Settings
  getSettings: () => apiClient.get('/admin/settings'),
  updateSettings: (data) => apiClient.patch('/admin/settings', data),
};

export default adminService;
