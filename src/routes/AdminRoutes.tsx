// ==========================================
// DREAM GROUP CRM - ADMIN ROUTES
// ==========================================
import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants';
import ProtectedRoute from './ProtectedRoute';
// Company Master — single file handles add / edit / view
const CompanyListPage = lazy(() => import('../pages/Admin/Masters/Company/CompanyListPage'));
const CompanyCrudPage = lazy(() => import('../pages/Admin/Masters/Company/CompanyCrudPage'));

import DepartmentListPage from '@/pages/Admin/Masters/Department/DepartmentListPage';
import DepartmentCrudPage from '@/pages/Admin/Masters/Department/DepartmentCrudPage';

import EmployeeDetailsCrudPage from '../pages/Admin/Employee/Employee-Details/EmployeeDetailsCrudPage';
import EmployeeDetailsListPage from '../pages/Admin/Employee/Employee-Details/EmployeeDetailsListPage';

import CustomerDetailsListPage from '../pages/Admin/CRM/Customer-Details/CustomerDetailsListPage';
import CustomerDetailsCrudPage from '../pages/Admin/CRM/Customer-Details/CustomerDetailsCrudPage';
import CustomerSchemeViewPage from '../pages/Admin/CRM/Customer-Details/CustomerSchemeViewPage';

import RoleListPage from '../pages/Admin/Masters/Roles/RoleListPage';
import RoleCrudPage from '../pages/Admin/Masters/Roles/RoleCrudPage';

import BankAccountListPage from '../pages/Admin/Masters/BankAccount/BankAccountListPage';
import BankAccountCrudPage from '../pages/Admin/Masters/BankAccount/BankAccountCrudPage';

import BuildingListPage from '../pages/Admin/Masters/Building/BuildingListPage';
import BuildingCrudPage from '../pages/Admin/Masters/Building/BuildingCrudPage';

import ActionModuleListPage from '../pages/Admin/Masters/ActionModule/ActionModuleListPage';
import ActionMasterCrudPage from '../pages/Admin/Masters/ActionModule/ActionMasterCrudPage';
import ModuleMasterCrudPage from '../pages/Admin/Masters/ActionModule/ModuleMasterCrudPage';
import ModuleMappingPage from '../pages/Admin/Masters/ModuleMapping/ModuleMappingPage';

// Due Report — real data for the "Payment Dues" sidebar entry, replacing
// its former PlaceholderPage now that GET /api/payments/due-report exists.
import DueReportPage from '../pages/Admin/CRM/DueReport/DueReportPage';

// Customize Scheme — replaces the former "Interest Free Calculator"
// placeholder with a real EMI Scheme & Schedule builder.
import CustomizeSchemePage from '../pages/Admin/CustomizeScheme/CustomizeSchemePage';
// Audit History — replaces its former PlaceholderPage now that
// GET /api/audit-logs exists (item 11).
import AuditHistoryPage from '../pages/Admin/AuditHistory/AuditHistoryPage';
// Payment Received — replaces its former PlaceholderPage (item 16).
import PaymentReceivedPage from '../pages/Admin/CRM/PaymentReceived/PaymentReceivedPage';

const DashboardLayout = lazy(() => import('../layouts/DashboardLayout'));
const AdminDashboard = lazy(() => import('../pages/Admin/Dashboard/AdminDashboard'));
const PlaceholderPage = lazy(() => import('../components/common/PlaceholderPage'));

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
      <Route path="employee/attendance" element={<PlaceholderPage title="Attendance" />} />

      <Route path="crm/customer-details" element={<CustomerDetailsListPage />} />
      <Route path="crm/customer-details/add" element={<CustomerDetailsCrudPage mode="add" />} />
      <Route path="crm/customer-details/view/:id" element={<CustomerDetailsCrudPage mode="view" />} />
      <Route path="crm/customer-details/edit/:id" element={<CustomerDetailsCrudPage mode="edit" />} />
      <Route path="crm/customer-details/scheme/:id" element={<CustomerSchemeViewPage />} />
      <Route path="crm/payment-dues" element={<DueReportPage />} />
      <Route path="crm/payment-received" element={<PaymentReceivedPage />} />
      <Route path="crm/leads" element={<PlaceholderPage title="Leads" />} />

      <Route path="audit-history" element={<AuditHistoryPage />} />
      <Route path="customize-scheme" element={<CustomizeSchemePage />} />
      <Route path="backup-database" element={<PlaceholderPage title="Backup Database" />} />
    </Route>
  </Routes>
);

export default AdminRoutes;
