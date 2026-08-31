// src/services/employeeDetailsService.ts
// ==========================================
// DREAM GROUP CRM - EMPLOYEE SERVICE
// ==========================================
// Self-contained: every function here talks to /employees (+ the sibling
// /employee-permissions endpoint) only. Nothing in this file imports or
// calls Department/Designation/Module-Action services — see
// EmployeeDetailsCrudPage.tsx for where those ARE now fetched (real data,
// not a hardcoded list) to build the Assign Departments / Assign
// Designations / Assign Actions & Modules checklists.
//
// ASSUMPTION: targets a plural `/employees` REST resource, matching the
// convention already used by `/buildings` and `/departments` elsewhere in
// this app. If your backend uses different paths, only the URL strings
// below need to change.
//
// ── V_13.0 alignment note ───────────────────────────────────────────────
// Backend V_13.0 fixed the Employee create/update multer bug (multipart
// bodies now actually parse) and added `/employees/next-code` plus real
// `department_ids[]` / `designation_ids[]` / `module_action_ids[]` support
// (an employee can now belong to multiple departments/designations, and
// module/action assignment is by real numeric module_action ids instead of
// a hardcoded string key). Same additive-translation-layer pattern as
// `toBackendCustomerFormData` in customerDetailsService.ts: outgoing
// FormData keeps every field the page already sends, plus backend-named
// duplicates for the fields that needed renaming. Nothing is removed, so
// this is safe even though unknown keys are silently ignored by the
// backend's non-strict Zod schemas.

import axiosInstance from './axiosConfig';

// Sent as a custom request header on every call below, and echoed back by
// the backend as a response header (see employees.controller.ts) — same
// convention as the Master module's X-Api-Name header (companyService.ts
// etc.) so the named API operation being called is visible in the
// browser's Network tab on both the request and the response.
const API_NAME_HEADER = 'X-Api-Name';

export type EmployeeStatus = 'active' | 'inactive' | 'on_leave';

export interface Employee {
  id                      : string;
  employee_code           : string;   // 'E_001'
  first_name              : string;
  middle_name?            : string;
  last_name                : string;
  date_of_birth            : string;
  email                     : string;
  mobile_country_code       : string;
  mobile_number              : string;
  alternate_country_code?    : string;
  alternate_number?           : string;
  whatsapp_country_code?       : string;
  whatsapp_number?              : string;
  address                       : string;
  aadhar_number?                : string;
  aadhar_card_url?               : string | null;
  pan_number?                     : string;
  pan_card_url?                    : string | null;
  profile_photo_url?               : string | null;

  joining_date                      : string;
  working_hours                      : string;  // '8' | '9' | '10'
  check_in_time?                      : string;
  check_out_time?                      : string;
  holidays?                            : string;
  salary                                : number;
  resume_url?                            : string | null;
  appointment_letter_url?                 : string | null;

  account_holder_name                      : string;
  bank_name                                 : string;
  bank_account_number                        : string;
  account_type                                : string;
  ifsc_code                                    : string;
  branch                                        : string;
  passbook_photo_url?                            : string | null;

  department_names                                : string[];
  department_ids                                  : number[];
  designation_names                                : string[];
  designation_ids                                  : number[];
  module_keys                                       : string[];
  // Single primary department/designation name, straight from the list
  // query's JOIN (department_id/designation_id) — always present on list
  // rows, unlike department_names/designation_names above (the full
  // multi-membership set), which the list query doesn't fetch at all to
  // avoid an N+1 query per row. The card falls back to these when the
  // multi-membership arrays are empty.
  department?                                      : string | null;
  designation?                                      : string | null;

  status                                             : EmployeeStatus;
  is_active                                           : boolean;
  created_at                                           : string;
  updated_at?                                           : string;

  // User Management — Role. Lives on the linked login user (not on the
  // Employee row itself), joined in by the backend's getEmployeeById.
  role_id?                                             : number | null;
  role_name?                                           : string | null;
}

