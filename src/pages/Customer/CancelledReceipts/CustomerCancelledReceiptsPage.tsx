// Cancelled Receipts — the refunds paid back on this login's cancelled
// bookings. Each refund gets its cancelled receipt (C_FY_MM_n) once an admin
// approves it; until then the row shows "Pending Approval" instead of the
// View / Download actions, same as a payment receipt.
import React, { useState } from 'react';
import { toast } from '@/utils/toast';
import { MdCheckCircle, MdHourglassEmpty, MdPictureAsPdf, MdVisibility, MdDownload, MdReceiptLong } from 'react-icons/md';
import { formatDate } from '../../../utils';
import { fetchMyCancelledReceipt } from '../../../services/customerPortalService';
import { PaymentReceiptViewModal } from '../../../components/common/PaymentReceiptViewModal';
import { exportPaymentReceiptPdf } from '../../Admin/CRM/Customer-Details/paymentPdfExport.lazy';
import { PaymentReceipt } from '../../../types/index';
import { useCustomerPortal } from '../CustomerPortalContext';
import { PageHead, Card, rupee } from '../CustomerPortalUi';

const CustomerCancelledReceiptsPage: React.FC = () => {
  const { cancelled } = useCustomerPortal();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);

  const withReceipt = async (refundId: string, use: (data: PaymentReceipt) => void | Promise<void>) => {
    setBusyId(refundId);
    try {
      await use(await fetchMyCancelledReceipt(refundId));
    } catch {
      toast.error('We could not open this receipt. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHead title="Cancelled Receipts" subtitle="Refunds for your cancelled bookings, with their cancelled receipts" />

      {cancelled.length === 0 ? (
        <div className="cp-empty">You have no cancelled bookings.</div>
      ) : cancelled.map((b) => (
        <div key={b.customer_id} style={{ marginBottom: 16 }}>
          <Card icon={<MdReceiptLong size={16} />}
            title={`${b.unit || 'Booking'}${b.customer_code ? ` (${b.customer_code})` : ''}${b.cancelled_at ? ` · Cancelled on ${formatDate(b.cancelled_at)}` : ''}`}>
            {b.refunds.length === 0 ? (
              <div className="cp-empty">No refund has been recorded for this booking yet.</div>
            ) : (
              <div className="cp-table-wrap">
                <table className="cp-table">
                  <thead>
                    <tr>
                      <th>Cancelled Receipt No</th>
                      <th className="cp-num">Refund Amount</th>
                      <th>Refund Date</th>
                      <th>Payment Mode</th>
                      <th>Approval Status</th>
                      <th>Receipt Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.refunds.map((r) => {
                      const approved = r.status === 'approved' && !!r.receipt_number;
                      return (
                        <tr key={r.refund_id}>
                          <td className="cp-nowrap" style={{ fontWeight: 700 }}>{r.receipt_number || '—'}</td>
                          <td className="cp-num" style={{ fontWeight: 700 }}>{rupee(r.refunded_amount)}</td>
                          <td className="cp-nowrap">{formatDate(r.refund_date)}</td>
                          <td className="cp-nowrap">{r.mode_of_payment || '—'}</td>
                          <td>
                            <span className="cp-chip" style={{
                              background: approved ? 'rgba(5,150,105,0.12)' : 'rgba(217,119,6,0.14)',
                              color: approved ? '#059669' : '#b45309',
                            }}>
                              {approved ? <MdCheckCircle size={12} /> : <MdHourglassEmpty size={12} />}
                              {approved ? 'Approved' : 'Refund Payment Pending for Approval'}
                            </span>
                          </td>
                          <td>
                            {approved ? (
                              <div className="cp-btn-row">
                                <MdPictureAsPdf size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
                                <button type="button" className="cp-btn" disabled={busyId === r.refund_id}
                                  onClick={() => withReceipt(r.refund_id, setReceipt)}>
                                  <MdVisibility size={14} /> View
                                </button>
                                <button type="button" className="cp-btn cp-btn-primary" disabled={busyId === r.refund_id}
                                  onClick={() => withReceipt(r.refund_id, (d) => exportPaymentReceiptPdf(d, 'cancelled'))}>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ))}

      <div className="cp-empty" style={{ marginTop: 12, textAlign: 'left', padding: '12px 16px' }}>
        Cancelled receipts are generated only after the refund is approved.
      </div>

      {receipt && (
        <PaymentReceiptViewModal data={receipt} variant="cancelled"
          onClose={() => setReceipt(null)}
          onDownload={() => exportPaymentReceiptPdf(receipt, 'cancelled')} />
      )}
    </>
  );
};

export default CustomerCancelledReceiptsPage;
