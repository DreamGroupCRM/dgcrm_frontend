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
import { HistoryPopup, HistorySection, customerInfoItems, propertyInfoItems } from './HistoryPopup';
import PaymentHistoryTable, { toPaymentHistoryRow } from './PaymentHistoryTable';
import { PaymentReceiptViewModal } from './PaymentReceiptViewModal';

const CustomerPaymentHistoryModal: React.FC<{
  t: AppTheme;
  isDark?: boolean;
  customerId: string | number;
  customerName: string;
  customerCode?: string | null;
  /** Unused now — the property block reads the customer record itself. */
  unit?: string | null;
  onClose: () => void;
  /** The page's appearance CSS variables (the popup is portaled outside the page). */
  vars?: React.CSSProperties;
}> = ({ t, isDark, customerId, customerName, customerCode, onClose, vars }) => {
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
  // V_26.0 — Paid / Pending count approved payments only.
  const approvedPaid = sorted.filter((p) => p.is_approved).reduce((s, p) => s + p.amount, 0);
  const awaiting = total - approvedPaid;

  const cost = full?.total_cost ?? null;
  const rupeeOf = (n: number) => `₹ ${n.toLocaleString('en-IN')}`;
  return (
    <>
      <HistoryPopup t={t} vars={vars} onClose={onClose} loading={rows == null}
        title={`Payments History - Total Transaction (${sorted.length})`}
        customer={customerInfoItems({ name: customerName, code: customerCode, mobile: full?.mobile_number, email: full?.email, address: full?.address })}
        property={propertyInfoItems({
          project: full?.project_name, location: full?.location, building: full?.building_name, wing: full?.wing_name,
          unitType: full?.unit_type === 'shop' ? 'shop' : 'flat', unitNo: full?.unit_type === 'shop' ? full?.shop_no : full?.flat_no,
          flatAmount: cost, paid: approvedPaid, pending: cost != null ? Math.max(0, cost - approvedPaid) : null, awaiting,
        })}>
        <HistorySection t={t} title="Payment Details" total={sorted.length ? { label: 'Grand Total:', value: rupeeOf(total) } : undefined}>
          {sorted.length === 0 ? (
            <p style={{ color: t.textSecondary, fontSize: 12 }}>No payment history found.</p>
          ) : (
            <PaymentHistoryTable t={t} isDark={isDark}
              rows={sorted.map(toPaymentHistoryRow)}
              // No receipt until an admin approves the payment, so View /
              // Download stay disabled for an unapproved one.
              renderActions={(row) => {
                const off = !row.is_approved;
                const tip = (label: string) => (off ? `${label} (available after admin approval)` : label);
                const st = (base: React.CSSProperties): React.CSSProperties => (off ? { ...base, opacity: 0.4, cursor: 'not-allowed' } : base);
                return (
                  <div className="flex items-center gap-1.5">
                    <button type="button" title={tip('Download Receipt')} aria-label={tip('Download Receipt')} disabled={off}
                      onClick={async () => { const d = await loadReceipt(row.id); if (d) await exportPaymentReceiptPdf(d); }}
                      style={st(iconBtn('#15803d', isDark ? 'rgba(22,163,74,0.15)' : '#dcfce7'))}><MdDownload size={13} /></button>
                    <button type="button" title={tip('View Receipt')} aria-label={tip('View Receipt')} disabled={off}
                      onClick={async () => { const d = await loadReceipt(row.id); if (d) setReceipt(d); }}
                      style={st(iconBtn('var(--brand-ink)', isDark ? 'rgba(0,0,255,0.18)' : '#e0f2ff'))}><MdVisibility size={13} /></button>
                  </div>
                );
              }} />
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
