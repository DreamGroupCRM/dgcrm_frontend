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
// shape this app's pages already expect. Fields with no confident backend
// equivalent (booster amounts/intervals, remaining_booking_amount/date,
// company_name/project_name/floor_id/floor_label as customer-level fields,
// and the "scheme" concept generally) are deliberately left exactly as
// they were — untouched, still unmapped — per explicit product decision
// not to guess at those.

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
  CustomerPaymentRecord,
  CustomerSchemeResponse,
  CustomerFullDetail,
  CustomerFullDetailResponse,
} from '../types/index';

// ── Backend response shapes (V_13.0) — only the fields this file reads ──
// See Customer.entity.ts / Building.entity.ts / Wing.entity.ts /
// Flat.entity.ts / AmountTransaction.entity.ts in dgcrm_backend for the
// authoritative field list.
interface BackendBuilding { id: number | string; name: string; project_name: string | null; location: string | null; }
interface BackendWing { id: number | string; name: string; }
interface BackendFlat { id: number | string; flat_number: string; flat_type: string | null; area_sqft: number | string | null; }
interface BackendCustomer {
  id: number | string;
  customer_code: string;
  name: string | null;
  middle_name: string | null;
  last_name: string | null;
  mobile_number: string | null;
  whatsapp_number: string | null;
  email: string | null;
  address: string | null;
  date_of_birth: string | null;
  alternate_contact_name: string | null;
  alternate_contact_mobile: string | null;
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
  possession_amount: number | null;
  booking_date: string | null;
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
  customer_name: [bc.name, bc.middle_name, bc.last_name].filter(Boolean).join(' '),
  mobile_number: bc.mobile_number ?? '',
  email: bc.email ?? '',
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
  mobile_country_code: '+91', // not tracked by the backend — no column
  mobile_number: bc.mobile_number ?? '',
  whatsapp_country_code: '+91', // not tracked by the backend — no column
  whatsapp_number: bc.whatsapp_number ?? '',
  aadhar_number: bc.aadhar_card_no ?? '',
  aadhar_photo_url: bc.aadhar_card,
  pancard_number: bc.pan_card_no ?? '',
  pancard_photo_url: bc.pan_card,
  address: bc.address ?? '',
  date_of_birth: bc.date_of_birth ?? '',
  alternate_person_name: bc.alternate_contact_name ?? '',
  alternate_person_mobile: bc.alternate_contact_mobile ?? '',

  company_name: '', // no backend column — see file header
  project_name: bc.building?.project_name ?? '',
  location: bc.building?.location ?? '',
  building_id: bc.building_id != null ? String(bc.building_id) : '',
  building_name: bc.building?.name ?? '',
  wing_id: bc.wing_id != null ? String(bc.wing_id) : '',
  wing_name: bc.wing?.name ?? '',
  floor_id: '', // Customer has no floor_id column on the backend
  floor_label: '',
  flat_id: bc.flat_id != null ? String(bc.flat_id) : '',
  flat_no: bc.flat?.flat_number ?? '',
  flat_type: bc.flat?.flat_type ?? '',
  area_sqft: bc.flat?.area_sqft != null ? Number(bc.flat.area_sqft) : null,
  wants_parking: bc.has_parking ? 'yes' : 'no',
  parking_no: bc.parking_no ?? '',

  total_cost: bc.flat_amount,
  booking_date: bc.booking_date ?? '',
  booking_amount: bc.booking_amount,
  remaining_booking_amount: null, // no backend equivalent — see file header
  remaining_booking_date: '',
  possession_amount: bc.possession_amount,
  installment_date: bc.installment_date ?? '',
  monthly_emi_before_possession: bc.installment_amount,
  monthly_emi_after_possession: bc.installment_amount1,
  total_emi_tenure_months: bc.installment_tenure,
  booster_amount_before_possession: null, // no confident backend equivalent — see file header
  booster_amount_after_possession: null,
  booster_interval_before_possession_months: null,
  booster_interval_after_possession_months: null,

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
});

// Text-field renames from this app's form-field names to the backend's
// real column names — see Customer.entity.ts / CreateCustomerSchema.
// Fields not listed here already share the same name on both sides
// (middle_name, last_name, email, mobile_number, address, date_of_birth,
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
const toBackendCustomerFormData = (formData: FormData): FormData => {
  const out = new FormData();
  formData.forEach((value, key) => out.append(key, value as string | Blob));

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
/** GET /api/customers?page=1&limit=10&name=...&date_from=...&date_to=... (+ building_name/wing/flat_no, kept but not translated — see CustomerListFilters note below) */
export const fetchAllCustomerDetails = async (
  page: number,
  limit: number,
  filters?: CustomerListFilters
): Promise<CustomerListResponse> => {
  const params: Record<string, string | number> = { page, limit };
  if (filters) {
    // customer_name/from_date/to_date map cleanly to the backend's
    // name/date_from/date_to. building_name/wing/flat_no are left as-is:
    // the backend filters those by id (building_id/wing_id/flat_id), and
    // this filters object only carries display names, not ids — resolving
    // name -> id needs the Building list this service doesn't have here.
    // Harmless either way: GET /customers has no query-schema validation,
    // so an unrecognized param is just ignored server-side.
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
/** POST /api/customers (multipart/form-data) */
export const createCustomerWithDetails = async (formData: FormData): Promise<CustomerSingleResponse> => {
  const res = await axiosInstance.post('/customers', toBackendCustomerFormData(formData), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return { success: res.data.success, message: res.data.message, data: mapCustomerRow(res.data.data as BackendCustomer) };
};

// ── Update existing customer — full Create-Customer form, multipart/form-data ─
/** PUT /api/customers/:id (multipart/form-data) */
export const updateCustomerWithDetails = async (id: string, formData: FormData): Promise<CustomerSingleResponse> => {
  const res = await axiosInstance.put(`/customers/${id}`, toBackendCustomerFormData(formData), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return { success: res.data.success, message: res.data.message, data: mapCustomerRow(res.data.data as BackendCustomer) };
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

// ── Scheme ────────────────────────────────────────────────────────────────
// NOTE: left exactly as originally written. There is no "scheme" concept
// anywhere in the backend (no Scheme entity, no scheme-shaped fields on
// Customer/AmountTransaction) as of V_13.0 — this call still 404s. Kept
// as-is rather than removed, per explicit product decision, until the
// backend actually models this.
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
