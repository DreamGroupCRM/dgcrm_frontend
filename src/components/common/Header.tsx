// ==========================================
// DREAM GROUP CRM - HEADER COMPONENT (UPDATED)
// ==========================================
//
// CHANGES IN THIS VERSION:
//   1. Real logo image via <Logo> component (replaces inline SVG)
//   2. Logo + text are clickable → navigates to Dashboard
//   3. ✨ Sticky Notes panel added (just before social icons)

import React from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { toggleTheme } from '../../redux/slices/themeSlice';
import { openProfileModal } from '../../redux/slices/profileSlice';
import { logoutThunk } from '../../redux/thunks/authThunks';
import { clearProfile } from '../../redux/slices/profileSlice';
import { showAlert, getInitials } from '../../utils';
import { SOCIAL_LINKS, ROUTES } from '../../constants';

import { FiSun, FiMoon } from 'react-icons/fi';
import { AiOutlineInstagram, AiOutlineWhatsApp } from 'react-icons/ai';
import { FaFacebookF } from 'react-icons/fa';
import { MdLogout } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

import StickyNotesPanel from './StickyNotesPanel'; // ← new import

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMobileMenuToggle }) => {
  const logoImg = "/src/assets/images/logo_dream_group.png";
  const dispatch = useAppDispatch();
  const { mode } = useAppSelector((s) => s.theme);
  const { user, role } = useAppSelector((s) => s.auth);
  const isDark = mode === 'dark';
  const navigate = useNavigate();

  // Dashboard route based on role — used for logo click navigation
  const dashboardRoute =
    role === 'Admin' ? ROUTES.ADMIN.DASHBOARD : ROUTES.EMPLOYEE.DASHBOARD;

  // Stable per-user key for sticky notes localStorage
  const notesUserId = user?.id ?? user?.email ?? 'guest';

  const handleLogout = async () => {
    const result = await showAlert.confirm(
      'You will be Logged Out of Dream Group CRM.',
      'Logout?'
    );
    if (result.isConfirmed) {
      await showAlert.logoutSuccess();
      dispatch(logoutThunk());
      dispatch(clearProfile());
      navigate('/login', { replace: true });
    }
  };

  return (
    <header
      className={`flex items-center justify-between px-4 lg:px-6 h-16 flex-shrink-0 border-b ${isDark ? 'bg-gray-900 border-gray-700/50' : 'bg-white border-gray-200'
        }`}
      style={{
        boxShadow: isDark
          ? '0 1px 0 rgba(255,255,255,0.05)'
          : '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >

      {/* LEFT: Hamburger (mobile only) + Logo + Brand */}
      <div className="flex items-center gap-2 min-w-0">

        {/* Hamburger — only visible on mobile (<768px) */}
        <button
          onClick={onMobileMenuToggle}
          className={`p-2 rounded-lg md:hidden flex-shrink-0 ${isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h14M3 12h14M3 18h14" strokeLinecap="round" />
          </svg>
        </button>

        {/* Logo + Brand */}
        <button
          onClick={() => navigate(dashboardRoute)}
          className="flex items-center gap-2 bg-transparent border-0 p-0 cursor-pointer focus:outline-none flex-shrink-0"
          title="Go to Dashboard"
        >
          <img
            src={logoImg}
            alt="Dream Group"
            style={{
              width: 40,
              height: 50,
              objectFit: 'contain',
              mixBlendMode: isDark ? 'screen' : 'multiply',
              flexShrink: 0,
            }}
          />
          {/* Brand text — hidden on mobile, shown on sm+ */}
          <div className="header-brand-text hidden sm:block text-left leading-none">
            <p style={{
              fontFamily: '"Cambria", serif',
              fontSize: 30,
              fontWeight: 700,
              color: isDark ? '#ffffff' : '#1a5c38',
              margin: 1,
              whiteSpace: 'nowrap',
            }}>
              Dream Group
            </p>
            <p style={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: 13,
              fontWeight: 500,
              color: '#d97706',
              margin: 2,
              whiteSpace: 'nowrap',
            }}>
              CRM Platform
            </p>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-1">

        {/* ✨ Sticky Notes — sits just before the social icons */}
        <StickyNotesPanel isDark={isDark} userId={notesUserId} />

        {/* Divider */}
        <div
          className={`hidden sm:block w-px h-5 mx-1 ${isDark ? 'bg-gray-700' : 'bg-gray-200'
            }`}
        />

        {/* Social Icons */}
        <div className="header-social-icons hidden sm:flex items-center gap-0.5 mr-1">
          <a
            href={SOCIAL_LINKS.INSTAGRAM}
            target="_blank"
            rel="noreferrer"
            className={`p-2 rounded-lg transition-colors ${isDark
                ? 'text-gray-400 hover:text-pink-400 hover:bg-gray-800'
                : 'text-gray-500 hover:text-pink-500 hover:bg-gray-100'
              }`}
            title="Instagram"
          >
            <AiOutlineInstagram size={20} />
          </a>
          <a
            href={SOCIAL_LINKS.FACEBOOK}
            target="_blank"
            rel="noreferrer"
            className={`p-2 rounded-lg transition-colors ${isDark
                ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-800'
                : 'text-gray-500 hover:text-blue-500 hover:bg-gray-100'
              }`}
            title="Facebook"
          >
            <FaFacebookF size={15} />
          </a>
          <a
            href={SOCIAL_LINKS.WHATSAPP}
            target="_blank"
            rel="noreferrer"
            className={`p-2 rounded-lg transition-colors ${isDark
                ? 'text-gray-400 hover:text-green-400 hover:bg-gray-800'
                : 'text-gray-500 hover:text-green-500 hover:bg-gray-100'
              }`}
            title="WhatsApp"
          >
            <AiOutlineWhatsApp size={20} />
          </a>
        </div>

        {/* Divider */}
        <div
          className={`hidden sm:block w-px h-5 mx-1 ${isDark ? 'bg-gray-700' : 'bg-gray-200'
            }`}
        />

        {/* Quick dark/light toggle */}
        <button
          onClick={() => dispatch(toggleTheme())}
          className={`p-2 rounded-lg transition-all ${isDark
              ? 'text-yellow-400 hover:bg-gray-800'
              : 'text-gray-500 hover:bg-gray-100'
            }`}
          title={isDark ? 'Switch to Light' : 'Switch to Dark'}
        >
          {isDark ? <FiSun size={17} /> : <FiMoon size={17} />}
        </button>

        {/* Divider */}
        <div
          className={`w-px h-5 mx-0.5 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
        />

        {/* Profile Button */}
        <button
          onClick={() => dispatch(openProfileModal())}
          className={`flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            }`}
          title="My Profile"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1a5c38, #d97706)' }}
          >
            {getInitials(user?.email || 'DG')}
          </div>
          <div className="hidden md:block text-left">
            <p
              className={`text-xs font-semibold leading-none ${isDark ? 'text-gray-200' : 'text-gray-700'
                }`}
            >
              {user?.email?.split('@')[0] || 'User'}
            </p>
            <p
              className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'
                }`}
            >
              {user?.role}
            </p>
          </div>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={`p-2 rounded-lg transition-colors ${isDark
              ? 'text-gray-400 hover:text-red-400 hover:bg-gray-800'
              : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
            }`}
          title="Logout"
        >
          <MdLogout size={19} />
        </button>
      </div>
    </header>
  );
};

export default Header;
