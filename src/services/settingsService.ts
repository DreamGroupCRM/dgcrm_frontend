// src/services/settingsService.ts
// V_26.0 — Admin settings (/api/settings, admin/superadmin only).
import axiosInstance from './axiosConfig';

/** GET /api/settings/receipt-emails — the "Send receipt emails" switch. */
export const fetchReceiptEmailsOn = async (): Promise<boolean> => {
  const { data } = await axiosInstance.get('/settings/receipt-emails');
  return Boolean(data.on);
};

/** PUT /api/settings/receipt-emails */
export const saveReceiptEmailsOn = async (on: boolean): Promise<boolean> => {
  const { data } = await axiosInstance.put('/settings/receipt-emails', { on });
  return Boolean(data.on);
};

/**
 * V_29.0 — GET /api/settings/receipts-start: the "Receipts start from"
 * date (YYYY-MM-DD) or null. A payment whose Received Date is before it is
 * approved without a receipt (old records already given a manual receipt).
 */
export const fetchReceiptsStart = async (): Promise<string | null> => {
  const { data } = await axiosInstance.get('/settings/receipts-start');
  return data.date ?? null;
};

/** PUT /api/settings/receipts-start — null clears it (every payment gets a receipt). */
export const saveReceiptsStart = async (date: string | null): Promise<string | null> => {
  const { data } = await axiosInstance.put('/settings/receipts-start', { date });
  return data.date ?? null;
};
