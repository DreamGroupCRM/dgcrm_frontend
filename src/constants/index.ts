// ==========================================
// DREAM GROUP CRM - CONSTANTS
// ==========================================

export const APP_NAME = 'Dream Group CRM';
export const APP_SUBTITLE = 'Interest Free Home For All Community People';
export const APP_TAGLINE = 'Building Dreams. Building A Better Future.';

// Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'dgcrm_token',
  USER: 'dgcrm_user',
  THEME: 'dgcrm_theme',
  ROLE: 'dgcrm_role',
} as const;

// Routes
export const ROUTES = {
  LOGIN: '/login',
  ADMIN: {
    ROOT: '/Admin',
    DASHBOARD: '/Admin/Dashboard',
    BUSINESS_PROFILE: '/Admin/Company/BusinessProfile',
    DEPARTMENTS: '/Admin/Company/Departments',
    DESIGNATIONS: '/Admin/Company/Designations',
    FUNCTIONS: '/Admin/Company/Functions',
    EMPLOYEES: '/Admin/Employee/Employees',
    ATTENDANCE: '/Admin/Employee/Attendance',
    LEADS: '/Admin/CRM/Leads',
    PAYMENT_DUE: '/Admin/CRM/PaymentDue',
    PAYMENT_RECEIVED: '/Admin/CRM/PaymentReceived',
    DELETE_LOGS: '/Admin/CRM/DeleteLogs',
    CUSTOMER_DETAILS: '/Admin/CRM/CustomerDetails',
    BOOKING_LETTER: '/Admin/Documents/BookingLetter',
    DECLARATION_FORM: '/Admin/Documents/DeclarationForm',
    ALLOTMENT_LETTER: '/Admin/Documents/AllotmentLetter',
    COMPANY: '/Admin/Others/Company',
    WINGS: '/Admin/Others/Wings',
    BUILDING_NAMES: '/Admin/Others/BuildingNames',
    FLAT_NUMBER: '/Admin/Others/FlatNumber',
    ACTIVITY_HISTORY: '/Admin/ActivityHistory',
    FACEBOOK: '/Admin/AppIntegration/Facebook',
    FACEBOOK_PAGES: '/Admin/AppIntegration/FacebookPages',
    LONG_LIVED_ACCESS: '/Admin/AppIntegration/LongLivedAccess',
    INTEREST_CALCULATOR: '/Admin/InterestFreeCalculator',
    BACKUP_DATABASE: '/Admin/BackupDatabase',
  },
  EMPLOYEE: {
    ROOT: '/Employee',
    DASHBOARD: '/Employee/Dashboard',
    LEADS: '/Employee/Leads',
    ATTENDANCE: '/Employee/MyAttendance',
    CUSTOMER_DETAILS: '/Employee/CustomerDetails',
    PAYMENT_DUES: '/Employee/PaymentDues',
    PAYMENT_RECEIVED: '/Employee/PaymentReceived',
  },
} as const;

// Hardcoded Users (replace with API in production)
export const HARDCODED_USERS = [
  {
    email: 'admin.sohel@gmail.com',
    password: 'Admin@123',
    role: 'Admin' as const,
    fullName: 'Admin Sohel',
    mobile: '9876543210',
    id: '1',
  },
  {
    email: 'employee.sohel@gmail.com',
    password: 'Employee@123',
    role: 'Employee' as const,
    fullName: 'Employee Sohel',
    mobile: '9876543211',
    id: '2',
  },
];

// Validation
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