// The backend's actual column names for several Employee fields differ from
// the names this form/type use (residential_address vs address,
// aadhaar_card_number vs aadhar_number, bank_ifsc vs ifsc_code, etc — see
// EMPLOYEE_TEXT_FIELD_RENAMES below, which handles the OUTGOING direction
// for Create/Update). Nothing translated the INCOMING GET response back,
// so `(raw as Employee).address` / `.aadhar_number` / `.pan_number` /
// `.ifsc_code` / `.profile_photo_url` / `.aadhar_card_url` / `.pan_card_url`
// / `.appointment_letter_url` were always undefined — View/Edit's form
// fields for these silently rendered blank even though the data existed in
// the database, and the List page's location column (derived from address)
// was blank for every employee. Every GET response (list rows and single)
// is normalized through this before being handed back to callers.
const normalizeEmployee = (raw: Record<string, unknown>): Employee => ({
  ...(raw as unknown as Employee),
  address: (raw.residential_address as string) ?? '',
  aadhar_number: (raw.aadhaar_card_number as string) ?? '',
  pan_number: (raw.pan_card_number as string) ?? '',
  ifsc_code: (raw.bank_ifsc as string) ?? '',
  profile_photo_url: (raw.photo_url as string | null) ?? null,
  aadhar_card_url: (raw.aadhaar_card_img as string | null) ?? null,
  pan_card_url: (raw.pan_card_img as string | null) ?? null,
  appointment_letter_url: (raw.offer_letter_url as string | null) ?? null,
  // <input type="date"> requires exactly "YYYY-MM-DD" — the backend
  // returns a full ISO timestamp ("1994-03-12T00:00:00.000Z"), which the
  // date input silently rejects and renders blank instead. Same issue (and
  // fix) for joining_date, which was resetting on every View/Edit for the
  // same reason.
  date_of_birth: raw.date_of_birth ? String(raw.date_of_birth).slice(0, 10) : '',
  joining_date: raw.joining_date ? String(raw.joining_date).slice(0, 10) : '',
});

export interface EmployeeListSummary {
  total_employees   : number;
  active_employees  : number;
  inactive_employees: number;
}

export interface EmployeeListResponse {
  success : boolean;
  message?: string;
  rows    : Employee[];
  total   : number;
  page    : number;
  limit   : number;
  summary?: EmployeeListSummary;
}

export interface EmployeeListExtraFilters {
  department? : string;
  designation?: string;
  status?     : string;
  location?   : string;
  sort?       : 'newest' | 'oldest' | 'name';
}

export interface EmployeeSingleResponse {
  success : boolean;
  message?: string;
  data    : Employee;
}

export interface EmployeeDeleteResponse {
  success : boolean;
  message?: string;
}

// Plain (non-file) fields collected by the CRUD form.
export interface EmployeeFormValues {
  first_name              : string;
  middle_name               : string;
  last_name                  : string;
  date_of_birth                : string;
  email                          : string;
  mobile_country_code             : string;
  mobile_number                    : string;
  alternate_country_code             : string;
  alternate_number                     : string;
  whatsapp_country_code                  : string;
  whatsapp_number                          : string;
  address                                    : string;
  aadhar_number                                : string;
  pan_number                                     : string;

  joining_date                                     : string;
  working_hours                                      : string;
  check_in_time                                        : string;
  check_out_time                                         : string;
  holidays                                                 : string;
  salary                                                     : string;

  account_holder_name                                          : string;
  bank_name                                                      : string;
  bank_account_number                                              : string;
  account_type                                                       : string;
  ifsc_code                                                            : string;
  branch                                                                 : string;

  // Legacy name-based selections — kept on the type so nothing else that
  // touches EmployeeFormValues breaks, but no longer sourced from real
  // data and no longer sent as the request's department/designation/module
  // selection (see department_ids / designation_ids / module_action_ids
  // below, which ARE real, fetched ids and are what's actually submitted).
  department_names                                                        : string[];
  designation_names                                                         : string[];
  module_keys                                                                : string[];

  // Real, fetched selections (department/designation ids from Department &
  // Designation Master; module_action_ids from the Module/Action Master's
  // module_action mapping table) — these are what's actually persisted.
  department_ids                                                             : number[];
  designation_ids                                                             : number[];
  module_action_ids                                                           : number[];

  // Real backend column as of V_13.0 (active/inactive/on_leave) — separate
  // from is_active, which stays the plain enabled/disabled flag used for
  // list filtering and soft-delete. See employees.repository.ts's
  // softDeleteEmployee, which sets both together on delete.
  status                                                                      : EmployeeStatus;
  is_active                                                                   : boolean;
}

