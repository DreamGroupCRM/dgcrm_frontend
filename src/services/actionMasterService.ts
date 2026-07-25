// src/services/actionMasterService.ts

import axiosInstance from './axiosConfig';
import {
  ActionMasterListResponse,
  ActionMasterResponse,
  CreateActionMasterPayload,
  UpdateActionMasterPayload,
} from '../types/index';

export const fetchActionMasterList = async (): Promise<ActionMasterListResponse> => {
  const res = await axiosInstance.get('/action-master', { params: { is_active: true } });
  return res.data;
};

export const fetchActionMasterById = async (id: string): Promise<ActionMasterResponse> => {
  const res = await axiosInstance.get(`/action-master/${id}`);
  return res.data;
};

export const createActionMaster = async (payload: CreateActionMasterPayload): Promise<ActionMasterResponse> => {
  const res = await axiosInstance.post('/action-master', payload);
  return res.data;
};

export const updateActionMaster = async (id: string, payload: UpdateActionMasterPayload): Promise<ActionMasterResponse> => {
  const res = await axiosInstance.put(`/action-master/${id}`, payload);
  return res.data;
};

export const deleteActionMaster = async (id: string): Promise<{ success: boolean; message: string }> => {
  const res = await axiosInstance.delete(`/action-master/${id}`);
  return res.data;
};
