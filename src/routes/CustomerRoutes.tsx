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
const CustomerPaymentReceiptPage = lazy(() => import('../pages/Customer/PaymentReceipt/CustomerPaymentReceiptPage'));
const CustomerSchemePage = lazy(() => import('../pages/Customer/Scheme/CustomerSchemePage'));
const CustomerDocumentsPage = lazy(() => import('../pages/Customer/Documents/CustomerDocumentsPage'));

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
      <Route path="payment-receipt" element={<CustomerPaymentReceiptPage />} />
      <Route path="emi-schedule" element={<CustomerSchemePage />} />
      <Route path="documents" element={<CustomerDocumentsPage />} />
    </Route>

    {/* Anything else under /customer goes to Home rather than a blank screen. */}
    <Route path="*" element={<Navigate to={ROUTES.CUSTOMER.HOME} replace />} />
  </Routes>
);

export default CustomerRoutes;
