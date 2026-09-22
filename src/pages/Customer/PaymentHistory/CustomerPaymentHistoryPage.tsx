// Payment History & Receipt — every payment recorded against this booking,
// newest first, in one combined table (V_24.0 merged this with what used
// to be a separate Payment Receipt page/section).
//
// Every payment is listed regardless of approval: the customer handed the
// money over and needs to see that it was recorded. Only an APPROVED
// payment gets a real receipt — the backend only builds one for an
// approved transaction (getPaymentReceipt with isAdmin=false — see
// customerPortal.service.ts's getMyPaymentReceipt), so a pending row shows
// "Pending Approval" in place of the receipt number and the View/Download
// actions rather than a control that can only fail.
import React, { useEffect, useMemo, useState } from 'react';
import { CircularProgress } from '@mui/material';
import { toast } from '@/utils/toast';
import {
  MdAccountBalanceWallet, MdCheckCircle, MdHourglassEmpty, MdHistory, MdPayments,
  MdTrendingUp, MdPictureAsPdf, MdVisibility, MdDownload,
} from 'react-icons/md';
import { formatDate } from '../../../utils';
import { paymentForLabel } from '../../../services/paymentService';
import {
  fetchMyBookingPayments, fetchMyBookingDueGrid, fetchMyPaymentReceipt, PortalPaymentRow,
} from '../../../services/customerPortalService';
import { PaymentReceiptViewModal } from '../../../components/common/PaymentReceiptViewModal';
import { exportPaymentReceiptPdf } from '../../Admin/CRM/Customer-Details/paymentPdfExport';
import { PaymentReceipt } from '../../../types/index';
import { useCustomerPortal } from '../CustomerPortalContext';
import { PageHead, Card, Stat, STAT_GRADIENTS, rupee, totalsFromDueGrid, BookingTotals } from '../CustomerPortalUi';

const CustomerPaymentHistoryPage: React.FC = () => {
  const { selectedId } = useCustomerPortal();
  const [rows, setRows] = useState<PortalPaymentRow[]>([]);
  const [totals, setTotals] = useState<BookingTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);

  useEffect(() => {
    if (selectedId == null) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const [payments, grid] = await Promise.all([
          fetchMyBookingPayments(selectedId),
          fetchMyBookingDueGrid(selectedId),
        ]);
        if (cancelled) return;
        setRows(payments);
        setTotals(totalsFromDueGrid(grid.rows));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  // Newest first — the payment someone just made is the one they came to
  // check. `date` can be null on older rows, so created_at is the fallback.
  const sorted = useMemo(
    () => [...rows].sort((a, b) =>
      new Date(b.date ?? b.created_at).getTime() - new Date(a.date ?? a.created_at).getTime()),
    [rows]
  );

  // Both View and Download need the same fetch — the list row does not
  // carry enough to render or print a receipt, only the receipt endpoint
  // does.
  const withReceipt = async (id: number, use: (data: PaymentReceipt) => void) => {
    setBusyId(id);
    try {
      use(await fetchMyPaymentReceipt(id));
    } catch {
      toast.error('We could not open this receipt. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="cp-center"><CircularProgress size={28} /></div>;
  if (error) return <div className="cp-empty cp-empty-error">We could not load your payment history. Please try again.</div>;

  return (
    <>
      <PageHead title="Payment History & Receipt" subtitle="View your payment transactions and approved receipts" />

      <div className="cp-stats">
        <Stat icon={<MdTrendingUp size={19} />} label="Total Flat Amount" value={rupee(totals?.totalCost)} gradient={STAT_GRADIENTS.total} />
        <Stat icon={<MdAccountBalanceWallet size={19} />} label="Total Amount Paid" value={rupee(totals?.paid)} gradient={STAT_GRADIENTS.paid} />
        <Stat icon={<MdHourglassEmpty size={19} />} label="Total Amount Pending" value={rupee(totals?.pending)} gradient={STAT_GRADIENTS.pending} />
      </div>

      <Card icon={<MdHistory size={16} />} title={`Payment History & Receipts (${sorted.length})`}>
        {sorted.length === 0 ? (
          <div className="cp-empty">No payments have been recorded yet.</div>
        ) : (
          <div className="cp-table-wrap">
            <table className="cp-table">
              <thead>
                <tr>
                  <th>Receipt No</th>
                  <th>Payment For</th>
                  <th className="cp-num">Amount</th>
                  <th>Payment Mode</th>
                  <th>Payment Date</th>
                  <th>Approval Status</th>
                  <th>Receipt Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.id}>
                    {/* V_23.0 item 2 — blank until an admin approves the
                        payment; the Approval Status column already shows
                        why. */}
                    <td className="cp-nowrap" style={{ fontWeight: 700 }}>{r.receipt_number || '—'}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <MdPayments size={13} /> {paymentForLabel(r.payment_type)}
                      </span>
                    </td>
                    <td className="cp-num" style={{ fontWeight: 700 }}>{rupee(r.amount)}</td>
                    <td className="cp-nowrap">{r.mode_of_payment || '—'}</td>
                    <td className="cp-nowrap">{formatDate(r.date ?? r.created_at)}</td>
                    <td>
                      <span className="cp-chip" style={{
                        background: r.is_approved ? 'rgba(5,150,105,0.12)' : 'rgba(217,119,6,0.14)',
                        color: r.is_approved ? '#059669' : '#b45309',
                      }}>
                        {r.is_approved ? <MdCheckCircle size={12} /> : <MdHourglassEmpty size={12} />}
                        {r.is_approved ? 'Approved' : 'Pending Approval'}
                      </span>
                    </td>
                    <td>
                      {r.is_approved ? (
                        <div className="cp-btn-row">
                          <MdPictureAsPdf size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
                          <button
                            type="button" className="cp-btn" disabled={busyId === r.id}
                            onClick={() => withReceipt(r.id, setReceipt)}
                          >
                            <MdVisibility size={14} /> View
                          </button>
                          <button
                            type="button" className="cp-btn cp-btn-primary" disabled={busyId === r.id}
                            onClick={() => withReceipt(r.id, exportPaymentReceiptPdf)}
                          >
                            <MdDownload size={14} /> Download
                          </button>
                        </div>
                      ) : (
                        <span className="cp-chip" style={{ background: 'rgba(107,114,128,0.14)', color: 'var(--cp-text-secondary, #6b7280)' }}>
                          <MdHourglassEmpty size={12} /> Pending Approval
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="cp-empty" style={{ marginTop: 12, textAlign: 'left', padding: '12px 16px' }}>
        Receipts are generated only after payment approval.
      </div>

      {receipt && (
        <PaymentReceiptViewModal
          data={receipt}
          onClose={() => setReceipt(null)}
          onDownload={() => exportPaymentReceiptPdf(receipt)}
        />
      )}
    </>
  );
};

export default CustomerPaymentHistoryPage;
