// ==========================================
// DREAM GROUP CRM - LOGIN PAGE (UPDATED)
// ==========================================
//
// CHANGES IN THIS VERSION:
//   1. Real Dream Group logo via <Logo> component (replaces inline SVG)
//   2. Smart validation messages — specific error per rule, shown via SweetAlert2
//   3. Validation helpers rewritten with granular messages
//
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { loginThunk } from '../../redux/thunks/authThunks';
import { clearError } from '../../redux/slices/authSlice';
import { ROUTES } from '../../constants';
import { showAlert } from '../../utils';
import Logo from '../../components/ui/Logo';

import {
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, Person, Phone } from '@mui/icons-material';

const img1 = "/src/assets/images/carousel_1.png";
const img2 = "/src/assets/images/carousel_2.png";
const img3 = "/src/assets/images/carousel_3.png";
const img4 = "/src/assets/images/carousel_4.png";
const img5 = "/src/assets/images/carousel_5.png";
const img6 = "/src/assets/images/carousel_6.png";
const img7 = "/src/assets/images/carousel_7.png";

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

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading, error, isAuthenticated, role } = useAppSelector((s) => s.auth);

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
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
        role === 'admin' ? ROUTES.ADMIN.DASHBOARD : ROUTES.EMPLOYEE.DASHBOARD,
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
        const baseRole = result.payload.user.base_role; // 'admin' | 'employee'
        await showAlert.loginSuccess(baseRole);
        navigate(
          baseRole === 'admin' ? ROUTES.ADMIN.DASHBOARD : ROUTES.EMPLOYEE.DASHBOARD,
          { replace: true }
        );
      }
    },
    [form, dispatch, navigate]
  );

  const goToSlide = (index: number) => {
    setIsTransitioning(true);
    setTimeout(() => { setCurrentSlide(index); setIsTransitioning(false); }, 300);
  };

  return (
    <div className="login-page-container">
      {/* Full-page background */}
      <div
        className="absolute inset-0 z-0"
        style={{ background: '#000000', height: 'auto' }}>
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d97706' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="login-frame">
        {/* ═══ LEFT — Carousel (60%) ═══ */}
        <div className="login-left">
          <div className="carousel-card" >
            {carouselImages.map((img, index) => (
              <div
                key={index}
                className="carousel-image-wrapper transition-opacity duration-700"
                style={{
                  opacity: currentSlide === index ? (isTransitioning ? 0 : 1) : 0,
                  zIndex: currentSlide === index ? 1 : 0,
                }}
              >
                <img src={img} alt={`Dream Group Slide ${index + 1}`} className="carousel-image" />
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
        <div className="login-right relative z-10">
          <div
            className="w-full max-w-[520px] rounded-3xl p-8 shadow-2xl animate-fade-in"
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
              <span className="text-white/50 text-xs font-body">Sign In to Your Account</span>
              <div className="flex-1 h-px bg-white/20" />
            </div>

            {/* Form */}
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
                      <Email sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 20 }} />
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

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 rounded-xl font-semibold text-white transition-all
                  duration-300 flex items-center justify-center gap-2 disabled:opacity-70
                  disabled:cursor-not-allowed"
                style={{ background: "blue" }}
              >
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
