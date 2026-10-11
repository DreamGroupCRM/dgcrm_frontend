// src/services/customerPortalService.ts
// ==========================================
// DREAM GROUP CRM - CUSTOMER PORTAL SERVICE (item 17)
// ==========================================
// Talks to the new /api/customer-portal/* router (customerPortal.routes.ts
// in dgcrm_backend) — every call is implicitly scoped to the logged-in
// customer's own bookings server-side (see that router's ownership
// checks), so no customer/user id is ever passed from here; axiosInstance
// already attaches the bearer token.
import axiosInstance from './axiosConfig';
import { toCancelledReceipt } from './customerDetailsService';
import { PaymentFor, PaymentReceipt, CustomerSchemeData } from '../types/index';
import { DueGridRow, mapPaymentReceiptData } from './paymentService';

export interface PortalBookingSummary {
  id: number;
  customer_code: string;
  customer_name?: string; // shown on the header's booking boxes
  building_name: string | null;
  wing_name: string | null;
  flat_no: string | null;
  floor_name: string | null;
  flat_amount: number;
  possession_granted: boolean;
  customer_image: string | null;
  // Which kind of unit this booking is. A shop booking has no wing/flat at
  // all, so the booking switcher has to label it by its shop number.
  unit_type: 'flat' | 'shop';
  shop_no: string | null;
  // V_25.0 — this booking's own cancellation (never another booking's).
  is_cancelled?: boolean;
  cancelled_at?: string | null;
}

export interface PortalBookingDetail {
  id: number;
  customer_code: string;
  name: string | null;
  middle_name: string | null;
  last_name: string | null;
  mobile_number: string | null;
  mobile_country_code: string | null;
  whatsapp_number: string | null;
  whatsapp_country_code: string | null;
  alternate_number: string | null;
  email: string | null;
  address: string | null;
  date_of_birth: string | null;
  building: { id: number; name: string; project_name: string | null } | null;
  wing: { id: number; name: string } | null;
  // flat_type/area_sqft ride along on the relation — they are what the
  // portal's "Flat Type" and "Area" fields read, and they live on the Flat
  // row, not on Customer.
  flat: {
    id: number; flat_number: string; flat_type?: string | null; area_sqft?: number | null;
    floor?: { id: number; name: string } | null;
  } | null;
  // A shop booking is mutually exclusive with wing/flat above. unit_type
  // is derived server-side from which of shop_id/flat_id is set — the
  // Customer row has no such column of its own.
  shop: { id: number; shop_no: string; area_sqft?: number | null } | null;
  shop_id: number | null;
  flat_id: number | null;
  unit_type?: 'flat' | 'shop';
  parking_no: string | null;
  customer_image: string | null;
  aadhar_card_no: string;
  pan_card_no: string | null;
  aadhar_card: string | null;
  pan_card: string | null;
  application_form: string | null;
  declaration_form: string | null;
  allotment_letter: string | null;
  // V_25.0 — cancellation documents of a cancelled booking (null when not uploaded).
  is_customer_deleted?: boolean;
  cancel_letter?: string | null;
  acceptance_letter?: string | null;
  cancel_documents?: string | null;
  returned_documents?: string | null;
  flat_amount: number;
  booking_amount: number | null;
  pay_after_booking: number | null;
  possession_amount: number | null;
  installment_amount: number | null;
  installment_amount1: number;
  possession_granted: boolean;
  company_name: string | null;
  booking_date: string | null;
  secondary_numbers: { id: number; country_code: string; number: string }[];
  // V_24.0 — Home's "Relationship Manager" card. null when this booking has
  // no assigned employee yet (never an error — see the backend's
  // findAssignedEmployeeForBooking comment).
  assigned_employee: {
    id: number;
    employee_code: string | null;
    name: string;
    photo_url: string | null;
    mobile_country_code: string | null;
    mobile_number: string | null;
    email: string | null;
    designation: string | null;
    department: string | null;
  } | null;
}

