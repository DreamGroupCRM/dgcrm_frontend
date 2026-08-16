// src/services/employeeDetailsService.ts
// ==========================================
// DREAM GROUP CRM - EMPLOYEE SERVICE
// ==========================================
// Self-contained: every function here talks to /employees only. Nothing in
// this file imports or calls Department/Designation (or any other master's)
// service or endpoints — Assign Departments / Assign Designations on the
// CRUD page are a fixed static list (see EmployeeDetailsCrudPage.tsx), not fetched
// from Department Master.
//
// ASSUMPTION: targets a plural `/employees` REST resource, matching the
// convention already used by `/buildings` and `/departments` elsewhere in
// this app. If your backend uses different paths, only the URL strings
// below need to change.

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
  designation_names                                : string[];
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

  department_names                                                        : string[];
  designation_names                                                         : string[];
  module_keys                                                                : string[];

  is_active                                                                   : boolean;
}

export interface EmployeeFileValues {
  profile_photo?      : File | null;
  aadhar_card?        : File | null;
  pan_card?           : File | null;
  resume?             : File | null;
  appointment_letter? : File | null;
  passbook_photo?     : File | null;
}

const buildEmployeeFormData = (values: EmployeeFormValues, files: EmployeeFileValues): FormData => {
  const fd = new FormData();
  (Object.keys(values) as (keyof EmployeeFormValues)[]).forEach((key) => {
    const value = values[key];
    if (Array.isArray(value)) {
      if (value.length === 0) fd.append(`${key}[]`, ''); // keep the key present even when empty
      value.forEach((v) => fd.append(`${key}[]`, v));
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
/** GET /api/employees/next-code — returns e.g. { code: 'E_014' } */
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
  const res = await axiosInstance.post('/employees', buildEmployeeFormData(values, files), {
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
  const res = await axiosInstance.put(`/employees/${id}`, buildEmployeeFormData(values, files), {
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

// Grouped export — same convenience pattern as buildingService / departmentService
export const employeeDetailsService = {
  getAll   : fetchEmployeeList,
  getById  : fetchEmployeeById,
  nextCode : fetchNextEmployeeCode,
  create   : createEmployee,
  update   : updateEmployee,
  remove   : deleteEmployee,
};
