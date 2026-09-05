// src/services/attendanceService.ts
// ==========================================
// DGCRM — ATTENDANCE SERVICE
// ==========================================
// Talks to the backend's real `/attendance` module (attendance.routes.ts).
// Status values match AttendanceInput's documented enum in swagger.ts —
// not invented here.
import axiosInstance from './axiosConfig';

export type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'leave';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  attendance_date: string;
  status: AttendanceStatus;
  check_in_time: string | null;
  check_out_time: string | null;
  remarks: string | null;
  latitude: number | null;
  longitude: number | null;
  location_address: string | null;
  is_active: boolean;
  is_delete: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttendanceFilters {
  employee_id?: string | number;
  month?: number; // 1-12
  year?: number;
  from?: string; // yyyy-mm-dd — takes precedence over month/year when both are set
  to?: string; // yyyy-mm-dd
}

/** GET /api/attendance?employee_id=&month=&year=&from=&to= */
export const fetchAttendance = async (filters?: AttendanceFilters): Promise<AttendanceRecord[]> => {
  const params: Record<string, string | number> = {};
  if (filters?.employee_id) params.employee_id = filters.employee_id;
  if (filters?.from && filters?.to) { params.from = filters.from; params.to = filters.to; }
  else if (filters?.month) { params.month = filters.month; if (filters.year) params.year = filters.year; }
  const res = await axiosInstance.get('/attendance', { params });
  return res.data.data as AttendanceRecord[];
};

export interface MarkAttendancePayload {
  employee_id: number;
  attendance_date: string; // yyyy-mm-dd
  status: AttendanceStatus;
  check_in_time?: string | null;
  check_out_time?: string | null;
  remarks?: string | null;
}

/** POST /api/attendance — admin-only manual correction, upserts on (employee_id, attendance_date) */
export const markAttendance = async (payload: MarkAttendancePayload): Promise<AttendanceRecord> => {
  const res = await axiosInstance.post('/attendance', payload);
  return res.data.data as AttendanceRecord;
};

export interface PunchPayload {
  type: 'check_in' | 'check_out';
  latitude?: number | null;
  longitude?: number | null;
  location_address?: string | null;
}

/** POST /api/attendance/punch — employee self-service Fingerprint/Mark
 * Attendance action. employee_id is always resolved server-side from the
 * caller's own login, never sent from here. Real duplicate-punch
 * rejection: a second check_in, a check_out with no prior check_in, or a
 * second check_out all reject with a 409 rather than silently overwriting. */
export const punchAttendance = async (payload: PunchPayload): Promise<AttendanceRecord> => {
  const res = await axiosInstance.post('/attendance/punch', payload);
  return res.data.data as AttendanceRecord;
};
