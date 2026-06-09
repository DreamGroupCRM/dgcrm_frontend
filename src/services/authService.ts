// ==========================================
// DREAM GROUP CRM - AUTH SERVICE
// ==========================================
import { LoginCredentials, LoginResponse, LogoutResponse } from '../types';
import { HARDCODED_USERS } from '../constants';
import loginResponseData from '../assets/json/loginResponse.json';
import logoutResponseData from '../assets/json/logoutResponse.json';

// PRODUCTION: import axiosInstance from './axiosConfig';

export const authService = {
  /**
   * Login user
   * Validates credentials against hardcoded users, returns mock JSON response.
   * PRODUCTION: Replace with → axiosInstance.post('/auth/login', credentials)
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // PRODUCTION (comment out mock below and use this):
    // const response = await axiosInstance.post('/auth/login', credentials);
    // return response.data;

    // Find user by credentials
    const matchedUser = HARDCODED_USERS.find(
      (u) => u.email === credentials.email && u.password === credentials.password
    );

    if (!matchedUser) {
      return {
        success: false,
        message: 'Invalid email or password. Please try again.',
        data: { token: '', user: null as never },
      };
    }

    // Return mock response with matched user's data
    return {
      ...loginResponseData,
      data: {
        ...loginResponseData.data,
        user: {
          ...loginResponseData.data.user,
          email: matchedUser.email,
          role: matchedUser.role,
          fullName: matchedUser.fullName,
          mobile: matchedUser.mobile,
          id: matchedUser.id,
        },
      },
    } as LoginResponse;
  },

  /**
   * Logout user
   * PRODUCTION: Replace with → axiosInstance.post('/auth/logout')
   */
  logout: async (): Promise<LogoutResponse> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    // PRODUCTION: const response = await axiosInstance.post('/auth/logout');
    return logoutResponseData as LogoutResponse;
  },
};
