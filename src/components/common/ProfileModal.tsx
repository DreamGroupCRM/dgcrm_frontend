// ==========================================
// DREAM GROUP CRM - PROFILE MODAL (UPDATED)
// ==========================================
//
// CHANGES IN THIS VERSION:
//   1. Width increased ~5% (max-w-md instead of max-w-sm)
//   2. Height reduced ~5% — compact padding, tighter spacing
//   3. Internal vertical scroll on content area
//   4. Clicking OUTSIDE does NOT close the modal
//   5. Only Close icon OR Cancel button closes it
//   6. Cancel button added at bottom
//
import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { closeProfileModal } from '../../redux/slices/profileSlice';
import { fetchProfileThunk } from '../../redux/thunks/profileThunks';
import { getInitials, formatDate } from '../../utils';
import { CircularProgress } from '@mui/material';
import {
  MdClose, MdEmail, MdPhone, MdBadge,
  MdCalendarToday, MdLocationOn,
} from 'react-icons/md';

const ProfileModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const { profileModalOpen, profile, loading } = useAppSelector((s) => s.profile);
  const { mode } = useAppSelector((s) => s.theme);
  const isDark = mode === 'dark';

  // Fetch profile only once when modal opens and no profile cached
  useEffect(() => {
    if (profileModalOpen && !profile) {
      dispatch(fetchProfileThunk());
    }
  }, [profileModalOpen, profile, dispatch]);

  if (!profileModalOpen) return null;

  const InfoRow = ({
    icon,
    label,
    value,
  }: {
    icon: React.ReactNode;
    label: string;
    value?: string;
  }) => (
    <div
      className={`flex items-center gap-2.5 p-2.5 rounded-xl ${
        isDark ? 'bg-gray-800/80' : 'bg-gray-50'
      }`}
    >
      <span className="text-green-500 text-lg flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p
          className={`text-xs font-medium leading-none mb-0.5 ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          {label}
        </p>
        <p
          className={`text-sm font-semibold truncate ${
            isDark ? 'text-gray-100' : 'text-gray-800'
          }`}
        >
          {value || 'N/A'}
        </p>
      </div>
    </div>
  );

  return (
    // ── Backdrop ──
    // onClick is intentionally NOT attached here — modal only closes via
    // the close icon or Cancel button (requirement #4).
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      {/* ── Modal shell ── */}
      <div
        className={`relative w-full shadow-2xl animate-fade-in profile-modal flex flex-col ${
          isDark
            ? 'bg-gray-900 border border-gray-700'
            : 'bg-white border border-gray-200'
        }`}
        style={{
          maxWidth: 420,          // ~5% wider than previous max-w-sm (384px)
          maxHeight: '85vh',      // ~5% less than a full 90vh modal
          borderRadius: '2rem',
          overflow: 'hidden',
        }}
        // Prevent any accidental propagation (belt & suspenders)
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Fixed Header Banner ── */}
        <div
          className="flex-shrink-0 relative px-5 pt-5 pb-12 text-center">          {/* Close icon — only way to dismiss (besides Cancel button) */}
          <button
            onClick={() => dispatch(closeProfileModal())}
            className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-white/10
              flex items-center justify-center text-white/70 hover:text-white
              hover:bg-white/20 transition-all"
            title="Close"
          >
            <MdClose size={16} />
          </button>
          <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-0.5">
            My Profile
          </p>
          <h2 className="text-white font-display font-bold text-lg">
            Dream Group CRM
          </h2>
        </div>

        {/* ── Avatar overlapping banner ── */}
        <div className="flex-shrink-0 flex justify-center -mt-9 mb-2 px-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center
              text-white text-xl font-bold shadow-lg border-3"
            style={{
              background: 'linear-gradient(135deg, #1a5c38, #d97706)',
              borderColor: isDark ? '#1f2937' : 'white',
              borderWidth: 3,
            }}
          >
            {loading ? (
              <CircularProgress size={22} sx={{ color: 'white' }} />
            ) : (
              getInitials(profile?.fullName || 'DG')
            )}
          </div>
        </div>

        {/* ── Scrollable Content ── */}
        <div className="flex-1 overflow-y-auto px-5 pb-2">
          {loading ? (
            <div className="flex justify-center py-6">
              <CircularProgress size={28} sx={{ color: '#1a5c38' }} />
            </div>
          ) : profile ? (
            <>
              {/* Name + Role badge */}
              <div className="text-center mb-3">
                <h3
                  className={`font-display font-bold text-base ${
                    isDark ? 'text-white' : 'text-gray-800'
                  }`}
                >
                  {profile.fullName}
                </h3>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      profile.role === 'Admin'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {profile.role}
                  </span>
                  {profile.isActive && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Active
                    </span>
                  )}
                </div>
              </div>

              {/* Info rows — compact spacing */}
              <div className="space-y-1.5">
                <InfoRow icon={<MdEmail />} label="Email" value={profile.email} />
                <InfoRow icon={<MdPhone />} label="Mobile" value={profile.mobile} />
                <InfoRow icon={<MdBadge />} label="Department" value={profile.department} />
                <InfoRow icon={<MdBadge />} label="Designation" value={profile.designation} />
                <InfoRow icon={<MdLocationOn />} label="Address" value={profile.address} />
                <InfoRow
                  icon={<MdCalendarToday />}
                  label="Joined"
                  value={formatDate(profile.joinedAt || '')}
                />
              </div>
            </>
          ) : (
            <p className="text-center text-gray-500 py-4 text-sm">
              Failed to load profile. Please try again.
            </p>
          )}
        </div>

        {/* ── Fixed Footer with Cancel button ── */}
        <div
          className={`flex-shrink-0 px-5 py-3 border-t ${
            isDark ? 'border-gray-700/50' : 'border-gray-100'
          }`}
        >
          <button
            onClick={() => dispatch(closeProfileModal())}
            className={`w-full py-2 rounded-xl text-sm font-semibold transition-all ${
              isDark
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
