// ==========================================
// DREAM GROUP CRM - ADMIN ROUTES
// ==========================================
import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants';
import ProtectedRoute from './ProtectedRoute';

const DashboardLayout = lazy(() => import('../layouts/DashboardLayout'));
const AdminDashboard = lazy(() => import('../pages/Admin/Dashboard/AdminDashboard'));
const PlaceholderPage = lazy(() => import('../components/common/PlaceholderPage'));

const AdminRoutes: React.FC = () => (
  <Routes>
    <Route
      element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DashboardLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Navigate to={ROUTES.ADMIN.DASHBOARD} replace />} />
      <Route path="dashboard" element={<AdminDashboard />} />

      {/* Masters */}
      <Route path="masters/company" element={<PlaceholderPage title="Company" />} />
      <Route path="masters/department" element={<PlaceholderPage title="Department" />} />
      <Route path="masters/designation" element={<PlaceholderPage title="Designation" />} />
      <Route path="masters/roles" element={<PlaceholderPage title="Roles" />} />
      <Route path="masters/bank-account" element={<PlaceholderPage title="Bank A/C" />} />
      <Route path="masters/building" element={<PlaceholderPage title="Building" />} />

      {/* Employee-Details */}
      <Route path="employee-details/employee" element={<PlaceholderPage title="Employee" />} />
      <Route path="employee-details/attendance" element={<PlaceholderPage title="Attendance" />} />

      {/* CRM */}
      <Route path="crm/customer-details" element={<PlaceholderPage title="Customer Details" />} />
      <Route path="crm/leads" element={<PlaceholderPage title="Leads" />} />
      <Route path="crm/payment-received" element={<PlaceholderPage title="Payment Received" />} />
      <Route path="crm/payment-dues" element={<PlaceholderPage title="Payment Dues" />} />

      {/* Standalone */}
      <Route path="audit-history" element={<PlaceholderPage title="Audit History" />} />
      <Route path="interest-free-calculator" element={<PlaceholderPage title="Interest Free Calculator" />} />
      <Route path="backup-database" element={<PlaceholderPage title="Backup Database" />} />
    </Route>
  </Routes>
);

export default AdminRoutes;
