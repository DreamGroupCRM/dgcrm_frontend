// ==========================================
// DREAM GROUP CRM - DASHBOARD LAYOUT
// ==========================================
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAppSelector } from '../hooks';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import ProfileModal from '../components/common/ProfileModal';
import { getTheme } from '../styles/theme';
import '../styles/Responsive.css';

const DashboardLayout: React.FC = () => {
  const { mode } = useAppSelector((s) => s.theme);
  const { sidebarCollapsed } = useAppSelector((s) => s.ui);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDark = mode === 'dark';
  const t = getTheme(isDark);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        background: t.pageBg, fontFamily: t.fontFamily,
        // Exposed to every page (incl. deeply nested master CRUD pages'
        // fixed footers) as a CSS custom property — inheritance isn't
        // affected by transforms/position on elements in between, unlike
        // the `position:fixed` offsets those footers compute from it.
        ['--sidebar-w' as string]: sidebarCollapsed ? '70px' : '260px',
      } as React.CSSProperties}
    >
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 transition-all duration-300">
        <Header onMobileMenuToggle={() => setMobileOpen((prev) => !prev)} />

        <main
          className="flex-1 overflow-y-auto p-5 lg:p-6"
          style={{
            background : t.subtleBg,
            color      : t.textPrimary,
            fontFamily : t.fontFamily,
          }}
        >
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      <ProfileModal />
    </div>
  );
};

export default DashboardLayout;
