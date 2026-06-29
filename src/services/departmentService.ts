// src/services/departmentService.ts

import axiosInstance from '../services/axiosConfig';
import {
  DepartmentListResponse,
  DepartmentResponse,
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
} from '../types/index';

// ── Fetch list of all departments ───────────────────────────────────────────
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
  console.log('[departmentService] fetchDepartmentList response:', res.data);
  return res.data;
};

// ── Fetch single department by ID ───────────────────────────────────────────
export const fetchDepartmentById = async (id: string): Promise<DepartmentResponse> => {
  const res = await axiosInstance.get(`/department/${id}`);
  console.log('[departmentService] fetchDepartmentById response:', res.data);
  return res.data;
};

// ── Create new department ───────────────────────────────────────────────────
export const createDepartment = async (
  payload: CreateDepartmentPayload
): Promise<DepartmentResponse> => {
  const res = await axiosInstance.post('/department', payload);
  console.log('[departmentService] createDepartment response:', res.data);
  return res.data;
};

// ── Update existing department ──────────────────────────────────────────────
export const updateDepartment = async (
  id: string,
  payload: UpdateDepartmentPayload
): Promise<DepartmentResponse> => {
  const res = await axiosInstance.put(`/department/${id}`, payload);
  console.log('[departmentService] updateDepartment response:', res.data);
  return res.data;
};

// ── Delete department ───────────────────────────────────────────────────────
export const deleteDepartment = async (id: string): Promise<{ success: boolean; message: string }> => {
  const res = await axiosInstance.delete(`/department/${id}`);
  console.log('[departmentService] deleteDepartment response:', res.data);
  return res.data;
};
