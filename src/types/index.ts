// ==========================================
// DREAM GROUP CRM - TYPE DEFINITIONS
// ==========================================

// The backend sends the role as lowercase. 'manager' exists in the backend's
// seed data but the frontend has never had a distinct view for it — it's
// left out of this union deliberately, same as before, so it keeps landing
// on the employee view rather than silently gaining admin access.
// 'customer' — Customer First Login: a customer's linked login account
// (see backend's customer.repository.ts's createCustomerWithUser).
export type BaseRole = 'superadmin' | 'admin' | 'employee' | 'customer';

// superadmin is a strict superset of admin (see backend's role.ts middleware
// comment) — anywhere the app decides "does this user get the admin view",
// both roles should pass. Anywhere it decides "does this user get the
// SuperAdmin-only screens" (Role Master, Action & Module, Module Mapping),
// check `role === 'superadmin'` directly instead.
export const isAdminRole = (role: BaseRole | null): boolean => role === 'admin' || role === 'superadmin';

export const isCustomerRole = (role: BaseRole | null): boolean => role === 'customer';

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

// POST /api/auth/change-password (authenticated) — Change Password
export interface ChangePasswordCredentials {
  old_password: string;
  new_password: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message?: string;
}

// POST /api/auth/forgot-password (public) — always resolves with the same
// generic message regardless of whether the email matches an account.
export interface ForgotPasswordCredentials {
  email: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message?: string;
}

// POST /api/auth/reset-password (public) — consumes the token from the
// emailed reset link.
export interface ResetPasswordCredentials {
  token: string;
  new_password: string;
}

export interface ResetPasswordResponse {
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
  shop_count?  : number;         // list-row shop count (fromListRow) — shops[] isn't shipped on the list endpoint
  // list-row per-building Enabled/Disabled breakdowns (fromListRow) — the
  // Flats/Shops table columns' sub-columns, distinct from BuildingListSummary's
  // page-wide totals below.
  enabled_flats? : number;
  disabled_flats?: number;
  enabled_shops? : number;
  disabled_shops?: number;
  wing_names?    : string;       // comma-separated wing names, e.g. "A, B, C" (fromListRow)
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
  enabled_shops  : number;
  disabled_shops : number;
  // Flats + shops combined — V_14.0's list page summary cards.
  enabled_units  : number;
  disabled_units : number;
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

// ── Customer Details (CRM) ──────────────────────────────────────────────────
// A customer is tied to one flat (building -> wing -> flat), and may be
// assigned to one employee for follow-up. Building/Wing/Flat data is not
// duplicated here — the CRUD/List pages source it live from the existing
// Building module (fetchBuildingList), same as Employee's checkboxes reuse
// Department data conceptually, just live-fetched instead of hardcoded
// since a real Building/Wing/Flat picker needs to cascade correctly.
export type CustomerStatus = 'active' | 'inactive';

export interface Customer {
  id                          : string;
  customer_code?               : string;
  customer_photo_url?          : string | null;
  customer_name               : string;
  mobile_number                : string;
  email                         : string;
  address?                      : string;

  building_id                    : string;
  building_name                   : string;
  wing_id?                         : string;
  wing_name                         : string;
  flat_id?                           : string;
  flat_no                             : string;
  flat_type                            : string;
  area_sqft                             : number | null;

  booking_date                           : string;
  monthly_emi                             : number | null;

  assigned_employee_id?                    : string;
  assigned_employee_code?                   : string;
  assigned_employee_name?                    : string;
  assigned_employee_photo_url?                : string | null;

