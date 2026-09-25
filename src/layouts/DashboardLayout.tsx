// ==========================================
// DREAM GROUP CRM - DASHBOARD LAYOUT
// ==========================================
import React, { Suspense, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAppSelector } from '../hooks';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import ProfileModal from '../components/common/ProfileModal';
import { getTheme } from '../styles/theme';
import { useAppearanceTokens } from '../styles/appearanceTokens';
import { ensureFileToken } from '../services/fileAccessService';
import '../styles/Responsive.css';
import { preloadPages } from '../routes/lazyPage';

const DashboardLayout: React.FC = () => {
  const { mode } = useAppSelector((s) => s.theme);
  const { sidebarCollapsed } = useAppSelector((s) => s.ui);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDark = mode === 'dark';
  const t = getTheme(isDark);
  // Setting these CSS custom properties here — the single ancestor of both
  // Sidebar and every routed page's content (via Outlet) — means the
  // Settings-icon Appearance selection reaches every button/icon/table
  // header/pagination control that reads var(--brand-gradient) etc.
  // app-wide, instead of only the ~30 individual pages that used to spread
  // this same object on their own root div (still harmless to do, now
  // redundant — a descendant re-declaring an identical CSS var value is a
  // no-op).
  const { cssVars } = useAppearanceTokens();

  // Uploaded files are no longer publicly readable (see the backend's
  // shared/fileAccess.ts). A browser cannot put an Authorization header on
  // an <img src>, so those URLs carry a short-lived file token instead,
  // which resolveFileUrl() appends. Logging in returns one with the
  // session, so this call normally finds it already there and does
  // nothing — it exists for sessions that were ALREADY OPEN when this
  // shipped, which would otherwise show broken photos until the user
  // logged out and back in. It never throws and never blocks the render.
  useEffect(() => {
    void ensureFileToken();
    // A long-running session can outlive a file token, and an expired one
    // shows up as every image breaking at once with nothing for the app to
    // catch (an <img> error never reaches axios). ensureFileToken() is a
    // no-op unless the token is missing or close to expiring.
    const id = window.setInterval(() => { void ensureFileToken(); }, 30 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  // Once the dashboard is up and the browser is idle, fetch the other
  // pages' code in the background so opening any of them is instant.
  useEffect(() => { preloadPages(); }, []);

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
        ...cssVars,
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
          className="flex-1 overflow-y-auto px-2.5 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-6"
          style={{
            background : t.subtleBg,
            color      : t.textPrimary,
            fontFamily : t.fontFamily,
          }}
        >
          <div className="animate-fade-in">
            {/* A page whose code is still loading shows a small spinner in
                the content area only — sidebar and header stay in place. */}
            <Suspense fallback={
              <div className="flex items-center justify-center" style={{ minHeight: 240 }}>
                <span className="animate-spin rounded-full" style={{ width: 28, height: 28, border: '3px solid rgba(0,0,0,0.12)', borderTopColor: 'var(--brand-ink, #0f766e)' }} />
              </div>
            }>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      <ProfileModal />
    </div>
  );
};

export default DashboardLayout;
