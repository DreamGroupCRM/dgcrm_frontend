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
import { PaymentFor } from '../types/index';
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
  flat: { id: number; flat_number: string; floor?: { id: number; name: string } | null } | null;
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

/** GET /api/customer-portal/bookings/:id/due-grid */
export const fetchMyBookingDueGrid = async (id: string | number): Promise<PortalDueGrid> => {
  const res = await axiosInstance.get(`/customer-portal/bookings/${id}/due-grid`);
  return res.data.data;
};
