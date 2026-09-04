// ==========================================
// DREAM GROUP CRM - LOGIN PAGE (UPDATED)
// ==========================================
//
// CHANGES IN THIS VERSION:
//   1. Real Dream Group logo via <Logo> component (replaces inline SVG)
//   2. Smart validation messages — specific error per rule, shown via SweetAlert2
//   3. Validation helpers rewritten with granular messages
//   4. Multi-step login to match API v12: email+password -> OTP -> session
//      (and, for a first-time login, OTP -> set new password -> session)
//
// NOTE: the "right div (login form) height/width changes" issue was fixed
// entirely in Responsive.css (.login-card now has a fixed width + height
// per breakpoint instead of shrink-wrapping to whichever step's content is
// showing). No structural/logic change was needed in this file — the same
// className="login-card" hook already used below is what the CSS now pins.
//
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { loginThunk, verifyOtpThunk, setNewPasswordThunk } from '../../redux/thunks/authThunks';
import { clearError, resetLoginFlow } from '../../redux/slices/authSlice';
import { ROUTES } from '../../constants';
import { showAlert, homeRouteForRole } from '../../utils';
import { authService } from '../../services/authService';
import Logo from '../../components/ui/Logo';

import {
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, Person, Phone, KeyboardBackspace } from '@mui/icons-material';

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