  status                                       : CustomerStatus;
  is_active                                     : boolean;
  created_at                                     : string;
  updated_at?                                     : string;
}

export interface CustomerListSummary {
  total_customers  : number;
  active_customers  : number;
  inactive_customers : number;
  new_this_month       : number;
}

export interface CustomerListFilters {
  customer_name?: string;
  building_name? : string;
  wing?          : string;
  flat_no?       : string;
  from_date?     : string;
  to_date?       : string;
  // Resolved ids — unlike building_name/wing/flat_no above (display names
  // the backend can't filter by directly), these map straight onto the
  // backend's own building_id/wing_id/flat_id/assignment_status params.
  building_id?      : string;
  wing_id?          : string;
  flat_id?          : string;
  assignment_status?: 'assigned' | 'unassigned';
}

export interface CustomerListResponse {
  success : boolean;
  message?: string;
  rows    : Customer[];
  total   : number;
  page    : number;
  limit   : number;
  summary?: CustomerListSummary;
}

export interface CustomerSingleResponse {
  success : boolean;
  message?: string;
  data    : Customer;
}

// POST/PUT /api/customers response — admin/superadmin gets the Customer
// back immediately (pending: false); anyone else's create/edit is queued
// for admin review instead (see modules/changeRequests/ in dgcrm_backend)
// and there's no updated Customer row yet, so no `data`.
export type CustomerCreateEditResponse =
  | { success: boolean; pending: false; message?: string; data: Customer }
  | { success: boolean; pending: true; message?: string };

export interface CustomerDeleteResponse {
  success : boolean;
  message?: string;
}

export interface CreateCustomerPayload {
  customer_name : string;
  mobile_number : string;
  email         : string;
  building_id   : string;
  wing_id?      : string;
  flat_id?      : string;
  flat_type     : string;
  area_sqft     : number | null;
  booking_date  : string;
  monthly_emi   : number | null;
  is_active     : boolean;
}

export interface UpdateCustomerPayload extends CreateCustomerPayload {}

export interface AssignCustomersPayload {
  customer_ids: string[];
  employee_id : string;
}

export interface AssignCustomersResponse {
  success : boolean;
  message?: string;
}

export interface CustomerPaymentRecord {
  id           : string;
  paid_on      : string;
  amount       : number;
  mode?        : string;
  reference_no?: string;
  notes?       : string;
  is_approved  : boolean;
  payment_type : string;
}

export interface CustomerPaymentHistoryResponse {
  success : boolean;
  message?: string;
  rows    : CustomerPaymentRecord[];
}

// ── Customer Scheme page (V_16.0) — customer info + EMI Scheme summary +
// EMI Schedule, computed server-side from this customer's own saved
// Payment Details (see backend customer.service.ts's getCustomerScheme /
// scheduleGenerator.ts). Replaces the old CustomerScheme/CustomerSchemeResponse
// "discount scheme" concept, which never had a real backend behind it. ────
export interface CustomerSchemeSummaryRow { label: string; amount: number; }
export interface CustomerScheduleRow { sr: number; date: string | null; label: string; amount: number; }

export interface CustomerSchemeCustomerInfo {
  id             : string;
  customer_code  : string;
  name           : string | null;
  middle_name    : string | null;
  last_name      : string | null;
  email          : string | null;
  mobile_number  : string | null;
  whatsapp_number: string | null;
  address        : string | null;
  customer_image : string | null;
  building_name  : string | null;
  wing_name      : string | null;
  flat_no        : string | null;
  flat_type      : string | null;
  area_sqft      : number | null;
  booking_date   : string | null;
  flat_amount    : number;
}

export interface CustomerSchemeData {
  customer   : CustomerSchemeCustomerInfo;
  summaryA   : CustomerSchemeSummaryRow[];
  summaryB   : CustomerSchemeSummaryRow[];
  totalA     : number;
  totalB     : number;
  grandTotal : number;
  scheduleA  : CustomerScheduleRow[];
  scheduleB  : CustomerScheduleRow[];
}

export interface CustomerSchemeDetailResponse {
  success : boolean;
  message?: string;
  data    : CustomerSchemeData | null;
}

// ── Customer Details — Full Create/Edit Form ────────────────────────────────
// Mirrors the "Create Customer" screen field-for-field (Personal Details,
// Property Booking Details, Payment Details, Document Upload) so every
// visible input has a matching request param. Submitted as
// multipart/form-data — customer photo, Aadhar/PAN photos and the three
// documents are real files — so this type describes the CRUD page's FORM
// STATE before it's packed into a FormData, not a literal JSON body.
export type ParkingChoice = 'yes' | 'no';

export interface CustomerDetailFormValues {
  // Personal Details
  first_name              : string;
  middle_name              : string;
  last_name                 : string;
  customer_photo             : File | null;
  email                       : string;
  mobile_country_code          : string;
  mobile_number                  : string;
  whatsapp_country_code            : string;
  whatsapp_number                    : string;
  // Secondary mobile numbers beyond the primary Mobile Number above — a
  // "+" control on the Add/Edit form appends to this list (item 6).
  secondary_numbers                    : { country_code: string; number: string }[];
  aadhar_number                        : string;
  aadhar_photo                          : File | null;
  pancard_number                          : string;
  pancard_photo                             : File | null;
  address                                     : string;
  date_of_birth                                 : string;
  alternate_person_name                           : string;
  alternate_person_mobile                           : string;

