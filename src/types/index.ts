// ==========================================
// DREAM GROUP CRM - TYPE DEFINITIONS
// ==========================================

// The backend sends the role as lowercase. 'manager' exists in the backend's
// seed data but the frontend has never had a distinct view for it — it's
// left out of this union deliberately, same as before, so it keeps landing
// on the employee view rather than silently gaining admin access.
export type BaseRole = 'superadmin' | 'admin' | 'employee';

// superadmin is a strict superset of admin (see backend's role.ts middleware
// comment) — anywhere the app decides "does this user get the admin view",
// both roles should pass. Anywhere it decides "does this user get the
// SuperAdmin-only screens" (Role Master, Action & Module, Module Mapping),
// check `role === 'superadmin'` directly instead.
export const isAdminRole = (role: BaseRole | null): boolean => role === 'admin' || role === 'superadmin';

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

// POST /api/auth/login (step 1 of 2) response — email+password are verified,
// but no session is issued yet. An OTP was emailed (or logged server-side in
// local dev without SMTP configured); otpToken must be sent back with the
// code to POST /api/auth/verify-otp.
export interface LoginOtpResponse {
  success: boolean;
  otpRequired: true;
  otpToken: string;
  message?: string;
}

export interface VerifyOtpCredentials {
  otpToken: string;
  otp: string;
}

// A real, usable session — either from verify-otp directly, or from
// set-new-password after a forced first-login password reset.
export interface SessionResponse {
  success: boolean;
  message?: string;
  token: string;
  user: User;
  permissions: Permissions;
}

// POST /api/auth/verify-otp (step 2) response — either a full session
// (normal case), or, for a first-time login, a resetToken that only
// POST /api/auth/set-new-password can use.
export interface MustChangePasswordResponse {
  success: boolean;
  mustChangePassword: true;
  resetToken: string;
  message?: string;
}

export type VerifyOtpResponse = SessionResponse | MustChangePasswordResponse;

export interface SetNewPasswordCredentials {
  resetToken: string;
  new_password: string;
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


// ── Department Master (merged with Designation) ─────────────────────────────
// Designations no longer have their own top-level list/CRUD — they're a
// nested collection that lives and is saved entirely alongside their parent
// Department. `id` is present on a designation once it's a real saved
// record (present after fetch, or on an existing row being edited); it's
// omitted for a brand-new row added in the CRUD page before Save. The
// backend upserts by presence/absence of `id` and deletes any of a
// department's existing designations that are no longer present in the
// array — the same "send the whole current state, let the server diff it"
// pattern already used by Building's shops.
export interface Designation {
  id?      : string;
  name     : string;
  is_active: boolean;
}

export interface Department {
  id                    : string;
  name                  : string;
  is_active             : boolean;
  designations          : Designation[];
  total_designations?   : number;   // convenience counts for the list page —
  enabled_designations? : number;   // optional since older/list-row payloads
  disabled_designations?: number;   // may send these instead of full designations[]
  created_at            : string;
  updated_at?           : string;
}

export interface DepartmentListResponse {
  success : boolean;
  message?: string;
  rows    : Department[];
  total   : number;
  page    : number;
  limit   : number;
}

export interface DepartmentSingleResponse {
  success : boolean;
  message?: string;
  data    : Department;
}

export interface DepartmentDeleteResponse {
  success : boolean;
  message?: string;
}

export interface CreateDepartmentPayload {
  name        : string;
  is_active   : boolean;
  designations: Designation[];
}

export interface UpdateDepartmentPayload extends CreateDepartmentPayload {}


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
  id                  : string;
  company_id          : string;
  company_name        : string;
  name                : string;
  account_holder_name : string;
  branch_name         : string;
  ifsc_code           : string;
  account_number      : string;
  is_active           : boolean;
  sort_order          : number;
  created_at          : string;
  updated_at          : string;
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

// Designation is now merged into Department — see the Designation and
// Department interfaces above. This section intentionally left removed.


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
export interface BuildingFlat {
  id       : string;
  flat_no  : string;
  flat_type: string;            // '1 BHK' | '2 BHK' | '3 BHK' | 'Studio' | 'Other'
  area_sqft: number | null;
  is_active: boolean;
}

export interface BuildingFloor {
  id        : string;
  label     : string;           // 'Ground Floor' | '1st Floor' | '2nd Floor' ...
  sort_order: number;
  flats     : BuildingFlat[];
}

export interface BuildingWing {
  id               : string;
  name             : string;    // 'A Wing'
  no_of_floors     : number;    // numbered floors, EXCLUDING ground floor
  with_ground_floor: boolean;
  floors           : BuildingFloor[];
}

// A shop unit on the building's ground/commercial level, independent of
// the wing/floor/flat hierarchy above.
export interface BuildingShop {
  id       : string;
  shop_no  : string;
  area_sqft: number | null;
  is_active: boolean;           // true = Available, false = Booked
}

export interface Building {
  id           : string;
  project_name : string;
  location     : string;
  building_name: string;
  wings        : BuildingWing[];
  has_shops?   : boolean;
  shops?       : BuildingShop[];
  has_parking? : boolean;
  parking_count?: number | null;
  is_active    : boolean;
  created_at   : string;
  updated_at?  : string;
}

// Aggregate counts for the Building List page's top summary cards.
export interface BuildingListSummary {
  total_projects : number;
  total_buildings: number;
  total_wings    : number;
  total_flats    : number;
  enabled_flats  : number;
  disabled_flats : number;
  total_shops    : number;
}

export interface BuildingListResponse {
  success : boolean;
  message?: string;
  rows    : Building[];
  total   : number;
  page    : number;
  limit   : number;
  summary?: BuildingListSummary;
}

export interface BuildingSingleResponse {
  success : boolean;
  message?: string;
  data    : Building;
}

export interface BuildingDeleteResponse {
  success : boolean;
  message?: string;
}

export interface CreateBuildingPayload {
  project_name : string;
  location     : string;
  building_name: string;
  wings        : BuildingWing[];
  has_shops    : boolean;
  shops        : BuildingShop[];
  has_parking  : boolean;
  parking_count: number | null;
  is_active    : boolean;
}

export interface UpdateBuildingPayload extends CreateBuildingPayload {}

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