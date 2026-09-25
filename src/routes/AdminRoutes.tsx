// ==========================================
// DREAM GROUP CRM - ADMIN ROUTES
// ==========================================
import React, { lazy } from 'react';
import { lazyPage } from './lazyPage';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants';
import ProtectedRoute from './ProtectedRoute';
// Company Master — single file handles add / edit / view
const CompanyListPage = lazyPage(() => import('../pages/Admin/Masters/Company/CompanyListPage'));
const CompanyCrudPage = lazyPage(() => import('../pages/Admin/Masters/Company/CompanyCrudPage'));

const DepartmentListPage = lazyPage(() => import('@/pages/Admin/Masters/Department/DepartmentListPage'));
const DepartmentCrudPage = lazyPage(() => import('@/pages/Admin/Masters/Department/DepartmentCrudPage'));

const EmployeeDetailsCrudPage = lazyPage(() => import('../pages/Admin/Employee/Employee-Details/EmployeeDetailsCrudPage'));
const EmployeeDetailsListPage = lazyPage(() => import('../pages/Admin/Employee/Employee-Details/EmployeeDetailsListPage'));

const CustomerDetailsListPage = lazyPage(() => import('../pages/Admin/CRM/Customer-Details/CustomerDetailsListPage'));
const CustomerDetailsCrudPage = lazyPage(() => import('../pages/Admin/CRM/Customer-Details/CustomerDetailsCrudPage'));
const CustomerSchemeViewPage = lazyPage(() => import('../pages/Admin/CRM/Customer-Details/CustomerSchemeViewPage'));

const LeadListPage = lazyPage(() => import('../pages/Admin/CRM/Leads/LeadListPage'));
const LeadCrudPage = lazyPage(() => import('../pages/Admin/CRM/Leads/LeadCrudPage'));

const RoleListPage = lazyPage(() => import('../pages/Admin/Masters/Roles/RoleListPage'));
const RoleCrudPage = lazyPage(() => import('../pages/Admin/Masters/Roles/RoleCrudPage'));

const BankAccountListPage = lazyPage(() => import('../pages/Admin/Masters/BankAccount/BankAccountListPage'));
const BankAccountCrudPage = lazyPage(() => import('../pages/Admin/Masters/BankAccount/BankAccountCrudPage'));

const BuildingListPage = lazyPage(() => import('../pages/Admin/Masters/Building/BuildingListPage'));
const BuildingCrudPage = lazyPage(() => import('../pages/Admin/Masters/Building/BuildingCrudPage'));

const ActionModuleListPage = lazyPage(() => import('../pages/Admin/Masters/ActionModule/ActionModuleListPage'));
const ActionMasterCrudPage = lazyPage(() => import('../pages/Admin/Masters/ActionModule/ActionMasterCrudPage'));
const ModuleMasterCrudPage = lazyPage(() => import('../pages/Admin/Masters/ActionModule/ModuleMasterCrudPage'));
const ModuleMappingPage = lazyPage(() => import('../pages/Admin/Masters/ModuleMapping/ModuleMappingPage'));

// Due Report — real data for the "Payment Dues" sidebar entry, replacing
// its former PlaceholderPage now that GET /api/payments/due-report exists.
const DueReportPage = lazyPage(() => import('../pages/Admin/CRM/DueReport/DueReportPage'));

