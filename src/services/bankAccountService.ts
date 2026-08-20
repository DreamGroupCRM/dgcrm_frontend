// src/services/bankAccountService.ts

import axiosInstance from '../services/axiosConfig';
import {
  BankAccountListResponse,
  BankAccountResponse,
  CreateBankAccountPayload,
  UpdateBankAccountPayload,
} from '../types/index';

// Sent as a custom request header on every call below, and echoed back by
// the backend as a response header (see bank.controller.ts) — so the named
// API operation being called is visible directly in the browser's Network
// tab (Headers panel), on both the request and the response, not just
// inferable from the URL/method.
const API_NAME_HEADER = 'X-Api-Name';

// ── Fetch list of all bank accounts ────────────────────────────────────────
export const FetchBankAccount = async (
  page: number,
  limit: number
): Promise<BankAccountListResponse> => {
  const params: Record<string, string | number | boolean> = {
    is_active: true,
    page,
    limit,
  };
  const res = await axiosInstance.get('/banks', {
    params,
    headers: { [API_NAME_HEADER]: 'FetchBankAccount' },
  });
  console.log('[bankAccountService] FetchBankAccount response:', res.data);
  return res.data;
};

// ── Fetch single bank account by ID ────────────────────────────────────────
export const ViewBankAccount = async (id: string): Promise<BankAccountResponse> => {
  const res = await axiosInstance.get(`/banks/${id}`, {
    headers: { [API_NAME_HEADER]: 'ViewBankAccount' },
  });
  console.log('[bankAccountService] ViewBankAccount response:', res.data);
  return res.data;
};

// ── Create new bank account ─────────────────────────────────────────────────
export const CreateBankAccount = async (
  payload: CreateBankAccountPayload
): Promise<BankAccountResponse> => {
  const res = await axiosInstance.post('/banks', payload, {
    headers: { [API_NAME_HEADER]: 'CreateBankAccount' },
  });
  console.log('[bankAccountService] CreateBankAccount response:', res.data);
  return res.data;
};

// ── Update existing bank account ────────────────────────────────────────────
export const UpdateBankAccount = async (
  id: string,
  payload: UpdateBankAccountPayload
): Promise<BankAccountResponse> => {
  const res = await axiosInstance.put(`/banks/${id}`, payload, {
    headers: { [API_NAME_HEADER]: 'UpdateBankAccount' },
  });
  console.log('[bankAccountService] UpdateBankAccount response:', res.data);
  return res.data;
};

// ── Delete bank account ─────────────────────────────────────────────────────
export const DeleteBankAccount = async (id: string): Promise<{ success: boolean; message: string }> => {
  const res = await axiosInstance.delete(`/banks/${id}`, {
    headers: { [API_NAME_HEADER]: 'DeleteBankAccount' },
  });
  console.log('[bankAccountService] DeleteBankAccount response:', res.data);
  return res.data;
};
