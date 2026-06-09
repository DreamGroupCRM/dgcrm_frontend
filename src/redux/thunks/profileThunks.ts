// ==========================================
// DREAM GROUP CRM - PROFILE THUNKS
// ==========================================
import { createAsyncThunk } from '@reduxjs/toolkit';
import { profileService } from '../../services/profileService';

export const fetchProfileThunk = createAsyncThunk(
  'profile/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await profileService.getProfile();
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to fetch profile');
      }
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      return rejectWithValue(message);
    }
  }
);
