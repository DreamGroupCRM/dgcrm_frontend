// ==========================================
// DREAM GROUP CRM - CONSTANTS
// ==========================================

export const APP_NAME = 'Dream Group CRM';
export const APP_SUBTITLE = 'Interest Free Home For All Community People';
export const APP_TAGLINE = 'Building Dreams. Building A Better Future.';

// Keys used to persist auth/session data in localStorage.
// Only what is required to keep the user logged in across page refreshes is stored here.
export const STORAGE_KEYS = {
  TOKEN: 'dgcrm_token',
  // Short-lived, file-only token used to build <img src> URLs for
  // protected uploads — a browser cannot put an Authorization header on an
  // image request. Not a session token; see services/fileAccessService.ts.
  FILE_TOKEN: 'dgcrm_file_token',
  USER: 'dgcrm_user',
  PERMISSIONS: 'dgcrm_permissions',
  THEME: 'dgcrm_theme',
  ROLE: 'dgcrm_role',
  // Appearance system (V_18.0, Phase 2-3) — separate from THEME above on
  // purpose: THEME drives the existing light/dark `getTheme(isDark)` call
  // sites and must stay untouched; this is new, additive state that (for
  // now) only ever resolves to 'existing', so no rendering path reads it
  // yet. See src/redux/slices/appearanceSlice.ts.
  APPEARANCE: 'dgcrm_appearance',
} as const;

// All app routes in one place — used by routers, sidebar links, and redirects.
// URL style: lowercase, hyphenated, no "Add" verb prefixes (e.g. /admin/masters/company).
export const ROUTES = {
  LOGIN: '/login',
  RESET_PASSWORD: '/reset-password',

  ADMIN: {
    ROOT: '/admin',
    DASHBOARD: '/admin/dashboard',

    // Master
    COMPANY: '/admin/masters/company',
    DEPARTMENT: '/admin/masters/department',
    DESIGNATION: '/admin/masters/designation',
    ROLES: '/admin/masters/roles',
    BANK_AC: '/admin/masters/bank-account',
    BUILDING: '/admin/masters/building',
    ACTION_MODULE: '/admin/masters/action-module',
    MODULE_MAPPING: '/admin/masters/module-mapping',

    // Employee
    EMPLOYEE_DETAILS: '/admin/employee/employee-details',
    ATTENDANCE: '/admin/employee/attendance',
    LEAVES: '/admin/employee/leaves',

    // CRM
    CUSTOMER_DETAILS: '/admin/crm/customer-details',
    LEADS: '/admin/crm/leads',
    PAYMENT_RECEIVED: '/admin/crm/payment-received',
    PAYMENT_APPROVALS: '/admin/crm/payment-approvals',
    PAYMENT_DUES: '/admin/crm/payment-dues',
    PAYMENT_UPCOMING: '/admin/crm/payment-upcoming',

    // Standalone
    // V_23.0 — Cancelled Booking module, admin-only (see Sidebar.tsx: it's
    // only ever added to buildAdminNavItems, never employeeNavItems).
    CANCELLED_BOOKING: '/admin/cancelled-booking',
    AUDIT_HISTORY: '/admin/audit-history',
    CUSTOMIZE_SCHEME: '/admin/customize-scheme',
    BUILDING_2D_VIEW: '/admin/building-2d-view',
    BACKUP_DATABASE: '/admin/backup-database',
    EXECUTIVE_DASHBOARD: '/admin/reports/executive-dashboard',
    PENDING_APPROVALS: '/admin/pending-approvals',
    CHANGE_REQUESTS: '/admin/change-requests',

    // Super Admin lobby (superadmin-only, see Sidebar.tsx)
    USER_MANAGEMENT: '/admin/user-management',
  },

  EMPLOYEE: {
    ROOT: '/employee',
    DASHBOARD: '/employee/dashboard',
    CUSTOMER_DETAILS: '/employee/customer-details',
    LEADS: '/employee/leads',
    PAYMENT_RECEIVED: '/employee/payment-received',
    PAYMENT_DUES: '/employee/payment-dues',
    ATTENDANCE: '/employee/attendance',
    LEAVES: '/employee/leaves',
    // The employee sidebar mirrors the admin one for the pages an employee
    // legitimately works in. These reuse the SAME page components as the
    // admin routes — the difference is server-side: every list is scoped
    // to the customers assigned to this employee (customer_assignments).
    // See the backend's customerAssignment.repository.ts.
    //
    // Audit History has no entry here on purpose: it stays admin-only
    // (/api/audit is requireAdmin server-side).
    CUSTOMIZE_SCHEME: '/employee/customize-scheme',
    BUILDING_2D_VIEW: '/employee/building-2d-view',
  },

  // Customer First Login — dedicated portal, separate from the staff LOGIN
  // above. The portal's own shell and three sections live under these.
  // V_24.0 — reworked from five sections down to three: Payment Receipt
  // merged into Payment History (one combined table, matching the office's
  // own Payment Received page), and My Documents moved onto Home instead of
  // its own page. PAYMENT_RECEIPT/DOCUMENTS are kept as route STRINGS
  // (rather than deleted) purely so CustomerRoutes.tsx can still redirect
  // anyone with an old link/bookmark to where that content actually lives
  // now — nothing renders at those paths as their own page any more.
  CUSTOMER: {
    ROOT: '/customer',
    LOGIN: '/customer/login',
    // Kept so older links and bookmarks still land somewhere — it now
    // redirects to HOME, which replaced the single scrolling dashboard.
    DASHBOARD: '/customer/dashboard',
    HOME: '/customer/home',
    PAYMENT_HISTORY: '/customer/payment-history',
    PAYMENT_RECEIPT: '/customer/payment-receipt',
    SCHEME: '/customer/emi-schedule',
    DOCUMENTS: '/customer/documents',
  },
} as const;

// Validation rules used by the login form
export const VALIDATION = {
  EMAIL_REGEX: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|co|in|org)$/,
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  MOBILE_REGEX: /^[6-9]\d{9}$/,
};

// Social Links
export const SOCIAL_LINKS = {
  INSTAGRAM: 'https://instagram.com/dreamgroup.co',
  FACEBOOK: 'https://facebook.com/dreamgroup',
  WHATSAPP: 'https://wa.me/918855996468',
};
