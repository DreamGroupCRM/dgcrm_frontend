// ==========================================
// DREAM GROUP CRM - TYPE DEFINITIONS
// ==========================================

export type UserRole = 'Admin' | 'Employee';

export interface User {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  role: UserRole;
  avatar: string | null;
  createdAt: string;
}

export interface UserProfile extends User {
  department?: string;
  designation?: string;
  joinedAt?: string;
  address?: string;
  isActive?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  fullName?: string;
  mobile?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface ProfileResponse {
  success: boolean;
  message: string;
  data: UserProfile;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

// Legacy: kept for backward compatibility
export type ThemeMode = 'light' | 'dark';

// Multi-theme support — 5 themes available
export type ThemeName =
  | 'corporate-blue'
  | 'dark-professional'
  | 'emerald-green'
  | 'royal-purple'
  | 'modern-orange';

export interface ThemeConfig {
  name: ThemeName;
  label: string;
  primaryColor: string;
  accentColor: string;
  sidebarBg: string;
  isDark: boolean;
  preview: string; // CSS gradient string for preview swatch
}

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
