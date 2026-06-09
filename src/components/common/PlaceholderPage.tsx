// ==========================================
// DREAM GROUP CRM - PLACEHOLDER PAGE
// ==========================================
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { setPageTitle } from '../../redux/slices/uiSlice';
import { MdConstruction } from 'react-icons/md';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description }) => {
  const dispatch = useAppDispatch();
  const { mode } = useAppSelector((s) => s.theme);
  const isDark = mode === 'dark';
  const location = useLocation();

  useEffect(() => {
    dispatch(setPageTitle(title));
  }, [dispatch, title]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div
        className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${
          isDark ? 'bg-gray-800' : 'bg-green-50'
        }`}
      >
        <MdConstruction size={40} className="text-green-600" />
      </div>
      <h1
        className={`font-display text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}
      >
        {title}
      </h1>
      <p className={`max-w-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {description || `This module is under active development. Connect your backend API to bring this section to life.`}
      </p>
      <p className={`text-xs font-mono mt-2 px-3 py-1 rounded-full ${isDark ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
        {location.pathname}
      </p>
      <div
        className="mt-6 px-4 py-2 rounded-xl text-sm font-semibold text-white"
        style={{ background: 'linear-gradient(135deg, #1a5c38, #2d7a4f)' }}
      >
        Dream Group CRM — Coming Soon
      </div>
    </div>
  );
};

export default PlaceholderPage;
