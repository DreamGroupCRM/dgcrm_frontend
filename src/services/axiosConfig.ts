// ==========================================
// DREAM GROUP CRM - AXIOS CONFIGURATION
// ==========================================
import axios from 'axios';
import { STORAGE_KEYS } from '../constants';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Let the browser set the multipart boundary itself for file uploads
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Public auth-flow endpoints never carry a session token to begin with, so a
// 401 from them (wrong password, wrong/expired OTP) means "try again" — not
// "your session expired". Redirecting to /login on those would hard-reload
// the page mid-flow and wipe the error message before the user ever sees it.
const AUTH_FLOW_PATHS = ['/auth/login', '/auth/verify-otp', '/auth/set-new-password'];

// Response interceptor — handle 401
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthFlowRequest = AUTH_FLOW_PATHS.some((p) => error.config?.url?.includes(p));
    if (error.response?.status === 401 && !isAuthFlowRequest) {
      // Token expired/invalid — clear the session and send the user back to login
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.ROLE);
      localStorage.removeItem(STORAGE_KEYS.PERMISSIONS);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;