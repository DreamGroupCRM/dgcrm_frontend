// Payment Receipt — one row per COMPLETED payment, each with View and
// Download.
//
// "Completed" means approved by the office. That is not this page's own
// rule: the backend only builds a receipt for an approved transaction
// (getPaymentReceipt with isAdmin=false), so listing an unapproved payment
// here would offer a button that can only fail. A payment waiting for
// approval is still visible to the customer — on Payment History, chipped
// as pending.
import React, { useEffect, useMemo, useState } from 'react';
import { CircularProgress } from '@mui/material';
import { toast } from '@/utils/toast';
import { MdReceiptLong, MdVisibility, MdDownload, MdPayments } from 'react-icons/md';
import { formatDate } from '../../../utils';
import { paymentForLabel } from '../../../services/paymentService';
import { fetchMyBookingPayments, fetchMyPaymentReceipt, PortalPaymentRow } from '../../../services/customerPortalService';
import { PaymentReceiptViewModal } from '../../../components/common/PaymentReceiptViewModal';
import { exportPaymentReceiptPdf } from '../../Admin/CRM/Customer-Details/paymentPdfExport';
import { PaymentReceipt } from '../../../types/index';
import { useCustomerPortal } from '../CustomerPortalContext';
import { PageHead, Card, rupee } from '../CustomerPortalUi';

const CustomerPaymentReceiptPage: React.FC = () => {
  const { selectedId } = useCustomerPortal();
  const [rows, setRows] = useState<PortalPaymentRow[]>([]);
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
        const payments = await fetchMyBookingPayments(selectedId);
        if (!cancelled) setRows(payments);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  const completed = useMemo(
    () => rows
      .filter((r) => r.is_approved)
      .sort((a, b) => new Date(b.date ?? b.created_at).getTime() - new Date(a.date ?? a.created_at).getTime()),
    [rows]
  );

  // Both actions need the same fetch — the list row does not carry enough
  // to render or print a receipt, only the receipt endpoint does.
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
  if (error) return <div className="cp-empty cp-empty-error">We could not load your receipts. Please try again.</div>;

  return (
    <>
      <PageHead title="Payment Receipt" subtitle="Receipts for payments confirmed by our office" />

      <Card icon={<MdReceiptLong size={16} />} title={`Available Receipts (${completed.length})`}>
        {completed.length === 0 ? (
          <div className="cp-empty">
            No receipts yet. A receipt appears here once our office confirms your payment.
          </div>
        ) : (
          <div className="cp-table-wrap">
            <table className="cp-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Payment For</th>
                  <th className="cp-num">Amount</th>
                  <th>Payment Date</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {completed.map((r) => (
                  <tr key={r.id}>
                    <td className="cp-nowrap" style={{ fontWeight: 700 }}>{r.receipt_number}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <MdPayments size={13} /> {paymentForLabel(r.payment_type)}
                      </span>
                    </td>
                    <td className="cp-num" style={{ fontWeight: 700 }}>{rupee(r.amount)}</td>
                    <td className="cp-nowrap">{formatDate(r.date ?? r.created_at)}</td>
                    <td>
                      <div className="cp-btn-row">
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
                          <MdDownload size={14} /> PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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

export default CustomerPaymentReceiptPage;
