// ==========================================
// DREAM GROUP CRM - HEADER COMPONENT
// ==========================================

import React, { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { toggleTheme } from '../../redux/slices/themeSlice';
import { openProfileModal } from '../../redux/slices/profileSlice';
import { logoutThunk } from '../../redux/thunks/authThunks';
import { clearProfile } from '../../redux/slices/profileSlice';
import { showAlert, getInitials } from '../../utils';
import { SOCIAL_LINKS, ROUTES } from '../../constants';
import { getTheme } from '../../styles/theme';

import { FiSun, FiMoon, FiMoreVertical, FiSettings } from 'react-icons/fi';
import { AiOutlineInstagram, AiOutlineWhatsApp } from 'react-icons/ai';
import { FaFacebookF } from 'react-icons/fa';
import { MdLogout, MdCheckBox, MdCheckBoxOutlineBlank } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
// Same runtime check the Sidebar uses to decide desktop-rail vs mobile-drawer
// mode. Importing it (instead of re-declaring `lg:hidden` here) guarantees
// the hamburger and the desktop Collapse button can never both be visible,
// and can never both be absent.
import { useIsDesktopSidebar } from './Sidebar';

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

// ── Reusable icon button ───────────────────────────────────────────────────
const IconBtn: React.FC<{
  onClick?   : () => void;
  title      : string;
  isDark     : boolean;
  hoverColor?: string;
  href?      : string;
  children   : React.ReactNode;
  style?     : React.CSSProperties;
}> = ({ onClick, title, isDark, hoverColor, href, children, style }) => {
  const t = getTheme(isDark);
  const base: React.CSSProperties = {
    display       : 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding       : '8px', borderRadius: '8px', border: 'none',
    background    : 'transparent', color: t.textSecondary,
    cursor        : 'pointer', transition: 'background 0.15s, color 0.15s',
    textDecoration: 'none', fontFamily: t.fontFamily, flexShrink: 0,
    ...style,
  };
  const onEnter = (e: React.MouseEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).style.background = t.hoverBg;
    (e.currentTarget as HTMLElement).style.color      = hoverColor ?? t.hoverText;
  };
  const onLeave = (e: React.MouseEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).style.background = 'transparent';
    (e.currentTarget as HTMLElement).style.color      = t.textSecondary;
  };
  if (href) return (
    <a href={href} target="_blank" rel="noreferrer" title={title}
      style={base} onMouseEnter={onEnter} onMouseLeave={onLeave}>{children}</a>
  );
  return (
    <button type="button" onClick={onClick} title={title} style={base}
      onMouseEnter={onEnter} onMouseLeave={onLeave}>{children}</button>
  );
};

