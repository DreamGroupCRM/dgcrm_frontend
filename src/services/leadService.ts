// src/services/leadService.ts
// ==========================================
// DREAM GROUP CRM — LEAD SERVICE
// ==========================================
// Talks to the backend's real `/leads` module (leads.controller.ts) —
// unlike customerDetailsService.ts, no field-renaming translation layer is
// needed here: the backend's Lead entity already uses the same field names
// this app's Lead type does, so this file is a thin, direct pass-through.

import axiosInstance from './axiosConfig';
import {
  Lead,
  LeadListFilters,
  LeadListResponse,
  LeadSingleResponse,
  LeadStatusCountsResponse,
  LeadActivitiesResponse,
  LeadActivity,
  CreateLeadPayload,
  UpdateLeadPayload,
  LeadImportResult,
} from '../types/index';

// ── Fetch list of leads (with optional filters) ─────────────────────────
// employee_id is honored only for admin/superadmin callers — the backend
// force-scopes anyone else to their own assigned leads regardless of what
// is passed here (see leads.service.ts's resolveEmployeeScope).
/** GET /api/leads?page=1&limit=20&... */
export const fetchLeadList = async (
  page: number,
  limit: number,
  filters?: LeadListFilters
): Promise<LeadListResponse> => {
  const params: Record<string, string | number | boolean> = { page, limit };
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) params[key] = value as string | number | boolean;
    });
  }
  const res = await axiosInstance.get('/leads', { params });
  return res.data as LeadListResponse;
};

// ── Pipeline tab counts for the status-chip filter bar ──────────────────
/** GET /api/leads/status-counts */
export const fetchLeadStatusCounts = async (): Promise<LeadStatusCountsResponse> => {
  const res = await axiosInstance.get('/leads/status-counts');
  return res.data as LeadStatusCountsResponse;
};

// ── Fetch single lead by ID ──────────────────────────────────────────────
/** GET /api/leads/:id */
export const fetchLeadById = async (id: string): Promise<LeadSingleResponse> => {
  const res = await axiosInstance.get(`/leads/${id}`);
  return res.data as LeadSingleResponse;
};

// Every field on CreateLeadSchema/UpdateLeadSchema besides `name` is
// `.optional().nullable()`, but several use z.coerce.date() or
// optionalId (z.coerce.number().int().positive()) — both reject an empty
// string ("" -> Invalid Date, or Number("") -> 0, which fails .positive()).
// An untouched <input type="date">/<select> in this form holds "" by
// default, not null, so every empty string is normalized to null here
// rather than only the date/id fields, since null is always valid wherever
// "" would otherwise 400.
function sanitizeLeadPayload<T extends Partial<CreateLeadPayload>>(payload: T): T {
  const out = { ...payload };
  for (const key of Object.keys(out) as (keyof T)[]) {
    if (key !== 'name' && out[key] === '') (out as Record<string, unknown>)[key as string] = null;
  }
  return out;
}

// ── Create new lead ──────────────────────────────────────────────────────
/** POST /api/leads */
export const createLead = async (payload: CreateLeadPayload): Promise<LeadSingleResponse> => {
  const res = await axiosInstance.post('/leads', sanitizeLeadPayload(payload));
  return res.data as LeadSingleResponse;
};

// ── Update existing lead (also used for a pure status change) ───────────
/** PUT /api/leads/:id */
export const updateLead = async (id: string, payload: UpdateLeadPayload): Promise<LeadSingleResponse> => {
  const res = await axiosInstance.put(`/leads/${id}`, sanitizeLeadPayload(payload));
  return res.data as LeadSingleResponse;
};

// ── Delete lead ───────────────────────────────────────────────────────────
/** DELETE /api/leads/:id — 409s with a clear message if the lead has activity/assignment history */
export const deleteLead = async (id: string): Promise<{ success: boolean; message: string }> => {
  const res = await axiosInstance.delete(`/leads/${id}`);
  return res.data;
};

// ── Assign one or more employees to a lead (fully replaces the assignment set) ──
/** POST /api/leads/:id/assign */
export const assignLead = async (id: string, employeeIds: (string | number)[]): Promise<{ success: boolean; message: string }> => {
  const res = await axiosInstance.post(`/leads/${id}/assign`, { employee_ids: employeeIds.map(Number) });
  return res.data;
};

// ── Activity / comment timeline ──────────────────────────────────────────
/** GET /api/leads/:id/activities */
export const fetchLeadActivities = async (id: string): Promise<LeadActivity[]> => {
  const res = await axiosInstance.get<LeadActivitiesResponse>(`/leads/${id}/activities`);
  return res.data.data ?? [];
};

// action defaults to 'comment' — the common case from the UI (adding a note
// or replying to one). Status changes are logged automatically by the
// backend when updateLead's payload includes a status field, not through
// this endpoint.
/** POST /api/leads/:id/activity */
export const addLeadComment = async (id: string, remark: string, parentId?: string | null): Promise<LeadActivity> => {
  // parent_id is a number on the backend schema (z.number()) — LeadActivity.id
  // is typed as string throughout this app's frontend, so it must be
  // converted here rather than forwarded as-is.
  const res = await axiosInstance.post(`/leads/${id}/activity`, { action: 'comment', remark, parent_id: parentId ? Number(parentId) : null });
  return res.data.data as LeadActivity;
};

// ── CSV export / import ──────────────────────────────────────────────────
/** GET /api/leads/export — triggers a browser download */
export const exportLeadsCSV = async (): Promise<void> => {
  const res = await axiosInstance.get('/leads/export', { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/** POST /api/leads/import (multipart/form-data) */
export const importLeadsCSV = async (file: File): Promise<LeadImportResult> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axiosInstance.post('/leads/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as LeadImportResult;
};

// Grouped export — same convenience pattern as customerDetailsService / buildingService
export const leadService = {
  getAll: fetchLeadList,
  getStatusCounts: fetchLeadStatusCounts,
  getById: fetchLeadById,
  create: createLead,
  update: updateLead,
  remove: deleteLead,
  assign: assignLead,
  activities: fetchLeadActivities,
  addComment: addLeadComment,
  exportCsv: exportLeadsCSV,
  importCsv: importLeadsCSV,
};

export type { Lead };
