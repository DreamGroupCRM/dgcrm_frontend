// ==========================================
// DREAM GROUP CRM - SIDEBAR COMPONENT
// ==========================================
// Theme: full black (dark) / full white (light)
// Hover: gray text (dark) / blue text + blue-tint bg (light)
// Active: left-border indicator + matching bg
// Font: Inter throughout

import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { toggleSidebar } from '../../redux/slices/uiSlice';
import { ROUTES } from '../../constants';
import { useNavigate } from 'react-router-dom';
import { getTheme } from '../../styles/theme';

import {
  MdDashboard, MdBusiness, MdPeople, MdContactPage,
  MdHistory, MdCalculate, MdStorage,
  MdEventAvailable, MdLeaderboard, MdPayment, MdAttachMoney,
  MdApartment, MdAccountBalance, MdWork, MdAccountTree,
  MdExpandMore, MdExpandLess, MdChevronLeft, MdChevronRight,
  MdPersonAdd, MdReceiptLong, MdSettings,
} from 'react-icons/md';

interface NavItem {
  label    : string;
  path?    : string;
  icon     : React.ReactNode;
  children?: NavItem[];
}

const adminNavItems: NavItem[] = [
  { label: 'Dashboard', path: ROUTES.ADMIN.DASHBOARD, icon: <MdDashboard /> },

  {
    label: 'Master', icon: <MdBusiness />,
    children: [
      { label: 'Company',     path: ROUTES.ADMIN.COMPANY,     icon: <MdBusiness /> },
      { label: 'Department',  path: ROUTES.ADMIN.DEPARTMENT,  icon: <MdAccountTree /> },
      { label: 'Designation', path: ROUTES.ADMIN.DESIGNATION, icon: <MdWork /> },
      { label: 'Roles',       path: ROUTES.ADMIN.ROLES,       icon: <MdAccountTree /> },
      { label: 'Bank A/C',    path: ROUTES.ADMIN.BANK_AC,     icon: <MdAccountBalance /> },
      { label: 'Building',    path: ROUTES.ADMIN.BUILDING,    icon: <MdApartment /> },
      { label: 'Action & Module', path: ROUTES.ADMIN.ACTION_MODULE, icon: <MdSettings /> },
    ],
  },

  {
    label: 'Employee', icon: <MdPeople />,
    children: [
      { label: 'Employee Details',   path: ROUTES.ADMIN.EMPLOYEE_DETAILS,   icon: <MdPersonAdd /> },
      { label: 'Attendance', path: ROUTES.ADMIN.ATTENDANCE, icon: <MdEventAvailable /> },
    ],
  },

  {
    label: 'CRM', icon: <MdLeaderboard />,
    children: [
      { label: 'Customer Details',  path: ROUTES.ADMIN.CUSTOMER_DETAILS, icon: <MdContactPage /> },
      { label: 'Leads',             path: ROUTES.ADMIN.LEADS,            icon: <MdLeaderboard /> },
      { label: 'Payment Received',  path: ROUTES.ADMIN.PAYMENT_RECEIVED, icon: <MdAttachMoney /> },
      { label: 'Payment Dues',      path: ROUTES.ADMIN.PAYMENT_DUES,     icon: <MdPayment /> },
    ],
  },

  { label: 'Audit History',           path: ROUTES.ADMIN.AUDIT_HISTORY,       icon: <MdHistory /> },
  { label: 'Interest Free Calculator',path: ROUTES.ADMIN.INTEREST_CALCULATOR, icon: <MdCalculate /> },
  { label: 'Backup Database',         path: ROUTES.ADMIN.BACKUP_DATABASE,     icon: <MdStorage /> },
];

const employeeNavItems: NavItem[] = [
  { label: 'Dashboard',        path: ROUTES.EMPLOYEE.DASHBOARD,        icon: <MdDashboard /> },
  { label: 'Customer Details', path: ROUTES.EMPLOYEE.CUSTOMER_DETAILS, icon: <MdContactPage /> },
  { label: 'Leads',             path: ROUTES.EMPLOYEE.LEADS,            icon: <MdLeaderboard /> },
  { label: 'Payment Received', path: ROUTES.EMPLOYEE.PAYMENT_RECEIVED, icon: <MdAttachMoney /> },
  { label: 'Payment Dues',     path: ROUTES.EMPLOYEE.PAYMENT_DUES,     icon: <MdPayment /> },
  { label: 'Attendance',       path: ROUTES.EMPLOYEE.ATTENDANCE,       icon: <MdEventAvailable /> },
];

