// ==========================================
// DREAM GROUP CRM - PLACEHOLDER PAGE
// ==========================================
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppDispatch } from '../../hooks';
import { setPageTitle } from '../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../styles/appearanceTokens';
import { MdConstruction } from 'react-icons/md';

interface PlaceholderPageProps {
  title       : string;
  description?: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description }) => {
  const dispatch  = useAppDispatch();
  const { isDark, t } = useAppearanceTokens();
  const location  = useLocation();

  useEffect(() => { dispatch(setPageTitle(title)); }, [dispatch, title]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
      style={{ fontFamily: t.fontFamily }}
    >
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: t.insetBg }}
      >
        <MdConstruction size={40} style={{ color: isDark ? '#3b82f6' : '#2563eb' }} />
      </div>

      <h1 className="text-2xl font-bold mb-3" style={{ color: t.textPrimary, fontFamily: t.fontFamily }}>
        {title}
      </h1>

      <p className="max-w-sm mb-2" style={{ color: t.textSecondary }}>
        {description || 'This module is under active development. Connect your backend API to bring this section to life.'}
      </p>

      <p
        className="text-xs font-mono mt-2 px-3 py-1 rounded-full"
        style={{ background: t.insetBg, color: t.textPrimary }}
      >
        {location.pathname}
      </p>

      <div
        className="mt-6 px-4 py-2 rounded-xl text-sm font-semibold text-white"
        style={{
          background: isDark ? '#1e3a5f' : '#1d4ed8',
          fontFamily: t.fontFamily,
        }}
      >
        Dream Group CRM — Coming Soon
      </div>
    </div>
  );
};

export default PlaceholderPage;
