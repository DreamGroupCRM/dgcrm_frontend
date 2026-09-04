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
// ── V_13.0 alignment note ───────────────────────────────────────────────
// The original version of this file guessed at the backend contract (no
// customer/payment module existed on the backend yet). Backend V_13.0 has
// since shipped a real `customers` module (`/api/customers`, legacy-traced
// from FossTech's Booked1Controller — see Customer.entity.ts) and a real
// `payments` module (`/api/payments`, from AmountTransactionsController).
// This file now talks to those real endpoints. To avoid touching any page
// component, form state, or type in `types/index.ts`, every fix lives
// entirely in this file as a translation layer: outgoing requests get the
// extra backend-shaped fields appended alongside the existing ones (so
// nothing already being sent is removed), and incoming responses are
// mapped from the backend's real shape into the Customer/CustomerFullDetail
// shape this app's pages already expect.
//
// V_16.0: booster amounts/intervals and remaining_booking_amount/date now
// map onto real backend columns — annual_amount/annual_amount1/
// annual_amount_every_months/annual_amount2_every_months (booster) and
// pay_after_booking/pay_after_booking_date (remaining booking) already
// existed or were added specifically for this; see
// database/2026-08-24-customer-pay-after-booking-date.sql. company_name
// now has a real column too (database/2026-08-24-customer-company-name.sql)
// — it was always collected by the Create/Edit form but silently dropped
// on save, coming back blank on every Edit. floor_id/floor_label are
// recovered via the flat's own floor relation (Customer has no floor_id
// column of its own — see findCustomerById on the backend) rather than a
// new column, since Floor is already fully determined by which Flat is
// selected. Only project_name has no backend counterpart of its own — it's
// derived instead from the selected Building's own project_name, which
// already round-trips correctly.

import axiosInstance from './axiosConfig';
import {
  Customer,
  CustomerListResponse,
  CustomerListFilters,
  CustomerSingleResponse,
  CustomerCreateEditResponse,
  CustomerDeleteResponse,
  CreateCustomerPayload,
  UpdateCustomerPayload,
  AssignCustomersPayload,
  AssignCustomersResponse,
  CustomerPaymentHistoryResponse,
  CustomerPaymentRecord,
  CustomerSchemeDetailResponse,
  CustomerFullDetail,
  CustomerFullDetailResponse,
} from '../types/index';

// booking_date/installment_date/pay_after_booking_date are `timestamp`
// columns on the backend (not `date`), so they come back as full ISO
// strings like "2026-08-15T00:00:00.000Z" — an HTML <input type="date">
// requires exactly "yyyy-mm-dd" and silently renders BLANK for anything
// else, which is why Edit Customer's Booking Date / Installment Date /
// Remaining Booking Date fields all came back empty despite having been
// saved correctly. date_of_birth doesn't need this — it's a `date` column
// and already comes back as a plain "yyyy-mm-dd" string.
const toDateOnly = (iso: string | null): string => (iso ? iso.slice(0, 10) : '');

