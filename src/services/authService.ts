// ==========================================
// DREAM GROUP CRM - AUTH SERVICE
// ==========================================
// Talks to the real backend auth endpoints. No mock/dummy data.
// Login is 2FA and 3 steps at most:
//   1. login          — email+password -> emails an OTP, returns otpToken
//   2. verifyOtp      — otpToken+otp -> a real session, OR a resetToken if
//                        this is the user's first-ever login
//   3. setNewPassword — (first login only) resetToken+new password -> session
import {
  LoginCredentials, LoginResponse, LogoutResponse,
  VerifyOtpCredentials, VerifyOtpResponse,
  SetNewPasswordCredentials, SessionResponse,
} from '../types';
import axiosInstance from './axiosConfig';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await axiosInstance.post('/auth/login', credentials);
    return response.data as LoginResponse;
  },

  verifyOtp: async (payload: VerifyOtpCredentials): Promise<VerifyOtpResponse> => {
    const response = await axiosInstance.post('/auth/verify-otp', payload);
    return response.data as VerifyOtpResponse;
  },

  setNewPassword: async (payload: SetNewPasswordCredentials): Promise<SessionResponse> => {
    const response = await axiosInstance.post('/auth/set-new-password', payload);
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
