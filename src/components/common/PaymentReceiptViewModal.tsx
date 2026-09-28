// ==========================================
// DREAM GROUP CRM - PAYMENT RECEIPT VIEW MODAL (shared)
// ==========================================
// Shows the receipt exactly as it is downloaded: both render the same
// ReceiptSheet (the company's printed receipt-book layout). The whole
// receipt always fits in the popup, top to bottom and side to side, with
// no scrollbar and nothing cut: the sheet is scaled down to whichever is
// smaller — the popup's width or the screen height left after the title
// and the Close / Download buttons.
import React, { useLayoutEffect, useRef, useState } from 'react';
import { MdClose, MdDownload } from 'react-icons/md';
import { PaymentReceipt } from '../../types/index';
import { ReceiptSheet, RECEIPT_SHEET_WIDTH } from './ReceiptSheet';
import { viewportHeight } from '../../utils/appZoom';

interface PaymentReceiptViewModalProps {
  data: PaymentReceipt;
  onClose: () => void;
  onDownload: () => void;
}

const OUTER_PAD = 12;   // popup's distance from the screen edges (p-3)
const FRAME_PAD = 12;   // space around the sheet inside the popup

export const PaymentReceiptViewModal: React.FC<PaymentReceiptViewModalProps> = ({ data, onClose, onDownload }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [sheetHeight, setSheetHeight] = useState(0);

  useLayoutEffect(() => {
    const fit = () => {
      const frame = frameRef.current;
      const sheet = sheetRef.current;
      if (!frame || !sheet) return;
      const naturalH = sheet.offsetHeight; // unscaled (transform doesn't change it)
      const availW = frame.clientWidth - FRAME_PAD * 2;
      const availH = viewportHeight() - OUTER_PAD * 2
        - (headRef.current?.offsetHeight ?? 0) - (footRef.current?.offsetHeight ?? 0) - FRAME_PAD;
      setSheetHeight(naturalH);
      setScale(Math.max(0.2, Math.min(1, availW / RECEIPT_SHEET_WIDTH, availH / naturalH)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (frameRef.current) ro.observe(frameRef.current);
    if (sheetRef.current) ro.observe(sheetRef.current);
    window.addEventListener('resize', fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)', padding: OUTER_PAD }} onClick={onClose}>
      <div className="rounded-2xl w-full" style={{ maxWidth: RECEIPT_SHEET_WIDTH + FRAME_PAD * 2, background: '#fff', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        <div ref={headRef} className="flex items-center justify-between px-4 pt-3 pb-1">
          <span style={{ fontSize: 14, fontWeight: 800, color: '#1f3a93' }}>
            Payment Receipt{data.transaction.receipt_number ? ` — ${data.transaction.receipt_number}` : ''}
          </span>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
            <MdClose size={20} />
          </button>
        </div>

        <div ref={frameRef} style={{ padding: `0 ${FRAME_PAD}px`, overflow: 'hidden' }}>
          {/* Box sized to the scaled sheet, so the popup is exactly as tall
              as the visible receipt — no gap, no scroll. */}
          <div style={{ width: RECEIPT_SHEET_WIDTH * scale, height: sheetHeight ? sheetHeight * scale : undefined, margin: '0 auto', overflow: 'hidden' }}>
            <div ref={sheetRef} style={{ width: RECEIPT_SHEET_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
              <ReceiptSheet data={data} />
            </div>
          </div>
        </div>

        <div ref={footRef} className="flex items-center justify-end gap-2.5 px-4 pb-3 pt-2">
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
