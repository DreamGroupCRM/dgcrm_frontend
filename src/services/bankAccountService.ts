// src/services/bankAccountService.ts

import axiosInstance from '../services/axiosConfig';
import {
  BankAccountListResponse,
  BankAccountResponse,
  CreateBankAccountPayload,
  UpdateBankAccountPayload,
} from '../types/index';

// ── Fetch list of all bank accounts ────────────────────────────────────────
export const fetchBankAccountList = async (
  page: number,
  limit: number
): Promise<BankAccountListResponse> => {
  const params: Record<string, string | number | boolean> = {
    is_active: true,
    page,
    limit,
  };
  const res = await axiosInstance.get('/banks', { params });
  console.log('[bankAccountService] fetchBankAccountList response:', res.data);
  return res.data;
};

// ── Fetch single bank account by ID ────────────────────────────────────────
export const fetchBankAccountById = async (id: string): Promise<BankAccountResponse> => {
  const res = await axiosInstance.get(`/banks/${id}`);
  console.log('[bankAccountService] fetchBankAccountById response:', res.data);
  return res.data;
};

// ── Create new bank account ─────────────────────────────────────────────────
export const createBankAccount = async (
  payload: CreateBankAccountPayload
): Promise<BankAccountResponse> => {
  const res = await axiosInstance.post('/banks', payload);
  console.log('[bankAccountService] createBankAccount response:', res.data);
  return res.data;
};

// ── Update existing bank account ────────────────────────────────────────────
export const updateBankAccount = async (
  id: string,
  payload: UpdateBankAccountPayload
): Promise<BankAccountResponse> => {
  const res = await axiosInstance.put(`/banks/${id}`, payload);
  console.log('[bankAccountService] updateBankAccount response:', res.data);
  return res.data;
};

// ── Delete bank account ─────────────────────────────────────────────────────
export const deleteBankAccount = async (id: string): Promise<{ success: boolean; message: string }> => {
  const res = await axiosInstance.delete(`/banks/${id}`);
  console.log('[bankAccountService] deleteBankAccount response:', res.data);
  return res.data;
};
