// ==========================================
// DREAM GROUP CRM - PROFILE MODAL
// ==========================================
import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { closeProfileModal } from '../../redux/slices/profileSlice';
import { fetchProfileThunk } from '../../redux/thunks/profileThunks';
import { getInitials, formatLastLogin, showAlert } from '../../utils';
import { getTheme } from '../../styles/theme';
import { authService } from '../../services/authService';
import { CircularProgress, InputAdornment, IconButton, TextField } from '@mui/material';
import { Visibility, VisibilityOff, Lock } from '@mui/icons-material';
import {
  MdClose, MdEmail, MdPhone, MdBadge,
  MdCalendarToday, MdBusiness, MdAdminPanelSettings, MdLockOutline,
} from 'react-icons/md';

// Change Password — new_password must be at least 6 characters, matching
// auth.service.ts's ChangePasswordSchema (the existing, already-live
// change-password endpoint's own minimum — deliberately not the stronger
// 8-char+complexity rule used for first-login/forgot-password resets).
const MIN_NEW_PASSWORD_LENGTH = 6;

const ProfileModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const { profileModalOpen, profile, loading, error } = useAppSelector((s) => s.profile);
  const { mode } = useAppSelector((s) => s.theme);
  const isDark   = mode === 'dark';
  const t        = getTheme(isDark);

  // ── Change Password (inline, collapsible section) ──
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwdForm, setPwdForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [pwdErrors, setPwdErrors] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [pwdVisibility, setPwdVisibility] = useState({ old: false, new: false, confirm: false });
  const [pwdSaving, setPwdSaving] = useState(false);

  // Fetch profile from API when the modal is opened and data is not yet loaded
  useEffect(() => {
    if (profileModalOpen && !profile) dispatch(fetchProfileThunk());
  }, [profileModalOpen, profile, dispatch]);

  if (!profileModalOpen) return null;

  const resetPasswordForm = () => {
    setShowChangePassword(false);
    setPwdForm({ old_password: '', new_password: '', confirm_password: '' });
    setPwdErrors({ old_password: '', new_password: '', confirm_password: '' });
  };

  const handlePwdChange = (field: 'old_password' | 'new_password' | 'confirm_password', value: string) => {
    setPwdForm((p) => ({ ...p, [field]: value }));
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = {
      old_password: pwdForm.old_password ? '' : 'Current password is required.',
      new_password:
        !pwdForm.new_password ? 'New password is required.'
        : pwdForm.new_password.length < MIN_NEW_PASSWORD_LENGTH ? `New password must be at least ${MIN_NEW_PASSWORD_LENGTH} characters.`
        : pwdForm.new_password === pwdForm.old_password ? 'New password must be different from the current password.'
        : '',
      confirm_password:
        pwdForm.confirm_password !== pwdForm.new_password ? 'Passwords do not match.' : '',
    };
    setPwdErrors(errors);
    if (errors.old_password || errors.new_password || errors.confirm_password) return;

    setPwdSaving(true);
    try {
      await authService.changePassword({ old_password: pwdForm.old_password, new_password: pwdForm.new_password });
      showAlert.success('Password changed successfully');
      resetPasswordForm();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Failed to change password. Please try again.';
      showAlert.error(message);
    } finally {
      setPwdSaving(false);
    }
  };

  const pwdFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      background: t.inputBg,
      color: t.inputText,
      '& fieldset': { borderColor: t.inputBorder },
      '&:hover fieldset': { borderColor: t.inputFocusBorder },
      '&.Mui-focused fieldset': { borderColor: '#2563eb' },
      '&.Mui-error fieldset': { borderColor: '#ef4444' },
    },
    '& .MuiInputLabel-root': { color: t.textSecondary },
    '& .MuiInputLabel-root.Mui-focused': { color: '#2563eb' },
    '& .MuiFormHelperText-root': { color: '#ef4444' },
  };

  // Full display name from first_name + last_name
  const fullName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim()
    : '';

  // Reusable row for each profile field
  const InfoRow = ({
    icon, label, value,
  }: {
    icon: React.ReactNode;
    label: string;
    value?: string | null;
  }) => (
    <div
      className="flex items-center gap-2.5 p-2.5 rounded-xl"
      style={{ background: t.insetBg }}
    >
      <span className="text-lg flex-shrink-0" style={{ color: '#2563eb' }}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium leading-none mb-0.5"
          style={{ color: t.textPrimary, fontFamily: t.fontFamily }}>
          {label}
        </p>
        <p className="text-sm font-semibold truncate"
          style={{ color: t.textPrimary, fontFamily: t.fontFamily }}>
          {/* Null / empty values show a dash gracefully */}
          {value && value.trim() !== '' ? value : '-'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="relative w-full shadow-2xl profile-modal flex flex-col"
        style={{
          maxWidth    : 420,
          maxHeight   : '85vh',
          borderRadius: '2rem',
          overflow    : 'hidden',
          background  : t.surfaceBg,
          border      : `1px solid ${t.surfaceBorder}`,
          fontFamily  : t.fontFamily,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner */}
        <div
          className="flex-shrink-0 relative px-5 pt-5 pb-4 text-center"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, #0f172a, #1e293b)'
              : 'linear-gradient(135deg, #1e3a5f, #2563eb)',
          }}
        >
          <button
            onClick={() => dispatch(closeProfileModal())}
            className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full flex items-center justify-center transition-all"
            style={{
              background: 'rgba(255,255,255,0.1)',
              color     : 'rgba(255,255,255,0.7)',
              border    : 'none',
              cursor    : 'pointer',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.2)';
              (e.currentTarget as HTMLElement).style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)';
            }}
            title="Close"
          >
            <MdClose size={16} />
          </button>
          <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-0.5">
            My Profile
          </p>
          <h2 className="text-white font-bold text-lg" style={{ fontFamily: t.fontFamily }}>
            Dream Group CRM
          </h2>
        </div>

        {/* Avatar */}
        <div className="flex-shrink-0 flex justify-center mt-3 mb-2 px-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg"
            style={{
              background: t.avatarGradient,
              border    : `3px solid ${t.surfaceBg}`,
            }}
          >
            {loading
              ? <CircularProgress size={22} sx={{ color: 'white' }} />
              : getInitials(fullName || 'DG')}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-2">

          {/* Loading state */}
          {loading && (
            <div className="flex justify-center py-6">
              <CircularProgress size={28} sx={{ color: '#2563eb' }} />
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <p className="text-center py-4 text-sm" style={{ color: '#ef4444' }}>
              {error}
            </p>
          )}

          {/* Profile data */}
          {!loading && !error && profile && (
            <>
              {/* Name + role badge */}
              <div className="text-center mb-3">
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{
                      background: isDark ? t.insetBg : '#dbeafe',
                      color     : isDark ? '#a3a3a3' : '#1d4ed8',
                    }}
                  >
                    {/* Show the human-readable role name e.g. "Super Admin" */}
                    {profile.first_name + ' ' + profile.last_name}
                  </span>
                </div>
              </div>

              {/* Info rows — null values display as "-" via InfoRow */}
              <div className="space-y-1.5">
                <InfoRow icon={<MdEmail />}              label="Email"      value={profile.email} />
                <InfoRow icon={<MdPhone />}              label="Phone No"   value={profile.phone} />
                <InfoRow icon={<MdAdminPanelSettings />} label="Role"       value={profile.base_role} />
                <InfoRow icon={<MdBusiness />}           label="Company"    value={profile.company_name} />
                <InfoRow
                  icon={<MdCalendarToday />}
                  label="Last Login"
                  value={formatLastLogin(profile.last_login_at)}
                />
              </div>

              {/* Change Password — collapsible inline form */}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => (showChangePassword ? resetPasswordForm() : setShowChangePassword(true))}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: t.insetBg, color: t.textPrimary, border: 'none', cursor: 'pointer', fontFamily: t.fontFamily }}
                >
                  <MdLockOutline size={17} style={{ color: '#2563eb' }} />
                  Change Password
                </button>

                {showChangePassword && (
                  <form onSubmit={handleChangePasswordSubmit} noValidate className="space-y-3 mt-2.5">
                    <TextField
                      fullWidth required size="small" label="Current Password"
                      type={pwdVisibility.old ? 'text' : 'password'}
                      value={pwdForm.old_password}
                      onChange={(e) => handlePwdChange('old_password', e.target.value)}
                      error={!!pwdErrors.old_password}
                      helperText={pwdErrors.old_password}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><Lock sx={{ fontSize: 17.5, color: t.textSecondary }} /></InputAdornment>,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setPwdVisibility((p) => ({ ...p, old: !p.old }))}>
                              {pwdVisibility.old ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={pwdFieldSx}
                    />
                    <TextField
                      fullWidth required size="small" label="New Password"
                      type={pwdVisibility.new ? 'text' : 'password'}
                      value={pwdForm.new_password}
                      onChange={(e) => handlePwdChange('new_password', e.target.value)}
                      error={!!pwdErrors.new_password}
                      helperText={pwdErrors.new_password || `At least ${MIN_NEW_PASSWORD_LENGTH} characters`}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><Lock sx={{ fontSize: 17.5, color: t.textSecondary }} /></InputAdornment>,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setPwdVisibility((p) => ({ ...p, new: !p.new }))}>
                              {pwdVisibility.new ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={pwdFieldSx}
                    />
                    <TextField
                      fullWidth required size="small" label="Confirm New Password"
                      type={pwdVisibility.confirm ? 'text' : 'password'}
                      value={pwdForm.confirm_password}
                      onChange={(e) => handlePwdChange('confirm_password', e.target.value)}
                      error={!!pwdErrors.confirm_password}
                      helperText={pwdErrors.confirm_password}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><Lock sx={{ fontSize: 17.5, color: t.textSecondary }} /></InputAdornment>,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setPwdVisibility((p) => ({ ...p, confirm: !p.confirm }))}>
                              {pwdVisibility.confirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={pwdFieldSx}
                    />
                    <button
                      type="submit"
                      disabled={pwdSaving}
                      className="w-full py-2 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                      style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', cursor: 'pointer', fontFamily: t.fontFamily }}
                    >
                      {pwdSaving ? (<><CircularProgress size={16} sx={{ color: 'white' }} /> Updating...</>) : 'Update Password'}
                    </button>
                  </form>
                )}
              </div>
            </>
          )}

          {/* Fallback: no data, no error, not loading */}
          {!loading && !error && !profile && (
            <p className="text-center py-4 text-sm" style={{ color: t.textPrimary }}>
              Failed to load profile. Please try again.
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 px-5 py-3"
          style={{ borderTop: `1px solid ${t.divider}` }}
        >
          <button
            onClick={() => dispatch(closeProfileModal())}
            className="w-full py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background : t.btnSecondaryBg,
              color      : t.btnSecondaryText,
              border     : 'none',
              cursor     : 'pointer',
              fontFamily : t.fontFamily,
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = t.btnSecondaryHover)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = t.btnSecondaryBg)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;