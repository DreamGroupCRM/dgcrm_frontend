// src/services/paymentService.ts
// ==========================================
// DREAM GROUP CRM - PAYMENT SERVICE
// ==========================================
// Talks to the real backend `payments` module (`/api/payments`, ported
// from legacy's AmountTransactionsController — see payment.service.ts /
// payment.routes.ts in dgcrm_backend). Same pattern as every other
// service file in this app: plain axios calls against axiosInstance
// (baseURL already ends in /api, token already attached by the request
// interceptor), JSDoc `/** METHOD /api/path */` above each export, and a
// grouped default-style export at the bottom.
//
// `fetchCustomerPaymentHistory` (GET /payments/customer/:id, the existing
// "Payment History" viewer) already lives in customerDetailsService.ts and
// is deliberately NOT duplicated here — this file only adds the payment
// endpoints nothing currently calls: collect payment, due report, a single
// customer's due/remaining amounts, and one transaction's receipt data.
//
// ── Response-shape note (verified against payment.service.ts /
// payment.controller.ts at V_13.0, not guessed) ──────────────────────────
// GET /payments/:id/receipt's `customer` lookup now loads the
// building/wing/flat relations (fixed in payment.service.ts's
// getPaymentReceipt), so building_name/wing_name/flat_no below are real
// names, not just the raw foreign-key ids.

import axiosInstance from './axiosConfig';
import {
  CollectPaymentPayload,
  CollectPaymentResponse,
  DueReportResponse,
  CustomerDueResponse,
  CustomerRemainingResponse,
  PaymentReceiptResponse,
  PaymentReceiptTransaction,
  PaymentReceiptCustomer,
  PaymentFor,
  DefaultAmountData,
  DefaultAmountResponse,
} from '../types/index';

// ── Backend response shapes (V_13.0) — only the fields this file reads.
// See AmountTransaction.entity.ts / Customer.entity.ts in dgcrm_backend
// for the authoritative field list. ──────────────────────────────────────
interface BackendAmountTransaction {
  id: number | string;
  receipt_number: string;
  payment_type: string;
  company: string | null;
  mode_of_payment: string | null;
  date: string | null;
  inst_date: string | null;
  payment_date: string | null;
  cheque_number: string | null;
  clearance_date: string | null;
  maintanance1: number | null; // legacy-spelled column — not a typo to "fix"
  received_by: string | null;
  emi_amnt: number | null;
  booking_amount: number | null;
  pay_after_booking: number | null;
  possession_amount: number | null;
  annual_amount: number | null;
  annual_amount1: number | null;
  payment_tag: string | null;
  is_approved: boolean;
  created_at: string;
}

interface BackendReceiptCustomer {
  id: number | string;
  customer_code: string;
  name: string | null;
  middle_name: string | null;
  last_name: string | null;
  mobile_number: string | null;
  email: string | null;
  address: string | null;
  building_id: number | string | null;
  building: { id: number | string; name: string } | null;
  wing_id: number | string | null;
  wing: { id: number | string; name: string } | null;
  flat_id: number | string | null;
  flat: { id: number | string; flat_number: string } | null;
}

// AmountTransaction -> the clean PaymentReceiptTransaction shape. Same
// "whichever type-specific column is non-null" logic customerDetailsService's
// mapTransactionToPaymentRecord already uses for the payment-history list.
const mapReceiptTransaction = (t: BackendAmountTransaction): PaymentReceiptTransaction => ({
  id: String(t.id),
  receipt_number: t.receipt_number,
  payment_type: t.payment_type as PaymentFor,
  amount: t.emi_amnt ?? t.booking_amount ?? t.pay_after_booking ?? t.possession_amount ?? t.annual_amount ?? t.annual_amount1 ?? 0,
  company: t.company,
  mode_of_payment: t.mode_of_payment,
  date: t.date,
  inst_date: t.inst_date,
  payment_date: t.payment_date,
  cheque_number: t.cheque_number,
  clearance_date: t.clearance_date,
  maintenance: t.maintanance1,
  received_by: t.received_by,
  payment_tag: t.payment_tag,
  is_approved: t.is_approved,
  created_at: t.created_at,
});