// Customize Scheme — replaces the former "Interest Free Calculator"
// placeholder with a real EMI Scheme & Schedule builder.
const CustomizeSchemePage = lazyPage(() => import('../pages/Admin/CustomizeScheme/CustomizeSchemePage'));
// Building View (2D) — lazy-loaded same as AttendancePage etc. below.
const Building2DViewPage = lazyPage(() => import('../pages/Admin/Building2D/Building2DViewPage'));
// Audit History — replaces its former PlaceholderPage now that
// GET /api/audit-logs exists (item 11).
const AuditHistoryPage = lazyPage(() => import('../pages/Admin/AuditHistory/AuditHistoryPage'));
// Cancelled Booking (V_23.0) — admin-only, see Sidebar.tsx and
// customer.routes.ts's own requireAdmin gate on the backing endpoints.
const CancelledBookingPage = lazyPage(() => import('../pages/Admin/CRM/CancelledBooking/CancelledBookingPage'));
// Payment Received — Payment Approval is merged into it (All/Approved/
// UnApproved views + Approve Selected); the old payment-approvals route
// redirects there. Payment Upcoming is its own
// admin route, opened from the "Payment Upcoming" button on Payment Received.
const PaymentReceivedPage = lazyPage(() => import('../pages/Admin/CRM/PaymentReceived/PaymentReceivedPage'));
const PaymentUpcomingPage = lazyPage(() => import('../pages/Admin/CRM/PaymentUpcoming/PaymentUpcomingPage'));
// Attendance — replaces its former PlaceholderPage, backed by the existing
// working attendance API (V_21.0). Leave Requests (previously its own
// LeaveApprovalsPage/route) now lives inside this same page as a tab.
const AttendancePage = lazyPage(() => import('../pages/Admin/Employee/Attendance/AttendancePage'));
// Executive Dashboard — new "Reports" sidebar entry.
const ExecutiveDashboardPage = lazyPage(() => import('../pages/Admin/Reports/ExecutiveDashboardPage'));
// Backup Database — replaces its former PlaceholderPage with real whole-
// database snapshot/restore. User Management — new Super Admin lobby page.
const BackupDatabasePage = lazyPage(() => import('../pages/Admin/Backup/BackupDatabasePage'));
const UserManagementPage = lazyPage(() => import('../pages/Admin/UserManagement/UserManagementPage'));
// Pending Approvals — shared delete-request review queue (see
// pendingApprovals module in dgcrm_backend). Admin/superadmin, same as
// Audit History below — no extra ProtectedRoute needed, the parent
// route already restricts this whole subtree to admin/superadmin.
const PendingApprovalsPage = lazyPage(() => import('../pages/Admin/PendingApprovals/PendingApprovalsPage'));
// Change Requests — Create/Edit proposal review queue (see changeRequests
// module in dgcrm_backend). Admin/superadmin, same as Pending Approvals.
const ChangeRequestsPage = lazyPage(() => import('../pages/Admin/ChangeRequests/ChangeRequestsPage'));

const DashboardLayout = lazy(() => import('../layouts/DashboardLayout'));
const AdminDashboard = lazyPage(() => import('../pages/Admin/Dashboard/AdminDashboard'));
const PlaceholderPage = lazyPage(() => import('../components/common/PlaceholderPage'));

