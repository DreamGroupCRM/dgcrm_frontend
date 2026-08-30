// src/pages/masters/RoleCrudPage.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Chip,
  Divider,
} from '@mui/material';
import { FiArrowLeft, FiSave, FiEdit2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import {
  fetchRoleById,
  createRole,
  updateRole,
} from '../../../../services/roleService';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  mode: 'add' | 'edit' | 'view';
}

// ─────────────────────────────────────────────────────────────────────────────
// Field — defined at MODULE LEVEL to prevent remount on every keystroke
// ─────────────────────────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  readOnly?: boolean;
  isDark: boolean;
  borderC: string;
  textPrim: string;
  textSec: string;
}

const Field: React.FC<FieldProps> = ({
  label, value, onChange, onBlur, error,
  readOnly, isDark, borderC, textPrim,
}) => (
  <Box sx={{ mb: 3 }}>
    <Typography
      variant="body2"
      sx={{
        color: textPrim,
        fontWeight: 600,
        mb: 0.75,
        fontSize: '0.82rem',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {label}
      {!readOnly && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
    </Typography>

    {readOnly ? (
      <Box
        sx={{
          px: 2, py: 1.5, borderRadius: 2,
          border: `1px solid ${borderC}`,
          background: isDark ? '#0f172a' : '#f8faff',
          color: textPrim, fontSize: '0.95rem',
          fontWeight: 500, minHeight: 44,
        }}
      >
        {value || '—'}
      </Box>
    ) : (
      <TextField
        fullWidth size="small" value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        error={!!error}
        helperText={error}
        placeholder={`Enter ${label}`}
        sx={{
          '& .MuiOutlinedInput-root': {
            background: isDark ? '#0f172a' : '#fff',
            borderRadius: 2, color: textPrim, fontSize: '0.95rem',
            '& fieldset': { borderColor: error ? '#ef4444' : borderC },
            '&:hover fieldset': { borderColor: error ? '#ef4444' : '#3b82f6' },
            '&.Mui-focused fieldset': { borderColor: error ? '#ef4444' : '#3b82f6' },
          },
          '& .MuiFormHelperText-root': { color: '#ef4444', fontSize: '0.78rem', mt: 0.5, ml: 0 },
          '& input': { color: textPrim },
        }}
      />
    )}
  </Box>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const RoleCrudPage: React.FC<Props> = ({ mode }) => {
  const navigate   = useNavigate();
  const { id }     = useParams<{ id: string }>();
  const theme      = useTheme();
  const isMobile   = useMediaQuery(theme.breakpoints.down('sm'));

  const isDark    = theme.palette.mode === 'dark';
  const cardBg    = isDark ? '#1e1e2e' : '#ffffff';
  const headerBg  = isDark ? '#16213e' : '#f0f4ff';
  const borderC   = isDark ? '#2a2a3e' : '#d1d5db';
  const textPrim  = isDark ? '#e2e8f0' : '#1e293b';
  const textSec   = isDark ? '#94a3b8' : '#64748b';

  // ── state ──────────────────────────────────────────────────────────────
  const [name, setName]           = useState('');
  const [nameError, setNameError] = useState('');
  const [isActive, setIsActive]   = useState(true);
  const [fetching, setFetching]   = useState(false);
  const [saving, setSaving]       = useState(false);

  // ── fetch for view / edit ──────────────────────────────────────────────
  useEffect(() => {
    if ((mode === 'view' || mode === 'edit') && id) {
      loadRole();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id]);

  const loadRole = async () => {
    setFetching(true);
    try {
      const res = await fetchRoleById(id!);
      setName(res.data.name || '');
      setIsActive(res.data.is_active ?? true);
    } catch (err: any) {
      console.error('[RoleCrudPage] loadRole error:', err);
      toast.error(err?.response?.data?.message || 'Failed to Fetch Role');
      navigate('/admin/masters/roles');
    } finally {
      setFetching(false);
    }
  };

  // ── validation ─────────────────────────────────────────────────────────
  const validateName = (): boolean => {
    if (!name.trim()) {
      setNameError('Please enter role name');
      return false;
    }
    setNameError('');
    return true;
  };

  const isFormValid = name.trim().length > 0;

  // ── submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateName()) return;
    setSaving(true);
    try {
      if (mode === 'add') {
        await createRole({ name: name.trim(), base_role: 'employee', is_active: true });
        toast.success('Role Created Successfully', { autoClose: 1000 });
      } else if (mode === 'edit') {
        await updateRole(id!, { name: name.trim(), base_role: 'employee', is_active: isActive });
        toast.success('Role Updated Successfully', { autoClose: 1000 });
      }
      navigate('/admin/masters/roles');
    } catch (err: any) {
      console.error('[RoleCrudPage] handleSubmit error:', err);
      toast.error(err?.response?.data?.message || 'Operation Failed');
    } finally {
      setSaving(false);
    }
  };

  // ── page meta ──────────────────────────────────────────────────────────
  const pageTitle =
    mode === 'add'  ? 'Add Role'  :
    mode === 'edit' ? 'Edit Role' : 'View Role';

  const pageSubtitle =
    mode === 'add'  ? 'Fill in the details to create a new role'  :
    mode === 'edit' ? 'Update the role information'               :
                     'Role details (read-only)';

  if (fetching) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#3b82f6' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100vh' }}>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5" fontWeight={700}
          sx={{ color: textPrim, fontFamily: 'Cambria, Georgia, serif' }}
        >
          {pageTitle}
        </Typography>
        <Typography variant="body2" sx={{ color: textPrim, mt: 0.5 }}>
          {pageSubtitle}
        </Typography>
      </Box>

      {/* ── Card ────────────────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${borderC}`,
          background: cardBg,
          overflow: 'hidden',
          maxWidth: 600,
          mx: 'auto',
        }}
      >
        {/* Card Header */}
        <Box
          sx={{
            px: { xs: 2, sm: 3 }, py: 2,
            background: headerBg,
            borderBottom: `1px solid ${borderC}`,
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36, height: 36, borderRadius: 2,
                background: '#2563eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <FiEdit2 size={16} color="#fff" />
            </Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: textPrim }}>
              Role Information
            </Typography>
          </Box>

          {mode !== 'add' && (
            <Chip
              label={isActive ? 'Active' : 'Inactive'}
              size="small"
              sx={{
                fontWeight: 600, fontSize: '0.72rem',
                background: isActive
                  ? isDark ? 'rgba(34,197,94,0.15)' : '#dcfce7'
                  : isDark ? 'rgba(239,68,68,0.15)'  : '#fee2e2',
                color: isActive
                  ? isDark ? '#4ade80' : '#16a34a'
                  : isDark ? '#f87171' : '#dc2626',
              }}
            />
          )}
        </Box>

        {/* Form Body */}
        <Box sx={{ px: { xs: 2, sm: 3 }, pt: 3, pb: 2 }}>
          <Field
            label="Role Name"
            value={name}
            onChange={(v) => { setName(v); if (nameError) setNameError(''); }}
            onBlur={validateName}
            error={nameError}
            readOnly={mode === 'view'}
            isDark={isDark}
            borderC={borderC}
            textPrim={textPrim}
            textSec={textSec}
          />
        </Box>

        <Divider sx={{ borderColor: borderC }} />

        {/* ── Action Buttons ───────────────────────────────────────────── */}
        <Box
          sx={{
            px: { xs: 2, sm: 3 }, py: 2.5,
            display: 'flex', justifyContent: 'center',
            gap: 2, flexWrap: 'wrap',
          }}
        >
          <Button
            variant="outlined"
            startIcon={<FiArrowLeft />}
            onClick={() => navigate('/admin/masters/roles')}
            sx={{
              borderColor: borderC, color: textPrim, borderRadius: 2,
              textTransform: 'none', fontWeight: 600, px: 3, py: 1.1,
              fontSize: '0.875rem',
              '&:hover': { borderColor: '#3b82f6', color: '#3b82f6', background: 'rgba(59,130,246,0.05)' },
            }}
          >
            Go Back
          </Button>

          {mode !== 'view' && (
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <FiSave />}
              onClick={handleSubmit}
              disabled={!isFormValid || saving}
              sx={{
                background: isFormValid && !saving ? '#2563eb' : undefined,
                borderRadius: 2, textTransform: 'none', fontWeight: 600,
                px: 3, py: 1.1, fontSize: '0.875rem',
                boxShadow: 'none',
                '&:hover': {
                  background: isFormValid ? '#1d4ed8' : undefined,
                },
                '&.Mui-disabled': {
                  background: isDark ? '#2a2a3e' : '#e2e8f0',
                  color: isDark ? '#4b5563' : '#94a3b8',
                },
              }}
            >
              {saving ? 'Saving...' : mode === 'add' ? 'Create Role' : 'Update Role'}
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default RoleCrudPage;
