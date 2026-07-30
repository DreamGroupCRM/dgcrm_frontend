// ==========================================
// DREAM GROUP CRM - SIDEBAR COMPONENT
// ==========================================

import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { toggleSidebar } from '../../redux/slices/uiSlice';
import { ROUTES } from '../../constants';
import { useNavigate } from 'react-router-dom';
import { getTheme } from '../../styles/theme';
import favicon_logo from '../../assets/images/favicon_logo.png';

import {
  MdDashboard, MdBusiness, MdPeople, MdContactPage,
  MdHistory, MdCalculate, MdStorage,
  MdEventAvailable, MdLeaderboard, MdPayment, MdAttachMoney,
  MdApartment, MdAccountBalance, MdWork, MdAccountTree,
  MdExpandMore, MdExpandLess, MdChevronLeft, MdChevronRight,
  MdPersonAdd, MdSettings, MdGridOn,
} from 'react-icons/md';

// ── Single source of truth for "desktop vs drawer" mode ────────────────────
// Previously desktop/mobile was decided purely by Tailwind's `lg` breakpoint,
// declared separately in Sidebar.tsx (`hidden lg:flex`) and Header.tsx
// (`lg:hidden`). Two independent CSS declarations can visually disagree at
// the exact breakpoint edge (browser zoom, scrollbar width, devtools
// device-toolbar rendering, etc.) — which is exactly how you can get BOTH
// the desktop Collapse button and the mobile hamburger rendered at once,
// with the hamburger wired to drawer state nobody is listening to.
// This hook uses matchMedia at runtime and both components read the exact
// same threshold, so exactly one control is ever mounted — never both.
export const SIDEBAR_DESKTOP_BREAKPOINT = 1024; // matches Tailwind's `lg`

export function useIsDesktopSidebar(breakpoint: number = SIDEBAR_DESKTOP_BREAKPOINT): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth >= breakpoint
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mql.matches);
    if (mql.addEventListener) mql.addEventListener('change', handler);
    else mql.addListener(handler); // Safari <14 fallback
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', handler);
      else mql.removeListener(handler);
    };
  }, [breakpoint]);

  return isDesktop;
}

interface NavItem {
  label    : string;
  path?    : string;
  icon     : React.ReactNode;
  children?: NavItem[];
}

const buildAdminNavItems = (masterEnabled: boolean, isSuperAdmin: boolean): NavItem[] => [
  { label: 'Dashboard', path: ROUTES.ADMIN.DASHBOARD, icon: <MdDashboard /> },

  // Master section — conditionally included based on settings toggle
  ...(masterEnabled ? [{
    label: 'Master', icon: <MdBusiness />,
    children: [
      { label: 'Company',        path: ROUTES.ADMIN.COMPANY,        icon: <MdBusiness /> },
      { label: 'Department',     path: ROUTES.ADMIN.DEPARTMENT,     icon: <MdAccountTree /> },
      { label: 'Designation',    path: ROUTES.ADMIN.DESIGNATION,    icon: <MdWork /> },
      { label: 'Roles',          path: ROUTES.ADMIN.ROLES,          icon: <MdAccountTree /> },
      { label: 'Bank A/C',       path: ROUTES.ADMIN.BANK_AC,        icon: <MdAccountBalance /> },
      { label: 'Building',       path: ROUTES.ADMIN.BUILDING,       icon: <MdApartment /> },
      // Global/shared config (not scoped to a company) — SuperAdmin only.
      ...(isSuperAdmin ? [
        { label: 'Action & Module',path: ROUTES.ADMIN.ACTION_MODULE,  icon: <MdSettings /> },
        { label: 'Module Mapping', path: ROUTES.ADMIN.MODULE_MAPPING, icon: <MdGridOn /> },
      ] : []),
    ],
  }] : []),

  {
    label: 'Employee', icon: <MdPeople />,
    children: [
      { label: 'Employee Details', path: ROUTES.ADMIN.EMPLOYEE_DETAILS, icon: <MdPersonAdd /> },
      { label: 'Attendance',       path: ROUTES.ADMIN.ATTENDANCE,       icon: <MdEventAvailable /> },
    ],
  },

  {
    label: 'CRM', icon: <MdLeaderboard />,
    children: [
      { label: 'Customer Details', path: ROUTES.ADMIN.CUSTOMER_DETAILS, icon: <MdContactPage /> },
      { label: 'Leads',            path: ROUTES.ADMIN.LEADS,            icon: <MdLeaderboard /> },
      { label: 'Payment Received', path: ROUTES.ADMIN.PAYMENT_RECEIVED, icon: <MdAttachMoney /> },
      { label: 'Payment Dues',     path: ROUTES.ADMIN.PAYMENT_DUES,     icon: <MdPayment /> },
    ],
  },

  { label: 'Audit History',            path: ROUTES.ADMIN.AUDIT_HISTORY,       icon: <MdHistory /> },
  { label: 'Interest Free Calculator', path: ROUTES.ADMIN.INTEREST_CALCULATOR, icon: <MdCalculate /> },
  { label: 'Backup Database',          path: ROUTES.ADMIN.BACKUP_DATABASE,     icon: <MdStorage /> },
];

