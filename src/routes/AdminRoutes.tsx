// ==========================================
// DREAM GROUP CRM - ADMIN ROUTES
// ==========================================
import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants';
import ProtectedRoute from './ProtectedRoute';

const DashboardLayout = lazy(() => import('../layouts/DashboardLayout'));
const AdminDashboard  = lazy(() => import('../pages/Admin/Dashboard/AdminDashboard'));
const PlaceholderPage = lazy(() => import('../components/common/PlaceholderPage'));

// ── Company Master ────────────────────────────────────────────────────────────
const CompanyPage     = lazy(() => import('../pages/Admin/Masters/Company/CompanyPage'));
const CompanyViewPage = lazy(() => import('../pages/Admin/Masters/Company/CompanyViewPage'));
const CompanyFormPage = lazy(() => import('../pages/Admin/Masters/Company/CompanyFormPage'));

const AdminRoutes: React.FC = () => (
  <Routes>
    <Route element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout /></ProtectedRoute>}>
      <Route index element={<Navigate to={ROUTES.ADMIN.DASHBOARD} replace />} />
      <Route path="dashboard" element={<AdminDashboard />} />

      {/* Company */}
      <Route path="masters/company"           element={<CompanyPage />} />
      <Route path="masters/company/view/:id"  element={<CompanyViewPage />} />
      <Route path="masters/company/add"       element={<CompanyFormPage mode="add" />} />
      <Route path="masters/company/edit/:id"  element={<CompanyFormPage mode="edit" />} />

      {/* Other masters */}
      <Route path="masters/department"   element={<PlaceholderPage title="Department" />} />
      <Route path="masters/designation"  element={<PlaceholderPage title="Designation" />} />
      <Route path="masters/roles"        element={<PlaceholderPage title="Roles" />} />
      <Route path="masters/bank-account" element={<PlaceholderPage title="Bank A/C" />} />
      <Route path="masters/building"     element={<PlaceholderPage title="Building" />} />

      {/* Employees */}
      <Route path="employees/employee"   element={<PlaceholderPage title="Employee" />} />
      <Route path="employees/attendance" element={<PlaceholderPage title="Attendance" />} />

      {/* CRM */}
      <Route path="crm/customer-details"  element={<PlaceholderPage title="Customer Details" />} />
      <Route path="crm/leads"             element={<PlaceholderPage title="Leads" />} />
      <Route path="crm/payment-received"  element={<PlaceholderPage title="Payment Received" />} />
      <Route path="crm/payment-dues"      element={<PlaceholderPage title="Payment Dues" />} />

      {/* Standalone */}
      <Route path="audit-history"            element={<PlaceholderPage title="Audit History" />} />
      <Route path="interest-free-calculator" element={<PlaceholderPage title="Interest Free Calculator" />} />
      <Route path="backup-database"          element={<PlaceholderPage title="Backup Database" />} />
    </Route>
  </Routes>
);

export default AdminRoutes;