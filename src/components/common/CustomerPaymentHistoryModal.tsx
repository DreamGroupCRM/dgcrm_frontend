// ==========================================
// DREAM GROUP CRM - CUSTOMER PAYMENT HISTORY POPUP (shared)
// ==========================================
// V_25.0 — one booking's payment history (one customer row = one booking,
// e.g. C005 and C010 of the same person are two separate histories), shown
// with the same PaymentHistoryTable as Customer Details. Opened from Payment
// Due and Payment Received. Read-only: view / download an approved receipt.
// The server checks the caller may see this customer.
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdClose, MdDownload, MdHistory, MdVisibility } from 'react-icons/md';
import { toast } from '@/utils/toast';
import { AppTheme } from '../../styles/theme';
import { fetchCustomerPaymentHistory } from '../../services/customerDetailsService';
import { fetchPaymentReceipt } from '../../services/paymentService';
import { exportPaymentReceiptPdf } from '../../pages/Admin/CRM/Customer-Details/paymentPdfExport.lazy';
import { CustomerPaymentRecord, PaymentReceipt } from '../../types';
import PaymentHistoryTable, { toPaymentHistoryRow } from './PaymentHistoryTable';
import { PaymentReceiptViewModal } from './PaymentReceiptViewModal';

const CustomerPaymentHistoryModal: React.FC<{
  t: AppTheme;
  isDark?: boolean;
  customerId: string | number;
  customerName: string;
  customerCode?: string | null;
  unit?: string | null;
  onClose: () => void;
}> = ({ t, isDark, customerId, customerName, customerCode, unit, onClose }) => {
  const [rows, setRows] = useState<CustomerPaymentRecord[] | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);

  useEffect(() => {
    let stale = false;
    fetchCustomerPaymentHistory(String(customerId))
      .then((res) => { if (!stale) setRows(res.rows); })
      .catch(() => { if (!stale) { setRows([]); toast.error('Failed to load payment history.'); } });
    return () => { stale = true; };
  }, [customerId]);

  const loadReceipt = async (id: string | number): Promise<PaymentReceipt | null> => {
    try { return (await fetchPaymentReceipt(id)).data; } catch (err: any) {
      toast.error(err?.response?.status === 403 ? 'Receipt is not available until this payment is approved.' : 'Failed to load receipt.');
      return null;
    }
  };
  const iconBtn = (color: string, bg: string): React.CSSProperties => ({
    width: 26, height: 26, border: 'none', borderRadius: 8, cursor: 'pointer', color, background: bg,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  });
  const sorted = [...(rows ?? [])].sort((a, b) => String(b.paid_on ?? '').localeCompare(String(a.paid_on ?? '')));
  const total = sorted.reduce((s, p) => s + p.amount, 0);

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Payment History"
        style={{ width: 'min(1100px, 100%)', maxHeight: '90vh', overflow: 'auto', background: t.surfaceBg, borderRadius: 16, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="flex items-center justify-between gap-2" style={{ padding: '12px 16px', background: 'var(--brand-gradient)', color: '#fff', borderRadius: '16px 16px 0 0' }}>
          <div className="flex items-center gap-2" style={{ fontWeight: 800, fontSize: 14 }}>
            <MdHistory size={18} /> Payment History — {customerName}{customerCode ? ` (${customerCode})` : ''}
            {unit && <span style={{ fontWeight: 600, fontSize: 12, opacity: 0.9 }}>· {unit}</span>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><MdClose size={20} /></button>
        </div>
        <div style={{ padding: 16 }}>
          {rows == null ? (
            <p style={{ color: t.textSecondary, fontSize: 12 }}>Loading...</p>
          ) : (
            <>
              <PaymentHistoryTable t={t} isDark={isDark} emptyText="No payment history found."
                rows={sorted.map(toPaymentHistoryRow)}
                renderActions={(row) => (
                  <div className="flex items-center gap-1.5">
                    <button type="button" title="Download Receipt" aria-label="Download Receipt"
                      onClick={async () => { const d = await loadReceipt(row.id); if (d) await exportPaymentReceiptPdf(d); }}
                      style={iconBtn('#15803d', isDark ? 'rgba(22,163,74,0.15)' : '#dcfce7')}><MdDownload size={13} /></button>
                    <button type="button" title="View Receipt" aria-label="View Receipt"
                      onClick={async () => { const d = await loadReceipt(row.id); if (d) setReceipt(d); }}
                      style={iconBtn('var(--brand-ink)', isDark ? 'rgba(0,0,255,0.18)' : '#e0f2ff')}><MdVisibility size={13} /></button>
                  </div>
                )} />
              {sorted.length > 0 && (
                <div className="flex items-center justify-between rounded-xl px-4 py-3 mt-4" style={{ background: t.insetBg }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--brand-ink)' }}>Grand Total:</span>
                  <span className="rounded-lg px-3 py-1.5" style={{ border: '1px solid #15803d', fontSize: 13, fontWeight: 800, color: isDark ? '#86efac' : '#15803d' }}>
                    ₹ {total.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {receipt && (
        // Its own clicks must not reach the backdrop above (which closes this popup).
        <div onClick={(e) => e.stopPropagation()}>
          <PaymentReceiptViewModal data={receipt} onClose={() => setReceipt(null)} onDownload={() => exportPaymentReceiptPdf(receipt)} />
        </div>
      )}
    </div>,
    document.body,
  );
};

export default CustomerPaymentHistoryModal;
