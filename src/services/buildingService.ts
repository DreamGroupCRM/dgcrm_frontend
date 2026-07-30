// src/services/buildingService.ts

import axiosInstance from './axiosConfig';
import {
  BuildingListResponse,
  BuildingDeleteResponse,
  CreateFullBuildingPayload,
  FullBuildingResponse,
} from '../types/index';

// ── Fetch list of all buildings (plain rows, project name + live counts) ────
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

// ── Fetch a building's full tree (wings -> floors -> flats) for view/edit ───
export const fetchBuildingFullById = async (id: string): Promise<FullBuildingResponse> => {
  const res = await axiosInstance.get(`/buildings/${id}/full`);
  console.log('[buildingService] fetchBuildingFullById response:', res.data);
  return res.data;
};

// ── Building Master wizard: create Building + Wings + Floors + Flats in one call ──
export const createFullBuilding = async (
  payload: CreateFullBuildingPayload
): Promise<FullBuildingResponse> => {
  const res = await axiosInstance.post('/buildings/full', payload);
  console.log('[buildingService] createFullBuilding response:', res.data);
  return res.data;
};

// ── Building Master wizard: full replace/reconcile edit ──────────────────────
export const updateFullBuilding = async (
  id: string,
  payload: CreateFullBuildingPayload
): Promise<FullBuildingResponse> => {
  const res = await axiosInstance.put(`/buildings/${id}/full`, payload);
  console.log('[buildingService] updateFullBuilding response:', res.data);
  return res.data;
};

// ── Delete building (cascades to wings/floors/flats) ─────────────────────────
export const deleteBuilding = async (id: string): Promise<BuildingDeleteResponse> => {
  const res = await axiosInstance.delete(`/buildings/${id}`);
  console.log('[buildingService] deleteBuilding response:', res.data);
  return res.data;
};
