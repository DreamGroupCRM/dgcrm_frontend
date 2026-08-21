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
// GET /payments/:id/receipt's `customer` comes from a plain
// `customerRepo().findOne({ where: { id } })` with NO `relations` option —
// so `customer.building` / `customer.wing` / `customer.flat` are never
// populated on that response, only the raw `building_id` / `wing_id` /
// `flat_id` foreign keys are reliable. The receipt UI below only ever
// renders those raw ids (labelled "Building #4" etc.) rather than a
// building/wing/flat NAME, since the name genuinely isn't in this
// response. (fetchCustomerPaymentHistory's customer rows are unaffected —
// that's a different endpoint.)

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
  wing_id: number | string | null;
  flat_id: number | string | null;
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

// Backend Customer (raw, no relations loaded on this endpoint — see file
// header) -> the clean PaymentReceiptCustomer shape.
const mapReceiptCustomer = (c: BackendReceiptCustomer): PaymentReceiptCustomer => ({
  id: String(c.id),
  customer_code: c.customer_code,
  customer_name: [c.name, c.middle_name, c.last_name].filter(Boolean).join(' '),
  mobile_number: c.mobile_number ?? '',
  email: c.email ?? '',
  address: c.address ?? '',
  building_id: c.building_id != null ? Number(c.building_id) : null,
  wing_id: c.wing_id != null ? Number(c.wing_id) : null,
  flat_id: c.flat_id != null ? Number(c.flat_id) : null,
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

// Grouped export — same convenience pattern as buildingService / departmentService / customerDetailsService
export const paymentService = {
  collect          : collectPayment,
  dueReport        : fetchDueReport,
  customerDue      : fetchCustomerDue,
  customerRemaining: fetchCustomerRemaining,
  receipt          : fetchPaymentReceipt,
};
