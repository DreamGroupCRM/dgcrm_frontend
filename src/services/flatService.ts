// src/services/flatService.ts

import axiosInstance from '../services/axiosConfig';
import {
  FlatListResponse,
  FlatResponse,
  CreateFlatPayload,
  UpdateFlatPayload,
} from '../types/index';

// ── Fetch list of all flats (optionally filtered by floor_id) ───────────────
export const fetchFlatList = async (
  page: number,
  limit: number,
  floorId?: string
): Promise<FlatListResponse> => {
  const params: Record<string, string | number | boolean> = {
    is_active: true,
    page,
    limit,
  };
  if (floorId) params.floor_id = floorId;
  const res = await axiosInstance.get('/flats', { params });
  console.log('[flatService] fetchFlatList response:', res.data);
  return res.data;
};

// ── Fetch single flat by ID ──────────────────────────────────────────────────
export const fetchFlatById = async (id: string): Promise<FlatResponse> => {
  const res = await axiosInstance.get(`/flats/${id}`);
  console.log('[flatService] fetchFlatById response:', res.data);
  return res.data;
};

// ── Create new flat ──────────────────────────────────────────────────────────
export const createFlat = async (
  payload: CreateFlatPayload
): Promise<FlatResponse> => {
  const res = await axiosInstance.post('/flats', payload);
  console.log('[flatService] createFlat response:', res.data);
  return res.data;
};

// ── Update existing flat ─────────────────────────────────────────────────────
export const updateFlat = async (
  id: string,
  payload: UpdateFlatPayload
): Promise<FlatResponse> => {
  const res = await axiosInstance.put(`/flats/${id}`, payload);
  console.log('[flatService] updateFlat response:', res.data);
  return res.data;
};

// ── Delete flat ───────────────────────────────────────────────────────────────
export const deleteFlat = async (id: string): Promise<{ success: boolean; message: string }> => {
  const res = await axiosInstance.delete(`/flats/${id}`);
  console.log('[flatService] deleteFlat response:', res.data);
  return res.data;
};
