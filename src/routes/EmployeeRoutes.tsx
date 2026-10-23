// ==========================================
// DREAM GROUP CRM - EMPLOYEE ROUTES
// ==========================================
import React, { lazy } from 'react';
import { lazyPage } from './lazyPage';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants';
import ProtectedRoute from './ProtectedRoute';
import { useAccessProfile } from '../hooks/useAccessProfile';
import { AccessArea } from '../services/accessService';
import { toast } from '@/utils/toast';

// V_26.0 — a page the employee's departments don't give (typed or
// bookmarked address) sends them to their Dashboard instead of an empty
// page. `any`: the page opens with any one of these areas (detail pages
// are linked from several pages). The server still checks every request;
// if the access lookup fails, the page opens and the server decides.
const AreaRoute: React.FC<{ any: AccessArea[]; children: React.ReactElement }> = ({ any, children }) => {
  const { has, loading, failed } = useAccessProfile();
  const allowed = failed || any.some(has);
  React.useEffect(() => {
    if (!loading && !allowed) toast.error("You don't have access to this page.");
  }, [loading, allowed]);
  if (loading) return null;
  return allowed ? children : <Navigate to={ROUTES.EMPLOYEE.DASHBOARD} replace />;
};
const CUSTOMER_LINKED: AccessArea[] = ['customers', 'payment_dues', 'payment_received', 'building_view'];
const area = (any: AccessArea[], el: React.ReactElement) => <AreaRoute any={any}>{el}</AreaRoute>;

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
const MyTasksPage = lazyPage(() => import('../pages/Employee/Tasks/MyTasksPage'));
const CallReportPage = lazyPage(() => import('../pages/Admin/Reports/CallReportPage'));
const MyRequestsPage = lazyPage(() => import('../pages/Employee/MyRequests/MyRequestsPage'));
// V_25.0 — HR pages (same components as the admin ones; add/edit goes to
// Admin approval server-side, admin-only actions are hidden).
const EmployeeDetailsListPage = lazyPage(() => import('../pages/Admin/Employee/Employee-Details/EmployeeDetailsListPage'));
const EmployeeDetailsCrudPage = lazyPage(() => import('../pages/Admin/Employee/Employee-Details/EmployeeDetailsCrudPage'));
const TeamAttendancePage = lazyPage(() => import('../pages/Admin/Employee/Attendance/AttendancePage'));

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
      <Route path="customer-details" element={area(['customers'], <CustomerDetailsListPage />)} />
      {/* Read-only for an employee. The list's own row menu hides Edit and
          Delete for non-admins (see CustomerDetailsListPage), so these are
          the only two detail routes it can link to — no menu entry leads
          to a route that does not exist here. */}
      <Route path="customer-details/view/:id" element={area(CUSTOMER_LINKED, <CustomerDetailsCrudPage mode="view" />)} />
      {/* V_25.0 — a Head with "Can Add Customer" (goes to Admin approval). */}
      <Route path="customer-details/add" element={area(CUSTOMER_LINKED, <CustomerDetailsCrudPage mode="add" />)} />
      {/* V_25.0 — a Head's edit goes to Admin approval (enforced server-side). */}
      <Route path="customer-details/edit/:id" element={area(['customers'], <CustomerDetailsCrudPage mode="edit" />)} />
      <Route path="customer-details/scheme/:id" element={area(CUSTOMER_LINKED, <CustomerSchemeViewPage />)} />
      {/* Scoped server-side to the employee's assigned customers; admin-only
          parts (summary boxes, approvals) are hidden and refused by the API. */}
      <Route path="cancelled-booking" element={area(['cancelled_booking'], <CancelledBookingPage />)} />
      {/* View / Show Scheme opened from Cancelled Booking stay under it; Go Back returns here. */}
      <Route path="cancelled-booking/view/:id" element={area(['cancelled_booking'], <CustomerDetailsCrudPage mode="view" from="cancelled" />)} />
      <Route path="cancelled-booking/scheme/:id" element={area(['cancelled_booking'], <CustomerSchemeViewPage from="cancelled" />)} />
      <Route path="leads" element={area(['leads'], <LeadListPage />)} />
      <Route path="leads/add" element={area(['leads'], <LeadCrudPage mode="add" />)} />
      <Route path="leads/view/:id" element={area(['leads'], <LeadCrudPage mode="view" />)} />
      <Route path="leads/edit/:id" element={area(['leads'], <LeadCrudPage mode="edit" />)} />
      <Route path="payment-received" element={area(['payment_received'], <PaymentReceivedPage />)} />
      <Route path="payment-dues" element={area(['payment_dues'], <DueReportPage />)} />
      <Route path="customize-scheme" element={area(['customize_scheme'], <CustomizeSchemePage />)} />
      <Route path="building-2d-view" element={area(['building_view'], <Building2DViewPage />)} />
      <Route path="attendance" element={<AttendancePage />} />
      <Route path="leaves" element={<LeavePage />} />
      <Route path="tasks" element={<MyTasksPage />} />
      <Route path="call-report" element={<CallReportPage />} />
      <Route path="my-requests" element={<MyRequestsPage />} />
      <Route path="employee-details" element={area(['employee_details'], <EmployeeDetailsListPage />)} />
      <Route path="employee-details/add" element={area(['employee_details'], <EmployeeDetailsCrudPage mode="add" />)} />
      <Route path="employee-details/view/:id" element={area(['employee_details'], <EmployeeDetailsCrudPage mode="view" />)} />
      <Route path="employee-details/edit/:id" element={area(['employee_details'], <EmployeeDetailsCrudPage mode="edit" />)} />
      <Route path="team-attendance" element={<TeamAttendancePage />} />
    </Route>
  </Routes>
);

export default EmployeeRoutes;
