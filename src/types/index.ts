// ==========================================
// DREAM GROUP CRM - TYPE DEFINITIONS
// ==========================================

// The backend sends the role as lowercase: "admin" | "employee" | "superadmin"
// superadmin is a strict superset of admin (passes every admin check) but is
// also the only role that can reach Module Master / Action Master / Module Mapping
// (those are global config, not scoped to a company).
export type BaseRole = 'admin' | 'employee' | 'superadmin';

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


// Bank Account interfaces — raw aliased keys (b_*) from findBankList/findBankById,
// same convention as Wing/Floor/Flat/Building list responses.
export interface BankAccount {
  b_id                  : string;
  b_company_id          : string;
  company               : string;
  b_name                : string;
  b_account_holder_name : string;
  b_branch_name         : string;
  b_ifsc_code           : string;
  b_account_number      : string;
  b_is_active           : boolean;
  b_sort_order          : number;
  b_created_at          : string;
  b_updated_at          : string;
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
  company_id          : string;
  name                : string;
  account_holder_name : string;
  account_number      : string;
  branch_name         : string;
  ifsc_code           : string;
  is_active           : boolean;
  sort_order          : number;
}

export interface UpdateBankAccountPayload {
  company_id          : string;
  name                : string;
  account_holder_name : string;
  account_number      : string;
  branch_name         : string;
  ifsc_code           : string;
  is_active           : boolean;
  sort_order          : number;
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

// ── Building Master ────────────────────────────────────────────────────────
// A Building has many Wings -> each Wing has many Floors -> each Floor has many Flats.
// GET /api/buildings (plain list) — raw-aliased keys (b_*), same convention as
// Wing/Floor/Flat list responses, plus a live project name + wing/floor/flat counts.
export interface Building {
  b_id         : string;
  b_name       : string;
  b_code       : string | null;
  b_address    : string | null;
  b_project_id : string | number | null;
  b_is_active  : boolean;
  b_sort_order : number;
  b_created_at : string;
  b_updated_at : string;
  project      : string | null;
  wing_count   : number;
  floor_count  : number;
  flat_count   : number;
}

export interface BuildingListResponse {
  success : boolean;
  message?: string;
  rows    : Building[];
  total   : number;
  page    : number;
  limit   : number;
}

export interface BuildingDeleteResponse {
  success : boolean;
  message?: string;
}

// POST /api/buildings/full, GET/PUT /api/buildings/:id/full — the one-page
// wizard's own field names. `id` fields are present on GET (for edit) and
// accepted back on PUT to update that exact row instead of creating a new one.
export interface WizardFlat {
  id?      : number;
  flatNo   : string;
  flatType : string | null;
  flatArea : number | null;
  enabled  : boolean;
}

export interface WizardFloor {
  id?       : number;
  floorName : string;
  flats     : WizardFlat[];
}

export interface WizardWing {
  id?              : number;
  wingName         : string;
  withGroundFloor? : boolean;
  numberOfFloors?  : number;
  floors           : WizardFloor[];
}

export interface CreateFullBuildingPayload {
  project : { projectName: string; location?: string | null };
  building: { buildingName: string; buildingCode?: string | null };
  wings   : WizardWing[];
}

export interface FullBuildingWing {
  id    : number;
  wingName: string;
  floors: Array<{
    id       : number;
    floorName: string;
    flats    : Array<{ id: number; flatNo: string; flatType: string | null; flatArea: number | null; enabled: boolean }>;
  }>;
}

export interface FullBuildingData {
  building: {
    id: number; name: string; code: string | null; project_id: number | null; is_active: boolean;
    project: { projectName: string; location: string | null } | null;
  };
  wings: FullBuildingWing[];
}

export interface FullBuildingResponse {
  success : boolean;
  data    : FullBuildingData;
  message?: string;
}

// Module <-> Action mapping matrix (GET /api/module-action/matrix)
export interface MappingModule {
  id  : number;
  name: string;
  slug: string;
}

export interface MappingAction {
  id  : number;
  name: string;
  code: string;
}

export interface MappingPair {
  id              : number; // module_actions.id — needed to DELETE an unchecked cell
  module_id       : number;
  action_master_id: number;
}

export interface MappingMatrix {
  modules : MappingModule[];
  actions : MappingAction[];
  mappings: MappingPair[];
}

export interface MappingMatrixResponse {
  success: boolean;
  data   : MappingMatrix;
}