import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach bearer token based on active route
apiClient.interceptors.request.use(
  (config) => {
    // Discriminate token by path
    const isAdminRoute = config.url && config.url.includes('/admin') && !config.url.includes('/admin/auth/login');
    const token = isAdminRoute
      ? localStorage.getItem('adminToken')
      : localStorage.getItem('candidateToken') || localStorage.getItem('adminToken');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Format error objects uniformly
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorResponse = error.response?.data;
    const message =
      errorResponse?.message ||
      errorResponse?.error ||
      (error.message === 'Network Error'
        ? 'Cannot connect to backend server. Please check your network or server status.'
        : error.message);

    const formattedError = new Error(message);
    formattedError.status = error.response?.status;
    formattedError.errors = errorResponse?.errors || [];
    formattedError.raw = errorResponse;

    return Promise.reject(formattedError);
  }
);

export default apiClient;
