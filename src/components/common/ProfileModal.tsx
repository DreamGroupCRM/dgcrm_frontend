// ==========================================
// DREAM GROUP CRM - PROFILE MODAL
// ==========================================
import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { closeProfileModal } from '../../redux/slices/profileSlice';
import { fetchProfileThunk } from '../../redux/thunks/profileThunks';
import { getInitials, formatLastLogin } from '../../utils';
import { getTheme } from '../../styles/theme';
import { CircularProgress } from '@mui/material';
import {
  MdClose, MdEmail, MdPhone, MdBadge,
  MdCalendarToday, MdBusiness, MdAdminPanelSettings,
} from 'react-icons/md';

const ProfileModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const { profileModalOpen, profile, loading, error } = useAppSelector((s) => s.profile);
  const { mode } = useAppSelector((s) => s.theme);
  const isDark   = mode === 'dark';
  const t        = getTheme(isDark);

  // Fetch profile from API when the modal is opened and data is not yet loaded
  useEffect(() => {
    if (profileModalOpen && !profile) dispatch(fetchProfileThunk());
  }, [profileModalOpen, profile, dispatch]);

  if (!profileModalOpen) return null;

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
          style={{ color: t.textMuted, fontFamily: t.fontFamily }}>
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
                    {profile.role_name || profile.base_role || '-'}
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
            </>
          )}

          {/* Fallback: no data, no error, not loading */}
          {!loading && !error && !profile && (
            <p className="text-center py-4 text-sm" style={{ color: t.textMuted }}>
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