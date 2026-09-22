// ==========================================
// DREAM GROUP CRM - CUSTOMER ROUTES
// ==========================================
// Deliberately NOT wrapped in DashboardLayout (that's the staff shell —
// full sidebar with every Employee/Admin nav item, wrong for a customer).
// The portal has its own shell instead: CustomerPortalLayout, which owns
// the sidebar, the header's booking switcher, and the shared
// selected-booking state every page below reads.
//
// The five sections are nested inside that layout so switching between
// them re-renders only the page — the shell, and with it the customer's
// chosen booking, stays put.
import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants';
import ProtectedRoute from './ProtectedRoute';
import CustomerPortalLayout from '../pages/Customer/CustomerPortalLayout';

const CustomerHomePage = lazy(() => import('../pages/Customer/Home/CustomerHomePage'));
const CustomerPaymentHistoryPage = lazy(() => import('../pages/Customer/PaymentHistory/CustomerPaymentHistoryPage'));
const CustomerSchemePage = lazy(() => import('../pages/Customer/Scheme/CustomerSchemePage'));

const CustomerRoutes: React.FC = () => (
  <Routes>
    <Route index element={<Navigate to={ROUTES.CUSTOMER.HOME} replace />} />
    {/* The single scrolling dashboard this portal replaced. Kept as a
        redirect so older links, bookmarks and any saved login landing
        still arrive somewhere real. */}
    <Route path="dashboard" element={<Navigate to={ROUTES.CUSTOMER.HOME} replace />} />

    <Route
      element={
        <ProtectedRoute allowedRoles={['customer']}>
          <CustomerPortalLayout />
        </ProtectedRoute>
      }
    >
      <Route path="home" element={<CustomerHomePage />} />
      <Route path="payment-history" element={<CustomerPaymentHistoryPage />} />
      {/* V_24.0 — Payment Receipt was its own page/section; its "completed
          payments, each with View/Download" table is now the Approval
          Status/Receipt Actions columns of the single combined table on
          Payment History. Redirect rather than delete, so an old
          bookmark/link still lands somewhere real. */}
      <Route path="payment-receipt" element={<Navigate to={ROUTES.CUSTOMER.PAYMENT_HISTORY} replace />} />
      <Route path="emi-schedule" element={<CustomerSchemePage />} />
      {/* V_24.0 — My Documents moved onto Home instead of its own page. */}
      <Route path="documents" element={<Navigate to={ROUTES.CUSTOMER.HOME} replace />} />
    </Route>

    {/* Anything else under /customer goes to Home rather than a blank screen. */}
    <Route path="*" element={<Navigate to={ROUTES.CUSTOMER.HOME} replace />} />
  </Routes>
);

export default CustomerRoutes;
