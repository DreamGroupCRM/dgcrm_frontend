// ==========================================
// DREAM GROUP CRM - PROFILE SLICE
// ==========================================
import { createSlice } from '@reduxjs/toolkit';
import { UserProfile } from '../../types';
import { fetchProfileThunk } from '../thunks/profileThunks';

interface ProfileState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  profileModalOpen: boolean;
}

const initialState: ProfileState = {
  profile: null,
  loading: false,
  error: null,
  profileModalOpen: false,
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    openProfileModal: (state) => {
      state.profileModalOpen = true;
    },
    closeProfileModal: (state) => {
      state.profileModalOpen = false;
    },
    clearProfile: (state) => {
      state.profile = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchProfileThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchProfileThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.profile = action.payload;
    });
    builder.addCase(fetchProfileThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export const { openProfileModal, closeProfileModal, clearProfile } = profileSlice.actions;
export default profileSlice.reducer;
