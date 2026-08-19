// src/services/designationService.ts
// ==========================================
// DREAM GROUP CRM - DESIGNATION SERVICE (Employee-module lookup)
// ==========================================
// Standalone Designation Master — separate from Department's nested
// `designations[]` collection (see departmentService.ts / the `Designation`
// interface in `types/index.ts`, which lives nested inside a Department
// record). Backend V_13.0 has a real, separate `/api/designation` module —
// a standalone CRUD resource (not the same thing as Department's nested
// designations) that returns a flat list of ALL designations, each
// carrying its own `department_id`. This file is the Employee module's
// read-only lookup against that real endpoint, used to build the "Assign
// Designations" checklist on EmployeeDetailsCrudPage.
//
// Deliberately exports its own module-local `Designation` interface
// (id/name/department_id/is_active) rather than reusing or importing the
// `Designation` type from `types/index.ts` — that one is shaped for
// Department's nested use case and isn't re-exported through a shared
// barrel here, so there's no collision risk in keeping these separate.

import axiosInstance from './axiosConfig';

export interface Designation {
  id            : string;
  name          : string;
  department_id?: string;
  is_active     : boolean;
}

export interface DesignationListResponse {
  success : boolean;
  message?: string;
  rows    : Designation[];
  total   : number;
  page    : number;
  limit   : number;
}

// ── Fetch list of all designations ──────────────────────────────────────────
/** GET /api/designation?page=1&limit=10&search=... */
export const fetchDesignationList = async (
  page: number,
  limit: number,
  search?: string
): Promise<DesignationListResponse> => {
  const params: Record<string, string | number> = { page, limit };
  if (search && search.trim()) params.search = search.trim();
  const res = await axiosInstance.get('/designation', { params });
  return {
    success: res.data.success,
    message: res.data.message,
    rows: res.data.rows as Designation[],
    total: res.data.total,
    page: res.data.page,
    limit: res.data.limit,
  };
};

// Grouped export — same convenience pattern as departmentService
export const designationService = {
  getAll: fetchDesignationList,
};
