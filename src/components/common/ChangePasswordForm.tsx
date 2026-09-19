// ==========================================
// DGCRM — CHANGE PASSWORD (shared form)
// ==========================================
// ONE form, used by both logins:
//   • employees/admins — inside ProfileModal (the header avatar menu)
//   • customers        — inside the customer portal's own profile modal
//
// There is no second implementation for customers, because there is no
// second authentication system to write one against: employees and
// customers are rows in the same `users` table, authenticated by the same
// session mechanism, and middleware/auth.ts deliberately lets a 'customer'
// session reach /api/auth/*. Both sides therefore post to the same
// already-existing endpoint, POST /api/auth/change-password, and the
// server applies the same rules to both.
//
// The checks below are a convenience so the user gets an answer without a
// round trip. They are NOT the control — auth.service.ts's changePassword
// re-verifies the current password against the stored bcrypt hash,
// re-checks the length, re-checks the confirmation, and refuses a new
// password equal to the current one. Passing this form does not mean the
// server will accept the change.
//
// Nothing here writes a password anywhere but the request body: no
// localStorage, no query string, no logging, and the component clears its
// own state on success and on close.
import React, { useState } from 'react';
import { CircularProgress, InputAdornment, IconButton, TextField } from '@mui/material';
import { Visibility, VisibilityOff, Lock } from '@mui/icons-material';
import { AppTheme } from '../../styles/theme';
import { authService } from '../../services/authService';
import { showAlert } from '../../utils';

// Matches the server's own minimum for this endpoint (auth.service.ts's
// MIN_CHANGE_PASSWORD_LENGTH / ChangePasswordSchema). Deliberately not the
// stronger 8-character rule used for first-login and forgot-password
// resets: raising it here would start rejecting passwords that live
// accounts already have.
export const MIN_NEW_PASSWORD_LENGTH = 6;

type Field = 'old_password' | 'new_password' | 'confirm_password';

const EMPTY = { old_password: '', new_password: '', confirm_password: '' };

export interface ChangePasswordFormProps {
  t: AppTheme;
  /** Called after the server confirms the change. */
  onSuccess?: () => void;
  /** Rendered next to the submit button — e.g. a Cancel control. */
  secondaryAction?: React.ReactNode;
  submitLabel?: string;
}

const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({
  t, onSuccess, secondaryAction, submitLabel = 'Update Password',
}) => {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState(EMPTY);
  const [visible, setVisible] = useState({ old: false, new: false, confirm: false });
  const [saving, setSaving] = useState(false);

  const set = (field: Field, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    // Clear that field's error as soon as the user starts fixing it.
    setErrors((p) => (p[field] ? { ...p, [field]: '' } : p));
  };

  const validate = () => ({
    old_password: form.old_password ? '' : 'Current password is required.',
    new_password:
      !form.new_password ? 'New password is required.'
      : form.new_password.length < MIN_NEW_PASSWORD_LENGTH ? `New password must be at least ${MIN_NEW_PASSWORD_LENGTH} characters.`
      : form.new_password === form.old_password ? 'New password must be different from the current password.'
      : '',
    confirm_password:
      !form.confirm_password ? 'Please re-enter the new password.'
      : form.confirm_password !== form.new_password ? 'Passwords do not match.'
      : '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (next.old_password || next.new_password || next.confirm_password) return;

    setSaving(true);
    try {
      // confirm_password is sent so the server can re-check it rather than
      // trusting this form to have done so.
      await authService.changePassword({
        old_password: form.old_password,
        new_password: form.new_password,
        confirm_password: form.confirm_password,
      });
      setForm(EMPTY);
      setErrors(EMPTY);
      showAlert.success('Password changed successfully');
      onSuccess?.();
    } catch (err) {
      // The server's own message is the useful one ("Old password is
      // incorrect", "New password must be different from the current
      // password"), so show it rather than a generic failure. It never
      // contains a password — see auth.service.ts.
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Failed to change password. Please try again.';
      // Put a wrong-current-password error on the field it belongs to as
      // well as in the alert, so the user can see what to fix.
      if (/old password/i.test(message)) setErrors((p) => ({ ...p, old_password: message }));
      else if (/different from the current/i.test(message)) setErrors((p) => ({ ...p, new_password: message }));
      else if (/do not match/i.test(message)) setErrors((p) => ({ ...p, confirm_password: message }));
      showAlert.error(message);
    } finally {
      setSaving(false);
    }
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      background: t.inputBg,
      color: t.inputText,
      '& fieldset': { borderColor: t.inputBorder },
      '&:hover fieldset': { borderColor: t.inputFocusBorder },
      '&.Mui-focused fieldset': { borderColor: t.accentText },
      '&.Mui-error fieldset': { borderColor: '#ef4444' },
    },
    '& .MuiOutlinedInput-input': { color: t.inputText },
    // Placeholder text inherits the input color at a low opacity, which is
    // unreadable on the black theme — pin it to the muted token instead.
    '& .MuiOutlinedInput-input::placeholder': { color: t.textMuted, opacity: 1 },
    '& .MuiInputLabel-root': { color: t.textSecondary },
    '& .MuiInputLabel-root.Mui-focused': { color: t.accentText },
    '& .MuiFormHelperText-root': { color: t.textMuted },
    '& .MuiFormHelperText-root.Mui-error': { color: '#ef4444' },
  };

  const field = (
    name: Field,
    key: 'old' | 'new' | 'confirm',
    label: string,
    helper?: string,
  ) => (
    <TextField
      fullWidth required size="small" label={label}
      type={visible[key] ? 'text' : 'password'}
      value={form[name]}
      onChange={(e) => set(name, e.target.value)}
      error={!!errors[name]}
      helperText={errors[name] || helper || ' '}
      autoComplete={name === 'old_password' ? 'current-password' : 'new-password'}
      InputProps={{
        startAdornment: <InputAdornment position="start"><Lock sx={{ fontSize: 17.5, color: t.textSecondary }} /></InputAdornment>,
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              size="small"
              aria-label={visible[key] ? `Hide ${label}` : `Show ${label}`}
              onClick={() => setVisible((p) => ({ ...p, [key]: !p[key] }))}
              sx={{ color: t.textSecondary }}
            >
              {visible[key] ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
      sx={fieldSx}
    />
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-1">
      {field('old_password', 'old', 'Current Password')}
      {field('new_password', 'new', 'New Password', `At least ${MIN_NEW_PASSWORD_LENGTH} characters, and different from your current password`)}
      {field('confirm_password', 'confirm', 'Confirm New Password')}
      <div className="flex items-center gap-2 pt-1">
        {secondaryAction}
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          style={{ background: 'var(--brand-gradient)', border: 'none', cursor: 'pointer', fontFamily: t.fontFamily }}
        >
          {saving ? (<><CircularProgress size={16} sx={{ color: 'white' }} /> Updating...</>) : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default ChangePasswordForm;
