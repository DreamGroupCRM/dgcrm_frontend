// ==========================================
// DREAM GROUP CRM - EMPLOYEE ROUTES
// ==========================================
import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants';
import ProtectedRoute from './ProtectedRoute';

const DashboardLayout   = lazy(() => import('../layouts/DashboardLayout'));
const EmployeeDashboard = lazy(() => import('../pages/Employee/Dashboard/EmployeeDashboard'));
const PlaceholderPage   = lazy(() => import('../components/common/PlaceholderPage'));

const EmployeeRoutes: React.FC = () => (
  <Routes>
    <Route
      element={
        <ProtectedRoute allowedRoles={['Employee']}>
          <DashboardLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Navigate to={ROUTES.EMPLOYEE.DASHBOARD} replace />} />
      <Route path="Dashboard"        element={<EmployeeDashboard />} />
      <Route path="CustomerDetails"  element={<PlaceholderPage title="Customer Details" />} />
      <Route path="LeadsInfo"        element={<PlaceholderPage title="Leads Info" />} />
      <Route path="PaymentReceived"  element={<PlaceholderPage title="Payment Received" />} />
      <Route path="PaymentDues"      element={<PlaceholderPage title="Payment Dues" />} />
      <Route path="Attendance"       element={<PlaceholderPage title="Attendance" />} />
    </Route>
  </Routes>
);

export default EmployeeRoutes;
