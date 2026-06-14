// ==========================================
// DREAM GROUP CRM - ADMIN ROUTES
// ==========================================
import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants';
import ProtectedRoute from './ProtectedRoute';

const DashboardLayout  = lazy(() => import('../layouts/DashboardLayout'));
const AdminDashboard   = lazy(() => import('../pages/Admin/Dashboard/AdminDashboard'));
const PlaceholderPage  = lazy(() => import('../components/common/PlaceholderPage'));

const AdminRoutes: React.FC = () => (
  <Routes>
    <Route
      element={
        <ProtectedRoute allowedRoles={['Admin']}>
          <DashboardLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Navigate to={ROUTES.ADMIN.DASHBOARD} replace />} />
      <Route path="Dashboard" element={<AdminDashboard />} />

      {/* Master */}
      <Route path="Master/AddCompany"     element={<PlaceholderPage title="Add Company" />} />
      <Route path="Master/AddDepartment"  element={<PlaceholderPage title="Add Department" />} />
      <Route path="Master/AddDesignation" element={<PlaceholderPage title="Add Designation" />} />
      <Route path="Master/AddRoles"       element={<PlaceholderPage title="Add Roles" />} />
      <Route path="Master/AddBankAccount" element={<PlaceholderPage title="Add Bank A/C" />} />
      <Route path="Master/AddBuilding"    element={<PlaceholderPage title="Add Building" />} />

      {/* Employee */}
      <Route path="Employee/AddEmployee" element={<PlaceholderPage title="Add Employee" />} />
      <Route path="Employee/Attendance"  element={<PlaceholderPage title="Attendance" />} />

      {/* CRM */}
      <Route path="CRM/CustomerDetails" element={<PlaceholderPage title="Customer Details" />} />
      <Route path="CRM/LeadsInfo"       element={<PlaceholderPage title="Leads Info" />} />
      <Route path="CRM/PaymentReceived" element={<PlaceholderPage title="Payment Received" />} />
      <Route path="CRM/PaymentDues"     element={<PlaceholderPage title="Payment Dues" />} />

      {/* Standalone */}
      <Route path="AuditHistory"            element={<PlaceholderPage title="Audit History" />} />
      <Route path="InterestFreeCalculator"  element={<PlaceholderPage title="Interest Free Calculator" />} />
      <Route path="BackupDatabase"          element={<PlaceholderPage title="Backup Database" />} />
    </Route>
  </Routes>
);

export default AdminRoutes;