const employeeNavItems: NavItem[] = [
  { label: 'Dashboard',        path: ROUTES.EMPLOYEE.DASHBOARD,        icon: <MdDashboard /> },
  { label: 'Customer Details', path: ROUTES.EMPLOYEE.CUSTOMER_DETAILS, icon: <MdContactPage /> },
  { label: 'Leads',            path: ROUTES.EMPLOYEE.LEADS,            icon: <MdLeaderboard /> },
  { label: 'Payment Received', path: ROUTES.EMPLOYEE.PAYMENT_RECEIVED, icon: <MdAttachMoney /> },
  { label: 'Payment Dues',     path: ROUTES.EMPLOYEE.PAYMENT_DUES,     icon: <MdPayment /> },
  { label: 'Attendance',       path: ROUTES.EMPLOYEE.ATTENDANCE,       icon: <MdEventAvailable /> },
];

// ── NavItemComponent ───────────────────────────────────────────────────────
const NavItemComponent: React.FC<{
  item     : NavItem;
  collapsed: boolean;
  isDark   : boolean;
}> = ({ item, collapsed, isDark }) => {
  const t        = getTheme(isDark);
  const location = useLocation();
  const [open, setOpen]       = useState(() =>
    !!item.children?.some((c) => c.path && location.pathname.startsWith(c.path))
  );
  const [hovered, setHovered] = useState(false);

  if (item.children?.length) {
    return (
      <div>
        <button
          type="button"
          onClick={() => !collapsed && setOpen((v) => !v)}
          title={collapsed ? item.label : undefined}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
          style={{
            background: open ? t.sidebarActiveBg : hovered ? t.sidebarHoverBg : 'transparent',
            color     : open ? t.sidebarActiveText : hovered ? t.sidebarHoverText : t.sidebarText,
            fontFamily: t.fontFamily, border: 'none', cursor: 'pointer',
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <span className="text-xl flex-shrink-0">{item.icon}</span>
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
              <span style={{ color: t.sidebarTextMuted }}>
                {open ? <MdExpandLess size={16} /> : <MdExpandMore size={16} />}
              </span>
            </>
          )}
        </button>
        {!collapsed && open && (
          <div className="ml-4 mt-0.5 space-y-0.5 pl-3" style={{ borderLeft: `1px solid ${t.sidebarBorder}` }}>
            {item.children.map((child) => (
              <NavItemComponent key={child.path} item={child} collapsed={false} isDark={isDark} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path!}
      title={collapsed ? item.label : undefined}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 no-underline"
      style={({ isActive }) => ({
        background: isActive ? t.sidebarActiveBg : 'transparent',
        color     : isActive ? t.sidebarActiveText : t.sidebarText,
        fontFamily: t.fontFamily, fontWeight: isActive ? 600 : 400,
        borderLeft: isActive ? `3px solid ${t.sidebarActiveBorder}` : '3px solid transparent',
      })}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        if (!location.pathname.startsWith(item.path ?? '__')) {
          el.style.background = t.sidebarHoverBg;
          el.style.color      = t.sidebarHoverText;
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        if (!location.pathname.startsWith(item.path ?? '__')) {
          el.style.background = 'transparent';
          el.style.color      = t.sidebarText;
        }
      }}
    >
      <span className="text-xl flex-shrink-0">{item.icon}</span>
      {!collapsed && (
        <span className="text-sm font-medium" style={{ fontFamily: t.fontFamily }}>
          {item.label}
        </span>
      )}
    </NavLink>
  );
};

// ── Sidebar shell ──────────────────────────────────────────────────────────
interface SidebarProps {
  mobileOpen   : boolean;
  onMobileClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onMobileClose }) => {
  const logoImg  = favicon_logo;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { sidebarCollapsed } = useAppSelector((s) => s.ui);
  const { role }             = useAppSelector((s) => s.auth);
  const { mode }             = useAppSelector((s) => s.theme);
  const location             = useLocation();

  const isDark   = mode === 'dark';
  const t        = getTheme(isDark);
  const roleLabel = role === 'superadmin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'Employee';
  const dashboardRoute = role === 'admin' || role === 'superadmin' ? ROUTES.ADMIN.DASHBOARD : ROUTES.EMPLOYEE.DASHBOARD;

  // Authoritative desktop/drawer switch — see useIsDesktopSidebar above.
  const isDesktop = useIsDesktopSidebar();

  // If the viewport crosses into desktop width while the mobile drawer
  // happens to be open, close it — you should never be able to land in a
  // state where the drawer is open AND the desktop rail is showing.
  useEffect(() => {
    if (isDesktop && mobileOpen) onMobileClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop]);

  // ── Master visibility — sync with Header settings toggle ──────────────
  const [masterEnabled, setMasterEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('dgcrm_master_enabled');
    return saved === null ? true : saved === 'true';
  });

  useEffect(() => {
    const handler = (e: Event) => {
      setMasterEnabled((e as CustomEvent<boolean>).detail);
    };
    window.addEventListener('dgcrm_master_toggle', handler);
    return () => window.removeEventListener('dgcrm_master_toggle', handler);
  }, []);

  // ── ROOT-CAUSE FIXES for mobile drawer behavior ────────────────────────
  // 1) Auto-close the mobile drawer whenever the route changes, so
  //    navigating to a page never leaves a "dead" open drawer behind.
  useEffect(() => {
    if (mobileOpen) onMobileClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // 2) Close on Escape — standard drawer/overlay behavior.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen, onMobileClose]);

  // 3) Lock body scroll while the drawer is open so the page behind it
  //    doesn't scroll along with the overlay.
  useEffect(() => {
    if (!mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  const navItems = role === 'admin' || role === 'superadmin'
    ? buildAdminNavItems(masterEnabled, role === 'superadmin')
    : employeeNavItems;

  const shellStyle: React.CSSProperties = {
    background : t.sidebarBg,
    borderRight: `1px solid ${t.sidebarBorder}`,
  };

  // NOTE on the fix:
  // Previously a single `SidebarContent` closure read `sidebarCollapsed`
  // directly from Redux, so BOTH the desktop rail AND the mobile drawer
  // shrank together whenever "Collapse" was clicked. The mobile drawer's
  // outer <aside> kept a hardcoded width of 260px, but the inner content
  // shrank to 70px — leaving the empty strip of dead space seen in the
  // screenshot. The fix: `collapsed` and `showCollapseToggle` are now
  // explicit parameters. The mobile drawer always renders fully expanded
  // (collapsed = false) and never shows the collapse control — on mobile,
  // "collapsing" isn't a real interaction; the whole drawer opens or closes.
  const renderSidebarContent = (collapsed: boolean, showCollapseToggle: boolean) => (
    <div className="flex flex-col h-full" style={{ width: collapsed ? 70 : 260 }}>

      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 flex-shrink-0"
        style={{ minHeight: 64, borderBottom: `1px solid ${t.sidebarBorder}` }}>
        <img src={logoImg} alt="Dream Group"
          style={{ width: collapsed ? 28 : 34, height: collapsed ? 28 : 34, objectFit: 'contain', mixBlendMode: isDark ? 'screen' : 'multiply', flexShrink: 0 }} />
        {!collapsed && (
          <button type="button" onClick={() => navigate(dashboardRoute)}
            style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', outline: 'none' }}>
            <span style={{ fontFamily: t.fontFamily, fontSize: 28, fontWeight: 700, letterSpacing: '0.06em', color: t.textPrimary }}>
              DGCRM
            </span>
          </button>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 py-2.5 flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: isDark ? '#141414' : '#eff6ff', color: isDark ? '#a3a3a3' : '#2563eb', fontFamily: t.fontFamily }}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {roleLabel} Panel
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {navItems.map((item, i) => (
          <NavItemComponent key={i} item={item} collapsed={collapsed} isDark={isDark} />
        ))}
      </nav>

      {/* Collapse toggle — DESKTOP ONLY. Mobile closes via the ✕ button
          or by tapping the backdrop, never by "collapsing". */}
      {showCollapseToggle && (
        <div className="px-3 pb-4 pt-2 flex-shrink-0" style={{ borderTop: `1px solid ${t.sidebarBorder}` }}>
          <button
            type="button"
            onClick={() => dispatch(toggleSidebar())}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-150 text-sm"
            style={{ background: 'transparent', color: t.textPrimary, border: 'none', cursor: 'pointer', fontFamily: t.fontFamily }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = t.sidebarHoverBg;
              (e.currentTarget as HTMLElement).style.color      = t.sidebarHoverText;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color      = t.textPrimary;
            }}
          >
            {collapsed ? <MdChevronRight size={28} /> : (
              <><MdChevronLeft size={28} /><span>Collapse</span></>
            )}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ===================== DESKTOP sidebar =====================
          Mounted ONLY when isDesktop is true (JS-gated, not CSS-gated).
          In-flow, collapsible via the "Collapse" button. Unchanged design.
          Because this is a real conditional render (not `hidden lg:flex`),
          the Collapse button and the mobile hamburger can never both be
          mounted in the DOM at the same time. */}
      {isDesktop && (
        <aside
          className="flex flex-col flex-shrink-0 h-screen overflow-hidden transition-all duration-300"
          style={{ width: sidebarCollapsed ? 70 : 260, ...shellStyle }}
        >
          {renderSidebarContent(sidebarCollapsed, true)}
        </aside>
      )}

      {/* ================= TABLET / MOBILE drawer =================
          Mounted ONLY when !isDesktop, using the exact same boolean the
          Header uses to decide whether to render its hamburger. */}
      {!isDesktop && (
        <>
          {/* Backdrop — starts BELOW the header (top-16 = header's h-16), so
              the header (and the hamburger button inside it) is never
              dimmed, hidden, or made unclickable while the drawer is open.
              Fix for "sometimes the hamburger blurs/hides the whole screen". */}
          {mobileOpen && (
            <div
              className="fixed top-16 left-0 right-0 bottom-0 z-30"
              style={{ background: 'rgba(0,0,0,0.4)' }}
              onClick={onMobileClose}
              aria-hidden="true"
            />
          )}

          {/* Drawer — same top-16 offset as the backdrop, always renders
              fully expanded (never partially collapsed), and slides fully
              off-screen (translateX(-100%)) when closed, so there is never
              leftover empty width. */}
          <aside
            className="fixed top-16 left-0 h-[calc(100%-4rem)] z-40 flex flex-col transition-transform duration-300"
            style={{
              width    : 260,
              transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
              ...shellStyle,
            }}
            aria-hidden={!mobileOpen}
          >
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Close menu"
              className="absolute top-3 right-3 z-10"
              style={{ color: t.sidebarTextMuted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
            >
              ✕
            </button>
            {renderSidebarContent(false, false)}
          </aside>
        </>
      )}
    </>
  );
};

export default Sidebar;
