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
  USER: 'dgcrm_user',
  PERMISSIONS: 'dgcrm_permissions',
  THEME: 'dgcrm_theme',
  ROLE: 'dgcrm_role',
} as const;

// All app routes in one place — used by routers, sidebar links, and redirects.
// URL style: lowercase, hyphenated, no "Add" verb prefixes (e.g. /admin/masters/company).
export const ROUTES = {
  LOGIN: '/login',

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

    // Employee
    EMPLOYEE: '/admin/employee-details/employee',
    ATTENDANCE: '/admin/employee-details/attendance',

    // CRM
    CUSTOMER_DETAILS: '/admin/crm/customer-details',
    LEADS: '/admin/crm/leads',
    PAYMENT_RECEIVED: '/admin/crm/payment-received',
    PAYMENT_DUES: '/admin/crm/payment-dues',

    // Standalone
    AUDIT_HISTORY: '/admin/audit-history',
    INTEREST_CALCULATOR: '/admin/interest-free-calculator',
    BACKUP_DATABASE: '/admin/backup-database',
  },

  EMPLOYEE: {
    ROOT: '/employee',
    DASHBOARD: '/employee/dashboard',
    CUSTOMER_DETAILS: '/employee/customer-details',
    LEADS: '/employee/leads',
    PAYMENT_RECEIVED: '/employee/payment-received',
    PAYMENT_DUES: '/employee/payment-dues',
    ATTENDANCE: '/employee/attendance',
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
