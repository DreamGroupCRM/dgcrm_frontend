// src/services/wingService.ts

import axiosInstance from '../services/axiosConfig';
import {
  WingListResponse,
  WingResponse,
  CreateWingPayload,
  UpdateWingPayload,
} from '../types/index';

// ── Fetch list of all wings (optionally filtered by building_id) ────────────
export const fetchWingList = async (
  page: number,
  limit: number,
  buildingId?: string
): Promise<WingListResponse> => {
  const params: Record<string, string | number | boolean> = {
    is_active: true,
    page,
    limit,
  };
  if (buildingId) params.building_id = buildingId;
  const res = await axiosInstance.get('/wings', { params });
  console.log('[wingService] fetchWingList response:', res.data);
  return res.data;
};

// ── Fetch single wing by ID ─────────────────────────────────────────────────
export const fetchWingById = async (id: string): Promise<WingResponse> => {
  const res = await axiosInstance.get(`/wings/${id}`);
  console.log('[wingService] fetchWingById response:', res.data);
  return res.data;
};

// ── Create new wing ─────────────────────────────────────────────────────────
export const createWing = async (
  payload: CreateWingPayload
): Promise<WingResponse> => {
  const res = await axiosInstance.post('/wings', payload);
  console.log('[wingService] createWing response:', res.data);
  return res.data;
};

// ── Update existing wing ────────────────────────────────────────────────────
export const updateWing = async (
  id: string,
  payload: UpdateWingPayload
): Promise<WingResponse> => {
  const res = await axiosInstance.put(`/wings/${id}`, payload);
  console.log('[wingService] updateWing response:', res.data);
  return res.data;
};

// ── Delete wing ─────────────────────────────────────────────────────────────
export const deleteWing = async (id: string): Promise<{ success: boolean; message: string }> => {
  const res = await axiosInstance.delete(`/wings/${id}`);
  console.log('[wingService] deleteWing response:', res.data);
  return res.data;
};

// ── Add more floors to an existing wing (call only when floor_count increases) ──
// Backend only supports ADDING floors — pass how many MORE floors to create,
// not the new total. Numbering continues after the wing's current last floor.
export const generateFloors = async (wingId: string, count: number): Promise<{ success: boolean; message: string; data?: unknown }> => {
  const res = await axiosInstance.post(`/wings/${wingId}/floors`, { count });
  console.log('[wingService] generateFloors response:', res.data);
  return res.data;
};