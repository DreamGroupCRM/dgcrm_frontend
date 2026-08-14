// ==========================================
// DREAM GROUP CRM - AUTH THUNKS
// ==========================================
import { createAsyncThunk } from '@reduxjs/toolkit';
import { LoginCredentials, SetNewPasswordCredentials, VerifyOtpCredentials } from '../../types';
import { authService } from '../../services/authService';

/**
 * Step 1 of login — verifies email+password. Backend emails an OTP and
 * returns an otpToken; no session is issued yet (see verifyOtpThunk).
 */
export const loginThunk = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);

      console.log('Login API Response (step 1 — OTP requested):', response);

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
 * Step 2 of login — verifies the OTP emailed in step 1. Resolves to either a
 * real session, or (first login only) a resetToken forcing a password reset.
 */
export const verifyOtpThunk = createAsyncThunk(
  'auth/verifyOtp',
  async (credentials: VerifyOtpCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.verifyOtp(credentials);

      console.log('Verify OTP API Response:', response);

      if (!response.success) {
        return rejectWithValue(response.message || 'Invalid code');
      }
      return response;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      return rejectWithValue(message);
    }
  }
);

/**
 * Step 3 (first login only) — sets a new password using the resetToken from
 * verify-otp, and immediately logs the user in with the returned session.
 */
export const setNewPasswordThunk = createAsyncThunk(
  'auth/setNewPassword',
  async (credentials: SetNewPasswordCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.setNewPassword(credentials);

      if (!response.success) {
        return rejectWithValue(response.message || 'Could not set new password');
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
