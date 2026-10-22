// ==========================================
// DGCRM — "SEND RECEIPT EMAILS" SWITCH (Admin)
// ==========================================
// V_26.0 — off while old/backdated payments are being entered; once on,
// every payment entered from then on has its receipt emailed to the
// customer when it is approved. Read at entry time: a payment entered
// while it was off is never emailed, even if approved later.
import React, { useEffect, useState } from 'react';
import { MdEmail } from 'react-icons/md';
import { toast } from '@/utils/toast';
import { AppTheme } from '../../styles/theme';
import { showAlert } from '../../utils';
import { fetchReceiptEmailsOn, saveReceiptEmailsOn } from '../../services/settingsService';

export const ReceiptEmailSwitch: React.FC<{ t: AppTheme }> = ({ t }) => {
  const [on, setOn] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchReceiptEmailsOn().then(setOn).catch(() => setOn(null));
  }, []);

  const toggle = async () => {
    if (on == null || saving) return;
    const next = !on;
    const result = await showAlert.confirm(
      next
        ? 'Receipts of payments entered from now on will be emailed to the customer when approved. Payments entered while this was off are never emailed.'
        : 'Payments entered from now on will not have their receipt emailed (use this while entering old / backdated payments).',
      next ? 'Turn On Receipt Emails?' : 'Turn Off Receipt Emails?'
    );
    if (!result.isConfirmed) return;
    setSaving(true);
    try {
      setOn(await saveReceiptEmailsOn(next));
      toast.success(next ? 'Receipt emails turned on.' : 'Receipt emails turned off.');
    } catch {
      toast.error('Could not change the receipt email setting.');
    } finally {
      setSaving(false);
    }
  };

  if (on == null) return null;
  return (
    <button type="button" role="switch" aria-checked={on} onClick={toggle} disabled={saving}
      title={on ? 'Receipt emails are ON for new payments' : 'Receipt emails are OFF for new payments'}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold"
      style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: saving ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: saving ? 0.6 : 1 }}>
      <MdEmail size={16} /> Receipt Emails
      <span aria-hidden className="relative inline-block rounded-full" style={{ width: 32, height: 18, background: on ? '#15803d' : '#94a3b8', transition: 'background 150ms' }}>
        <span className="absolute rounded-full" style={{ top: 2, left: on ? 16 : 2, width: 14, height: 14, background: '#fff', transition: 'left 150ms' }} />
      </span>
    </button>
  );
};
