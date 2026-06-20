// ==========================================
// DREAM GROUP CRM - AUTH THUNKS
// ==========================================
import { createAsyncThunk } from '@reduxjs/toolkit';
import { LoginCredentials } from '../../types';
import { authService } from '../../services/authService';

/**
 * Logs the user in.
 * Always logs the complete raw API response to the console for debugging,
 * then rejects if the backend reports success: false.
 */
export const loginThunk = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);

      // Full login API response — success, token, user, permissions
      console.log('Login API Response:', response);

      if (!response.success) {
        return rejectWithValue(response.message || 'Login failed');
      }
      return response;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      return rejectWithValue(message);
    }
  }
);

/**
 * Logs the user out by notifying the backend.
 * The slice clears local auth state/localStorage regardless of the result,
 * so a network failure here never traps the user in a logged-in UI.
 */
export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.logout();
      return response;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      return rejectWithValue(message);
    }
  }
);
