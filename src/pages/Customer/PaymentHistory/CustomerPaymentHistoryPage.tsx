// Payment History & Receipt — every payment recorded against this booking,
// newest first, in the same table the office uses (Actions, Status,
// Receipt No., Payment Type, ... — see components/common/
// PaymentHistoryTable), then the refunds of any cancelled booking with
// their cancelled receipts, in an accordion underneath (these used to be a
// separate "Cancelled Receipts" page).
//
// Every payment is listed regardless of approval: the customer handed the
// money over and needs to see that it was recorded. Only an APPROVED
// payment has a receipt to view or download.
import React, { useEffect, useMemo, useState } from 'react';
import { CircularProgress } from '@mui/material';
import { toast } from '@/utils/toast';
import {
  MdAccountBalanceWallet, MdHourglassEmpty, MdHistory, MdTrendingUp, MdVisibility, MdDownload,
  MdReceiptLong,
} from 'react-icons/md';
import { formatDate } from '../../../utils';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import { AccordionSection } from '../../../components/common/Accordion';
import PaymentHistoryTable from '../../../components/common/PaymentHistoryTable';
import {
  fetchMyBookingPayments, fetchMyBookingDueGrid, fetchMyPaymentReceipt, fetchMyCancelledReceipt, PortalPaymentRow,
} from '../../../services/customerPortalService';
import { PaymentReceiptViewModal } from '../../../components/common/PaymentReceiptViewModal';
import { exportPaymentReceiptPdf } from '../../Admin/CRM/Customer-Details/paymentPdfExport.lazy';
import { PaymentReceipt } from '../../../types/index';
import RefundHistoryTable from '../../../components/common/RefundHistoryTable';
import { useCustomerPortal } from '../CustomerPortalContext';
import { PageHead, Stat, STAT_GRADIENTS, rupee, totalsFromDueGrid, BookingTotals } from '../CustomerPortalUi';

