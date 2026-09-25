// ==========================================
// DREAM GROUP CRM - CANCEL BOOKING POPUP
// ==========================================
// Opened from Customer Details' row menu. An admin's submit cancels the
// booking straight away; an employee's becomes a request that an admin must
// approve before anything changes (enforced by the backend — see
// customer.controller.ts's cancelCustomerBooking).
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from '@/utils/toast';
import { MdClose, MdEventBusy, MdUploadFile } from 'react-icons/md';

import { AppTheme } from '../../../../styles/theme';
import { cancelCustomerBooking, fetchCustomerPaymentHistory } from '../../../../services/customerDetailsService';
import { paymentForLabel } from '../../../../services/paymentService';
import { Customer, CustomerPaymentRecord } from '../../../../types';
import { formatDate } from '../../../../utils';
import { BackdatedDot } from '../../../../components/common/BackdatedDot';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'image/*,.pdf';

type FileKey = 'cancel_letter' | 'acceptance_letter' | 'cancel_documents' | 'returned_documents';

const flatDetails = (c: Customer): string => {
  if (!c.building_name) return '—';
  return c.unit_type === 'shop'
    ? `${c.building_name} • Shop ${c.shop_no || '—'}`
    : [c.building_name, c.wing_name ? `Wing ${c.wing_name}` : '', c.flat_no ? `Flat ${c.flat_no}` : ''].filter(Boolean).join(' • ');
};

const rupee = (n: number): string => `₹ ${(n || 0).toLocaleString('en-IN')}`;

