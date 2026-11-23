import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Strict session isolation between Candidate and Admin tokens
apiClient.interceptors.request.use(
  (config) => {
    const url = config.url || '';
    const isAdminRoute = url.includes('/admin') && !url.includes('/admin/auth/login');

    // Candidate endpoints ONLY use candidateToken; Admin endpoints ONLY use adminToken
    const token = isAdminRoute
      ? localStorage.getItem('adminToken')
      : localStorage.getItem('candidateToken');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Uniform error formatting & expired session cleanup
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorResponse = error.response?.data;
    const status = error.response?.status;
    const url = error.config?.url || '';

    // Handle session expiry (401 Unauthorized)
    if (status === 401) {
      if (url.includes('/admin')) {
        localStorage.removeItem('adminToken');
      } else {
        localStorage.removeItem('candidateToken');
      }
    }

    const message =
      errorResponse?.message ||
      errorResponse?.error ||
      (error.message === 'Network Error'
        ? 'Cannot connect to backend server. Please check your network or server status.'
        : error.message || 'An unexpected error occurred.');

    const formattedError = new Error(message);
    formattedError.status = status;
    formattedError.response = error.response;
    formattedError.errors = errorResponse?.errors || [];
    formattedError.code = errorResponse?.code;
    formattedError.raw = errorResponse;

    return Promise.reject(formattedError);
  }
);

export default apiClient;
