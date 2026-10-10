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
import { MdDownload, MdVisibility } from 'react-icons/md';
import { toast } from '@/utils/toast';
import { AppTheme } from '../../styles/theme';
import { fetchCustomerFullDetails, fetchCustomerPaymentHistory } from '../../services/customerDetailsService';
import { fetchPaymentReceipt } from '../../services/paymentService';
import { exportPaymentReceiptPdf } from '../../pages/Admin/CRM/Customer-Details/paymentPdfExport.lazy';
import { CustomerFullDetail, CustomerPaymentRecord, PaymentReceipt } from '../../types';
import { HistoryPopup, HistorySection } from './HistoryPopup';
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
  /** The page's appearance CSS variables (the popup is portaled outside the page). */
  vars?: React.CSSProperties;
}> = ({ t, isDark, customerId, customerName, customerCode, unit, onClose, vars }) => {
  const [rows, setRows] = useState<CustomerPaymentRecord[] | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [full, setFull] = useState<CustomerFullDetail | null>(null);

  useEffect(() => {
    let stale = false;
    fetchCustomerPaymentHistory(String(customerId))
      .then((res) => { if (!stale) setRows(res.rows); })
      .catch(() => { if (!stale) { setRows([]); toast.error('Failed to load payment history.'); } });
    // Customer Details block (as on Customer Details); a failure here never blocks the history.
    fetchCustomerFullDetails(String(customerId)).then((res) => { if (!stale) setFull(res.data); }).catch(() => {});
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

  const cost = full?.total_cost ?? null;
  const rupeeOf = (n: number) => `₹ ${n.toLocaleString('en-IN')}`;
  return (
    <>
      <HistoryPopup t={t} vars={vars} onClose={onClose} loading={rows == null}
        title={`Payments History - Total Transaction (${sorted.length})`}
        info={[
          { label: 'Name', value: `${customerName}${customerCode ? ` (${customerCode})` : ''}` },
          { label: 'Address', value: full?.address || '—' },
          { label: 'Building', value: unit || [full?.building_name, full?.wing_name].filter(Boolean).join(' / ') || '—' },
          { label: 'Email', value: full?.email || '—' },
          { label: 'Mobile No.', value: full?.mobile_number || '—' },
          { label: 'Total Flat Cost', value: cost != null ? rupeeOf(cost) : '—', tone: 'green' },
          { label: 'Total Paid', value: rupeeOf(total), tone: 'green' },
          { label: 'Pending Amount', value: cost != null ? rupeeOf(Math.max(0, cost - total)) : '—', tone: 'red' },
        ]}>
        <HistorySection t={t} title="Payment Details" total={sorted.length ? { label: 'Grand Total:', value: rupeeOf(total) } : undefined}>
          {sorted.length === 0 ? (
            <p style={{ color: t.textSecondary, fontSize: 12 }}>No payment history found.</p>
          ) : (
            <PaymentHistoryTable t={t} isDark={isDark}
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
          )}
        </HistorySection>
      </HistoryPopup>
      {receipt && createPortal(
        // Above the history popup.
        <div style={{ position: 'fixed', inset: 0, zIndex: 1400 }}>
          <PaymentReceiptViewModal data={receipt} onClose={() => setReceipt(null)} onDownload={() => exportPaymentReceiptPdf(receipt)} />
        </div>,
        document.body,
      )}
    </>
  );
};

export default CustomerPaymentHistoryModal;
