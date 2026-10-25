// src/services/pendingApprovalsService.ts
// ==========================================
// DGCRM — PENDING DELETE APPROVALS SERVICE
// ==========================================
// Talks to /api/pending-approvals/* (see modules/pendingApprovals/ in
// dgcrm_backend). One merged queue across the modules whose delete is
// now request-and-review for non-admins (performaInvoice, channelSalesDar,
// supplier, bookingLetter, toCollect, toPay, product, gstInvoice,
// channelPartner, lead) — admin/superadmin only, enforced server-side.
import axiosInstance from './axiosConfig';

export type PendingApprovalEntityType =
  | 'performaInvoice' | 'channelSalesDar' | 'supplier' | 'bookingLetter'
  | 'toCollect' | 'toPay' | 'product' | 'gstInvoice' | 'channelPartner' | 'lead'
  // V_23.0 — employee deletion now goes through this same review queue:
  // a non-admin's Delete becomes a request, and the employee stays fully
  // active until an admin approves it here.
  | 'employee';

export interface PendingApprovalRow {
  entity_type: PendingApprovalEntityType;
  id: string;
  label: string | null;
  requested_by: string | null;
  requested_by_name: string | null;
  requested_by_email: string | null;
  requested_at: string | null;
}

export interface PendingApprovalCounts {
  deletes: number; changes: number; refunds: number; total: number;
  /** V_26.0 — pending change requests per module, for the page's tabs. */
  changes_by_module: Record<string, number>;
  /** V_26.0 — delete requests per record type (employee, lead, …). */
  deletes_by_type: Record<string, number>;
}

/**
 * V_26.0 — GET /api/pending-approvals/count: everything waiting on an Admin
 * (delete requests + change requests + pending refunds), for the sidebar.
 */
export const fetchPendingApprovalCounts = async (): Promise<PendingApprovalCounts> => {
  const { data } = await axiosInstance.get('/pending-approvals/count');
  return { deletes: data.deletes, changes: data.changes, refunds: data.refunds, total: data.total, changes_by_module: data.changes_by_module ?? {}, deletes_by_type: data.deletes_by_type ?? {} };
};

/** Fired after any approve/reject so the sidebar count refreshes at once. */
export const PENDING_APPROVALS_CHANGED = 'dgcrm_pending_approvals_changed';
export const notifyPendingApprovalsChanged = (): void => {
  window.dispatchEvent(new Event(PENDING_APPROVALS_CHANGED));
};

/** GET /api/pending-approvals */
export const fetchPendingApprovals = async (): Promise<PendingApprovalRow[]> => {
  const res = await axiosInstance.get('/pending-approvals');
  return res.data.rows;
};

/** V_26.0 — GET /api/pending-approvals/:entityType/:id: the record a delete request is for. */
export const fetchPendingDeleteRecord = async (entityType: PendingApprovalEntityType, id: string): Promise<Record<string, unknown>> => {
  const res = await axiosInstance.get(`/pending-approvals/${entityType}/${id}`);
  return res.data.data ?? {};
};

/** PUT /api/pending-approvals/:entityType/:id/approve — permanently deletes the record */
export const approvePendingDelete = async (entityType: PendingApprovalEntityType, id: string): Promise<void> => {
  await axiosInstance.put(`/pending-approvals/${entityType}/${id}/approve`);
  notifyPendingApprovalsChanged();
};

/** PUT /api/pending-approvals/:entityType/:id/reject — restores the record */
export const rejectPendingDelete = async (entityType: PendingApprovalEntityType, id: string): Promise<void> => {
  await axiosInstance.put(`/pending-approvals/${entityType}/${id}/reject`);
  notifyPendingApprovalsChanged();
};