const Header: React.FC<HeaderProps> = ({ onMobileMenuToggle }) => {
  const logoImg  = '/src/assets/images/favicon_logo.png';
  const dispatch = useAppDispatch();
  const { mode }       = useAppSelector((s) => s.theme);
  const { user, role } = useAppSelector((s) => s.auth);
  const isDark         = mode === 'dark';
  const t              = getTheme(isDark);
  const navigate       = useNavigate();

  const dashboardRoute = role === 'admin' ? ROUTES.ADMIN.DASHBOARD : ROUTES.EMPLOYEE.DASHBOARD;
  const notesUserId    = (user as any)?.id ?? user?.email ?? 'guest';

  // Authoritative desktop/mobile switch shared with Sidebar.tsx.
  const isDesktop = useIsDesktopSidebar();

  // ── Settings: master visibility persisted in localStorage ─────────────
  const [masterEnabled, setMasterEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('dgcrm_master_enabled');
    return saved === null ? true : saved === 'true';
  });

  const toggleMaster = () => {
    const next = !masterEnabled;
    setMasterEnabled(next);
    localStorage.setItem('dgcrm_master_enabled', String(next));
    // dispatch a custom event so Sidebar can react without a full Redux store
    window.dispatchEvent(new CustomEvent('dgcrm_master_toggle', { detail: next }));
  };

  // ── Settings dropdown ──────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef                     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node))
        setSettingsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Mobile more-options dropdown ───────────────────────────────────────
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef                 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node))
        setMoreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    const result = await showAlert.confirm('You will be Logged Out of Dream Group CRM.', 'Logout?');
    if (result.isConfirmed) {
      const loggedOutRole = role ?? 'employee';
      localStorage.removeItem('dgcrm_master_enabled'); // keep setting on logout? remove if preferred
      await dispatch(logoutThunk());
      dispatch(clearProfile());
      await showAlert.logoutSuccess(loggedOutRole);
      navigate(ROUTES.LOGIN, { replace: true });
    }
  };

  const Divider = () => (
    <div style={{ width: 1, height: 20, background: t.divider, flexShrink: 0 }} />
  );

  // ── Dropdown shared style ──────────────────────────────────────────────
  const dropdownStyle: React.CSSProperties = {
    position  : 'absolute', top: '110%', right: 0, zIndex: 9999,
    background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`,
    borderRadius: 12, padding: '8px 0', minWidth: 200,
    boxShadow : '0 8px 24px rgba(0,0,0,0.12)',
  };

  const dropdownItemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 16px', fontSize: 14, cursor: 'pointer',
    color: t.textPrimary, fontFamily: t.fontFamily,
    background: 'transparent', border: 'none', width: '100%', textAlign: 'left',
  };

  // ── Settings Panel content (reused in both desktop and mobile) ─────────
  const SettingsMenuContent = () => (
    <button
      type="button"
      style={dropdownItemStyle}
      onClick={toggleMaster}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = t.hoverBg)}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
    >
      {masterEnabled
        ? <MdCheckBox size={18} style={{ color: '#2563eb', flexShrink: 0 }} />
        : <MdCheckBoxOutlineBlank size={18} style={{ color: t.textSecondary, flexShrink: 0 }} />
      }
      Enable Master
    </button>
  );

  return (
    <header
      // `relative z-50` keeps the header — and the hamburger inside it —
      // above the mobile drawer's backdrop/overlay at all times. Combined
      // with the drawer now starting below the header (see Sidebar.tsx),
      // the header is never dimmed, covered, or made unclickable.
      className="relative z-50 flex items-center justify-between px-3 lg:px-6 h-16 flex-shrink-0"
      style={{
        background  : t.headerBg,
        borderBottom: `1px solid ${t.headerBorder}`,
        boxShadow   : t.headerShadow,
        fontFamily  : t.fontFamily,
      }}
    >
      {/* ── LEFT: Hamburger + Logo + Brand ──────────────────────────── */}
      <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-shrink-0">

        {/* Hamburger — rendered ONLY when `isDesktop` is false, i.e. only on
            the exact resolutions where the Sidebar's desktop Collapse button
            is not mounted. This is a real JS conditional (not a `lg:hidden`
            CSS class), using the identical `useIsDesktopSidebar()` boolean
            the Sidebar uses for its own desktop-rail vs drawer decision — so
            it is structurally impossible for both the hamburger and the
            Collapse button to be visible (or for both to be missing) at the
            same time. Clicking it expands/collapses the mobile drawer. */}
        {!isDesktop && (
          <button
            type="button"
            onClick={onMobileMenuToggle}
            title="Menu"
            aria-label="Toggle menu"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '8px', borderRadius: '8px', border: 'none',
              background: 'transparent', color: t.textSecondary, cursor: 'pointer', flexShrink: 0,
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h14M3 12h14M3 18h14" strokeLinecap="round" />
            </svg>
          </button>
        )}

        {/* Logo + Brand */}
        <button
          type="button"
          onClick={() => navigate(dashboardRoute)}
          className="flex items-center gap-1.5 focus:outline-none flex-shrink-0"
          title="Go to Dashboard"
          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          <img
            src={logoImg} alt="Dream Group"
            style={{ width: 40, height: 50, objectFit: 'contain', mixBlendMode: isDark ? 'screen' : 'multiply', flexShrink: 0 }}
          />
          {/* Brand text: show on sm+ */}
          <div className="hidden sm:block text-left leading-none">
            <p style={{ fontFamily: t.fontFamily, fontSize: 22, fontWeight: 700, color: t.textPrimary, margin: 1, whiteSpace: 'nowrap' }}>
              Dream Group
            </p>
            <p style={{ fontFamily: t.fontFamily, fontSize: 11, fontWeight: 500, color: isDark ? '#ffffff' : '#000000', margin: 2, whiteSpace: 'nowrap' }}>
              CRM Platform
            </p>
          </div>
        </button>
      </div>

      {/* ── RIGHT: controls ───────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 flex-shrink-0">

        {/* ── DESKTOP controls — mounted only when isDesktop is true ── */}
        {isDesktop && (
        <div className="flex items-center gap-0.5">

          {/* Social icons */}
          <div className="flex items-center gap-0.5">
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

          <div className="mx-1"><Divider /></div>

          {/* Theme toggle */}
          <IconBtn
            onClick={() => dispatch(toggleTheme())}
            title={isDark ? 'Switch to Light' : 'Switch to Dark'}
            isDark={isDark}
            hoverColor={isDark ? '#facc15' : '#2563eb'}
          >
            {isDark ? <FiSun size={17} /> : <FiMoon size={17} />}
          </IconBtn>

          {/* Settings dropdown */}
          <div ref={settingsRef} style={{ position: 'relative' }}>
            <IconBtn
              onClick={() => setSettingsOpen((p) => !p)}
              title="Settings"
              isDark={isDark}
            >
              <FiSettings size={17} />
            </IconBtn>
            {settingsOpen && (
              <div style={dropdownStyle}>
                <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Settings
                </div>
                <div style={{ height: 1, background: t.divider, margin: '4px 0' }} />
                <SettingsMenuContent />
              </div>
            )}
          </div>

          <div className="mx-0.5"><Divider /></div>
        </div>
        )}

        {/* ── TABLET / MOBILE three-dot menu — mounted only when !isDesktop ── */}
        {!isDesktop && (
        <div className="flex items-center gap-0.5">
          <div ref={moreRef} style={{ position: 'relative' }}>
            <IconBtn
              onClick={() => setMoreOpen((p) => !p)}
              title="More options"
              isDark={isDark}
            >
              <FiMoreVertical size={20} />
            </IconBtn>

            {moreOpen && (
              <div style={{ ...dropdownStyle, minWidth: 220 }}>

                {/* Social links */}
                <a href={SOCIAL_LINKS.INSTAGRAM} target="_blank" rel="noreferrer"
                  style={{ ...dropdownItemStyle, textDecoration: 'none' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = t.hoverBg)}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                  <AiOutlineInstagram size={18} style={{ color: '#ec4899' }} /> Instagram
                </a>
                <a href={SOCIAL_LINKS.FACEBOOK} target="_blank" rel="noreferrer"
                  style={{ ...dropdownItemStyle, textDecoration: 'none' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = t.hoverBg)}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                  <FaFacebookF size={15} style={{ color: '#3b82f6' }} /> Facebook
                </a>
                <a href={SOCIAL_LINKS.WHATSAPP} target="_blank" rel="noreferrer"
                  style={{ ...dropdownItemStyle, textDecoration: 'none' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = t.hoverBg)}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                  <AiOutlineWhatsApp size={18} style={{ color: '#22c55e' }} /> WhatsApp
                </a>

                <div style={{ height: 1, background: t.divider, margin: '4px 0' }} />

                {/* Theme toggle */}
                <button
                  type="button"
                  style={dropdownItemStyle}
                  onClick={() => { dispatch(toggleTheme()); setMoreOpen(false); }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = t.hoverBg)}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                  {isDark ? <FiSun size={17} style={{ color: '#facc15' }} /> : <FiMoon size={17} style={{ color: '#2563eb' }} />}
                  {isDark ? 'Switch to Light' : 'Switch to Dark'}
                </button>

                <div style={{ height: 1, background: t.divider, margin: '4px 0' }} />

                {/* Settings: Enable Master */}
                <div style={{ padding: '4px 16px 4px', fontSize: 11, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Settings
                </div>
                <SettingsMenuContent />
              </div>
            )}
          </div>
        </div>
        )}

        {/* ── Profile button — always visible ─────────────────────── */}
        <button
          type="button"
          onClick={() => dispatch(openProfileModal())}
          className="flex items-center gap-1.5 px-1.5 py-1.5 rounded-xl transition-all"
          title="My Profile"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: t.fontFamily, flexShrink: 0 }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = t.hoverBg)}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: t.avatarGradient }}>
            {getInitials(user?.email || 'DG')}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold leading-none" style={{ color: t.textPrimary, fontFamily: t.fontFamily, whiteSpace: 'nowrap' }}>
              {user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: t.textPrimary, fontFamily: t.fontFamily }}>
              {user?.role?.name}
            </p>
          </div>
        </button>

        {/* Logout — always visible */}
        <IconBtn onClick={handleLogout} title="Logout" isDark={isDark}>
          <MdLogout size={19} />
        </IconBtn>
      </div>
    </header>
  );
};

export default Header;