  // Property Booking Details
  company_name : string;
  project_name : string;
  location     : string;
  building_id  : string;
  building_name: string;
  wing_id      : string;
  wing_name    : string;
  floor_id     : string;
  floor_label  : string;
  flat_id      : string;
  flat_no      : string;
  flat_type    : string;
  area_sqft    : number | null;
  wants_parking: ParkingChoice;
  parking_no   : string;

  // Payment Details
  total_cost                                : number | null;
  booking_date                               : string;
  booking_amount                             : number | null;
  remaining_booking_amount                   : number | null;
  remaining_booking_date                     : string;
  possession_amount                          : number | null; // auto-calculated (total − booking − remaining), read-only
  installment_date                           : string;
  monthly_emi_before_possession              : number | null;
  monthly_emi_after_possession               : number | null;
  total_emi_tenure_months                    : number | null;
  booster_amount_before_possession           : number | null;
  booster_amount_after_possession            : number | null;
  booster_interval_before_possession_months  : number | null;
  booster_interval_after_possession_months   : number | null;

  // Document Upload
  application_form  : File | null;
  declaration_form  : File | null;
  allotment_letter  : File | null;

  is_active: boolean;
}

// GET /api/customers/:id response shape for this full form (Edit/View).
// Same fields as CustomerDetailFormValues, but every uploaded file comes
// back as an already-hosted URL (or null) instead of a File object, since
// nothing is re-uploaded just from viewing/loading the record.
export interface CustomerFullDetail extends Omit<
  CustomerDetailFormValues,
  'customer_photo' | 'aadhar_photo' | 'pancard_photo' | 'application_form' | 'declaration_form' | 'allotment_letter'
> {
  id            : string;
  customer_code?: string; // e.g. "C_001", shown as the badge next to "Customer Details"
  customer_photo_url  : string | null;
  aadhar_photo_url    : string | null;
  pancard_photo_url   : string | null;
  application_form_url: string | null;
  declaration_form_url: string | null;
  allotment_letter_url: string | null;
  created_at : string;
  updated_at?: string;
}

export interface CustomerFullDetailResponse {
  success : boolean;
  message?: string;
  data    : CustomerFullDetail;
}

// ── Payments ─────────────────────────────────────────────────────────────
// Talks to the real backend `payments` module (`/api/payments`, ported
// from legacy AmountTransactionsController — see paymentService.ts).
// `CustomerPaymentRecord`/`CustomerPaymentHistoryResponse` above already
// cover the existing "Payment History" viewer (GET /payments/customer/:id)
// and are untouched; everything below is additive for Collect Payment,
// the Due Report, a customer's due/remaining amounts, and receipts.
export type PaymentFor = 'EMIAmount' | 'BookingAmount' | 'PayAfterbooking' | 'PossessionAmount' | 'AnnualAmount' | 'AnnualAmount1';

// Form payload a page builds before calling collectPayment — mirrors
// CollectPaymentSchema on the backend field-for-field. All but the first
// three fields are optional there; kept optional here too rather than
// forcing the Collect Payment form to always send every one.
export interface CollectPaymentPayload {
  customer_id    : number;
  amount         : number;
  payment_for    : PaymentFor;
  date?          : string;   // ISO date — non-admin callers: server forces "now" regardless
  inst_date?     : string;   // ISO date — which installment this payment counts against
  payment_date?  : string;   // ISO date — same non-admin override as `date`
  cheque_number? : string;
  clearance_date?: string;   // ISO date
  company?       : string;
  mode_of_payment?: string;  // free text — no enum on the backend
  maintenance?   : number;
  is_advance_pay?: boolean;  // only meaningful when payment_for = 'EMIAmount'
}

export interface CollectPaymentResponse {
  success      : boolean;
  transactionId: number;
  receiptNumber: string;
  message      : string;
  tag?         : string;     // "Extra Pay" — only present when is_advance_pay was used
}

// One row of the due report — covers only the 4 "simple" payment types
// (EMIAmount/AnnualAmount1 are deliberately not part of this report, see
// paymentService.ts).
export interface DueReportRow {
  customer_id             : number;
  customer_name           : string;
  building_id             : number | null;
  wing_id                 : number | null;
  flat_id                 : number | null;
  booking_amount          : number;
  possession_amount       : number;
  pay_after_booking        : number;
  annual_amount            : number;
  is_booking_amount_due     : boolean;
  is_possession_amount_due  : boolean;
  is_pay_after_booking_due  : boolean;
  is_annual_amount_due      : boolean;
}

export interface DueReportResponse {
  success: boolean;
  rows   : DueReportRow[];
  total  : number;
}

export interface CustomerDueSummary {
  total_due       : number; // owed per the EMI schedule right now
  remaining_amount: number; // total_due minus what's actually been paid so far
}

export interface CustomerDueResponse {
  success: boolean;
  data   : CustomerDueSummary;
}

// How much is left to collect, per payment type, right now.
export interface CustomerRemainingAmounts {
  customer_id     : number;
  EMIAmount       : number;
  BookingAmount   : number;
  PossessionAmount: number;
  PayAfterbooking : number;
  AnnualAmount    : number;
  AnnualAmount1   : number;
}

export interface CustomerRemainingResponse {
  success: boolean;
  data   : CustomerRemainingAmounts;
}

// Receipt data for one transaction — clean shape mapped from the backend's
// raw AmountTransaction + Customer rows (see paymentService.ts's
// BackendAmountTransaction / BackendReceiptCustomer for the raw shape this
// is mapped from, and its file header for why `customer` only carries
// building_id/wing_id/flat_id, not building/wing/flat names).
export interface PaymentReceiptTransaction {
  id             : string;
  receipt_number : string;
  payment_type   : PaymentFor;
  amount         : number; // whichever type-specific column was non-null
  company        : string | null;
  mode_of_payment: string | null;
  date           : string | null;
  inst_date      : string | null;
  payment_date   : string | null;
  cheque_number  : string | null;
  clearance_date : string | null;
  maintenance    : number | null;
  received_by    : string | null;
  payment_tag    : string | null; // "Extra Pay" for advance-pay EMI transactions
  is_approved    : boolean;
  created_at     : string;
}

export interface PaymentReceiptCustomer {
  id           : string;
  customer_code: string;
  customer_name: string;
  mobile_number: string;
  email        : string;
  address      : string;
  building_id  : number | null;
  building_name: string | null;
  wing_id      : number | null;
  wing_name    : string | null;
  flat_id      : number | null;
  flat_no      : string | null;
}

export interface PaymentReceipt {
  transaction: PaymentReceiptTransaction;
  customer   : PaymentReceiptCustomer;
  paid_emis  : number;
  future_emis: number;
  total_emis : number;
  emi_number : number; // only meaningful when transaction.payment_type === 'EMIAmount'
}

export interface PaymentReceiptResponse {
  success: boolean;
  data   : PaymentReceipt;
}

// Smart "Record Payment" suggester (GET /payments/customer/:id/default-amount)
// — default amount AND next due date per payment type, phase-aware, plus
// whether maintenance is currently collectible (all pre-possession EMIs
// paid). Distinct from CustomerRemainingAmounts above, which only answers
// "how much is left" with no date or maintenance-eligibility awareness.
export interface DefaultAmountData {
  payment_for     : PaymentFor;
  amount          : number;
  date            : string | null;
  show_maintenance: boolean;
}

export interface DefaultAmountResponse {
  success: boolean;
  data   : DefaultAmountData;
}

// ─── Lead (V_18.0) ──────────────────────────────────────────────────────
// Pipeline lifecycle status — see database/2026-08-29-leads-pipeline-
// status.sql on the backend for why this replaces legacy's ~15 separate
// views with one status column. Hot/Cold lives on `category` below, not
// here; duplicates use is_duplicate, not a status value.
export type LeadStatus =
  | 'new' | 'follow_up' | 'call_back' | 'ringing' | 'switched_off' | 'wrong_number'
  | 'not_interested' | 'site_visit_scheduled' | 'visited' | 'not_booked' | 'booked' | 'cancelled';

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  follow_up: 'Follow-up',
  call_back: 'Call Back',
  ringing: 'Ringing',
  switched_off: 'Switched Off',
  wrong_number: 'Wrong Number',
  not_interested: 'Not Interested',
  site_visit_scheduled: 'Site Visit Scheduled',
  visited: 'Visited',
  not_booked: 'Not Booked',
  booked: 'Booked',
  cancelled: 'Cancelled',
};

