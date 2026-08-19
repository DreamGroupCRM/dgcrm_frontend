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

  status                                             : EmployeeStatus;
  is_active                                           : boolean;
  created_at                                           : string;
  updated_at?                                           : string;
}

export interface EmployeeListResponse {
  success : boolean;
  message?: string;
  rows    : Employee[];
  total   : number;
  page    : number;
  limit   : number;
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

  is_active                                                                   : boolean;
}

export interface EmployeeFileValues {
  profile_photo?      : File | null;
  aadhar_card?        : File | null;
  pan_card?           : File | null;
  resume?             : File | null;
  appointment_letter? : File | null;
  // No backend field for a "passbook" document as of V_13.0 (no matching
  // multer field / column) — kept on the form for UI continuity, but
  // deliberately NOT translated/sent to the backend. See
  // EMPLOYEE_FILE_FIELD_RENAMES below.
  passbook_photo?     : File | null;
}

const buildEmployeeFormData = (values: EmployeeFormValues, files: EmployeeFileValues): FormData => {
  const fd = new FormData();
  (Object.keys(values) as (keyof EmployeeFormValues)[]).forEach((key) => {
    const value = values[key];
    if (Array.isArray(value)) {
      if (value.length === 0) fd.append(`${key}[]`, ''); // keep the key present even when empty
      value.forEach((v) => fd.append(`${key}[]`, String(v)));
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
// whatsapp_number, joining_date, bank_account_number, bank_name) or have
// no backend counterpart and are deliberately left unmapped. Extra keys
// are harmless: the backend's Zod schemas here are non-strict, so unknown
// fields are silently ignored server-side rather than rejected.
const EMPLOYEE_TEXT_FIELD_RENAMES: ReadonlyArray<readonly [string, string]> = [
  ['aadhar_number', 'aadhaar_card_number'], // backend spells it "aadhaar", not "aadhar"
  ['pan_number', 'pan_card_number'],
  ['ifsc_code', 'bank_ifsc'],
];

// File field renames -> real backend multer field names. `resume` already
// matches the backend's field name, so it needs no rename entry.
// `passbook_photo` has no backend equivalent (no such multer field/column)
// as of V_13.0 — deliberately left unmapped rather than guessed at.
const EMPLOYEE_FILE_FIELD_RENAMES: ReadonlyArray<readonly [string, string]> = [
  ['profile_photo', 'photo'],
  ['aadhar_card', 'aadhaar_card_img'],
  ['pan_card', 'pan_card_img'],
  ['appointment_letter', 'offer_letter'],
];

// Builds the FormData actually sent to the backend: every entry already in
// `formData` is carried over unchanged (nothing removed), plus the
// backend-named duplicates it needs to actually be understood by the
// Employee create/update multipart schema. Same additive pattern as
// `toBackendCustomerFormData` in customerDetailsService.ts.
const toBackendEmployeeFormData = (formData: FormData): FormData => {
  const out = new FormData();
  formData.forEach((value, key) => out.append(key, value as string | Blob));

  for (const [from, to] of EMPLOYEE_TEXT_FIELD_RENAMES) {
    const v = formData.get(from);
    if (v != null) out.append(to, v as string);
  }
  for (const [from, to] of EMPLOYEE_FILE_FIELD_RENAMES) {
    const v = formData.get(from);
    if (v != null) out.append(to, v as Blob);
  }

  return out;
};

// ── Fetch list of all employees ─────────────────────────────────────────────
/** GET /api/employees?page=1&limit=10&search=... */
export const fetchEmployeeList = async (
  page: number,
  limit: number,
  search?: string
): Promise<EmployeeListResponse> => {
  const params: Record<string, string | number> = { page, limit };
  if (search && search.trim()) params.search = search.trim();
  const res = await axiosInstance.get('/employees', { params });
  return {
    success: res.data.success,
    message: res.data.message,
    rows: res.data.rows as Employee[],
    total: res.data.total,
    page: res.data.page,
    limit: res.data.limit,
  };
};

// ── Fetch single employee by ID ─────────────────────────────────────────────
/** GET /api/employees/:id */
export const fetchEmployeeById = async (id: string): Promise<EmployeeSingleResponse> => {
  const res = await axiosInstance.get(`/employees/${id}`);
  return { success: res.data.success, message: res.data.message, data: res.data.data as Employee };
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
  return { success: res.data.success, message: res.data.message, data: res.data.data as Employee };
};

// ── Update existing employee ────────────────────────────────────────────────
/** PUT /api/employees/:id (multipart/form-data) */
export const updateEmployee = async (
  id: string,
  values: EmployeeFormValues,
  files: EmployeeFileValues
): Promise<EmployeeSingleResponse> => {
  const res = await axiosInstance.put(`/employees/${id}`, toBackendEmployeeFormData(buildEmployeeFormData(values, files)), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return { success: res.data.success, message: res.data.message, data: res.data.data as Employee };
};

// ── Delete employee ──────────────────────────────────────────────────────────
/** DELETE /api/employees/:id */
export const deleteEmployee = async (id: string): Promise<EmployeeDeleteResponse> => {
  const res = await axiosInstance.delete(`/employees/${id}`);
  return res.data;
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

// Grouped export — same convenience pattern as buildingService / departmentService
export const employeeDetailsService = {
  getAll      : fetchEmployeeList,
  getById     : fetchEmployeeById,
  nextCode    : fetchNextEmployeeCode,
  create      : createEmployee,
  update      : updateEmployee,
  remove      : deleteEmployee,
  permissions : fetchEmployeePermissions,
};
