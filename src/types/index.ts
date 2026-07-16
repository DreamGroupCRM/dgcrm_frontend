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

// Designation interfaces
export interface Designation {
  id           : string;
  name         : string;
  department_id: string;
  department   : string;
  is_active    : boolean;
  sort_order   : number;
  created_at   : string;
  updated_at   : string;
}

export interface DesignationListResponse {
  success: boolean;
  rows   : Designation[];
  total  : number;
  page   : number;
  limit  : number;
}

export interface DesignationResponse {
  success : boolean;
  data    : Designation;
  message?: string;
}

export interface CreateDesignationPayload {
  name         : string;
  department_id: string;
  is_active    : boolean;
  sort_order   : number;
}

export interface UpdateDesignationPayload {
  name         : string;
  department_id: string;
  is_active    : boolean;
  sort_order   : number;
}

// Building interfaces
export interface Building {
  id        : string;
  name      : string;
  address   : string;
  is_active : boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BuildingListResponse {
  success: boolean;
  rows   : Building[];
  total  : number;
  page   : number;
  limit  : number;
}

export interface BuildingResponse {
  success : boolean;
  data    : Building;
  message?: string;
}

export interface CreateBuildingPayload {
  name      : string;
  address   : string;
  is_active : boolean;
  sort_order: number;
}

export interface UpdateBuildingPayload {
  name      : string;
  address   : string;
  is_active : boolean;
  sort_order: number;
}


// Wing interfaces — raw aliased keys (w_*) as actually returned by the API;
// there is no bare "building_id" field, only w_building_id.
export interface Wing {
  w_id         : string | number;
  building     : string;
  w_building_id: string | number;
  w_name       : string;
  floor_count  : number;
  flat_count   : number;
  w_is_active  : boolean;
  w_created_at : string;
  w_updated_at : string;
}

export interface WingListResponse {
  success: boolean;
  rows   : Wing[];
  total  : number;
  page   : number;
  limit  : number;
}

export interface WingResponse {
  success : boolean;
  data    : Wing & { name?: string };
  message?: string;
}

export interface CreateWingPayload {
  name       : string;
  building_id: string | number;
  floor_count: number;
  is_active  : boolean;
  sort_order : number;
}

export interface UpdateWingPayload {
  name       : string;
  building_id: string | number;
  floor_count: number;
  is_active  : boolean;
  sort_order : number;
}


// Floor interfaces — raw aliased keys (f_*) plus joined 'wing' name and live flat_count
export interface Floor {
  f_id          : string | number;
  f_wing_id     : string | number;
  wing          : string;
  f_name        : string;
  f_floor_number: number;
  flat_count    : number;
  f_is_active   : boolean;
  f_created_at  : string;
  f_updated_at  : string;
}

export interface FloorListResponse {
  success: boolean;
  rows   : Floor[];
  total  : number;
  page   : number;
  limit  : number;
}

export interface FloorResponse {
  success : boolean;
  data    : Floor & { name?: string };
  message?: string;
}

export interface CreateFloorPayload {
  name        : string;
  wing_id     : string | number;
  floor_number: number;
  flat_count  : number;
  is_active   : boolean;
  sort_order  : number;
}

export interface UpdateFloorPayload {
  name        : string;
  wing_id     : string | number;
  floor_number: number;
  is_active   : boolean;
  sort_order  : number;
}


// Flat interfaces — raw aliased keys (fl_*) plus joined floor/wing/building names
export interface Flat {
  fl_id         : string | number;
  fl_floor_id   : string | number;
  floor         : string;
  wing          : string;
  building      : string;
  fl_flat_number: string;
  fl_flat_type  : string | null;
  fl_area_sqft  : string | number | null;
  fl_status     : 'vacant' | 'occupied' | 'sold';
  fl_is_active  : boolean;
  fl_created_at : string;
  fl_updated_at : string;
}

export interface FlatListResponse {
  success: boolean;
  rows   : Flat[];
  total  : number;
  page   : number;
  limit  : number;
}

export interface FlatResponse {
  success : boolean;
  data    : Flat;
  message?: string;
}

export interface CreateFlatPayload {
  flat_number: string;
  floor_id   : string | number;
  flat_type? : string;
  area_sqft? : number;
  status     : 'vacant' | 'occupied' | 'sold';
}

export interface UpdateFlatPayload {
  flat_number?: string;
  flat_type?  : string;
  area_sqft?  : number;
  status?     : 'vacant' | 'occupied' | 'sold';
  is_active?  : boolean;
}


// Action Master interfaces — clean entity keys (getMany), no pagination on the API
export interface ActionMaster {
  id         : string | number;
  name       : string;
  code       : string;
  description: string | null;
  is_active  : boolean;
  created_at : string;
  updated_at : string;
}

export interface ActionMasterListResponse {
  success: boolean;
  rows   : ActionMaster[];
  total  : number;
}

export interface ActionMasterResponse {
  success : boolean;
  data    : ActionMaster;
  message?: string;
}

export interface CreateActionMasterPayload {
  name       : string;
  code?      : string;
  description?: string;
}

export interface UpdateActionMasterPayload {
  name?       : string;
  code?       : string;
  description?: string;
  is_active?  : boolean;
}


// Module Master interfaces — raw aliased keys (m_*), no pagination on the API
export interface ModuleMaster {
  m_id        : string | number;
  m_name      : string;
  m_slug      : string;
  m_sort_order: number;
  m_is_active : boolean;
  m_created_at: string;
  m_updated_at: string;
}

export interface ModuleMasterListResponse {
  success: boolean;
  rows   : ModuleMaster[];
  total  : number;
}

export interface ModuleMasterResponse {
  success : boolean;
  data    : ModuleMaster & { name?: string };
  message?: string;
}

export interface CreateModuleMasterPayload {
  name      : string;
  slug?     : string;
  sort_order: number;
}

export interface UpdateModuleMasterPayload {
  name?     : string;
  slug?     : string;
  sort_order?: number;
  is_active?: boolean;
}