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
import { PaymentFor, PaymentReceipt, CustomerSchemeData } from '../types/index';
import { DueGridRow } from './paymentService';

export interface PortalBookingSummary {
  id: number;
  customer_code: string;
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
  building: { id: number; name: string } | null;
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
  flat_amount: number;
  booking_amount: number | null;
  pay_after_booking: number | null;
  possession_amount: number | null;
  installment_amount: number | null;
  installment_amount1: number;
  possession_granted: boolean;
  company_name: string | null;
  secondary_numbers: { id: number; country_code: string; number: string }[];
}

export interface PortalPaymentRow {
  id: number;
  receipt_number: string;
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
export const fetchMyPaymentReceipt = async (transactionId: string | number): Promise<PaymentReceipt> => {
  const res = await axiosInstance.get(`/customer-portal/payments/${transactionId}/receipt`);
  return res.data.data;
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
