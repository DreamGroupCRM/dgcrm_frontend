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
// V_13.0 fix: this originally guessed a plural `/departments` REST
// resource. The real backend (src/app.ts) mounts this module at the
// singular `/api/department` — same convention as its siblings
// roleService.ts (`/role`), companyService.ts (`/company`), and
// moduleMasterService.ts (`/module`), which all correctly use singular
// paths. `/departments` 404'd; corrected to `/department` below.

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
/** GET /api/department?is_active=true&page=1&limit=10&search=... */
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
  const res = await axiosInstance.get('/department', { params });
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
/** GET /api/department/:id */
export const fetchDepartmentById = async (id: string): Promise<DepartmentSingleResponse> => {
  const res = await axiosInstance.get(`/department/${id}`);
  return {
    success: res.data.success,
    message: res.data.message,
    data: res.data.data as Department,
  };
};

// ── Create new department (with its designations, if any) ──────────────────
/** POST /api/department */
export const createDepartment = async (
  payload: CreateDepartmentPayload
): Promise<DepartmentSingleResponse> => {
  const res = await axiosInstance.post('/department', payload);
  return {
    success: res.data.success,
    message: res.data.message,
    data: res.data.data as Department,
  };
};

// ── Update existing department (with its designations, if any) ─────────────
/** PUT /api/department/:id */
export const updateDepartment = async (
  id: string,
  payload: UpdateDepartmentPayload
): Promise<DepartmentSingleResponse> => {
  const res = await axiosInstance.put(`/department/${id}`, payload);
  return {
    success: res.data.success,
    message: res.data.message,
    data: res.data.data as Department,
  };
};

// ── Delete department (and, on the backend, its designations with it) ──────
/** DELETE /api/department/:id */
export const deleteDepartment = async (id: string): Promise<DepartmentDeleteResponse> => {
  const res = await axiosInstance.delete(`/department/${id}`);
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
