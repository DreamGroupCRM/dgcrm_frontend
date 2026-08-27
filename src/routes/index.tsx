// ==========================================
// DREAM GROUP CRM - ROUTES INDEX (ENTRY)
// ==========================================
//
// PURPOSE: Top-level router. Decides which route group to render.
//          This file is the single place to see ALL routes at a glance.
//
// STRUCTURE:
//   /login          → Login page (Public — redirects to dashboard if logged in)
//   /Admin/*        → AdminRoutes.tsx  (role: Admin only)
//   /Employee/*     → EmployeeRoutes.tsx (role: Employee only)
//   /*              → 404 fallback → /login
//
// HOW IT WORKS:
//   BrowserRouter lives here (single router for the whole app).
//   Suspense wraps everything so lazy-loaded pages show a loader.
//
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import PublicRoute from './PublicRoute';

const LoginPage     = lazy(() => import('../pages/Login/LoginPage'));
const ResetPasswordPage = lazy(() => import('../pages/Login/ResetPasswordPage'));
const CustomerLoginPage = lazy(() => import('../pages/Login/CustomerLoginPage'));
const AdminRoutes   = lazy(() => import('./AdminRoutes'));
const EmployeeRoutes = lazy(() => import('./EmployeeRoutes'));
const CustomerRoutes = lazy(() => import('./CustomerRoutes'));

// Shown while any lazy chunk is loading
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-950 to-gray-900">
    <CircularProgress size={40} sx={{ color: '#d97706' }} />
    <p className="text-white/50 text-sm mt-3 font-body">Loading Dream Group CRM...</p>
  </div>
);

const AppRoutes: React.FC = () => (
  <BrowserRouter>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public: /login */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* Public: /reset-password?token=... — the emailed Forgot Password
            link. Deliberately NOT wrapped in PublicRoute: it must work even
            if the browser already has an active session (e.g. for a
            different account), so it never auto-redirects to a dashboard. */}
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Public: /customer/login — Customer First Login's dedicated
            activation/login page (see CustomerLoginPage.tsx). Separate from
            the staff /login above; same underlying auth mechanism. */}
        <Route
          path="/customer/login"
          element={
            <PublicRoute>
              <CustomerLoginPage />
            </PublicRoute>
          }
        />

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Admin pages: /Admin/... */}
        <Route path="/admin/*" element={<AdminRoutes />} />

        {/* Employee pages: /Employee/... */}
        <Route path="/employee/*" element={<EmployeeRoutes />} />

        {/* Customer pages: /customer/... (login route above is separate) */}
        <Route path="/customer/*" element={<CustomerRoutes />} />

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default AppRoutes;
