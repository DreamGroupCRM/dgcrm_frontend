// V_26.0 — Payment Reminders (/api/reminders, admin/superadmin only).
import axiosInstance from './axiosConfig';

export interface ReminderRules {
  before_days: number;
  on_due: boolean;
  overdue_after: number;
  overdue_repeat: number;
}

export interface ReminderSettings {
  email: { on: boolean; configured: boolean };
  whatsapp: { on: boolean; configured: boolean; provider: string; missing: string[] };
  rules: ReminderRules;
  receipt_emails_on: boolean;
  last_run: string | null;
  send_hour: number;
}

export type ReminderChannel = 'email' | 'whatsapp';

export interface PlannedReminder {
  customer_id: number;
  customer_code: string;
  customer_name: string;
  unit: string;
  channel: ReminderChannel;
  recipient: string | null;
  outcome: 'send' | 'skipped' | 'upcoming';
  note: string | null;
  items: { kind: 'before' | 'due' | 'overdue'; label: string; when: string; amount: number }[];
}

export interface ReminderLogRow {
  id: number; customer_id: number; customer_code: string | null; customer_name: string; channel: ReminderChannel;
  kind: 'before' | 'due' | 'overdue'; payment_for: string; due_date: string; amount: number; recipient: string | null;
  status: 'sent' | 'failed' | 'skipped' | 'upcoming'; detail: string | null; sent_at: string;
}

export interface RunSummary { sent: number; failed: number; skipped: number; upcoming: number; customers: number }

export const fetchReminderSettings = async (): Promise<ReminderSettings> =>
  (await axiosInstance.get('/reminders/settings')).data.data;

export const saveReminderSettings = async (input: { email_on?: boolean; whatsapp_on?: boolean; rules?: ReminderRules }): Promise<ReminderSettings> =>
  (await axiosInstance.put('/reminders/settings', input)).data.data;

export const fetchReminderPreview = async (): Promise<PlannedReminder[]> =>
  (await axiosInstance.get('/reminders/preview')).data.data;

export const runRemindersNow = async (): Promise<RunSummary> =>
  (await axiosInstance.post('/reminders/run')).data.data;

export const fetchReminderLog = async (limit = 50): Promise<ReminderLogRow[]> =>
  (await axiosInstance.get('/reminders/log', { params: { limit } })).data.data;
