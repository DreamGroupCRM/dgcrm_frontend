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

export const LEAVE_TYPES = ['casual', 'sick', 'earned', 'unpaid', 'half_day', 'work_from_home'] as const;
export type LeaveType = typeof LEAVE_TYPES[number];
export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  casual: 'Casual', sick: 'Sick', earned: 'Earned', unpaid: 'Unpaid', half_day: 'Half Day', work_from_home: 'Work From Home',
};
// The general multi-day Leave request form (LeavePage.tsx) offers only
// these — half_day and work_from_home have their own dedicated, single-day
// quick actions on the Attendance page (with the session selector half_day
// actually needs), so they're deliberately left out of this dropdown to
// avoid a "half day" request with no way to say which half.
export const GENERAL_LEAVE_TYPES = ['casual', 'sick', 'earned', 'unpaid'] as const;

export type LeaveSession = 'full' | 'am' | 'pm';
export const LEAVE_SESSION_LABEL: Record<LeaveSession, string> = { full: 'Full Day', am: 'Morning (AM)', pm: 'Afternoon (PM)' };

export interface LeaveRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  from_date: string;
  to_date: string;
  leave_type: string;
  session: LeaveSession;
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
  from?: string; // yyyy-mm-dd
  to?: string; // yyyy-mm-dd
}

/** GET /api/leaves?status=&employee_id=&from=&to= */
export const fetchLeaves = async (filters?: LeaveFilters): Promise<LeaveRecord[]> => {
  const params: Record<string, string | number> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.employee_id) params.employee_id = filters.employee_id;
  if (filters?.from && filters?.to) { params.from = filters.from; params.to = filters.to; }
  const res = await axiosInstance.get('/leaves', { params });
  return res.data.data as LeaveRecord[];
};

export interface SubmitLeavePayload {
  // employee_id is intentionally NOT part of this payload — the backend
  // always resolves the caller's own employee record server-side from
  // their JWT (see leaves.routes.ts), so there is no legitimate case for
  // submitting a leave request "as" a different employee_id here.
  from_date: string; // yyyy-mm-dd
  to_date: string; // yyyy-mm-dd
  leave_type: string;
  session?: LeaveSession; // only meaningful when leave_type === 'half_day'
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