// Backend Customer (building/wing/flat relations now loaded — see file
// header) -> the clean PaymentReceiptCustomer shape.
const mapReceiptCustomer = (c: BackendReceiptCustomer): PaymentReceiptCustomer => ({
  id: String(c.id),
  customer_code: c.customer_code,
  customer_name: [c.name, c.middle_name, c.last_name].filter(Boolean).join(' '),
  mobile_number: c.mobile_number ?? '',
  email: c.email ?? '',
  address: c.address ?? '',
  building_id: c.building_id != null ? Number(c.building_id) : null,
  building_name: c.building?.name ?? null,
  wing_id: c.wing_id != null ? Number(c.wing_id) : null,
  wing_name: c.wing?.name ?? null,
  flat_id: c.flat_id != null ? Number(c.flat_id) : null,
  flat_no: c.flat?.flat_number ?? null,
});

// Readable labels for the 6 payment_for enum values — shared by the
// Collect Payment form and the receipt view.
export const PAYMENT_FOR_OPTIONS: { value: PaymentFor; label: string }[] = [
  { value: 'EMIAmount', label: 'EMI Amount' },
  { value: 'BookingAmount', label: 'Booking Amount' },
  { value: 'PossessionAmount', label: 'Possession Amount' },
  { value: 'PayAfterbooking', label: 'Pay After Booking' },
  { value: 'AnnualAmount', label: 'Annual Amount (Before Possession)' },
  { value: 'AnnualAmount1', label: 'Annual Amount (After Possession)' },
];

export const paymentForLabel = (value: string): string =>
  PAYMENT_FOR_OPTIONS.find((o) => o.value === value)?.label ?? value;

// ── Collect a payment ────────────────────────────────────────────────────
/** POST /api/payments */
export const collectPayment = async (payload: CollectPaymentPayload): Promise<CollectPaymentResponse> => {
  const res = await axiosInstance.post('/payments', payload);
  return res.data;
};

// ── Due report — every active customer's due status for the 4 "simple"
// payment types (EMIAmount/AnnualAmount1 are deliberately not part of
// this report — see payment.service.ts's getDueReport comment) ──────────
/** GET /api/payments/due-report */
export const fetchDueReport = async (): Promise<DueReportResponse> => {
  const res = await axiosInstance.get('/payments/due-report');
  return { success: res.data.success, rows: res.data.rows ?? [], total: res.data.total ?? 0 };
};

// ── One customer's due amount, from the EMI schedule (independent of the
// partial-payment ledger) ────────────────────────────────────────────────
/** GET /api/payments/customer/:customerId/due */
export const fetchCustomerDue = async (customerId: string | number): Promise<CustomerDueResponse> => {
  const res = await axiosInstance.get(`/payments/customer/${customerId}/due`);
  return { success: res.data.success, data: res.data.data };
};

// ── One customer's remaining amount to collect, per payment type ────────
/** GET /api/payments/customer/:customerId/remaining */
export const fetchCustomerRemaining = async (customerId: string | number): Promise<CustomerRemainingResponse> => {
  const res = await axiosInstance.get(`/payments/customer/${customerId}/remaining`);
  return { success: res.data.success, data: res.data.data };
};

// ── One transaction's receipt data (transactionId is the same id as
// CustomerPaymentRecord.id from the existing payment-history list) ──────
/** GET /api/payments/:id/receipt */
export const fetchPaymentReceipt = async (transactionId: string | number): Promise<PaymentReceiptResponse> => {
  const res = await axiosInstance.get(`/payments/${transactionId}/receipt`);
  const d = res.data.data;
  return {
    success: res.data.success,
    data: {
      transaction: mapReceiptTransaction(d.transaction as BackendAmountTransaction),
      customer: mapReceiptCustomer(d.customer as BackendReceiptCustomer),
      paid_emis: d.paid_emis,
      future_emis: d.future_emis,
      total_emis: d.total_emis,
      emi_number: d.emi_number,
    },
  };
};

