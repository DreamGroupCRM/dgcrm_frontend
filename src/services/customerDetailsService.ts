// src/services/customerDetailsService.ts
// ==========================================
// DREAM GROUP CRM - CUSTOMER DETAILS SERVICE
// ==========================================
// Self-contained, following the same pattern as buildingService.ts /
// employeeService.ts / Department.service.tsx: plain axios calls against a
// `/customers` REST resource (matching the `/buildings`, `/departments`,
// `/employees` convention already used elsewhere in this app).
//
// Building / Wing / Flat and Employee dropdown data are NOT duplicated
// here — CustomerDetailsListPage / CustomerDetailsCrudPage import
// `fetchBuildingList` from `buildingService.ts` and `fetchEmployeeList`
// from `employeeService.ts` directly, reusing those modules as the single
// source of truth instead of inventing parallel customer-side lookups.
//
// ASSUMPTION: endpoint paths below (`/customers`, `/customers/assign`,
// `/customers/:id/payment-history`, `/customers/:id/scheme`) are a
// reasonable REST guess consistent with the rest of this app, since this
// is a brand-new module with no prior contract to match. Only the URL
// strings need to change if your backend differs.

import axiosInstance from './axiosConfig';
import {
  Customer,
  CustomerListResponse,
  CustomerListFilters,
  CustomerSingleResponse,
  CustomerDeleteResponse,
  CreateCustomerPayload,
  UpdateCustomerPayload,
  AssignCustomersPayload,
  AssignCustomersResponse,
  CustomerPaymentHistoryResponse,
  CustomerSchemeResponse,
  CustomerFullDetail,
  CustomerFullDetailResponse,
} from '../types/index';

// ── Fetch list of all customers (with optional filters) ────────────────────
/** GET /api/customers?page=1&limit=10&customer_name=...&building_name=...&wing=...&flat_no=...&from_date=...&to_date=... */
export const fetchAllCustomerDetails = async (
  page: number,
  limit: number,
  filters?: CustomerListFilters
): Promise<CustomerListResponse> => {
  const params: Record<string, string | number> = { page, limit };
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value && String(value).trim()) params[key] = value;
    });
  }
  const res = await axiosInstance.get('/customers', { params });
  return {
    success: res.data.success,
    message: res.data.message,
    rows: res.data.rows as Customer[],
    total: res.data.total,
    page: res.data.page,
    limit: res.data.limit,
    summary: res.data.summary,
  };
};

// ── Fetch single customer by ID (View) ──────────────────────────────────────
/** GET /api/customers/:id */
export const fetchCustomerById = async (id: string): Promise<CustomerSingleResponse> => {
  const res = await axiosInstance.get(`/customers/${id}`);
  return { success: res.data.success, message: res.data.message, data: res.data.data as Customer };
};

// ── Fetch single customer by ID, full Create-Customer-form shape (Edit/View) ──
/** GET /api/customers/:id — same endpoint as fetchCustomerById, richer shape */
export const fetchCustomerFullDetails = async (id: string): Promise<CustomerFullDetailResponse> => {
  const res = await axiosInstance.get(`/customers/${id}`);
  return { success: res.data.success, message: res.data.message, data: res.data.data as CustomerFullDetail };
};

// ── Create new customer ──────────────────────────────────────────────────────
/** POST /api/customers */
export const createCustomer = async (payload: CreateCustomerPayload): Promise<CustomerSingleResponse> => {
  const res = await axiosInstance.post('/customers', payload);
  return { success: res.data.success, message: res.data.message, data: res.data.data as Customer };
};

// ── Update existing customer ────────────────────────────────────────────────
/** PUT /api/customers/:id */
export const updateCustomer = async (id: string, payload: UpdateCustomerPayload): Promise<CustomerSingleResponse> => {
  const res = await axiosInstance.put(`/customers/${id}`, payload);
  return { success: res.data.success, message: res.data.message, data: res.data.data as Customer };
};

// ── Create new customer — full Create-Customer form, multipart/form-data ─────
// Used by the new CustomerDetailsCrudPage: every field on the Create Customer
// screen (Personal / Property Booking / Payment Details) plus the six file
// uploads (customer photo, Aadhar photo, PAN photo, Application Form,
// Declaration Form, Allotment Letter) travels in one FormData body, since
// createCustomer()/updateCustomer() above only send plain JSON and can't
// carry files.
/** POST /api/customers (multipart/form-data) */
export const createCustomerWithDetails = async (formData: FormData): Promise<CustomerSingleResponse> => {
  const res = await axiosInstance.post('/customers', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return { success: res.data.success, message: res.data.message, data: res.data.data as Customer };
};

// ── Update existing customer — full Create-Customer form, multipart/form-data ─
/** PUT /api/customers/:id (multipart/form-data) */
export const updateCustomerWithDetails = async (id: string, formData: FormData): Promise<CustomerSingleResponse> => {
  const res = await axiosInstance.put(`/customers/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return { success: res.data.success, message: res.data.message, data: res.data.data as Customer };
};

// ── Delete customer ──────────────────────────────────────────────────────────
/** DELETE /api/customers/:id */
export const deleteCustomer = async (id: string): Promise<CustomerDeleteResponse> => {
  const res = await axiosInstance.delete(`/customers/${id}`);
  return res.data;
};

// ── Assign one or more customers to an employee ─────────────────────────────
/** POST /api/customers/assign */
export const assignCustomersToEmployee = async (payload: AssignCustomersPayload): Promise<AssignCustomersResponse> => {
  const res = await axiosInstance.post('/customers/assign', payload);
  return res.data;
};

// ── Payment History ──────────────────────────────────────────────────────────
/** GET /api/customers/:id/payment-history */
export const fetchCustomerPaymentHistory = async (customerId: string): Promise<CustomerPaymentHistoryResponse> => {
  const res = await axiosInstance.get(`/customers/${customerId}/payment-history`);
  return { success: res.data.success, message: res.data.message, rows: res.data.rows || [] };
};

// ── Scheme ────────────────────────────────────────────────────────────────
/** GET /api/customers/:id/scheme */
export const fetchCustomerScheme = async (customerId: string): Promise<CustomerSchemeResponse> => {
  const res = await axiosInstance.get(`/customers/${customerId}/scheme`);
  return { success: res.data.success, message: res.data.message, data: res.data.data ?? null };
};

// Grouped export — same convenience pattern as buildingService / departmentService / employeeService
export const customerDetailsService = {
  getAll             : fetchAllCustomerDetails,
  getById            : fetchCustomerById,
  getFullDetails     : fetchCustomerFullDetails,
  create             : createCustomer,
  update             : updateCustomer,
  createWithDetails  : createCustomerWithDetails,
  updateWithDetails  : updateCustomerWithDetails,
  remove             : deleteCustomer,
  assign             : assignCustomersToEmployee,
  paymentHistory     : fetchCustomerPaymentHistory,
  scheme             : fetchCustomerScheme,
};
