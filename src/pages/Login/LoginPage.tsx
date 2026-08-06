// ==========================================
// DREAM GROUP CRM - LOGIN PAGE (UPDATED)
// ==========================================
//
// CHANGES IN THIS VERSION:
//   1. Real Dream Group logo via <Logo> component (replaces inline SVG)
//   2. Smart validation messages — specific error per rule, shown via SweetAlert2
//   3. Validation helpers rewritten with granular messages
//   4. Login is now 3 steps: password -> emailed OTP -> (first login only)
//      set a new password. The right-side card swaps content per step;
//      the carousel/shell stays the same throughout.
//
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { loginThunk, verifyOtpThunk, setNewPasswordThunk } from '../../redux/thunks/authThunks';
import { clearError, resetLoginFlow } from '../../redux/slices/authSlice';
import { ROUTES } from '../../constants';
import { showAlert } from '../../utils';
import Logo from '../../components/ui/Logo';

import {
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, ArrowBack } from '@mui/icons-material';
import img1 from '../../assets/images/carousel_1.png';
import img2 from '../../assets/images/carousel_2.png';
import img3 from '../../assets/images/carousel_3.png';
import img4 from '../../assets/images/carousel_4.png';
import img5 from '../../assets/images/carousel_5.png';
import img6 from '../../assets/images/carousel_6.png';
import img7 from '../../assets/images/carousel_7.png';

const carouselImages = [img1, img2, img3, img4, img5, img6, img7];

// ──────────────────────────────────────────
// SMART VALIDATION — Returns specific error messages
// ──────────────────────────────────────────

/** Returns the FIRST failing rule for email, or '' if valid */
const validateEmail = (email: string): string => {
  if (!email.trim()) return 'Please enter an email address.';
  if (/[^a-zA-Z0-9@._+\-]/.test(email))
    return 'Email contains unsupported special characters.';
  if (!email.includes('@')) return 'Email must contain @ symbol.';
  const [local, domain] = email.split('@');
  if (!local) return 'Invalid email format — missing username before @.';
  if (!domain) return 'Invalid email format — missing domain after @.';
  if (!domain.includes('.')) return 'Invalid email format — domain must contain a dot.';
  if (!/(\.com|\.in|\.org|\.co)$/i.test(domain)) return 'Email must end with . com | co | in | org';
  return '';
};

/** Returns the FIRST failing rule for password, or '' if valid */
const validatePassword = (pwd: string): string => {
  if (!pwd) return 'Password is required.';
  if (pwd.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(pwd)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(pwd)) return 'Password must contain at least one number.';
  return '';
};

// MUI field shared styles for the glassmorphism login card
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

