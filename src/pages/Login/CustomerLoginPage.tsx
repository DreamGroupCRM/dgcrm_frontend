// ==========================================
// DREAM GROUP CRM - CUSTOMER LOGIN / ACTIVATION PAGE
// ==========================================
// Dedicated login page for customers (separate from the staff LoginPage.tsx,
// which is untouched by this file). Reuses the exact same backend mechanism
// as staff login — same authThunks, same /auth/login -> /auth/verify-otp ->
// (first login only) /auth/set-new-password sequence — just a distinct,
// customer-branded entry point and a customer-specific redirect target.
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { loginThunk, verifyOtpThunk, setNewPasswordThunk } from '../../redux/thunks/authThunks';
import { clearError, resetLoginFlow } from '../../redux/slices/authSlice';
import { ROUTES } from '../../constants';
import { showAlert, homeRouteForRole } from '../../utils';
import { TextField, InputAdornment, IconButton, CircularProgress } from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, KeyboardBackspace } from '@mui/icons-material';
import Logo from '../../components/ui/Logo';

const validateEmail = (email: string): string => {
  if (!email.trim()) return 'Please enter your username (email).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
  return '';
};

const validatePassword = (pwd: string): string => {
  if (!pwd) return 'Password is required.';
  if (pwd.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(pwd)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(pwd)) return 'Password must contain at least one number.';
  return '';
};

const validateOtp = (otp: string): string => {
  if (!otp.trim()) return 'Please enter the code sent to your email.';
  if (!/^\d{6}$/.test(otp.trim())) return 'The code is 6 digits.';
  return '';
};

