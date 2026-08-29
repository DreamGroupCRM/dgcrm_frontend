// src/services/intelligenceService.ts
// ==========================================
// DGCRM AI INTELLIGENCE SERVICE
// ==========================================
// Talks to GET /api/intelligence/* (see src/modules/intelligence/ in
// dgcrm_backend). Every number/recommendation is computed server-side by
// deterministic rules over existing CRM data — no AI/LLM anywhere in the
// stack, see that module's own file headers for the scoring design.
import axiosInstance from './axiosConfig';

export interface MostRequestedType { value: string; count: number }
export interface TopEmployeeByFollowUp { name: string; activity_count: number }

export interface SalesInsights {
  hot_leads: number;
  overdue_follow_ups: number;
  ready_for_site_visit: number;
  becoming_inactive: number;
  most_requested_type: MostRequestedType | null;
  top_employee_by_follow_up: TopEmployeeByFollowUp | null;
  conversion_rate_percent: number | null;
  conversion_rate_is_estimate: boolean;
  total_leads: number;
}

/** GET /api/intelligence/dashboard/insights */
export const fetchSalesInsights = async (): Promise<SalesInsights> => {
  const res = await axiosInstance.get('/intelligence/dashboard/insights');
  return res.data.data;
};

export interface DetectedPattern {
  title: string;
  detail: string;
  recommendation: string;
  severity: 'info' | 'warning';
}

/** GET /api/intelligence/dashboard/patterns */
export const fetchPatterns = async (): Promise<DetectedPattern[]> => {
  const res = await axiosInstance.get('/intelligence/dashboard/patterns');
  return res.data.data;
};

export interface PriorityQueueItem {
  lead_id: number;
  name: string;
  mobile_number: string | null;
  score: number;
  temperature: 'HOT' | 'WARM' | 'COLD';
  assigned_to: string | null;
  action: string;
  reason: string;
  is_overdue: boolean;
}

/** GET /api/intelligence/dashboard/priority-queue */
export const fetchPriorityQueue = async (limit = 10): Promise<PriorityQueueItem[]> => {
  const res = await axiosInstance.get('/intelligence/dashboard/priority-queue', { params: { limit } });
  return res.data.data;
};

export interface LeadIntelligence {
  lead_id: number;
  score: number;
  temperature: 'HOT' | 'WARM' | 'COLD';
  reasons: string[];
  action: string;
  reason: string;
}

/** GET /api/intelligence/leads/:id */
export const fetchLeadIntelligence = async (leadId: string | number): Promise<LeadIntelligence> => {
  const res = await axiosInstance.get(`/intelligence/leads/${leadId}`);
  return res.data.data;
};

export interface CustomerIntelligence {
  customer_id: number;
  engagement: 'HIGH' | 'MEDIUM' | 'LOW';
  engagement_reason: string;
  risk: 'HIGH' | 'MEDIUM' | 'LOW';
  risk_reason: string;
  amount_due: number;
  days_since_last_payment: number | null;
  payments_last_90_days: number;
  is_assigned: boolean;
  recommended_action: string;
  recommended_action_reason: string;
}

/** GET /api/intelligence/customers/:id */
export const fetchCustomerIntelligence = async (customerId: string | number): Promise<CustomerIntelligence> => {
  const res = await axiosInstance.get(`/intelligence/customers/${customerId}`);
  return res.data.data;
};
