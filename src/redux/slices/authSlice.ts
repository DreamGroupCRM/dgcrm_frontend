// ==========================================
// DREAM GROUP CRM - AUTH SLICE
// ==========================================
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, BaseRole, Permissions } from '../../types';
import { STORAGE_KEYS } from '../../constants';
import { loginThunk, logoutThunk, verifyOtpThunk, setNewPasswordThunk } from '../thunks/authThunks';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  role: BaseRole | null;
  permissions: Permissions | null;
  loading: boolean;
  error: string | null;

  // Multi-step login (email+password -> OTP -> session, or -> forced reset -> session)
  otpToken: string | null;
  otpMessage: string | null;
  mustChangePassword: boolean;
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

  otpToken: null,
  otpMessage: null,
  mustChangePassword: false,
  resetToken: null,
};

// Clears all auth-related data from localStorage in one place
const clearAuthStorage = () => {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.ROLE);
  localStorage.removeItem(STORAGE_KEYS.PERMISSIONS);
};

// Commits a real session (token/user/permissions) into state + localStorage.
// Shared by verifyOtpThunk.fulfilled and setNewPasswordThunk.fulfilled, since
// both can resolve straight to a usable session.
function commitSession(
  state: AuthState,
  session: { token: string; user: User; permissions: Permissions }
) {
  state.isAuthenticated = true;
  state.user = session.user;
  state.token = session.token;
  state.role = session.user.base_role;
  state.permissions = session.permissions;
  state.otpToken = null;
  state.otpMessage = null;
  state.mustChangePassword = false;
  state.resetToken = null;

  localStorage.setItem(STORAGE_KEYS.TOKEN, session.token);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(session.user));
  localStorage.setItem(STORAGE_KEYS.ROLE, session.user.base_role);
  localStorage.setItem(STORAGE_KEYS.PERMISSIONS, JSON.stringify(session.permissions));
}

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
    // Lets the login screen go back from the OTP step to re-enter credentials
    resetLoginFlow: (state) => {
      state.otpToken = null;
      state.otpMessage = null;
      state.mustChangePassword = false;
      state.resetToken = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ── Login step 1 (email+password -> OTP emailed) ──
    builder.addCase(loginThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loginThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.otpToken = action.payload.otpToken;
      state.otpMessage = action.payload.message || 'A one-time code has been sent to your email';
    });
    builder.addCase(loginThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // ── Login step 2 (OTP -> session, or -> forced password reset) ──
    builder.addCase(verifyOtpThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(verifyOtpThunk.fulfilled, (state, action) => {
      state.loading = false;
      const payload = action.payload;
      if ('token' in payload) {
        commitSession(state, payload);
      } else {
        state.mustChangePassword = true;
        state.resetToken = payload.resetToken;
        state.otpToken = null;
      }
    });
    builder.addCase(verifyOtpThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // ── Login step 3, first login only (new password -> session) ──
    builder.addCase(setNewPasswordThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(setNewPasswordThunk.fulfilled, (state, action) => {
      state.loading = false;
      commitSession(state, action.payload);
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
      clearAuthStorage();
    });
  },
});

export const { clearError, setUser, resetLoginFlow } = authSlice.actions;
export default authSlice.reducer;
