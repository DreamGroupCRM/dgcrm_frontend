// ==========================================
// DREAM GROUP CRM - AUTH SERVICE
// ==========================================
// Talks to the real backend auth endpoints. No mock/dummy data.
import { LoginCredentials, LoginResponse, LogoutResponse } from '../types';
import axiosInstance from './axiosConfig';

export const authService = {
  /**
   * Calls POST /api/auth/login with { email, password }.
   * Backend returns { success, token, user, permissions } at the top level.
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await axiosInstance.post('/auth/login', credentials);
    return response.data as LoginResponse;
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
