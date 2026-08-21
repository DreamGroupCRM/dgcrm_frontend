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
// V_13.0 fix #1 (path): this originally guessed a plural `/departments`
// REST resource. The real backend (src/app.ts) mounts this module at the
// singular `/api/department` — same convention as its siblings
// roleService.ts (`/role`), companyService.ts (`/company`), and
// moduleMasterService.ts (`/module`), which all correctly use singular
// paths. `/departments` 404'd; corrected to `/department` below.
//
// V_13.0 fix #2 (designations not saving/showing): the backend splits
// department data into two tiers — plain `GET/POST/PUT /department[...]`
// (department fields only; department.service.ts's createDepartment/
// updateDepartment read only name/description/sort_order from the body and
// silently ignore anything else, including `designations`) and the "full"
// wizard `GET /department/:id/full`, `POST /department/full`,
// `PUT /department/:id/full`, which are the only endpoints that actually
// read/write designations together with the department. This file
// originally called the plain endpoints for get/create/update, so
// designations were silently dropped on save and never returned on load.
// fetchDepartmentById/createDepartment/updateDepartment now call the
// `/full` endpoints and flatten their `{ department, designations }`
// response shape into the single flat `Department` object (with
// `designations` nested inside it) this app's pages already expect.
//
// V_13.0 fix #3 (designation is_active not persisting): the `/full`
// endpoints' designation schema was `{ id?, name }` only, so this file's
// own `designations[].is_active` (already sent on every create/update —
// see DepartmentCrudPage.tsx's handleSubmit) was silently stripped before
// the backend ever saw it, and getFullDepartmentTree filtered its query to
// active-only rows, so a disabled designation vanished from the response
// entirely instead of round-tripping as disabled. Both fixed on the
// backend; mapFullDepartment below now reads the real value instead of
// hardcoding true.

import axiosInstance from './axiosConfig';
import {
  Department,
  Designation,
  DepartmentListResponse,
  DepartmentSingleResponse,
  DepartmentDeleteResponse,
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
} from '../types/index';

// Backend's /full response shape — see department.controller.ts's
// getFullDepartment/createFullDepartment/updateFullDepartment.
interface BackendFullDepartment {
  department: {
    id: number | string;
    name: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
  };
  designations: { id: number | string; name: string; is_active: boolean }[];
}

// getFullDepartmentTree now returns every designation (active and
// inactive) with its real is_active value — see file header.
const mapFullDepartment = (raw: BackendFullDepartment): Department => ({
  id: String(raw.department.id),
  name: raw.department.name,
  is_active: raw.department.is_active,
  designations: raw.designations.map((d): Designation => ({ id: String(d.id), name: d.name, is_active: d.is_active })),
  created_at: raw.department.created_at,
  updated_at: raw.department.updated_at,
});

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

// ── Fetch single department by ID, with its designations ───────────────────
/** GET /api/department/:id/full */
export const fetchDepartmentById = async (id: string): Promise<DepartmentSingleResponse> => {
  const res = await axiosInstance.get(`/department/${id}/full`);
  return {
    success: res.data.success,
    message: res.data.message,
    data: mapFullDepartment(res.data.data as BackendFullDepartment),
  };
};

// ── Create new department, with its designations ────────────────────────────
/** POST /api/department/full */
export const createDepartment = async (
  payload: CreateDepartmentPayload
): Promise<DepartmentSingleResponse> => {
  const res = await axiosInstance.post('/department/full', payload);
  return {
    success: res.data.success,
    message: res.data.message,
    data: mapFullDepartment(res.data.data as BackendFullDepartment),
  };
};

// ── Update existing department, with its designations ───────────────────────
/** PUT /api/department/:id/full */
export const updateDepartment = async (
  id: string,
  payload: UpdateDepartmentPayload
): Promise<DepartmentSingleResponse> => {
  const res = await axiosInstance.put(`/department/${id}/full`, payload);
  return {
    success: res.data.success,
    message: res.data.message,
    data: mapFullDepartment(res.data.data as BackendFullDepartment),
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
