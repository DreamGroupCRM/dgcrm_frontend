// ==========================================
// DREAM GROUP CRM - TYPE DEFINITIONS
// ==========================================

// The backend sends the role as lowercase: "admin" | "employee"
export type BaseRole = 'admin' | 'employee';

// Detailed role record (comes nested inside user.role from the login API)
export interface RoleInfo {
  id: number;
  company_id: number;
  name: string;
  slug: string;
  base_role: BaseRole;
  description: string | null;
  is_active: boolean;
  is_delete?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: number | null;
  updated_by?: number | null;
}

// Logged-in user, exactly as returned by POST /api/auth/login
export interface User {
  id: number;
  company_id: number;
  role_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  base_role: BaseRole;
  allow_login: boolean;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  role: RoleInfo;
}

// Module-level permission flags, e.g. permissions.leads.create
export interface ModulePermissions {
  [action: string]: boolean;
}

export interface Permissions {
  [module: string]: ModulePermissions;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// POST /api/auth/login response — success/token/user/permissions are top-level
export interface LoginResponse {
  success: boolean;
  message?: string;
  token: string;
  user: User;
  permissions: Permissions;
}

// POST /api/auth/logout response
export interface LogoutResponse {
  success: boolean;
  message?: string;
}

// GET /api/auth/profile response
export interface ProfileResponse {
  success: boolean;
  message?: string;
  data: UserProfile;
}

export interface UserProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  base_role: string;
  last_login_at: string | null;
  created_at: string;
  role_name: string;
  role_slug: string;
  company_name: string;
  company_logo: string | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

// Light/dark UI theme toggle (header sun/moon icon)
export type ThemeMode = 'light' | 'dark';

export interface SidebarItem {
  label: string;
  path: string;
  icon: string;
  children?: SidebarItem[];
}

export interface NotificationState {
  open: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

// ── Company Master ────────────────────────────────────────────────────────────
export interface Company {
  id: string;
  name: string;
  company_code?: string;
  sort_order?: number;
  email: string;
  phone: string;
  whatsapp_number?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  pan?: string | null;
  gst?: string | null;
  logo_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}
export interface CompanyListResponse {
  success: boolean;
  message?: string;
  rows: Company[];                 // API uses "rows", not "data"
  total: number;                   // top-level, not inside pagination
  page: number;
  limit: number;
}

export interface CompanySingleResponse {
  success: boolean;
  message?: string;
  data: Company;
}


// src/types/departmentTypes.ts

export interface Department {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DepartmentListResponse {
  success: boolean;
  rows: Department[];
  total: number;
  page: number;
  limit: number;
}

export interface DepartmentResponse {
  success: boolean;
  data: Department;
  message?: string;
}

export interface CreateDepartmentPayload {
  name: string;
  is_active: boolean;
}

export interface UpdateDepartmentPayload {
  name: string;
  is_active: boolean;
}


// Role interfaces
export interface Role {
  id: string;
  name: string;
  slug: string;
  base_role: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleListResponse {
  success: boolean;
  rows: Role[];
  total: number;
  page: number;
  limit: number;
}

export interface RoleResponse {
  success: boolean;
  data: Role;
  message?: string;
}

export interface CreateRolePayload {
  name: string;
  base_role: string;
  is_active: boolean;
}

export interface UpdateRolePayload {
  name: string;
  base_role: string;
  is_active: boolean;
}


// Bank Account interfaces
export interface BankAccount {
  id            : string;
  name          : string;
  branch_name   : string;
  ifsc_code     : string;
  account_number: string;
  is_active     : boolean;
  sort_order    : number;
  created_at    : string;
  updated_at    : string;
}

export interface BankAccountListResponse {
  success: boolean;
  rows   : BankAccount[];
  total  : number;
  page   : number;
  limit  : number;
}

export interface BankAccountResponse {
  success : boolean;
  data    : BankAccount;
  message?: string;
}

export interface CreateBankAccountPayload {
  name          : string;
  account_number: string;
  branch_name   : string;
  ifsc_code     : string;
  is_active     : boolean;
  sort_order    : number;
}

export interface UpdateBankAccountPayload {
  name          : string;
  account_number: string;
  branch_name   : string;
  ifsc_code     : string;
  is_active     : boolean;
  sort_order    : number;
}