const AdminRoutes: React.FC = () => (
  <Routes>
    <Route element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><DashboardLayout /></ProtectedRoute>}>
      <Route index element={<Navigate to={ROUTES.ADMIN.DASHBOARD} replace />} />
      <Route path="dashboard" element={<AdminDashboard />} />

      <Route path="masters/company" element={<CompanyListPage />} />
      <Route path="masters/company/add" element={<CompanyCrudPage mode="add" />} />
      <Route path="masters/company/edit/:id" element={<CompanyCrudPage mode="edit" />} />
      <Route path="masters/company/view/:id" element={<CompanyCrudPage mode="view" />} />

      <Route path="masters/department" element={<DepartmentListPage />} />
      <Route path="masters/department/add" element={<DepartmentCrudPage mode="add" />} />
      <Route path="masters/department/view/:id" element={<DepartmentCrudPage mode="view" />} />
      <Route path="masters/department/edit/:id" element={<DepartmentCrudPage mode="edit" />} />

      {/* SuperAdmin-only — see Sidebar.tsx / backend's requireSuperAdmin */}
      <Route path="masters/roles" element={<ProtectedRoute allowedRoles={['superadmin']}><RoleListPage /></ProtectedRoute>} />
      <Route path="masters/roles/add" element={<ProtectedRoute allowedRoles={['superadmin']}><RoleCrudPage mode="add" /></ProtectedRoute>} />
      <Route path="masters/roles/view/:id" element={<ProtectedRoute allowedRoles={['superadmin']}><RoleCrudPage mode="view" /></ProtectedRoute>} />
      <Route path="masters/roles/edit/:id" element={<ProtectedRoute allowedRoles={['superadmin']}><RoleCrudPage mode="edit" /></ProtectedRoute>} />

      <Route path="masters/bank-account" element={<BankAccountListPage />} />
      <Route path="masters/bank-account/add" element={<BankAccountCrudPage mode="add" />} />
      <Route path="masters/bank-account/view/:id" element={<BankAccountCrudPage mode="view" />} />
      <Route path="masters/bank-account/edit/:id" element={<BankAccountCrudPage mode="edit" />} />

      <Route path="masters/building" element={<BuildingListPage />} />
      <Route path="masters/building/add" element={<BuildingCrudPage mode="add" />} />
      <Route path="masters/building/view/:id" element={<BuildingCrudPage mode="view" />} />
      <Route path="masters/building/edit/:id" element={<BuildingCrudPage mode="edit" />} />

      {/* SuperAdmin-only — see Sidebar.tsx / backend's requireSuperAdmin */}
      <Route path="masters/action-module" element={<ProtectedRoute allowedRoles={['superadmin']}><ActionModuleListPage /></ProtectedRoute>} />
      <Route path="masters/action/add" element={<ProtectedRoute allowedRoles={['superadmin']}><ActionMasterCrudPage mode="add" /></ProtectedRoute>} />
      <Route path="masters/action/view/:id" element={<ProtectedRoute allowedRoles={['superadmin']}><ActionMasterCrudPage mode="view" /></ProtectedRoute>} />
      <Route path="masters/action/edit/:id" element={<ProtectedRoute allowedRoles={['superadmin']}><ActionMasterCrudPage mode="edit" /></ProtectedRoute>} />

      <Route path="masters/module/add" element={<ProtectedRoute allowedRoles={['superadmin']}><ModuleMasterCrudPage mode="add" /></ProtectedRoute>} />
      <Route path="masters/module/view/:id" element={<ProtectedRoute allowedRoles={['superadmin']}><ModuleMasterCrudPage mode="view" /></ProtectedRoute>} />
      <Route path="masters/module/edit/:id" element={<ProtectedRoute allowedRoles={['superadmin']}><ModuleMasterCrudPage mode="edit" /></ProtectedRoute>} />

      <Route path="masters/module-mapping" element={<ProtectedRoute allowedRoles={['superadmin']}><ModuleMappingPage /></ProtectedRoute>} />

      <Route path="employee/employee-details" element={<EmployeeDetailsListPage />} />
      <Route path="employee/employee-details/add" element={<EmployeeDetailsCrudPage mode="add" />} />
      <Route path="employee/employee-details/view/:id" element={<EmployeeDetailsCrudPage mode="view" />} />
      <Route path="employee/employee-details/edit/:id" element={<EmployeeDetailsCrudPage mode="edit" />} />
      <Route path="employee/attendance" element={<AttendancePage />} />
      {/* Old standalone Leave Requests route — now a tab inside Attendance. */}
      <Route path="employee/leaves" element={<Navigate to={ROUTES.ADMIN.ATTENDANCE} replace />} />

      <Route path="crm/customer-details" element={<CustomerDetailsListPage />} />
      <Route path="crm/customer-details/add" element={<CustomerDetailsCrudPage mode="add" />} />
      <Route path="crm/customer-details/view/:id" element={<CustomerDetailsCrudPage mode="view" />} />
      <Route path="crm/customer-details/edit/:id" element={<CustomerDetailsCrudPage mode="edit" />} />
      <Route path="crm/customer-details/scheme/:id" element={<CustomerSchemeViewPage />} />
      <Route path="crm/payment-dues" element={<DueReportPage />} />
      <Route path="crm/payment-received" element={<PaymentReceivedPage />} />
      {/* Old standalone Payment Approvals/Upcoming routes — now tabs
          inside Payment Received (V_23.0), same merge pattern as
          Leave -> Attendance below. */}
      <Route path="crm/payment-approvals" element={<Navigate to={ROUTES.ADMIN.PAYMENT_RECEIVED} replace />} />
      <Route path="crm/payment-upcoming" element={<PaymentUpcomingPage />} />
      <Route path="crm/leads" element={<LeadListPage />} />
      <Route path="crm/leads/add" element={<LeadCrudPage mode="add" />} />
      <Route path="crm/leads/view/:id" element={<LeadCrudPage mode="view" />} />
      <Route path="crm/leads/edit/:id" element={<LeadCrudPage mode="edit" />} />

      <Route path="reports/executive-dashboard" element={<ExecutiveDashboardPage />} />
      <Route path="cancelled-booking" element={<CancelledBookingPage />} />
      <Route path="audit-history" element={<AuditHistoryPage />} />
      <Route path="pending-approvals" element={<PendingApprovalsPage />} />
      <Route path="change-requests" element={<ChangeRequestsPage />} />
      <Route path="customize-scheme" element={<CustomizeSchemePage />} />
      <Route path="building-2d-view" element={<Building2DViewPage />} />

      {/* SuperAdmin-only — see Sidebar.tsx / backend's requireSuperAdmin */}
      <Route path="backup-database" element={<ProtectedRoute allowedRoles={['superadmin']}><BackupDatabasePage /></ProtectedRoute>} />
      <Route path="user-management" element={<ProtectedRoute allowedRoles={['superadmin']}><UserManagementPage /></ProtectedRoute>} />
    </Route>
  </Routes>
);

export default AdminRoutes;
