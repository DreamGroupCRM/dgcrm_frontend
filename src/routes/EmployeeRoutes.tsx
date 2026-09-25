// ==========================================
// DREAM GROUP CRM - EMPLOYEE ROUTES
// ==========================================
import React, { lazy } from 'react';
import { lazyPage } from './lazyPage';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants';
import ProtectedRoute from './ProtectedRoute';

const DashboardLayout = lazy(() => import('../layouts/DashboardLayout'));
const EmployeeDashboard = lazyPage(() => import('../pages/Employee/Dashboard/EmployeeDashboard'));

// Customer Details, Payment Dues and Payment Received were PlaceholderPage
// stubs here — which is why a customer an admin assigned to an employee
// never showed up anywhere in that employee's login: the pages existed in
// the sidebar but rendered nothing and called no API at all.
//
// They now mount the SAME components the admin routes use. That is safe
// because the scoping is server-side, not a prop: those endpoints return
// only the customers assigned to the caller (customer_assignments). An
// employee cannot widen that from the client — see the backend's
// customerAssignment.repository.ts.
//
// Audit History is NOT among them: it stays admin-only, and /api/audit is
// requireAdmin server-side.
const CustomerDetailsListPage = lazyPage(() => import('../pages/Admin/CRM/Customer-Details/CustomerDetailsListPage'));
const CustomerDetailsCrudPage = lazyPage(() => import('../pages/Admin/CRM/Customer-Details/CustomerDetailsCrudPage'));
const CustomerSchemeViewPage = lazyPage(() => import('../pages/Admin/CRM/Customer-Details/CustomerSchemeViewPage'));
const CancelledBookingPage = lazyPage(() => import('../pages/Admin/CRM/CancelledBooking/CancelledBookingPage'));
const DueReportPage = lazyPage(() => import('../pages/Admin/CRM/DueReport/DueReportPage'));
const PaymentReceivedPage = lazyPage(() => import('../pages/Admin/CRM/PaymentReceived/PaymentReceivedPage'));
const CustomizeSchemePage = lazyPage(() => import('../pages/Admin/CustomizeScheme/CustomizeSchemePage'));
const Building2DViewPage = lazyPage(() => import('../pages/Admin/Building2D/Building2DViewPage'));
const LeadListPage = lazyPage(() => import('../pages/Employee/Leads/LeadListPage'));
const LeadCrudPage = lazyPage(() => import('../pages/Employee/Leads/LeadCrudPage'));
// Attendance — replaces its former PlaceholderPage, backed by the existing
// working attendance API, self-scoped (V_21.0).
const AttendancePage = lazyPage(() => import('../pages/Employee/Attendance/AttendancePage'));
// Leave — first real frontend for the leave module, self-scoped (V_21.0).
const LeavePage = lazyPage(() => import('../pages/Employee/Leaves/LeavePage'));

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
      {/* Scoped server-side to the employee's assigned customers; admin-only
          parts (summary boxes, approvals) are hidden and refused by the API. */}
      <Route path="cancelled-booking" element={<CancelledBookingPage />} />
      <Route path="leads" element={<LeadListPage />} />
      <Route path="leads/add" element={<LeadCrudPage mode="add" />} />
      <Route path="leads/view/:id" element={<LeadCrudPage mode="view" />} />
      <Route path="leads/edit/:id" element={<LeadCrudPage mode="edit" />} />
      <Route path="payment-received" element={<PaymentReceivedPage />} />
      <Route path="payment-dues" element={<DueReportPage />} />
      <Route path="customize-scheme" element={<CustomizeSchemePage />} />
      <Route path="building-2d-view" element={<Building2DViewPage />} />
      <Route path="attendance" element={<AttendancePage />} />
      <Route path="leaves" element={<LeavePage />} />
    </Route>
  </Routes>
);

export default EmployeeRoutes;