export const LEAD_STATUSES = Object.keys(LEAD_STATUS_LABELS) as LeadStatus[];

export interface Lead {
  id: string;
  name: string;
  mobile_number: string;
  whatsapp_number: string;
  alternate_number: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  occupation: string;
  company_name: string;
  source: string;
  category: string; // temperature — hot/warm/cold
  sub_category: string;
  budget: number | null;
  deal_amount: number | null;
  looking_for: string;
  carpet_size: string;
  how_will_fund: string;
  current_residence: string;
  purpose_buying: string;
  how_did_you_know: string;
  preferred_call_time: string;
  next_call_scheduled_at: string;
  initial_comment: string;
  remark: string;
  status: LeadStatus;
  is_duplicate: boolean;
  duplicate_of_lead_id: string | null;
  project_id: string;
  project_name: string;
  cp_firm_name: string;
  cp_name: string;
  cp_validity: string;
  channel_partner_id: string;
  imported_from_csv: boolean;
  assigned_to: string; // comma-joined employee names, from the list endpoint's join
  assigned_employees: { id: string; name: string }[]; // from the single-lead endpoint's join
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeadListFilters {
  search?: string;
  category?: string;
  source?: string;
  status?: LeadStatus | '';
  project_id?: string;
  employee_id?: string;
  is_duplicate?: boolean;
  sort?: 'name' | 'mobile_number' | 'status' | 'category' | 'budget' | 'created_at';
  sort_dir?: 'asc' | 'desc';
}

export interface LeadListResponse {
  success: boolean;
  rows: Lead[];
  total: number;
  page: number;
  limit: number;
}

export interface LeadSingleResponse {
  success: boolean;
  data: Lead;
}

// POST /api/leads response — admin/superadmin gets the created Lead
// immediately (pending: false); anyone else's submission is queued for
// admin review instead (see modules/changeRequests/ in dgcrm_backend) and
// there's no Lead row yet, so no `data`.
export type LeadCreateResponse =
  | { success: boolean; pending: false; data: Lead }
  | { success: boolean; pending: true; message: string };

export interface LeadStatusCountsResponse {
  success: boolean;
  data: Partial<Record<LeadStatus, number>>;
  duplicateCount: number;
}

// A comment is a lead_activities row with action='comment'; a reply sets
// parent_id to the comment it replies to. System entries (action=
// 'status_change') never set parent_id — see leads.service.ts on the backend.
export interface LeadActivity {
  id: string;
  lead_id: string;
  employee_id: string | null;
  employee_name: string | null;
  action: string;
  remark: string;
  parent_id: string | null;
  action_date: string;
}

export interface LeadActivitiesResponse {
  success: boolean;
  data: LeadActivity[];
}

export interface CreateLeadPayload extends Partial<Omit<Lead, 'id' | 'assigned_to' | 'assigned_employees' | 'project_name' | 'is_duplicate' | 'duplicate_of_lead_id' | 'is_active' | 'created_at' | 'updated_at' | 'imported_from_csv'>> {
  name: string;
}

export type UpdateLeadPayload = Partial<CreateLeadPayload>;

export interface LeadImportResult {
  success: boolean;
  message: string;
  batch_id: string;
  total: number;
  success_count: number;
  failed_count: number;
  errors: { row: number; error: string }[];
}
