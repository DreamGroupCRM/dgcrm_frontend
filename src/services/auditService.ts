// src/services/auditService.ts
// ==========================================
// DREAM GROUP CRM - AUDIT HISTORY SERVICE
// ==========================================
// Read-only lookup against the audit_logs table every recordAudit() call
// throughout the backend already writes to (Customer/Department/
// Designation/Company/... create/update/delete) — this is the first
// frontend surface that reads any of it back (item 11: "Deleted-customer
// audit table should be maintained properly", generalized to the whole
// audit trail since the underlying table was never Customer-specific).
import axiosInstance from './axiosConfig';

export type AuditAction = 'create' | 'update' | 'delete' | string;

export interface AuditLogEntry {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: AuditAction;
  performed_by: string | null;
  performed_by_name: string | null;
  performed_by_email: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogFilters {
  entity_type?: string;
  action?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface AuditLogListResponse {
  success: boolean;
  rows: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

/** GET /api/audit-logs?page=&limit=&entity_type=&action=&date_from=&date_to=&search= */
export const fetchAuditLogList = async (
  page: number,
  limit: number,
  filters?: AuditLogFilters
): Promise<AuditLogListResponse> => {
  const params: Record<string, string | number> = { page, limit };
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value && String(value).trim()) params[key] = value;
    });
  }
  const res = await axiosInstance.get('/audit-logs', { params });
  return res.data;
};

/** GET /api/audit-logs/entity-types */
export const fetchAuditEntityTypes = async (): Promise<string[]> => {
  const res = await axiosInstance.get('/audit-logs/entity-types');
  return res.data.rows ?? [];
};
