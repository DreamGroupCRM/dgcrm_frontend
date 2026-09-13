// src/services/paymentUpcomingService.ts
// ==========================================
// DREAM GROUP CRM - PAYMENT UPCOMING SERVICE
// ==========================================
// Dedicated service file for the standalone "Payment Upcoming" page
// (V_22.0) — split out of Payment Dues' old "Show Upcoming Payment"
// checkbox. Kept separate from paymentService.ts per the page's own
// separate-file convention (types / service / CSS / page component each
// on their own). Same plain-axios-against-axiosInstance shape every other
// service file in this app uses.

import axiosInstance from './axiosConfig';
import { UpcomingAmountData, UpcomingListDetailRow } from '../types/paymentUpcoming';

// ── Date-range total — same stat-box figure the old Payment Dues checkbox
// used to show (payment.service.ts's getUpcomingAmountInRange). ─────────
/** GET /api/payments/upcoming-amount?from=YYYY-MM-DD&to=YYYY-MM-DD */
export const fetchUpcomingAmount = async (from: string, to: string): Promise<UpcomingAmountData> => {
  const res = await axiosInstance.get('/payments/upcoming-amount', { params: { from, to } });
  return res.data.data;
};

// ── Detailed, per-installment list for the same date range — one row per
// upcoming (not-yet-due) schedule item, powering the follow-up table
// below the stat box (payment.service.ts's getUpcomingListDetailed). ────
/** GET /api/payments/upcoming-list-detailed?from=YYYY-MM-DD&to=YYYY-MM-DD */
export const fetchUpcomingListDetailed = async (from: string, to: string): Promise<{ success: boolean; rows: UpcomingListDetailRow[]; total: number }> => {
  const res = await axiosInstance.get('/payments/upcoming-list-detailed', { params: { from, to } });
  return { success: res.data.success, rows: res.data.rows ?? [], total: res.data.total ?? 0 };
};

// Grouped export — same convenience pattern as paymentService / buildingService / customerDetailsService
export const paymentUpcomingService = {
  upcomingAmount      : fetchUpcomingAmount,
  upcomingListDetailed: fetchUpcomingListDetailed,
};