const CustomerPaymentHistoryPage: React.FC = () => {
  const { selectedId, selected, cancelled } = useCustomerPortal();
  const isCancelled = !!selected?.is_cancelled;
  const { t, isDark } = useAppearanceTokens();
  const [rows, setRows] = useState<PortalPaymentRow[]>([]);
  const [totals, setTotals] = useState<BookingTotals | null>(null);
  const [loading, setLoading] = useState(selectedId != null);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ data: PaymentReceipt; variant: 'payment' | 'cancelled' } | null>(null);
  const [openPayments, setOpenPayments] = useState(true);
  const [openCancelled, setOpenCancelled] = useState(true);

  useEffect(() => {
    if (selectedId == null) { setLoading(false); return; }
    let stale = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        // A cancelled booking has no dues left (the office's due grid only
        // covers active bookings): its tiles come from the booking amount
        // and the payments it actually received.
        const [payments, grid] = await Promise.all([
          fetchMyBookingPayments(selectedId),
          isCancelled ? Promise.resolve(null) : fetchMyBookingDueGrid(selectedId),
        ]);
        if (stale) return;
        setRows(payments);
        setTotals(grid
          ? totalsFromDueGrid(grid.rows, grid.extra_pay_total ?? 0)
          : { totalCost: Number(selected?.flat_amount || 0), paid: payments.reduce((n, r) => n + Number(r.amount || 0), 0), pending: 0 });
      } catch {
        if (!stale) setError(true);
      } finally {
        if (!stale) setLoading(false);
      }
    })();
    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, isCancelled]);

  // Newest first — the payment someone just made is the one they came to
  // check. `date` can be null on older rows, so created_at is the fallback.
  const sorted = useMemo(
    () => [...rows].sort((a, b) =>
      new Date(b.date ?? b.created_at).getTime() - new Date(a.date ?? a.created_at).getTime()),
    [rows]
  );

  // View and Download both need the receipt endpoint's data — the list row
  // does not carry enough to render a receipt.
  const withReceipt = async (key: string, load: () => Promise<PaymentReceipt>, use: (data: PaymentReceipt) => void | Promise<void>) => {
    setBusyId(key);
    try {
      await use(await load());
    } catch {
      toast.error('We could not open this receipt. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const iconBtn = (color: string, bg: string): React.CSSProperties => ({
    width: 28, height: 28, border: 'none', borderRadius: 8, cursor: 'pointer', color, background: bg,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  });
  const refundCount = cancelled.reduce((n, b) => n + b.refunds.length, 0);
  // V_25.0 — a cancelled booking owes nothing more: its third tile is what
  // has been refunded (approved refunds only; pending ones are listed below).
  const refundedApproved = cancelled.reduce((n, b) => n + b.refunds.filter((r) => r.status === 'approved').reduce((s, r) => s + Number(r.refunded_amount || 0), 0), 0);
  const refundPending = cancelled.reduce((n, b) => n + b.refunds.filter((r) => r.status !== 'approved').reduce((s, r) => s + Number(r.refunded_amount || 0), 0), 0);

  if (loading) return <div className="cp-center"><CircularProgress size={28} /></div>;
  if (error) return <div className="cp-empty cp-empty-error">We could not load your payment history. Please try again.</div>;

  return (
    <>
      <PageHead title="Payment History & Receipt" />

      {selectedId != null && (
        <>
          <div className="cp-stats">
            <Stat icon={<MdTrendingUp size={19} />} label="Total Flat Amount" value={rupee(totals?.totalCost)} gradient={STAT_GRADIENTS.total} />
            <Stat icon={<MdAccountBalanceWallet size={19} />} label="Total Amount Paid" value={rupee(totals?.paid)} gradient={STAT_GRADIENTS.paid} />
            {isCancelled ? (
              <Stat icon={<MdHourglassEmpty size={19} />}
                label={refundPending > 0 ? `Total Refunded (${rupee(refundPending)} awaiting approval)` : 'Total Refunded'}
                value={rupee(refundedApproved)} gradient={STAT_GRADIENTS.pending} />
            ) : (
              <Stat icon={<MdHourglassEmpty size={19} />} label="Total Amount Pending" value={rupee(totals?.pending)} gradient={STAT_GRADIENTS.pending} />
            )}
          </div>

          <AccordionSection
            theme={t} icon={<MdHistory size={16} />} title={`Payment History (${sorted.length})`} gradient="var(--brand-gradient)"
            open={openPayments} onToggle={() => setOpenPayments((v) => !v)}
          >
            <PaymentHistoryTable
              t={t} isDark={isDark} emptyText="No payments have been recorded yet."
              rows={sorted.map((r) => ({
                id: r.id, receipt_number: r.receipt_number, payment_type: r.payment_type, payment_tag: r.payment_tag,
                is_after_possession_emi: r.is_after_possession_emi, mode: r.mode_of_payment, amount: r.amount,
                inst_date: r.inst_date, payment_date: r.payment_date ?? r.date, created_at: r.created_at,
                company: r.company, received_by: r.received_by, is_approved: r.is_approved,
              }))}
              // View / Download stay disabled until an admin approves the
              // payment (only then is there a receipt). No delete here —
              // deleting a payment is admin-only.
              renderActions={(row) => row.is_approved ? (
                <span className="inline-flex items-center gap-1.5">
                  <button type="button" title="View Receipt" aria-label="View Receipt" disabled={busyId === `p${row.id}`}
                    onClick={() => withReceipt(`p${row.id}`, () => fetchMyPaymentReceipt(row.id), (data) => setReceipt({ data, variant: 'payment' }))}
                    style={iconBtn('var(--brand-ink)', isDark ? 'rgba(0,0,255,0.18)' : '#e0f2ff')}>
                    <MdVisibility size={14} />
                  </button>
                  <button type="button" title="Download Receipt" aria-label="Download Receipt" disabled={busyId === `p${row.id}`}
                    onClick={() => withReceipt(`p${row.id}`, () => fetchMyPaymentReceipt(row.id), (data) => exportPaymentReceiptPdf(data))}
                    style={iconBtn('#16a34a', isDark ? 'rgba(22,163,74,0.15)' : '#dcfce7')}>
                    <MdDownload size={14} />
                  </button>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5" title="Receipt available after admin approval" style={{ opacity: 0.4 }}>
                  <button type="button" disabled aria-label="View Receipt (after approval)" style={{ ...iconBtn('var(--brand-ink)', isDark ? 'rgba(0,0,255,0.18)' : '#e0f2ff'), cursor: 'not-allowed' }}>
                    <MdVisibility size={14} />
                  </button>
                  <button type="button" disabled aria-label="Download Receipt (after approval)" style={{ ...iconBtn('#16a34a', isDark ? 'rgba(22,163,74,0.15)' : '#dcfce7'), cursor: 'not-allowed' }}>
                    <MdDownload size={14} />
                  </button>
                </span>
              )}
            />
            <div style={{ fontSize: 11.5, color: t.textSecondary, marginTop: 8 }}>
              Receipts are generated only after payment approval.
            </div>
          </AccordionSection>
        </>
      )}

      {/* Refunds of cancelled bookings, with their cancelled receipts. */}
      {cancelled.length > 0 && (
        <AccordionSection
          theme={t} icon={<MdReceiptLong size={16} />} title={`Cancelled Receipts — Refund History (${refundCount})`} gradient="linear-gradient(135deg, #b91c1c, #ef4444)"
          open={openCancelled} onToggle={() => setOpenCancelled((v) => !v)}
        >
          {cancelled.map((b) => (
            <div key={b.customer_id} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: t.textPrimary, marginBottom: 6 }}>
                {b.unit || 'Booking'}{b.customer_code ? ` (${b.customer_code})` : ''}
                {b.cancelled_at && <span style={{ fontWeight: 600, color: t.textSecondary }}> · Cancelled on {formatDate(b.cancelled_at)}</span>}
              </div>
              {/* V_25.0 — the shared Refund History table (same as the office's). */}
              <RefundHistoryTable t={t} emptyText="No refund has been recorded for this booking yet."
                rows={b.refunds.map((r) => ({
                  id: r.refund_id, receipt_number: r.receipt_number, refunded_amount: r.refunded_amount,
                  refund_date: r.refund_date as string, mode_of_payment: r.mode_of_payment, status: r.status,
                }))}
                renderActions={(r) => {
                  // View / Download only once an admin approves the refund.
                  const approved = r.status === 'approved' && !!r.receipt_number;
                  const key = `c${r.id}`;
                  return (
                    <span className="inline-flex items-center gap-1.5" title={approved ? undefined : 'Cancelled receipt available after admin approval'} style={{ opacity: approved ? 1 : 0.4 }}>
                      <button type="button" title="View Cancelled Receipt" aria-label="View Cancelled Receipt" disabled={!approved || busyId === key}
                        onClick={() => withReceipt(key, () => fetchMyCancelledReceipt(String(r.id)), (data) => setReceipt({ data, variant: 'cancelled' }))}
                        style={{ ...iconBtn('var(--brand-ink)', isDark ? 'rgba(0,0,255,0.18)' : '#e0f2ff'), cursor: approved ? 'pointer' : 'not-allowed' }}>
                        <MdVisibility size={14} />
                      </button>
                      <button type="button" title="Download Cancelled Receipt" aria-label="Download Cancelled Receipt" disabled={!approved || busyId === key}
                        onClick={() => withReceipt(key, () => fetchMyCancelledReceipt(String(r.id)), (data) => exportPaymentReceiptPdf(data, 'cancelled'))}
                        style={{ ...iconBtn('#16a34a', isDark ? 'rgba(22,163,74,0.15)' : '#dcfce7'), cursor: approved ? 'pointer' : 'not-allowed' }}>
                        <MdDownload size={14} />
                      </button>
                    </span>
                  );
                }} />
            </div>
          ))}
          <div style={{ fontSize: 11.5, color: t.textSecondary }}>Cancelled receipts are generated only after the refund is approved.</div>
        </AccordionSection>
      )}

      {receipt && (
        <PaymentReceiptViewModal
          data={receipt.data} variant={receipt.variant}
          onClose={() => setReceipt(null)}
          onDownload={() => exportPaymentReceiptPdf(receipt.data, receipt.variant)}
        />
      )}
    </>
  );
};

export default CustomerPaymentHistoryPage;
