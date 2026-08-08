// ==========================================
// DREAM GROUP CRM - AUTH SERVICE
// ==========================================
// Talks to the real backend auth endpoints. No mock/dummy data.
import {
  LoginCredentials,
  LoginOtpResponse,
  LogoutResponse,
  SessionResponse,
  SetNewPasswordCredentials,
  VerifyOtpCredentials,
  VerifyOtpResponse,
} from '../types';
import axiosInstance from './axiosConfig';

export const authService = {
  /**
   * Step 1 of 2 — POST /api/auth/login with { email, password }.
   * Verifies credentials and emails an OTP; does NOT return a session.
   * Backend returns { success, otpRequired: true, otpToken, message }.
   */
  login: async (credentials: LoginCredentials): Promise<LoginOtpResponse> => {
    const response = await axiosInstance.post('/auth/login', credentials);
    return response.data as LoginOtpResponse;
  },

  /**
   * Step 2 of 2 — POST /api/auth/verify-otp with { otpToken, otp }.
   * Backend returns either a real session ({ token, user, permissions }),
   * or, for a first-time login, { mustChangePassword: true, resetToken }.
   */
  verifyOtp: async (credentials: VerifyOtpCredentials): Promise<VerifyOtpResponse> => {
    const response = await axiosInstance.post('/auth/verify-otp', credentials);
    return response.data as VerifyOtpResponse;
  },

  /**
   * Step 3 (first login only) — POST /api/auth/set-new-password with
   * { resetToken, new_password }. Consumes the resetToken from verify-otp
   * and returns a real session, so the user isn't asked to log in again.
   */
  setNewPassword: async (credentials: SetNewPasswordCredentials): Promise<SessionResponse> => {
    const response = await axiosInstance.post('/auth/set-new-password', credentials);
    return response.data as SessionResponse;
  },

  /**
   * Calls POST /api/auth/logout (protected — requires the JWT auth header,
   * which axiosConfig attaches automatically).
   */
  logout: async (): Promise<LogoutResponse> => {
    const response = await axiosInstance.post('/auth/logout');
    return response.data as LogoutResponse;
  },
};
