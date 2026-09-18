// ==========================================
// DREAM GROUP CRM - AXIOS CONFIGURATION
// ==========================================
import axios from 'axios';
import { STORAGE_KEYS } from '../constants';

// Uploads carry files (up to 10 MB), so they get their own, much longer
// budget than ordinary JSON calls — see the request interceptor below.
const UPLOAD_TIMEOUT_MS = 120000;

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
    // Let the browser set the multipart boundary itself for file uploads,
    // and give them room to finish: the 10s default above is fine for JSON
    // but aborts a multi-megabyte document on a slow connection long
    // before the server has it, which surfaces to the user as a mysterious
    // failed save rather than "still uploading".
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      config.timeout = UPLOAD_TIMEOUT_MS;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Public auth endpoints legitimately return 401 for wrong credentials / a
// wrong or expired OTP — that is NOT an expired session, and must not force
// a hard reload back to /login (which would wipe the error toast + form
// state before the user ever sees why it failed).
const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/verify-otp', '/auth/set-new-password', '/auth/register'];

// Why a session ended, as reported by the server (see the backend's
// shared/session.ts). Being signed out because someone logged in
// elsewhere is a different event from a session simply timing out, and the
// login page has to say so — the reason is stashed here because the
// redirect below is a full page load, which discards in-memory state.
export const LOGOUT_REASON_KEY = 'dgcrm.logout_reason';

const LOGOUT_MESSAGES: Record<string, string> = {
  SESSION_SUPERSEDED: 'You have been logged out because your account was logged in from another system.',
  SESSION_IDLE: 'Your session expired due to inactivity. Please log in again.',
  ACCOUNT_DISABLED: 'Your account is no longer active. Please contact your administrator.',
};

export const clearStoredSession = (): void => {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.ROLE);
  localStorage.removeItem(STORAGE_KEYS.PERMISSIONS);
};

/** Records why the session ended, for the login page to show once. */
export const setLogoutReason = (code: string | undefined): void => {
  const message = (code && LOGOUT_MESSAGES[code]) || LOGOUT_MESSAGES.SESSION_IDLE;
  try { localStorage.setItem(LOGOUT_REASON_KEY, message); } catch { /* private mode */ }
};

/** Reads and clears the reason, so it is shown exactly once. */
export const takeLogoutReason = (): string | null => {
  try {
    const message = localStorage.getItem(LOGOUT_REASON_KEY);
    if (message) localStorage.removeItem(LOGOUT_REASON_KEY);
    return message;
  } catch { return null; }
};

// Response interceptor — handle 401
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url || '';
    const isPublicAuthCall = PUBLIC_AUTH_PATHS.some((path) => url.includes(path));
    if (error.response?.status === 401 && !isPublicAuthCall) {
      // Token expired/invalid, or the server has retired this session —
      // clear it and send the user back to login, carrying the reason so
      // the login page can explain what happened instead of silently
      // dumping them on a fresh form.
      setLogoutReason(error.response?.data?.code);
      clearStoredSession();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;