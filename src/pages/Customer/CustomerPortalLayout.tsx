// ==========================================
// DGCRM — CUSTOMER PORTAL SHELL
// ==========================================
// The customer's own shell: a collapsible sidebar with the five sections,
// a header carrying the booking switcher, Change Password and Logout, and
// the page itself in an Outlet.
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
  MdReceiptLong, MdEventNote, MdFolderOpen, MdKeyboardArrowDown, MdApartment,
} from 'react-icons/md';
import { useAppDispatch } from '../../hooks';
import { logoutThunk } from '../../redux/thunks/authThunks';
import { ROUTES } from '../../constants';
import { useAppearanceTokens } from '../../styles/appearanceTokens';
import Logo from '../../components/ui/Logo';
import ChangePasswordForm from '../../components/common/ChangePasswordForm';
import { ensureFileToken } from '../../services/fileAccessService';
import { CustomerPortalProvider, useCustomerPortal, bookingLabel } from './CustomerPortalContext';
import './CustomerPortal.css';

const NAV_ITEMS = [
  { to: ROUTES.CUSTOMER.HOME, label: 'Home', icon: MdHome },
  { to: ROUTES.CUSTOMER.PAYMENT_HISTORY, label: 'Payment History', icon: MdHistory },
  { to: ROUTES.CUSTOMER.PAYMENT_RECEIPT, label: 'Payment Receipt', icon: MdReceiptLong },
  { to: ROUTES.CUSTOMER.SCHEME, label: 'EMI Schedule & Scheme', icon: MdEventNote },
  { to: ROUTES.CUSTOMER.DOCUMENTS, label: 'My Documents', icon: MdFolderOpen },
] as const;

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
        <MdApartment size={15} />
        <span className="cp-booking-code">{bookings[0].customer_code}</span>
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
        <MdApartment size={15} />
        <span className="cp-booking-code">{selected?.customer_code ?? 'Select'}</span>
        <MdKeyboardArrowDown size={16} className={open ? 'cp-rotate' : undefined} />
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
  const { loading, error, bookings } = useCustomerPortal();

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
            <span className="cp-brand-text">Dream Group</span>
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
          <div className="cp-header-title">Dream Group CRM</div>

          <div className="cp-header-actions">
            <BookingSwitcher />
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
