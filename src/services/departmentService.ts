// src/services/Department.service.tsx
// ==========================================
// DREAM GROUP CRM - DEPARTMENT SERVICE (merged with Designation)
// ==========================================
// Designation no longer has its own service or endpoints. A department's
// designations are nested inside the department record itself — created,
// edited, toggled, and deleted entirely within DepartmentCrudPage's local
// state, then sent as one `designations[]` array in the SAME create/update
// call as the department. The backend is expected to upsert-by-id and drop
// any of the department's existing designations that are no longer present
// in the array (same "send the whole current state" pattern already used
// by Building's shops in buildingService.ts).
//
// ASSUMPTION: this targets a plural `/departments` REST resource, matching
// the convention already used by `/buildings` in buildingService.ts. The
// previous Department/Designation pages and services were deleted before
// this rewrite, so there was no existing endpoint contract to match — if
// your backend uses different paths (e.g. singular `/department`), only
// the URL strings below need to change; nothing else in this file depends
// on the exact path.

import axiosInstance from './axiosConfig';
import {
  Department,
  DepartmentListResponse,
  DepartmentSingleResponse,
  DepartmentDeleteResponse,
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
} from '../types/index';

// ── Fetch list of all departments ───────────────────────────────────────────
/** GET /api/departments?is_active=true&page=1&limit=10&search=... */
export const fetchDepartmentList = async (
  page: number,
  limit: number,
  search?: string
): Promise<DepartmentListResponse> => {
  const params: Record<string, string | number | boolean> = {
    is_active: true,
    page,
    limit,
  };
  if (search && search.trim()) {
    params.search = search.trim();
  }
  const res = await axiosInstance.get('/departments', { params });
  return {
    success: res.data.success,
    message: res.data.message,
    rows: res.data.rows as Department[],
    total: res.data.total,
    page: res.data.page,
    limit: res.data.limit,
  };
};

// ── Fetch single department by ID (with its designations) ──────────────────
/** GET /api/departments/:id */
export const fetchDepartmentById = async (id: string): Promise<DepartmentSingleResponse> => {
  const res = await axiosInstance.get(`/departments/${id}`);
  return {
    success: res.data.success,
    message: res.data.message,
    data: res.data.data as Department,
  };
};

// ── Create new department (with its designations, if any) ──────────────────
/** POST /api/departments */
export const createDepartment = async (
  payload: CreateDepartmentPayload
): Promise<DepartmentSingleResponse> => {
  const res = await axiosInstance.post('/departments', payload);
  return {
    success: res.data.success,
    message: res.data.message,
    data: res.data.data as Department,
  };
};

// ── Update existing department (with its designations, if any) ─────────────
/** PUT /api/departments/:id */
export const updateDepartment = async (
  id: string,
  payload: UpdateDepartmentPayload
): Promise<DepartmentSingleResponse> => {
  const res = await axiosInstance.put(`/departments/${id}`, payload);
  return {
    success: res.data.success,
    message: res.data.message,
    data: res.data.data as Department,
  };
};

// ── Delete department (and, on the backend, its designations with it) ──────
/** DELETE /api/departments/:id */
export const deleteDepartment = async (id: string): Promise<DepartmentDeleteResponse> => {
  const res = await axiosInstance.delete(`/departments/${id}`);
  return res.data;
};

// Grouped export — same convenience pattern as buildingService
export const departmentService = {
  getAll  : fetchDepartmentList,
  getById : fetchDepartmentById,
  create  : createDepartment,
  update  : updateDepartment,
  remove  : deleteDepartment,
};
