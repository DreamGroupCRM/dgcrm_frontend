// ==========================================
// DREAM GROUP CRM - AUTH THUNKS
// ==========================================
import { createAsyncThunk } from '@reduxjs/toolkit';
import { isAxiosError } from 'axios';
import {
  LoginCredentials, VerifyOtpCredentials, SetNewPasswordCredentials,
} from '../../types';
import { authService } from '../../services/authService';

/** Prefers the backend's own message (e.g. "Account is locked...", "Invalid
 *  code") over axios's generic "Request failed with status code 401". */
const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

/**
 * Step 1 — verifies email+password. Does NOT log the user in: on success the
 * backend has emailed an OTP and returned only an otpToken to carry into
 * verifyOtpThunk.
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
      return rejectWithValue(extractErrorMessage(error, 'Login failed'));
    }
  }
);

/**
 * Step 2 — verifies the OTP emailed in step 1. Resolves to either a real
 * session or a first-login password-reset requirement; the slice branches
 * on which shape came back.
 */
export const verifyOtpThunk = createAsyncThunk(
  'auth/verifyOtp',
  async (payload: VerifyOtpCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.verifyOtp(payload);
      console.log('Verify OTP API Response:', response);
      if (!response.success) {
        return rejectWithValue(response.message || 'Invalid code');
      }
      return response;
    } catch (error: unknown) {
      return rejectWithValue(extractErrorMessage(error, 'Invalid code'));
    }
  }
);

/**
 * Step 3 (first login only) — consumes the resetToken from step 2, sets a
 * new password, and lands the user in a full session in one call.
 */
export const setNewPasswordThunk = createAsyncThunk(
  'auth/setNewPassword',
  async (payload: SetNewPasswordCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.setNewPassword(payload);
      console.log('Set New Password API Response:', response);
      if (!response.success) {
        return rejectWithValue(response.message || 'Could not set new password');
      }
      return response;
    } catch (error: unknown) {
      return rejectWithValue(extractErrorMessage(error, 'Could not set new password'));
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
      return rejectWithValue(extractErrorMessage(error, 'Logout failed'));
    }
  }
);
