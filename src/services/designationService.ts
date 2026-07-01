// src/services/designationService.ts

import axiosInstance from '../services/axiosConfig';
import {
  DesignationListResponse,
  DesignationResponse,
  CreateDesignationPayload,
  UpdateDesignationPayload,
} from '../types/index';

// ── Fetch list of all designations ──────────────────────────────────────────
export const fetchDesignationList = async (
  page: number,
  limit: number
): Promise<DesignationListResponse> => {
  const params: Record<string, string | number | boolean> = {
    is_active: true,
    page,
    limit,
  };
  const res = await axiosInstance.get('/designation', { params });
  console.log('[designationService] fetchDesignationList response:', res.data);
  return res.data;
};

// ── Fetch single designation by ID ───────────────────────────────────────────
export const fetchDesignationById = async (id: string): Promise<DesignationResponse> => {
  const res = await axiosInstance.get(`/designation/${id}`);
  console.log('[designationService] fetchDesignationById response:', res.data);
  return res.data;
};

// ── Create new designation ───────────────────────────────────────────────────
export const createDesignation = async (
  payload: CreateDesignationPayload
): Promise<DesignationResponse> => {
  const res = await axiosInstance.post('/designation', payload);
  console.log('[designationService] createDesignation response:', res.data);
  return res.data;
};

// ── Update existing designation ──────────────────────────────────────────────
export const updateDesignation = async (
  id: string,
  payload: UpdateDesignationPayload
): Promise<DesignationResponse> => {
  const res = await axiosInstance.put(`/designation/${id}`, payload);
  console.log('[designationService] updateDesignation response:', res.data);
  return res.data;
};

// ── Delete designation ───────────────────────────────────────────────────────
export const deleteDesignation = async (id: string): Promise<{ success: boolean; message: string }> => {
  const res = await axiosInstance.delete(`/designation/${id}`);
  console.log('[designationService] deleteDesignation response:', res.data);
  return res.data;
};
