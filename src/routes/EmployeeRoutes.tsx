// ==========================================
// DREAM GROUP CRM - EMPLOYEE ROUTES
// ==========================================
import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants';
import ProtectedRoute from './ProtectedRoute';

const DashboardLayout = lazy(() => import('../layouts/DashboardLayout'));
const EmployeeDashboard = lazy(() => import('../pages/Employee/Dashboard/EmployeeDashboard'));
const PlaceholderPage = lazy(() => import('../components/common/PlaceholderPage'));
const LeadListPage = lazy(() => import('../pages/Employee/Leads/LeadListPage'));
const LeadCrudPage = lazy(() => import('../pages/Employee/Leads/LeadCrudPage'));
// Attendance — replaces its former PlaceholderPage, backed by the existing
// working attendance API, self-scoped (V_21.0).
const AttendancePage = lazy(() => import('../pages/Employee/Attendance/AttendancePage'));
// Leave — first real frontend for the leave module, self-scoped (V_21.0).
const LeavePage = lazy(() => import('../pages/Employee/Leaves/LeavePage'));

const EmployeeRoutes: React.FC = () => (
  <Routes>
    <Route
      element={
        <ProtectedRoute allowedRoles={['employee']}>
          <DashboardLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Navigate to={ROUTES.EMPLOYEE.DASHBOARD} replace />} />
      <Route path="dashboard" element={<EmployeeDashboard />} />
      <Route path="customer-details" element={<PlaceholderPage title="Customer Details" />} />
      <Route path="leads" element={<LeadListPage />} />
      <Route path="leads/add" element={<LeadCrudPage mode="add" />} />
      <Route path="leads/view/:id" element={<LeadCrudPage mode="view" />} />
      <Route path="leads/edit/:id" element={<LeadCrudPage mode="edit" />} />
      <Route path="payment-received" element={<PlaceholderPage title="Payment Received" />} />
      <Route path="payment-dues" element={<PlaceholderPage title="Payment Dues" />} />
      <Route path="attendance" element={<AttendancePage />} />
      <Route path="leaves" element={<LeavePage />} />
    </Route>
  </Routes>
);

export default EmployeeRoutes;
