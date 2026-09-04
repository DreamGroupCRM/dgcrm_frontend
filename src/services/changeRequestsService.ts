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

export type ChangeRequestModule = 'lead' | 'customer';

export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ChangeRequestRow {
  id: string;
  module: ChangeRequestModule;
  action: 'create' | 'edit';
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown>;
  reason: string | null;
  status: ChangeRequestStatus;
  requested_by: string | null;
  requested_by_name: string | null;
  requested_by_email: string | null;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  admin_remarks: string | null;
}

/** GET /api/change-requests/:module?status= */
export const fetchChangeRequests = async (module: ChangeRequestModule, status?: ChangeRequestStatus): Promise<ChangeRequestRow[]> => {
  const res = await axiosInstance.get(`/change-requests/${module}`, { params: status ? { status } : undefined });
  return res.data.rows;
};

/** PUT /api/change-requests/:id/approve — applies the proposed change */
export const approveChangeRequest = async (id: string): Promise<void> => {
  await axiosInstance.put(`/change-requests/${id}/approve`);
};

/** PUT /api/change-requests/:id/reject — discards the proposed change */
export const rejectChangeRequest = async (id: string, remarks?: string): Promise<void> => {
  await axiosInstance.put(`/change-requests/${id}/reject`, remarks ? { remarks } : undefined);
};
