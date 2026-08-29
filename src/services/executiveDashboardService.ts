// src/services/executiveDashboardService.ts
// ==========================================
// DREAM GROUP CRM - EXECUTIVE DASHBOARD SERVICE
// ==========================================
// Talks to the new GET /api/dashboard/executive endpoint (see
// executiveDashboard.service.ts / .repository.ts in dgcrm_backend). Backend
// is the sole source of every aggregate here — this file only shapes the
// response for the page, it never recomputes anything client-side.
import axiosInstance from './axiosConfig';

export interface DashboardFiltersQuery {
  from?: string;
  to?: string;
  employee_id?: string | number;
  building_id?: string | number;
}

export interface DashboardKpis {
  total_customers: number;
  total_properties: number;
  available_properties: number;
  booked_properties: number;
  total_booking_value: number;
  pending_payments: number;
  active_employees: number;
  pending_or_overdue_activities: number;
}

export interface DashboardKpiDeltas {
  total_booking_value: number | null;
  new_customers: number | null;
  payments_received: number | null;
}

export interface SalesTrendPoint { month: string; booking_count: number; booking_value: number }
export interface PropertyOverviewSlice { status: string; count: number }
export interface MonthlyCustomerPoint { month: string; count: number }
export interface CustomerOverview {
  total_customers: number;
  new_customers_in_period: number;
  active_customers: number;
  monthly_new_customers: MonthlyCustomerPoint[];
}
export interface EmployeePerformanceRow {
  employee_id: number;
  employee_name: string;
  activities_completed: number;
  tasks_pending: number;
  tasks_overdue: number;
  customers_managed: number;
}
export interface PaymentOverview {
  total_received: number;
  pending_approval: number;
  pending_approval_count: number;
  overdue: number;
}
export interface NeedsAttentionOverduePayment { customer_id: number; customer_name: string; amount_due: number }
export interface NeedsAttentionPendingApproval { transaction_id: number; receipt_number: string; customer_id: number; customer_name: string; amount: number }
export interface NeedsAttentionUnassignedCustomer { customer_id: number; customer_name: string }
export interface NeedsAttentionOverdueTask { task_id: number; title: string; due_date: string | null; assigned_to_name: string | null }
export interface NeedsAttention {
  overdue_payments: NeedsAttentionOverduePayment[];
  pending_payment_approvals: NeedsAttentionPendingApproval[];
  unassigned_customers: NeedsAttentionUnassignedCustomer[];
  overdue_tasks: NeedsAttentionOverdueTask[];
}
export interface RecentActivityRow {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  performed_by_name: string | null;
  performed_by_email: string | null;
  created_at: string;
}

export interface ExecutiveDashboardData {
  filters_applied: { from: string; to: string; employee_id: number | null; building_id: number | null };
  kpis: DashboardKpis;
  kpi_deltas: DashboardKpiDeltas;
  sales_trend: SalesTrendPoint[];
  property_overview: PropertyOverviewSlice[];
  customer_overview: CustomerOverview;
  employee_performance: EmployeePerformanceRow[];
  payment_overview: PaymentOverview;
  needs_attention: NeedsAttention;
  recent_activity: RecentActivityRow[];
  unavailable_metrics: string[];
}

/** GET /api/dashboard/executive */
export const fetchExecutiveDashboard = async (filters: DashboardFiltersQuery): Promise<ExecutiveDashboardData> => {
  const params: Record<string, string | number> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.employee_id) params.employee_id = filters.employee_id;
  if (filters.building_id) params.building_id = filters.building_id;
  const res = await axiosInstance.get('/dashboard/executive', { params });
  return res.data.data;
};
