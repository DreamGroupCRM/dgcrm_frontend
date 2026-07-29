// src/services/buildingService.ts
// ==========================================
// DREAM GROUP CRM - BUILDING SERVICE
// ==========================================
// No backend yet — endpoints/payload shapes below follow REST best practices
// and mirror the existing master services (rows/total for list, data for single).

import axiosInstance from './axiosConfig';
import {
  BuildingListResponse,
  BuildingSingleResponse,
  BuildingDeleteResponse,
  CreateBuildingPayload,
  UpdateBuildingPayload,
} from '../types/index';

// ── Fetch list of all buildings ─────────────────────────────────────────────
/** GET /api/building?is_active=true&page=1&limit=10&search=... */
export const fetchBuildingList = async (
  page: number,
  limit: number,
  search?: string
): Promise<BuildingListResponse> => {
  const params: Record<string, string | number | boolean> = {
    is_active: true,
    page,
    limit,
  };
  if (search && search.trim()) {
    params.search = search.trim();
  }
  const res = await axiosInstance.get('/building', { params });
  console.log('[buildingService] fetchBuildingList response:', res.data);
  return res.data;
};

// ── Fetch single building by ID (with wings -> floors -> flats) ────────────
/** GET /api/building/:id */
export const fetchBuildingById = async (id: string): Promise<BuildingSingleResponse> => {
  const res = await axiosInstance.get(`/building/${id}`);
  console.log('[buildingService] fetchBuildingById response:', res.data);
  return res.data;
};

// ── Create new building ─────────────────────────────────────────────────────
/** POST /api/building */
export const createBuilding = async (
  payload: CreateBuildingPayload
): Promise<BuildingSingleResponse> => {
  const res = await axiosInstance.post('/building', payload);
  console.log('[buildingService] createBuilding response:', res.data);
  return res.data;
};

// ── Update existing building ────────────────────────────────────────────────
/** PUT /api/building/:id */
export const updateBuilding = async (
  id: string,
  payload: UpdateBuildingPayload
): Promise<BuildingSingleResponse> => {
  const res = await axiosInstance.put(`/building/${id}`, payload);
  console.log('[buildingService] updateBuilding response:', res.data);
  return res.data;
};

// ── Delete building ──────────────────────────────────────────────────────────
/** DELETE /api/building/:id */
export const deleteBuilding = async (id: string): Promise<BuildingDeleteResponse> => {
  const res = await axiosInstance.delete(`/building/${id}`);
  console.log('[buildingService] deleteBuilding response:', res.data);
  return res.data;
};

// Grouped export — same convenience pattern as companyService
export const buildingService = {
  getAll  : fetchBuildingList,
  getById : fetchBuildingById,
  create  : createBuilding,
  update  : updateBuilding,
  remove  : deleteBuilding,
};
