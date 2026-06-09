// ==========================================
// DREAM GROUP CRM - ADMIN ROUTES
// ==========================================
//
// PURPOSE: All Admin-only routes live here.
//          Easy to add new Admin pages — just add a Route here.
//          Wrapped by ProtectedRoute with allowedRoles={['Admin']}.
//
// TO ADD A NEW ADMIN PAGE:
//   1. Create the page in src/pages/Admin/YourModule/YourPage.tsx
//   2. Add a lazy import below
//   3. Add a <Route> inside the Routes block
//   4. Add the path to constants/index.ts → ROUTES.ADMIN
//
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
        <ProtectedRoute allowedRoles={['Admin']}>
          <DashboardLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Navigate to={ROUTES.ADMIN.DASHBOARD} replace />} />
      <Route path="Dashboard" element={<AdminDashboard />} />

      {/* Company */}
      <Route path="Company/BusinessProfile" element={<PlaceholderPage title="Business Profile" />} />
      <Route path="Company/Departments"     element={<PlaceholderPage title="Departments" />} />
      <Route path="Company/Designations"    element={<PlaceholderPage title="Designations" />} />
      <Route path="Company/Functions"       element={<PlaceholderPage title="Functions" />} />

      {/* Employee */}
      <Route path="Employee/Employees"  element={<PlaceholderPage title="Employees" />} />
      <Route path="Employee/Attendance" element={<PlaceholderPage title="Attendance" />} />

      {/* CRM */}
      <Route path="CRM/Leads"           element={<PlaceholderPage title="Leads" />} />
      <Route path="CRM/PaymentDue"      element={<PlaceholderPage title="Payment Due" />} />
      <Route path="CRM/PaymentReceived" element={<PlaceholderPage title="Payment Received" />} />
      <Route path="CRM/DeleteLogs"      element={<PlaceholderPage title="Delete Logs" />} />
      <Route path="CRM/CustomerDetails" element={<PlaceholderPage title="Customer Details" />} />

      {/* Documents */}
      <Route path="Documents/BookingLetter"   element={<PlaceholderPage title="Booking Letter" />} />
      <Route path="Documents/DeclarationForm" element={<PlaceholderPage title="Declaration Form" />} />
      <Route path="Documents/AllotmentLetter" element={<PlaceholderPage title="Allotment Letter" />} />

      {/* Others */}
      <Route path="Others/Company"       element={<PlaceholderPage title="Company" />} />
      <Route path="Others/Wings"         element={<PlaceholderPage title="Wings" />} />
      <Route path="Others/BuildingNames" element={<PlaceholderPage title="Building Names" />} />
      <Route path="Others/FlatNumber"    element={<PlaceholderPage title="Flat Number" />} />

      {/* Standalone */}
      <Route path="ActivityHistory"                   element={<PlaceholderPage title="Activity History" />} />
      <Route path="AppIntegration/Facebook"           element={<PlaceholderPage title="Facebook Integration" />} />
      <Route path="AppIntegration/FacebookPages"      element={<PlaceholderPage title="Facebook Pages" />} />
      <Route path="AppIntegration/LongLivedAccess"    element={<PlaceholderPage title="Long Lived User Access" />} />
      <Route path="InterestFreeCalculator"            element={<PlaceholderPage title="Interest Free Calculator" />} />
      <Route path="BackupDatabase"                    element={<PlaceholderPage title="Backup Database" />} />
    </Route>
  </Routes>
);

export default AdminRoutes;
