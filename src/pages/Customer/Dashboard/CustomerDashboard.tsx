// ==========================================
// DREAM GROUP CRM - CUSTOMER DASHBOARD (TEMPORARY)
// ==========================================
// The customer dashboard hasn't been designed yet — this is a deliberately
// minimal placeholder so Customer First Login has somewhere real to land.
// Replace with the real customer experience once it's decided; nothing else
// in the Customer First Login flow depends on what this page looks like.
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../hooks';
import { logoutThunk } from '../../../redux/thunks/authThunks';
import { fetchProfileThunk } from '../../../redux/thunks/profileThunks';
import { ROUTES } from '../../../constants';
import { getTheme } from '../../../styles/theme';
import { CircularProgress } from '@mui/material';
import { MdLogout } from 'react-icons/md';
import Logo from '../../../components/ui/Logo';

const CustomerDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { mode } = useAppSelector((s) => s.theme);
  const { profile, loading } = useAppSelector((s) => s.profile);
  const isDark = mode === 'dark';
  const t = getTheme(isDark);

  useEffect(() => {
    if (!profile) dispatch(fetchProfileThunk());
  }, [profile, dispatch]);

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    navigate(ROUTES.LOGIN, { replace: true });
  };

  const firstName = profile?.first_name || '';

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: t.pageBg, fontFamily: t.fontFamily }}
    >
      {/* Minimal top bar — just the logo and a logout action */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: `1px solid ${t.divider}` }}
      >
        <Logo size="sm" withText textColor={isDark ? 'text-white' : 'text-gray-900'} />
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold"
          style={{ background: t.btnSecondaryBg, color: t.btnSecondaryText, border: 'none', cursor: 'pointer' }}
        >
          <MdLogout size={16} /> Logout
        </button>
      </div>

      {/* Welcome content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        {loading ? (
          <CircularProgress size={28} sx={{ color: '#2563eb' }} />
        ) : (
          <>
            <h1
              className="text-4xl sm:text-5xl font-bold mb-3 tracking-tight"
              style={{ color: t.textPrimary, fontFamily: t.fontFamily }}
            >
              DGCRM
            </h1>
            <p className="text-lg" style={{ color: t.textSecondary }}>
              {firstName ? `Welcome, ${firstName}!` : 'Welcome!'}
            </p>
            <p className="text-sm mt-2 max-w-sm" style={{ color: t.textMuted }}>
              Your customer dashboard is coming soon. Thanks for activating your account.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