export interface EmployeeFileValues {
  profile_photo?      : File | null;
  aadhar_card?        : File | null;
  pan_card?           : File | null;
  resume?             : File | null;
  appointment_letter? : File | null;
  // V_15.0 — real backend column (passbook_photo_url) and multer field
  // (passbook_photo) now exist; see EMPLOYEE_FILE_FIELD_MAP below.
  passbook_photo?     : File | null;
}

const buildEmployeeFormData = (values: EmployeeFormValues, files: EmployeeFileValues): FormData => {
  const fd = new FormData();
  (Object.keys(values) as (keyof EmployeeFormValues)[]).forEach((key) => {
    const value = values[key];
    if (Array.isArray(value)) {
      // Plain, unbracketed key repeated once per item — multer/busboy
      // accumulate repeated identical multipart field names into an array
      // on req.body natively; a `key[]` suffix would instead land as a
      // distinct, unrecognized key ("department_ids[]") that the backend's
      // Zod schema (which only knows the plain "department_ids" field)
      // silently drops. Empty arrays are skipped entirely rather than sent
      // as a single empty-string placeholder, which would fail the
      // schema's z.coerce.number() element validation.
      value.forEach((v) => fd.append(key, String(v)));
    } else {
      fd.append(key, String(value));
    }
  });
  (Object.keys(files) as (keyof EmployeeFileValues)[]).forEach((key) => {
    const file = files[key];
    if (file) fd.append(key, file);
  });
  return fd;
};

// Plain-text field renames from this form's field names to the backend's
// real column names — see the Employee entity / Create/Update Employee
// schema in dgcrm_backend. Fields not listed here already share the same
// name on both sides (first_name, last_name, email, mobile_number,
// whatsapp_number, joining_date, bank_account_number, bank_name, and, as
// of the V_13.0 backend schema extension, also middle_name, date_of_birth,
// working_hours, check_in_time, check_out_time, holidays, salary,
// account_holder_name, account_type, branch, and status — all now real
// Employee columns, so nothing further needs mapping for them here).
// Extra keys are harmless: the backend's Zod schemas here are non-strict,
// so unknown fields are silently ignored server-side rather than rejected.
const EMPLOYEE_TEXT_FIELD_RENAMES: ReadonlyArray<readonly [string, string]> = [
  ['aadhar_number', 'aadhaar_card_number'], // backend spells it "aadhaar", not "aadhar"
  ['pan_number', 'pan_card_number'],
  ['ifsc_code', 'bank_ifsc'],
  ['address', 'residential_address'], // backend column is "residential_address", not "address"
];

// File field source -> real backend multer field name. Unlike text fields,
// this list is EXHAUSTIVE and must be used as an allowlist (see
// toBackendEmployeeFormData below) rather than an additive rename: multer's
// upload.fields(DOCUMENT_FIELDS) only accepts photo/aadhaar_card_img/
// pan_card_img/offer_letter/resume/salary_slip/passbook_photo as file field
// names and rejects the WHOLE request (LIMIT_UNEXPECTED_FILE) if a file
// arrives under any other fieldname — so a file field with no entry here
// must never be forwarded at all, and one that already matches the backend
// name (`resume`, `passbook_photo`) still needs an identity entry so it
// doesn't get dropped.
const EMPLOYEE_FILE_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ['profile_photo', 'photo'],
  ['aadhar_card', 'aadhaar_card_img'],
  ['pan_card', 'pan_card_img'],
  ['resume', 'resume'],
  ['appointment_letter', 'offer_letter'],
  ['passbook_photo', 'passbook_photo'],
];

// Builds the FormData actually sent to the backend: every TEXT entry
// already in `formData` is carried over unchanged (nothing removed), plus
// the backend-named duplicates it needs to actually be understood by the
// Employee create/update multipart schema — same additive pattern as
// `toBackendCustomerFormData` in customerDetailsService.ts. FILE entries are
// the exception: they are forwarded ONLY through EMPLOYEE_FILE_FIELD_MAP
// (an allowlist), never copied through unchanged, because multer's
// upload.fields() rejects the entire request outright if it sees a file
// under a fieldname it wasn't configured with.
const toBackendEmployeeFormData = (formData: FormData): FormData => {
  const out = new FormData();
  formData.forEach((value, key) => {
    if (value instanceof Blob) return; // files: forwarded explicitly below, mapped-only
    out.append(key, value as string);
  });

  for (const [from, to] of EMPLOYEE_TEXT_FIELD_RENAMES) {
    const v = formData.get(from);
    if (v != null) out.append(to, v as string);
  }
  for (const [from, to] of EMPLOYEE_FILE_FIELD_MAP) {
    const v = formData.get(from);
    if (v instanceof Blob) out.append(to, v);
  }

  return out;
};

