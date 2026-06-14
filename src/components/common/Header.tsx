// ==========================================
// DREAM GROUP CRM - HEADER COMPONENT
// ==========================================
// Theme: full black (dark) / full white (light)
// Hover: gray (dark) / blue (light)
// Font: Inter throughout

import React from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { toggleTheme } from '../../redux/slices/themeSlice';
import { openProfileModal } from '../../redux/slices/profileSlice';
import { logoutThunk } from '../../redux/thunks/authThunks';
import { clearProfile } from '../../redux/slices/profileSlice';
import { showAlert, getInitials } from '../../utils';
import { SOCIAL_LINKS, ROUTES } from '../../constants';
import { getTheme } from '../../styles/theme';

import { FiSun, FiMoon } from 'react-icons/fi';
import { AiOutlineInstagram, AiOutlineWhatsApp } from 'react-icons/ai';
import { FaFacebookF } from 'react-icons/fa';
import { MdLogout } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import StickyNotesPanel from './StickyNotesPanel';

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

// ── Reusable icon button — handles hover state inline ──
const IconBtn: React.FC<{
  onClick?: () => void;
  title: string;
  isDark: boolean;
  hoverColor?: string;  // optional override for icon hover color
  href?: string;
  children: React.ReactNode;
}> = ({ onClick, title, isDark, hoverColor, href, children }) => {
  const t = getTheme(isDark);

  const baseStyle: React.CSSProperties = {
    display        : 'inline-flex',
    alignItems     : 'center',
    justifyContent : 'center',
    padding        : '8px',
    borderRadius   : '8px',
    border         : 'none',
    background     : 'transparent',
    color          : t.textSecondary,
    cursor         : 'pointer',
    transition     : 'background 0.15s, color 0.15s',
    textDecoration : 'none',
    fontFamily     : t.fontFamily,
  };

  const onEnter = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    el.style.background = t.hoverBg;
    el.style.color      = hoverColor ?? t.hoverText;
  };
  const onLeave = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    el.style.background = 'transparent';
    el.style.color      = t.textSecondary;
  };

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" title={title}
        style={baseStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>
        {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} title={title} style={baseStyle}
      onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {children}
    </button>
  );
};

const Header: React.FC<HeaderProps> = ({ onMobileMenuToggle }) => {
  const logoImg    = '/src/assets/images/favicon_logo.png';
  const dispatch   = useAppDispatch();
  const { mode }   = useAppSelector((s) => s.theme);
  const { user, role } = useAppSelector((s) => s.auth);
  const isDark     = mode === 'dark';
  const t          = getTheme(isDark);
  const navigate   = useNavigate();

  const dashboardRoute = role === 'Admin' ? ROUTES.ADMIN.DASHBOARD : ROUTES.EMPLOYEE.DASHBOARD;
  const notesUserId    = (user as any)?.id ?? user?.email ?? 'guest';

  const handleLogout = async () => {
    const result = await showAlert.confirm('You will be Logged Out of Dream Group CRM.', 'Logout?');
    if (result.isConfirmed) {
      await showAlert.logoutSuccess();
      dispatch(logoutThunk());
      dispatch(clearProfile());
      navigate('/login', { replace: true });
    }
  };

  const Divider = () => (
    <div style={{ width: 1, height: 20, background: t.divider, flexShrink: 0 }} />
  );

  return (
    <header
      className="flex items-center justify-between px-4 lg:px-6 h-16 flex-shrink-0"
      style={{
        background  : t.headerBg,
        borderBottom: `1px solid ${t.headerBorder}`,
        boxShadow   : t.headerShadow,
        fontFamily  : t.fontFamily,
      }}
    >
      {/* LEFT: Hamburger + Logo + Brand */}
      <div className="flex items-center gap-2 min-w-0">

        {/* Hamburger (mobile only) */}
        <IconBtn onClick={onMobileMenuToggle} title="Menu" isDark={isDark}>
          <svg
            width="20" height="20" fill="none"
            stroke="currentColor" strokeWidth="2"
            className="md:hidden"
          >
            <path d="M3 6h14M3 12h14M3 18h14" strokeLinecap="round" />
          </svg>
        </IconBtn>

        {/* Logo + Brand text */}
        <button
          onClick={() => navigate(dashboardRoute)}
          className="flex items-center gap-2 flex-shrink-0 focus:outline-none"
          title="Go to Dashboard"
          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          <img
            src={logoImg}
            alt="Dream Group"
            style={{
              width       : 40,
              height      : 50,
              objectFit   : 'contain',
              mixBlendMode: isDark ? 'screen' : 'multiply',
              flexShrink  : 0,
            }}
          />
          <div className="header-brand-text hidden sm:block text-left leading-none">
            <p style={{
              fontFamily : t.fontFamily,
              fontSize   : 28,
              fontWeight : 700,
              color      : t.textPrimary,
              margin     : 1,
              whiteSpace : 'nowrap',
            }}>
              Dream Group
            </p>
            <p style={{
              fontFamily : t.fontFamily,
              fontSize   : 12,
              fontWeight : 500,
              color      : isDark ? '#a3a3a3' : '#2563eb',
              margin     : 2,
              whiteSpace : 'nowrap',
            }}>
              CRM Platform
            </p>
          </div>
        </button>
      </div>

      {/* RIGHT: controls */}
      <div className="flex items-center gap-1">

        {/* Sticky Notes */}
        <StickyNotesPanel isDark={isDark} userId={notesUserId} />

        <div className="hidden sm:block mx-1"><Divider /></div>

        {/* Social icons */}
        <div className="header-social-icons hidden sm:flex items-center gap-0.5 mr-1">
          <IconBtn href={SOCIAL_LINKS.INSTAGRAM} title="Instagram" isDark={isDark} hoverColor="#ec4899">
            <AiOutlineInstagram size={20} />
          </IconBtn>
          <IconBtn href={SOCIAL_LINKS.FACEBOOK} title="Facebook" isDark={isDark} hoverColor="#3b82f6">
            <FaFacebookF size={15} />
          </IconBtn>
          <IconBtn href={SOCIAL_LINKS.WHATSAPP} title="WhatsApp" isDark={isDark} hoverColor="#22c55e">
            <AiOutlineWhatsApp size={20} />
          </IconBtn>
        </div>

        <div className="hidden sm:block mx-1"><Divider /></div>

        {/* Theme toggle */}
        <IconBtn
          onClick={() => dispatch(toggleTheme())}
          title={isDark ? 'Switch to Light' : 'Switch to Dark'}
          isDark={isDark}
          hoverColor={isDark ? '#facc15' : '#2563eb'}
        >
          {isDark ? <FiSun size={17} /> : <FiMoon size={17} />}
        </IconBtn>

        <div className="mx-0.5"><Divider /></div>

        {/* Profile button */}
        <button
          onClick={() => dispatch(openProfileModal())}
          className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all"
          title="My Profile"
          style={{
            background : 'transparent',
            border     : 'none',
            cursor     : 'pointer',
            fontFamily : t.fontFamily,
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = t.hoverBg)}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: t.avatarGradient }}
          >
            {getInitials(user?.email || 'DG')}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold leading-none"
              style={{ color: t.textPrimary, fontFamily: t.fontFamily }}>
              {user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs mt-0.5"
              style={{ color: t.textMuted, fontFamily: t.fontFamily }}>
              {user?.role}
            </p>
          </div>
        </button>

        {/* Logout */}
        <IconBtn onClick={handleLogout} title="Logout" isDark={isDark} hoverColor="#ef4444">
          <MdLogout size={19} />
        </IconBtn>
      </div>
    </header>
  );
};

export default Header;
