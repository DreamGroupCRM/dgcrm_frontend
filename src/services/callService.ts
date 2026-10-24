// src/services/callService.ts
// V_27.0 — calls synced from employee phones by the DGCRM Calls app
// (backend modules/callSync). Read-only here: calls are written only by
// the phone app.
import axiosInstance from './axiosConfig';
import { getFileToken } from './fileAccessService';

export type CallDirection = 'incoming' | 'outgoing' | 'missed' | 'rejected' | 'other';
export type RecordingStatus = 'none' | 'pending' | 'recording' | 'completed' | 'failed' | 'unsupported' | 'deleted';
export type CallOutcome = 'interested' | 'not_interested' | 'call_later' | 'wrong_number';

export interface CallLog {
  id: string;
  direction: CallDirection;
  country_code: string | null;
  phone_number: string | null;
  contact_name: string | null;
  started_at: string;
  duration_sec: number;
  lead_id: string | null;
  customer_id: string | null;
  lead_created: boolean;
  outcome: CallOutcome | null;
  recording_status: RecordingStatus;
  recording_duration_ms: number | null;
  employee_id: string;
  employee_name: string | null;
  device_label: string | null;
  /** V_28.0 — note the employee typed or spoke on the phone after the call. */
  note: string | null;
  note_at: string | null;
}

export type CallDeviceStatus = 'pending' | 'approved' | 'blocked';

export interface CallDevice {
  id: string;
  label: string | null;
  app_version: string | null;
  status: CallDeviceStatus;
  last_seen_at: string | null;
  created_at: string;
  approved_at: string | null;
  revoked_at: string | null;
  call_count: number;
  /** V_28.0 — set only while the phone is in personal mode (sync paused). */
  paused_at: string | null;
  paused_until: string | null;
}

export interface CallWorkHours {
  enabled: boolean;
  /** 0 = Sunday … 6 = Saturday. */
  days: number[];
  start: string;
  end: string;
}

export interface CallSyncSettings {
  pin_set: boolean;
  archive_after_months: number;
  delete_after_years: number;
  recording_days: number;
  work_hours: CallWorkHours;
}

/** GET /api/leads/:id/calls */
export const fetchLeadCalls = async (leadId: string): Promise<CallLog[]> =>
  (await axiosInstance.get<{ data: CallLog[] }>(`/leads/${leadId}/calls`)).data.data ?? [];

/** GET /api/customers/:id/calls */
export const fetchCustomerCalls = async (customerId: string): Promise<CallLog[]> =>
  (await axiosInstance.get<{ data: CallLog[] }>(`/customers/${customerId}/calls`)).data.data ?? [];

/** GET /api/call-sync/devices — Admin only. */
export const fetchCallDevices = async (): Promise<CallDevice[]> =>
  (await axiosInstance.get<{ data: CallDevice[] }>('/call-sync/devices')).data.data ?? [];

/** POST /api/call-sync/devices/:id/approve — Admin only. */
export const approveCallDevice = async (id: string): Promise<void> => {
  await axiosInstance.post(`/call-sync/devices/${id}/approve`);
};

/** POST /api/call-sync/devices/:id/block — Admin only. Stops the phone at once. */
export const blockCallDevice = async (id: string): Promise<void> => {
  await axiosInstance.post(`/call-sync/devices/${id}/block`);
};

/** GET /api/call-sync/settings — Admin only. */
export const fetchCallSyncSettings = async (): Promise<CallSyncSettings> =>
  (await axiosInstance.get<{ data: CallSyncSettings }>('/call-sync/settings')).data.data;

/** PUT /api/call-sync/settings/pin — Admin only. 4–8 digits; stored hashed. */
export const saveCallSyncPin = async (pin: string): Promise<void> => {
  await axiosInstance.put('/call-sync/settings/pin', { pin });
};

/** PUT /api/call-sync/settings/retention — Admin only. */
export const saveCallRetention = async (v: Omit<CallSyncSettings, 'pin_set' | 'work_hours'>): Promise<void> => {
  await axiosInstance.put('/call-sync/settings/retention', v);
};

/** PUT /api/call-sync/settings/work-hours — Admin only. Phones skip calls outside these hours. */
export const saveCallWorkHours = async (v: CallWorkHours): Promise<CallWorkHours> =>
  (await axiosInstance.put<{ data: CallWorkHours }>('/call-sync/settings/work-hours', v)).data.data;

/**
 * URL an <audio> element can play. Like uploaded files, it carries the
 * short-lived file token (an <audio> request cannot send the session
 * header); the backend checks who may play which recording.
 */
export const callRecordingUrl = (callId: string): string => {
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const fk = getFileToken();
  return `${apiBase}/call-sync/recordings/${encodeURIComponent(callId)}${fk ? `?fk=${encodeURIComponent(fk)}` : ''}`;
};

// ── Per-employee call report ────────────────────────────────────────────

export interface CallReportEmployee {
  employee_id: number;
  employee_name: string;
  calls: number;
  incoming: number;
  outgoing: number;
  missed: number;
  talk_sec: number;
  new_leads: number;
  missed_not_called_back: number;
}

export interface CallReportDay {
  employee_id: number;
  employee_name: string;
  day: string;
  calls: number;
  incoming: number;
  outgoing: number;
  missed: number;
  talk_sec: number;
  new_leads: number;
}

export interface CallReport {
  from: string;
  to: string;
  employees: CallReportEmployee[];
  days: CallReportDay[];
}

/** GET /api/call-sync/report — admin: everyone; Sales Head: team; others: own. Max 3 months. */
export const fetchCallReport = async (from: string, to: string): Promise<CallReport> =>
  (await axiosInstance.get<{ data: CallReport }>('/call-sync/report', { params: { from, to } })).data.data;

// ── WhatsApp brochure messages (Admin) ──────────────────────────────────

export interface ProjectWhatsapp {
  id: number;
  project_name: string;
  brochure_url: string | null;
  whatsapp_message: string | null;
}

export interface WhatsappSettings {
  default_message: string | null;
  projects: ProjectWhatsapp[];
}

export const fetchWhatsappSettings = async (): Promise<WhatsappSettings> =>
  (await axiosInstance.get<{ data: WhatsappSettings }>('/call-sync/settings/whatsapp')).data.data;

export const saveWhatsappDefault = async (message: string): Promise<void> => {
  await axiosInstance.put('/call-sync/settings/whatsapp/default', { message });
};

export const saveProjectWhatsapp = async (id: number, brochure_url: string, message: string): Promise<void> => {
  await axiosInstance.put(`/call-sync/settings/whatsapp/projects/${id}`, {
    brochure_url: brochure_url.trim() || null,
    message: message.trim() || null,
  });
};
