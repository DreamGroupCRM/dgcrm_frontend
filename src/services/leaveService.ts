// src/services/leaveService.ts
// ==========================================
// DGCRM — LEAVE SERVICE
// ==========================================
// Talks to the backend's real `/leaves` module (leaves.routes.ts). No
// fixed leave_type enum server-side (plain VARCHAR, default 'casual') —
// LEAVE_TYPES below is a curated option list for the form, not a
// server-enforced set; any string the backend accepts still works.
import axiosInstance from './axiosConfig';

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export const LEAVE_TYPES = ['casual', 'sick', 'earned', 'unpaid'] as const;
export type LeaveType = typeof LEAVE_TYPES[number];
export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  casual: 'Casual', sick: 'Sick', earned: 'Earned', unpaid: 'Unpaid',
};

export interface LeaveRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  from_date: string;
  to_date: string;
  leave_type: string;
  reason: string | null;
  status: LeaveStatus;
  approved_at: string | null;
  is_active: boolean;
  is_delete: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaveFilters {
  status?: LeaveStatus;
  employee_id?: string | number;
}

/** GET /api/leaves?status=&employee_id= */
export const fetchLeaves = async (filters?: LeaveFilters): Promise<LeaveRecord[]> => {
  const params: Record<string, string | number> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.employee_id) params.employee_id = filters.employee_id;
  const res = await axiosInstance.get('/leaves', { params });
  return res.data.data as LeaveRecord[];
};

export interface SubmitLeavePayload {
  employee_id: number;
  from_date: string; // yyyy-mm-dd
  to_date: string; // yyyy-mm-dd
  leave_type: string;
  reason?: string | null;
}

/** POST /api/leaves */
export const submitLeaveRequest = async (payload: SubmitLeavePayload): Promise<LeaveRecord> => {
  const res = await axiosInstance.post('/leaves', payload);
  return res.data.data as LeaveRecord;
};

/** PUT /api/leaves/:id/approve — body { status: 'approved' | 'rejected' } despite the URL name, both outcomes go through this route */
export const reviewLeaveRequest = async (id: string | number, status: 'approved' | 'rejected'): Promise<void> => {
  await axiosInstance.put(`/leaves/${id}/approve`, { status });
};
