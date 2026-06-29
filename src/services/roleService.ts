// src/services/roleService.ts

import axiosInstance from '../services/axiosConfig';
import {
  RoleListResponse,
  RoleResponse,
  CreateRolePayload,
  UpdateRolePayload,
} from '../types/index';

// ── Fetch list of all roles ─────────────────────────────────────────────────
export const fetchRoleList = async (
  page: number,
  limit: number,
  search?: string
): Promise<RoleListResponse> => {
  const params: Record<string, string | number | boolean> = {
    is_active: true,
    page,
    limit,
  };
  if (search && search.trim()) {
    params.search = search.trim();
  }
  const res = await axiosInstance.get('/role', { params });
  console.log('[roleService] fetchRoleList response:', res.data);
  return res.data;
};

// ── Fetch single role by ID ─────────────────────────────────────────────────
export const fetchRoleById = async (id: string): Promise<RoleResponse> => {
  const res = await axiosInstance.get(`/role/${id}`);
  console.log('[roleService] fetchRoleById response:', res.data);
  return res.data;
};

// ── Create new role ─────────────────────────────────────────────────────────
export const createRole = async (
  payload: CreateRolePayload
): Promise<RoleResponse> => {
  const res = await axiosInstance.post('/role', payload);
  console.log('[roleService] createRole response:', res.data);
  return res.data;
};

// ── Update existing role ────────────────────────────────────────────────────
export const updateRole = async (
  id: string,
  payload: UpdateRolePayload
): Promise<RoleResponse> => {
  const res = await axiosInstance.put(`/role/${id}`, payload);
  console.log('[roleService] updateRole response:', res.data);
  return res.data;
};

// ── Delete role ─────────────────────────────────────────────────────────────
export const deleteRole = async (id: string): Promise<{ success: boolean; message: string }> => {
  const res = await axiosInstance.delete(`/role/${id}`);
  console.log('[roleService] deleteRole response:', res.data);
  return res.data;
};
