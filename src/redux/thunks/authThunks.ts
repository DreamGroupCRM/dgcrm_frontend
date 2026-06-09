// ==========================================
// DREAM GROUP CRM - AUTH THUNKS
// ==========================================
import { createAsyncThunk } from '@reduxjs/toolkit';
import { LoginCredentials } from '../../types';
import { authService } from '../../services/authService';

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      if (!response.success) {
        return rejectWithValue(response.message || 'Login failed');
      }
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      return rejectWithValue(message);
    }
  }
);

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
