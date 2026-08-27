// ==========================================
// DREAM GROUP CRM - CUSTOMER ROUTES
// ==========================================
// Deliberately NOT wrapped in DashboardLayout (that's the staff shell —
// full sidebar with every Employee/Admin nav item, wrong for a customer).
// Just ProtectedRoute + the temporary landing page for now.
import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants';
import ProtectedRoute from './ProtectedRoute';

const CustomerDashboard = lazy(() => import('../pages/Customer/Dashboard/CustomerDashboard'));

const CustomerRoutes: React.FC = () => (
  <Routes>
    <Route index element={<Navigate to={ROUTES.CUSTOMER.DASHBOARD} replace />} />
    <Route
      path="dashboard"
      element={
        <ProtectedRoute allowedRoles={['customer']}>
          <CustomerDashboard />
        </ProtectedRoute>
      }
    />
  </Routes>
);

export default CustomerRoutes;
