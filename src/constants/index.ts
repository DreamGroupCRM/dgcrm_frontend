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
    // The employee sidebar now mirrors the admin one for the pages an
    // employee legitimately works in. These reuse the SAME page
    // components as the admin routes — the difference is server-side:
    // every list is scoped to the customers assigned to this employee
    // (customer_assignments), and Audit History returns only their own
    // entries. See the backend's customerAssignment.repository.ts.
    CUSTOMIZE_SCHEME: '/employee/customize-scheme',
    BUILDING_2D_VIEW: '/employee/building-2d-view',
    AUDIT_HISTORY: '/employee/audit-history',
  },

  // Customer First Login — dedicated portal, separate from the staff LOGIN
  // above. Temporary landing page only for now (see CustomerDashboard).
  CUSTOMER: {
    ROOT: '/customer',
    LOGIN: '/customer/login',
    DASHBOARD: '/customer/dashboard',
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
