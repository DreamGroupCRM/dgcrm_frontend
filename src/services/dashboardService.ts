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

export interface DashboardSummary {
  totals: DashboardTotals;
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
export interface EmployeeDashboardSummary {
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
