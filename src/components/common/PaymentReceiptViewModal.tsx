// ==========================================
// DREAM GROUP CRM - PAYMENT RECEIPT VIEW MODAL (shared)
// ==========================================
// Shows the receipt exactly as it is downloaded: both render the same
// ReceiptSheet (the company's printed receipt-book layout). The sheet has
// a fixed design width, so it is scaled down to fit narrower screens
// (phones) instead of wrapping or being cut off.
import React, { useLayoutEffect, useRef, useState } from 'react';
import { MdClose, MdDownload } from 'react-icons/md';
import { PaymentReceipt } from '../../types/index';
import { ReceiptSheet, RECEIPT_SHEET_WIDTH } from './ReceiptSheet';

interface PaymentReceiptViewModalProps {
  data: PaymentReceipt;
  onClose: () => void;
  onDownload: () => void;
}

export const PaymentReceiptViewModal: React.FC<PaymentReceiptViewModalProps> = ({ data, onClose, onDownload }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Fit the fixed-width sheet into whatever width the popup has.
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, (el.clientWidth - 24) / RECEIPT_SHEET_WIDTH));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
      <div className="rounded-2xl w-full" style={{ maxWidth: RECEIPT_SHEET_WIDTH + 24, background: '#fff', maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-3">
          <span style={{ fontSize: 14, fontWeight: 800, color: '#1f3a93' }}>
            Payment Receipt{data.transaction.receipt_number ? ` — ${data.transaction.receipt_number}` : ''}
          </span>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
            <MdClose size={20} />
          </button>
        </div>

        <div ref={frameRef} style={{ padding: '6px 12px 0', overflow: 'hidden' }}>
          <div style={{ width: RECEIPT_SHEET_WIDTH, zoom: scale }}>
            <ReceiptSheet data={data} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 px-4 pb-4 pt-2">
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
