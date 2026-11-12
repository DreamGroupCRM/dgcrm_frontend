// ==========================================
// DGCRM — "RECEIPTS START FROM" DATE (Admin)
// ==========================================
// V_29.0 — while old payments are being entered (customers already hold a
// manual receipt for them), the Admin sets the date system receipts start
// from. A payment whose Received Date is before it is approved WITHOUT a
// receipt: no receipt number, nothing to view / download, no receipt
// email — the customer still sees it as paid. Cleared = every approved
// payment gets a receipt.
import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { MdReceiptLong } from 'react-icons/md';
import { toast } from '@/utils/toast';
import { AppTheme } from '../../styles/theme';
import { fetchReceiptsStart, saveReceiptsStart } from '../../services/settingsService';

const dmy = (ymd: string): string => ymd.split('-').reverse().join('/');

export const ReceiptsStartControl: React.FC<{ t: AppTheme }> = ({ t }) => {
  const [date, setDate] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchReceiptsStart().then(setDate).catch(() => setDate(undefined));
  }, []);

  const change = async () => {
    if (date === undefined || saving) return;
    const result = await Swal.fire({
      title: 'Receipts start from',
      html: 'Payments with a <b>Received Date before this date</b> are approved without a receipt: no receipt number, no download and no receipt email. The customer still sees them as paid.<br><br>Use it while entering old payments that already have a manual receipt.',
      input: 'date',
      inputValue: date ?? '',
      showCancelButton: true,
      showDenyButton: Boolean(date),
      confirmButtonText: 'Save date',
      denyButtonText: 'Clear (receipt for every payment)',
      cancelButtonText: 'Cancel',
      inputValidator: (v) => (v ? undefined : 'Choose a date, or use Clear.'),
    });
    if (!result.isConfirmed && !result.isDenied) return;
    const next = result.isDenied ? null : String(result.value);
    setSaving(true);
    try {
      setDate(await saveReceiptsStart(next));
      toast.success(next ? `Receipts start from ${dmy(next)}.` : 'Every approved payment now gets a receipt.');
    } catch {
      toast.error('Could not save the receipts start date.');
    } finally {
      setSaving(false);
    }
  };

  if (date === undefined) return null;
  return (
    <button type="button" onClick={change} disabled={saving}
      title={date ? `Payments received before ${dmy(date)} get no receipt` : 'Every approved payment gets a receipt'}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold"
      style={{ background: t.surfaceBg, border: `1px solid ${date ? '#b45309' : t.surfaceBorder}`, color: t.textPrimary, cursor: saving ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: saving ? 0.6 : 1 }}>
      <MdReceiptLong size={16} /> {date ? `Receipts from ${dmy(date)}` : 'Receipts: all payments'}
    </button>
  );
};
