// src/services/changeRequestsService.ts
// ==========================================
// DGCRM — CREATE/EDIT CHANGE REQUESTS SERVICE
// ==========================================
// Talks to /api/change-requests/* (see modules/changeRequests/ in
// dgcrm_backend). Counterpart to pendingApprovalsService.ts's delete-only
// queue: this one holds proposed Create/Edit changes that are never
// applied to the real table until an admin approves them. Admin/
// superadmin only, enforced server-side.
import axiosInstance from './axiosConfig';
import { notifyPendingApprovalsChanged } from './pendingApprovalsService';

export type ChangeRequestModule = 'lead' | 'customer' | 'employee' | 'payment';

export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ChangeRequestRow {
  id: string;
  module: ChangeRequestModule;
  // V_26.0 — 'reassign': a Head's customer assignment change.
  action: 'create' | 'edit' | 'cancel_booking' | 'delete' | 'reassign';
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown>;
  reason: string | null;
  status: ChangeRequestStatus;
  requested_by: string | null;
  requested_by_name: string | null;
  requested_by_email: string | null;
  // V_25.0 — the requester's employee code, departments, designations.
  requested_by_code?: string | null;
  requested_by_departments?: string | null;
  requested_by_designations?: string | null;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  admin_remarks: string | null;
  /** V_26.0 — Admin's corrections before approving (laid over new_values). */
  admin_values?: Record<string, unknown> | null;
  // V_26.0 — which customer / unit a customer or payment request is about.
  record_customer_name?: string | null;
  record_customer_code?: string | null;
  record_unit?: string | null;
}

/** V_26.0 — what an Admin may correct on a customer request before approving
 * (same list the server enforces in changeRequests.service.ts). */
export const ADMIN_EDITABLE_CUSTOMER_FIELDS = [
  'name', 'middle_name', 'last_name', 'email', 'address', 'date_of_birth', 'business_profile_name',
  'mobile_country_code', 'mobile_number', 'mobile_is_whatsapp', 'whatsapp_country_code', 'whatsapp_number',
  'alternate_number', 'alternate_contact_name', 'alternate_contact_country_code', 'alternate_contact_mobile',
  'aadhar_card_no', 'pan_card_no', 'has_parking', 'parking_no',
] as const;
// V_26.0 — an employee add / edit request: contact and identity only.
export const ADMIN_EDITABLE_EMPLOYEE_FIELDS = [
  'first_name', 'middle_name', 'last_name', 'email', 'gender', 'date_of_birth', 'joining_date', 'residential_address',
  'mobile_country_code', 'mobile_number', 'mobile_is_whatsapp', 'whatsapp_country_code', 'whatsapp_number',
  'alternate_country_code', 'alternate_number', 'aadhaar_card_number', 'pan_card_number',
] as const;
/** Upload field → the key the request stores it under. */
export const EMPLOYEE_DOC_FIELDS: Record<string, string> = { photo: 'photo_url', aadhaar_card_img: 'aadhaar_card_img', pan_card_img: 'pan_card_img' };
export const ADMIN_BOOLEAN_FIELDS = ['mobile_is_whatsapp', 'has_parking'];
export const CUSTOMER_DOC_FIELDS = ['customer_image', 'application_form', 'declaration_form', 'aadhar_card', 'pan_card', 'allotment_letter'] as const;

/** PUT /api/change-requests/:id/admin-edit (multipart) — Admin's corrections. */
export const adminEditChangeRequest = async (
  id: string, fields: Record<string, string>, files: Partial<Record<string, File>>,
): Promise<Record<string, unknown>> => {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  Object.entries(files).forEach(([k, f]) => { if (f) form.append(k, f); });
  const res = await axiosInstance.put(`/change-requests/${id}/admin-edit`, form);
  return res.data.admin_values ?? {};
};

/** GET /api/change-requests/:module?status= */
export const fetchChangeRequests = async (module: ChangeRequestModule, status?: ChangeRequestStatus): Promise<ChangeRequestRow[]> => {
  const res = await axiosInstance.get(`/change-requests/${module}`, { params: status ? { status } : undefined });
  return res.data.rows;
};

/** V_29.0 — Paid / Refunded / Balance of a booking whose Cancel Booking request
 * the caller sent and the Admin approved. Read-only. */
export interface CancellationRefund { total_paid: number; total_refunded: number; pending_refund: number; balance: number }
export const fetchMyCancellationRefund = async (requestId: number | string): Promise<CancellationRefund> => {
  const res = await axiosInstance.get(`/change-requests/mine/${requestId}/refund-summary`);
  return res.data.data;
};

/** V_26.0 — GET /api/change-requests/mine: the logged-in user's own requests. */
export const fetchMyChangeRequests = async (filters: { module?: ChangeRequestModule; action?: ChangeRequestRow['action']; status?: ChangeRequestStatus } = {}): Promise<ChangeRequestRow[]> => {
  const res = await axiosInstance.get('/change-requests/mine', { params: filters });
  return res.data.rows ?? [];
};

/** PUT /api/change-requests/:id/approve — applies the proposed change */
export const approveChangeRequest = async (id: string): Promise<void> => {
  await axiosInstance.put(`/change-requests/${id}/approve`);
  notifyPendingApprovalsChanged();
};

/** PUT /api/change-requests/:id/reject — discards the proposed change */
export const rejectChangeRequest = async (id: string, remarks?: string): Promise<void> => {
  await axiosInstance.put(`/change-requests/${id}/reject`, remarks ? { remarks } : undefined);
  notifyPendingApprovalsChanged();
};

/** V_26.0 — GET /change-requests/:id/record: the request as a filled-in record (Admin's review form). */
export interface RequestRecord { request: ChangeRequestRow; record: Record<string, unknown>; changed: string[] }
// V_29.0 — only a request still waiting can be reviewed: an approved or
// rejected one never opens with Approve / Reject again (the server also
// refuses a second decision).
export const fetchRequestRecord = async (id: string): Promise<RequestRecord> => {
  const data: RequestRecord = (await axiosInstance.get(`/change-requests/${id}/record`)).data.data;
  if (data.request.status !== 'pending') {
    throw new Error(`This request was already ${data.request.status === 'approved' ? 'approved' : 'rejected'}${data.request.reviewed_by_name ? ` by ${data.request.reviewed_by_name}` : ''}.`);
  }
  return data;
};
