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

import DesignationListPage from '../pages/Admin/Masters/Designation/DesignationListPage';
import DesignationCrudPage from '../pages/Admin/Masters/Designation/DesignationCrudPage';

import RoleListPage from '../pages/Admin/Masters/Roles/RoleListPage'
import RoleCrudPage from '../pages/Admin/Masters/Roles/RoleCrudPage';

import BankAccountListPage from '../pages/Admin/Masters/BankAccount/BankAccountListPage';
import BankAccountCrudPage from '../pages/Admin/Masters/BankAccount/BankAccountCrudPage';

import BuildingListPage from '../pages/Admin/Masters/Building/BuildingListPage';
import BuildingCrudPage from '../pages/Admin/Masters/Building/BuildingCrudPage';

import ActionModuleListPage from '../pages/Admin/Masters/ActionModule/ActionModuleListPage';
import ActionMasterCrudPage from '../pages/Admin/Masters/ActionModule/ActionMasterCrudPage';
import ModuleMasterCrudPage from '../pages/Admin/Masters/ActionModule/ModuleMasterCrudPage';
import ModuleMappingPage from '../pages/Admin/Masters/ModuleMapping/ModuleMappingPage';

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

      <Route path="masters/designation" element={<DesignationListPage />} />
      <Route path="masters/designation/add" element={<DesignationCrudPage mode="add" />} />
      <Route path="masters/designation/view/:id" element={<DesignationCrudPage mode="view" />} />
      <Route path="masters/designation/edit/:id" element={<DesignationCrudPage mode="edit" />} />

      <Route path="masters/roles" element={<RoleListPage />} />
      <Route path="masters/roles/add" element={<RoleCrudPage mode="add" />} />
      <Route path="masters/roles/view/:id" element={<RoleCrudPage mode="view" />} />
      <Route path="masters/roles/edit/:id" element={<RoleCrudPage mode="edit" />} />

      <Route path="masters/bank-account" element={<BankAccountListPage />} />
      <Route path="masters/bank-account/add" element={<BankAccountCrudPage mode="add" />} />
      <Route path="masters/bank-account/view/:id" element={<BankAccountCrudPage mode="view" />} />
      <Route path="masters/bank-account/edit/:id" element={<BankAccountCrudPage mode="edit" />} />

      <Route path="masters/building" element={<BuildingListPage />} />
      <Route path="masters/building/add" element={<BuildingCrudPage mode="add" />} />
      <Route path="masters/building/view/:id" element={<BuildingCrudPage mode="view" />} />
      <Route path="masters/building/edit/:id" element={<BuildingCrudPage mode="edit" />} />

      <Route path="masters/action-module" element={<ActionModuleListPage />} />
      <Route path="masters/action/add" element={<ActionMasterCrudPage mode="add" />} />
      <Route path="masters/action/view/:id" element={<ActionMasterCrudPage mode="view" />} />
      <Route path="masters/action/edit/:id" element={<ActionMasterCrudPage mode="edit" />} />

      <Route path="masters/module/add" element={<ModuleMasterCrudPage mode="add" />} />
      <Route path="masters/module/view/:id" element={<ModuleMasterCrudPage mode="view" />} />
      <Route path="masters/module/edit/:id" element={<ModuleMasterCrudPage mode="edit" />} />

      <Route path="masters/module-mapping" element={<ModuleMappingPage />} />

      <Route path="employees/employee-details" element={<PlaceholderPage title="Employee Details" />} />
      <Route path="employees/attendance" element={<PlaceholderPage title="Attendance" />} />

      <Route path="crm/customer-details" element={<PlaceholderPage title="Customer Details" />} />
      <Route path="crm/leads" element={<PlaceholderPage title="Leads" />} />
      <Route path="crm/payment-received" element={<PlaceholderPage title="Payment Received" />} />
      <Route path="crm/payment-dues" element={<PlaceholderPage title="Payment Dues" />} />

      <Route path="audit-history" element={<PlaceholderPage title="Audit History" />} />
      <Route path="interest-free-calculator" element={<PlaceholderPage title="Interest Free Calculator" />} />
      <Route path="backup-database" element={<PlaceholderPage title="Backup Database" />} />
    </Route>
  </Routes>
);

export default AdminRoutes;