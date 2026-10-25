// src/services/dashboardService.ts
// ==========================================
// DREAM GROUP CRM - ADMIN DASHBOARD SERVICE
// ==========================================
// Talks to GET /api/dashboard/stats (dashboard.service.ts in dgcrm_backend)
// — the plain, no-filter Admin Dashboard summary. Distinct from
// executiveDashboardService.ts (GET /api/dashboard/executive), the
// filterable Reports page — this one backs the simple landing Dashboard.
import axiosInstance from './axiosConfig';

export interface DashboardTotals {
  employees: number;
  leads: number;
  hot_leads: number;
  today_calls: number;
  customers: number;
  payment_due: number;
  payment_received: number;
  attendance_present_today: number;
  attendance_total_active: number;
}

export interface DashboardRecentLead {
  id: string;
  name: string;
  mobile_number: string | null;
  category: string;
  created_at: string;
}

// V_26.0 — Admin Console extras (GET /dashboard/stats).
export interface AdminApprovalQueue { key: string; label: string; count: number; oldest: string | null }
export interface DashboardPerson { id: number; name: string; designation: string | null; level: string | null; photo_url?: string | null }
export interface AdminDashboardExtras {
  month: { received: number; awaiting_approval: number; awaiting_approval_count: number };
  approvals: { total: number; queues: AdminApprovalQueue[] };
  recovery_team: (DashboardPerson & { collected: number })[];
  departments: { name: string; count: number; people: DashboardPerson[] }[];
  hr_requests: { id: number; action: string; requested_at: string; requested_by_name: string | null; employee_name: string | null }[];
}

export interface DashboardSummary extends Partial<AdminDashboardExtras> {
  totals: DashboardTotals & { overdue_customers?: number };
  category_breakdown: { category: string; count: string }[];
  source_breakdown: { source: string; count: string }[];
  monthly_leads: { month: string; count: string }[];
  recent_leads: DashboardRecentLead[];
}

/** GET /api/dashboard/stats */
export const fetchDashboardSummary = async (): Promise<DashboardSummary> => {
  const res = await axiosInstance.get('/dashboard/stats');
  return res.data.data;
};

// ── Employee Dashboard — scoped to the caller's own employee record ─────
// V_26.0 — My Workspace (GET /dashboard/employee-stats).
export interface WorkspaceExtras {
  workspace: {
    name: string; employee_code: string | null; photo_url: string | null; is_head: boolean; team_size: number; areas: string[];
    departments: { name: string; designation: string | null; level: 'head' | 'executive' | null; reports_to: string | null }[];
  };
  figures: {
    customers: number; leads: number; due_now: number; due_customers: number;
    collected_this_month: number; collected_count: number; awaiting_approval: number; awaiting_approval_count: number;
  };
  open_tasks: { id: number; title: string; status: string; due_date: string | null }[];
  /** V_26.0 — Refund only: cancelled bookings assigned for refund. */
  refund?: { cases: number; paid: number; refunded: number; balance: number; pending: number } | null;
  open_tasks_count: number;
  followups: { id: number; title: string; due_date: string | null; customer_name: string; customer_code: string | null }[];
  requests: { id: string; module: string; action: string; status: string; requested_at: string; name: string | null }[];
  requests_pending: number;
  leave_this_month: number;
  team: { id: number; name: string; photo_url: string | null; designation: string | null; customers: number; collected: number }[];
}

export interface EmployeeDashboardSummary extends Partial<WorkspaceExtras> {
  employee: { id: number; name: string };
  my_leads: number;
  my_customers: number;
  payments_due: number;
  payments_due_customer_count: number;
  attendance: { present_days: number; marked_days: number; percent: number | null };
}

/** GET /api/dashboard/employee-stats */
export const fetchEmployeeDashboardSummary = async (): Promise<EmployeeDashboardSummary> => {
  const res = await axiosInstance.get('/dashboard/employee-stats');
  return res.data.data;
};