/** Returns the FIRST failing rule for the OTP, or '' if valid */
const validateOtp = (otp: string): string => {
  if (!otp.trim()) return 'Please enter the code sent to your email.';
  if (!/^\d{6}$/.test(otp.trim())) return 'The code is 6 digits.';
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

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const {
    loading, error, isAuthenticated, role,
    otpToken, otpMessage, mustChangePassword, resetToken,
  } = useAppSelector((s) => s.auth);

  // Which step of the login flow is showing right now. Forgot-password is a
  // purely local overlay (no redux session state involved — it's a public,
  // unauthenticated request) that takes over the credentials step.
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const step: 'credentials' | 'otp' | 'reset-password' | 'forgot-password' =
    showForgotPassword ? 'forgot-password'
    : mustChangePassword ? 'reset-password'
    : otpToken ? 'otp' : 'credentials';

  // ── Forgot Password (self-service) ──
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotEmailError, setForgotEmailError] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  // OTP is stored as 6 individual boxes (professional PIN-entry UI),
  // `otp` below is simply the 6 boxes joined together into one string.
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(''));
  const otp = otpDigits.join('');
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [otpError, setOtpError] = useState('');
  const [otpTouched, setOtpTouched] = useState(false);
  const [justRequestedOtp, setJustRequestedOtp] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [newPasswordTouched, setNewPasswordTouched] = useState(false);
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

  // ── Redirect if already authenticated ──
  useEffect(() => {
    if (isAuthenticated && role) {
      navigate(
        homeRouteForRole(role),
        { replace: true }
      );
    }
  }, [isAuthenticated, role, navigate]);

  // ── Show API-level errors via SweetAlert2 ──
  useEffect(() => {
    if (error) {
      showAlert.error(error, 'Login Failed');
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // ── Toast once when we land on the OTP step ──
  useEffect(() => {
    if (step === 'otp' && justRequestedOtp) {
      showAlert.success(otpMessage || 'A one-time code has been sent to your email', 'Check your email');
      setJustRequestedOtp(false);
    }
  }, [step, justRequestedOtp, otpMessage]);

  // ── Auto-focus the first verification-code box the moment the OTP
  //    step appears, so the user can start typing immediately without
  //    having to click into the field first ──
  useEffect(() => {
    if (step === 'otp') {
      const focusTimer = setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 50);
      return () => clearTimeout(focusTimer);
    }
  }, [step]);

  // ── OTP box handlers (6-box PIN-style input) ──
  const handleOtpDigitChange = (index: number, rawValue: string) => {
    const digit = rawValue.replace(/[^0-9]/g, '').slice(-1); // keep only the last digit typed
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    setOtpTouched(true);
    setOtpError(validateOtp(next.join('')));

    // Auto-advance to the next box as soon as a digit is entered
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const next = [...otpDigits];
      if (next[index]) {
        // Clear the current box
        next[index] = '';
        setOtpDigits(next);
        setOtpError(validateOtp(next.join('')));
      } else if (index > 0) {
        // Already empty — step back and clear the previous box
        next[index - 1] = '';
        setOtpDigits(next);
        setOtpError(validateOtp(next.join('')));
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;
    const next = Array(6).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setOtpDigits(next);
    setOtpTouched(true);
    setOtpError(validateOtp(next.join('')));
    const focusIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[focusIndex]?.focus();
  };

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

  // ── Step 1: email + password -> backend emails an OTP ──
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

      const result = await dispatch(loginThunk({ email: form.email, password: form.password }));
      if (loginThunk.fulfilled.match(result)) {
        setJustRequestedOtp(true);
      }
    },
    [form, dispatch]
  );

  // ── Step 2: OTP -> session, or -> forced password reset ──
  const handleOtpSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const err = validateOtp(otp);
      setOtpError(err);
      setOtpTouched(true);
      if (err) {
        showAlert.warning(err, 'Code Error');
        return;
      }
      if (!otpToken) return; // shouldn't happen — step wouldn't render without it

      const result = await dispatch(verifyOtpThunk({ otpToken, otp: otp.trim() }));
      if (verifyOtpThunk.fulfilled.match(result) && 'token' in result.payload) {
        await showAlert.loginSuccess(result.payload.user.base_role);
        navigate(
          homeRouteForRole(result.payload.user.base_role),
          { replace: true }
        );
      }
    },
    [otp, otpToken, dispatch, navigate]
  );

  // ── Step 3 (first login only): set a new password -> session ──
  const handleResetPasswordSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const err = validatePassword(newPassword);
      setNewPasswordError(err);
      setNewPasswordTouched(true);
      if (err) {
        showAlert.warning(err, 'Password Error');
        return;
      }
      if (!resetToken) return;

      const result = await dispatch(setNewPasswordThunk({ resetToken, new_password: newPassword }));
      if (setNewPasswordThunk.fulfilled.match(result)) {
        await showAlert.loginSuccess(result.payload.user.base_role);
        navigate(
          homeRouteForRole(result.payload.user.base_role),
          { replace: true }
        );
      }
    },
    [newPassword, resetToken, dispatch, navigate]
  );

  const handleBackToLogin = () => {
    setOtpDigits(Array(6).fill(''));
    setOtpError('');
    setOtpTouched(false);
    setNewPassword('');
    setNewPasswordError('');
    setNewPasswordTouched(false);
    dispatch(resetLoginFlow());
  };

  // ── Forgot Password: request a reset link ──
  const openForgotPassword = () => {
    setForgotEmail(form.email);
    setForgotEmailError('');
    setForgotSubmitted(false);
    setForgotMessage('');
    setShowForgotPassword(true);
  };

  const closeForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotEmail('');
    setForgotEmailError('');
    setForgotSubmitted(false);
    setForgotMessage('');
  };

  const handleForgotPasswordSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const err = validateEmail(forgotEmail);
      setForgotEmailError(err);
      if (err) {
        showAlert.warning(err, 'Email Error');
        return;
      }
      setForgotSubmitting(true);
      try {
        const response = await authService.forgotPassword({ email: forgotEmail });
        setForgotMessage(response.message || 'If an account exists for that email, password reset instructions have been sent.');
        setForgotSubmitted(true);
      } catch (err) {
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          || 'Something went wrong. Please try again.';
        showAlert.error(message);
      } finally {
        setForgotSubmitting(false);
      }
    },
    [forgotEmail]
  );

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
              <p className="text-lg text-yellow-300/90 font-body tracking-wide px-4 leading-relaxed">
                Interest Free Home For All Community People
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-white/20" />
              <span className="text-white/50 text-sm font-body">
                {step === 'credentials' && 'Sign In to Your Account'}
                {step === 'otp' && 'Enter Verification Code'}
                {step === 'reset-password' && 'Set a New Password'}
                {step === 'forgot-password' && 'Reset Your Password'}
              </span>
              <div className="flex-1 h-px bg-white/20" />
            </div>

            {/* ── Step 1: Email + Password ── */}
            {step === 'credentials' && (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* Email (mandatory) */}
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
                        <Email sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 17.5 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={glassFieldSx}
                />

                {/* Password (mandatory) */}
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

                {/* Forgot password? */}
                <div className="flex justify-end -mt-2">
                  <button
                    type="button"
                    onClick={openForgotPassword}
                    className="text-white/50 hover:text-white/80 text-xs transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

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

                {/* Submit */}
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

            {/* ── Step 2: OTP ── */}
            {step === 'otp' && (
              <form onSubmit={handleOtpSubmit} noValidate className="space-y-4">
                <p className="text-white/60 text-sm -mt-2 mb-1">
                  We sent a 6-digit code to <span className="text-white/90">{form.email}</span>.
                  It expires in 5 minutes.
                </p>

                <div className="flex flex-col items-center">
                  <div
                    className="flex items-center justify-center gap-2 sm:gap-3"
                    onPaste={handleOtpPaste}
                  >
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { otpInputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete={index === 0 ? 'one-time-code' : 'off'}
                        maxLength={1}
                        value={digit}
                        autoFocus={index === 0}
                        onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onFocus={(e) => e.target.select()}
                        aria-label={`Verification code digit ${index + 1}`}
                        style={{ width: '3rem', height: '3.4rem' }}
                        className={`text-center text-xl font-semibold
                          rounded-xl text-white bg-white/[0.08] outline-none border
                          transition-all duration-200
                          focus:bg-white/[0.14] focus:ring-2 focus:ring-blue-500/40
                          ${otpTouched && otpError
                            ? 'border-red-400'
                            : 'border-white/20 focus:border-blue-500'}`}
                      />
                    ))}
                  </div>

                  {otpTouched && otpError && (
                    <p className="text-red-300 text-xs mt-2 text-center">{otpError}</p>
                  )}
                </div>

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

                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full flex items-center justify-center gap-1 text-white/50 hover:text-white/80 text-xs py-1"
                >
                  <KeyboardBackspace fontSize="inherit" /> Back to login
                </button>
              </form>
            )}

            {/* ── Step 3: Set new password (first login only) ── */}
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

            {/* ── Forgot Password: request a reset link ── */}
            {step === 'forgot-password' && (
              <>
                {!forgotSubmitted ? (
                  <form onSubmit={handleForgotPasswordSubmit} noValidate className="space-y-4">
                    <p className="text-white/60 text-xs -mt-2 mb-1">
                      Enter your account email and we'll send you a link to reset your password.
                    </p>

                    <TextField
                      fullWidth required name="forgot_email" label="Email ID" type="email"
                      value={forgotEmail}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^a-zA-Z0-9@._+\-]/g, '');
                        setForgotEmail(cleaned);
                        if (forgotEmailError) setForgotEmailError(validateEmail(cleaned));
                      }}
                      onBlur={() => setForgotEmailError(validateEmail(forgotEmail))}
                      error={!!forgotEmailError}
                      helperText={forgotEmailError}
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

                    <button
                      type="submit"
                      disabled={forgotSubmitting}
                      className="w-full mt-2 py-3 rounded-xl font-semibold text-white transition-all
                        duration-300 flex items-center justify-center gap-2 disabled:opacity-70
                        disabled:cursor-not-allowed login-submit-btn">
                      {forgotSubmitting ? (
                        <>
                          <CircularProgress size={18} sx={{ color: 'white' }} />
                          Sending...
                        </>
                      ) : (
                        'Send Reset Link'
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={closeForgotPassword}
                      className="w-full flex items-center justify-center gap-1 text-white/50 hover:text-white/80 text-xs py-1"
                    >
                      <KeyboardBackspace fontSize="inherit" /> Back to login
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <p className="text-white/80 text-sm text-center py-2">
                      {forgotMessage}
                    </p>
                    <p className="text-white/50 text-xs text-center">
                      Check your inbox for a link to reset your password. It expires in 15 minutes and can only be used once.
                    </p>
                    <button
                      type="button"
                      onClick={closeForgotPassword}
                      className="w-full mt-2 py-3 rounded-xl font-semibold text-white transition-all
                        duration-300 flex items-center justify-center gap-2 login-submit-btn">
                      Back to Login
                    </button>
                  </div>
                )}
              </>
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
