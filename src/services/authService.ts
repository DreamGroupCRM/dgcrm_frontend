// ==========================================
// DREAM GROUP CRM - AUTH SERVICE
// ==========================================
import { LoginCredentials, LoginResponse, LogoutResponse } from '../types';
import axiosInstance from './axiosConfig';
import loginResponseData from '../assets/json/loginResponse.json';
import logoutResponseData from '../assets/json/logoutResponse.json';

export const authService = {
  /**
   * Login user
   * Calls the backend login endpoint and returns the API response.
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await axiosInstance.post('/auth/login', credentials);
    return response.data as LoginResponse;
  },

  /**
   * Logout user
   */
  logout: async (): Promise<LogoutResponse> => {
    const response = await axiosInstance.post('/auth/logout');
    return response.data as LogoutResponse;
  },
};