export interface PortalPaymentRow {
  id: number;
  payment_date?: string | null;
  received_by?: string | null;
  payment_tag?: string | null;
  is_after_possession_emi?: boolean;
  // V_23.0 item 2 — null until an admin approves the payment.
  receipt_number: string | null;
  payment_type: PaymentFor;
  amount: number;
  company: string | null;
  mode_of_payment: string | null;
  date: string | null;
  inst_date: string | null;
  clearance_date: string | null;
  is_approved: boolean;
  created_at: string;
}

export interface PortalDueGrid {
  customer_id: number;
  customer_name: string;
  company_name: string | null;
  rows: DueGridRow[];
  /** V_25.0 — Extra Pay total (kept out of the rows). */
  extra_pay_total?: number;
}

/** GET /api/customer-portal/bookings */
export const fetchMyBookings = async (): Promise<PortalBookingSummary[]> => {
  const res = await axiosInstance.get('/customer-portal/bookings');
  return res.data.rows ?? [];
};

/** GET /api/customer-portal/bookings/:id */
export const fetchMyBookingDetail = async (id: string | number): Promise<PortalBookingDetail> => {
  const res = await axiosInstance.get(`/customer-portal/bookings/${id}`);
  return res.data.data;
};

/** GET /api/customer-portal/bookings/:id/payments */
export const fetchMyBookingPayments = async (id: string | number): Promise<PortalPaymentRow[]> => {
  const res = await axiosInstance.get(`/customer-portal/bookings/${id}/payments`);
  return res.data.rows ?? [];
};

/**
 * GET /api/customer-portal/payments/:transactionId/receipt
 * One transaction's receipt, in the same shape the staff-side receipt
 * modal renders — ownership-scoped server-side to the caller's own
 * transactions, and only available once the payment has been approved.
 */
// Mapped exactly like the office's receipt — the raw payload has no
// combined `amount` and no joined customer name/building, which is why the
// portal's receipt showed an amount of 0 and a blank name.
export const fetchMyPaymentReceipt = async (transactionId: string | number): Promise<PaymentReceipt> => {
  const res = await axiosInstance.get(`/customer-portal/payments/${transactionId}/receipt`);
  return mapPaymentReceiptData(res.data.data) as PaymentReceipt;
};

// ── Cancelled bookings' refund receipts (C_FY_MM_n) ─────────────────────────
export interface PortalCancelledRefund {
  refund_id: string;
  receipt_number: string | null; // set once an admin approves the refund
  refunded_amount: number;
  refund_date: string;
  mode_of_payment: string | null;
  status: 'pending' | 'approved';
}
export interface PortalCancelledBooking {
  customer_id: string;
  customer_code: string | null;
  unit: string;
  cancelled_at: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  refunds: PortalCancelledRefund[];
}

/** GET /api/customer-portal/cancelled-receipts?booking_id= — that cancelled booking and its refunds. */
export const fetchMyCancelledReceipts = async (bookingId?: number): Promise<PortalCancelledBooking[]> => {
  const res = await axiosInstance.get('/customer-portal/cancelled-receipts', { params: bookingId ? { booking_id: bookingId } : undefined });
  return res.data.data ?? [];
};

/** GET /api/customer-portal/cancelled-receipts/:refundId/receipt — approved refunds only. */
export const fetchMyCancelledReceipt = async (refundId: string): Promise<PaymentReceipt> => {
  const res = await axiosInstance.get(`/customer-portal/cancelled-receipts/${refundId}/receipt`);
  return toCancelledReceipt(res.data.data);
};

/** GET /api/customer-portal/bookings/:id/scheme */
export const fetchMyBookingScheme = async (id: string | number): Promise<CustomerSchemeData> => {
  const res = await axiosInstance.get(`/customer-portal/bookings/${id}/scheme`);
  return res.data.data;
};

/** GET /api/customer-portal/bookings/:id/due-grid */
export const fetchMyBookingDueGrid = async (id: string | number): Promise<PortalDueGrid> => {
  const res = await axiosInstance.get(`/customer-portal/bookings/${id}/due-grid`);
  return res.data.data;
};
