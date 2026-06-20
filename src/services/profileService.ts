// ==========================================
// DREAM GROUP CRM - PROFILE SERVICE
// ==========================================
// Talks to the real backend profile endpoint. No mock/dummy data.
import { ProfileResponse } from '../types';
import axiosInstance from './axiosConfig';

export const profileService = {
  /**
   * Calls GET /api/auth/profile (protected — JWT auth header is attached
   * automatically by the axios request interceptor in axiosConfig.ts).
   */
  getProfile: async (): Promise<ProfileResponse> => {
    const response = await axiosInstance.get('/auth/profile');
    return response.data as ProfileResponse;
  },
};
