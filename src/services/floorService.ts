// src/services/floorService.ts

import axiosInstance from '../services/axiosConfig';
import {
  FloorListResponse,
  FloorResponse,
  CreateFloorPayload,
  UpdateFloorPayload,
} from '../types/index';

// ── Fetch list of all floors (optionally filtered by wing_id) ───────────────
export const fetchFloorList = async (
  page: number,
  limit: number,
  wingId?: string
): Promise<FloorListResponse> => {
  const params: Record<string, string | number | boolean> = {
    is_active: true,
    page,
    limit,
  };
  if (wingId) params.wing_id = wingId;
  const res = await axiosInstance.get('/floors', { params });
  console.log('[floorService] fetchFloorList response:', res.data);
  return res.data;
};

// ── Fetch single floor by ID ─────────────────────────────────────────────────
export const fetchFloorById = async (id: string): Promise<FloorResponse> => {
  const res = await axiosInstance.get(`/floors/${id}`);
  console.log('[floorService] fetchFloorById response:', res.data);
  return res.data;
};

// ── Create new floor (flat_count optionally auto-generates flats) ───────────
export const createFloor = async (
  payload: CreateFloorPayload
): Promise<FloorResponse> => {
  const res = await axiosInstance.post('/floors', payload);
  console.log('[floorService] createFloor response:', res.data);
  return res.data;
};

// ── Update existing floor ────────────────────────────────────────────────────
export const updateFloor = async (
  id: string,
  payload: UpdateFloorPayload
): Promise<FloorResponse> => {
  const res = await axiosInstance.put(`/floors/${id}`, payload);
  console.log('[floorService] updateFloor response:', res.data);
  return res.data;
};

// ── Delete floor ──────────────────────────────────────────────────────────────
export const deleteFloor = async (id: string): Promise<{ success: boolean; message: string }> => {
  const res = await axiosInstance.delete(`/floors/${id}`);
  console.log('[floorService] deleteFloor response:', res.data);
  return res.data;
};

// ── Add more flats to an existing floor (call only when flat_count increases) ──
// Backend only ADDS flats — pass how many MORE flats to create, not the new total.
export const generateFlats = async (floorId: string, count: number): Promise<{ success: boolean; message: string; data?: unknown }> => {
  const res = await axiosInstance.post(`/floors/${floorId}/flats`, { count });
  console.log('[floorService] generateFlats response:', res.data);
  return res.data;
};
