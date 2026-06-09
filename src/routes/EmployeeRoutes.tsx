// ==========================================
// DREAM GROUP CRM - EMPLOYEE ROUTES
// ==========================================
//
// PURPOSE: All Employee-only routes live here.
//          Wrapped by ProtectedRoute with allowedRoles={['Employee']}.
//
// TO ADD A NEW EMPLOYEE PAGE:
//   1. Create the page in src/pages/Employee/YourModule/YourPage.tsx
//   2. Add a lazy import below
//   3. Add a <Route> inside the Routes block
//   4. Add the path to constants/index.ts → ROUTES.EMPLOYEE
//
import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants';
import ProtectedRoute from './ProtectedRoute';

const DashboardLayout = lazy(() => import('../layouts/DashboardLayout'));
const EmployeeDashboard = lazy(() => import('../pages/Employee/Dashboard/EmployeeDashboard'));
const PlaceholderPage = lazy(() => import('../components/common/PlaceholderPage'));

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
      <Route path="Dashboard"       element={<EmployeeDashboard />} />
      <Route path="Leads"           element={<PlaceholderPage title="Leads" />} />
      <Route path="MyAttendance"    element={<PlaceholderPage title="My Attendance" />} />
      <Route path="CustomerDetails" element={<PlaceholderPage title="Customer Details" />} />
      <Route path="PaymentDues"     element={<PlaceholderPage title="Payment Dues" />} />
      <Route path="PaymentReceived" element={<PlaceholderPage title="Payment Received" />} />
    </Route>
  </Routes>
);

export default EmployeeRoutes;
