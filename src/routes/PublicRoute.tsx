// ==========================================
// DREAM GROUP CRM - PUBLIC ROUTE GUARD
// ==========================================
//
// PURPOSE: Wraps public pages (e.g. Login).
//          If user is already logged in, redirects them straight to their dashboard.
//          Prevents authenticated users from seeing the login page.
//
// USED BY: routes/index.tsx
//
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../hooks';
import { ROUTES } from '../constants';

interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, role } = useAppSelector((s) => s.auth);

  if (isAuthenticated && role) {
    // Already logged in — send to correct dashboard
    return (
      <Navigate
        to={role === 'Admin' ? ROUTES.ADMIN.DASHBOARD : ROUTES.EMPLOYEE.DASHBOARD}
        replace
      />
    );
  }

  return <>{children}</>;
};

export default PublicRoute;