// ── Fetch list of all employees ─────────────────────────────────────────────
/** GET /api/employees?page=1&limit=10&search=...&department=...&designation=...&status=...&location=...&sort=... */
export const FetchEmployeeDetails = async (
  page: number,
  limit: number,
  search?: string,
  // Assignment pickers (Assign Visible Employees, Customer "assign to
  // employee") pass true to keep excluding deactivated staff — the List
  // page itself omits this so deactivated-but-not-deleted employees still
  // show (rendered grayed out) instead of silently vanishing.
  activeOnly?: boolean,
  // The List page's Department/Designation/Status/Location filters and
  // sort — optional and additive so every existing positional call (the
  // 4-arg assignment-picker/dropdown callers above) keeps working unchanged.
  extraFilters?: EmployeeListExtraFilters
): Promise<EmployeeListResponse> => {
  const params: Record<string, string | number | boolean> = { page, limit };
  if (search && search.trim()) params.search = search.trim();
  if (activeOnly) params.active_only = true;
  if (extraFilters?.department) params.department = extraFilters.department;
  if (extraFilters?.designation) params.designation = extraFilters.designation;
  if (extraFilters?.status) params.status = extraFilters.status;
  if (extraFilters?.location) params.location = extraFilters.location;
  if (extraFilters?.sort) params.sort = extraFilters.sort;
  const res = await axiosInstance.get('/employees', {
    params,
    headers: { [API_NAME_HEADER]: 'FetchEmployeeDetails' },
  });
  return {
    success: res.data.success,
    message: res.data.message,
    rows: (res.data.rows as Record<string, unknown>[]).map(normalizeEmployee),
    total: res.data.total,
    page: res.data.page,
    limit: res.data.limit,
    summary: res.data.summary,
  };
};

// ── Fetch single employee by ID ─────────────────────────────────────────────
/** GET /api/employees/:id */
export const ViewEmployee = async (id: string): Promise<EmployeeSingleResponse> => {
  const res = await axiosInstance.get(`/employees/${id}`, {
    headers: { [API_NAME_HEADER]: 'ViewEmployee' },
  });
  return { success: res.data.success, message: res.data.message, data: normalizeEmployee(res.data.data) };
};

// ── Preview the next auto-generated employee code (optional) ───────────────
/** GET /api/employees/next-code — returns { success: true, code: 'E014' } */
export const fetchNextEmployeeCode = async (): Promise<string | null> => {
  try {
    const res = await axiosInstance.get('/employees/next-code');
    return res.data?.code ?? null;
  } catch {
    return null; // backend may not have this endpoint yet — caller falls back gracefully
  }
};

