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
