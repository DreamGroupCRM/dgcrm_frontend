// ==========================================
// DREAM GROUP CRM - PROFILE SERVICE
// ==========================================
import { ProfileResponse } from '../types';
import { STORAGE_KEYS } from '../constants';
import profileResponseData from '../assets/json/myProfileResponse.json';

// PRODUCTION: import axiosInstance from './axiosConfig';

export const profileService = {
  /**
   * Get current user profile
   * PRODUCTION: Replace with → axiosInstance.get('/auth/profile')
   */
  getProfile: async (): Promise<ProfileResponse> => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    // PRODUCTION:
    // const response = await axiosInstance.get('/auth/profile');
    // return response.data;

    // Merge stored user data with mock profile
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
    if (storedUser) {
      const user = JSON.parse(storedUser);
      return {
        ...profileResponseData,
        data: {
          ...profileResponseData.data,
          fullName: user.fullName,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
        },
      } as ProfileResponse;
    }

    return profileResponseData as ProfileResponse;
  },
};
