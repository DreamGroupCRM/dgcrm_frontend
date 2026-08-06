// ==========================================
// DREAM GROUP CRM - AUTH SLICE
// ==========================================
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, BaseRole, Permissions } from '../../types';
import { STORAGE_KEYS } from '../../constants';
import { loginThunk, verifyOtpThunk, setNewPasswordThunk, logoutThunk } from '../thunks/authThunks';

// Login is up to 3 steps: password -> emailed OTP -> (first login only) set a
// new password. 'credentials' is also the at-rest state once fully logged in.
type LoginStep = 'credentials' | 'otp' | 'newPassword';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  role: BaseRole | null;
  permissions: Permissions | null;
  loading: boolean;
  error: string | null;
  loginStep: LoginStep;
  otpToken: string | null;
  resetToken: string | null;
}

// Rehydrate auth state from localStorage so a page refresh keeps the user logged in
const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
const storedRole = localStorage.getItem(STORAGE_KEYS.ROLE) as BaseRole | null;
const storedPermissions = localStorage.getItem(STORAGE_KEYS.PERMISSIONS);

const initialState: AuthState = {
  isAuthenticated: !!storedToken,
  user: storedUser ? JSON.parse(storedUser) : null,
  token: storedToken,
  role: storedRole,
  permissions: storedPermissions ? JSON.parse(storedPermissions) : null,
  loading: false,
  error: null,
  loginStep: 'credentials',
  otpToken: null,
  resetToken: null,
};

// Clears all auth-related data from localStorage in one place
const clearAuthStorage = () => {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.ROLE);
  localStorage.removeItem(STORAGE_KEYS.PERMISSIONS);
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
    // "Back to login" — abandons the OTP/new-password step and starts over.
    resetLoginFlow: (state) => {
      state.loginStep = 'credentials';
      state.otpToken = null;
      state.resetToken = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ── Step 1: password -> OTP emailed ──
    builder.addCase(loginThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loginThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.otpToken = action.payload.otpToken;
      state.loginStep = 'otp';
    });
    builder.addCase(loginThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // ── Step 2: OTP -> session, or a first-login reset requirement ──
    builder.addCase(verifyOtpThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(verifyOtpThunk.fulfilled, (state, action) => {
      state.loading = false;
      const response = action.payload;
      if ('mustChangePassword' in response) {
        state.resetToken = response.resetToken;
        state.otpToken = null;
        state.loginStep = 'newPassword';
        return;
      }
      const { token, user, permissions } = response;
      state.isAuthenticated = true;
      state.user = user;
      state.token = token;
      state.role = user.base_role;
      state.permissions = permissions;
      state.loginStep = 'credentials';
      state.otpToken = null;
      state.resetToken = null;

      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.ROLE, user.base_role);
      localStorage.setItem(STORAGE_KEYS.PERMISSIONS, JSON.stringify(permissions));
    });
    builder.addCase(verifyOtpThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // ── Step 3 (first login only): set new password -> session ──
    builder.addCase(setNewPasswordThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(setNewPasswordThunk.fulfilled, (state, action) => {
      const { token, user, permissions } = action.payload;
      state.loading = false;
      state.isAuthenticated = true;
      state.user = user;
      state.token = token;
      state.role = user.base_role;
      state.permissions = permissions;
      state.loginStep = 'credentials';
      state.otpToken = null;
      state.resetToken = null;

      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.ROLE, user.base_role);
      localStorage.setItem(STORAGE_KEYS.PERMISSIONS, JSON.stringify(permissions));
    });
    builder.addCase(setNewPasswordThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // ── Logout ──
    // Auth state and storage are cleared on both success and failure of the
    // logout API call, so a network error never leaves the user stuck logged in.
    builder.addCase(logoutThunk.fulfilled, (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.role = null;
      state.permissions = null;
      state.loading = false;
      state.error = null;
      state.loginStep = 'credentials';
      state.otpToken = null;
      state.resetToken = null;
      clearAuthStorage();
    });
    builder.addCase(logoutThunk.rejected, (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.role = null;
      state.permissions = null;
      state.loading = false;
      state.error = null;
      state.loginStep = 'credentials';
      state.otpToken = null;
      state.resetToken = null;
      clearAuthStorage();
    });
  },
});

export const { clearError, setUser, resetLoginFlow } = authSlice.actions;
export default authSlice.reducer;
