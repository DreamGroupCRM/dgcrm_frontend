// ==========================================
// DGCRM — ROLE-AWARE PAGE PATHS
// ==========================================
// Several CRM pages (Customer Details, Payment Dues, Payment Received,
// Customize Scheme, Building View, Audit History) are now mounted under
// BOTH /admin/... and /employee/..., because an employee legitimately
// works in the same screens — just scoped to the customers assigned to
// them (server-side; see the backend's customerAssignment.repository.ts).
//
// Those pages were written for the admin routes only and navigate with
// hardcoded '/admin/...' strings. Reached from an employee login that
// sends the user to a route their role is not allowed on, and
// ProtectedRoute bounces them. This hook gives a page the prefix for
// whoever is actually logged in, so the same component links correctly
// from either side.
import { useMemo } from 'react';
import { useAppSelector } from './index';
import { isAdminRole } from '../types';

export interface RoleBasePaths {
  /** True when the current login is admin/superadmin. */
  isAdmin: boolean;
  /** '/admin' or '/employee' — the routing root for this role. */
  root: string;
  /** Where the Customer Details list and its detail routes live. */
  customerDetails: string;
  /** Where Payment Dues lives. */
  paymentDues: string;
  /** Where Payment Received lives. */
  paymentReceived: string;
}

export function useRoleBasePath(): RoleBasePaths {
  const role = useAppSelector((s) => s.auth.role);
  return useMemo(() => {
    const admin = isAdminRole(role);
    // The two trees are not mirror images: the admin one nests the CRM
    // pages under /crm/, the employee one is flat. Spelling each path out
    // rather than composing '<root>/crm/...' keeps this honest about that.
    return admin
      ? {
        isAdmin: true,
        root: '/admin',
        customerDetails: '/admin/crm/customer-details',
        paymentDues: '/admin/crm/payment-dues',
        paymentReceived: '/admin/crm/payment-received',
      }
      : {
        isAdmin: false,
        root: '/employee',
        customerDetails: '/employee/customer-details',
        paymentDues: '/employee/payment-dues',
        paymentReceived: '/employee/payment-received',
      };
  }, [role]);
}
