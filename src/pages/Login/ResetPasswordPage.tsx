// ==========================================
// DREAM GROUP CRM - RESET PASSWORD PAGE
// ==========================================
// Consumes the token from the link emailed by the Forgot Password flow
// (see LoginPage.tsx's forgot-password step). Public/unauthenticated —
// reachable even if the browser already has an active session for a
// different account, since the emailed link must always work standalone.
import React, { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TextField, InputAdornment, IconButton, CircularProgress } from '@mui/material';
import { Visibility, VisibilityOff, Lock } from '@mui/icons-material';
import { ROUTES } from '../../constants';
import { showAlert } from '../../utils';
import { authService } from '../../services/authService';
import Logo from '../../components/ui/Logo';

/** Returns the FIRST failing rule for the new password, or '' if valid —
 * matches auth.service.ts's ResetPasswordSchema (min 8 chars) and mirrors
 * LoginPage.tsx's own validatePassword for a consistent strength bar. */
const validatePassword = (pwd: string): string => {
  if (!pwd) return 'Password is required.';
  if (pwd.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(pwd)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(pwd)) return 'Password must contain at least one number.';
  return '';
};

// Same glassmorphism field style as LoginPage.tsx's glassFieldSx, kept local
// to avoid coupling this standalone page to LoginPage's internals.
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

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [newPasswordTouched, setNewPasswordTouched] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const pwdErr = validatePassword(newPassword);
      const confirmErr = confirmPassword !== newPassword ? 'Passwords do not match.' : '';
      setNewPasswordError(pwdErr);
      setNewPasswordTouched(true);
      setConfirmPasswordError(confirmErr);
      if (pwdErr) {
        showAlert.warning(pwdErr, 'Password Error');
        return;
      }
      if (confirmErr) {
        showAlert.warning(confirmErr, 'Password Error');
        return;
      }
      if (!token) {
        setLinkInvalid(true);
        return;
      }

      setSubmitting(true);
      try {
        await authService.resetPassword({ token, new_password: newPassword });
        setDone(true);
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          || 'Something went wrong. Please try again.';
        if (status === 400) {
          // Covers the expired/invalid/already-used token case from the
          // backend's resetPassword() — surface it as a persistent state,
          // not just a toast, since the user needs to know to request a
          // fresh link rather than retry the same form.
          setLinkInvalid(true);
        }
        showAlert.error(message);
      } finally {
        setSubmitting(false);
      }
    },
    [token, newPassword, confirmPassword]
  );

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
              Dream Group CRM
            </h1>
            <p className="text-xs text-yellow-300/90 font-body tracking-wide px-4 leading-relaxed">
              Interest Free Home For All Community People
            </p>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-white/50 text-xs font-body">Set a New Password</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          {!token || linkInvalid ? (
            <div className="space-y-4">
              <p className="text-white/80 text-sm text-center py-2">
                This reset link is invalid or has expired.
              </p>
              <p className="text-white/50 text-xs text-center">
                Reset links can only be used once and expire after 15 minutes. Please request a new one from the login page.
              </p>
              <button
                type="button"
                onClick={() => navigate(ROUTES.LOGIN, { replace: true })}
                className="w-full mt-2 py-3 rounded-xl font-semibold text-white transition-all
                  duration-300 flex items-center justify-center gap-2 login-submit-btn">
                Back to Login
              </button>
            </div>
          ) : done ? (
            <div className="space-y-4">
              <p className="text-white/80 text-sm text-center py-2">
                Your password has been reset successfully.
              </p>
              <p className="text-white/50 text-xs text-center">
                Please log in with your new password.
              </p>
              <button
                type="button"
                onClick={() => navigate(ROUTES.LOGIN, { replace: true })}
                className="w-full mt-2 py-3 rounded-xl font-semibold text-white transition-all
                  duration-300 flex items-center justify-center gap-2 login-submit-btn">
                Go to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <TextField
                fullWidth required name="new_password" label="New Password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (newPasswordTouched) setNewPasswordError(validatePassword(e.target.value));
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
                      <IconButton
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        edge="end" size="small"
                        sx={{ color: 'rgba(255,255,255,0.5)' }}
                      >
                        {showNewPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={glassFieldSx}
              />

              <TextField
                fullWidth required name="confirm_password" label="Confirm New Password"
                type={showConfirmPassword ? 'text' : 'password'}
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
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end" size="small"
                        sx={{ color: 'rgba(255,255,255,0.5)' }}
                      >
                        {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
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
                    <span
                      key={label}
                      className={`flex items-center gap-1 ${check ? 'text-green-400' : 'text-white/40'}`}
                    >
                      <span>{check ? '✓' : '○'}</span> {label}
                    </span>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3 rounded-xl font-semibold text-white transition-all
                  duration-300 flex items-center justify-center gap-2 disabled:opacity-70
                  disabled:cursor-not-allowed login-submit-btn">
                {submitting ? (
                  <>
                    <CircularProgress size={18} sx={{ color: 'white' }} />
                    Saving...
                  </>
                ) : (
                  'Reset Password'
                )}
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

export default ResetPasswordPage;
