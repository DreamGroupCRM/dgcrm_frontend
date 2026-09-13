// src/types/paymentUpcoming.ts
// ==========================================
// DREAM GROUP CRM - PAYMENT UPCOMING TYPES
// ==========================================
// Dedicated types for the standalone "Payment Upcoming" page (V_22.0) —
// split out of Payment Dues' old "Show Upcoming Payment" checkbox. Kept in
// its own file (not merged into src/types/index.ts) per the page's own
// separate-file convention: types / service / CSS / page component each on
// their own, same colocation style the rest of this app's newer pages use.

/** Same 6-value enum payment.service.ts's PaymentFor uses — every row is
 * tagged with one of these (in addition to its own human-readable
 * `payment_for` label) purely so the page can group rows into the
 * per-category stat boxes (Monthly Installment / Booking / Pay After
 * Booking / Possession / Booster Before / Booster After Possession). */
export type PaymentForKey = 'EMIAmount' | 'BookingAmount' | 'PayAfterbooking' | 'PossessionAmount' | 'AnnualAmount' | 'AnnualAmount1';

/** One row from GET /payments/upcoming-list-detailed — a single upcoming
 * (not-yet-due) installment for one customer, landing on one date. */
export interface UpcomingListDetailRow {
  customer_id: number;
  customer_code: string;
  customer_name: string;
  mobile_number: string | null;
  email: string | null;
  assigned_employee_name: string | null;
  assigned_employee_code: string | null;
  company_name: string | null;
  project_name: string | null;
  location: string | null;
  building_name: string | null;
  wing_name: string | null;
  flat_no: string | null;
  payment_for: string;
  payment_for_key: PaymentForKey;
  due_date: string;
  amount: number;
}

/** Response of GET /payments/upcoming-amount — the date-range total shown
 * in the stat box above the table. */
export interface UpcomingAmountData {
  from: string;
  to: string;
  total_amount: number;
  customer_count: number;
}
