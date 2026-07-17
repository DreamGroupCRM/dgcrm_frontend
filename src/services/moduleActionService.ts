// src/services/moduleActionService.ts
// Module <-> Action mapping: which Action Master rows apply to which Module.

import axiosInstance from './axiosConfig';
import { MappingMatrixResponse } from '../types/index';

// ── Fetch the full Module x Action grid in one call ─────────────────────────
export const fetchMappingMatrix = async (): Promise<MappingMatrixResponse> => {
  const res = await axiosInstance.get('/module-action/matrix');
  return res.data;
};

// ── Check a cell: attach one action to a module ──────────────────────────────
export const mapModuleAction = async (
  moduleId: number,
  actionMasterId: number
): Promise<{ success: boolean; data: { id: number } }> => {
  const res = await axiosInstance.post(`/module/${moduleId}/actions`, { action_master_id: actionMasterId });
  return res.data;
};

// ── Uncheck a cell: remove one module-action mapping by its own id ──────────
export const unmapModuleAction = async (moduleActionId: number): Promise<{ success: boolean; message: string }> => {
  const res = await axiosInstance.delete(`/module-action/${moduleActionId}`);
  return res.data;
};

// ── "Select all" shortcut for a module row: attach every active action ──────
export const mapAllActionsForModule = async (
  moduleId: number
): Promise<{ success: boolean; created: number }> => {
  const res = await axiosInstance.post(`/module/${moduleId}/actions/bulk`, {});
  return res.data;
};
