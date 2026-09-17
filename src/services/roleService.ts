// src/services/roleService.ts

import axiosInstance from '../services/axiosConfig';
import {
  Role,
  RoleListResponse,
  RoleResponse,
  CreateRolePayload,
  UpdateRolePayload,
} from '../types/index';

// ── Fetch the plain role dropdown (any authenticated user — GET /api/role
//    above is the Role Master screen and is SuperAdmin-only; this is the
//    separate, admin-usable "assign an existing role to an employee" list;
//    see role.routes.ts's own comment on the distinction). Used by the
//    Employee CRUD page's Role field. ───────────────────────────────────
export const fetchAssignableRoles = async (): Promise<{ success: boolean; data: Role[] }> => {
  const res = await axiosInstance.get('/masters/roles');
  return res.data;
};

// ── Fetch list of all roles ─────────────────────────────────────────────────
// `is_active` is deliberately NOT sent: the backend treats it as a
// three-way filter (true / false / omitted = both), and pinning it to
// true here is what made deactivated roles disappear from Role Master
// entirely — with the list's own Status column able to read nothing but
// "Active", and no way to find a role again to reactivate it.
export const fetchRoleList = async (
  page: number,
  limit: number,
  search?: string
): Promise<RoleListResponse> => {
  const params: Record<string, string | number | boolean> = { page, limit };
  if (search && search.trim()) {
    params.search = search.trim();
  }
  const res = await axiosInstance.get('/role', { params });
  return res.data;
};

// ── Fetch single role by ID ─────────────────────────────────────────────────
export const fetchRoleById = async (id: string): Promise<RoleResponse> => {
  const res = await axiosInstance.get(`/role/${id}`);
  return res.data;
};

// ── Create new role ─────────────────────────────────────────────────────────
export const createRole = async (
  payload: CreateRolePayload
): Promise<RoleResponse> => {
  const res = await axiosInstance.post('/role', payload);
  return res.data;
};

// ── Update existing role ────────────────────────────────────────────────────
export const updateRole = async (
  id: string,
  payload: UpdateRolePayload
): Promise<RoleResponse> => {
  const res = await axiosInstance.put(`/role/${id}`, payload);
  return res.data;
};

// ── Delete role ─────────────────────────────────────────────────────────────
export const deleteRole = async (id: string): Promise<{ success: boolean; message: string }> => {
  const res = await axiosInstance.delete(`/role/${id}`);
  return res.data;
};
