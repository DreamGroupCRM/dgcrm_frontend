// src/services/accessService.ts
// ==========================================
// DGCRM — DEPARTMENT / DESIGNATION / REPORTING HEAD ACCESS (V_25.0)
// ==========================================
// Talks to /api/access/* (dgcrm_backend modules/access). An employee's
// pages and data follow their Department + Designation + Reporting Head;
// a Super Admin sets departments up on the "Department Setup" screen.
import axiosInstance from './axiosConfig';

export const ACCESS_AREAS = [
  'leads', 'customers', 'payment_dues', 'payment_received', 'cancelled_booking',
  'customize_scheme', 'building_view', 'employee_details', 'attendance_all',
] as const;
export type AccessArea = (typeof ACCESS_AREAS)[number];

// Labels shown on the Department Setup screen (what the employee will see).
export const ACCESS_AREA_LABELS: Record<AccessArea, string> = {
  leads: 'Leads',
  customers: 'Customer Details',
  payment_dues: 'Payment Dues',
  payment_received: 'Payment Received',
  cancelled_booking: 'Cancelled Booking (all cancellations)',
  customize_scheme: 'Customize Scheme',
  building_view: 'Building View',
  employee_details: 'Employee Details (add/edit via Admin approval)',
  attendance_all: "All employees' Attendance & Leave (view)",
};

export type DesignationLevel = 'head' | 'executive' | null;

export interface TeamMember { id: number; name: string; employee_code: string | null }

export interface AccessDepartment {
  department_id: number;
  department_name: string;
  areas: AccessArea[] | null;
  designation_id: number | null;
  designation_name: string | null;
  level: DesignationLevel;
  reporting_head_id: number | null;
}

export interface AccessProfile {
  full: boolean;
  legacy: boolean;
  employee_id: number | null;
  areas: AccessArea[];
  departments: AccessDepartment[];
  head_of: number[];
  can_add_customer: boolean;
  customer_team: TeamMember[];
  lead_team: TeamMember[];
}

export interface ConfigDesignation { id: number; name: string; level: DesignationLevel; is_active: boolean }
export interface ConfigDepartment {
  id: number;
  name: string;
  /** null = not set up yet: employees keep the access they had before. */
  access_areas: AccessArea[] | null;
  designation_required: boolean;
  designations: ConfigDesignation[];
}

export async function fetchMyAccess(): Promise<AccessProfile> {
  const res = await axiosInstance.get('/access/me');
  return res.data.data;
}

export async function fetchDepartmentHeads(departmentId: number): Promise<TeamMember[]> {
  const res = await axiosInstance.get('/access/heads', { params: { department_id: departmentId } });
  return res.data.data;
}

export async function fetchAccessConfig(): Promise<ConfigDepartment[]> {
  const res = await axiosInstance.get('/access/config');
  return res.data.data.departments;
}

export async function saveDepartmentSetup(id: number, body: { access_areas: AccessArea[] | null; designation_required: boolean }): Promise<void> {
  await axiosInstance.put(`/access/config/department/${id}`, body);
}

export async function saveDesignationLevel(id: number, level: DesignationLevel): Promise<void> {
  await axiosInstance.put(`/access/config/designation/${id}`, { level });
}
