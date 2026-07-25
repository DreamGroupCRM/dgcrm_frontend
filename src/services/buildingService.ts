// src/services/buildingService.ts

import axiosInstance from '../services/axiosConfig';
import {
  BuildingListResponse,
  BuildingResponse,
  CreateBuildingPayload,
  UpdateBuildingPayload,
} from '../types/index';

// ── Fetch list of all buildings ─────────────────────────────────────────────
export const fetchBuildingList = async (
  page: number,
  limit: number
): Promise<BuildingListResponse> => {
  const params: Record<string, string | number | boolean> = {
    is_active: true,
    page,
    limit,
  };
  const res = await axiosInstance.get('/buildings', { params });
  console.log('[buildingService] fetchBuildingList response:', res.data);
  return res.data;
};

// ── Fetch single building by ID ─────────────────────────────────────────────
export const fetchBuildingById = async (id: string): Promise<BuildingResponse> => {
  const res = await axiosInstance.get(`/buildings/${id}`);
  console.log('[buildingService] fetchBuildingById response:', res.data);
  return res.data;
};

// ── Create new building ─────────────────────────────────────────────────────
export const createBuilding = async (
  payload: CreateBuildingPayload
): Promise<BuildingResponse> => {
  const res = await axiosInstance.post('/buildings', payload);
  console.log('[buildingService] createBuilding response:', res.data);
  return res.data;
};

// ── Update existing building ────────────────────────────────────────────────
export const updateBuilding = async (
  id: string,
  payload: UpdateBuildingPayload
): Promise<BuildingResponse> => {
  const res = await axiosInstance.put(`/buildings/${id}`, payload);
  console.log('[buildingService] updateBuilding response:', res.data);
  return res.data;
};

// ── Delete building ─────────────────────────────────────────────────────────
export const deleteBuilding = async (id: string): Promise<{ success: boolean; message: string }> => {
  const res = await axiosInstance.delete(`/buildings/${id}`);
  console.log('[buildingService] deleteBuilding response:', res.data);
  return res.data;
};