const glassFieldSx = {
  '& .MuiOutlinedInput-root': {
    color: 'white',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: '10px',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
    '&.Mui-focused fieldset': { borderColor: '#2563eb' },
    '&.Mui-error fieldset': { borderColor: '#ef4444' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#93c5fd' },
  '& .MuiFormHelperText-root': { color: '#fca5a5' },
};

const CustomerLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const {
    loading, error, isAuthenticated, role,
    otpToken, otpMessage, mustChangePassword, resetToken,
  } = useAppSelector((s) => s.auth);

  const step: 'credentials' | 'otp' | 'reset-password' =
    mustChangePassword ? 'reset-password' : otpToken ? 'otp' : 'credentials';

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [showPassword, setShowPassword] = useState(false);

  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpTouched, setOtpTouched] = useState(false);
  const [justRequestedOtp, setJustRequestedOtp] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [newPasswordTouched, setNewPasswordTouched] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // Already logged in — go straight to this account's home (customer
  // dashboard for a customer session; homeRouteForRole degrades sensibly
  // if a staff account ever ends up here).
  useEffect(() => {
    if (isAuthenticated && role) {
      navigate(homeRouteForRole(role), { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  useEffect(() => {
    if (error) {
      showAlert.error(error, 'Login Failed');
      dispatch(clearError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (step === 'otp' && justRequestedOtp) {
      showAlert.success(otpMessage || 'A one-time code has been sent to your email', 'Check your email');
      setJustRequestedOtp(false);
    }
  }, [step, justRequestedOtp, otpMessage]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (name === 'email' && touched.email) setErrors((p) => ({ ...p, email: validateEmail(value) }));
    if (name === 'password' && touched.password) setErrors((p) => ({ ...p, password: validatePassword(value) }));
  };

  const handleBlur = (field: 'email' | 'password') => {
    setTouched((p) => ({ ...p, [field]: true }));
    if (field === 'email') setErrors((p) => ({ ...p, email: validateEmail(form.email) }));
    if (field === 'password') setErrors((p) => ({ ...p, password: validatePassword(form.password) }));
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const emailErr = validateEmail(form.email);
      const pwdErr = form.password ? '' : 'Password is required.';
      setErrors({ email: emailErr, password: pwdErr });
      setTouched({ email: true, password: true });
      if (emailErr) { showAlert.warning(emailErr, 'Username Error'); return; }
      if (pwdErr) { showAlert.warning(pwdErr, 'Password Error'); return; }

      const result = await dispatch(loginThunk({ email: form.email, password: form.password }));
      if (loginThunk.fulfilled.match(result)) setJustRequestedOtp(true);
    },
    [form, dispatch]
  );

  const handleOtpSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const err = validateOtp(otp);
      setOtpError(err);
      setOtpTouched(true);
      if (err) { showAlert.warning(err, 'Code Error'); return; }
      if (!otpToken) return;

      const result = await dispatch(verifyOtpThunk({ otpToken, otp: otp.trim() }));
      if (verifyOtpThunk.fulfilled.match(result) && 'token' in result.payload) {
        navigate(homeRouteForRole(result.payload.user.base_role), { replace: true });
      }
    },
    [otp, otpToken, dispatch, navigate]
  );

  // First login only — sets a new password via the same setNewPasswordThunk
  // employees/admins use. No "current password" field: resetToken already
  // proves the initial password + OTP were both just verified successfully
  // (see auth.service.ts's verifyOtp), so re-collecting the initial
  // password here would be redundant — matches the existing staff
  // first-login screen exactly (LoginPage.tsx's own reset-password step).
  const handleResetPasswordSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const err = validatePassword(newPassword);
      const confirmErr = confirmPassword !== newPassword ? 'Passwords do not match.' : '';
      setNewPasswordError(err);
      setNewPasswordTouched(true);
      setConfirmPasswordError(confirmErr);
      if (err) { showAlert.warning(err, 'Password Error'); return; }
      if (confirmErr) { showAlert.warning(confirmErr, 'Password Error'); return; }
      if (!resetToken) return;

      const result = await dispatch(setNewPasswordThunk({ resetToken, new_password: newPassword }));
      if (setNewPasswordThunk.fulfilled.match(result)) {
        showAlert.success('Password changed successfully. Welcome!', 'You’re all set');
        navigate(homeRouteForRole(result.payload.user.base_role), { replace: true });
      }
    },
    [newPassword, confirmPassword, resetToken, dispatch, navigate]
  );

  const handleBackToLogin = () => {
    setOtp('');
    setOtpError('');
    setOtpTouched(false);
    dispatch(resetLoginFlow());
  };

  return (
    <div className="login-page-container">
      <div className="login-background">
        <div className="login-pattern"></div>
      </div>

      <div style={{ position: 'relative', zIndex: 5, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div
          className="login-card animate-fade-in"
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          }}
        >
          <div className="text-center mb-7">
            <div className="flex justify-center mb-3">
              <Logo size="lg" />
            </div>
            <h1 className="font-display text-3xl font-bold text-white mb-1">
              Customer Portal
            </h1>
            <p className="text-xs text-yellow-300/90 font-body tracking-wide px-4 leading-relaxed">
              Dream Group CRM
            </p>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-white/50 text-xs font-body">
              {step === 'credentials' && 'Sign In to Your Account'}
              {step === 'otp' && 'Enter Verification Code'}
              {step === 'reset-password' && 'Set a New Password'}
            </span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          {/* ── Step 1: Username + Password ── */}
          {step === 'credentials' && (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <TextField
                fullWidth required name="email" label="Username" type="email"
                value={form.email} onChange={handleChange}
                onBlur={() => handleBlur('email')}
                error={touched.email && !!errors.email}
                helperText={touched.email && errors.email}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 17.5 }} />
                    </InputAdornment>
                  ),
                }}
                sx={glassFieldSx}
              />

              <TextField
                fullWidth required name="password" label="Password"
                type={showPassword ? 'text' : 'password'}
                value={form.password} onChange={handleChange}
                onBlur={() => handleBlur('password')}
                error={touched.password && !!errors.password}
                helperText={touched.password && errors.password}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 17.5 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={glassFieldSx}
              />

              <p className="text-white/40 text-xs -mt-1">
                First time logging in? Use the username and initial password from your welcome email.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 rounded-xl font-semibold text-white transition-all
                  duration-300 flex items-center justify-center gap-2 disabled:opacity-70
                  disabled:cursor-not-allowed login-submit-btn">
                {loading ? (<><CircularProgress size={18} sx={{ color: 'white' }} /> Signing In...</>) : 'Sign In'}
              </button>
            </form>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} noValidate className="space-y-4">
              <p className="text-white/60 text-xs -mt-2 mb-1">
                We sent a 6-digit code to <span className="text-white/90">{form.email}</span>. It expires in 5 minutes.
              </p>

              <TextField
                fullWidth required name="otp" label="Verification Code"
                inputMode="numeric" autoComplete="one-time-code"
                value={otp}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                  setOtp(digits);
                  if (otpTouched) setOtpError(validateOtp(digits));
                }}
                onBlur={() => { setOtpTouched(true); setOtpError(validateOtp(otp)); }}
                error={otpTouched && !!otpError}
                helperText={otpTouched && otpError}
                size="small"
                sx={{ ...glassFieldSx, '& input': { letterSpacing: '4px', fontSize: 18 } }}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 rounded-xl font-semibold text-white transition-all
                  duration-300 flex items-center justify-center gap-2 disabled:opacity-70
                  disabled:cursor-not-allowed login-submit-btn">
                {loading ? (<><CircularProgress size={18} sx={{ color: 'white' }} /> Verifying...</>) : 'Verify & Sign In'}
              </button>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full flex items-center justify-center gap-1 text-white/50 hover:text-white/80 text-xs py-1"
              >
                <KeyboardBackspace fontSize="inherit" /> Back to login
              </button>
            </form>
          )}

          {/* ── Step 3: First login — set a new password ── */}
          {step === 'reset-password' && (
            <form onSubmit={handleResetPasswordSubmit} noValidate className="space-y-4">
              <p className="text-white/60 text-xs -mt-2 mb-1">
                This is your first login — please set a new password to continue.
              </p>

              <TextField
                fullWidth required name="new_password" label="New Password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (newPasswordTouched) setNewPasswordError(validatePassword(e.target.value));
                  if (confirmPasswordError) setConfirmPasswordError(confirmPassword !== e.target.value ? 'Passwords do not match.' : '');
                }}
                onBlur={() => { setNewPasswordTouched(true); setNewPasswordError(validatePassword(newPassword)); }}
                error={newPasswordTouched && !!newPasswordError}
                helperText={newPasswordTouched && newPasswordError}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 17.5 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowNewPassword(!showNewPassword)} edge="end" size="small" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        {showNewPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={glassFieldSx}
              />

              <TextField
                fullWidth required name="confirm_password" label="Confirm New Password"
                type={showNewPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmPasswordError) setConfirmPasswordError(e.target.value !== newPassword ? 'Passwords do not match.' : '');
                }}
                onBlur={() => setConfirmPasswordError(confirmPassword !== newPassword ? 'Passwords do not match.' : '')}
                error={!!confirmPasswordError}
                helperText={confirmPasswordError}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 17.5 }} />
                    </InputAdornment>
                  ),
                }}
                sx={glassFieldSx}
              />

              {newPassword && (
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {[
                    { check: newPassword.length >= 8, label: '8+ chars' },
                    { check: /[A-Z]/.test(newPassword), label: 'Uppercase' },
                    { check: /[a-z]/.test(newPassword), label: 'Lowercase' },
                    { check: /[0-9]/.test(newPassword), label: 'Number' },
                  ].map(({ check, label }) => (
                    <span key={label} className={`flex items-center gap-1 ${check ? 'text-green-400' : 'text-white/40'}`}>
                      <span>{check ? '✓' : '○'}</span> {label}
                    </span>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 rounded-xl font-semibold text-white transition-all
                  duration-300 flex items-center justify-center gap-2 disabled:opacity-70
                  disabled:cursor-not-allowed login-submit-btn">
                {loading ? (<><CircularProgress size={18} sx={{ color: 'white' }} /> Saving...</>) : 'Set Password & Continue'}
              </button>
            </form>
          )}

          <p className="text-center text-white/30 text-xs mt-5 font-body">
            © {new Date().getFullYear()} Dream Group. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomerLoginPage;