const backLinkSx: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4,
  color: 'rgba(255,255,255,0.6)', fontSize: 13, background: 'none',
  border: 'none', cursor: 'pointer', padding: 0, marginBottom: 12,
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading, error, isAuthenticated, role, loginStep, otpToken, resetToken } = useAppSelector((s) => s.auth);

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const [otp, setOtp] = useState('');
  const [otpTouched, setOtpTouched] = useState(false);

  const [newPassword, setNewPassword] = useState({ password: '', confirm: '' });
  const [newPasswordErrors, setNewPasswordErrors] = useState({ password: '', confirm: '' });
  const [newPasswordTouched, setNewPasswordTouched] = useState({ password: false, confirm: false });
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // ── Auto-slide carousel ──
  useEffect(() => {
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
        setIsTransitioning(false);
      }, 500);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // ── Redirect (+ success toast) once a real session exists — this fires
  // whether the session came from step 2 (normal login) or step 3
  // (first-login password reset), so both paths land the user in the app. ──
  useEffect(() => {
    if (isAuthenticated && role) {
      (async () => {
        await showAlert.loginSuccess(role);
        navigate(
          role === 'admin' || role === 'superadmin' ? ROUTES.ADMIN.DASHBOARD : ROUTES.EMPLOYEE.DASHBOARD,
          { replace: true }
        );
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, role]);

  // ── Show API-level errors via SweetAlert2 ──
  useEffect(() => {
    if (error) {
      showAlert.error(error, loginStep === 'otp' ? 'Verification Failed' : 'Login Failed');
      dispatch(clearError());
    }
  }, [error, loginStep, dispatch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'email') {
      // Strip unsupported characters on the fly
      const cleaned = value.replace(/[^a-zA-Z0-9@._+\-]/g, '');
      setForm((p) => ({ ...p, email: cleaned }));
      if (touched.email) setErrors((p) => ({ ...p, email: validateEmail(cleaned) }));
      return;
    }
    setForm((p) => ({ ...p, [name]: value }));
    if (name === 'password' && touched.password) {
      setErrors((p) => ({ ...p, password: validatePassword(value) }));
    }
  };

  const handleBlur = (field: 'email' | 'password') => {
    setTouched((p) => ({ ...p, [field]: true }));
    if (field === 'email') setErrors((p) => ({ ...p, email: validateEmail(form.email) }));
    if (field === 'password') setErrors((p) => ({ ...p, password: validatePassword(form.password) }));
  };

  // ── Step 1: email + password ──
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const emailErr = validateEmail(form.email);
      const pwdErr = validatePassword(form.password);
      setErrors({ email: emailErr, password: pwdErr });
      setTouched({ email: true, password: true });

      // ── Smart validation alert — shows EXACT first error ──
      if (emailErr) {
        showAlert.warning(emailErr, 'Email Error');
        return;
      }
      if (pwdErr) {
        showAlert.warning(pwdErr, 'Password Error');
        return;
      }

      await dispatch(loginThunk({ email: form.email, password: form.password }));
    },
    [form, dispatch]
  );

  // ── Step 2: OTP ──
  const handleOtpSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setOtpTouched(true);
      if (!/^\d{6}$/.test(otp)) {
        showAlert.warning('Enter the 6-digit code sent to your email.', 'Invalid Code');
        return;
      }
      if (!otpToken) return;
      await dispatch(verifyOtpThunk({ otpToken, otp }));
    },
    [otp, otpToken, dispatch]
  );

  // ── Step 3 (first login only): set new password ──
  const handleNewPasswordSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const pwdErr = validatePassword(newPassword.password);
      const confirmErr = newPassword.confirm !== newPassword.password ? 'Passwords do not match.' : '';
      setNewPasswordErrors({ password: pwdErr, confirm: confirmErr });
      setNewPasswordTouched({ password: true, confirm: true });
      if (pwdErr) {
        showAlert.warning(pwdErr, 'Password Error');
        return;
      }
      if (confirmErr) {
        showAlert.warning(confirmErr, 'Password Error');
        return;
      }
      if (!resetToken) return;
      await dispatch(setNewPasswordThunk({ resetToken, new_password: newPassword.password }));
    },
    [newPassword, resetToken, dispatch]
  );

  const handleBackToLogin = () => {
    setOtp('');
    setOtpTouched(false);
    setNewPassword({ password: '', confirm: '' });
    setNewPasswordErrors({ password: '', confirm: '' });
    setNewPasswordTouched({ password: false, confirm: false });
    dispatch(resetLoginFlow());
  };

  const goToSlide = (index: number) => {
    setIsTransitioning(true);
    setTimeout(() => { setCurrentSlide(index); setIsTransitioning(false); }, 300);
  };

  return (
    <div className="login-page-container">

      <div className="login-background">
        <div className="login-pattern"></div>
      </div>

      <div className="login-frame login-grid-layout">
        {/* ═══ LEFT — Carousel (60%) ═══ */}
        <div className="login-left">
          <div className="carousel-card shadow-2xl" >
            {carouselImages.map((img, index) => (
              <div
                key={index}
                className={`carousel-image-wrapper transition-opacity duration-700 ${currentSlide === index ? "active-slide" : ""
                  }`}
                style={{
                  opacity: currentSlide === index ? (isTransitioning ? 0 : 1) : 0,
                  zIndex: currentSlide === index ? 1 : 0,
                }}
              >
                <img
                  src={img}
                  alt={`Dream Group Slide ${index + 1}`}
                  className="carousel-image"
                  loading="lazy"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/30" />
              </div>
            ))}

            {/* Dots */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {carouselImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  className={`rounded-full transition-all duration-300 cursor-pointer ${currentSlide === i
                    ? 'bg-blue-400 w-8 h-2.5'
                    : 'bg-white/50 hover:bg-white/80 w-2.5 h-2.5'
                    }`}
                />
              ))}
            </div>

            {/* Counter */}
            <div className="absolute top-6 right-6 z-20 bg-black/40 backdrop-blur-sm text-white text-sm px-3 py-1 rounded-full font-mono">
              {String(currentSlide + 1).padStart(2, '0')} / {String(carouselImages.length).padStart(2, '0')}
            </div>
          </div>
        </div>

        {/* ═══ RIGHT — Login Form (40%) ═══ */}
        <div className="login-right">
          <div
            className="login-card animate-fade-in"
            style={{
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            }}
          >
            {/* ── Logo + Title (real image) ── */}
            <div className="text-center mb-7">
              <div className="flex justify-center mb-3">
                {/* Real Dream Group logo — responsive size */}
                <Logo size="lg" />
              </div>
              <h1 className="font-display text-3xl font-bold text-white mb-1">
                Dream Group CRM
              </h1>
              <p className="text-xs text-yellow-300/90 font-body tracking-wide px-4 leading-relaxed">
                Interest Free Home For All Community People
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-white/20" />
              <span className="text-white/50 text-xs font-body">
                {loginStep === 'credentials' && 'Sign In to Your Account'}
                {loginStep === 'otp' && 'Enter Verification Code'}
                {loginStep === 'newPassword' && 'Set a New Password'}
              </span>
              <div className="flex-1 h-px bg-white/20" />
            </div>

            {/* ═══ STEP 1: Email + Password ═══ */}
            {loginStep === 'credentials' && (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <TextField
                  fullWidth required name="email" label="Email ID" type="email"
                  value={form.email} onChange={handleChange}
                  onBlur={() => handleBlur('email')}
                  error={touched.email && !!errors.email}
                  helperText={touched.email && errors.email}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 20 }} />
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
                        <Lock sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end" size="small"
                          sx={{ color: 'rgba(255,255,255,0.5)' }}
                        >
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={glassFieldSx}
                />

                {/* Password strength hints */}
                {form.password && (
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {[
                      { check: form.password.length >= 8, label: '8+ chars' },
                      { check: /[A-Z]/.test(form.password), label: 'Uppercase' },
                      { check: /[a-z]/.test(form.password), label: 'Lowercase' },
                      { check: /[0-9]/.test(form.password), label: 'Number' },
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
                  disabled={loading}
                  className="w-full mt-2 py-3 rounded-xl font-semibold text-white transition-all
                    duration-300 flex items-center justify-center gap-2 disabled:opacity-70
                    disabled:cursor-not-allowed login-submit-btn">
                  {loading ? (
                    <>
                      <CircularProgress size={18} sx={{ color: 'white' }} />
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
            )}

            {/* ═══ STEP 2: OTP ═══ */}
            {loginStep === 'otp' && (
              <form onSubmit={handleOtpSubmit} noValidate className="space-y-4">
                <button type="button" onClick={handleBackToLogin} style={backLinkSx}>
                  <ArrowBack sx={{ fontSize: 15 }} /> Back to login
                </button>

                <p className="text-white/50 text-xs -mt-2 mb-1">
                  We emailed a 6-digit code to <span className="text-white/80">{form.email}</span>. It expires in 5 minutes.
                </p>

                <TextField
                  fullWidth required name="otp" label="Verification Code"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onBlur={() => setOtpTouched(true)}
                  error={otpTouched && !/^\d{6}$/.test(otp)}
                  helperText={otpTouched && !/^\d{6}$/.test(otp) ? 'Enter the 6-digit code.' : ''}
                  size="small"
                  inputProps={{ maxLength: 6, style: { letterSpacing: '0.3em', fontSize: 18, textAlign: 'center' } }}
                  sx={glassFieldSx}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 rounded-xl font-semibold text-white transition-all
                    duration-300 flex items-center justify-center gap-2 disabled:opacity-70
                    disabled:cursor-not-allowed login-submit-btn">
                  {loading ? (
                    <>
                      <CircularProgress size={18} sx={{ color: 'white' }} />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Sign In'
                  )}
                </button>
              </form>
            )}

            {/* ═══ STEP 3 (first login only): Set New Password ═══ */}
            {loginStep === 'newPassword' && (
              <form onSubmit={handleNewPasswordSubmit} noValidate className="space-y-4">
                <p className="text-white/50 text-xs -mt-1 mb-1">
                  This is your first login — set a new password to continue.
                </p>

                <TextField
                  fullWidth required name="newPassword" label="New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword.password}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewPassword((p) => ({ ...p, password: value }));
                    if (newPasswordTouched.password) {
                      setNewPasswordErrors((p) => ({ ...p, password: validatePassword(value) }));
                    }
                  }}
                  onBlur={() => {
                    setNewPasswordTouched((p) => ({ ...p, password: true }));
                    setNewPasswordErrors((p) => ({ ...p, password: validatePassword(newPassword.password) }));
                  }}
                  error={newPasswordTouched.password && !!newPasswordErrors.password}
                  helperText={newPasswordTouched.password && newPasswordErrors.password}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 20 }} />
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
                  fullWidth required name="confirmPassword" label="Confirm New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword.confirm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewPassword((p) => ({ ...p, confirm: value }));
                    if (newPasswordTouched.confirm) {
                      setNewPasswordErrors((p) => ({ ...p, confirm: value !== newPassword.password ? 'Passwords do not match.' : '' }));
                    }
                  }}
                  onBlur={() => {
                    setNewPasswordTouched((p) => ({ ...p, confirm: true }));
                    setNewPasswordErrors((p) => ({ ...p, confirm: newPassword.confirm !== newPassword.password ? 'Passwords do not match.' : '' }));
                  }}
                  error={newPasswordTouched.confirm && !!newPasswordErrors.confirm}
                  helperText={newPasswordTouched.confirm && newPasswordErrors.confirm}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={glassFieldSx}
                />

                {newPassword.password && (
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {[
                      { check: newPassword.password.length >= 8, label: '8+ chars' },
                      { check: /[A-Z]/.test(newPassword.password), label: 'Uppercase' },
                      { check: /[a-z]/.test(newPassword.password), label: 'Lowercase' },
                      { check: /[0-9]/.test(newPassword.password), label: 'Number' },
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
                  disabled={loading}
                  className="w-full mt-2 py-3 rounded-xl font-semibold text-white transition-all
                    duration-300 flex items-center justify-center gap-2 disabled:opacity-70
                    disabled:cursor-not-allowed login-submit-btn">
                  {loading ? (
                    <>
                      <CircularProgress size={18} sx={{ color: 'white' }} />
                      Saving...
                    </>
                  ) : (
                    'Set Password & Sign In'
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
    </div>
  );
};

export default LoginPage;
