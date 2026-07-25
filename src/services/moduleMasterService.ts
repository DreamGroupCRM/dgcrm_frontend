// src/services/moduleMasterService.ts

import axiosInstance from './axiosConfig';
import {
  ModuleMasterListResponse,
  ModuleMasterResponse,
  CreateModuleMasterPayload,
  UpdateModuleMasterPayload,
} from '../types/index';

export const fetchModuleMasterList = async (): Promise<ModuleMasterListResponse> => {
  const res = await axiosInstance.get('/module', { params: { is_active: true } });
  return res.data;
};

export const fetchModuleMasterById = async (id: string): Promise<ModuleMasterResponse> => {
  const res = await axiosInstance.get(`/module/${id}`);
  return res.data;
};

export const createModuleMaster = async (payload: CreateModuleMasterPayload): Promise<ModuleMasterResponse> => {
  const res = await axiosInstance.post('/module', payload);
  return res.data;
};

export const updateModuleMaster = async (id: string, payload: UpdateModuleMasterPayload): Promise<ModuleMasterResponse> => {
  const res = await axiosInstance.put(`/module/${id}`, payload);
  return res.data;
};

export const deleteModuleMaster = async (id: string): Promise<{ success: boolean; message: string }> => {
  const res = await axiosInstance.delete(`/module/${id}`);
  return res.data;
};
