// Payment History — the money summary (cost / paid / pending) followed by
// every payment recorded against this booking, newest first.
//
// Unapproved payments ARE listed: the customer has handed the money over
// and needs to see that it was recorded. They are chipped "Pending
// Approval" so it is clear the office has not confirmed it yet — which is
// also why no receipt is offered for them (see the Payment Receipt page).
import React, { useEffect, useMemo, useState } from 'react';
import { CircularProgress } from '@mui/material';
import { MdAccountBalanceWallet, MdCheckCircle, MdHourglassEmpty, MdHistory, MdPayments, MdTrendingUp } from 'react-icons/md';
import { formatDate } from '../../../utils';
import { paymentForLabel } from '../../../services/paymentService';
import {
  fetchMyBookingPayments, fetchMyBookingDueGrid, PortalPaymentRow,
} from '../../../services/customerPortalService';
import { useCustomerPortal } from '../CustomerPortalContext';
import { PageHead, Card, Stat, STAT_GRADIENTS, rupee, totalsFromDueGrid, BookingTotals } from '../CustomerPortalUi';

const CustomerPaymentHistoryPage: React.FC = () => {
  const { selectedId } = useCustomerPortal();
  const [rows, setRows] = useState<PortalPaymentRow[]>([]);
  const [totals, setTotals] = useState<BookingTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  if (loading) return <div className="cp-center"><CircularProgress size={28} /></div>;
  if (error) return <div className="cp-empty cp-empty-error">We could not load your payment history. Please try again.</div>;

  return (
    <>
      <PageHead title="Payment History" subtitle="Everything you have paid towards this property" />

      <div className="cp-stats">
        <Stat icon={<MdTrendingUp size={19} />} label="Total Cost" value={rupee(totals?.totalCost)} gradient={STAT_GRADIENTS.total} />
        <Stat icon={<MdAccountBalanceWallet size={19} />} label="Amount Paid" value={rupee(totals?.paid)} gradient={STAT_GRADIENTS.paid} />
        <Stat icon={<MdHourglassEmpty size={19} />} label="Pending Amount" value={rupee(totals?.pending)} gradient={STAT_GRADIENTS.pending} />
      </div>

      <Card icon={<MdHistory size={16} />} title={`Payment History (${sorted.length})`}>
        {sorted.length === 0 ? (
          <div className="cp-empty">No payments have been recorded yet.</div>
        ) : (
          <div className="cp-table-wrap">
            <table className="cp-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Payment For</th>
                  <th className="cp-num">Amount</th>
                  <th>Mode</th>
                  <th>Payment Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.id}>
                    {/* V_23.0 item 2 — blank until an admin approves the
                        payment; the Status column already shows that. */}
                    <td className="cp-nowrap" style={{ fontWeight: 700 }}>{r.receipt_number || 'Pending'}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
};

export default CustomerPaymentHistoryPage;
