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
  | 'toCollect' | 'toPay' | 'product' | 'gstInvoice' | 'channelPartner' | 'lead';

export interface PendingApprovalRow {
  entity_type: PendingApprovalEntityType;
  id: string;
  label: string | null;
  requested_by: string | null;
  requested_by_name: string | null;
  requested_by_email: string | null;
  requested_at: string | null;
}

/** GET /api/pending-approvals */
export const fetchPendingApprovals = async (): Promise<PendingApprovalRow[]> => {
  const res = await axiosInstance.get('/pending-approvals');
  return res.data.rows;
};

/** PUT /api/pending-approvals/:entityType/:id/approve — permanently deletes the record */
export const approvePendingDelete = async (entityType: PendingApprovalEntityType, id: string): Promise<void> => {
  await axiosInstance.put(`/pending-approvals/${entityType}/${id}/approve`);
};

/** PUT /api/pending-approvals/:entityType/:id/reject — restores the record */
export const rejectPendingDelete = async (entityType: PendingApprovalEntityType, id: string): Promise<void> => {
  await axiosInstance.put(`/pending-approvals/${entityType}/${id}/reject`);
};