// ── Backend response shapes (V_13.0) — only the fields this file reads ──
// See Customer.entity.ts / Building.entity.ts / Wing.entity.ts /
// Flat.entity.ts / AmountTransaction.entity.ts in dgcrm_backend for the
// authoritative field list.
interface BackendBuilding { id: number | string; name: string; project_name: string | null; location: string | null; }
interface BackendWing { id: number | string; name: string; }
// floor is nested under flat (not a direct customers.floor_id column — see
// customer.repository.ts's findCustomerById on the backend), since Floor
// sits between Wing and Flat in the Building hierarchy and this is the
// only place to recover which floor a customer's flat is on.
interface BackendFloor { id: number | string; name: string; }
interface BackendFlat { id: number | string; flat_number: string; flat_type: string | null; area_sqft: number | string | null; floor: BackendFloor | null; }
interface BackendCustomer {
  id: number | string;
  customer_code: string;
  name: string | null;
  middle_name: string | null;
  last_name: string | null;
  mobile_number: string | null;
  mobile_country_code: string | null;
  whatsapp_number: string | null;
  whatsapp_country_code: string | null;
  secondary_numbers?: { id: number | string; country_code: string; number: string }[];
  email: string | null;
  address: string | null;
  date_of_birth: string | null;
  alternate_contact_name: string | null;
  alternate_contact_mobile: string | null;
  company_name: string | null;
  has_parking: boolean;
  parking_no: string | null;
  building_id: number | string | null;
  building: BackendBuilding | null;
  wing_id: number | string | null;
  wing: BackendWing | null;
  flat_id: number | string | null;
  flat: BackendFlat | null;
  assigned_employee_id: number | string | null;
  assigned_employee_code: string | null;
  assigned_employee_name: string | null;
  assigned_employee_photo_url: string | null;
  customer_image: string | null;
  aadhar_card_no: string;
  pan_card_no: string | null;
  application_form: string | null;
  declaration_form: string | null;
  aadhar_card: string | null;
  pan_card: string | null;
  allotment_letter: string | null;
  flat_amount: number;
  installment_amount: number | null;
  installment_date: string | null;
  installment_amount1: number;
  installment_tenure: number;
  booking_amount: number | null;
  pay_after_booking: number | null;
  pay_after_booking_date: string | null;
  possession_amount: number | null;
  booking_date: string | null;
  annual_amount: number | null;
  annual_amount1: number | null;
  annual_amount_every_months: number;
  annual_amount2_every_months: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
interface BackendAmountTransaction {
  id: number | string;
  receipt_number: string;
  payment_type: string;
  mode_of_payment: string | null;
  date: string | null;
  inst_date: string | null;
  payment_date: string | null;
  cheque_number: string | null;
  emi_amnt: number | null;
  booking_amount: number | null;
  pay_after_booking: number | null;
  possession_amount: number | null;
  annual_amount: number | null;
  annual_amount1: number | null;
  is_approved: boolean;
  created_at: string;
}

// Backend Customer (+ building/wing/flat relations) -> the flat `Customer`
// shape the List page already renders. assigned_employee_* now comes from
// a real backend join (customer.repository.ts's findCustomerList) — the
// "Assign to Employee" button was always saving the assignment correctly,
// it just never came back on the list response for the Employee Name
// column to show; this fixes the read side, not the write side.
const mapCustomerRow = (bc: BackendCustomer): Customer => ({
  id: String(bc.id),
  customer_code: bc.customer_code,
  customer_photo_url: bc.customer_image,
  customer_name: [bc.name, bc.middle_name, bc.last_name].filter(Boolean).join(' '),
  mobile_number: bc.mobile_number ?? '',
  email: bc.email ?? '',
  address: bc.address ?? '',
  building_id: bc.building_id != null ? String(bc.building_id) : '',
  building_name: bc.building?.name ?? '',
  wing_id: bc.wing_id != null ? String(bc.wing_id) : undefined,
  wing_name: bc.wing?.name ?? '',
  flat_id: bc.flat_id != null ? String(bc.flat_id) : undefined,
  flat_no: bc.flat?.flat_number ?? '',
  flat_type: bc.flat?.flat_type ?? '',
  area_sqft: bc.flat?.area_sqft != null ? Number(bc.flat.area_sqft) : null,
  booking_date: bc.booking_date ?? '',
  monthly_emi: bc.installment_amount,
  assigned_employee_id: bc.assigned_employee_id != null ? String(bc.assigned_employee_id) : undefined,
  assigned_employee_code: bc.assigned_employee_code ?? undefined,
  assigned_employee_name: bc.assigned_employee_name ?? undefined,
  assigned_employee_photo_url: bc.assigned_employee_photo_url,
  status: bc.is_active ? 'active' : 'inactive',
  is_active: bc.is_active,
  created_at: bc.created_at,
  updated_at: bc.updated_at,
});

// Backend Customer -> the full Create/Edit form shape (CustomerFullDetail).
// Every field that has a clear backend counterpart is populated for real;
// fields with no backend counterpart (see file header) are left null/''
// exactly as this form has always defaulted them, not guessed at.
const mapCustomerFullDetail = (bc: BackendCustomer): CustomerFullDetail => ({
  id: String(bc.id),
  customer_code: bc.customer_code,
  first_name: bc.name ?? '',
  middle_name: bc.middle_name ?? '',
  last_name: bc.last_name ?? '',
  customer_photo_url: bc.customer_image,
  email: bc.email ?? '',
  mobile_country_code: bc.mobile_country_code || '+91',
  mobile_number: bc.mobile_number ?? '',
  whatsapp_country_code: bc.whatsapp_country_code || '+91',
  whatsapp_number: bc.whatsapp_number ?? '',
  secondary_numbers: (bc.secondary_numbers ?? []).map((p) => ({ country_code: p.country_code || '+91', number: p.number })),
  aadhar_number: bc.aadhar_card_no ?? '',
  aadhar_photo_url: bc.aadhar_card,
  pancard_number: bc.pan_card_no ?? '',
  pancard_photo_url: bc.pan_card,
  address: bc.address ?? '',
  date_of_birth: bc.date_of_birth ?? '',
  alternate_person_name: bc.alternate_contact_name ?? '',
  alternate_person_mobile: bc.alternate_contact_mobile ?? '',

  company_name: bc.company_name ?? '',
  project_name: bc.building?.project_name ?? '',
  location: bc.building?.location ?? '',
  building_id: bc.building_id != null ? String(bc.building_id) : '',
  building_name: bc.building?.name ?? '',
  wing_id: bc.wing_id != null ? String(bc.wing_id) : '',
  wing_name: bc.wing?.name ?? '',
  // Customer has no floor_id column of its own — recovered via the flat's
  // own floor relation instead (see BackendFloor/BackendFlat above).
  floor_id: bc.flat?.floor?.id != null ? String(bc.flat.floor.id) : '',
  floor_label: bc.flat?.floor?.name ?? '',
  flat_id: bc.flat_id != null ? String(bc.flat_id) : '',
  flat_no: bc.flat?.flat_number ?? '',
  flat_type: bc.flat?.flat_type ?? '',
  area_sqft: bc.flat?.area_sqft != null ? Number(bc.flat.area_sqft) : null,
  wants_parking: bc.has_parking ? 'yes' : 'no',
  parking_no: bc.parking_no ?? '',

  total_cost: bc.flat_amount,
  booking_date: toDateOnly(bc.booking_date),
  booking_amount: bc.booking_amount,
  remaining_booking_amount: bc.pay_after_booking,
  remaining_booking_date: toDateOnly(bc.pay_after_booking_date),
  possession_amount: bc.possession_amount,
  installment_date: toDateOnly(bc.installment_date),
  monthly_emi_before_possession: bc.installment_amount,
  monthly_emi_after_possession: bc.installment_amount1,
  total_emi_tenure_months: bc.installment_tenure,
  booster_amount_before_possession: bc.annual_amount,
  booster_amount_after_possession: bc.annual_amount1,
  booster_interval_before_possession_months: bc.annual_amount_every_months,
  booster_interval_after_possession_months: bc.annual_amount2_every_months,

  application_form_url: bc.application_form,
  declaration_form_url: bc.declaration_form,
  allotment_letter_url: bc.allotment_letter,

  is_active: bc.is_active,
  created_at: bc.created_at,
  updated_at: bc.updated_at,
});

// AmountTransaction -> CustomerPaymentRecord. Legacy stores the collected
// amount on a type-specific column (see AmountTransaction.entity.ts)
// rather than one generic "amount" column — this picks whichever one this
// transaction's payment_type actually populated.
const mapTransactionToPaymentRecord = (t: BackendAmountTransaction): CustomerPaymentRecord => ({
  id: String(t.id),
  paid_on: t.payment_date ?? t.date ?? t.created_at,
  amount: t.emi_amnt ?? t.booking_amount ?? t.pay_after_booking ?? t.possession_amount ?? t.annual_amount ?? t.annual_amount1 ?? 0,
  mode: t.mode_of_payment ?? undefined,
  reference_no: t.receipt_number || t.cheque_number || undefined,
  is_approved: t.is_approved,
  payment_type: t.payment_type,
});

// Text-field renames from this app's form-field names to the backend's
// real column names — see Customer.entity.ts / CreateCustomerSchema.
// Fields not listed here already share the same name on both sides
// (middle_name, last_name, email, mobile_number, mobile_country_code,
// whatsapp_country_code, secondary_numbers, address, date_of_birth,
// building_id, wing_id, flat_id, booking_date, booking_amount,
// possession_amount, installment_date, parking_no, is_active) or have no
// backend counterpart at all and are deliberately left unmapped (see file
// header) — those extra keys are harmless: CreateCustomerSchema/
// UpdateCustomerSchema are plain (non-strict) Zod objects, so unknown
// fields are silently ignored server-side rather than rejected.
const CUSTOMER_TEXT_FIELD_RENAMES: ReadonlyArray<readonly [string, string]> = [
  ['first_name', 'name'],
  ['aadhar_number', 'aadhar_card_no'],
  ['pancard_number', 'pan_card_no'],
  ['alternate_person_name', 'alternate_contact_name'],
  ['alternate_person_mobile', 'alternate_contact_mobile'],
  ['total_cost', 'flat_amount'],
  ['monthly_emi_before_possession', 'installment_amount'],
  ['monthly_emi_after_possession', 'installment_amount1'],
  ['total_emi_tenure_months', 'installment_tenure'],
  // V_16.0 — these were always collected by the form but silently dropped
  // on save (see the file header note above).
  ['remaining_booking_amount', 'pay_after_booking'],
  ['remaining_booking_date', 'pay_after_booking_date'],
  ['booster_amount_before_possession', 'annual_amount'],
  ['booster_amount_after_possession', 'annual_amount1'],
  ['booster_interval_before_possession_months', 'annual_amount_every_months'],
  ['booster_interval_after_possession_months', 'annual_amount2_every_months'],
];

const CUSTOMER_FILE_FIELD_RENAMES: ReadonlyArray<readonly [string, string]> = [
  ['customer_photo', 'customer_image'],
  ['aadhar_photo', 'aadhar_card'],
  ['pancard_photo', 'pan_card'],
];

// Builds the FormData actually sent to the backend: every entry the page
// already put in `formData` is carried over unchanged (nothing is
// removed), plus the backend-named duplicates it needs to actually be
// understood by CreateCustomerSchema/UpdateCustomerSchema.
//
// File fields are the one exception to "carried over unchanged": Multer's
// upload.fields([...]) on the backend rejects ANY file field name that
// isn't in its declared list with a hard 500 ("Unexpected field") — for
// the whole request, not just that one field — so forwarding customer_photo/
// aadhar_photo/pancard_photo under their ORIGINAL names as well as their
// renamed ones (customer_image/aadhar_card/pan_card) broke every single
// Create/Update Customer submission that included a photo, which is all of
// them (Customer Photo, Aadhar Photo and Pancard Photo are mandatory).
// Text fields don't have this problem — multer puts unrecognized text
// fields straight into req.body with no rejection — so only file fields
// need to be excluded from the unchanged copy-through.
const CUSTOMER_FILE_FIELD_RENAME_FROM_KEYS = new Set(CUSTOMER_FILE_FIELD_RENAMES.map(([from]) => from));
const toBackendCustomerFormData = (formData: FormData): FormData => {
  const out = new FormData();
  formData.forEach((value, key) => {
    if (CUSTOMER_FILE_FIELD_RENAME_FROM_KEYS.has(key)) return; // re-appended under its backend name below
    out.append(key, value as string | Blob);
  });

  for (const [from, to] of CUSTOMER_TEXT_FIELD_RENAMES) {
    const v = formData.get(from);
    if (v != null) out.append(to, v as string);
  }
  for (const [from, to] of CUSTOMER_FILE_FIELD_RENAMES) {
    const v = formData.get(from);
    if (v != null) out.append(to, v as Blob);
  }

  // wants_parking ('yes'/'no') -> has_parking (boolean, via CreateCustomerSchema's
  // z.coerce.boolean()). z.coerce.boolean() is `Boolean(value)`, so ANY
  // non-empty string — including the literal text "false" — coerces to
  // true; the only string that coerces to false is an empty one.
  const wantsParking = formData.get('wants_parking');
  if (wantsParking != null) out.append('has_parking', wantsParking === 'yes' ? 'true' : '');

  return out;
};

// ── Fetch list of all customers (with optional filters) ────────────────────
/** GET /api/customers?page=1&limit=10&name=...&date_from=...&date_to=...&building_id=...&wing_id=...&flat_id=...&assignment_status=... */
export const fetchAllCustomerDetails = async (
  page: number,
  limit: number,
  filters?: CustomerListFilters
): Promise<CustomerListResponse> => {
  const params: Record<string, string | number> = { page, limit };
  if (filters) {
    // customer_name/from_date/to_date map to the backend's name/date_from/
    // date_to; building_id/wing_id/flat_id/assignment_status already share
    // the backend's own param names, so they pass through unchanged.
    // building_name/wing/flat_no (display names, not ids) are deliberately
    // NOT in this map — the backend can only filter buildings/wings/flats
    // by id, so callers resolve a selected name to its id (via the
    // Building list/detail they already have) before calling this, rather
    // than sending a name the backend would silently ignore.
    const RENAME: Record<string, string> = { customer_name: 'name', from_date: 'date_from', to_date: 'date_to' };
    Object.entries(filters).forEach(([key, value]) => {
      if (value && String(value).trim()) params[RENAME[key] ?? key] = value;
    });
  }
  const res = await axiosInstance.get('/customers', { params });
  return {
    success: res.data.success,
    message: res.data.message,
    rows: (res.data.rows as BackendCustomer[]).map(mapCustomerRow),
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
  return { success: res.data.success, message: res.data.message, data: mapCustomerRow(res.data.data as BackendCustomer) };
};

// ── Fetch single customer by ID, full Create-Customer-form shape (Edit/View) ──
/** GET /api/customers/:id — same endpoint as fetchCustomerById, richer shape */
export const fetchCustomerFullDetails = async (id: string): Promise<CustomerFullDetailResponse> => {
  const res = await axiosInstance.get(`/customers/${id}`);
  return { success: res.data.success, message: res.data.message, data: mapCustomerFullDetail(res.data.data as BackendCustomer) };
};

// ── Duplicate mobile/email check (item 18) — the Create Customer form's
// warn-but-allow popup: called just before final submit, so the admin can
// still confirm and create a genuine second booking anyway. ────────────────
export interface DuplicateContactMatch {
  id: number | string;
  name: string | null;
  customer_code: string;
  mobile_number: string | null;
  email: string | null;
}
/** GET /api/customers/duplicate-check?mobile=...&email=... */
export const checkDuplicateCustomerContacts = async (mobile: string, email: string): Promise<DuplicateContactMatch[]> => {
  const params: Record<string, string> = {};
  if (mobile.trim()) params.mobile = mobile.trim();
  if (email.trim()) params.email = email.trim();
  if (!params.mobile && !params.email) return [];
  const res = await axiosInstance.get('/customers/duplicate-check', { params });
  return (res.data.rows ?? []) as DuplicateContactMatch[];
};

// ── Create new customer ──────────────────────────────────────────────────────
// NOTE: kept as originally written. CreateCustomerPayload has no
// aadhar_card_no field, which CreateCustomerSchema requires (the one
// [Required] field on the legacy model this was traced from) — so a call
// through this plain-JSON path will still 400 on the backend. It isn't
// called from any page today (CustomerDetailsCrudPage uses
// createCustomerWithDetails below, which IS fixed); left as-is rather than
// reshaping CreateCustomerPayload for a caller that doesn't exist yet.
/** POST /api/customers */
export const createCustomer = async (payload: CreateCustomerPayload): Promise<CustomerSingleResponse> => {
  const res = await axiosInstance.post('/customers', payload);
  return { success: res.data.success, message: res.data.message, data: res.data.data as Customer };
};

// ── Update existing customer ────────────────────────────────────────────────
// NOTE: same as createCustomer above — kept as originally written, not
// currently called from any page.
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
// Admin/superadmin gets the Customer back immediately; anyone else's
// submission is queued for admin review (see ChangeRequestsPage) and comes
// back as `{ pending: true }` with no `data` — callers must check
// `pending` before touching the response's `data`.
/** POST /api/customers (multipart/form-data) */
export const createCustomerWithDetails = async (formData: FormData): Promise<CustomerCreateEditResponse> => {
  const res = await axiosInstance.post('/customers', toBackendCustomerFormData(formData), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  if (res.data.pending) return { success: res.data.success, pending: true, message: res.data.message };
  return { success: res.data.success, pending: false, message: res.data.message, data: mapCustomerRow(res.data.data as BackendCustomer) };
};

// ── Update existing customer — full Create-Customer form, multipart/form-data ─
/** PUT /api/customers/:id (multipart/form-data) */
export const updateCustomerWithDetails = async (id: string, formData: FormData): Promise<CustomerCreateEditResponse> => {
  const res = await axiosInstance.put(`/customers/${id}`, toBackendCustomerFormData(formData), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  if (res.data.pending) return { success: res.data.success, pending: true, message: res.data.message };
  return { success: res.data.success, pending: false, message: res.data.message, data: mapCustomerRow(res.data.data as BackendCustomer) };
};

// ── Delete customer ──────────────────────────────────────────────────────────
/** DELETE /api/customers/:id */
export const deleteCustomer = async (id: string): Promise<CustomerDeleteResponse> => {
  const res = await axiosInstance.delete(`/customers/${id}`);
  return res.data;
};

// ── Assign one or more customers to an employee ─────────────────────────────
// Real backend path is /customers/assign-employees (not /customers/assign),
// and it wants `employee_ids: number[]` (plural, array) rather than a
// single `employee_id`. AssignCustomersPayload itself is untouched — this
// just builds the correct backend body from it.
/** POST /api/customers/assign-employees */
export const assignCustomersToEmployee = async (payload: AssignCustomersPayload): Promise<AssignCustomersResponse> => {
  const res = await axiosInstance.post('/customers/assign-employees', {
    customer_ids: payload.customer_ids.map(Number),
    employee_ids: [Number(payload.employee_id)],
  });
  return res.data;
};

// ── Payment History ──────────────────────────────────────────────────────────
// Real backend path is under the payments module, not nested under
// /customers/:id — see payment.routes.ts (GET /api/payments/customer/:customerId).
/** GET /api/payments/customer/:customerId */
export const fetchCustomerPaymentHistory = async (customerId: string): Promise<CustomerPaymentHistoryResponse> => {
  const res = await axiosInstance.get(`/payments/customer/${customerId}`);
  return { success: res.data.success, message: res.data.message, rows: ((res.data.rows ?? []) as BackendAmountTransaction[]).map(mapTransactionToPaymentRecord) };
};

// ── Scheme (V_16.0) ─────────────────────────────────────────────────────
// Now a real, working endpoint (backend customer.controller.ts's
// getCustomerScheme) — customer info + EMI Scheme summary + EMI Schedule,
// computed from this customer's own saved Payment Details. Powers the
// Customer Scheme view page.
/** GET /api/customers/:id/scheme */
export const fetchCustomerScheme = async (customerId: string): Promise<CustomerSchemeDetailResponse> => {
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
