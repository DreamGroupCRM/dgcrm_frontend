// ==========================================
// DGCRM — CUSTOMER PORTAL SHELL
// ==========================================
// The customer's own shell: a collapsible sidebar with the three sections,
// a header carrying the "Welcome, <name>" greeting + property switcher, a
// theme toggle, Change Password and Logout, and the page itself in an
// Outlet.
//
// Deliberately NOT the staff DashboardLayout — that sidebar carries every
// Admin/Employee module, none of which a customer may open.
//
// The sidebar has two quite different behaviours, which is why there are
// two pieces of state rather than one. On a wide screen it is always
// present and `collapsed` only narrows it to an icon rail. On a phone
// there is no room for either, so it becomes an overlay drawer that
// `mobileOpen` slides in and a scrim closes. Sharing one flag between the
// two made "collapsed on desktop" reopen as "drawer open" on rotate.
import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import {
  MdMenu, MdClose, MdLogout, MdLockOutline, MdHome, MdHistory,
  MdEventNote, MdKeyboardArrowDown, MdApartment, MdLightMode, MdDarkMode,
} from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { logoutThunk } from '../../redux/thunks/authThunks';
import { toggleTheme } from '../../redux/slices/themeSlice';
import { ROUTES } from '../../constants';
import { useAppearanceTokens } from '../../styles/appearanceTokens';
import Logo from '../../components/ui/Logo';
import ChangePasswordForm from '../../components/common/ChangePasswordForm';
import { ensureFileToken } from '../../services/fileAccessService';
import { CustomerPortalProvider, useCustomerPortal, bookingLabel } from './CustomerPortalContext';
import './CustomerPortal.css';

// V_24.0 — five sections reduced to three: Payment Receipt merged into
// Payment History (see CustomerPaymentHistoryPage's own header comment),
// My Documents moved onto Home. Old links to either still resolve (see
// CustomerRoutes.tsx's redirects) — they just no longer have their own
// nav entry.
const NAV_ITEMS = [
  { to: ROUTES.CUSTOMER.HOME, label: 'Home', icon: MdHome },
  { to: ROUTES.CUSTOMER.PAYMENT_HISTORY, label: 'Payment History & Receipt', icon: MdHistory },
  { to: ROUTES.CUSTOMER.SCHEME, label: 'EMI Scheme & Schedule', icon: MdEventNote },
] as const;

// First initial + (middle initial, else last initial) — "Muzammil F Khan"
// -> "MF", a plain "Rohit" (no middle/last on file) -> "R". Read off the
// structured name fields rather than parsed from the joined display
// string, so it never depends on how many words that string happens to
// split into.
const initialsOf = (first?: string | null, middle?: string | null, last?: string | null): string => {
  const a = (first || '').trim().charAt(0);
  const b = (middle || last || '').trim().charAt(0);
  return (a + b).toUpperCase() || '?';
};

const ThemeToggle: React.FC = () => {
  const dispatch = useAppDispatch();
  const isDark = useAppSelector((s) => s.theme.mode === 'dark');
  return (
    <button
      type="button" className="cp-theme-toggle" role="switch" aria-checked={isDark}
      onClick={() => dispatch(toggleTheme())}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <MdLightMode size={12} className="cp-theme-toggle-sun" />
      <MdDarkMode size={12} className="cp-theme-toggle-moon" />
      <span className="cp-theme-toggle-knob" />
    </button>
  );
};