// ── Per-installment Due grid for one customer (item 15) ─────────────────
export type DueGridStatus = 'paid' | 'due' | 'upcoming';
export interface DueGridRow {
  sr: number;
  label: string;
  date: string | null;
  amount: number;
  payment_for: PaymentFor | null;
  status: DueGridStatus;
}
export interface CustomerDueGrid {
  customer_id: number;
  customer_name: string;
  company_name: string | null;
  rows: DueGridRow[];
}
/** GET /api/payments/customer/:customerId/due-grid */
export const fetchCustomerDueGrid = async (customerId: string | number): Promise<CustomerDueGrid> => {
  const res = await axiosInstance.get(`/payments/customer/${customerId}/due-grid`);
  return res.data.data;
};

// ── Payment Received (item 16) ───────────────────────────────────────────
export interface PaymentListRow {
  id: string;
  receipt_number: string;
  payment_type: PaymentFor;
  amount: number;
  customer_id: string;
  customer_name: string;
  company: string | null;
  mode_of_payment: string | null;
  received_by: string | null;
  is_approved: boolean;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string;
}
export interface PaymentListFilters {
  approval?: 'approved' | 'pending';
  search?: string;
}
/** GET /api/payments?page=&limit=&approval=&search= */
export const fetchPaymentList = async (
  page: number, limit: number, filters?: PaymentListFilters
): Promise<{ success: boolean; rows: PaymentListRow[]; total: number }> => {
  const params: Record<string, string | number> = { page, limit };
  if (filters?.approval) params.approval = filters.approval;
  if (filters?.search?.trim()) params.search = filters.search.trim();
  const res = await axiosInstance.get('/payments', { params });
  return { success: res.data.success, rows: res.data.rows ?? [], total: res.data.total ?? 0 };
};
/** PUT /api/payments/:id/approve */
export const approvePayment = async (id: string | number): Promise<{ success: boolean; message: string }> => {
  const res = await axiosInstance.put(`/payments/${id}/approve`);
  return res.data;
};

/** PUT /api/payments/bulk-approve */
export const bulkApprovePayments = async (ids: (string | number)[]): Promise<{ success: boolean; approved: number; message: string }> => {
  const res = await axiosInstance.put('/payments/bulk-approve', { ids: ids.map(Number) });
  return res.data;
};

// ── Delete + EMI recalculation ripple (admin-only) ───────────────────────
/** DELETE /api/payments/:id */
export const deletePayment = async (id: string | number): Promise<{ success: boolean; message: string }> => {
  const res = await axiosInstance.delete(`/payments/${id}`);
  return res.data;
};

// ── Smart "Record Payment" suggester — default amount + next due date +
// maintenance eligibility, phase-aware, per payment type. ────────────────
/** GET /api/payments/customer/:customerId/default-amount?payment_for= */
export const fetchDefaultAmount = async (customerId: string | number, paymentFor: PaymentFor): Promise<DefaultAmountData> => {
  const res = await axiosInstance.get<DefaultAmountResponse>(`/payments/customer/${customerId}/default-amount`, { params: { payment_for: paymentFor } });
  return res.data.data;
};

// Grouped export — same convenience pattern as buildingService / departmentService / customerDetailsService
export const paymentService = {
  collect          : collectPayment,
  dueReport        : fetchDueReport,
  customerDue      : fetchCustomerDue,
  customerRemaining: fetchCustomerRemaining,
  receipt          : fetchPaymentReceipt,
  customerDueGrid  : fetchCustomerDueGrid,
  list             : fetchPaymentList,
  approve          : approvePayment,
  bulkApprove      : bulkApprovePayments,
  remove           : deletePayment,
  defaultAmount    : fetchDefaultAmount,
};
