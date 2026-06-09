// ==========================================
// DREAM GROUP CRM - SIDEBAR COMPONENT (UPDATED)
// ==========================================
//
// CHANGES IN THIS VERSION:
//   1. Real logo image via <Logo> component
//   2. Logo + brand text click → navigate to Dashboard
//   3. Sidebar background driven by active theme (THEMES config)
//
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { toggleSidebar } from '../../redux/slices/uiSlice';
import { ROUTES } from '../../constants';
import Logo from '../ui/Logo';
import { useNavigate } from 'react-router-dom';
import logoImg from '../../assets/images/logo_dream_group.png';

import {
  MdDashboard, MdBusiness, MdPeople, MdWork, MdAccountTree,
  MdEventAvailable, MdLeaderboard, MdPayment, MdDeleteForever,
  MdContactPage, MdDescription, MdArticle, MdAssignment,
  MdCorporateFare, MdApartment, MdMapsHomeWork, MdLogout,
  MdHistory, MdFacebook, MdCalculate, MdStorage,
  MdExpandMore, MdExpandLess, MdChevronLeft, MdChevronRight,
  MdHome, MdAttachMoney, MdReceiptLong,
} from 'react-icons/md';
import { FaFacebookF, FaKey } from 'react-icons/fa';

interface NavItem {
  label: string;
  path?: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

const adminNavItems: NavItem[] = [
  { label: 'Dashboard', path: ROUTES.ADMIN.DASHBOARD, icon: <MdDashboard /> },
  {
    label: 'Company', icon: <MdBusiness />,
    children: [
      { label: 'Business Profile', path: ROUTES.ADMIN.BUSINESS_PROFILE, icon: <MdCorporateFare /> },
      { label: 'Departments', path: ROUTES.ADMIN.DEPARTMENTS, icon: <MdAccountTree /> },
      { label: 'Designations', path: ROUTES.ADMIN.DESIGNATIONS, icon: <MdWork /> },
      { label: 'Functions', path: ROUTES.ADMIN.FUNCTIONS, icon: <MdAccountTree /> },
    ],
  },
  {
    label: 'Employee', icon: <MdPeople />,
    children: [
      { label: 'Employees', path: ROUTES.ADMIN.EMPLOYEES, icon: <MdPeople /> },
      { label: 'Attendance', path: ROUTES.ADMIN.ATTENDANCE, icon: <MdEventAvailable /> },
    ],
  },
  {
    label: 'CRM', icon: <MdLeaderboard />,
    children: [
      { label: 'Leads', path: ROUTES.ADMIN.LEADS, icon: <MdLeaderboard /> },
      { label: 'Payment Due', path: ROUTES.ADMIN.PAYMENT_DUE, icon: <MdPayment /> },
      { label: 'Payment Received', path: ROUTES.ADMIN.PAYMENT_RECEIVED, icon: <MdAttachMoney /> },
      { label: 'Delete Logs', path: ROUTES.ADMIN.DELETE_LOGS, icon: <MdDeleteForever /> },
      { label: 'Customer Details', path: ROUTES.ADMIN.CUSTOMER_DETAILS, icon: <MdContactPage /> },
    ],
  },
  {
    label: 'Documents', icon: <MdDescription />,
    children: [
      { label: 'Booking Letter', path: ROUTES.ADMIN.BOOKING_LETTER, icon: <MdArticle /> },
      { label: 'Declaration Form', path: ROUTES.ADMIN.DECLARATION_FORM, icon: <MdAssignment /> },
      { label: 'Allotment Letter', path: ROUTES.ADMIN.ALLOTMENT_LETTER, icon: <MdDescription /> },
    ],
  },
  {
    label: 'Others', icon: <MdHome />,
    children: [
      { label: 'Company', path: ROUTES.ADMIN.COMPANY, icon: <MdCorporateFare /> },
      { label: 'Wings', path: ROUTES.ADMIN.WINGS, icon: <MdApartment /> },
      { label: 'Building Names', path: ROUTES.ADMIN.BUILDING_NAMES, icon: <MdMapsHomeWork /> },
      { label: 'Flat Number', path: ROUTES.ADMIN.FLAT_NUMBER, icon: <MdLogout /> },
    ],
  },
  { label: 'Activity History', path: ROUTES.ADMIN.ACTIVITY_HISTORY, icon: <MdHistory /> },
  {
    label: 'App Integration', icon: <MdFacebook />,
    children: [
      { label: 'Facebook', path: ROUTES.ADMIN.FACEBOOK, icon: <FaFacebookF /> },
      { label: 'Facebook Pages', path: ROUTES.ADMIN.FACEBOOK_PAGES, icon: <MdFacebook /> },
      { label: 'Long Lived Access', path: ROUTES.ADMIN.LONG_LIVED_ACCESS, icon: <FaKey /> },
    ],
  },
  { label: 'Interest Free Calculator', path: ROUTES.ADMIN.INTEREST_CALCULATOR, icon: <MdCalculate /> },
  { label: 'Backup Database', path: ROUTES.ADMIN.BACKUP_DATABASE, icon: <MdStorage /> },
];

const employeeNavItems: NavItem[] = [
  { label: 'Dashboard', path: ROUTES.EMPLOYEE.DASHBOARD, icon: <MdDashboard /> },
  { label: 'Leads', path: ROUTES.EMPLOYEE.LEADS, icon: <MdLeaderboard /> },
  { label: 'My Attendance', path: ROUTES.EMPLOYEE.ATTENDANCE, icon: <MdEventAvailable /> },
  { label: 'Customer Details', path: ROUTES.EMPLOYEE.CUSTOMER_DETAILS, icon: <MdContactPage /> },
  { label: 'Payment Dues', path: ROUTES.EMPLOYEE.PAYMENT_DUES, icon: <MdPayment /> },
  { label: 'Payment Received', path: ROUTES.EMPLOYEE.PAYMENT_RECEIVED, icon: <MdReceiptLong /> },
];

// ── Single nav item (leaf or parent) ──
const NavItemComponent: React.FC<{
  item: NavItem;
  collapsed: boolean;
}> = ({ item, collapsed }) => {
  const location = useLocation();
  const [open, setOpen] = useState(() =>
    !!item.children?.some((c) => c.path && location.pathname.startsWith(c.path))
  );

  if (item.children?.length) {
    return (
      <div>
        <button
          onClick={() => !collapsed && setOpen(!open)}
          title={collapsed ? item.label : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${open ? 'bg-white/10 text-yellow-400' : 'text-white/70 hover:bg-white/8 hover:text-white'
            }`}
        >
          <span className="text-xl flex-shrink-0">{item.icon}</span>
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
              <span className="text-white/50">
                {open ? <MdExpandLess size={16} /> : <MdExpandMore size={16} />}
              </span>
            </>
          )}
        </button>
        {!collapsed && open && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-white/10 pl-3">
            {item.children.map((child) => (
              <NavItemComponent key={child.path} item={child} collapsed={false} />
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
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 no-underline ${isActive
          ? 'bg-yellow-500/20 text-yellow-400 shadow-sm'
          : 'text-white/70 hover:bg-white/8 hover:text-white'
        }`
      }
    >
      <span className="text-xl flex-shrink-0">{item.icon}</span>
      {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
    </NavLink>
  );
};

// ── Sidebar shell ──
interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onMobileClose }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { sidebarCollapsed } = useAppSelector((s) => s.ui);
  const { role } = useAppSelector((s) => s.auth);


  const navItems = role === 'Admin' ? adminNavItems : employeeNavItems;
  const { mode } = useAppSelector((s) => s.theme);
  const dashboardRoute =
    role === 'Admin' ? ROUTES.ADMIN.DASHBOARD : ROUTES.EMPLOYEE.DASHBOARD;


  const SidebarContent = () => (
    <div
      className="flex flex-col h-full"
      style={{ width: sidebarCollapsed ? 70 : 260 }}
    >
      {/* ── Brand / Logo ── */}
<div
  className="flex items-center gap-2.5 px-4 border-b border-white/10"
  style={{ minHeight: 64 }}
>
  <img
    src={logoImg}
    alt="Dream Group"
    style={{
      width: sidebarCollapsed ? 28 : 36,
      height: sidebarCollapsed ? 28 : 36,
      objectFit: 'contain',
      mixBlendMode: 'screen',
      flexShrink: 0,
    }}
  />
  {!sidebarCollapsed && (
    <button
      onClick={() => navigate(dashboardRoute)}
      className="bg-transparent border-0 p-0 cursor-pointer focus:outline-none"
    >
      <span
        style={{
          fontFamily: '"Calibri", sans-serif',
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: '#FFFFE0',
        }}
      >
        DGCRM
      </span>
    </button>
  )}
</div>

      {/* ── Role badge ── */}
      {!sidebarCollapsed && (
        <div className="px-4 py-2.5">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${role === 'Admin'
              ? 'bg-yellow-500/20 text-yellow-300'
              : 'bg-green-500/20 text-green-300'
              }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {role} Panel
          </span>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {navItems.map((item, i) => (
          <NavItemComponent key={i} item={item} collapsed={sidebarCollapsed} />
        ))}
      </nav>

      {/* ── Collapse toggle ── */}
      <div className="px-3 pb-4 pt-2 border-t border-white/10">
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
            text-white/50 hover:text-white hover:bg-white/10 transition-all text-sm"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <MdChevronRight size={20} />
          ) : (
            <>
              <MdChevronLeft size={20} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  // ── Shared sidebar style ──
  const sidebarStyle: React.CSSProperties = {
    background: 'linear-gradient(180deg, #0a1f12 0%, #0f2d1a 50%, #0a1a0f 100%)',
    borderRight: '1px solid rgba(255,255,255,0.08)',
  };

  return (
    <>
      {/*
        DESKTOP + TABLET (≥768px):
        Rendered as a real flex child — occupies its width in the layout row.
        At tablet (768–1023px): DashboardLayout auto-sets sidebarCollapsed=true → 70px wide.
        At desktop (≥1024px): sidebarCollapsed=false → 260px wide.
        NOT fixed/absolute — it is IN the flow so content shifts naturally.
      */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 h-screen overflow-hidden transition-all duration-300"
        style={{ width: sidebarCollapsed ? 70 : 260, ...sidebarStyle }}
      >
        <SidebarContent />
      </aside>

      {/*
        MOBILE (<768px):
        Fixed overlay drawer — slides in from left.
        Has zero width in the flex row (position:fixed, outside flow).
        Triggered by hamburger button in Header.
      */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 flex flex-col md:hidden
          transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: 260, ...sidebarStyle }}
      >
        <button
          onClick={onMobileClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white text-lg z-10"
        >
          ✕
        </button>
        <SidebarContent />
      </aside>
    </>
  );
};

export default Sidebar;