// ── Create new employee ──────────────────────────────────────────────────────
/** POST /api/employees (multipart/form-data) — this is what "Save Employee" calls */
export const createEmployee = async (
  values: EmployeeFormValues,
  files: EmployeeFileValues
): Promise<EmployeeSingleResponse> => {
  const res = await axiosInstance.post('/employees', toBackendEmployeeFormData(buildEmployeeFormData(values, files)), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return { success: res.data.success, message: res.data.message, data: normalizeEmployee(res.data.data) };
};

// ── Update existing employee ────────────────────────────────────────────────
/** PUT /api/employees/:id (multipart/form-data) */
export const EditEmployee = async (
  id: string,
  values: EmployeeFormValues,
  files: EmployeeFileValues
): Promise<EmployeeSingleResponse> => {
  const res = await axiosInstance.put(`/employees/${id}`, toBackendEmployeeFormData(buildEmployeeFormData(values, files)), {
    headers: { 'Content-Type': 'multipart/form-data', [API_NAME_HEADER]: 'EditEmployee' },
  });
  return { success: res.data.success, message: res.data.message, data: normalizeEmployee(res.data.data) };
};

// ── Delete employee ──────────────────────────────────────────────────────────
/** DELETE /api/employees/:id */
export const DeleteEmployee = async (id: string): Promise<EmployeeDeleteResponse> => {
  const res = await axiosInstance.delete(`/employees/${id}`, {
    headers: { [API_NAME_HEADER]: 'DeleteEmployee' },
  });
  return res.data;
};

// ── Activate / Deactivate — User Management ─────────────────────────────────
// Cascades to the linked login user's is_active on the backend (see
// employees.repository.ts's setEmployeeActiveStatus), so deactivating here
// actually blocks that employee's login, not just hides them from lists.
/** PATCH /api/employees/:id/active-status */
export const SetEmployeeActiveStatus = async (id: string, is_active: boolean): Promise<EmployeeSingleResponse> => {
  const res = await axiosInstance.patch(`/employees/${id}/active-status`, { is_active }, {
    headers: { [API_NAME_HEADER]: 'SetEmployeeActiveStatus' },
  });
  return { success: res.data.success, message: res.data.message, data: normalizeEmployee(res.data.data) };
};

// User Management — Role reassignment. Separate endpoint from
// createEmployee/EditEmployee (role_id lives on the linked login user, not
// the Employee row — see the backend's setEmployeeRole comment), called
// after the main employee save, same pattern as AssignVisibleEmployees below.
/** PATCH /api/employees/:id/role */
export const SetEmployeeRole = async (id: string, role_id: number | null): Promise<EmployeeSingleResponse> => {
  const res = await axiosInstance.patch(`/employees/${id}/role`, { role_id }, {
    headers: { [API_NAME_HEADER]: 'SetEmployeeRole' },
  });
  return { success: res.data.success, message: res.data.message, data: normalizeEmployee(res.data.data) };
};

// ── Per-employee module/action permission checklist (Edit/View mode) ───────
// Requires an already-created employee, so this is only usable once an id
// exists. Gives the full assignable checklist AND which ones are currently
// checked in one call — unlike Add mode, which has to build the checklist
// from `fetchMappingMatrix()` (moduleActionService.ts) instead, since there
// is no employeeId yet.
export interface EmployeePermissionAction {
  module_action_id: number;
  action           : string;
  label            : string | null;
  assigned         : boolean;
}

export interface EmployeePermissionModule {
  module_id  : number;
  module_name: string;
  module_slug: string;
  actions    : EmployeePermissionAction[];
}

export interface EmployeePermissionsResponse {
  success: boolean;
  data   : EmployeePermissionModule[];
}

/** GET /api/employee-permissions/:employeeId */
export const fetchEmployeePermissions = async (employeeId: string): Promise<EmployeePermissionsResponse> => {
  const res = await axiosInstance.get(`/employee-permissions/${employeeId}`);
  return res.data;
};

// ── Assign Visible Employees ────────────────────────────────────────────────
// "Which employees can this employee view/manage" — reuses the backend's
// existing reporting-line mechanism (assigning X as visible to M sets
// X.reporting_manager_id = M), exposed under the Employee module's naming/
// header convention. See employees.controller.ts for the full explanation.
export interface VisibleEmployee {
  id: number;
  first_name: string;
  last_name: string | null;
  employee_code: string | null;
}

export interface FetchVisibleEmployeesResponse {
  success: boolean;
  data: VisibleEmployee[];
}

/** GET /api/employees/:managerId/reports — employees currently visible to (reporting to) managerId */
export const FetchVisibleEmployees = async (managerId: string): Promise<FetchVisibleEmployeesResponse> => {
  const res = await axiosInstance.get(`/employees/${managerId}/reports`, {
    headers: { [API_NAME_HEADER]: 'FetchVisibleEmployees' },
  });
  return res.data;
};

/** PUT /api/employees/:managerId/reports — replaces the full visible-employees set for managerId */
export const AssignVisibleEmployees = async (managerId: string, employeeIds: number[]): Promise<{ success: boolean; message?: string }> => {
  const res = await axiosInstance.put(`/employees/${managerId}/reports`, { employeeIds }, {
    headers: { [API_NAME_HEADER]: 'AssignVisibleEmployees' },
  });
  return res.data;
};

// Grouped export — same convenience pattern as buildingService / departmentService
export const employeeDetailsService = {
  getAll      : FetchEmployeeDetails,
  getById     : ViewEmployee,
  nextCode    : fetchNextEmployeeCode,
  create      : createEmployee,
  update      : EditEmployee,
  remove      : DeleteEmployee,
  permissions : fetchEmployeePermissions,
};