const CancelBookingModal: React.FC<{
  t: AppTheme;
  customer: Customer;
  isAdmin: boolean;
  onClose: () => void;
  onDone: (pending: boolean) => void;
}> = ({ t, customer, isAdmin, onClose, onDone }) => {
  const [payments, setPayments] = useState<CustomerPaymentRecord[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [reason, setReason] = useState('');
  const [originalsReturned, setOriginalsReturned] = useState(false);
  const [files, setFiles] = useState<Partial<Record<FileKey, File | null>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [reasonError, setReasonError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchCustomerPaymentHistory(customer.id);
        if (!cancelled) setPayments(res.success ? res.rows : []);
      } catch {
        if (!cancelled) toast.error('Failed to load payment history.');
      } finally {
        if (!cancelled) setLoadingPayments(false);
      }
    })();
    return () => { cancelled = true; };
  }, [customer.id]);

  const pickFile = (key: FileKey, file: File | null) => {
    if (file && file.size > MAX_FILE_BYTES) {
      toast.error(`${file.name} is larger than 5 MB.`);
      return;
    }
    setFiles((prev) => ({ ...prev, [key]: file }));
  };

  const handleSubmit = async () => {
    if (!reason.trim()) { setReasonError(true); toast.error('Enter the cancellation reason.'); return; }
    setSubmitting(true);
    try {
      const res = await cancelCustomerBooking(customer.id, {
        reason: reason.trim(),
        original_documents_returned: originalsReturned,
        ...files,
      });
      toast.success(res.pending ? 'Cancellation request sent for admin approval.' : 'Booking cancelled.');
      onDone(!!res.pending);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to cancel booking.');
    } finally {
      setSubmitting(false);
    }
  };

  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 };
  const readOnlyStyle: React.CSSProperties = { width: '100%', background: t.insetBg, border: `1px solid ${t.inputBorder}`, color: t.textSecondary, borderRadius: 10, padding: '9px 10px', fontSize: 12 };
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  const FileField: React.FC<{ k: FileKey; label: string }> = ({ k, label }) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <label className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: t.inputBg, border: `1px dashed ${t.inputBorder}`, cursor: 'pointer', fontSize: 12, color: t.inputText, minHeight: 38 }}>
        <MdUploadFile size={17} style={{ color: 'var(--brand-ink)', flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {files[k]?.name || 'Choose file (PDF or image, max 5 MB)'}
        </span>
        {files[k] && (
          <button type="button" onClick={(e) => { e.preventDefault(); pickFile(k, null); }} title="Remove file"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary, display: 'flex', padding: 0 }}>
            <MdClose size={15} />
          </button>
        )}
        <input type="file" accept={ACCEPT} style={{ display: 'none' }}
          onChange={(e) => { pickFile(k, e.target.files?.[0] ?? null); e.target.value = ''; }} />
      </label>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-2xl w-full" style={{ maxWidth: 820, maxHeight: '90vh', overflowY: 'auto', background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ background: '#b91c1c', borderRadius: '16px 16px 0 0' }}>
          <div className="flex items-center gap-2" style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>
            <MdEventBusy size={18} /> Cancel Booking
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Close"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', padding: 4 }}>
            <MdClose size={20} />
          </button>
        </div>

        <div className="p-5" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!isAdmin && (
            <div className="rounded-xl px-3.5 py-2.5" style={{ background: 'rgba(217,119,6,0.12)', color: '#b45309', fontSize: 12, fontWeight: 600 }}>
              This sends a cancellation request to an admin. The booking is cancelled only after an admin approves it.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Customer Name</label>
              <input type="text" readOnly disabled value={`${customer.customer_name}${customer.customer_code ? ` (${customer.customer_code})` : ''}`} style={readOnlyStyle} />
            </div>
            <div>
              <label style={labelStyle}>Flat Details</label>
              <div aria-disabled="true" style={{ ...readOnlyStyle, whiteSpace: 'normal', lineHeight: 1.35 }}>{flatDetails(customer)}</div>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Payment History</label>
            <div className="master-table-scroll rounded-xl" style={{ border: `1px solid ${t.surfaceBorder}` }}>
              <table className="master-table" style={{ width: '100%', minWidth: 560 }}>
                <thead>
                  <tr className="master-table-header-gradient">
                    {['Receipt No.', 'Receipt Date', 'Payment For', 'Mode', 'Amount'].map((h) => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingPayments ? (
                    <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>Loading...</td></tr>
                  ) : payments.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>No payments recorded.</td></tr>
                  ) : payments.map((p) => (
                    <tr key={p.id}>
                      <td style={{ padding: '7px 12px', fontSize: 11.5, color: t.textPrimary, whiteSpace: 'nowrap' }}>{p.receipt_number || '—'}</td>
                      <td style={{ padding: '7px 12px', fontSize: 11.5, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                        <div className="flex items-center gap-1.5">{formatDate(p.paid_on)}<BackdatedDot paymentDate={p.payment_date} createdAt={p.created_at} /></div>
                      </td>
                      <td style={{ padding: '7px 12px', fontSize: 11.5, color: t.textPrimary, whiteSpace: 'nowrap' }}>{p.payment_tag === 'Extra Pay' ? 'Extra Pay' : paymentForLabel(p.payment_type)}</td>
                      <td style={{ padding: '7px 12px', fontSize: 11.5, color: t.textPrimary, whiteSpace: 'nowrap' }}>{p.mode || '—'}</td>
                      <td style={{ padding: '7px 12px', fontSize: 12, fontWeight: 700, color: t.textPrimary, whiteSpace: 'nowrap' }}>{rupee(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {payments.length > 0 && (
              <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 800, color: t.textPrimary, marginTop: 6 }}>Total Paid: {rupee(totalPaid)}</div>
            )}
          </div>

          <div>
            <label style={labelStyle}>Cancellation Reason <span style={{ color: '#dc2626' }}>*</span></label>
            <textarea rows={3} value={reason} onChange={(e) => { setReason(e.target.value); if (e.target.value.trim()) setReasonError(false); }}
              placeholder="Why is this booking being cancelled?"
              style={{ width: '100%', background: t.inputBg, border: `1px solid ${reasonError ? '#ef4444' : t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 10px', fontSize: 12, outline: 'none', resize: 'vertical' }} />
            {reasonError && <p style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4 }}>Cancellation reason is required.</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FileField k="cancel_letter" label="Cancel Letter" />
            <FileField k="acceptance_letter" label="Acceptance Letter" />
            <FileField k="cancel_documents" label="Cancel Documents" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <label className="flex items-center gap-2" style={{ fontSize: 12.5, fontWeight: 600, color: t.textPrimary, cursor: 'pointer', minHeight: 38 }}>
              <input type="checkbox" checked={originalsReturned} onChange={(e) => setOriginalsReturned(e.target.checked)} style={{ width: 16, height: 16 }} />
              Return of Original Documents
            </label>
            <FileField k="returned_documents" label="Documents" />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: t.insetBg, color: t.textPrimary, border: `1px solid ${t.inputBorder}`, cursor: submitting ? 'not-allowed' : 'pointer' }}>
              Close
            </button>
            <button type="button" onClick={handleSubmit} disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: submitting ? '#6b7280' : '#b91c1c', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? 'Submitting...' : isAdmin ? 'Cancel Booking' : 'Submit for Approval'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CancelBookingModal;