// ── NavItem — handles both parent (accordion) and leaf (NavLink) ──
const NavItemComponent: React.FC<{
  item      : NavItem;
  collapsed : boolean;
  isDark    : boolean;
}> = ({ item, collapsed, isDark }) => {
  const t        = getTheme(isDark);
  const location = useLocation();
  const [open, setOpen] = useState(() =>
    !!item.children?.some((c) => c.path && location.pathname.startsWith(c.path))
  );
  const [hovered, setHovered] = useState(false);

  // ── PARENT with children (accordion) ──
  if (item.children?.length) {
    return (
      <div>
        <button
          onClick={() => !collapsed && setOpen((v) => !v)}
          title={collapsed ? item.label : undefined}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
          style={{
            background : open ? t.sidebarActiveBg : hovered ? t.sidebarHoverBg : 'transparent',
            color      : open ? t.sidebarActiveText : hovered ? t.sidebarHoverText : t.sidebarText,
            fontFamily : t.fontFamily,
            border     : 'none',
            cursor     : 'pointer',
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
          <div
            className="ml-4 mt-0.5 space-y-0.5 pl-3"
            style={{ borderLeft: `1px solid ${t.sidebarBorder}` }}
          >
            {item.children.map((child) => (
              <NavItemComponent key={child.path} item={child} collapsed={false} isDark={isDark} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── LEAF NavLink ──
  return (
    <NavLink
      to={item.path!}
      title={collapsed ? item.label : undefined}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 no-underline"
      style={({ isActive }) => ({
        background : isActive ? t.sidebarActiveBg   : 'transparent',
        color      : isActive ? t.sidebarActiveText : t.sidebarText,
        fontFamily : t.fontFamily,
        fontWeight : isActive ? 600 : 400,
        borderLeft : isActive
          ? `3px solid ${t.sidebarActiveBorder}`
          : '3px solid transparent',
      })}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        if (!location.pathname.startsWith(item.path ?? '__NOMATCH__')) {
          el.style.background = t.sidebarHoverBg;
          el.style.color      = t.sidebarHoverText;
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        if (!location.pathname.startsWith(item.path ?? '__NOMATCH__')) {
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

// ── Sidebar shell ──
interface SidebarProps {
  mobileOpen    : boolean;
  onMobileClose : () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onMobileClose }) => {
  const logoImg = '/src/assets/images/favicon_logo.png';
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { sidebarCollapsed } = useAppSelector((s) => s.ui);
  const { role }             = useAppSelector((s) => s.auth);
  const { mode }             = useAppSelector((s) => s.theme);

  const isDark         = mode === 'dark';
  const t              = getTheme(isDark);
  const navItems       = role === 'admin' ? adminNavItems : employeeNavItems;
  const dashboardRoute = role === 'admin' ? ROUTES.ADMIN.DASHBOARD : ROUTES.EMPLOYEE.DASHBOARD;
  const roleLabel      = role === 'admin' ? 'Admin' : 'Employee';

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ width: sidebarCollapsed ? 70 : 260 }}>

      {/* ── Brand / Logo ── */}
      <div
        className="flex items-center gap-2.5 px-4 flex-shrink-0"
        style={{ minHeight: 64, borderBottom: `1px solid ${t.sidebarBorder}` }}
      >
        <img
          src={logoImg}
          alt="Dream Group"
          style={{
            width       : sidebarCollapsed ? 28 : 34,
            height      : sidebarCollapsed ? 28 : 34,
            objectFit   : 'contain',
            mixBlendMode: isDark ? 'screen' : 'multiply',
            flexShrink  : 0,
          }}
        />
        {!sidebarCollapsed && (
          <button
            onClick={() => navigate(dashboardRoute)}
            style={{
              background : 'transparent',
              border     : 'none',
              padding    : 0,
              cursor     : 'pointer',
              outline    : 'none',
            }}
          >
            <span
              style={{
                fontFamily   : t.fontFamily,
                fontSize     : 28,
                fontWeight   : 700,
                letterSpacing: '0.06em',
                color        : t.textPrimary,
              }}
            >
              DGCRM
            </span>
          </button>
        )}
      </div>

      {/* ── Role badge ── */}
      {!sidebarCollapsed && (
        <div className="px-4 py-2.5 flex-shrink-0">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              background : isDark ? '#141414' : '#eff6ff',
              color      : isDark ? '#a3a3a3' : '#2563eb',
              fontFamily : t.fontFamily,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {roleLabel} Panel
          </span>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {navItems.map((item, i) => (
          <NavItemComponent key={i} item={item} collapsed={sidebarCollapsed} isDark={isDark} />
        ))}
      </nav>

      {/* ── Collapse toggle ── */}
      <div
        className="px-3 pb-4 pt-2 flex-shrink-0"
        style={{ borderTop: `1px solid ${t.sidebarBorder}` }}
      >
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-150 text-sm"
          style={{
            background : 'transparent',
            color      : t.sidebarTextMuted,
            border     : 'none',
            cursor     : 'pointer',
            fontFamily : t.fontFamily,
          }}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = t.sidebarHoverBg;
            (e.currentTarget as HTMLElement).style.color      = t.sidebarHoverText;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color      = t.sidebarTextMuted;
          }}
        >
          {sidebarCollapsed ? (
            <MdChevronRight size={28} />
          ) : (
            <>
              <MdChevronLeft size={28} />
              <span style={{ color: t.textPrimary }}>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  const shellStyle: React.CSSProperties = {
    background  : t.sidebarBg,
    borderRight : `1px solid ${t.sidebarBorder}`,
  };

  return (
    <>
      {/* DESKTOP + TABLET (≥768px) — in-flow flex child */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 h-screen overflow-hidden transition-all duration-300"
        style={{ width: sidebarCollapsed ? 70 : 260, ...shellStyle }}
      >
        <SidebarContent />
      </aside>

      {/* MOBILE (<768px) — fixed overlay drawer */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 flex flex-col md:hidden
          transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: 260, ...shellStyle }}
      >
        <button
          onClick={onMobileClose}
          className="absolute top-4 right-4 text-lg z-10 transition-colors"
          style={{
            color      : t.sidebarTextMuted,
            background : 'none',
            border     : 'none',
            cursor     : 'pointer',
          }}
        >
          ✕
        </button>
        <SidebarContent />
      </aside>
    </>
  );
};

export default Sidebar;
