// ==========================================
// DREAM GROUP CRM - CONSTANTS
// ==========================================

export const APP_NAME = 'Dream Group CRM';
export const APP_SUBTITLE = 'Interest Free Home For All Community People';
export const APP_TAGLINE = 'Building Dreams. Building A Better Future.';

// Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'dgcrm_token',
  USER:  'dgcrm_user',
  THEME: 'dgcrm_theme',
  ROLE:  'dgcrm_role',
} as const;

// Routes
export const ROUTES = {
  LOGIN: '/login',

  ADMIN: {
    ROOT      : '/Admin',
    DASHBOARD : '/Admin/Dashboard',

    // Master
    ADD_COMPANY     : '/Admin/Master/AddCompany',
    ADD_DEPARTMENT  : '/Admin/Master/AddDepartment',
    ADD_DESIGNATION : '/Admin/Master/AddDesignation',
    ADD_ROLES       : '/Admin/Master/AddRoles',
    ADD_BANK_AC     : '/Admin/Master/AddBankAccount',
    ADD_BUILDING    : '/Admin/Master/AddBuilding',

    // Employee
    ADD_EMPLOYEE : '/Admin/Employee/AddEmployee',
    ATTENDANCE   : '/Admin/Employee/Attendance',

    // CRM
    CUSTOMER_DETAILS  : '/Admin/CRM/CustomerDetails',
    LEADS_INFO        : '/Admin/CRM/LeadsInfo',
    PAYMENT_RECEIVED  : '/Admin/CRM/PaymentReceived',
    PAYMENT_DUES      : '/Admin/CRM/PaymentDues',

    // Standalone
    AUDIT_HISTORY        : '/Admin/AuditHistory',
    INTEREST_CALCULATOR  : '/Admin/InterestFreeCalculator',
    BACKUP_DATABASE      : '/Admin/BackupDatabase',
  },

  EMPLOYEE: {
    ROOT             : '/Employee',
    DASHBOARD        : '/Employee/Dashboard',
    CUSTOMER_DETAILS : '/Employee/CustomerDetails',
    LEADS_INFO       : '/Employee/LeadsInfo',
    PAYMENT_RECEIVED : '/Employee/PaymentReceived',
    PAYMENT_DUES     : '/Employee/PaymentDues',
    ATTENDANCE       : '/Employee/Attendance',
  },
} as const;

// Hardcoded Users (replace with API in production)
export const HARDCODED_USERS = [
  { email: 'admin.sohel@gmail.com',    password: 'Admin@123',    role: 'Admin'    as const, id: '1' },
  { email: 'employee.sohel@gmail.com', password: 'Employee@123', role: 'Employee' as const, id: '2' },
];

// Validation
export const VALIDATION = {
  EMAIL_REGEX    : /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|co|in|org)$/,
  PASSWORD_REGEX : /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  MOBILE_REGEX   : /^[6-9]\d{9}$/,
};

// Social Links
export const SOCIAL_LINKS = {
  INSTAGRAM : 'https://instagram.com/dreamgroup.co',
  FACEBOOK  : 'https://facebook.com/dreamgroup',
  WHATSAPP  : 'https://wa.me/918855996468',
};
