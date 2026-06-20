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
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  department?: string;
  designation?: string;
  joinedAt?: string;
  address?: string;
  isActive?: boolean;
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
