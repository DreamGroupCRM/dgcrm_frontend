// src/services/callService.ts
// V_27.0 — calls synced from employee phones by the DGCRM Calls app
// (backend modules/callSync). Read-only here: calls are written only by
// the phone app.
import axiosInstance from './axiosConfig';

export type CallDirection = 'incoming' | 'outgoing' | 'missed' | 'rejected' | 'other';
export type RecordingStatus = 'pending' | 'recording' | 'completed' | 'failed' | 'unsupported';

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
  recording_status: RecordingStatus;
  employee_id: string;
  employee_name: string | null;
  device_label: string | null;
}

export interface CallDevice {
  id: string;
  label: string | null;
  app_version: string | null;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
  revoked_at: string | null;
  employee_id: string | null;
  employee_name: string | null;
  signed_in_at: string | null;
  call_count: number;
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

/** POST /api/call-sync/devices/:id/revoke — Admin only. Blocks the phone at once. */
export const revokeCallDevice = async (id: string): Promise<void> => {
  await axiosInstance.post(`/call-sync/devices/${id}/revoke`);
};