// ── Booking switcher ──────────────────────────────────────────────────────
// Only rendered when the login actually has more than one booking — a
// single-booking customer (the common case) gets a plain label instead of a
// control that can only ever pick the one thing already selected.
const BookingSwitcher: React.FC = () => {
  const { bookings, selectedId, selected, selectBooking } = useCustomerPortal();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest?.('[data-booking-switcher]')) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (bookings.length === 0) return null;

  if (bookings.length === 1) {
    return (
      <div className="cp-booking-single" title={bookingLabel(bookings[0])}>
        Customer ID: {bookings[0].customer_code}
      </div>
    );
  }

  return (
    <div className="cp-booking-switcher" data-booking-switcher>
      <button
        type="button" className="cp-booking-trigger" onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox" aria-expanded={open}
        title={selected ? bookingLabel(selected) : 'Select a property'}
      >
        <MdApartment size={13} />
        <span>Customer ID: {selected?.customer_code ?? 'Select a property'}</span>
        <MdKeyboardArrowDown size={15} className={open ? 'cp-rotate' : undefined} />
      </button>
      {open && (
        <div className="cp-booking-menu" role="listbox">
          <div className="cp-booking-menu-head">My Properties ({bookings.length})</div>
          {bookings.map((b) => (
            <button
              key={b.id} type="button" role="option" aria-selected={b.id === selectedId}
              className={`cp-booking-option${b.id === selectedId ? ' cp-booking-option-active' : ''}`}
              onClick={() => { selectBooking(b.id); setOpen(false); }}
            >
              <span className="cp-booking-option-code">{b.customer_code}</span>
              <span className="cp-booking-option-label">{bookingLabel(b)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const CustomerPortalShell: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, cssVars } = useAppearanceTokens();
  const { loading, error, bookings, detail } = useCustomerPortal();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);

  // Documents and photos render through <img>/<iframe>, which cannot send
  // an Authorization header — they carry a short-lived file token in the
  // query string instead. Fetched once here so every page below has one.
  useEffect(() => { void ensureFileToken(); }, []);

  // Picking a section on a phone should close the drawer, or the page just
  // opened stays hidden behind it.
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // The drawer is a full-screen overlay; leaving the body scrollable behind
  // it lets the page underneath move while the customer scrolls the menu.
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [mobileOpen]);

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    navigate(ROUTES.CUSTOMER.LOGIN, { replace: true });
  };

  // The appearance hook's cssVars only carries the BRAND tokens
  // (--brand-gradient, --brand-ink, ...). Surfaces, text and borders live
  // on the `t` object as plain JS values, so CustomerPortal.css gets them
  // as its own --cp-* variables here — that keeps the stylesheet
  // declarative while still following light/dark and the chosen
  // appearance, instead of baking in light-mode literals.
  const shellVars = {
    ...cssVars,
    '--cp-page-bg': t.pageBg,
    '--cp-surface-bg': t.surfaceBg,
    '--cp-surface-border': t.surfaceBorder,
    '--cp-inset-bg': t.insetBg,
    '--cp-divider': t.divider,
    '--cp-text-primary': t.textPrimary,
    '--cp-text-secondary': t.textSecondary,
    '--cp-font-family': t.fontFamily,
  } as React.CSSProperties;

  return (
    <div className={`cp-shell${collapsed ? ' cp-shell-collapsed' : ''}`} style={shellVars}>
      {/* ── Sidebar ── */}
      <aside className={`cp-sidebar${mobileOpen ? ' cp-sidebar-open' : ''}`}>
        <div className="cp-sidebar-head">
          <div className="cp-brand">
            <Logo size={28} />
            <span className="cp-brand-text">
              <span className="cp-brand-line1">DGCRM</span>
              <span className="cp-brand-line2">Customer Portal</span>
            </span>
          </div>
          <button
            type="button" className="cp-drawer-close" onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <MdClose size={20} />
          </button>
        </div>

        <nav className="cp-nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to} to={to} title={label}
              className={({ isActive }) => `cp-nav-item${isActive ? ' cp-nav-item-active' : ''}`}
            >
              <Icon size={19} className="cp-nav-icon" />
              <span className="cp-nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <button
          type="button" className="cp-collapse-btn" onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? 'Expand menu' : 'Collapse menu'} aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
        >
          <MdMenu size={18} />
          <span className="cp-nav-label">Collapse</span>
        </button>
      </aside>

      {mobileOpen && <div className="cp-scrim" onClick={() => setMobileOpen(false)} aria-hidden />}

      {/* ── Main column ── */}
      <div className="cp-main">
        <header className="cp-header">
          <button
            type="button" className="cp-menu-btn" onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <MdMenu size={21} />
          </button>
          <div className="cp-header-greet">
            <span className="cp-header-greet-name">Welcome, {detail?.name || 'Customer'}</span>
            <BookingSwitcher />
          </div>

          <div className="cp-header-actions">
            <ThemeToggle />
            <div className="cp-avatar" title={[detail?.name, detail?.middle_name, detail?.last_name].filter(Boolean).join(' ') || 'Customer'}>
              {initialsOf(detail?.name, detail?.middle_name, detail?.last_name)}
            </div>
            <button
              type="button" className="cp-header-btn" onClick={() => setChangePwOpen(true)}
              title="Change Password"
            >
              <MdLockOutline size={16} />
              <span className="cp-header-btn-text">Change Password</span>
            </button>
            <button
              type="button" className="cp-header-btn cp-header-btn-danger" onClick={handleLogout}
              title="Logout"
            >
              <MdLogout size={16} />
              <span className="cp-header-btn-text">Logout</span>
            </button>
          </div>
        </header>

        <main className="cp-content">
          {loading ? (
            <div className="cp-center"><CircularProgress size={30} /></div>
          ) : error ? (
            <div className="cp-empty cp-empty-error">{error}</div>
          ) : bookings.length === 0 ? (
            <div className="cp-empty">
              No property is linked to your account yet. Please contact our office.
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {changePwOpen && (
        <div className="cp-modal-scrim" onClick={() => setChangePwOpen(false)}>
          <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cp-modal-head">
              <span><MdLockOutline size={17} /> Change Password</span>
              <button type="button" onClick={() => setChangePwOpen(false)} aria-label="Close">
                <MdClose size={19} />
              </button>
            </div>
            <div className="cp-modal-body">
              <ChangePasswordForm t={t} onSuccess={() => setChangePwOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CustomerPortalLayout: React.FC = () => (
  <CustomerPortalProvider>
    <CustomerPortalShell />
  </CustomerPortalProvider>
);

export default CustomerPortalLayout;
