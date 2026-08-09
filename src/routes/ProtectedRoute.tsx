// ==========================================
// DREAM GROUP CRM - PROTECTED ROUTE GUARD
// ==========================================
//
// PURPOSE: Wraps private pages. Checks if user is authenticated.
//          If not logged in → redirects to /login.
//          If wrong role → redirects to correct dashboard.
//
// USED BY: routes/AdminRoutes.tsx, routes/EmployeeRoutes.tsx
//
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../hooks';
import { BaseRole, isAdminRole } from '../types';
import { ROUTES } from '../constants';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: BaseRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, role } = useAppSelector((s) => s.auth);
  const location = useLocation();

  // Not logged in → go to login, preserving the page they tried to visit
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Wrong role → redirect to own dashboard
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <Navigate
        to={isAdminRole(role) ? ROUTES.ADMIN.DASHBOARD : ROUTES.EMPLOYEE.DASHBOARD}
        replace
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
