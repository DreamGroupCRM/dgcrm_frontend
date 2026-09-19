// ==========================================
// DREAM GROUP CRM - EMPLOYEE ROUTES
// ==========================================
import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants';
import ProtectedRoute from './ProtectedRoute';

const DashboardLayout = lazy(() => import('../layouts/DashboardLayout'));
const EmployeeDashboard = lazy(() => import('../pages/Employee/Dashboard/EmployeeDashboard'));

// Customer Details, Payment Dues and Payment Received were PlaceholderPage
// stubs here — which is why a customer an admin assigned to an employee
// never showed up anywhere in that employee's login: the pages existed in
// the sidebar but rendered nothing and called no API at all.
//
// They now mount the SAME components the admin routes use. That is safe
// because the scoping is server-side, not a prop: those endpoints return
// only the customers assigned to the caller (customer_assignments), and
// Audit History returns only the caller's own entries. An employee cannot
// widen that from the client — see the backend's
// customerAssignment.repository.ts and audit.service.ts.
const CustomerDetailsListPage = lazy(() => import('../pages/Admin/CRM/Customer-Details/CustomerDetailsListPage'));
const CustomerDetailsCrudPage = lazy(() => import('../pages/Admin/CRM/Customer-Details/CustomerDetailsCrudPage'));
const CustomerSchemeViewPage = lazy(() => import('../pages/Admin/CRM/Customer-Details/CustomerSchemeViewPage'));
const DueReportPage = lazy(() => import('../pages/Admin/CRM/DueReport/DueReportPage'));
const PaymentReceivedPage = lazy(() => import('../pages/Admin/CRM/PaymentReceived/PaymentReceivedPage'));
const CustomizeSchemePage = lazy(() => import('../pages/Admin/CustomizeScheme/CustomizeSchemePage'));
const Building2DViewPage = lazy(() => import('../pages/Admin/Building2D/Building2DViewPage'));
const AuditHistoryPage = lazy(() => import('../pages/Admin/AuditHistory/AuditHistoryPage'));
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
      <Route path="customer-details" element={<CustomerDetailsListPage />} />
      {/* Read-only for an employee. The list's own row menu hides Edit and
          Delete for non-admins (see CustomerDetailsListPage), so these are
          the only two detail routes it can link to — no menu entry leads
          to a route that does not exist here. */}
      <Route path="customer-details/view/:id" element={<CustomerDetailsCrudPage mode="view" />} />
      <Route path="customer-details/scheme/:id" element={<CustomerSchemeViewPage />} />
      <Route path="leads" element={<LeadListPage />} />
      <Route path="leads/add" element={<LeadCrudPage mode="add" />} />
      <Route path="leads/view/:id" element={<LeadCrudPage mode="view" />} />
      <Route path="leads/edit/:id" element={<LeadCrudPage mode="edit" />} />
      <Route path="payment-received" element={<PaymentReceivedPage />} />
      <Route path="payment-dues" element={<DueReportPage />} />
      <Route path="customize-scheme" element={<CustomizeSchemePage />} />
      <Route path="building-2d-view" element={<Building2DViewPage />} />
      <Route path="audit-history" element={<AuditHistoryPage />} />
      <Route path="attendance" element={<AttendancePage />} />
      <Route path="leaves" element={<LeavePage />} />
    </Route>
  </Routes>
);

export default EmployeeRoutes;
