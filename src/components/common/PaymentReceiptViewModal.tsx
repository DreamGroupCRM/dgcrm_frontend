// ==========================================
// DREAM GROUP CRM - PAYMENT RECEIPT VIEW MODAL (shared)
// ==========================================
// On-screen render of the same "PAYMENT RECEIPT" design the downloaded PDF
// uses (see ../../pages/Admin/CRM/Customer-Details/paymentPdfExport.ts's
// exportPaymentReceiptPdf) — same fields, same layout, just HTML instead of
// jsPDF drawing calls, so what a viewer sees on screen matches what they
// download. GSTIN is omitted for the same reason the PDF omits it: no GST
// column on a payment transaction, and `company` is free text with no
// reliable link back to a Company master row.
import React from 'react';
import { MdClose, MdDownload } from 'react-icons/md';
import { PaymentReceipt } from '../../types/index';
import { numberToIndianWords } from '../../utils';

const rupee = (n: number): string => `₹ ${Math.round(n || 0).toLocaleString('en-IN')}`;
const formatDMY = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

interface PaymentReceiptViewModalProps {
  data: PaymentReceipt;
  onClose: () => void;
  onDownload: () => void;
}

export const PaymentReceiptViewModal: React.FC<PaymentReceiptViewModalProps> = ({ data, onClose, onDownload }) => {
  const { transaction: tx, customer } = data;
  const total = tx.amount + (tx.maintenance || 0);
  const emiMonth = tx.inst_date ? new Date(tx.inst_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
      <div className="rounded-2xl w-full" style={{ maxWidth: 480, background: '#fff', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="p-4" style={{ border: '2px solid #1e3a8a', borderRadius: 14, margin: 12 }}>
          <div className="flex items-start justify-between mb-2">
            <div style={{ fontSize: 10, fontWeight: 700, color: '#1e293b' }}>GSTIN : —</div>
            <div className="flex items-center gap-2">
              <span className="rounded px-2 py-1" style={{ background: '#2563eb', color: '#fff', fontSize: 9.5, fontWeight: 800 }}>PAYMENT RECEIPT</span>
              <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                <MdClose size={18} />
              </button>
            </div>
          </div>

          <div className="flex items-start justify-between mb-2">
            <div>
              <div style={{ fontSize: 19, fontWeight: 800, color: '#1e40af' }}>{tx.company || 'Dream Group CRM'}</div>
            </div>
            <table style={{ borderCollapse: 'collapse', fontSize: 9.5 }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #cbd5e1', padding: '3px 6px', fontWeight: 700 }}>BUILDING</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '3px 6px' }}>{customer.building_name || '—'}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '3px 6px', fontWeight: 700 }}>FLAT NO.</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '3px 6px' }}>{customer.flat_no || '—'}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #cbd5e1', padding: '3px 6px', fontWeight: 700 }}>WING</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '3px 6px' }}>{customer.wing_name || '—'}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '3px 6px', fontWeight: 700 }}>EMI MONTH</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '3px 6px' }}>{emiMonth}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ borderTop: '2px solid #1e293b', margin: '6px 0 10px' }} />

          <div style={{ fontSize: 11.5, color: '#1e3a8a', lineHeight: 2 }}>
            <div className="flex justify-between"><span>RECEIPT NO : <strong>{tx.receipt_number}</strong></span><span>DATE : <strong>{formatDMY(tx.date || tx.created_at)}</strong></span></div>
            <div>RECEIVED WITH THANKS FROM : <strong>{customer.customer_name || '—'}</strong></div>
            <div>THE SUM OF RUPEES : <strong>{numberToIndianWords(tx.amount)}</strong></div>
            {!!tx.maintenance && <div>MAINTENANCE : <strong>{rupee(tx.maintenance)}</strong> &nbsp; TOTAL : <strong>{rupee(total)}</strong></div>}
            <div>IN WORDS : <strong>{numberToIndianWords(total)}</strong></div>
            <div className="flex justify-between"><span>BY CASH / CHEQUE NO : <strong>{tx.cheque_number || '—'}</strong></span><span>DATED : <strong>{tx.clearance_date ? formatDMY(tx.clearance_date) : '—'}</strong></span><span>BANK : <strong>{tx.company || '—'}</strong></span></div>
            <div>PAYMENT MODE : <strong>{tx.mode_of_payment || '—'}</strong></div>
          </div>

          <div className="rounded" style={{ border: '2px solid #2563eb', display: 'inline-block', padding: '6px 16px', marginTop: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#1e293b' }}>{rupee(total)}</span>
          </div>

          <div style={{ fontSize: 9, color: '#64748b', marginTop: 12 }}>
            <div>Cheques are subject to realisation</div>
            <div>This Receipt is Computer Generated, Does not Required Signature</div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 px-4 pb-4">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#1e293b', cursor: 'pointer' }}>
            Close
          </button>
          <button type="button" onClick={onDownload}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#16a34a', border: 'none', cursor: 'pointer' }}>
            <MdDownload size={15} /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentReceiptViewModal;
