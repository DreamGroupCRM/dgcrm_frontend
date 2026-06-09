// ==========================================
// DREAM GROUP CRM - AUTH SLICE
// ==========================================
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, UserRole } from '../../types';
import { STORAGE_KEYS } from '../../constants';
import { loginThunk, logoutThunk } from '../thunks/authThunks';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  role: UserRole | null;
  loading: boolean;
  error: string | null;
}

// Rehydrate from localStorage
const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
const storedRole = localStorage.getItem(STORAGE_KEYS.ROLE) as UserRole | null;

const initialState: AuthState = {
  isAuthenticated: !!storedToken,
  user: storedUser ? JSON.parse(storedUser) : null,
  token: storedToken,
  role: storedRole,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(loginThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loginThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.role = action.payload.user.role;
      // Persist to localStorage
      localStorage.setItem(STORAGE_KEYS.TOKEN, action.payload.token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(action.payload.user));
      localStorage.setItem(STORAGE_KEYS.ROLE, action.payload.user.role);
    });
    builder.addCase(loginThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    // Logout
    builder.addCase(logoutThunk.fulfilled, (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.role = null;
      state.loading = false;
      state.error = null;
      // Clear localStorage
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.ROLE);
    });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
