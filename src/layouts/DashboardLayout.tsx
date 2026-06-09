// ==========================================
// DREAM GROUP CRM - DASHBOARD LAYOUT
// ==========================================
//
// PURPOSE: Main layout shell for all authenticated pages.
//          Renders: Sidebar (left) + Header (top) + Page content (main).
//          Handles sidebar collapsed state for proper content margin.
//
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAppSelector } from '../hooks';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import ProfileModal from '../components/common/ProfileModal';
import '../styles/Responsive.css';

const DashboardLayout: React.FC = () => {
  const { mode } = useAppSelector((s) => s.theme);
  const { sidebarCollapsed } = useAppSelector((s) => s.ui);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isDark = mode === 'dark';

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main — shifts right based on sidebar width */}
      <div
        className="flex flex-col flex-1 min-w-0 transition-all duration-300"
      >
        <Header onMobileMenuToggle={() => setMobileOpen(!mobileOpen)} />

        <main
          className={`flex-1 overflow-y-auto p-5 lg:p-6 ${
            isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-800'
          }`}
        >
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Profile modal — rendered at layout level so it overlays everything */}
      <ProfileModal />
    </div>
  );
};

export default DashboardLayout;
